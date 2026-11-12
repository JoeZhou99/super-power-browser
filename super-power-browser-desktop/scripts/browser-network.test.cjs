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
const { proxySnapshotId,ProxyRoutes } = require('../src/main/services/ProxyRoutes');
const { proxyError } = require('../src/main/services/ProxyConfig');
const { encode, decode } = require('../src/main/pluginManage/DesktopBridge');
const { resolveProxyLocale } = require('../src/main/runtime/ProxyLocale');

const shopId = '11111111-2222-3333-4444-555555555555';
const filename = path.resolve(__dirname, '../src/main/BrowserManage/BrowserHost.js');
const resources = path.resolve(__dirname, '..');
const successfulExit = () => ({ available: true, ip: '1.1.1.1', durationMs: 11000, diagnostics: [] });
function managedProxy({fixed=false}={}){
  const exit={protocol:'http',host:'fixed-domain.test',port:8080,webType:2,...(fixed?{mapIp:'1.1.1.1'}:{})};
  return {...exit,proxyOptions:{transit:{protocol:'socks5',host:'relay-a.test',port:1080},alternatives:[
    {...exit,proxyOptions:{transit:{protocol:'socks5',host:'relay-b.test',port:1080}}}
  ]},relayPool:{id:'pool',name:'共享加速',automatic:true,candidates:[{id:'a',name:'A'},{id:'b',name:'B'}]}};
}
function deferred() {
  let resolve;
  const promise = new Promise(done => { resolve = done; });
  return { promise, resolve };
}
async function completePluginCheck(run){
  let reply;
  const {wsKey,iv,mac}=run.bridge.secret;
  const socket={readyState:1,send:raw=>{reply=decode(raw,wsKey,iv,mac);},terminate(){this.readyState=3;}};
  run.bridge.clients.add(socket);run.bridge.clientGenerations.set(socket,run.bridge.generation);
  await run.bridge.receive(socket,encode({browserId:shopId,requestId:`check-${run.pluginGeneration}`,action:'CheckCompleted',args:{}},wsKey,iv,mac));
  assert.equal(reply.ret,200);assert.equal(reply.returnObj.ready,true);
}

async function fixture(t, operations, fingerprint = {}, scenario = {}) {
  const directory = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-browser-network-'));
  const entered = deferred(), networkStarted = deferred(), releaseActivation = deferred(), probes = [], revoked = [], localProviders = [], operationRequests = [], pluginInputs = [], launchInputs = [];
  const activationStarted = deferred(), allowInitialCheck = deferred(), actionFailure = deferred(), probeEvents = new EventEmitter(), runtimes = [], switches = [], measurements = [], tcpSamples = [], gates=[],startupWindows=[],savedLocales=[];
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
    if(scenario.cdpCloseError){socket.send(JSON.stringify({id:request.id,error:{message:'Synthetic CDP close failed'}}));return;}
    socket.send(JSON.stringify({ id: request.id, result: {} }));
    browser?.kill();
    socket.close();
  }));
  t.after(async () => {
    allowInitialCheck.resolve();
    releaseActivation.resolve();
    scenario.cdpCloseError=false;
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
      super(); this.signal = signal; this.sessionController = new AbortController(); this.candidateIndex = 0; this.activeConfig = proxy;
      this.candidates = [proxy, ...(proxy.proxyOptions?.alternatives || [])];
      this.port = 10001 + runtimes.length * 2; this.socksPort = this.port + 1;
      this.url = `http://127.0.0.1:${this.port}`; this.browserUrl = this.url;
      runtimes.push(this);
    }
    async listen() { return this; }
    candidate(index){assert.ok(this.candidates[index]);return this.candidates[index];}
    async close() { this.closed = true; this.sessionController.abort(); }
    async switchCandidate(index, { validate } = {}) {
      assert.ok(this.candidates[index], 'Only the configured synthetic candidate can be restored');
      await validate?.(this.candidates[index], this.sessionController.signal);
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
  class Gate{
    constructor(runtime){this.runtime=runtime;this.port=20001+gates.length;this.url=`http://127.0.0.1:${this.port}`;this.browserUrl=this.url;this.allowed=false;gates.push(this);}
    async listen(){}
    allow(){assert.equal(this.closed,undefined);this.allowed=true;}
    block(){this.allowed=false;this.blocks=(this.blocks||0)+1;}
    async close(){this.block();this.closed=true;}
  }
  const overrides = {
    'node:child_process': { spawn: () => (browser = new BrowserProcess()) },
    '../services/ProxyRuntime': { ProxyRuntime: Runtime, proxyError },
    '../services/BrowserProxyGate':{BrowserProxyGate:Gate},
    './StartupWindow':{StartupWindow:class{
      constructor(callbacks){this.callbacks=callbacks;startupWindows.push(this);}
      show(value){this.visible=true;this.update(value);}
      update(value){this.state={...this.state,...value};}
      close(){this.closed=true;this.visible=false;}
    }},
    '../runtime/ProxyLocaleCache':{ProxyLocaleCache:class{
      async load(){return scenario.cachedLocale||null;}
      async save(exit){const locale=resolveProxyLocale(fingerprint,exit);savedLocales.push(locale);return locale;}
      matches(locale,exit){try{return JSON.stringify(locale)===JSON.stringify(resolveProxyLocale(fingerprint,exit));}catch{return false;}}
    }},
    '../services/ProxyRoutes': {ProxyRoutes:class extends ProxyRoutes{
      constructor(proxy,runtime,options){super(proxy,runtime,{...options,Runtime,tcp:async connection=>{tcpSamples.push(connection);return 5;},
        measure:async(target,url)=>{measurements.push({target,url});return scenario.routeDelay?scenario.routeDelay(runtimes.find(item=>item.url===url).activeConfig):42;}});}
    }},
    '../runtime/KernelManager': { KernelManager: class {
      async ensure() { return { version: '144', executable: path.join(directory, 'synthetic-browser.exe') }; }
      async cancelAll() {}
    } },
    './NativeWindow': { NativeWindow: class { async reveal() { return true; } release() {} } },
    '../runtime/IndependentKernel': { compileFingerprint() {}, prepareLaunch: async (environment,options) => { launchInputs.push({...structuredClone(environment),launchProxyUrl:options.proxyUrl}); return { args: [] }; } },
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
      collectGeo: ({ signal,providers,accept,proxyUrl,expectedIp,timeout,requestTimeout,providerConcurrency }) => new Promise((resolve, reject) => {
        activeProbes++;
        let settled = false;
        const finish = (error, value) => {
          if (settled) return;
          settled = true; activeProbes--; signal.removeEventListener('abort', abort);
          error ? reject(error) : resolve(value);
        };
        const abort = () => finish(signal.reason || new DOMException('Cancelled', 'AbortError'));
        const runtime = runtimes.find(item => item.url === proxyUrl);
        probes.push({ signal, providers, accept, proxyUrl, expectedIp, timeout, requestTimeout, providerConcurrency, upstreamHost: runtime?.activeConfig.host,relayHost:runtime?.activeConfig.proxyOptions?.transit?.host,
          get settled() { return settled; }, resolve: value => finish(null, value) });
        networkStarted.resolve();
        probeEvents.emit('probe');
        if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once: true });
      }),
    },
    '../pluginManage/PluginActivation': {
      activatePlugins: async (run,builds,signal,{onReload}) => {
        // Invoke the callback installed by the actual BrowserHost.start(). The
        // real DesktopBridge, filesystem, journal and cancellation remain used.
        activationStarted.resolve();
        run.testReload=()=>onReload({id:'a'.repeat(32)});
        await allowInitialCheck.promise;
        networkResult = run.bridge.onAction('GetNetworkInfo', {});
        if(scenario.activation)networkResult=scenario.activation({run,onReload,first:networkResult});
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
      if (url.pathname === '/extension/api/v1/bindMall/setAccessStatus') {await scenario.statusUpdate?.();return { ok:true,json:async()=>({data:{}}) };}
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
  }, api,{operations:async request=>{operationRequests.push(request);return operations;},onActionError:error=>actionFailure.resolve(error)});
  return {
    host, probes, revoked, localProviders, operationRequests, pluginInputs, launchInputs, runtimes, switches, measurements, tcpSamples,gates,startupWindows,savedLocales,
    open: () => (opening = host.open(shopId)),
    entered: entered.promise,
    networkStarted: networkStarted.promise,
    activationStarted: activationStarted.promise,
    actionFailure: actionFailure.promise,
    releaseInitialCheck: allowInitialCheck.resolve,
    async waitForProbe(index) {
      while (!probes[index]) await once(probeEvents, 'probe', { signal: AbortSignal.timeout(2000) });
      return probes[index];
    },
    releaseActivation: releaseActivation.resolve,
    get networkResult() { return networkResult; },
    get activeProbes() { return activeProbes; },
    get run(){return host.running.get(shopId);},
    get browser(){return browser;},
  };
}

const geo=()=>({...successfulExit(),country_code:'JP',timezone:'Asia/Tokyo'});
const autoFingerprint={language:'auto',timezone:'auto'};
async function opened(setup){const opening=setup.open();await setup.entered;setup.releaseActivation();await opening;return setup.run;}
async function verified(setup,value=successfulExit()){
  const opening=setup.open();(await setup.waitForProbe(0)).resolve(value);
  await setup.entered;await setup.run.networkInitialization;
  const result=await setup.run.bridge.onAction('GetNetworkInfo',{});assert.equal(result.allowed,true);
  await completePluginCheck(setup.run);setup.releaseActivation();await opening;return setup.run;
}
async function poll(setup){await setup.run.networkInitialization;return setup.run.bridge.onAction('GetNetworkInfo',{});}
async function monitor(setup,value){const index=setup.probes.length,checking=setup.run.relay.tick();(await setup.waitForProbe(index)).resolve(value);await checking;}

test('a visible shop and short polling responses do not wait for a slow initial exit probe',{timeout:5000},async t=>{
  const setup=await fixture(t),run=await opened(setup);
  assert.equal(run.status,'running');assert.equal(setup.probes.length,1);assert.equal(setup.probes[0].settled,false);
  for(let i=0;i<4;i++){const result=await run.bridge.onAction('GetNetworkInfo',{});assert.equal(result.pending,true);assert.equal(result.allowed,false);assert.equal(result.attemptId,1);assert.ok(result.elapsedMs>=11000);}
  assert.equal(setup.probes.length,1);assert.equal(setup.gates[0].allowed,false);
  assert.equal(setup.pluginInputs[0].proxyUrl,setup.gates[0].url);assert.equal(setup.launchInputs[0].launchProxyUrl,setup.gates[0].browserUrl);
  assert.notEqual(setup.gates[0].url,setup.runtimes[0].url);
  await assert.rejects(run.bridge.onAction('CheckCompleted',{}),/尚未完成/);
  setup.probes[0].resolve(successfulExit());const result=await poll(setup);assert.equal(result.allowed,true);assert.equal(result.pending,false);
  assert.equal(setup.gates[0].allowed,false);await completePluginCheck(run);assert.equal(setup.gates[0].allowed,true);
  await run.bridge.onAction('GetNetworkInfo',{});await run.bridge.onAction('GetNetworkInfo',{});assert.equal(setup.probes.length,1,'Successful terminal reads must not start more probes');
  assert.equal(setup.probes[0].timeout,undefined);assert.equal(setup.probes[0].providerConcurrency,undefined);
});

test('explicit recheck after success closes the gate and reports a newly failed connection',{timeout:5000},async t=>{
  const setup=await fixture(t),run=await verified(setup),previous=run.networkAttempt;
  const retry=await run.bridge.onAction('GetNetworkInfo',{retry:true});assert.equal(retry.pending,true);assert.equal(retry.attemptId,previous+1);assert.equal(setup.gates[0].allowed,false);
  const shared=await run.bridge.onAction('GetNetworkInfo',{retry:true});assert.equal(shared.attemptId,retry.attemptId);
  (await setup.waitForProbe(1)).resolve({available:false});const result=await poll(setup);
  assert.equal(result.allowed,false);assert.equal(result.pending,false);assert.equal(setup.probes.length,2);assert.equal(setup.gates[0].allowed,false);
  await assert.rejects(run.bridge.onAction('CheckCompleted',{attemptId:previous}),/已过期/);
});

test('a successful explicit recheck requires a new attempt acknowledgement before reopening traffic',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup),previous=run.networkAttempt;
  const retry=await run.bridge.onAction('GetNetworkInfo',{retry:true});(await setup.waitForProbe(1)).resolve(successfulExit());
  const result=await poll(setup);assert.equal(result.allowed,true);assert.equal(result.attemptId,retry.attemptId);assert.equal(result.attemptId,previous+1);assert.equal(setup.gates[0].allowed,false);
  await assert.rejects(run.bridge.onAction('CheckCompleted',{attemptId:previous}),/已过期/);
  await monitor(setup,successfulExit());assert.equal(setup.gates[0].allowed,false,'A periodic health check must not bypass this attempt acknowledgement');
  await completePluginCheck(run);assert.equal(setup.gates[0].allowed,true);
  await run.bridge.onAction('GetNetworkInfo',{});assert.equal(setup.probes.length,3);
});

test('explicit recheck rejects a busy monitor instead of returning its previous allowed result',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup),previous=run.networkAttempt;
  const checking=run.relay.tick(),active=await setup.waitForProbe(1);
  await assert.rejects(run.bridge.onAction('GetNetworkInfo',{retry:true}),/线路正在检测或切换/);
  assert.equal(run.networkAttempt,previous);assert.equal(setup.probes.length,2);active.resolve(successfulExit());await checking;
  const retry=await run.bridge.onAction('GetNetworkInfo',{retry:true});assert.equal(retry.pending,true);assert.equal(retry.attemptId,previous+1);
  (await setup.waitForProbe(2)).resolve(successfulExit());await poll(setup);await completePluginCheck(run);
});

test('explicit recheck rejects an isolated speed test and does not disguise it as a new exit check',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup),previous=run.networkAttempt;
  const measuring=run.bridge.onAction('TransferSpeed',{snapshotId:run.routes.snapshotId,candidateIndex:1}),isolated=await setup.waitForProbe(1);
  await assert.rejects(run.bridge.onAction('GetNetworkInfo',{retry:true}),/线路正在检测或切换/);
  assert.equal(run.networkAttempt,previous);assert.equal(setup.probes.length,2);isolated.resolve(successfulExit());await measuring;
});

test('a failed check leaves the page open and only explicit retry creates a new shared attempt',{timeout:5000},async t=>{
  const setup=await fixture(t),run=await opened(setup);
  setup.probes[0].resolve({available:false});const failed=await poll(setup);assert.equal(failed.allowed,false);assert.equal(failed.pending,false);
  assert.equal(setup.browser.killed,false);assert.equal(setup.runtimes[0].closed,undefined);
  await run.bridge.onAction('GetNetworkInfo',{});assert.equal(setup.probes.length,1);
  const retry=await run.bridge.onAction('GetNetworkInfo',{retry:true});assert.equal(retry.pending,true);assert.equal(retry.attemptId,2);
  await run.bridge.onAction('GetNetworkInfo',{retry:true});(await setup.waitForProbe(1)).resolve(successfulExit());
  assert.equal((await poll(setup)).allowed,true);assert.equal(setup.probes.length,2);await completePluginCheck(run);assert.equal(setup.gates[0].allowed,true);
});

test('managed startup runs behind the visible page with twenty-second probes and two providers',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await opened(setup);
  const first=await setup.waitForProbe(0);assert.equal(first.timeout,20000);assert.equal(first.requestTimeout,20000);assert.equal(first.providerConcurrency,2);
  first.resolve(successfulExit());assert.equal((await poll(setup)).allowed,true);await completePluginCheck(run);
  assert.equal(setup.measurements.length,0);assert.equal(setup.tcpSamples.length,0);assert.equal(setup.switches.length,0);
  const tick=run.relay.tick(),next=await setup.waitForProbe(1);assert.equal(next.timeout,14000);assert.equal(next.providerConcurrency,2);next.resolve(successfulExit());await tick;
});

test('a failed primary is isolated before replacement and the actual selected route is checked before allowing traffic',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await opened(setup);
  setup.probes[0].resolve({available:false});const candidate=await setup.waitForProbe(1);
  assert.equal(candidate.relayHost,'relay-b.test');assert.equal(candidate.timeout,20000);assert.equal(candidate.providerConcurrency,2);assert.equal(setup.switches.length,0);
  assert.equal((await run.bridge.onAction('GetNetworkInfo',{})).phase,'switching');candidate.resolve(successfulExit());
  const actual=await setup.waitForProbe(2);assert.equal(actual.proxyUrl,setup.runtimes[0].url);assert.equal(actual.relayHost,'relay-b.test');assert.equal(setup.gates[0].allowed,false);
  actual.resolve(successfulExit());assert.equal((await poll(setup)).allowed,true);await completePluginCheck(run);
  assert.equal(setup.gates[0].allowed,true);assert.equal(setup.runtimes[1].closed,true);assert.equal(setup.probes.length,3);
});

test('all failed relay candidates keep the browser check page blocked and retryable',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await opened(setup);
  setup.probes[0].resolve({available:false});(await setup.waitForProbe(1)).resolve({available:false});
  const result=await poll(setup);assert.equal(result.allowed,false);assert.match(result.message,/中继池暂时没有可用线路/);
  assert.equal(run.relay.status,'unavailable');assert.equal(setup.browser.killed,false);assert.equal(setup.gates[0].allowed,false);
  assert.equal(setup.switches.length,0);assert.equal(setup.runtimes[1].closed,true);
});

test('an incorrect initial exit is never authorized even though its check window stays open',{timeout:5000},async t=>{
  const setup=await fixture(t),run=await opened(setup);setup.probes[0].resolve({...successfulExit(),ip:'8.8.8.8'});
  const result=await poll(setup);assert.equal(result.allowed,false);assert.equal(setup.gates[0].allowed,false);assert.equal(setup.browser.killed,false);
  await assert.rejects(run.bridge.onAction('CheckCompleted',{}),/尚未完成/);
});

test('successful isolated fallback cannot hide an incorrect actual selected exit',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})});await opened(setup);
  setup.probes[0].resolve({available:false});(await setup.waitForProbe(1)).resolve(successfulExit());
  (await setup.waitForProbe(2)).resolve({...successfulExit(),ip:'8.8.8.8'});
  assert.equal((await poll(setup)).allowed,false);assert.equal(setup.gates[0].allowed,false);assert.equal(setup.browser.killed,false);
});

test('closing the visible page cancels its in-flight probe and clears gate, bridge and session',{timeout:5000},async t=>{
  const setup=await fixture(t);await opened(setup);await setup.host.close(shopId);
  assert.equal(setup.probes[0].signal.aborted,true);assert.equal(setup.activeProbes,0);assert.equal(setup.host.running.size,0);
  assert.equal(setup.gates[0].closed,true);assert.equal(setup.runtimes[0].closed,true);assert.equal(setup.revoked.length,1);
});

test('closing while validating a fallback cancels the isolated request and never commits it',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})});await opened(setup);
  setup.probes[0].resolve({available:false});const isolated=await setup.waitForProbe(1);await setup.host.close(shopId);
  assert.equal(isolated.signal.aborted,true);assert.equal(setup.runtimes[1].closed,true);assert.equal(setup.switches.length,0);assert.equal(setup.activeProbes,0);
});

test('plugin reload reuses the same verified route but must read and complete the new generation',{timeout:5000},async t=>{
  const setup=await fixture(t),run=await verified(setup);const attempt=run.networkAttempt;
  run.testReload();assert.equal(setup.gates[0].allowed,false);assert.equal(run.bridge.ready,false);
  await assert.rejects(run.bridge.onAction('CheckCompleted',{}),/尚未完成/);
  const second=await run.bridge.onAction('GetNetworkInfo',{});assert.equal(second.allowed,true);assert.equal(second.attemptId,attempt);
  await completePluginCheck(run);assert.equal(run.bridge.ready,true);assert.equal(setup.gates[0].allowed,true);assert.equal(setup.probes.length,1);
});

test('a delayed completion from an older plugin generation cannot open the gate',{timeout:5000},async t=>{
  const status=deferred(),entered=deferred();const setup=await fixture(t,undefined,{}, {statusUpdate:async()=>{entered.resolve();await status.promise;}});
  const run=await opened(setup);setup.probes[0].resolve(successfulExit());await poll(setup);
  const completion=run.bridge.onAction('CheckCompleted',{});await entered.promise;run.testReload();status.resolve();
  await assert.rejects(completion,/线路已变化/);assert.equal(setup.gates[0].allowed,false);
  await run.bridge.onAction('GetNetworkInfo',{});await assert.rejects(run.bridge.onAction('CheckCompleted',{attemptId:999}),/已过期/);
});

test('manual switching returns only the gated HTTP address and requires real-route verification plus completion',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  const switching=run.bridge.onAction('StartProxy',{proxyInfo:{snapshotId:run.routes.snapshotId,candidateIndex:1}});
  const isolated=await setup.waitForProbe(1);assert.equal(setup.gates[0].allowed,false);assert.equal(isolated.timeout,14000);isolated.resolve(successfulExit());
  const selected=await switching;assert.equal(selected.proxyAddress.length,1);assert.equal(selected.proxyAddress[0].port,setup.gates[0].port);assert.equal(selected.proxyAddress[0].protocol,'http');
  const actual=await setup.waitForProbe(2);assert.equal(actual.relayHost,'relay-b.test');actual.resolve(successfulExit());
  const result=await poll(setup);assert.equal(result.allowed,true);assert.equal(setup.gates[0].allowed,false);assert.equal(run.relay.automatic,false);
  await completePluginCheck(run);assert.equal(setup.gates[0].allowed,true);
});

test('a rejected isolated manual candidate preserves the existing healthy authorized route',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  const switching=run.bridge.onAction('StartProxy',{proxyInfo:{snapshotId:run.routes.snapshotId,candidateIndex:1}});
  (await setup.waitForProbe(1)).resolve({...successfulExit(),ip:'8.8.8.8'});await assert.rejects(switching);
  assert.equal(setup.switches.length,0);assert.equal(setup.gates[0].allowed,true);assert.equal(setup.browser.killed,false);assert.equal(setup.runtimes[1].closed,true);
});

test('a duplicate manual switch is rejected without clearing the first operation intent',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  const args={proxyInfo:{snapshotId:run.routes.snapshotId,candidateIndex:1}};
  const switching=run.bridge.onAction('StartProxy',args),isolated=await setup.waitForProbe(1);
  await assert.rejects(run.bridge.onAction('StartProxy',args),/线路正在检测或切换/);assert.equal(run.manualSelection,true);
  isolated.resolve({...successfulExit(),ip:'8.8.8.8'});await assert.rejects(switching);
  assert.equal(setup.gates[0].allowed,true);assert.equal(run.networkState.allowed,true);assert.equal(setup.switches.length,0);
});

test('retrying a failed manual route verifies that choice without restoring automatic selection',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  const switching=run.bridge.onAction('StartProxy',{proxyInfo:{snapshotId:run.routes.snapshotId,candidateIndex:1}});
  (await setup.waitForProbe(1)).resolve(successfulExit());await switching;
  (await setup.waitForProbe(2)).resolve({available:false});assert.equal((await poll(setup)).allowed,false);
  await run.bridge.onAction('GetNetworkInfo',{retry:true});const retried=await setup.waitForProbe(3);
  assert.equal(retried.relayHost,'relay-b.test');assert.equal(retried.proxyUrl,setup.runtimes[0].url);retried.resolve({available:false});
  assert.equal((await poll(setup)).allowed,false);assert.equal(setup.probes.length,4);assert.equal(setup.switches.length,1);assert.equal(run.relay.automatic,false);
});

test('provider failures retain a healthy authorized route until the existing failure threshold',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  await monitor(setup,{available:false});await monitor(setup,{available:false});assert.equal(run.relay.failures,2);
  assert.equal(setup.gates[0].allowed,true);assert.equal(setup.browser.killed,false);assert.equal(setup.switches.length,0);
  await monitor(setup,successfulExit());assert.equal(run.relay.failures,0);
});

test('manual mode continues exit monitoring and blocks faults without selecting another relay',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  run.relay.setAutomatic(false);
  const tick=run.relay.tick();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(setup.probes.length,2,'Disabling automatic switching must retain current-exit verification');
  setup.probes[1].resolve({available:false});await tick;
  await monitor(setup,{available:false});await monitor(setup,{available:false});
  assert.equal(run.relay.status,'unavailable');assert.equal(setup.gates[0].allowed,false);assert.equal(setup.switches.length,0);
  await monitor(setup,successfulExit());assert.equal(run.relay.status,'locked');assert.equal(setup.gates[0].allowed,true);assert.equal(setup.switches.length,0);
});

test('manual mode still closes a shop when monitoring proves its bound exit changed',{timeout:5000},async t=>{
  const scenario={proxy:managedProxy({fixed:true}),cdpCloseError:true},setup=await fixture(t,undefined,{},scenario),run=await verified(setup);
  run.relay.setAutomatic(false);
  const tick=run.relay.tick();await new Promise(resolve=>setImmediate(resolve));
  assert.equal(setup.probes.length,2,'Locked routes must continue checking their bound exit');
  setup.probes[1].resolve({...successfulExit(),ip:'8.8.8.8'});await tick.catch(()=>{});await setup.actionFailure;
  assert.equal(setup.gates[0].allowed,false);assert.equal(setup.runtimes[0].closed,true);assert.equal(setup.switches.length,0);
});

test('authorized automatic failover blocks while switching and resumes only after actual route verification',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  await monitor(setup,{available:false});await monitor(setup,{available:false});
  const tick=run.relay.tick();(await setup.waitForProbe(3)).resolve({available:false});
  const isolated=await setup.waitForProbe(4);assert.equal(setup.gates[0].allowed,false);isolated.resolve(successfulExit());
  const actual=await setup.waitForProbe(5);assert.equal(setup.gates[0].allowed,false);actual.resolve(successfulExit());await tick;
  assert.equal(setup.gates[0].allowed,true);assert.equal(run.proxy.candidateIndex,1);assert.equal(run.networkState.allowed,true);assert.equal(run.networkState.routeRevision,1);
});

test('automatic exhaustion keeps an unhealthy old route blocked and later verifies recovery',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  await monitor(setup,{available:false});await monitor(setup,{available:false});
  const tick=run.relay.tick();(await setup.waitForProbe(3)).resolve({available:false});
  const isolated=await setup.waitForProbe(4);assert.equal(setup.gates[0].allowed,false);isolated.resolve({available:false});await tick;
  assert.equal(run.relay.status,'unavailable');assert.equal(run.networkState.allowed,false);assert.equal(setup.gates[0].allowed,false);assert.equal(setup.switches.length,0);
  await monitor(setup,successfulExit());assert.equal(run.relay.status,'healthy');assert.equal(run.networkState.allowed,true);assert.equal(setup.gates[0].allowed,true);
});

test('a single-candidate pool blocks at the same failure threshold and reopens only after recovery',{timeout:5000},async t=>{
  const proxy=managedProxy({fixed:true});proxy.proxyOptions.alternatives=[];proxy.relayPool.candidates=proxy.relayPool.candidates.slice(0,1);
  const setup=await fixture(t,undefined,{}, {proxy}),run=await verified(setup);
  await monitor(setup,{available:false});await monitor(setup,{available:false});assert.equal(setup.gates[0].allowed,true);
  await monitor(setup,{available:false});assert.equal(run.relay.status,'unavailable');assert.equal(run.networkState.allowed,false);assert.equal(setup.gates[0].allowed,false);
  assert.equal(setup.runtimes.length,1);await monitor(setup,successfulExit());assert.equal(run.relay.status,'healthy');assert.equal(setup.gates[0].allowed,true);
});

test('a wrong live exit blocks and releases the proxy even if CDP close fails',{timeout:5000},async t=>{
  const scenario={proxy:managedProxy({fixed:true}),cdpCloseError:true};const setup=await fixture(t,undefined,{},scenario),run=await verified(setup);
  const tick=run.relay.tick();(await setup.waitForProbe(1)).resolve({...successfulExit(),ip:'8.8.8.8'});await tick.catch(()=>{});await setup.actionFailure;
  assert.equal(setup.gates[0].allowed,false);assert.equal(setup.runtimes[0].closed,true);assert.equal(run.networkController.signal.aborted,true);
});

test('cold automatic locale shows a local window first and never launches the real profile with guessed locale',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,autoFingerprint,{proxy:managedProxy({fixed:true})});const opening=setup.open();const first=await setup.waitForProbe(0);
  assert.equal(setup.startupWindows.length,1);assert.equal(setup.startupWindows[0].visible,true);assert.equal(setup.launchInputs.length,0);assert.equal(typeof first.accept,'function');
  first.resolve(geo());await setup.entered;assert.equal(setup.launchInputs[0].runtimeLocale.timezone,'Asia/Tokyo');assert.equal(setup.launchInputs[0].runtimeLocale.language,'ja-JP,ja');
  assert.equal(setup.startupWindows[0].closed,true);assert.equal((await poll(setup)).allowed,true);await completePluginCheck(setup.run);
  setup.releaseActivation();await opening;assert.equal(setup.probes.length,1);
  const tick=setup.run.relay.tick(),later=await setup.waitForProbe(1);assert.equal(later.accept,undefined);assert.equal(later.timeout,14000);later.resolve(successfulExit());await tick;
});

test('cold locale failure stays in the local check window and retry can continue the same open operation',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,autoFingerprint);const opening=setup.open();(await setup.waitForProbe(0)).resolve({available:false});await setup.run.networkInitialization;
  assert.equal(setup.startupWindows[0].visible,true);assert.equal(setup.startupWindows[0].state.retry,true);assert.equal(setup.launchInputs.length,0);
  setup.startupWindows[0].callbacks.onRetry();(await setup.waitForProbe(1)).resolve(geo());await setup.entered;await poll(setup);setup.releaseActivation();await opening;
  assert.equal(setup.launchInputs.length,1);assert.equal(setup.run.networkAttempt,2);
});

test('closing a cold locale check window cancels preparation without starting the real browser',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,autoFingerprint);const opening=setup.open();await setup.waitForProbe(0);await setup.host.close(shopId);await opening;
  assert.equal(setup.launchInputs.length,0);assert.equal(setup.startupWindows[0].closed,true);assert.equal(setup.probes[0].signal.aborted,true);assert.equal(setup.host.running.size,0);
});

test('warm locale cache opens immediately but still requires a fresh matching country and timezone',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,autoFingerprint,{cachedLocale:{language:'ja-JP,ja',timezone:'Asia/Tokyo'}}),run=await opened(setup);
  assert.equal(setup.startupWindows.length,0);assert.equal(setup.probes[0].settled,false);assert.equal(typeof setup.probes[0].accept,'function');assert.equal(setup.gates[0].allowed,false);
  setup.probes[0].resolve(geo());assert.equal((await poll(setup)).allowed,true);await completePluginCheck(run);assert.equal(setup.gates[0].allowed,true);assert.equal(setup.savedLocales.length,1);
});

test('warm locale mismatch updates the cache but never silently changes a running fingerprint or admits traffic',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,autoFingerprint,{cachedLocale:{language:'en-US,en',timezone:'America/New_York'}});await opened(setup);
  setup.probes[0].resolve(geo());const result=await poll(setup);assert.equal(result.allowed,false);assert.match(result.message,/语言或时区已变化/);
  assert.equal(setup.launchInputs[0].runtimeLocale.timezone,'America/New_York');assert.equal(setup.savedLocales[0].timezone,'Asia/Tokyo');assert.equal(setup.gates[0].allowed,false);assert.equal(setup.browser.killed,false);
});

test('resource proxy is also gated until a verified completion and is blocked on reload',{timeout:5000},async t=>{
  const proxy={protocol:'http',host:'1.1.1.1',port:8080,webType:2,proxyOptions:{resourceProxy:{protocol:'http',host:'2.2.2.2',port:8080}}};
  const setup=await fixture(t,undefined,{}, {proxy}),run=await opened(setup);
  assert.equal(setup.gates.length,2);assert.equal(setup.pluginInputs[0].resourceProxyUrl,setup.gates[1].url);assert.equal(setup.gates[1].allowed,false);
  setup.probes[0].resolve(successfulExit());await poll(setup);await completePluginCheck(run);assert.equal(setup.gates[1].allowed,true);
  run.testReload();assert.equal(setup.gates[0].allowed,false);assert.equal(setup.gates[1].allowed,false);
});

test('isolated speed measurements retain fourteen-second budgets and never change the live route',{timeout:5000},async t=>{
  const setup=await fixture(t,undefined,{}, {proxy:managedProxy({fixed:true})}),run=await verified(setup);
  const measuring=run.bridge.onAction('TransferSpeed',{snapshotId:run.routes.snapshotId,candidateIndex:1}),isolated=await setup.waitForProbe(1);
  assert.equal(isolated.timeout,14000);assert.equal(isolated.providerConcurrency,2);isolated.resolve(successfulExit());await measuring;
  assert.equal(setup.switches.length,0);assert.equal(setup.runtimes[1].closed,true);assert.equal(setup.gates[0].allowed,true);
});

test('configured provider lists flow into the single shared check without adding browser work',{timeout:5000},async t=>{
  const operations={networkRouting:{enabled:false},networkChecks:{enabled:true,proxyProviders:['https://provider.invalid/json'],localProviders:['https://local.invalid/json']}};
  const setup=await fixture(t,operations);await opened(setup);assert.deepEqual(setup.probes[0].providers,operations.networkChecks.proxyProviders);assert.deepEqual(setup.localProviders[0],operations.networkChecks.localProviders);
  setup.probes[0].resolve(successfulExit());await poll(setup);assert.equal(setup.probes.length,1);
});
