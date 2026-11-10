const test=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const {createHash,randomBytes,randomUUID}=require('node:crypto');
const WebSocket=require('ws');
const {DesktopBridge,encode,decode}=require('../src/main/pluginManage/DesktopBridge');

function deferred(){let resolve;const promise=new Promise(done=>{resolve=done;});return {promise,resolve};}
const nextTurn=()=>new Promise(resolve=>setImmediate(resolve));

async function fixture(t,onAction){
  const id='11111111-2222-3333-4444-555555555555',extensionId='a'.repeat(32);
  const wsKey=randomBytes(16).toString('hex'),iv=randomBytes(16).toString('base64'),mac='b'.repeat(64);
  const bridge=new DesktopBridge({id,onAction});
  bridge.configure({wsKey,initJson:Buffer.from(JSON.stringify({iv,mac})).toString('base64')},[extensionId]);
  const port=await bridge.listen(),clients=[];
  t.after(async()=>{for(const client of clients)client.terminate();await bridge.close();});
  const connect=async()=>{
    const time=Date.now(),salt=randomUUID();
    const token=createHash('md5').update(salt+time+wsKey+id+salt).digest('hex');
    const query=new URLSearchParams({browserId:id,sign:encode({browserId:id,time,salt,token},wsKey,iv,mac)});
    const socket=new WebSocket(`ws://127.0.0.1:${port}/?${query}`,{origin:`chrome-extension://${extensionId}`});
    clients.push(socket);socket.on('error',()=>{});await once(socket,'open');return socket;
  };
  const frame=(action,args={})=>encode({browserId:id,requestId:randomUUID(),action,args},wsKey,iv,mac);
  const request=async(socket,action,args)=>{
    const response=once(socket,'message');socket.send(frame(action,args));
    return decode((await response)[0],wsKey,iv,mac);
  };
  return {bridge,connect,frame,request};
}

test('plugin reload ignores old checks and queued messages while a fresh connection can become ready',{timeout:5000},async t=>{
  const entered=deferred(),release=deferred();let checks=0;
  const {bridge,connect,frame,request}=await fixture(t,async(action,args)=>{
    if(action==='CheckCompleted'){
      checks++;
      if(args.delayed){entered.resolve();await release.promise;}
    }
    return {};
  });
  const oldClient=await connect(),oldServer=[...bridge.clients][0];
  oldClient.send(frame('CheckCompleted',{delayed:true}));await entered.promise;
  const disconnected=once(oldClient,'close');
  assert.equal(bridge.invalidateReadiness(),1);
  assert.equal(bridge.ready,false);assert.equal(bridge.connected,false);

  // A previously queued socket callback must not dispatch after invalidation.
  await bridge.receive(oldServer,frame('CheckCompleted'));
  assert.equal(checks,1);
  const current=await connect();
  await disconnected;
  assert.equal(bridge.connected,true,'closing the old socket must not hide a new connection');
  release.resolve();await nextTurn();
  assert.equal(bridge.ready,false,'the old check completing must not restore readiness');
  assert.equal(bridge.events.filter(event=>event.action==='CheckCompleted').length,0);

  const result=await request(current,'CheckCompleted');
  assert.equal(result.ret,200);assert.deepEqual(result.returnObj,{ready:true});
  assert.equal(bridge.ready,true);assert.equal(checks,2);
});

test('closing the bridge invalidates an outstanding readiness check',{timeout:5000},async t=>{
  const entered=deferred(),release=deferred();
  const {bridge,connect,frame}=await fixture(t,async action=>{
    if(action==='CheckCompleted'){entered.resolve();await release.promise;}
    return {};
  });
  const client=await connect();client.send(frame('CheckCompleted'));await entered.promise;
  await bridge.close();release.resolve();await nextTurn();
  assert.equal(bridge.ready,false);assert.equal(bridge.connected,false);assert.equal(bridge.clients.size,0);
});
