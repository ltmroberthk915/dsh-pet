const { app } = require('electron');
const { mkdirSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { join, dirname, isAbsolute } = require('node:path');
const { spawn } = require('node:child_process');
const { childEnvironment } = require('./companion-runtime.cjs');

exports.start = async function start(config) {
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535 || !/^[a-f0-9]{64}$/.test(config.token)) throw Error('Invalid private desktop connection');
  mkdirSync(config.dataDir, { recursive: true });
  app.setName('DSH Pet');
  app.setPath('userData', config.dataDir);
  // Distinct from DSH's userData and single-instance lock.
  if (!app.requestSingleInstanceLock()) { app.exit(0); return; }
  const request = (path, method = 'GET', body) => fetch('http://127.0.0.1:' + config.port + path, {
    method, headers: { authorization: 'Bearer ' + config.token, ...(body === undefined ? {} : { 'content-type': 'application/json' }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }), signal: AbortSignal.timeout(5000), redirect: 'error',
  });
  const report = async body => { const r = await request('/event', 'POST', body); if (!r.ok) throw Error('Disconnected desktop owner'); };
  const { installDesktopPet } = await import(pathToFileURL(join(__dirname, 'pet-main.js')));
  await app.whenReady();
  let activationFlight, latestActivationId;
  const pet = installDesktopPet({ owner: () => undefined, request,
    openMain: id => {
      latestActivationId = id;
      // Spawn from the process receiving the user's click. Windows grants a
      // foreground process's child activation rights; Electron's singleton
      // then passes them to DSH. A background Host cannot reliably do this.
      let activated = false;
      if (typeof config.appExecutable === 'string' && isAbsolute(config.appExecutable)) {
        activated = true;
        if (!activationFlight) {
          const focus = spawn(config.appExecutable, [], { cwd: dirname(config.appExecutable), env: childEnvironment(), stdio: 'ignore', windowsHide: true });
          activationFlight = focus;
          const done = () => { if (activationFlight === focus) activationFlight = undefined; };
          focus.once('exit', done);
          focus.once('error', () => { done(); void report({ type: 'open', sessionId: latestActivationId }).catch(() => {}); });
          focus.unref();
        }
      }
      void report({ type: 'open', sessionId: id, activated }).catch(() => {});
    } });
  let previous, resetRevision = 0, closing = false, timer;
  app.on('before-quit', () => { closing = true; clearTimeout(timer); });
  async function poll() {
    try {
      const response = await request('/control');
      if (!response.ok) throw Error('Disconnected desktop owner');
      const control = await response.json();
      const key = JSON.stringify(control.options);
      if (key !== previous || control.options.enabled && !pet.isActive()) { await pet.configure(control.options); previous = key; }
      if (control.resetRevision !== resetRevision) { pet.resetPosition(); resetRevision = control.resetRevision; }
      await report({ type: 'status', active: pet.isActive(), version: config.version });
    } catch { app.quit(); return; }
    if (!closing) timer = setTimeout(poll, 750);
  }
  await poll();
};
