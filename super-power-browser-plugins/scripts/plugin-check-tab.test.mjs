import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

const source=await readFile(new URL('../src/mall/background/service-worker.js',import.meta.url),'utf8');
const extensionRoot='chrome-extension://fixture-mall-helper/';
const checkUrl=extensionRoot+'contentPage/check.html?mallId=fixture-shop';
const getURL=value=>extensionRoot+value.replace(/^\//,'');
const log={log(){},info(){},warn(){},error(){}};

function openFixture(windows,{mode='superpower',beforeRead,onGet,failCreates=0}={}) {
  const calls=[];
  let nextId=99,reads=0;
  const reply=(value,callback)=>{callback?.(value);return Promise.resolve(value);};
  const find=id=>windows.flatMap(window=>window.tabs||[]).find(tab=>tab.id===id);
  const chrome={runtime:{getURL,id:'fixture-mall-helper'},windows:{getAll:(query,callback)=>{
    reads++;
    const snapshot=windows.map(window=>({...window,tabs:(window.tabs||[]).map(tab=>({...tab}))}));
    return beforeRead?beforeRead().then(()=>reply(snapshot,callback)):reply(snapshot,callback);
  }},tabs:{
    query:(query,callback)=>reply(windows.flatMap(window=>window.tabs||[]),callback),
    get:async id=>{const tab=find(id);if(!tab)throw new Error('tab closed');onGet?.(tab);return {...tab};},
    update:(id,properties,callback)=>{
      calls.push({type:'update',id,...properties});
      const tab=find(id);Object.assign(tab,properties);delete tab.pendingUrl;
      return reply({...tab},callback);
    },
    create:(properties,callback)=>{
      calls.push({type:'create',...properties});
      if(failCreates-->0)return Promise.reject(new Error('create failed'));
      let window=windows.find(item=>item.id===properties.windowId)||windows.find(item=>item.type==='normal');
      if(!window){window={id:2,type:'normal',tabs:[]};windows.push(window);}
      const tab={id:nextId++,...properties};(window.tabs||=[]).push(tab);
      return reply({...tab},callback);
    },
    remove:async id=>{calls.push({type:'remove',id});for(const window of windows)window.tabs=(window.tabs||[]).filter(tab=>tab.id!==id);},
  }};
  const begin=source.search(/^    (?:async )?openHelperIndex\(/m),end=source.indexOf('    async initPlugins(',begin);
  assert.ok(begin>=0&&end>begin);
  const method=vm.runInNewContext('({'+source.slice(begin,end)+'}).openHelperIndex',{
    chrome,console:log,u:log,URL,URLSearchParams,__SP_BUILD__:{mode},
  });
  const state={initJson:{sysMallId:'fixture-shop',desktopProtocol:mode==='superpower'?'super-power-browser-desktop/1':undefined}};
  return {calls,state,windows,get reads(){return reads;},open:()=>method.call(state)};
}

test('opening a check page preserves extension controls and existing merchant tabs',async()=>{
  const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:'chrome://extensions/'},{id:11,url:'https://seller.tiktok.test/dashboard'}]}]);
  await f.open();
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].type,'create');
  assert.equal(f.calls[0].url,checkUrl);
});

test('an existing own check page is reused before any blank page',async()=>{
  const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:'about:blank'},{id:11,url:checkUrl},{id:12,url:'chrome://extensions/'}]}]);
  await f.open();
  assert.equal(f.calls.length,1);
  assert.equal(f.calls[0].type,'update');assert.equal(f.calls[0].id,11);
  assert.equal(f.calls[0].url,checkUrl);
});

test('concurrent initialization shares one check-page lookup and creation',async()=>{
  let release;
  const barrier=new Promise(resolve=>release=resolve);
  const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:'https://seller.tiktok.test/'}]}],{beforeRead:()=>barrier});
  const first=f.open(),second=f.open(),third=f.open();
  assert.equal(first,second);assert.equal(second,third);
  assert.equal(f.reads,1);assert.deepEqual(f.calls,[]);
  release();await Promise.all([first,second,third]);
  assert.equal(f.calls.filter(call=>call.type==='create').length,1);
  assert.equal(f.windows[0].tabs.filter(tab=>tab.url===checkUrl).length,1);
});

test('repeated initialization does not reload an already completed own check page',async()=>{
  const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:checkUrl}]}]);
  f.state.check_completed=true;
  await f.open();await f.open();
  assert.deepEqual(f.calls,[]);
});

test('restored duplicate checks are consolidated only for the current shop and extension',async()=>{
  const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:checkUrl},{id:11,url:checkUrl},
    {id:12,url:extensionRoot+'contentPage/check.html?mallId=another-shop'},
    {id:13,url:'chrome-extension://another-extension/contentPage/check.html?mallId=fixture-shop'}]}]);
  await f.open();
  assert.deepEqual(f.calls.map(call=>[call.type,call.id]),[['update',10],['remove',11]]);
  assert.deepEqual(f.windows[0].tabs.map(tab=>tab.id),[10,12,13]);
});

test('a duplicate or blank page that starts merchant navigation is preserved',async()=>{
  for(const tabs of [[{id:10,url:checkUrl},{id:11,url:checkUrl}],[{id:11,url:'about:blank'}]]) {
    const f=openFixture([{id:1,type:'normal',tabs}],{onGet:tab=>{if(tab.id===11)tab.pendingUrl='https://seller.tiktok.test/';}});
    await f.open();
    assert.ok(!f.calls.some(call=>call.id===11));
    assert.equal(f.windows[0].tabs.find(tab=>tab.id===11).pendingUrl,'https://seller.tiktok.test/');
  }
});

test('a failed creation releases the initialization lock so a later attempt can recover',async()=>{
  const f=openFixture([],{failCreates:1});
  await f.open();await f.open();
  assert.equal(f.calls.filter(call=>call.type==='create').length,2);
  assert.equal(f.windows[0].tabs.filter(tab=>tab.url===checkUrl).length,1);
});

test('only genuinely unused blank or new-tab pages may be replaced',async()=>{
  for(const url of ['about:blank','chrome://newtab/','chrome://newtab']) {
    const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:'chrome://extensions/'},{id:11,url},{id:12,url:'https://seller.tiktok.test/'}]}]);
    await f.open();
    assert.equal(f.calls.length,1);
    assert.equal(f.calls[0].type,'update');assert.equal(f.calls[0].id,11);
    assert.equal(f.calls[0].url,checkUrl);
  }
});

test('a blank tab already navigating to a merchant page is preserved',async()=>{
  const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:'about:blank',pendingUrl:'https://seller.tiktok.test/'},{id:11,url:'chrome://extensions/'}]}]);
  await f.open();
  assert.equal(f.calls.length,1);assert.equal(f.calls[0].type,'create');
});

test('other extension pages and similarly named URLs are never reused as the check page',async()=>{
  for(const url of ['chrome-extension://another-extension/contentPage/check.html',extensionRoot+'contentPage/check.html.evil?mallId=fixture-shop','https://seller.tiktok.test/contentPage/check.html']) {
    const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url}]}]);
    await f.open();
    assert.equal(f.calls.length,1);assert.equal(f.calls[0].type,'create');
  }
});

test('without a normal browser window the helper creates a check tab',async()=>{
  for(const windows of [[],[{id:1,type:'popup',tabs:[{id:10,url:'https://seller.tiktok.test/'}]}],[{id:1,type:'normal',tabs:[]}]]) {
    const f=openFixture(windows);await f.open();
    assert.equal(f.calls.length,1);assert.equal(f.calls[0].type,'create');
    assert.equal(f.calls[0].url,checkUrl);
  }
});

function createdFixture({mode='superpower',checked=false,forceCloseTab=[]}={}) {
  const removed=[],notifications=[];
  let listener,updateListener,removedListener;
  const begin=source.indexOf('chrome.tabs.onCreated.addListener(');
  const end=source.indexOf('        chrome.alarms.onAlarm.addListener(',begin);
  assert.ok(begin>=0&&end>begin);
  const registration=source.slice(begin,end).trim().replace(/,$/,'');
  const state={isDebug:false,cookie_complete:checked,proxy_complete:checked,check_completed:checked,
    initJson:{},savePinnedPage(){},checkVisitUrl(){},newFirewallCheck(){}};
  const globals={
    state,__SP_BUILD__:{mode},console:log,u:log,x:{handleTabCreated(){},handleTabUpdated(){}},k:{compareVersion:()=>1},
    h:{event_type:{no_other_action:'no_other_action'},forceCloseTab},URL,URLSearchParams,
    chrome:{runtime:{getURL,sendMessage:(message,options,reply)=>{notifications.push(message);reply?.({});}},
      scripting:{executeScript:()=>Promise.resolve()},
      tabs:{onCreated:{addListener:value=>listener=value},onUpdated:{addListener:value=>updateListener=value},
        onRemoved:{addListener:value=>removedListener=value},remove:async id=>{removed.push(id);}}},
  };
  const methodBegin=source.indexOf('    guardUncheckedTab('),methodEnd=source.indexOf('    initEvent(',methodBegin);
  state.guardUncheckedTab=vm.runInNewContext('({'+source.slice(methodBegin,methodEnd)+'}).guardUncheckedTab',globals).bind(state);
  vm.runInNewContext('(function(){'+registration+';}).call(state)',globals);
  return {removed,notifications,state,created:tab=>listener({id:10,...tab}),
    updated:(change,tab={})=>updateListener(tab.id??10,change,{id:10,...tab}),closed:id=>removedListener(id)};
}

test('before detection completes extension and browser pages are preserved',()=>{
  for(const url of [checkUrl,extensionRoot+'contentPage/check.html','chrome://extensions/','chrome://extensions/?id=other',
    extensionRoot+'contentPage/check.html.evil','chrome-extension://another-extension/options.html','chrome://settings/']) {
    for(const field of ['pendingUrl','url']) {
      const f=createdFixture();f.created({[field]:url});
      assert.deepEqual(f.removed,[]);assert.deepEqual(f.notifications,[]);
    }
  }
  for(const url of ['https://seller.tiktok.test/','http://seller.tiktok.test/']) {
    const f=createdFixture();f.created({pendingUrl:url});
    assert.deepEqual(f.removed,[10]);assert.equal(f.notifications.length,1);
  }
  const navigating=createdFixture();
  navigating.created({url:checkUrl,pendingUrl:'https://seller.tiktok.test/'});
  assert.deepEqual(navigating.removed,[10]);
});

test('unknown and blank newly created tabs are checked only after their destination is known',()=>{
  for(const original of [{},{url:'about:blank'},{pendingUrl:'chrome://newtab/'}]) {
    const extension=createdFixture();extension.created(original);
    assert.deepEqual(extension.removed,[]);
    extension.updated({url:'chrome-extension://another-extension/options.html'});
    assert.deepEqual(extension.removed,[]);assert.equal(extension.state.spPendingDetectionTabs.size,0);
    const merchant=createdFixture();merchant.created(original);
    merchant.updated({url:'https://seller.tiktok.test/'},{url:'about:blank'});
    assert.deepEqual(merchant.removed,[10]);assert.equal(merchant.notifications.length,1);
    assert.equal(merchant.state.spPendingDetectionTabs.size,0);
  }
});

test('pending navigation wins over a blank current URL and existing merchant tabs remain untouched',()=>{
  const pending=createdFixture();pending.created({});
  pending.updated({status:'loading'},{url:'about:blank',pendingUrl:'https://seller.tiktok.test/'});
  assert.deepEqual(pending.removed,[10]);
  const existing=createdFixture();existing.updated({status:'loading'},{url:'https://seller.tiktok.test/',status:'loading'});
  assert.deepEqual(existing.removed,[]);
});

test('browser and extension updates bypass legacy merchant force-close rules',()=>{
  for(const url of ['chrome://extensions/','chrome-extension://another-extension/contentPage/check.html']) {
    const f=createdFixture({forceCloseTab:['extensions','another-extension']});
    f.created({});f.updated({status:'loading'},{url,status:'loading'});
    assert.deepEqual(f.removed,[]);assert.deepEqual(f.notifications,[]);
  }
});

test('deferred tabs are released on completion or removal without closing merchant pages',()=>{
  const f=createdFixture();f.created({});
  Object.assign(f.state,{cookie_complete:true,proxy_complete:true,check_completed:true});
  f.updated({url:'https://seller.tiktok.test/'},{status:'loading'});
  assert.deepEqual(f.removed,[]);assert.equal(f.state.spPendingDetectionTabs.size,0);
  const closed=createdFixture();closed.created({});closed.closed(10);
  assert.equal(closed.state.spPendingDetectionTabs.size,0);
});

test('completed detection still allows normal merchant tabs',()=>{
  const f=createdFixture({checked:true});f.created({pendingUrl:'https://seller.tiktok.test/'});
  assert.deepEqual(f.removed,[]);assert.deepEqual(f.notifications,[]);
});

test('legacy helper keeps its first-tab opening behavior',async()=>{
  const f=openFixture([{id:1,type:'normal',tabs:[{id:10,url:'https://seller.tiktok.test/'}]}],{mode:'legacy'});
  await f.open();
  assert.equal(f.calls[0].type,'update');assert.equal(f.calls[0].id,10);
});

test('legacy unchecked-tab restrictions keep their previous behavior',()=>{
  const f=createdFixture({mode:'legacy'});f.created({pendingUrl:'chrome-extension://another-extension/options.html'});
  assert.deepEqual(f.removed,[10]);
  const controls=createdFixture({mode:'legacy'});controls.created({pendingUrl:'chrome://extensions/'});
  assert.deepEqual(controls.removed,[]);
});
