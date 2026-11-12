import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { createProxyPac } from '../runtime/proxy-routing.mjs';

const localProxy = { host: '127.0.0.1', port: 25001 };
const localResourceProxy = { host: '127.0.0.1', port: 25002 };
function selector(config,options) { return vm.runInNewContext(createProxyPac(config,options) + '\nFindProxyForURL;'); }
test('unconfigured domains use the authenticated shop entry without a direct fallback', () => {
  const select = selector({ localProxy });
  assert.equal(select('https://shop.test', 'shop.test'), 'PROXY 127.0.0.1:25001');
  for (const host of ['127.0.0.1', 'localhost', '::1', '[::1]']) assert.equal(select('http://' + host, host), 'DIRECT');
});
test('resource/CDN and explicit direct rules preserve legacy priority with bounded domain matches', () => {
  const select = selector({ localProxy, localResourceProxy, proxyRouting: {
    resourceDomains: ['translate.test', '*.images.test'], cdnDomains: ['cdn.test'],
    directDomains: ['local-service.test', 'translate.test'],
  } },{verified:true});
  for (const host of ['translate.test', 'a.images.test', 'a.b.images.test', 'cdn.test']) assert.equal(select('https://' + host, host), 'PROXY 127.0.0.1:25002');
  assert.equal(select('https://local-service.test', 'local-service.test'), 'DIRECT');
  for (const host of ['images.test', 'translate.test.evil.test', 'eviltranslate.test', 'shop.test']) assert.equal(select('https://translate.test@' + host, host), 'PROXY 127.0.0.1:25001');
});
test('invalid/injected rules or a missing resource proxy cannot create a bypass PAC', () => {
  for (const domain of ['*', '*.com;return "DIRECT"', 'https://shop.test', 'shop.test:443', '127.0.0.1', 'localhost', '*.local', 'shop.localdomain', 'home.arpa', '*.home.arpa']) {
    assert.throws(() => createProxyPac({ localProxy, proxyRouting: { directDomains: [domain] } }));
  }
  assert.throws(() => createProxyPac({ localProxy, proxyRouting: { resourceDomains: ['images.test'] } },{verified:true}));
  assert.throws(() => createProxyPac({ localProxy: { host: 'remote.test', port: 80 } }));
});

test('unverified startup never exposes public direct or resource routes',()=>{
  const config={localProxy,localResourceProxy,proxyRouting:{directDomains:['direct.test','*.public.test'],resourceDomains:['images.test'],cdnDomains:['cdn.test']}};
  const initial=selector(config);
  for(const host of ['direct.test','sub.public.test','images.test','cdn.test','shop.test'])assert.equal(initial('https://'+host,host),'PROXY 127.0.0.1:25001');
  assert.equal(initial('http://127.0.0.1:18080','127.0.0.1'),'DIRECT');
  const verified=selector(config,{verified:true});
  assert.equal(verified('https://direct.test','direct.test'),'DIRECT');
  assert.equal(verified('https://images.test','images.test'),'PROXY 127.0.0.1:25002');
});

test('trusted control-plane bypass is restricted to the exact authenticated HTTPS origin',()=>{
  const config={localProxy,apiBase:'https://backend.test:8443/extension',authOrigin:'https://backend.test:8443'};
  for(const verified of [false,true]){
    const select=selector(config,{verified});
    assert.equal(select('https://backend.test:8443/extension/capabilities','backend.test'),'DIRECT');
    for(const url of ['http://backend.test:8443/extension/capabilities','https://backend.test/extension/capabilities',
      'https://backend.test:8444/extension/capabilities','https://backend.test.evil.test:8443/extension/capabilities',
      'https://sub.backend.test:8443/extension/capabilities','https://backend.test:8443@merchant.test/extension/capabilities',
      'https://merchant.test/','https://api.ipify.org/'])assert.equal(select(url,new URL(url).hostname),'PROXY 127.0.0.1:25001');
  }
});

test('invalid or mismatched control-plane configuration never adds a direct exception',()=>{
  for(const [apiBase,authOrigin] of [
    ['https://user:secret@backend.test/extension','https://backend.test'],
    ['https://backend.test/extension','https://another.test'],
    ['https://backend.test/extension','https://backend.test:8443'],
    ['https://backend.test/extension','https://user:secret@backend.test'],
    ['https://backend.test/extension','https://backend.test/path'],
    ['http://backend.test/extension','http://backend.test'],
    ['https://backend.test/extension',undefined],
  ])assert.throws(()=>createProxyPac({localProxy,apiBase,authOrigin}),/插件后台/);
});
