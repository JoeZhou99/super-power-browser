import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createProxyPac } from '../runtime/proxy-routing.mjs';

const localProxy = { host: '127.0.0.1', port: 25001 };
const localResourceProxy = { host: '127.0.0.1', port: 25002 };
function selector(config) { return vm.runInNewContext(createProxyPac(config) + '\nFindProxyForURL;'); }
test('unconfigured domains use the authenticated shop entry without a direct fallback', () => {
  const select = selector({ localProxy });
  assert.equal(select('https://shop.test', 'shop.test'), 'PROXY 127.0.0.1:25001');
  for (const host of ['127.0.0.1', 'localhost', '::1', '[::1]']) assert.equal(select('http://' + host, host), 'DIRECT');
});
test('resource/CDN and explicit direct rules preserve legacy priority with bounded domain matches', () => {
  const select = selector({ localProxy, localResourceProxy, proxyRouting: {
    resourceDomains: ['translate.test', '*.images.test'], cdnDomains: ['cdn.test'],
    directDomains: ['local-service.test', 'translate.test'],
  } });
  for (const host of ['translate.test', 'a.images.test', 'a.b.images.test', 'cdn.test']) assert.equal(select('https://' + host, host), 'PROXY 127.0.0.1:25002');
  assert.equal(select('https://local-service.test', 'local-service.test'), 'DIRECT');
  for (const host of ['images.test', 'translate.test.evil.test', 'eviltranslate.test', 'shop.test']) assert.equal(select('https://translate.test@' + host, host), 'PROXY 127.0.0.1:25001');
});
test('invalid/injected rules or a missing resource proxy cannot create a bypass PAC', () => {
  for (const domain of ['*', '*.com;return "DIRECT"', 'https://shop.test', 'shop.test:443', '127.0.0.1', 'localhost', '*.local', 'shop.localdomain', 'home.arpa', '*.home.arpa']) {
    assert.throws(() => createProxyPac({ localProxy, proxyRouting: { directDomains: [domain] } }));
  }
  assert.throws(() => createProxyPac({ localProxy, proxyRouting: { resourceDomains: ['images.test'] } }));
  assert.throws(() => createProxyPac({ localProxy: { host: 'remote.test', port: 80 } }));
});
