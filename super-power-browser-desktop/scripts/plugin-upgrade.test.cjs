const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const {createHash} = require('node:crypto');
const WebSocket = require('ws');
const {activatePlugins} = require('../src/main/pluginManage/PluginActivation');

const desktop = path.resolve(__dirname, '..');
const plugins = path.resolve(desktop, '../super-power-browser-plugins');

async function chromiumExecutable() {
  if (process.env.SPB_CHROMIUM_EXECUTABLE) return path.resolve(process.env.SPB_CHROMIUM_EXECUTABLE);
  const runtime = JSON.parse(await fs.readFile(path.join(desktop, 'runtime.config.json'), 'utf8'));
  const core = path.join(runtime.corePath, '144');
  const installation = JSON.parse(await fs.readFile(path.join(core, '.spb-installation.json'), 'utf8'));
  assert.equal(installation.protocol, 'fingerprint-chromium/1');
  for (const entry of await fs.readdir(core, {withFileTypes: true})) {
    if (!entry.isDirectory()) continue;
    const executable = path.join(core, entry.name, 'chrome.exe');
    if (await fs.stat(executable).then(stat => stat.isFile(), () => false)) return executable;
  }
  throw new Error('Set SPB_CHROMIUM_EXECUTABLE to the isolated Chromium executable');
}

async function waitWorker(browser, id) {
  const url = `chrome-extension://${id}/worker.mjs`;
  const existing = browser.serviceWorkers().find(worker => worker.url() === url);
  return existing || browser.waitForEvent('serviceworker', {predicate: worker => worker.url() === url, timeout: 10000});
}

async function workerState(browser, id) {
  const worker = await waitWorker(browser, id);
  return worker.evaluate(async () => {
    await globalThis.__fixtureReady;
    const stored = await chrome.storage.local.get(['sentinel', 'starts']);
    return {buildId: globalThis.__SP_PLUGIN_BUILD_ID__, dependencyBuild: globalThis.__fixtureDependencyBuild, ...stored};
  });
}

test('persistent Chromium upgrades cached plugin workers without clearing shop data', {
  timeout: 120000,
  skip: process.env.SPB_PROXY_AUTH_BROWSER !== '1'
    ? 'Set SPB_PROXY_AUTH_BROWSER=1 and SPB_PLAYWRIGHT_MODULE to run the isolated browser regression'
    : false,
}, async t => {
  assert.ok(process.env.SPB_PLAYWRIGHT_MODULE);
  const {chromium} = require(process.env.SPB_PLAYWRIGHT_MODULE);
  const executablePath = await chromiumExecutable();
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-plugin-upgrade-'));
  const extension = path.join(temporary, 'extension'), profile = path.join(temporary, 'profile');
  let browser;
  t.after(async () => {
    await browser?.close();
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('spb-plugin-upgrade-'));
    await fs.rm(temporary, {recursive: true, force: true, maxRetries: 8, retryDelay: 200});
  });
  const identities = JSON.parse(await fs.readFile(path.join(plugins, 'lib/extension-identities.json'), 'utf8'));
  const key = identities.RXMallHelper;
  const id = createHash('sha256').update(Buffer.from(key, 'base64')).digest('hex').slice(0, 32)
    .replace(/[0-9a-f]/g, character => String.fromCharCode(97 + parseInt(character, 16)));
  const originalBuild = 'a'.repeat(64), updatedBuild = 'b'.repeat(64), brokenBuild = 'c'.repeat(64);
  await fs.mkdir(path.join(extension, 'runtime'), {recursive: true});
  await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify({
    manifest_version: 3, name: 'Synthetic persistent plugin upgrade fixture', version: '1.0.0', key,
    permissions: ['storage'], background: {service_worker: 'worker.mjs', type: 'module'},
  }));
  const writeBuild = async (buildId, {publishMarker = true} = {}) => {
    await fs.writeFile(path.join(extension, 'runtime/build.json'), JSON.stringify({buildId}));
    await fs.writeFile(path.join(extension, 'runtime/dependency.mjs'), `export const dependencyBuild=${JSON.stringify(buildId)};\n`);
    await fs.writeFile(path.join(extension, 'worker.mjs'), `${publishMarker ? `globalThis.__SP_PLUGIN_BUILD_ID__=${JSON.stringify(buildId)};` : ''}
import {dependencyBuild} from './runtime/dependency.mjs';
globalThis.__fixtureDependencyBuild=dependencyBuild;
chrome.runtime.onStartup.addListener(()=>{});
globalThis.__fixtureReady=(async()=>{
  const previous=await chrome.storage.local.get('starts');
  await chrome.storage.local.set({starts:(previous.starts||0)+1});
})();
`);
  };
  const launch = async () => {
    browser = await chromium.launchPersistentContext(profile, {
      executablePath, headless: true,
      ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
      args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`,
        '--remote-debugging-port=0', '--disable-background-networking', '--disable-quic',
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost',
        '--no-first-run', '--no-default-browser-check'],
    });
    const port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
    const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
    return {port, debuggerUrl: version.webSocketDebuggerUrl};
  };
  const builds = buildId => [{id, buildId, worker: 'worker.mjs'}];
  const activateFixture = async (run, expectedBuilds, options={}) => {
    const opened=[];
    const recordPage=page=>opened.push(page);
    browser.on('page',recordPage);
    // Playwright auto-attaches to newly created workers and may leave them
    // waiting for its debugger during a second CDP client's activation check.
    // Resume only this synthetic extension in this test's isolated browser.
    let active = true;
    const resumed = new Set();
    const resume = (async () => {
      while (active) {
        try {
          const targets = await (await fetch(`http://127.0.0.1:${run.port}/json/list`)).json();
          const worker = targets.find(target => target.type === 'service_worker' && target.url === `chrome-extension://${id}/worker.mjs`);
          if (worker?.webSocketDebuggerUrl && !resumed.has(worker.id)) {
            await new Promise((resolve, reject) => {
              const socket = new WebSocket(worker.webSocketDebuggerUrl);
              const timer = setTimeout(() => { socket.terminate(); reject(new Error('fixture debugger resume timeout')); }, 1000);
              const finish = error => { clearTimeout(timer); socket.close(); error ? reject(error) : resolve(); };
              socket.once('error', finish);
              socket.once('open', () => socket.send(JSON.stringify({id: 1, method: 'Runtime.runIfWaitingForDebugger'})));
              socket.on('message', raw => { const message = JSON.parse(raw); if (message.id === 1) finish(message.error ? new Error(message.error.message) : null); });
            });
            resumed.add(worker.id);
          }
        } catch { /* The old target can disappear while the new worker is starting. */ }
        if (active) await new Promise(resolve => setTimeout(resolve, 50));
      }
    })();
    try { return await activatePlugins(run, expectedBuilds,options.signal,{onReload:options.onReload}); }
    finally {
      active = false; await resume;
      browser.off('page',recordPage);
      assert.equal(opened.length,0,'Plugin verification and upgrade must not open temporary browser tabs');
    }
  };
  const assertSentinels = async () => {
    assert.equal((await workerState(browser, id)).sentinel, 'synthetic-extension-data');
    const cookie = (await browser.cookies('http://127.0.0.1/')).find(item => item.name === 'spb_upgrade_fixture');
    assert.equal(cookie?.value, 'synthetic-session-data');
  };

  await writeBuild(originalBuild);
  let run = await launch();
  await activateFixture(run, builds(originalBuild));
  const firstWorker = await waitWorker(browser, id);
  await firstWorker.evaluate(async () => {
    await globalThis.__fixtureReady;
    await chrome.storage.local.set({sentinel: 'synthetic-extension-data'});
  });
  await browser.addCookies([{url: 'http://127.0.0.1/', name: 'spb_upgrade_fixture', value: 'synthetic-session-data',
    expires: Math.floor(Date.now() / 1000) + 86400, sameSite: 'Lax'}]);
  assert.equal((await workerState(browser, id)).buildId, originalBuild);
  await browser.close(); browser = null;

  // Keep the extension id, manifest version, path, and profile unchanged. This
  // reproduces Chromium executing its cached worker after files are replaced.
  await writeBuild(updatedBuild);
  run = await launch();
  const stale = await workerState(browser, id);
  assert.equal(stale.buildId, originalBuild, 'fixture must reproduce the stale persisted worker');
  assert.equal(stale.dependencyBuild, originalBuild, 'fixture must also retain the old static import');
  assert.equal(JSON.parse(await fs.readFile(path.join(extension, 'runtime/build.json'), 'utf8')).buildId, updatedBuild);

  await t.test('activation replaces the cached worker and preserves cookies and extension storage', async () => {
    await activateFixture(run, builds(updatedBuild));
    const updated = await workerState(browser, id);
    assert.equal(updated.buildId, updatedBuild);
    assert.equal(updated.dependencyBuild, updatedBuild, 'upgrading must also replace cached module dependencies');
    assert.equal(updated.starts, stale.starts + 1);
    await assertSentinels();
  });

  await t.test('matching runtime build is accepted without another reload', async () => {
    const controls=await browser.newPage();
    await controls.goto('chrome://extensions/');
    const before = await workerState(browser, id);
    await activateFixture(run, builds(updatedBuild));
    const after = await workerState(browser, id);
    assert.equal(after.buildId, updatedBuild);
    assert.equal(after.dependencyBuild, updatedBuild);
    assert.equal(after.starts, before.starts);
    assert.equal(controls.isClosed(),false,'An existing extension-management page belongs to the user');
    assert.equal(controls.url(),'chrome://extensions/');
    await assertSentinels();
  });

  await t.test('cancelling an upgrade closes its hidden session without touching the running plugin', async () => {
    const controller=new AbortController();
    const before=await workerState(browser,id);
    await assert.rejects(activateFixture(run,builds(brokenBuild),{
      signal:controller.signal,onReload:()=>controller.abort(),
    }),{name:'AbortError'});
    const after=await workerState(browser,id);
    assert.equal(after.buildId,before.buildId);
    assert.equal(after.starts,before.starts);
    await assertSentinels();
  });

  await t.test('a worker that cannot report the expected build fails activation without deleting data', async () => {
    await writeBuild(brokenBuild, {publishMarker: false});
    await assert.rejects(activateFixture(run, builds(brokenBuild)), /插件|构建|版本|build/i);
    await assertSentinels();
  });
});
