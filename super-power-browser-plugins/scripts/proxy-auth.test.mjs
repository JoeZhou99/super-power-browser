import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { proxyAuthentication, installProxyAuthentication } from '../runtime/proxy-auth.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const desktop = path.resolve(root, '../super-power-browser-desktop');
const require = createRequire(import.meta.url);
const { resolveProxyBinary, reservePorts, launchChild, waitListening, stopChild } = require(path.join(desktop, 'src/main/services/ProxyProcess.js'));
const credentials = { host: '127.0.0.1', port: 32123, username: 'local-account', password: 'p@ss:/?#%"\\ synthetic' };
const config = { localProxy: credentials };
const challenge = { requestId: 'synthetic-request', isProxy: true, statusCode: 407, challenger: { host: credentials.host, port: credentials.port } };

function installed(t, mode = 'superpower') {
  const previous = { chrome: globalThis.chrome, build: globalThis.__SP_BUILD__, config: globalThis.__SP_BOOTSTRAP__ };
  const listeners = {};
  globalThis.chrome = { webRequest: Object.fromEntries(['onAuthRequired', 'onCompleted', 'onErrorOccurred'].map(name => [name, { addListener(callback, filter, extra) { listeners[name] = { callback, filter, extra }; } }])) };
  globalThis.__SP_BUILD__ = { mode };globalThis.__SP_BOOTSTRAP__ = config;
  t.after(() => {
    for (const [key, value] of [['chrome', previous.chrome], ['__SP_BUILD__', previous.build], ['__SP_BOOTSTRAP__', previous.config]]) {
      if (value === undefined) delete globalThis[key];else globalThis[key] = value;
    }
  });
  installProxyAuthentication();
  return {
    listeners,
    request(details = challenge) {
      let response, calls = 0;
      listeners.onAuthRequired.callback(details, value => { response = value;calls++; });
      assert.equal(calls, 1, 'an authentication challenge must complete its callback once');
      return response;
    },
  };
}

test('credentials are supplied only to a matching private loopback proxy 407', () => {
  assert.deepEqual(proxyAuthentication(challenge, config), { username: credentials.username, password: credentials.password });
  for (const details of [
    { ...challenge, isProxy: false, statusCode: 401 },
    { ...challenge, isProxy: true, statusCode: 401 },
    { ...challenge, statusCode: undefined },
    { ...challenge, challenger: { host: '127.0.0.1', port: credentials.port + 1 } },
    { ...challenge, challenger: { host: 'localhost', port: credentials.port } },
    { ...challenge, challenger: { host: 'proxy.example.test', port: credentials.port } },
    { ...challenge, challenger: undefined },
  ]) assert.equal(proxyAuthentication(details, config), null);
  assert.equal(proxyAuthentication(challenge, { localProxy: { ...credentials, host: 'proxy.example.test' } }), null);
  assert.equal(proxyAuthentication(challenge, { localProxy: { ...credentials, password: '' } }), null);
  assert.equal(proxyAuthentication(challenge, undefined), null);
});

test('authentication retries stay bounded until completion or failure clears that request', t => {
  const adapter = installed(t);
  assert.deepEqual(adapter.listeners.onAuthRequired.extra, ['asyncBlocking']);
  assert.deepEqual(adapter.request().authCredentials, { username: credentials.username, password: credentials.password });
  assert.ok(adapter.request().authCredentials);
  for (let attempt = 0; attempt < 5; attempt++) assert.deepEqual(adapter.request(), { cancel: true });
  adapter.listeners.onCompleted.callback(challenge);
  assert.ok(adapter.request().authCredentials);
  assert.ok(adapter.request().authCredentials);
  assert.deepEqual(adapter.request(), { cancel: true });
  adapter.listeners.onErrorOccurred.callback(challenge);
  assert.ok(adapter.request().authCredentials);
});

test('resource and shop entries receive only their own local credentials', () => {
  const resource = { ...credentials, port: credentials.port + 1, username: 'resource-account', password: 'resource-secret' };
  const multiple = { ...config, localResourceProxy: resource };
  assert.deepEqual(proxyAuthentication(challenge, multiple), { username: credentials.username, password: credentials.password });
  assert.deepEqual(proxyAuthentication({ ...challenge, challenger: { host: '127.0.0.1', port: resource.port } }, multiple), { username: resource.username, password: resource.password });
  assert.equal(proxyAuthentication({ ...challenge, challenger: { host: '127.0.0.1', port: resource.port + 1 } }, multiple), null);
  assert.equal(proxyAuthentication({ ...challenge, isProxy: false, statusCode: 401 }, multiple), null);
});

test('website or foreign proxy authentication neither receives credentials nor consumes retries', t => {
  const adapter = installed(t);
  for (let index = 0; index < 5; index++) {
    assert.deepEqual(adapter.request({ ...challenge, isProxy: false, statusCode: 401 }), {});
    assert.deepEqual(adapter.request({ ...challenge, challenger: { host: '127.0.0.1', port: credentials.port + 1 } }), {});
  }
  assert.ok(adapter.request().authCredentials);
  assert.ok(adapter.request().authCredentials);
});

test('legacy build does not install the independent proxy authentication adapter', t => {
  assert.deepEqual(installed(t, 'legacy').listeners, {});
});

test('MV3 installs synchronously and releases verified credentials before a remote backend bootstrap', async t => {
  const auth = await import('../runtime/proxy-auth.mjs?early-bootstrap-test');
  const adapter = installed(t, 'legacy');
  delete globalThis.__SP_BUILD__;delete globalThis.__SP_BOOTSTRAP__;
  auth.installProxyAuthentication({ early: true });
  assert.equal(typeof adapter.listeners.onAuthRequired.callback, 'function');
  let reply, calls = 0;
  const pending = new Promise(resolve => adapter.listeners.onAuthRequired.callback(challenge, value => { calls++;reply = value;resolve(); }));
  await Promise.resolve();assert.equal(calls, 0);
  auth.configureProxyAuthentication(config);
  await pending;
  assert.equal(calls, 1);assert.deepEqual(reply.authCredentials, { username: credentials.username, password: credentials.password });
  const callback = adapter.listeners.onAuthRequired.callback;
  globalThis.__SP_BUILD__ = { mode: 'superpower' };
  auth.installProxyAuthentication();
  assert.equal(adapter.listeners.onAuthRequired.callback, callback, 'the desktop adapter must not install a duplicate listener');
});

async function chromiumExecutable() {
  if (process.env.SPB_CHROMIUM_EXECUTABLE) return path.resolve(process.env.SPB_CHROMIUM_EXECUTABLE);
  const runtime = JSON.parse(await fs.readFile(path.join(desktop, 'runtime.config.json'), 'utf8'));
  const directory = path.join(runtime.corePath, '144');
  const installation = JSON.parse(await fs.readFile(path.join(directory, '.spb-installation.json'), 'utf8'));
  assert.equal(installation.protocol, 'fingerprint-chromium/1');
  for (const item of await fs.readdir(directory, { withFileTypes: true })) {
    if (!item.isDirectory()) continue;
    const candidate = path.join(directory, item.name, 'chrome.exe');
    if (await fs.stat(candidate).then(value => value.isFile(), () => false)) return candidate;
  }
  throw new Error('Set SPB_CHROMIUM_EXECUTABLE to an isolated installed Chromium 144 executable');
}

test('fresh Chromium 144 extension answers real Xray proxy authentication and reads the local page', {
  timeout: 45000,
  skip: process.env.SPB_PROXY_AUTH_BROWSER !== '1' ? 'Set SPB_PROXY_AUTH_BROWSER=1 and SPB_PLAYWRIGHT_MODULE to run the real browser fixture' : false,
}, async t => {
  assert.ok(process.env.SPB_PLAYWRIGHT_MODULE, 'SPB_PLAYWRIGHT_MODULE must identify the installed engineering Playwright package');
  const { chromium } = require(process.env.SPB_PLAYWRIGHT_MODULE);
  const executablePath = await chromiumExecutable();
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-proxy-auth-'));
  const disposers = [];
  t.after(async () => {
    let failure;
    for (const dispose of disposers.reverse()) { try { await dispose(); } catch (error) { failure ||= error; } }
    // Only remove this test's newly created directory, never a user's profile.
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('spb-proxy-auth-'));
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    if (failure) throw failure;
  });
  let pageCalls = 0;const targetRequests = [], sockets = new Set();
  const server = http.createServer((request, response) => {
    targetRequests.push(request.headers);
    if (request.url === '/proof') pageCalls++;
    response.setHeader('Content-Type', 'text/html; charset=utf-8');response.setHeader('Connection', 'close');
    response.end('<!doctype html><title>Proxy fixture</title><body>authenticated-local-xray-page</body>');
  });
  server.on('connection', socket => { sockets.add(socket);socket.once('close', () => sockets.delete(socket)); });
  await new Promise((resolve, reject) => server.once('error', reject).listen(0, '127.0.0.1', resolve));
  disposers.push(async () => { for (const socket of sockets) socket.destroy();await new Promise(resolve => server.close(resolve)); });
  const targetPort = server.address().port;
  const reserved = await reservePorts(1), localProxy = { ...credentials, port: reserved.ports[0] };
  const binary = await resolveProxyBinary(desktop);
  await reserved.release();
  const child = launchChild(binary, ['run', '-config', 'stdin:']);disposers.push(() => stopChild(child));
  child.stdin.end(JSON.stringify({
    log: { loglevel: 'none' },
    inbounds: [{ listen: '127.0.0.1', port: localProxy.port, protocol: 'http', settings: { accounts: [{ user: localProxy.username, pass: localProxy.password }] } }],
    outbounds: [{ tag: 'deny', protocol: 'blackhole' }, { tag: 'target', protocol: 'freedom' }],
    routing: { rules: [{ type: 'field', ip: ['127.0.0.1/32'], port: String(targetPort), network: 'tcp', outboundTag: 'target' }] },
  }));
  await waitListening(child, [localProxy.port]);
  const extension = path.join(temporary, 'extension');await fs.mkdir(extension);
  await fs.copyFile(path.join(root, 'runtime/proxy-auth.mjs'), path.join(extension, 'proxy-auth.mjs'));
  await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify({
    manifest_version: 3, name: 'Synthetic proxy authentication fixture', version: '1.0.0',
    permissions: ['webRequest', 'webRequestAuthProvider'], host_permissions: ['<all_urls>'],
    background: { service_worker: 'worker.mjs', type: 'module' },
  }));
  await fs.writeFile(path.join(extension, 'worker.mjs'), `
import {installProxyAuthentication,configureProxyAuthentication} from './proxy-auth.mjs';
installProxyAuthentication({early:true});
configureProxyAuthentication(${JSON.stringify({ localProxy })});
globalThis.__AUTH_CHALLENGES__=[];
chrome.webRequest.onAuthRequired.addListener(details=>globalThis.__AUTH_CHALLENGES__.push({isProxy:details.isProxy,statusCode:details.statusCode,challenger:details.challenger}),{urls:['<all_urls>']});
globalThis.__AUTH_BOOT_REQUEST__=fetch('http://127.0.0.1:${targetPort}/boot-api').then(async response=>{
  if(response.status!==200)throw new Error('Remote bootstrap could not authenticate');
  const result=await response.text();
  globalThis.__SP_BUILD__={mode:'superpower'};
  globalThis.__SP_BOOTSTRAP__=${JSON.stringify({ localProxy })};
  installProxyAuthentication();
  return result;
});
globalThis.__AUTH_READY__=true;
`);
  const browser = await chromium.launchPersistentContext(path.join(temporary, 'profile'), {
    executablePath, headless: true,
    ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, `--proxy-server=http://127.0.0.1:${localProxy.port}`, '--proxy-bypass-list=<-loopback>', '--disable-background-networking', '--disable-quic', '--no-first-run', '--no-default-browser-check'],
  });
  disposers.push(() => browser.close());
  assert.match(browser.browser().version(), /^144\./);
  const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker', { timeout: 10000 });
  await worker.evaluate(() => { if (!globalThis.__AUTH_READY__) throw new Error('Authentication adapter not ready'); });
  assert.match(await worker.evaluate(() => globalThis.__AUTH_BOOT_REQUEST__), /authenticated-local-xray-page/);
  const page = await browser.newPage();
  const response = await page.goto(`http://127.0.0.1:${targetPort}/proof`, { waitUntil: 'domcontentloaded', timeout: 15000 });
  assert.equal(response.status(), 200);
  assert.equal(await page.locator('body').innerText(), 'authenticated-local-xray-page');
  assert.equal(pageCalls, 1);
  assert.ok(targetRequests.every(headers => !headers['proxy-authorization'] && !headers.authorization));
  const challenges = await worker.evaluate(() => globalThis.__AUTH_CHALLENGES__);
  assert.ok(challenges.some(item => item.isProxy && item.statusCode === 407 && item.challenger.host === '127.0.0.1' && item.challenger.port === localProxy.port), 'browser navigation must have completed a real local proxy 407 challenge');
});

test('Chromium PAC uses separately authenticated shop and resource entries', {
  timeout: 45000,
  skip: process.env.SPB_PROXY_AUTH_BROWSER !== '1' ? 'Set SPB_PROXY_AUTH_BROWSER=1 for the isolated Chromium fixture' : false,
}, async t => {
  const { chromium } = require(process.env.SPB_PLAYWRIGHT_MODULE);
  const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-proxy-routing-'));
  const disposers = [];
  t.after(async () => {
    for (const dispose of disposers.reverse()) await dispose();
    assert.equal(path.dirname(temporary), path.resolve(os.tmpdir()));
    assert.ok(path.basename(temporary).startsWith('spb-proxy-routing-'));
    await fs.rm(temporary, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  });
  const requests = [];
  async function proxyServer(name, domain) {
    const username = `${name}-account`, password = `${name}-secret`, sockets = new Set();
    const server = http.createServer((request, response) => {
      const expected = 'Basic ' + Buffer.from(username + ':' + password).toString('base64');
      if (request.headers['proxy-authorization'] !== expected) {
        response.writeHead(407, { 'Proxy-Authenticate': `Basic realm="${name}"`, 'Connection': 'close' }); response.end(); return;
      }
      if (!request.url.startsWith(`http://${domain}/`)) { response.writeHead(502); response.end(); return; }
      requests.push({ name, url: request.url });
      response.setHeader('Content-Type', 'text/html'); response.setHeader('Connection', 'close'); response.end(`<title>${name}</title><body>${name}-only</body>`);
    });
    server.on('connection', socket => { sockets.add(socket); socket.on('error', () => {}); socket.once('close', () => sockets.delete(socket)); });
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
    disposers.push(async () => { for (const socket of sockets) socket.destroy(); await new Promise(resolve => server.close(resolve)); });
    return { host: '127.0.0.1', port: server.address().port, username, password };
  }
  const routing = { localProxy: await proxyServer('shop', 'shop.test'), localResourceProxy: await proxyServer('resource', 'resource.test'), proxyRouting: { resourceDomains: ['resource.test'] } };
  const extension = path.join(temporary, 'extension'); await fs.mkdir(extension);
  for (const file of ['proxy-auth.mjs', 'proxy-routing.mjs']) await fs.copyFile(path.join(root, 'runtime', file), path.join(extension, file));
  await fs.writeFile(path.join(extension, 'manifest.json'), JSON.stringify({
    manifest_version: 3, name: 'Synthetic resource routing fixture', version: '1.0.0',
    permissions: ['proxy', 'webRequest', 'webRequestAuthProvider'], host_permissions: ['<all_urls>'],
    background: { service_worker: 'worker.mjs', type: 'module' },
  }));
  await fs.writeFile(path.join(extension, 'worker.mjs'), `
import {installProxyAuthentication,configureProxyAuthentication} from './proxy-auth.mjs';
import {createProxyPac} from './proxy-routing.mjs';
installProxyAuthentication({early:true});
const config=${JSON.stringify(routing)};
configureProxyAuthentication(config);
globalThis.__PAC_READY__=new Promise((resolve,reject)=>chrome.proxy.settings.set({scope:'regular',value:{mode:'pac_script',pacScript:{data:createProxyPac(config)}}},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve(true)));
`);
  const browser = await chromium.launchPersistentContext(path.join(temporary, 'profile'), {
    executablePath: await chromiumExecutable(), headless: true,
    ignoreDefaultArgs: ['--disable-extensions', '--disable-component-extensions-with-background-pages'],
    args: [`--disable-extensions-except=${extension}`, `--load-extension=${extension}`, `--proxy-server=http://127.0.0.1:${routing.localProxy.port}`, '--disable-background-networking', '--disable-quic', '--no-first-run', '--no-default-browser-check'],
  });
  disposers.push(() => browser.close());
  const worker = browser.serviceWorkers()[0] || await browser.waitForEvent('serviceworker');
  assert.equal(await worker.evaluate(() => globalThis.__PAC_READY__), true);
  const page = await browser.newPage();
  for (const name of ['shop', 'resource', 'shop']) {
    const response = await page.goto(`http://${name}.test/proof`, { waitUntil: 'domcontentloaded' });
    assert.equal(response.status(), 200); assert.equal(await page.locator('body').innerText(), `${name}-only`);
  }
  assert.ok(requests.some(request => request.name === 'shop' && request.url === 'http://shop.test/proof'));
  assert.ok(requests.some(request => request.name === 'resource' && request.url === 'http://resource.test/proof'));
  assert.ok(requests.every(request => request.url.startsWith(`http://${request.name}.test/`)));
});
