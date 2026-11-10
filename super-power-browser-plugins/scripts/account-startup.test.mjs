import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/account/static/background/index.js',import.meta.url),'utf8');
const begin=source.indexOf('      dILfY: ['),end=source.indexOf('      bQVYy: [',begin);
assert.ok(begin>=0&&end>begin);
const bundleModule=source.slice(begin,end);

function fixture({mode='superpower',bootstrap={accessToken:'synthetic-token',sysMallId:'fixture-shop'},setToken=async()=>{},userInfo=async()=>({errorCode:0,data:{id:'fixture-user'}}),accounts=async()=>({errorCode:0,data:{list:[]}})}={}) {
  const calls=[],listeners=[],storage=new Map();
  const helper={defineInteropFlag(){},export(target,name,get){Object.defineProperty(target,name,{get});},interopDefault:value=>({default:value})};
  const services={
    '@parcel/transformer-js/src/esmodule-helpers.js':helper,
    '~/background/internalHandlers':{invalidateAutoFillInputConfigCache(){calls.push('invalidate-input');},invalidatePageEnhanceConfigCache(){calls.push('invalidate-page');}},
    '~/service/open-api':{getUserInfo:async()=>{calls.push('user');return userInfo();},getMallsAccountFillingList:async data=>{calls.push(['accounts',data.mall_id]);return accounts();}},
    '~/utils/auth':{setToken:async token=>{calls.push(['token',token]);await setToken(token);}},
    '~/utils/crypto':{},'~/utils/index':{},
    '~/utils/storage':{set:async(key,value)=>{calls.push(['set',key]);storage.set(key,value);},get:async key=>storage.get(key),clearAllLocal:async()=>{calls.push('clear');}},
    './utils':{groupDataByDomain:()=>({})},
  };
  const context=vm.createContext({__SP_BUILD__:{mode},__SP_BOOTSTRAP__:bootstrap,
    console:{log(){},error(){}},URL,
    chrome:{runtime:{onMessageExternal:{addListener:callback=>listeners.push(callback)}},storage:{local:{set:async value=>Object.entries(value).forEach(([key,entry])=>storage.set(key,entry))}}},
  });
  // Include the independent build's ready marker so success only follows the
  // original account synchronization, not just worker or listener startup.
  const transformed=mode==='superpower'?bundleModule.replace('await g(i || []),','await g(i || []), await chrome.storage.local.set({spStartup:{state:"ready",message:"店铺账号已同步",at:new Date().toISOString()}}),'):bundleModule;
  const module=vm.runInContext('({'+transformed+'}).dILfY[0]',context),exports={};
  module(id=>{assert.ok(id in services,'unexpected dependency: '+id);return services[id];},{exports},exports);
  exports.registerExternalMessageListener();
  return {context,calls,storage,login:(payload={})=>listeners[0]({event_type:'LOGIN',token:'legacy-token',mall_id:'legacy-shop',...payload},{id:'fixture-mall-helper'},()=>{})};
}

test('a restarted account worker initializes from verified shop configuration without LOGIN',async()=>{
  const f=fixture();
  assert.ok(f.context.__SP_ACCOUNT_STARTUP__);
  await f.context.__SP_ACCOUNT_STARTUP__;
  assert.equal(f.storage.get('mall_id'),'fixture-shop');
  assert.equal(f.storage.get('userInfo').id,'fixture-user');
  assert.equal(f.storage.get('spStartup').state,'ready');
  assert.deepEqual(f.calls.filter(call=>Array.isArray(call)&&['token','accounts'].includes(call[0])),[['token','synthetic-token'],['accounts','fixture-shop']]);
  assert.equal(f.calls.filter(call=>call==='clear').length,1);
});

test('concurrent and repeated mall LOGIN messages share startup without token or clear races',async()=>{
  let release;
  const f=fixture({setToken:()=>new Promise(resolve=>release=resolve)});
  const first=f.login({token:'unexpected-token',mall_id:'other-shop'});
  const second=f.login();
  await Promise.resolve();
  assert.equal(f.calls.filter(call=>Array.isArray(call)&&call[0]==='token').length,1);
  assert.equal(f.storage.has('spStartup'),false);
  release();
  await Promise.all([f.context.__SP_ACCOUNT_STARTUP__,first,second]);
  await f.login();
  assert.equal(f.storage.get('mall_id'),'fixture-shop');
  assert.equal(f.calls.filter(call=>call==='user').length,1);
  assert.equal(f.calls.filter(call=>call==='clear').length,1);
});

test('a new worker after completed synchronization starts its own initialization',async()=>{
  const first=fixture();await first.context.__SP_ACCOUNT_STARTUP__;
  const reloaded=fixture();await reloaded.context.__SP_ACCOUNT_STARTUP__;
  assert.equal(reloaded.storage.get('spStartup').state,'ready');
  assert.equal(reloaded.calls.filter(call=>call==='clear').length,1);
});

test('failed startup rejects for the guard and never claims account readiness',async()=>{
  for(const options of [
    {bootstrap:{sysMallId:'fixture-shop'}},
    {userInfo:async()=>({errorCode:401})},
    {accounts:async()=>({errorCode:503})},
    {accounts:async()=>{throw new Error('token=synthetic-sensitive-error');}},
  ]) {
    const f=fixture(options);
    await assert.rejects(f.context.__SP_ACCOUNT_STARTUP__,error=>error.message==='店铺账号初始化失败，请关闭店铺后重新打开');
    assert.equal(f.storage.has('spStartup'),false);
    assert.equal(f.calls.includes('clear'),false);
  }
});

test('a later authorized LOGIN can retry failed initialization exactly once',async()=>{
  let online=false;
  const f=fixture({accounts:async()=>online?{errorCode:0,data:{list:[]}}:{errorCode:503}});
  await assert.rejects(f.context.__SP_ACCOUNT_STARTUP__);
  online=true;
  await Promise.all([f.login(),f.login()]);
  assert.equal(f.storage.get('spStartup').state,'ready');
  assert.equal(f.calls.filter(call=>call==='clear').length,1);
});

test('legacy account worker still waits for LOGIN and handles later logins normally',async()=>{
  const f=fixture({mode:'legacy'});
  assert.equal(f.context.__SP_ACCOUNT_STARTUP__,undefined);
  assert.deepEqual(f.calls,[]);
  await f.login();
  assert.equal(f.storage.get('mall_id'),'legacy-shop');
  await f.login({mall_id:'second-shop',token:'second-token'});
  assert.equal(f.storage.get('mall_id'),'second-shop');
  assert.equal(f.calls.filter(call=>call==='clear').length,2);
});
