const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const { collectGeo, validateExit, createExitValidation } = require('../src/main/pluginManage/NetworkInfo');

test('a domain exit is pinned once for a managed session and never changes with a candidate',()=>{
  const validation=createExitValidation({host:'gateway.example.com',webType:2,relayPool:{id:'pool'}});
  assert.equal(validation.expectedIp,'');
  assert.equal(validation.validate({available:false}).allowed,false);
  assert.equal(validation.expectedIp,'','failed probes cannot establish an exit');
  assert.equal(validation.validate({available:true,ip:'1.1.1.1'}).allowed,true);
  assert.equal(validation.expectedIp,'1.1.1.1');
  assert.equal(validation.validate({available:true,ip:'8.8.8.8'}).allowed,false);
  assert.equal(validation.expectedIp,'1.1.1.1','a later mismatch cannot overwrite the first valid baseline');
  assert.equal(validation.validate({available:true,ip:'1.1.1.1'}).allowed,true);
});

test('a configured fixed exit takes precedence and ordinary dynamic devices keep their previous validation',()=>{
  const fixed=createExitValidation({host:'gateway.example.com',mapIp:'1.1.1.1',webType:2,relayPool:{id:'pool'}});
  assert.equal(fixed.validate({available:true,ip:'8.8.8.8'}).allowed,false);assert.equal(fixed.expectedIp,'1.1.1.1');
  const dynamic=createExitValidation({host:'gateway.example.com',webType:1});
  assert.equal(dynamic.validate({available:true,ip:'1.1.1.1'}).allowed,true);
  assert.equal(dynamic.validate({available:true,ip:'8.8.8.8'}).allowed,true);assert.equal(dynamic.expectedIp,'');
});

const geo = (ip = '1.1.1.1') => ({ ip, country_code: 'AU', country_name: 'Australia' });
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));

function bounded(promise, milliseconds = 1200) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, reject) => { timer = setTimeout(() => reject(new Error('Probe did not settle after cancellation')), milliseconds); }),
  ]).finally(() => clearTimeout(timer));
}

async function until(predicate, milliseconds = 800) {
  const deadline = Date.now() + milliseconds;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await pause(10);
  }
  assert.ok(predicate(), 'Expected proxy socket lifecycle transition');
}

// A real local HTTP proxy accepts CONNECT but never answers it. No destination
// socket, DNS lookup, certificate or external service is used by these tests.
async function silentProxy(t) {
  const sockets = new Set(), connections = [];
  const server = http.createServer();
  server.on('connection', socket => {
    sockets.add(socket);
    socket.on('error', () => {});
    // HTTP CONNECT upgrades retain half-open server sockets by default. Close
    // our writable half only after the client has actually sent FIN.
    socket.once('end', () => socket.end());
    socket.once('close', () => sockets.delete(socket));
  });
  server.on('connect', (request, socket) => {
    connections.push(request.url);
    socket.resume();
  });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  t.after(async () => {
    for (const socket of sockets) socket.destroy();
    await bounded(new Promise(resolve => server.close(resolve)));
  });
  return { url: `http://127.0.0.1:${server.address().port}`, sockets, connections };
}

function delayed(value, milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const finish = (error, result) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', abort);
      error ? reject(error) : resolve(result);
    };
    const abort = () => finish(signal.reason || new DOMException('Cancelled', 'AbortError'));
    const timer = setTimeout(() => finish(null, value), milliseconds);
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
}

test('the total probe deadline closes a real unfinished proxy CONNECT', { timeout: 4000 }, async t => {
  const proxy = await silentProxy(t);
  const result = await bounded(collectGeo({
    proxyUrl: proxy.url, providers: ['https://probe.invalid/'],
    timeout: 150, requestTimeout: 2000, firstValid: true,
  }));
  assert.equal(result.available, false);
  assert.equal(result.failure, 'timeout');
  assert.equal(proxy.connections.length, 1);
  await until(() => proxy.sockets.size === 0);
});

test('closing the shop cancels an unfinished CONNECT and starts no fallback request', { timeout: 4000 }, async t => {
  const proxy = await silentProxy(t), controller = new AbortController();
  t.after(() => controller.abort());
  const operation = collectGeo({
    proxyUrl: proxy.url, providers: ['https://first.invalid/', 'https://second.invalid/'],
    signal: controller.signal, timeout: 2000, requestTimeout: 1500, firstValid: true,
  });
  const rejected = assert.rejects(bounded(operation), { name: 'AbortError' });
  await until(() => proxy.connections.length === 1);
  controller.abort(new DOMException('Synthetic shop close', 'AbortError'));
  await rejected;
  await until(() => proxy.sockets.size === 0);
  assert.equal(proxy.connections.length, 1);
});

test('each stalled CONNECT is released before the provider fallback exhausts its budget', { timeout: 4000 }, async t => {
  const proxy = await silentProxy(t);
  const result = await bounded(collectGeo({
    proxyUrl: proxy.url, providers: ['https://first.invalid/', 'https://second.invalid/'],
    timeout: 2000, requestTimeout: 100, firstValid: true,
  }));
  assert.equal(result.available, false);
  assert.equal(result.failure, 'timeout');
  assert.deepEqual(proxy.connections, ['first.invalid:443', 'second.invalid:443']);
  await until(() => proxy.sockets.size === 0);
});

test('proxy providers run sequentially and a matching exit prevents further probes', { timeout: 3000 }, async () => {
  const providers = ['https://unavailable.invalid/', 'https://matching.invalid/', 'https://unused.invalid/'];
  const calls = [];
  let active = 0, maximum = 0;
  const result = await collectGeo({
    proxyUrl: 'http://127.0.0.1:1', providers, expectedIp: '1.1.1.1', firstValid: true,
    timeout: 1000, requestTimeout: 500,
    request: async (url, _agent, signal) => {
      calls.push(url); maximum = Math.max(maximum, ++active);
      try {
        await delayed(null, 25, signal);
        if (url === providers[0]) throw new Error('Synthetic unavailable provider');
        return geo();
      } finally { active--; }
    },
  });
  assert.equal(maximum, 1);
  assert.deepEqual(calls, providers.slice(0, 2));
  assert.equal(result.available, true);
  assert.equal(result.ip, '1.1.1.1');
});

test('a timed out provider can fall back without cancelling the whole probe', { timeout: 3000 }, async () => {
  let calls = 0, active = 0, maximum = 0, cancelled = 0;
  const result = await collectGeo({
    proxyUrl: 'http://127.0.0.1:1', providers: ['https://slow.invalid/', 'https://ready.invalid/'],
    timeout: 1000, requestTimeout: 80, firstValid: true,
    request: async (_url, _agent, signal) => {
      const index = calls++; maximum = Math.max(maximum, ++active);
      try { return await delayed(geo(), index === 0 ? 2000 : 5, signal); }
      catch (error) { if (signal.aborted) cancelled++; throw error; }
      finally { active--; }
    },
  });
  assert.equal(result.available, true);
  assert.equal(calls, 2);
  assert.equal(cancelled, 1);
  assert.equal(maximum, 1);
});

test('two bounded providers return the matching exit without waiting for a hung first site', { timeout: 3000 }, async () => {
  const providers = ['https://hung.invalid/', 'https://ready.invalid/', 'https://unused.invalid/'];
  const calls = [];
  let active = 0, maximum = 0, cancelled = 0;
  const result = await bounded(collectGeo({
    proxyUrl: 'http://user:private-value@127.0.0.1:1', providers, providerConcurrency: 99,
    expectedIp: '1.1.1.1', firstValid: true, timeout: 2000, requestTimeout: 2000,
    request: async (url, _agent, signal) => {
      calls.push(url); maximum = Math.max(maximum, ++active);
      try { return await delayed(geo(), url === providers[0] ? 2500 : 25, signal); }
      catch (error) { if (signal.aborted) cancelled++; throw error; }
      finally { active--; }
    },
  }));
  assert.equal(maximum, 2, 'even a larger requested concurrency must be capped at two');
  assert.deepEqual(calls, providers.slice(0, 2));
  assert.equal(cancelled, 1);
  assert.equal(active, 0, 'all started request cleanup must complete before return');
  assert.equal(result.ip, '1.1.1.1');
  assert.deepEqual(result.diagnostics.map(item => item.result), ['cancelled', 'success']);
  assert.equal(JSON.stringify(result.diagnostics).includes('private-value'), false);
});

test('an earlier wrong exit cannot win a parallel probe over a later matching exit', { timeout: 3000 }, async () => {
  const providers = ['https://wrong.invalid/', 'https://matching.invalid/', 'https://hung.invalid/'];
  let active = 0, maximum = 0, cancelled = 0;
  const result = await bounded(collectGeo({
    proxyUrl: 'http://127.0.0.1:1', providers, providerConcurrency: 2,
    expectedIp: '1.1.1.1', firstValid: true, timeout: 2000, requestTimeout: 2000,
    request: async (url, _agent, signal) => {
      const index = providers.indexOf(url); maximum = Math.max(maximum, ++active);
      try { return await delayed(geo(index === 0 ? '8.8.8.8' : '1.1.1.1'), [15, 60, 2500][index], signal); }
      catch (error) { if (signal.aborted) cancelled++; throw error; }
      finally { active--; }
    },
  }));
  assert.equal(result.ip, '1.1.1.1');
  assert.equal(validateExit({ webType: 2, host: '1.1.1.1' }, result).allowed, true);
  assert.equal(result.diagnostics[0].matchesExpected, false);
  assert.equal(result.diagnostics[1].matchesExpected, true);
  assert.equal(result.multipleExits, true);
  assert.equal(maximum, 2);
  assert.equal(cancelled, 1);
  assert.equal(active, 0);
});

test('external cancellation closes both concurrent real proxy CONNECTs without starting another provider', { timeout: 4000 }, async t => {
  const proxy = await silentProxy(t), controller = new AbortController();
  t.after(() => controller.abort());
  const operation = collectGeo({
    proxyUrl: proxy.url, providerConcurrency: 2,
    providers: ['https://first.invalid/', 'https://second.invalid/', 'https://unused.invalid/'],
    signal: controller.signal, timeout: 2000, requestTimeout: 2000, firstValid: true,
  });
  const rejected = assert.rejects(bounded(operation), { name: 'AbortError' });
  await until(() => proxy.connections.length === 2);
  controller.abort(new DOMException('Synthetic shop close', 'AbortError'));
  await rejected;
  await until(() => proxy.sockets.size === 0);
  assert.deepEqual(proxy.connections.sort(), ['first.invalid:443', 'second.invalid:443']);
});

test('a valid proxy response after five seconds remains within the default request budget', { timeout: 10000 }, async () => {
  const started = performance.now();
  const result = await collectGeo({
    proxyUrl: 'http://127.0.0.1:1', providers: ['https://slow-valid.invalid/'],
    expectedIp: '1.1.1.1', firstValid: true,
    request: (_url, _agent, signal) => delayed(geo(), 5200, signal),
  });
  assert.ok(performance.now() - started >= 5000, 'The test must exercise the former five-second cutoff');
  assert.equal(result.available, true);
  assert.equal(validateExit({ webType: 2, host: '1.1.1.1' }, result).allowed, true);
});

test('a public but incorrect fixed exit cannot pass and later matching evidence can recover', async () => {
  const proxy = { webType: 2, host: '1.1.1.1' };
  let calls = 0;
  const options = {
    proxyUrl: 'http://127.0.0.1:1', expectedIp: proxy.host, firstValid: true,
    providers: ['https://one.invalid/', 'https://two.invalid/'],
    timeout: 1000, requestTimeout: 500,
  };
  const wrong = await collectGeo({ ...options, request: async () => { calls++; return geo('8.8.8.8'); } });
  assert.equal(calls, 2);
  assert.equal(wrong.available, true);
  assert.equal(validateExit(proxy, wrong).allowed, false);
  calls = 0;
  const matched = await collectGeo({ ...options, request: async () => geo(++calls === 1 ? '8.8.8.8' : '1.1.1.1') });
  assert.equal(calls, 2);
  assert.equal(matched.ip, '1.1.1.1');
  assert.equal(validateExit(proxy, matched).allowed, true);
});

test('full proxy sampling stays sequential and records more than one observed exit', async () => {
  let active = 0, maximum = 0, calls = 0;
  const result = await collectGeo({
    proxyUrl: 'http://127.0.0.1:1', firstValid: false,
    providers: ['https://one.invalid/', 'https://two.invalid/'], timeout: 1000, requestTimeout: 500,
    request: async (_url, _agent, signal) => {
      const ip = calls++ === 0 ? '1.1.1.1' : '8.8.8.8'; maximum = Math.max(maximum, ++active);
      try { return await delayed(geo(ip), 20, signal); } finally { active--; }
    },
  });
  assert.equal(maximum, 1);
  assert.equal(result.available, true);
  assert.equal(result.multipleExits, true);
  assert.deepEqual(result.observations.map(item => item.ip), ['1.1.1.1', '8.8.8.8']);
});

test('local location remains parallel and cancels remaining work after matching responses', { timeout: 3000 }, async () => {
  let active = 0, maximum = 0, calls = 0, cancelled = 0;
  const result = await collectGeo({
    providers: ['https://one.invalid/', 'https://two.invalid/', 'https://slow.invalid/'],
    timeout: 1000,
    request: async (_url, _agent, signal) => {
      const index = calls++; maximum = Math.max(maximum, ++active);
      try { return await delayed(geo(), index === 2 ? 2000 : 20 + index * 10, signal); }
      catch (error) { if (signal.aborted) cancelled++; throw error; }
      finally { active--; }
    },
  });
  assert.equal(maximum, 3);
  assert.equal(cancelled, 1);
  assert.equal(active, 0);
  assert.equal(result.available, true);
  assert.equal(result.ip, '1.1.1.1');
});


test('published local providers invalidate cached observations without contacting old endpoints', async () => {
  const {localGeo}=require('../src/main/pluginManage/NetworkInfo'),seen=[];
  const request=async url=>{seen.push(url);return geo(url.includes('second')?'8.8.8.8':'1.1.1.1');};
  const first={providers:['https://first-config.test/ip'],request};
  assert.equal((await localGeo(first)).ip,'1.1.1.1');
  assert.equal((await localGeo(first)).ip,'1.1.1.1');
  const second={providers:['https://second-config.test/ip'],request};
  assert.equal((await localGeo(second)).ip,'8.8.8.8');
  assert.deepEqual(seen,[...first.providers,...second.providers]);
});
