const test=require('node:test');
const assert=require('node:assert/strict');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
const {configureOperations,loadOperations,validateOperations,effectiveRouting,effectiveAccessPolicy}=require('../src/main/services/OperationsConfig');
const {proxySnapshotId}=require('../src/main/services/ProxyRoutes');
function publication(){
  return {schemaVersion:1,revision:3,
    networkRouting:{enabled:true,directDomains:['direct.example.com'],resourceDomains:['resources.example.com'],cdnDomains:['cdn.example.com']},
    networkChecks:{enabled:true,proxyProviders:['https://proxy-check.example.com/ip'],localProviders:['https://local-check.example.com/ip']},
    accessPolicy:{enabled:true,mode:'whitelist',domains:['shop.example.com'],exceptions:['https://support.example.com/help/']},
    passkeyRules:{enabled:true,loginMatches:['https://*.amazon.com/ap/signin*'],registerMatches:['https://*.amazon.com/ax/claim/webauthn*']}};
}
test('runtime configuration uses a separate read-only endpoint with only the current customer session',async()=>{
  let called=0;
  const body=publication();
  const config=await loadOperations({url:'https://operations.example.com/',token:'customer-synthetic',fetcher:async(url,options)=>{
    called++;assert.equal(url.href,'https://operations.example.com/api/runtime/config');
    assert.equal(options.method,'GET');assert.deepEqual(options.headers,{Accept:'application/json',Authorization:'Bearer customer-synthetic'});
    assert.equal(options.redirect,'error');assert.equal(options.cache,'no-store');
    return {ok:true,text:async()=>JSON.stringify(body)};
  }});
  assert.deepEqual(config,body);assert.equal(called,1);
  configureOperations('');
  assert.equal(await loadOperations({fetcher:()=>{throw new Error('must not fetch when not configured');}}),null);
});
test('runtime loader accepts valid publications larger than 256 KB',async()=>{
  const body=publication();
  for(const key of ['loginMatches','registerMatches']){
    body.passkeyRules[key]=Array.from({length:100},(_,index)=>{
      const prefix='https://shop.example.com/'+key+'/'+index+'/';
      return prefix+'a'.repeat(2047-prefix.length)+'*';
    });
  }
  const payload=JSON.stringify(body);
  assert.ok(payload.length>256000&&payload.length<1_000_000);
  const config=await loadOperations({url:'https://operations.example.com/',token:'customer-synthetic',fetcher:async()=>({ok:true,text:async()=>payload})});
  assert.deepEqual(config,body);
});
test('invalid or unavailable explicitly configured service does not silently remove restrictions',async()=>{
  await assert.rejects(loadOperations({url:'https://operations.example.com/',token:'customer-synthetic',fetcher:async()=>({ok:false,status:503})}),/\u8fd0\u8425\u914d\u7f6e/);
  await assert.rejects(loadOperations({url:'https://operations.example.com/',token:'customer-synthetic',fetcher:async()=>({ok:true,text:async()=>'{}'})}),/\u8fd0\u8425\u914d\u7f6e/);
  const config=await loadOperations({url:'https://operations.example.com/',token:'customer-synthetic',fetcher:async()=>({ok:true,text:async()=>JSON.stringify(publication())})});
  assert.equal(config.revision,3);
  assert.throws(()=>configureOperations('http://remote.example.com/'));
  assert.throws(()=>configureOperations('https://user:password@operations.example.com/'));
});
test('published rules have bounded supported endpoint and match-pattern shapes',()=>{
  for(const change of [
    b=>b.networkChecks.proxyProviders=[],
    b=>b.networkChecks.proxyProviders=['https://private.test/ip'],
    b=>b.networkChecks.proxyProviders=['https://probe.example.com:8443/ip'],
    b=>b.accessPolicy.domains=[],
    b=>b.accessPolicy.exceptions=['https://support.example.com/help?query=1'],
    b=>b.accessPolicy.exceptions=['http://support.example.com/help/'],
    b=>b.passkeyRules.registerMatches=[],
    b=>b.networkChecks.localProviders=['http://local-check.example.com/ip'],
    b=>b.networkRouting.directDomains=['127.0.0.1'],
    b=>b.accessPolicy.domains=['*.shop.example.com'],
    b=>b.passkeyRules.loginMatches=['<all_urls>'],
    b=>b.passkeyRules.loginMatches=['https://*/*'],
    b=>b.passkeyRules.loginMatches=['https://shop.example.com/signin#fragment'],
    b=>b.passkeyRules.loginMatches=['https://shop.example.com/signin\\\\path'],
    b=>b.passkeyRules.loginMatches=['https://shop.example.com/'+'a'.repeat(2048)],
    b=>b.passkeyRules.registerMatches=['https://user:password@shop.example.com/*'],
  ]){
    const body=publication();change(body);assert.throws(()=>validateOperations(body));
  }
  const body=publication();body.accessPolicy.exceptions=['https://support.example.com'];
  assert.deepEqual(validateOperations(body).accessPolicy.exceptions,['https://support.example.com/']);
});
test('global routing feeds actual PAC without changing proxy snapshot; nonempty local rules win',async()=>{
  const {createProxyPac}=await import(pathToFileURL(path.resolve(__dirname,'../../super-power-browser-plugins/runtime/proxy-routing.mjs')));
  const vm=require('node:vm'),ops=validateOperations(publication());
  const proxy={protocol:'http',host:'proxy.example.com',port:8080,username:'synthetic',password:'synthetic',proxyOptions:{}};
  const before=JSON.stringify(proxy),snapshot=proxySnapshotId(proxy);
  assert.throws(()=>effectiveRouting(proxy,ops),/\u4e13\u7528\u8d44\u6e90\u4ee3\u7406/);
  ops.networkRouting.resourceDomains=[];ops.networkRouting.cdnDomains=[];
  const routing=effectiveRouting(proxy,ops);
  assert.deepEqual(routing,{directDomains:['direct.example.com'],resourceDomains:[],cdnDomains:[]});
  const select=vm.runInNewContext(createProxyPac({localProxy:{host:'127.0.0.1',port:20000},proxyRouting:routing})+'\nFindProxyForURL;');
  assert.equal(select('https://direct.example.com/','direct.example.com'),'DIRECT');
  assert.equal(select('https://resources.example.com/','resources.example.com'),'PROXY 127.0.0.1:20000');
  assert.equal(JSON.stringify(proxy),before);assert.equal(proxySnapshotId(proxy),snapshot);
  assert.deepEqual(effectiveRouting({...proxy,proxyOptions:{routing:{}}},ops),routing);
  const own={directDomains:['own.example.com'],resourceDomains:[],cdnDomains:[]};
  assert.deepEqual(effectiveRouting({...proxy,proxyOptions:{routing:own}},ops),own);
  ops.networkRouting.resourceDomains=['resources.example.com'];
  assert.deepEqual(effectiveRouting({...proxy,proxyOptions:{resourceProxy:{}}},ops),{directDomains:['direct.example.com'],resourceDomains:['resources.example.com'],cdnDomains:[]});
  const policy={mode:'whitelist',domains:['shop.example.com'],exceptions:['https://support.example.com/help/']};
  assert.deepEqual(effectiveAccessPolicy({accessRules:{}},ops),policy);
  assert.deepEqual(effectiveAccessPolicy({},ops),policy);
  const ownPolicy={mode:'blacklist',domains:['own.example.com'],exceptions:[]};
  assert.deepEqual(effectiveAccessPolicy({accessRules:ownPolicy},ops),ownPolicy);
});

test('disabled groups preserve existing runtime behavior and anonymous access is rejected',async()=>{
  const ops=publication();for(const key of ['networkRouting','networkChecks','accessPolicy','passkeyRules'])ops[key].enabled=false;
  const configuration=validateOperations(ops);
  assert.deepEqual(effectiveRouting({proxyOptions:{}},configuration),{});
  assert.equal(effectiveAccessPolicy({},configuration),undefined);
  await assert.rejects(loadOperations({url:'https://operations.example.com/',fetcher:()=>{throw new Error('must not send');}}),/\u767b\u5f55/);
});
