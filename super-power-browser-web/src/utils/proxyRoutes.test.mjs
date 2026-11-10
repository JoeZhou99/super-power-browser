import test from 'node:test';
import assert from 'node:assert/strict';
import { createProxyConnection, copyProxyConnection, validateProxyRoutes, validateRoutingDomains } from './proxyRoutes.mjs';

const node = (protocol = 'http', proxyOptions = {}) => ({protocol, host:'proxy.example.com',port:8080,username:'user',password:'  p:@\\"  ',proxyOptions});
test('editing routes retains credentials and independent copies preserve relay but exclude source routing', () => {
  const source = {transit:node(), alternatives:[node()], resourceProxy:node(),routing:{resourceDomains:['static.example.com']}};
  const copy = copyProxyConnection(node(),{username:'account',password:' secret ',proxyOptions:source});
  assert.equal(copy.password,' secret ');assert.equal(copy.proxyOptions.transit.password,source.transit.password);
  assert.equal(copy.proxyOptions.alternatives,undefined);assert.equal(copy.proxyOptions.resourceProxy,undefined);assert.equal(copy.proxyOptions.routing,undefined);
  copy.proxyOptions.transit.password='changed';assert.notEqual(source.transit.password,'changed');
  const edited = validateProxyRoutes('http',source);assert.equal(edited.alternatives[0].password,source.alternatives[0].password);
  assert.equal(edited.resourceProxy.password,source.resourceProxy.password);assert.deepEqual(edited.routing.resourceDomains,['static.example.com']);
});
test('routes enforce usable credentials, relay protocol restrictions, bounds and no hidden nested alternatives', () => {
  assert.equal(createProxyConnection('ssh').port,22);
  assert.throws(()=>validateProxyRoutes('http',{alternatives:[createProxyConnection()]}),/备用线路 1/);
  assert.throws(()=>validateProxyRoutes('http',{alternatives:[{...node(),username:''}]}),/填写账号/);
  assert.throws(()=>validateProxyRoutes('http',{transit:node('ssh')}),/中转节点/);
  assert.throws(()=>validateProxyRoutes('ssr',{transit:node()}),/不支持叠加中转/);
  assert.throws(()=>validateProxyRoutes('http',{alternatives:Array(9).fill(node())}),/8/);
  assert.throws(()=>validateProxyRoutes('http',{alternatives:[node('http',{alternatives:[node()]})]}),/只能添加在主代理/);
  assert.throws(()=>copyProxyConnection(node(),{username:'u',password:'p',proxyOptions:{transit:node('http',{transit:node()})}},1),/两层/);
  assert.throws(()=>validateProxyRoutes('http',{alternatives:[node('socks4')]}),/不支持密码/);
});
test('routing is opt-in, preserves precise and wildcard domains, and never accepts local or broad bypasses', () => {
  assert.deepEqual(validateProxyRoutes('http',{}),{});
  assert.deepEqual(validateRoutingDomains(['CDN.Example.com','cdn.example.com','*.cdn.example.com']),['cdn.example.com','*.cdn.example.com']);
  assert.throws(()=>validateProxyRoutes('http',{routing:{resourceDomains:['static.example.com']}}),/专用代理/);
  assert.deepEqual(validateProxyRoutes('http',{routing:{directDomains:['example.com','','']}}).routing.directDomains,['example.com']);
  for(const domain of ['','*','*.*','localhost','*.localhost','127.0.0.1','[::1]','printer.local','machine.lan','service.internal','https://example.com','example.com:443','ab*.example.com'])assert.throws(()=>validateRoutingDomains([domain]));
  assert.throws(()=>validateRoutingDomains(Array(101).fill('example.com')),/100/);
  assert.throws(()=>validateProxyRoutes('http',{resourceProxy:node('http',{routing:{directDomains:['example.com']}})}),/只能配置在主代理/);
});
