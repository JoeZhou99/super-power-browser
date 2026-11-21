const test=require('node:test');
const assert=require('node:assert/strict');
const {withProxyDiagnostics}=require('../src/main/services/ProxyDiagnosticsApi');
const {proxyError}=require('../src/main/services/ProxyConfig');

const snapshotId='a'.repeat(64);
const privateData={host:'relay-private.invalid',port:19876,password:'canary-proxy-password',source:'https://probe-private.invalid',
  diagnostics:[{url:'https://probe-private.invalid',error:'canary-proxy-password'}],observations:[{ip:'9.9.9.9'}],
  localProxy:{username:'canary-loopback-user'},proxyOptions:{transit:{host:'relay-private.invalid'}},futureInternalField:'canary-future-field'};
function publicOnly(value){
  const encoded=JSON.stringify(value);
  for(const secret of ['relay-private.invalid','19876','canary-','probe-private.invalid','observations','diagnostics','proxyOptions','localProxy','futureInternalField'])assert.equal(encoded.includes(secret),false,secret);
}

test('diagnostics keep display information and metrics while excluding internal provider and dialing data',async()=>{
  const geo={...privateData,available:true,ip:'1.1.1.1',country_name:'中国香港',country_code:'HK',region_name:'香港',city_name:'香港',timezone:'Asia/Hong_Kong',durationMs:260};
  const health={...privateData,available:true,pathLatencyMs:260,entryLatencyMs:51,siteLatencyMs:null,status:'success',sampledAt:'2026-11-21T00:00:00.000Z'};
  const route={...privateData,snapshotId,candidateIndex:1,automatic:true,automaticSupported:true,networkPending:false,
    relayPool:{...privateData,id:'pool',name:'香港加速',revision:2},startupChecks:[privateData],
    candidates:[{...privateData,candidateIndex:1,id:'relay-1',kind:'relay',name:'香港线路',region:'HK',health}],
    measurement:{...privateData,id:2,status:'complete',completed:2,total:2,pending:false,changed:true,selectedIndex:1}};
  const action=withProxyDiagnostics(async name=>name==='GetNetworkInfo'?{...privateData,pending:false,allowed:true,attemptId:2,routeRevision:3,exit:geo,local:geo}
    :name==='GetLocalNetworkInfo'?geo:['TransferSpeed','TestProxyWebsite'].includes(name)?{...health,candidateIndex:1,snapshotId}
    :name==='StartProxy'?{...privateData,isSuccess:true,candidateIndex:1,snapshotId,proxyAddress:[privateData]}:route);
  const network=await action('GetNetworkInfo');publicOnly(network);assert.equal(network.allowed,true);assert.equal(network.exit.ip,'1.1.1.1');assert.equal(network.local.country_name,'中国香港');
  publicOnly(await action('GetLocalNetworkInfo'));
  for(const name of ['TransferSpeed','TestProxyWebsite']){const value=await action(name,{candidateIndex:1,snapshotId});publicOnly(value);assert.equal(value.pathLatencyMs,260);assert.equal(value.siteLatencyMs,null);}
  for(const name of ['GetProxyRoutes','RefreshProxyRoutes','MeasureProxyRoutes','OptimizeProxyRoutes','SetProxyAutomatic']){
    const value=await action(name,['GetProxyRoutes','RefreshProxyRoutes'].includes(name)?{}:name==='SetProxyAutomatic'?{snapshotId,automatic:false}:{snapshotId});
    publicOnly(value);assert.equal(value.snapshotId,snapshotId);assert.equal(value.candidates[0].name,'香港线路');assert.equal(value.candidates[0].health.entryLatencyMs,51);assert.equal(value.measurement.completed,2);assert.equal(value.measurement.changed,true);
  }
  const selected=await action('StartProxy',{proxyInfo:{candidateIndex:1,snapshotId}});publicOnly(selected);assert.deepEqual(selected,{isSuccess:true,candidateIndex:1,snapshotId});
});

test('page requests cannot supply probe targets, credentials or unauthorized selection structures',async()=>{
  let called=0;const action=withProxyDiagnostics(async()=>{called++;return {};});
  const invalid=[['GetProxyRoutes',{host:'injected.invalid'}],['GetNetworkInfo',{retry:'true'}],['GetLocalNetworkInfo',{providers:[]}],
    ['TransferSpeed',{candidateIndex:1,snapshotId,url:'https://injected.invalid'}],['TestProxyWebsite',{candidateIndex:1,snapshotId,headers:{Cookie:'shop-secret'}}],
    ['StartProxy',{proxyInfo:{candidateIndex:1,snapshotId,password:'injected'}}],['StartProxy',{proxyInfo:{candidateIndex:9,snapshotId}}],
    ['TransferSpeed',{candidateIndex:1.5,snapshotId}],['TransferSpeed',{candidateIndex:1,snapshotId:'stale'}],
    ['SetProxyAutomatic',{snapshotId,automatic:'false'}],['SetProxyAutomatic',{snapshotId}],['SetProxyAutomatic',{automatic:true}],
    ['MeasureProxyRoutes',{}],['OptimizeProxyRoutes',{}],['OptimizeProxyRoutes',null],['MeasureProxyRoutes',[]]];
  for(const [name,args] of invalid)await assert.rejects(action(name,args),error=>error.proxySafe===true);
  assert.equal(called,0);
});

test('unexpected implementation errors are not returned with proxy credentials or targets',async()=>{
  const raw=new Error('connect http://user:canary-proxy-password@relay-private.invalid:19876 https://probe-private.invalid');
  await assert.rejects(withProxyDiagnostics(async()=>{throw raw;})('GetProxyRoutes'),error=>{
    assert.equal(error.proxySafe,true);publicOnly(error.message);return true;
  });
  const safe=proxyError('线路配置已变化，请刷新检测页面');
  await assert.rejects(withProxyDiagnostics(async()=>{throw safe;})('GetProxyRoutes'),error=>error===safe);
  const aborted=new DOMException('Cancelled','AbortError');
  await assert.rejects(withProxyDiagnostics(async()=>{throw aborted;})('GetProxyRoutes'),error=>error===aborted);
});

test('unrelated shop actions keep their existing API behavior',async()=>{
  const input={cookie:'existing-shop-data'},response={saved:true};let received;
  const actual=await withProxyDiagnostics(async(name,args)=>{received={name,args};return response;})('UpdateMallCookie',input);
  assert.equal(actual,response);assert.equal(received.args,input);assert.equal(received.name,'UpdateMallCookie');
});

test('plugin bootstrap strips cached provider evidence but retains worker-only loopback authentication',async t=>{
  const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path'),AdmZip=require('adm-zip');
  const {preparePlugins}=require('../src/main/pluginManage/PluginService');
  const directory=await fs.mkdtemp(path.join(os.tmpdir(),'spb-diagnostics-bootstrap-'));
  t.after(async()=>{assert.equal(path.dirname(directory),path.resolve(os.tmpdir()));assert.ok(path.basename(directory).startsWith('spb-diagnostics-bootstrap-'));await fs.rm(directory,{recursive:true,force:true});});
  await fs.mkdir(path.join(directory,'Plugin'));
  for(const name of ['RXMallHelper','RXAccountManage']){
    const zip=new AdmZip();zip.addFile('manifest.json',Buffer.from(JSON.stringify({key:Buffer.from(name).toString('base64'),background:{service_worker:'worker.mjs'}})));
    zip.addFile('runtime/build.json',Buffer.from(JSON.stringify({mode:'superpower',buildId:snapshotId})));
    await fs.writeFile(path.join(directory,'Plugin',name+'.zip'),zip.toBuffer());
  }
  const prepared=await preparePlugins(directory,path.join(directory,'profile'),{
    environment:{id:'synthetic-shop',proxy:{host:'residential.invalid'},fingerprint:{},kernelVersion:'144',startUrl:'https://synthetic.invalid'},
    session:{token:'worker-only-token'},websocketPort:23000,proxyUrl:'http://worker:loopback-secret@127.0.0.1:23001',apiUrl:'http://127.0.0.1:18080',
    localGeo:{...privateData,available:true,ip:'1.1.1.1',country_code:'HK'},
  });
  publicOnly(prepared.configuration.localGeo);assert.equal(prepared.configuration.localGeo.ip,'1.1.1.1');
  assert.equal(prepared.configuration.localProxy.password,'loopback-secret');assert.equal(prepared.configuration.accessToken,'worker-only-token');
});
