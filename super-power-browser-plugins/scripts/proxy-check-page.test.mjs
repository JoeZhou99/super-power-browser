import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {networkPresentation} from '../lib/network-presentation.mjs';
import {pollNetworkInfo} from '../runtime/network-check.mjs';

// Execute the same transformed component and detection-card render expression
// that the build writes to the extension; source-only tests missed this path.
const raw=await readFile(new URL('../src/mall/contentPage/contentPage.js',import.meta.url),'utf8');
const page=networkPresentation(raw.replace(/\r\n/g,'\n'));
const ua='Mozilla/5.0 Chrome/144.0.0.0 Safari/537.36';
const snapshotId='a'.repeat(64);
const translate=key=>({'popup.loading':'检测中','popup.success':'成功','popup.fail':'失败'}[key]||key);
const shop=()=>({has_one_platform:{},has_one_agent_ip:{ip:'proxy.test'},
  has_one_agent_ip_v2:{ip:'proxy.test',port:1080,candidateIndex:0,transfer_proxies:[]},
  has_one_user_agent:{ua},has_one_mac_user_agent:{ua},platformName:'TikTok',check_env:'1'});
const routes=()=>({snapshotId,candidateIndex:0,candidates:[{candidateIndex:0,ip:'proxy.test',port:1080,proxy_type:'socks5'}]});

function fixture({details=async()=>({errorCode:0,data:shop()}),routeList=async()=>routes(),network=async()=>({allowed:true,attemptId:1,exit:{available:true,ip:'203.0.113.4'}}),complete=async()=>({allowed:true}),desktop=true,schedule=setTimeout,autoReady=false,poll=pollNetworkInfo}={}) {
  const messages=[],listeners=[],counters={details:0,routes:0,network:0};
  const globals={
    Ye:{},Ge:'',Ke:'',ze:'',He:'',qe:'',Qe:'',We:'',Date,setTimeout:schedule,pollNetworkInfo:poll,Y:value=>value,ie:()=>[],F:value=>value,
    sessionStorage:{getItem:()=>null,setItem(){}},
    console:{log(){},warn(){},error(){}},_:{warn(){},info(){},error(){}},
    navigator:{userAgent:ua},X:{compareVersion:()=>1},y:{warning(){}},
    E:{getMallInfo:async()=>{counters.details++;return details();},
      getWebsiteList:async()=>({errorCode:0,data:{websiteList:[]}}),getAdsRecommendBySite:async()=>({errorCode:0,data:[]})},
    requestProxyRoutes:async()=>{counters.routes++;return routeList();},
    S:{event_type:{set_proxy:'set_proxy',init_proxy_complete:'init_proxy_complete',check_completed:'check_completed'}},
    chrome:{storage:{local:{get:async()=>({})}},runtime:{onMessage:{addListener:listener=>listeners.push(listener)},
      sendMessage:async message=>{
        messages.push(message);
        if(message.type==='sp:network-info'){counters.network++;return network(message);}
        if(message.type==='sp:network-complete')return complete(message);
        if(autoReady&&message.type==='set_proxy')schedule(()=>listeners.forEach(listener=>listener({type:'init_proxy_complete'})),500);
        return {};
      }}},
  };
  const source=desktop?page:raw.replace(/\r\n/g,'\n');
  const begin=source.indexOf('Ze = te(')+'Ze = te('.length;
  const end=source.indexOf('\n  });\nfunction xe(',begin);
  assert.ok(begin>0&&end>begin);
  const component=vm.runInNewContext('('+source.slice(begin,end)+'\n})',globals);
  const state={$t:translate,...component.data.call({$t:translate})};
  Object.assign(state,{initJson:{...(desktop?{desktopProtocol:'super-power-browser-desktop/1'}:{}),commonParams:{app:'fixture'}},mallId:'fixture-shop'});
  for(const [name,method] of Object.entries(component.methods))state[name]=method.bind(state);
  for(const [name,getter] of Object.entries(component.computed))Object.defineProperty(state,name,{get:()=>getter.call(state)});
  state.initMessageWithServiceWorker();
  return {state,messages,listeners,counters,component};
}

async function watcherFixture(options) {
  const f=fixture(options);
  const vendor=await readFile(new URL('../src/mall/js/vendor-vue.js',import.meta.url),'utf8');
  const context=vm.createContext({document:{createElement:()=>({relList:{supports:()=>true}}),addEventListener(){}},console});
  vm.runInContext(vendor.slice(0,vendor.lastIndexOf('export {'))+'globalThis.renderer=ol;',context);
  // Mount the shipped component through Vue so its real Options API watchers
  // schedule retries in response to the asynchronous detection result.
  const component={...f.component,mounted(){},render(){return null;}};
  const app=context.renderer({createComment:()=>({}),insert(){},remove(){},parentNode:()=>null,nextSibling:()=>null}).createApp(component);
  const errors=[];
  app.config.errorHandler=error=>errors.push(error.message);
  app.config.globalProperties.$t=translate;
  const state=app.mount({});
  state.initJson=f.state.initJson;state.mallId=f.state.mallId;
  f.listeners.length=0;
  state.initMessageWithServiceWorker();
  return {...f,state,errors,unmount:()=>app.unmount()};
}

function renderedCards(state) {
  const begin=page.indexOf('n("div", It, ["ip","ua","line"]');
  const end=page.indexOf('                n("div", $t, [',begin);
  assert.ok(begin>=0&&end>begin);
  const node=(tag,props,children)=>({tag,props,children:children?.default?children.default():children});
  const root=vm.runInNewContext('('+page.slice(begin,end).trim().replace(/,$/,'')+')',{
    e:state,n:node,p:node,v:text=>node('comment',null,text),h:value=>value,o:String,T:items=>items.filter(Boolean).join(' '),
    It:{class:'detectionsStyle'},Bt:{class:'imgStyle'},Rt:null,Dt:null,u:'icon',I:'success',B:'failure',C:'pending',
  });
  return Array.from(root.children,card=>({
    kind:card.props.key,class:card.props.class,
    text:card.children[1].children[1].children,
    color:card.children[0].children[0].props.color,
  }));
}

function assertUntested(state) {
  assert.deepEqual(renderedCards(state).map(card=>card.text),['未检测','未检测','未检测']);
  assert.ok(renderedCards(state).every(card=>!card.class.includes('errorItemStyle')&&card.color==='#909399'));
  assert.equal(state.checkIpEnd,false);
  assert.equal(state.spCheckSetupPending,false);
}

test('unavailable shop details do not run routes or mark unperformed checks as failed',async()=>{
  for(const details of [async()=>{throw new Error('password=synthetic-secret');},async()=>undefined,async()=>({errorCode:1}),async()=>({errorCode:0,data:null})]) {
    const f=fixture({details});await f.state.getMallInfo();
    assert.equal(f.counters.routes,0);
    assert.equal(f.messages.length,0);
    assert.match(f.state.displayCheckResult,/店铺信息加载失败/);
    assert.doesNotMatch(f.state.displayCheckResult,/secret|password|TypeError/);
    assertUntested(f.state);
  }
});

test('unavailable live routes show a distinct safe setup error and retry all initialization',async()=>{
  let unavailable=true;
  const f=fixture({routeList:async()=>{if(unavailable)throw new Error('Unknown RPC GetProxyRoutes');return routes();}});
  await f.state.getMallInfo();
  assert.match(f.state.displayCheckResult,/线路信息加载失败/);
  assert.doesNotMatch(f.state.displayCheckResult,/RPC|GetProxyRoutes/);
  assertUntested(f.state);
  unavailable=false;
  await f.state.spRetry();
  assert.equal(f.counters.details,2);assert.equal(f.counters.routes,2);
  assert.equal(f.state.spCheckSetupError,'');
  assert.equal(f.state.spProxySnapshotId,snapshotId);
  assert.equal(f.messages.filter(message=>message.type==='set_proxy').length,1);
  assert.deepEqual(renderedCards(f.state).map(card=>card.text),['检测中','成功','检测中']);
  await f.state.checkIpHandle();
  assert.deepEqual(renderedCards(f.state).map(card=>card.text),['成功','成功','成功']);
  assert.equal(f.state.spNetwork.ip,'203.0.113.4');
});

test('a real failed exit check keeps the completed UA result and can recover',async()=>{
  let online=false;
  const f=fixture({network:async()=>online?{allowed:true,exit:{available:true,ip:'203.0.113.5'}}:{allowed:false,message:'代理连接失败'}});
  await f.state.getMallInfo();await f.state.checkIpHandle();
  assert.deepEqual(renderedCards(f.state).map(card=>card.text),['失败','成功','失败']);
  online=true;
  await f.state.spRetry();await f.state.checkIpHandle();
  assert.deepEqual(renderedCards(f.state).map(card=>card.text),['成功','成功','成功']);
});

test('pending check stays visible, ignores repeated readiness, and only opens after desktop acknowledgement',async()=>{
  let release,confirm;const f=fixture({network:()=>new Promise(resolve=>release=resolve),complete:()=>new Promise(resolve=>confirm=resolve)});
  await f.state.getMallInfo();const pending=f.state.checkIpHandle();
  await f.state.checkIpHandle();f.listeners[0]({type:'init_proxy_complete'});
  assert.equal(f.counters.network,1);assert.equal(f.state.spNetwork.pending,true);assert.equal(f.state.checkIpEnd,false);
  release({allowed:true,attemptId:3,exit:{available:true,ip:'203.0.113.8'}});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.state.checkIp,false);assert.equal(f.state.checkIpEnd,false);
  confirm({allowed:true});await pending;
  await f.state.checkIpHandle();f.listeners[0]({type:'init_proxy_complete'});
  assert.equal(f.counters.network,1);assert.equal(f.state.checkIp,true);
  assert.equal(f.messages.filter(message=>message.type==='sp:network-complete').length,1);
});

test('SuperPower check_env=2 never bypasses exit verification or a rejected completion',async()=>{
  const f=fixture({details:async()=>({errorCode:0,data:{...shop(),check_env:'2'}}),complete:async()=>({allowed:false,message:'检测状态已变化'})});
  await f.state.getMallInfo();f.listeners[0]({type:'init_proxy_complete'});
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(f.counters.network,1);assert.equal(f.state.checkIp,false);assert.equal(f.state.loadIp,false);
  assert.match(f.state.displayCheckResult,/检测状态已变化/);
  assert.equal(f.messages.some(message=>message.type==='check_completed'),false);
});

test('desktop failures do not trigger a second automatic attempt and manual retry is sent once',async t=>{
  const scheduled=[];
  const f=await watcherFixture({autoReady:true,schedule:(callback,delay)=>scheduled.push({callback,delay}),
    network:async()=>({allowed:false,exit:{available:false},message:'代理出口检测失败，请检查代理后重试'})});
  t.after(f.unmount);
  const flush=()=>new Promise(resolve=>setImmediate(resolve));
  const finishAttempts=async()=>{
    const delays=[];
    for(let remaining=10;scheduled.length;remaining--){
      assert.ok(remaining>0,'automatic retries must stop');
      const timer=scheduled.shift();delays.push(timer.delay);timer.callback();await flush();
    }
    return delays;
  };
  await f.state.getMallInfo();await flush();
  assert.deepEqual(await finishAttempts(),[500]);
  assert.equal(f.counters.network,1);
  assert.equal(f.messages.filter(message=>message.type==='set_proxy').length,1);
  assert.equal(f.state.maxRetryTimes,0);
  assert.equal(f.state.loadIp,false);
  assert.equal(f.state.checkIp,false);
  assert.equal(f.state.checkUa,true);
  assert.deepEqual(renderedCards(f.state).map(card=>card.text),['失败','成功','失败']);
  assert.equal(f.messages.some(message=>message.type==='check_completed'),false);

  await f.state.spRetry();await flush();
  assert.equal(f.state.maxRetryTimes,0);
  assert.deepEqual(await finishAttempts(),[500]);
  assert.equal(f.counters.network,2);
  assert.equal(f.counters.details,2);
  assert.equal(f.counters.routes,2);
  assert.equal(f.messages.filter(message=>message.type==='set_proxy').length,2);
  assert.equal(f.messages.filter(message=>message.type==='sp:network-info'&&message.retry===true).length,1);
  assert.equal(f.state.maxRetryTimes,0);
  assert.equal(f.state.loadIp,false);
  assert.equal(f.state.checkIp,false);
  assert.equal(f.messages.some(message=>message.type==='check_completed'),false);
  assert.deepEqual(f.errors,[]);
});

test('an old readiness event during initialization cannot run checks against missing shop data',async()=>{
  let release;
  const f=fixture({details:()=>new Promise(resolve=>release=resolve)});
  const pending=f.state.getMallInfo();
  f.listeners[0]({type:'init_proxy_complete'});
  await f.state.spRetry();
  assert.equal(f.counters.details,1);
  assert.equal(f.messages.length,0);
  release({errorCode:0,data:shop()});await pending;
  assert.equal(f.messages.filter(message=>message.type==='set_proxy').length,1);
});

test('missing user-agent configuration is not a failed comparison and never starts the proxy check',async()=>{
  const f=fixture({details:async()=>({errorCode:0,data:{...shop(),has_one_user_agent:null}})});
  await f.state.getMallInfo();
  assert.match(f.state.displayCheckResult,/店铺检测信息未准备好/);
  assertUntested(f.state);
  assert.equal(f.messages.length,0);
});

test('shop detail API propagates network and backend rejection for page-owned recovery',async()=>{
  const api=await readFile(new URL('../src/mall/js/api.js',import.meta.url),'utf8');
  const begin=api.indexOf('    async getMallInfo('),end=api.indexOf('    async saveMallJumpMethod(',begin);
  for(const fetcher of [async()=>{throw new Error('transport unavailable');},async()=>({json:async()=>({errorCode:1})})]) {
    const method=vm.runInNewContext('({'+api.slice(begin,end)+'}).getMallInfo',{
      s:async()=>({}),o:'https://fixture.test',URLSearchParams,fetch:fetcher,
      n:response=>{if(response.errorCode)throw new Error('backend rejected');return response;},
    });
    await assert.rejects(method({mallId:'fixture-shop'}),/transport unavailable|backend rejected/);
  }
});

test('retry cannot reset the route pool during latency testing or a pending manual switch',async()=>{
  const f=fixture();await f.state.getMallInfo();await f.state.checkIpHandle();
  f.state.isTransitLatencyTesting=true;
  await f.state.spRetry();
  f.state.isTransitLatencyTesting=false;f.state.switchingIndex=0;
  await f.state.spRetry();
  assert.equal(f.counters.details,1);
  assert.equal(f.state.spProxySnapshotId,snapshotId);
});

test('legacy initialization keeps its server routes and bounded timeout retry flow',async()=>{
  const f=fixture({desktop:false});await f.state.getMallInfo();
  assert.equal(f.counters.routes,0);
  assert.equal(f.state.checkUa,true);
  assert.equal(f.messages.filter(message=>message.type==='set_proxy').length,1);
  const timedOut=fixture({desktop:false,details:async()=>{throw new Error('timeout');}});
  await timedOut.state.getMallInfo();
  await new Promise(resolve=>setImmediate(resolve));
  assert.equal(timedOut.counters.details,5);
  assert.equal(timedOut.counters.routes,0);
  assert.equal(timedOut.state.spCheckSetupPending,false);
  assert.equal(timedOut.state.loadIp,false);
});

test('the complete transformed check page mounts and updates with its actual Vue renderer',async()=>{
  const vendor=await readFile(new URL('../src/mall/js/vendor-vue.js',import.meta.url),'utf8');
  const document={createElement:()=>({relList:{supports:()=>true}}),addEventListener(){}};
  const vendorContext=vm.createContext({document,console});
  const exportAt=vendor.lastIndexOf('export {');
  const bindings=vendor.slice(exportAt+'export {'.length,vendor.lastIndexOf('};'))
    .replace(/([\w$]+)\s+as\s+([\w$]+)/g,'$2:$1');
  // Use the shipped Vue implementation, including its optimized block path.
  // A mock VNode factory accepts raw null children; Vue's cloneIfMounted does
  // not, and this previously caused the entire check page to remain blank.
  vm.runInContext(vendor.slice(0,exportAt)+'globalThis.vue={'+bindings+'};globalThis.renderer=ol;',vendorContext);
  const vue=vendorContext.vue;
  const vueImports=page.match(/import \{([\s\S]*?)\} from "\.\.\/js\/vendor-vue.js";/)[1].split('import {').at(-1);
  const globals={document,console,Date,Intl,URL,URLSearchParams,navigator:{userAgent:ua},X:{compareVersion:()=>1},ye:()=>null};
  for(const binding of vueImports.matchAll(/([\w$]+)\s+as\s+([\w$]+)/g))globals[binding[2]]=vue[binding[1]];
  const pageContext=vm.createContext(globals);
  vm.runInContext(page.slice(page.indexOf('const Q ='),page.indexOf('const In = le(Ze,'))+
    'globalThis.component=Ze;globalThis.render=bn;',pageContext);
  let mounted=false;
  const component=pageContext.component;
  component.render=pageContext.render;
  component.mounted=function(){mounted=true;};
  const element=tag=>({tag,children:[],props:{}});
  const host={
    insert(child,parent){parent.children.push(child);child.parent=parent;},
    remove(child){const children=child.parent?.children;if(children)children.splice(children.indexOf(child),1);},
    createElement:element,createText:text=>({text}),createComment:text=>({comment:text}),
    setText(node,text){node.text=text;},setElementText(node,text){node.children=[];node.text=text;},
    parentNode:node=>node.parent,nextSibling:()=>null,patchProp(node,key,previous,value){node.props[key]=value;},setScopeId(){},
    insertStaticContent(content,parent){const node={static:content};parent.children.push(node);return [node,node];},
  };
  const errors=[],root=element('root'),app=vendorContext.renderer(host).createApp(component);
  app.config.globalProperties.$t=translate;
  app.config.errorHandler=error=>errors.push(error.message);
  // Element Plus internals are irrelevant here; keep the actual page render,
  // component state, Vue VNodes, block tracking and patching intact.
  for(const name of ['el-button','Setting','el-icon','el-button-group','Loading','CircleCheck','Warning','el-tooltip',
    'el-carousel-item','el-carousel','el-dropdown-item','el-dropdown-menu','el-dropdown','el-radio','el-radio-group','el-dialog'])
    app.component(name,{render:()=>vue.j('span')});
  const state=app.mount(root);
  assert.equal(mounted,true);assert.deepEqual(errors,[]);assert.equal(root.children.length,1);
  const texts=node=>[node.text,...(node.children||[]).flatMap(texts)];
  assert.equal(state.hasTransferProxyPool,false);
  assert.equal(texts(root).filter(text=>text==='检测中').length,3);
  state.loadIp=false;state.loadUa=false;
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(errors,[]);
  assert.equal(texts(root).filter(text=>text==='未检测').length,3);
  state.initJson={desktopProtocol:'super-power-browser-desktop/1',appVersion:'5.3.17',commonParams:{app:'fixture'}};
  state.transferProxies=[{candidateIndex:0,ip:'relay.test',port:1080,proxy_type:'socks5',name:'香港 A',region:'香港',poolName:'香港分组'}];
  state.applyRelaySnapshot({relayPool:{id:'pool',name:'共享加速'},automatic:true,relayStatus:'healthy',candidateIndex:0,candidates:[{
    candidateIndex:0,health:{available:true,entryLatencyMs:25,delay:380,sampledAt:'2026-11-11T00:00:00Z'},
  }]});
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(errors,[]);
  assert.ok(texts(root).some(text=>String(text).includes('共享加速 · 自动故障切换')));
  assert.equal(state.hasTransferProxyPool,true);
  assert.ok(texts(root).some(text=>String(text).includes('香港分组 · 香港 A · 香港')));
  assert.ok(texts(root).some(text=>String(text).includes('入口 TCP 25ms · 网站响应 380ms')));
  state.spRelayAutomatic=false;state.spRelayStatus='locked';
  await new Promise(resolve=>setImmediate(resolve));
  assert.deepEqual(errors,[]);
  assert.ok(texts(root).some(text=>String(text).includes('手动锁定')));
  app.unmount();
});
