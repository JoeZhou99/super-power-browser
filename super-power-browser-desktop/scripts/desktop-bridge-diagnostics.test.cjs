const test=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createHash,randomBytes,randomUUID}=require('node:crypto');
const WebSocket=require('ws');
const {DesktopBridge,encode,decode}=require('../src/main/pluginManage/DesktopBridge');

async function fixture(t,options){
  const id='11111111-2222-3333-4444-555555555555',extensionId='a'.repeat(32);
  const wsKey=randomBytes(16).toString('hex'),iv=randomBytes(16).toString('base64'),mac='b'.repeat(64);
  const bridge=new DesktopBridge({id,...options});
  bridge.configure({wsKey,initJson:Buffer.from(JSON.stringify({iv,mac})).toString('base64')},[extensionId]);
  const port=await bridge.listen(),clients=[];
  t.after(async()=>{for(const client of clients)client.terminate();await bridge.close();});
  function socket({origin=`chrome-extension://${extensionId}`,browserId=id,signBrowserId=id}={}){
    const time=Date.now(),salt=randomUUID();
    const token=createHash('md5').update(salt+time+wsKey+signBrowserId+salt).digest('hex');
    const query=new URLSearchParams({browserId,sign:encode({browserId:signBrowserId,time,salt,token},wsKey,iv,mac)});
    const client=new WebSocket(`ws://127.0.0.1:${port}/?${query}`,{origin});
    clients.push(client);client.on('error',()=>{});return client;
  }
  async function connect(options){const client=socket(options);await once(client,'open');return client;}
  async function rejectConnection(options){
    const client=socket(options),[,response]=await once(client,'unexpected-response');
    const status=response.statusCode;response.resume();client.terminate();return status;
  }
  async function request(client,action,args={},browserId=id){
    const requestId=randomUUID(),response=once(client,'message');
    client.send(encode({browserId,requestId,action,args},wsKey,iv,mac));
    const result=decode((await response)[0],wsKey,iv,mac);
    assert.equal(result.requestId,requestId);assert.equal(result.action,action);return result;
  }
  return {bridge,connect,rejectConnection,request};
}

test('modern bridge rejects legacy Ping before interpreting probe arguments or dispatching',{timeout:5000},async t=>{
  const calls={select:0,candidate:0,action:0};
  const routes={select(){calls.select++;throw new Error('internal route credentials must stay private');}};
  const runtime={candidate(){calls.candidate++;throw new Error('internal runtime must stay private');}};
  const proxy={get host(){throw new Error('legacy TCP probe must not run');}};
  const {connect,request}=await fixture(t,{routes,runtime,proxy,onAction(){calls.action++;throw new Error('unexpected dispatch');}});
  const client=await connect();
  for(const args of [
    {snapshotId:'stale',currentTransferProxies:[{candidateIndex:0}]},
    {currentTransferProxies:[{ip:'127.0.0.1',port:9,password:'test-only-password'}],target_url:'http://127.0.0.1/private',pingCount:999999,timeoutMs:999999},
    '{"currentTransferProxies":',
    null,
  ]){
    const result=await request(client,'Ping',args);
    assert.equal(result.ret,400);
    assert.deepEqual(result.returnObj,{message:'旧版 Ping 接口已停用，请使用统一线路检测接口'});
  }
  assert.deepEqual(calls,{select:0,candidate:0,action:0});
});

test('diagnostic retirement retains authenticated origin and shop boundaries and route queries',{timeout:5000},async t=>{
  const state={snapshotId:'current-snapshot',candidateIndex:0,candidates:[{candidateIndex:0}]};
  const actions=[];
  const {connect,rejectConnection,request}=await fixture(t,{routes:{},onAction(action,args){
    actions.push({action,args});assert.equal(action,'GetProxyRoutes');return state;
  }});
  assert.equal(await rejectConnection({origin:'https://untrusted.example'}),401);
  assert.equal(await rejectConnection({browserId:'another-shop'}),401);
  assert.equal(await rejectConnection({signBrowserId:'another-shop'}),401);
  assert.deepEqual(actions,[]);
  const client=await connect();
  const mismatchedRequest=await request(client,'GetProxyRoutes',{},'another-shop');
  assert.equal(mismatchedRequest.ret,400);
  assert.deepEqual(mismatchedRequest.returnObj,{message:'通信店铺不匹配'});
  const mismatchedArgs=await request(client,'GetProxyRoutes',{storeId:'another-shop'});
  assert.equal(mismatchedArgs.ret,400);
  assert.deepEqual(mismatchedArgs.returnObj,{message:'禁止跨店铺通信'});
  assert.deepEqual(actions,[]);
  const result=await request(client,'GetProxyRoutes');
  assert.equal(result.ret,200);assert.deepEqual(result.returnObj,state);
  assert.deepEqual(actions,[{action:'GetProxyRoutes',args:{}}]);
});

test('legacy bridges continue restricting Ping to their configured proxy',{timeout:5000},async t=>{
  let dispatched=false;
  const {connect,request}=await fixture(t,{proxy:{host:'127.0.0.1',port:9},onAction(){dispatched=true;}});
  const client=await connect();
  const result=await request(client,'Ping',{currentTransferProxies:[{ip:'127.0.0.2',port:9}]});
  assert.equal(result.ret,400);
  assert.deepEqual(result.returnObj,{message:'只能检测当前店铺已配置的线路'});
  assert.equal(dispatched,false);
});
