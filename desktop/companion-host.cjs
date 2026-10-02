const { createServer } = require('node:http');
const { randomBytes, timingSafeEqual } = require('node:crypto');
const { spawn } = require('node:child_process');
const { join, dirname } = require('node:path');
const { readFileSync } = require('node:fs');
const { prepareRuntime, nativeDesktopExecutable, childEnvironment } = require('./companion-runtime.cjs');

function json(res, status, value) { res.writeHead(status, { 'content-type': 'application/json', 'cache-control': 'no-store' }); res.end(JSON.stringify(value)); }
async function body(req) {
  let size = 0, chunks = [];
  for await (const chunk of req) { size += chunk.length; if (size > 4096) throw Error('Desktop message too large'); chunks.push(chunk); }
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}
const privatePost = new Set(['/api/pet/set-name', '/api/pet/interact', '/api/pet/set-visible', '/api/pet/set-skin',
  '/api/pet/gameplay/touch', '/api/pet/gameplay/mode', '/api/pet/gameplay/work-tick', '/api/pet/gameplay/buy']);
const privateGet = new Set(['/api/pet/state', '/api/pet/pets', '/api/pet/runtime/live2d-vendor.js', '/api/pet/runtime/live2dcubismcore.min.js']);

function createCompanion(options) {
  const appExecutable = options.appExecutable ?? nativeDesktopExecutable();
  const version = JSON.parse(readFileSync(join(options.pluginDir, 'package.json'), 'utf8')).version;
  let state = appExecutable ? 'idle' : 'unavailable', message, active = false, disposed = false;
  let child, server, flight, generation = 0, resetRevision = 0, pendingOpen, openRevision = 0, lastOpenAt = 0;
  let requested = { enabled: false };
  const status = () => ({ supported: !!appExecutable, state, active, version,
    ...(message ? { message } : {}), ...(pendingOpen ? { pendingOpen } : {}) });
  const effective = () => ({ ...requested, enabled: requested.enabled && options.enabled() });
  const stopChild = () => {
    active = false;
    const running = child; child = undefined;
    if (running) {
      const timeout = setTimeout(() => { if (running.exitCode === null) running.kill(); }, 3000);
      timeout.unref(); running.once('exit', () => clearTimeout(timeout));
    }
    const connection = server; server = undefined;
    connection?.closeAllConnections(); connection?.close();
  };
  async function start() {
    if (disposed || !appExecutable || !effective().enabled || child || state === 'error') return;
    if (flight) return flight;
    const run = ++generation;
    state = 'starting'; message = undefined;
    flight = (async () => {
      try {
        require('./archive-support.cjs').loadPayload(options.pluginDir);
        const executable = await (options.prepareRuntime ?? prepareRuntime)(appExecutable, join(options.cacheDir, 'runtime'));
        if (disposed || run !== generation || !effective().enabled) return;
        const token = randomBytes(32).toString('hex');
        const credential = Buffer.from('Bearer ' + token);
        const privateServer = createServer((req, res) => {
          void (async () => {
            const auth = Buffer.from(req.headers.authorization ?? '');
            if (req.headers.origin || req.headers['sec-fetch-site'] || auth.length !== credential.length || !timingSafeEqual(auth, credential)) { json(res, 403, { error: 'forbidden' }); return; }
            const url = new URL(req.url, 'http://127.0.0.1');
            if (req.method === 'GET' && url.pathname === '/control') { json(res, 200, { options: effective(), resetRevision }); return; }
            if (req.method === 'POST' && url.pathname === '/event') {
              const event = await body(req);
              if (event.type === 'status' && typeof event.active === 'boolean' && event.version === version) {
                active = event.active && effective().enabled; state = 'ready';
              } else if (event.type === 'open' && (event.sessionId === undefined || typeof event.sessionId === 'string' && event.sessionId.length <= 200)) {
                if (event.sessionId) pendingOpen = { revision: ++openRevision, sessionId: event.sessionId };
                if (Date.now() - lastOpenAt > 1000) {
                  lastOpenAt = Date.now();
                  if (options.openMain) options.openMain();
                  else {
                    // DSH's existing single-instance handler restores its main
                    // window. No process is killed and no restart is requested.
                    const focus = spawn(appExecutable, [], { cwd: dirname(appExecutable), env: childEnvironment(), stdio: 'ignore', windowsHide: true });
                    focus.on('error', () => {}); focus.unref();
                  }
                }
              } else { json(res, 400, { error: 'invalid-event' }); return; }
              json(res, 200, { ok: true }); return;
            }
            const allowed = req.method === 'GET' && (privateGet.has(url.pathname) || url.pathname.startsWith('/pet/') || url.pathname.startsWith('/api/pet/decoration/'))
              || req.method === 'POST' && privatePost.has(url.pathname);
            if (!allowed) { json(res, 404, { error: 'not-found' }); return; }
            const route = options.routes().find(route => route.kind === 'exact' && route.path === url.pathname)
              ?? options.routes().filter(route => route.kind === 'prefix' && url.pathname.startsWith(route.path + '/')).sort((a, b) => b.path.length - a.path.length)[0];
            if (!route) { json(res, 404, { error: 'not-found' }); return; }
            await route.handler(req, res);
          })().catch(() => { if (!res.headersSent) json(res, 500, { error: 'desktop-request-failed' }); else res.end(); });
        });
        server = privateServer;
        privateServer.requestTimeout = 10000; privateServer.headersTimeout = 10000; privateServer.maxHeadersCount = 30;
        await new Promise((resolve, reject) => { privateServer.once('error', reject); privateServer.listen(0, '127.0.0.1', resolve); });
        if (disposed || run !== generation) { stopChild(); return; }
        const port = privateServer.address().port;
        const bootstrap = { module: options.entry ?? join(options.pluginDir, 'desktop/companion-main.cjs'), port, token,
          dataDir: join(options.cacheDir, 'window-data'), version };
        const running = spawn(executable, [], { cwd: dirname(executable), env: { ...childEnvironment(), DSH_PET_BOOTSTRAP: JSON.stringify(bootstrap) }, windowsHide: true, stdio: ['ignore', 'ignore', 'pipe'] });
        child = running;
        running.stderr.on('data', chunk => options.diagnostic?.(chunk.toString()));
        const failed = (error, signal) => {
          options.diagnostic?.('Companion ended: ' + (error?.code ?? error ?? 'timeout') + ' ' + (signal ?? '') + '\n');
          if (child !== running || disposed) return;
          stopChild(); state = effective().enabled ? 'error' : 'idle';
          if (state === 'error') message = '独立窗口启动中断，请点击“重试独立窗口”。';
        };
        running.on('error', failed); running.on('exit', failed);
        const timeout = setTimeout(() => { if (child === running && state === 'starting') failed(); }, 20000);
        timeout.unref(); running.once('exit', () => clearTimeout(timeout));
      } catch (error) {
        if (!disposed && run === generation) {
          stopChild(); state = 'error';
          message = error.code === 'ENOSPC' ? '磁盘空间不足，请释放空间后重试独立窗口。'
            : ['EACCES', 'EPERM'].includes(error.code) ? '无法准备独立窗口，请检查插件缓存目录的写入权限。'
            : error.code === 'ENOENT' ? '独立窗口所需文件缺失，请重新安装完整插件包后重试。'
            : '独立窗口准备失败：' + String(error.message).slice(0, 250);
        }
      } finally { flight = undefined; }
    })();
    return flight;
  }
  return {
    status,
    configure(value) {
      if (!value || typeof value.enabled !== 'boolean' || value.currentSessionId !== undefined && (typeof value.currentSessionId !== 'string' || value.currentSessionId.length > 200)) throw Error('Invalid desktop configuration');
      requested = { ...requested, enabled: value.enabled,
        ...(Object.hasOwn(value, 'currentSessionId') ? { currentSessionId: value.currentSessionId || undefined } : {}) };
      if (requested.enabled) void start();
      // Keep an initialized companion dormant while hidden. Its private
      // control poll notices visibility changes without the main window.
      if (!requested.enabled) active = false;
      return status();
    },
    resetPosition() { resetRevision++; return status(); },
    retry() { if (state === 'error') { state = 'idle'; message = undefined; } void start(); return status(); },
    acknowledge(revision) { if (pendingOpen?.revision === revision) pendingOpen = undefined; return { ok: true }; },
    dispose() { disposed = true; generation++; stopChild(); state = 'idle'; },
  };
}
module.exports = { createCompanion };
