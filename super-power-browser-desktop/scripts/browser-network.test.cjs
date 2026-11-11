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
const { proxySnapshotId } = require('../src/main/services/ProxyRoutes');

const shopId = '11111111-2222-3333-4444-555555555555';
const filename = path.resolve(__dirname, '../src/main/BrowserManage/BrowserHost.js');
const resources = path.resolve(__dirname, '..');
const successfulExit = () => ({ available: true, ip: '1.1.1.1', durationMs: 11000, diagnostics: [] });
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}

async function fixture(t, operations, fingerprint = {}, scenario = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-browser-network-'));
  const entered = deferred(), networkStarted = deferred(), releaseActivation = deferred(), probes = [], revoked = [], localProviders = [], operationRequests = [], pluginInputs = [], launchInputs = [];
  const activationStarted = deferred(), allowInitialCheck = deferred(), probeEvents = new EventEmitter(), runtimes = [], switches = [];
  if (!scenario.delayInitialCheck) allowInitialCheck.resolve();
  const proxyConfig = scenario.proxy || { protocol: 'http', host: '1.1.1.1', port: 8080, webType: 2 };
  const bootstrap = scenario.preferredCandidateIndex === undefined ? {} : {
    snapshotId: proxySnapshotId(proxyConfig), preferredCandidateIndex: scenario.preferredCandidateIndex,
  };
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
    allowInitialCheck.resolve();
    releaseActivation.resolve();
    try {
      await host?.closeAll();
      await opening?.catch(() => {});
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
    constructor(proxy, { signal } = {}) {
      super(); this.signal = signal; this.candidateIndex = 0; this.activeConfig = proxy;
      this.candidates = [proxy, ...(proxy.proxyOptions?.alternatives || [])];
      this.port = 10001 + runtimes.length * 2; this.socksPort = this.port + 1;
      this.url = `http://127.0.0.1:${this.port}`; this.browserUrl = this.url;
      runtimes.push(this);
    }
    async listen() { return this; }
    async close() { this.closed = true; }
    async switchCandidate(index, { validate } = {}) {
      assert.ok(this.candidates[index], 'Only the configured synthetic candidate can be restored');
      await validate?.(this.candidates[index], this.signal);
      this.activeConfig = this.candidates[index]; this.candidateIndex = index;
      switches.push({ index, host: this.activeConfig.host });
    }
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
    '../runtime/IndependentKernel': { compileFingerprint() {}, prepareLaunch: async environment => { launchInputs.push(structuredClone(environment)); return { args: [] }; } },
    '../pluginManage/PluginService': {
      preparePlugins: async (resources,profile,options) => {
        pluginInputs.push(options);
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
      localGeo: async ({providers}) => {localProviders.push(providers);return { available: false };},
      collectGeo: ({ signal,providers,accept,proxyUrl }) => new Promise((resolve, reject) => {
        activeProbes++;
        let settled = false;
        const finish = (error, value) => {
          if (settled) return;
          settled = true; activeProbes--; signal.removeEventListener('abort', abort);
          error ? reject(error) : resolve(value);
        };
        const abort = () => finish(signal.reason || new DOMException('Cancelled', 'AbortError'));
        const runtime = runtimes.find(item => item.url === proxyUrl);
        probes.push({ signal, providers, accept, proxyUrl, upstreamHost: runtime?.activeConfig.host,
          get settled() { return settled; }, resolve: value => finish(null, value) });
        networkStarted.resolve();
        probeEvents.emit('probe');
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
      }),
    },
    '../pluginManage/PluginActivation': {
      activatePlugins: async run => {
        // Invoke the callback installed by the actual BrowserHost.start(). The
        // real DesktopBridge, filesystem, journal and cancellation remain used.
        activationStarted.resolve();
        await allowInitialCheck.promise;
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
      if (url.pathname === '/extension/bootstrap') return { ok: true, json: async () => bootstrap };
      assert.equal(url.pathname, '/json/version');
      return { ok: true, json: async () => ({ webSocketDebuggerUrl: debuggerUrl }) };
    },
  };
  vm.runInNewContext(await fs.readFile(filename, 'utf8'), context, { filename });
  const api = { token:'customer-session',request: async (route, options = {}) => {
    if (route.endsWith('/launch-config')) return {
      kernelVersion: '144', startUrl: 'https://synthetic.invalid/', fingerprint,
      proxy: proxyConfig,
    };
    if (options.method === 'POST' && route.endsWith('/extension-sessions')) return { id: 'synthetic-session', token: 'synthetic-token' };
    if (options.method === 'DELETE') { revoked.push(route); return {}; }
    throw new Error('Unexpected synthetic API route');
  } };
  host = new module.exports.BrowserHost({
    profiles: path.join(directory, 'profiles'), downloads: path.join(directory, 'downloads'),
    dataPath: directory, resources, apiUrl: 'http://127.0.0.1:1',
  }, api,{operations:async request=>{operationRequests.push(request);return operations;}});
  return {
    host, probes, revoked, localProviders, operationRequests, pluginInputs, launchInputs, runtimes, switches,
    open: () => (opening = host.open(shopId)),
    entered: entered.promise,
    networkStarted: networkStarted.promise,
    activationStarted: activationStarted.promise,
    releaseInitialCheck: allowInitialCheck.resolve,
    async waitForProbe(index) {
      while (!probes[index]) await once(probeEvents, 'probe', { signal: AbortSignal.timeout(2000) });
      return probes[index];
    },
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


test('shop startup forwards authenticated runtime providers and passes rules only to plugin bootstrap', {timeout:5000}, async t => {
  const operations={networkChecks:{enabled:true,proxyProviders:['https://shop-check.example.com/ip'],localProviders:['https://local-check.example.com/ip']},
    networkRouting:{enabled:true,directDomains:['direct.test'],resourceDomains:[],cdnDomains:[]},
    accessPolicy:{enabled:true,mode:'blacklist',domains:['blocked.test'],exceptions:[]},
    passkeyRules:{enabled:true,loginMatches:['https://*.amazon.com/ap/signin*'],registerMatches:[]}};
  const setup=await fixture(t,operations),opening=setup.open();await setup.entered;
  assert.deepEqual(setup.probes[0].providers,operations.networkChecks.proxyProviders);
  assert.deepEqual(setup.localProviders,[operations.networkChecks.localProviders]);
  assert.equal(setup.operationRequests[0].token,'customer-session');
  assert.equal(setup.pluginInputs[0].operations,operations);
  assert.equal(setup.pluginInputs[0].environment.proxy.proxyOptions,undefined,'global routing cannot change the route snapshot');
  assert.equal(setup.pluginInputs[0].environment.fingerprint.accessRules,undefined,'global policy cannot change saved fingerprint');
  setup.probes[0].resolve(successfulExit());await setup.networkResult;setup.releaseActivation();
  assert.equal((await opening).status,'running');
});

test('automatic locale is resolved before launch and the check page reuses the same evidence', {timeout:5000}, async t => {
  const fingerprint={language:'auto',languageMode:'ip',timezone:'auto'};
  const setup=await fixture(t,undefined,fingerprint),opening=setup.open();
  await setup.networkStarted;
  assert.equal(setup.launchInputs.length,0,'No browser can start with an unresolved locale');
  assert.equal(setup.pluginInputs.length,0);
  assert.equal(setup.probes[0].accept(successfulExit()),false,'IP-only responses cannot resolve locale');
  const exit={...successfulExit(),country_code:'JP',timezone:'Asia/Tokyo'};
  assert.equal(setup.probes[0].accept(exit),true);
  setup.probes[0].resolve(exit);
  await setup.entered;
  assert.equal(setup.launchInputs[0].runtimeLocale.language,'ja-JP,ja');
  assert.equal(setup.launchInputs[0].runtimeLocale.timezone,'Asia/Tokyo');
  assert.deepEqual(setup.launchInputs[0].fingerprint,fingerprint,'Saved auto settings must not become custom values');
  assert.equal((await setup.networkResult).exit.timezone,'Asia/Tokyo');
  assert.equal(setup.probes.length,1);
  setup.releaseActivation();
  assert.equal((await opening).status,'running');
});

test('cancelling locale resolution closes the proxy without launching a browser', {timeout:5000}, async t => {
  const setup=await fixture(t,undefined,{language:'auto',timezone:'auto'}),opening=setup.open();
  await setup.networkStarted;
  await setup.host.close(shopId);
  assert.equal((await opening).status,'cancelled');
  assert.equal(setup.probes[0].signal.aborted,true);
  assert.equal(setup.launchInputs.length,0);
  assert.equal(setup.activeProbes,0);
  assert.equal(setup.host.running.size,0);
});

test('restoring a preferred route ignores a late old-country probe for launch and the first check', {timeout:5000}, async t => {
  const fingerprint = { language: 'auto', languageMode: 'ip', timezone: 'auto' };
  const proxy = { protocol: 'http', host: 'primary.synthetic.invalid', port: 8080, webType: 1,
    proxyOptions: { alternatives: [{ protocol: 'http', host: 'preferred.synthetic.invalid', port: 8081, proxyOptions: {} }] } };
  const setup = await fixture(t, undefined, fingerprint, { proxy, preferredCandidateIndex: 1, delayInitialCheck: true });
  const opening = setup.open();
  const candidateCheck = await setup.waitForProbe(1);
  assert.equal(setup.probes[0].upstreamHost, proxy.host);
  assert.equal(setup.probes[0].settled, false);
  assert.equal(candidateCheck.upstreamHost, proxy.proxyOptions.alternatives[0].host);
  assert.notEqual(candidateCheck.proxyUrl, setup.probes[0].proxyUrl, 'Candidate validation uses its own isolated runtime');
  candidateCheck.resolve({ ...successfulExit(), ip: '8.8.8.8' });

  const restoredProbe = await setup.waitForProbe(2);
  assert.deepEqual(setup.switches, [{ index: 1, host: proxy.proxyOptions.alternatives[0].host }]);
  assert.equal(restoredProbe.proxyUrl, setup.probes[0].proxyUrl, 'The restored main proxy retains its local endpoint');
  assert.equal(restoredProbe.upstreamHost, proxy.proxyOptions.alternatives[0].host);
  assert.equal(setup.runtimes[1].closed, true, 'Temporary candidate validation is cleaned before launching');
  const japan = { ...successfulExit(), ip: '8.8.8.8', country_code: 'JP', timezone: 'Asia/Tokyo' };
  assert.equal(restoredProbe.accept(japan), true);
  restoredProbe.resolve(japan);
  await setup.activationStarted;
  assert.equal(setup.probes[0].settled, false, 'The old primary probe must still be pending when the preferred route launches');

  // Deliver stale evidence after launch preparation, but before the extension
  // first asks for GetNetworkInfo. It must not replace the selected route sample.
  setup.probes[0].resolve({ ...successfulExit(), country_code: 'US', timezone: 'America/New_York' });
  await new Promise(resolve => setImmediate(resolve));
  setup.releaseInitialCheck();
  await setup.entered;
  const result = await setup.networkResult;
  assert.equal(result.allowed, true);
  assert.equal(result.exit.ip, japan.ip);
  assert.equal(result.exit.country_code, 'JP');
  assert.equal(result.exit.timezone, 'Asia/Tokyo');
  assert.equal(setup.launchInputs[0].preferredCandidateIndex, 1);
  assert.equal(setup.launchInputs[0].runtimeLocale.language, 'ja-JP,ja');
  assert.equal(setup.launchInputs[0].runtimeLocale.timezone, 'Asia/Tokyo');
  assert.equal(setup.probes.length, 3, 'The first check reuses the restored route sample');
  assert.equal(setup.activeProbes, 0);
  setup.releaseActivation();
  assert.equal((await opening).status, 'running');
  await setup.host.close(shopId);
  assert.ok(setup.runtimes.every(runtime => runtime.closed));
  assert.equal(setup.revoked.length, 1);
});
