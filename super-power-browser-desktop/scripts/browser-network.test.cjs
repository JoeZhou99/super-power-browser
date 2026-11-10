const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const { EventEmitter, once } = require('node:events');
const { WebSocketServer } = require('ws');
const networkInfo = require('../src/main/pluginManage/NetworkInfo');

const shopId = '11111111-2222-3333-4444-555555555555';
const filename = path.resolve(__dirname, '../src/main/BrowserManage/BrowserHost.js');
const resources = path.resolve(__dirname, '..');
const successfulExit = () => ({ available: true, ip: '1.1.1.1', durationMs: 11000, diagnostics: [] });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function fixture(t) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-browser-network-'));
  const entered = deferred(), releaseActivation = deferred(), probes = [], revoked = [];
  let clockOffset = 0, activeProbes = 0, browser, host, opening, networkResult;
  const cdp = new WebSocketServer({ host: '127.0.0.1', port: 0 });
  await once(cdp, 'listening');
  const debuggerUrl = `ws://127.0.0.1:${cdp.address().port}/synthetic-browser`;
  cdp.on('connection', socket => socket.on('message', raw => {
    const request = JSON.parse(raw);
    assert.equal(request.method, 'Browser.close');
    socket.send(JSON.stringify({ id: request.id, result: {} }));
    browser?.kill();
    socket.close();
  }));
  t.after(async () => {
    for (const probe of probes) probe.resolve(successfulExit());
    releaseActivation.resolve();
    try {
      await opening?.catch(() => {});
      await host?.closeAll();
    } finally {
      for (const socket of cdp.clients) socket.terminate();
      await new Promise(resolve => cdp.close(resolve));
      const target = path.resolve(directory);
      assert.equal(path.dirname(target), path.resolve(os.tmpdir()));
      assert.ok(path.basename(target).startsWith('spb-browser-network-'));
      await fs.rm(target, { recursive: true, force: true });
    }
  });

  class Clock extends Date { static now() { return Date.now() + clockOffset; } }
  class Runtime extends EventEmitter {
    constructor() { super(); this.candidateIndex = 0; this.url = 'http://127.0.0.1:1'; this.browserUrl = this.url; }
    async listen() { return this; }
    async close() { this.closed = true; }
  }
  class BrowserProcess extends EventEmitter {
    constructor() { super(); this.pid = 900001; this.exitCode = null; this.killed = false; }
    kill() {
      if (this.exitCode !== null) return;
      this.killed = true; this.exitCode = 0; this.emit('exit', 0);
    }
  }
  const overrides = {
    'node:child_process': { spawn: () => (browser = new BrowserProcess()) },
    '../services/ProxyRuntime': { ProxyRuntime: Runtime, proxyError: message => new Error(message) },
    '../runtime/KernelManager': { KernelManager: class {
      async ensure() { return { version: '144', executable: path.join(directory, 'synthetic-browser.exe') }; }
      async cancelAll() {}
    } },
    './NativeWindow': { NativeWindow: class { async reveal() { return true; } release() {} } },
    '../runtime/IndependentKernel': { compileFingerprint() {}, prepareLaunch: async () => ({ args: [] }) },
    '../pluginManage/PluginService': {
      preparePlugins: async () => {
        // Exercise startup after the former 10-second TTL, without sleeping or
        // copying the production cache/expiry logic into the test.
        clockOffset += 11000;
        return { dirs: [], builds: [], pluginIdMap: { RXMallHelper: 'a'.repeat(32) }, bundle: {
          wsKey: 'b'.repeat(32),
          initJson: Buffer.from(JSON.stringify({ iv: Buffer.alloc(16).toString('base64'), mac: 'c'.repeat(64) })).toString('base64'),
        } };
      },
      clearBootstrap: async () => {},
    },
    '../pluginManage/NetworkInfo': {
      ...networkInfo,
      localGeo: async () => ({ available: false }),
      collectGeo: ({ signal }) => new Promise((resolve, reject) => {
        activeProbes++;
        let settled = false;
        const finish = (error, value) => {
          if (settled) return;
          settled = true; activeProbes--; signal.removeEventListener('abort', abort);
          error ? reject(error) : resolve(value);
        };
        const abort = () => finish(signal.reason || new DOMException('Cancelled', 'AbortError'));
        probes.push({ signal, resolve: value => finish(null, value) });
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
      }),
    },
    '../pluginManage/PluginActivation': {
      activatePlugins: async run => {
        // Invoke the callback installed by the actual BrowserHost.start(). The
        // real DesktopBridge, filesystem, journal and cancellation remain used.
        networkResult = run.bridge.onAction('GetNetworkInfo', {});
        networkResult.catch(() => {});
        entered.resolve();
        await releaseActivation.promise;
        return [];
      },
    },
  };
  const module = { exports: {} }, realRequire = createRequire(filename);
  const context = {
    module, exports: module.exports,
    require: name => Object.hasOwn(overrides, name) ? overrides[name] : realRequire(name),
    __filename: filename, __dirname: path.dirname(filename), process, Buffer, URL,
    AbortController, AbortSignal, performance, Date: Clock, setTimeout, clearTimeout, setImmediate,
    fetch: async input => {
      const url = new URL(input);
      if (url.pathname === '/extension/bootstrap') return { ok: true, json: async () => ({}) };
      assert.equal(url.pathname, '/json/version');
      return { ok: true, json: async () => ({ webSocketDebuggerUrl: debuggerUrl }) };
    },
  };
  vm.runInNewContext(await fs.readFile(filename, 'utf8'), context, { filename });
  const api = { request: async (route, options = {}) => {
    if (route.endsWith('/launch-config')) return {
      kernelVersion: '144', startUrl: 'https://synthetic.invalid/', fingerprint: {},
      proxy: { protocol: 'http', host: '1.1.1.1', port: 8080, webType: 2 },
    };
    if (options.method === 'POST' && route.endsWith('/extension-sessions')) return { id: 'synthetic-session', token: 'synthetic-token' };
    if (options.method === 'DELETE') { revoked.push(route); return {}; }
    throw new Error('Unexpected synthetic API route');
  } };
  host = new module.exports.BrowserHost({
    profiles: path.join(directory, 'profiles'), downloads: path.join(directory, 'downloads'),
    dataPath: directory, resources, apiUrl: 'http://127.0.0.1:1',
  }, api);
  return {
    host, probes, revoked,
    open: () => (opening = host.open(shopId)),
    entered: entered.promise,
    releaseActivation: releaseActivation.resolve,
    get networkResult() { return networkResult; },
    get activeProbes() { return activeProbes; },
  };
}

test('opening the check page after ten seconds reuses the still pending startup probe', { timeout: 5000 }, async t => {
  const setup = await fixture(t), opening = setup.open();
  await setup.entered;
  assert.equal(setup.probes.length, 1, 'Slow startup must not create a second upstream check');
  assert.equal(setup.activeProbes, 1);
  setup.probes[0].resolve(successfulExit());
  const result = await setup.networkResult;
  assert.equal(result.allowed, true);
  assert.equal(result.exit.ip, '1.1.1.1');
  setup.releaseActivation();
  assert.equal((await opening).status, 'running');
  assert.equal(setup.probes.length, 1);
  assert.equal(setup.activeProbes, 0);
  await setup.host.close(shopId);
  assert.equal(setup.host.running.size, 0);
  assert.equal(setup.revoked.length, 1);
});

test('closing during a slow startup cancels its single pending exit probe and cleans the shop', { timeout: 5000 }, async t => {
  const setup = await fixture(t), opening = setup.open();
  await setup.entered;
  assert.equal(setup.probes.length, 1);
  assert.equal(setup.activeProbes, 1);
  await setup.host.close(shopId);
  assert.equal((await opening).status, 'cancelled');
  assert.equal(setup.probes[0].signal.aborted, true);
  assert.equal(setup.activeProbes, 0);
  assert.equal(setup.host.running.size, 0);
  assert.equal(setup.host.pending.size, 0);
  assert.equal(setup.revoked.length, 1);
});
