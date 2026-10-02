const { app } = require('electron');
const { mkdirSync } = require('node:fs');
const { pathToFileURL } = require('node:url');
const { join } = require('node:path');

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
  const pet = installDesktopPet({ owner: () => undefined, request,
    openMain: id => { void report({ type: 'open', sessionId: id }).catch(() => app.quit()); } });
  let previous, resetRevision = 0, closing = false, timer;
  app.on('before-quit', () => { closing = true; clearTimeout(timer); });
  async function poll() {
    try {
      const response = await request('/control');
      if (!response.ok) throw Error('Disconnected desktop owner');
      const control = await response.json();
      const key = JSON.stringify(control.options);
      if (key !== previous) { await pet.configure(control.options); previous = key; }
      if (control.resetRevision !== resetRevision) { pet.resetPosition(); resetRevision = control.resetRevision; }
      await report({ type: 'status', active: pet.isActive(), version: config.version });
    } catch { app.quit(); return; }
    if (!closing) timer = setTimeout(poll, 750);
  }
  await poll();
};
