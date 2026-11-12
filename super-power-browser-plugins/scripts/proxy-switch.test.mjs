import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {candidateIndex, requestProxySwitch, switchAuthorizedProxy, requestProxyRoutes, queryAuthorizedProxyRoutes, requestTransferSpeed, measureAuthorizedTransfer,requestTransferDetails,requestProxyAutomatic,setAuthorizedProxyAutomatic} from '../runtime/proxy-switch.mjs';

const sender = {id:'fixture-extension',url:'chrome-extension://fixture-extension/contentPage/index.html'};
const snapshotId = 'a'.repeat(64);
const context = extras => ({extensionId:sender.id,extensionRoot:'chrome-extension://fixture-extension/',readyType:'init_proxy_complete',...extras});

test('switch waits for the authorized desktop result before publishing readiness', async () => {
  const events = [];
  let ready;
  const pending = switchAuthorizedProxy({candidateIndex:2,snapshotId,proxyInfo:{host:'untrusted.test',password:'fixture-only'}},sender,context({
    rpc:async (action,args) => {assert.equal(action,'StartProxy');assert.deepEqual(args,{proxyInfo:{candidateIndex:2,snapshotId}});events.push('start');await new Promise(resolve => ready=resolve);return {ret:200,returnObj:{isSuccess:true,candidateIndex:2,snapshotId,proxyAddress:[]}};},
    notify:async message => events.push(message),
  }));
  await Promise.resolve();
  assert.deepEqual(events,['start']);
  ready();
  assert.deepEqual(await pending,{isSuccess:true,candidateIndex:2,snapshotId});
  assert.deepEqual(events,['start',{type:'init_proxy_complete',candidateIndex:2,snapshotId}]);
});

test('failed or mismatched desktop results never claim a ready proxy', async () => {
  for (const reply of [{ret:400,returnObj:{}},{ret:200,returnObj:{isSuccess:false,candidateIndex:1}},{ret:200,returnObj:{isSuccess:true,candidateIndex:2}}]) {
    let notified=false;
    await assert.rejects(switchAuthorizedProxy({candidateIndex:1,snapshotId},sender,context({rpc:async()=>reply,notify:()=>notified=true})),/线路切换失败/);
    assert.equal(notified,false);
  }
});

test('switch rejects website senders and invalid candidates before desktop access', async () => {
  let calls=0;
  const options=context({rpc:async()=>{calls++;},notify:()=>{}});
  for (const origin of [{id:'another-extension',url:sender.url},{id:sender.id,url:'https://shop.test/'},{id:sender.id}]) {
    await assert.rejects(switchAuthorizedProxy({candidateIndex:0},origin,options),/未授权/);
  }
  for (const index of [-1,9,0.5,'1',null,undefined]) {
    assert.throws(()=>candidateIndex(index),/编号无效/);
    await assert.rejects(switchAuthorizedProxy({candidateIndex:index},sender,options),/编号无效/);
  }
  assert.equal(calls,0);
});

test('page binds candidate selection to its snapshot and rejects a stale success', async () => {
  assert.deepEqual(await requestProxySwitch(0,snapshotId,async message=>{assert.deepEqual(message,{type:'sp:proxy-switch',candidateIndex:0,snapshotId});return {isSuccess:true,candidateIndex:0,snapshotId};}),{isSuccess:true,candidateIndex:0,snapshotId});
  await assert.rejects(requestProxySwitch(2,snapshotId,async()=>({isSuccess:true,candidateIndex:1,snapshotId})),/切换失败/);
  await assert.rejects(requestProxySwitch(2,snapshotId,async()=>({isSuccess:true,candidateIndex:2,snapshotId:'b'.repeat(64)})),/切换失败/);
  await assert.rejects(requestProxySwitch(2,undefined,async()=>assert.fail('must not send an unversioned route')),/配置已失效/);
});

test('a closed page does not change a successful desktop switch into a failure', async () => {
  const result=await switchAuthorizedProxy({candidateIndex:1,snapshotId},sender,context({rpc:async()=>({ret:200,returnObj:{isSuccess:true,candidateIndex:1,snapshotId}}),notify:async()=>{throw new Error('Page closed');}}));
  assert.deepEqual(result,{isSuccess:true,candidateIndex:1,snapshotId});
});

test('automatic mode uses an authorized snapshot and never accepts a page supplied connection',async()=>{
  const state={snapshotId,candidateIndex:0,candidates:[{candidateIndex:0,ip:'relay.test',port:1080,proxy_type:'socks5',password:'must-not-leak',name:'香港 A',
    poolId:'hk-pool',poolName:'香港分组',health:{available:true,delay:300,entryLatencyMs:25,sampledAt:'2026-11-11T00:00:00Z'}}],
    relayPool:{id:'pool',name:'平台加速',password:'must-not-leak'},automatic:true,relayStatus:'monitoring'};
  const options=context({rpc:async(action,args)=>{
    assert.equal(action,'SetProxyAutomatic');assert.deepEqual(args,{automatic:true,snapshotId});return {ret:200,returnObj:state};
  }});
  const result=await requestProxyAutomatic(true,snapshotId,message=>setAuthorizedProxyAutomatic({...message,host:'injected.test'},sender,options));
  assert.equal(result.automatic,true);assert.equal(result.candidates[0].health.entryLatencyMs,25);
  assert.equal(result.candidates[0].name,'香港 A');assert.ok(!JSON.stringify(result).includes('must-not-leak'));
  assert.equal(result.candidates[0].poolId,'hk-pool');assert.equal(result.candidates[0].poolName,'香港分组');
  await assert.rejects(setAuthorizedProxyAutomatic({automatic:true,snapshotId},{id:sender.id,url:'https://merchant.test/'},options),/未授权/);
  await assert.rejects(requestProxyAutomatic('true',snapshotId),/参数不合法/);
});

test('isolated measurement returns real millisecond samples and sample time without route mutation',async()=>{
  const result=await requestTransferDetails(0,snapshotId,async message=>{
    assert.deepEqual(message,{type:'sp:transfer-speed',candidateIndex:0,snapshotId});
    return {available:true,delay:0,entryLatencyMs:12,sampledAt:'2026-11-11T00:00:00Z',candidateIndex:0,snapshotId};
  });
  assert.deepEqual(result,{delay:0,entryLatencyMs:12,sampledAt:'2026-11-11T00:00:00Z'});
});

test('readiness broadcast needs no response from the content page', async () => {
  let completed=false;
  switchAuthorizedProxy({candidateIndex:0,snapshotId},sender,context({rpc:async()=>({ret:200,returnObj:{isSuccess:true,candidateIndex:0,snapshotId}}),notify:()=>new Promise(()=>{})})).then(()=>completed=true);
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(completed,true);
});

const pageSource=await readFile(new URL('../src/mall/contentPage/contentPage.js',import.meta.url),'utf8');
function pageMethod(name,next,globals={}) {
  const methodStart=(method,from=0)=>{
    const match=new RegExp(`^      (?:async )?${method}\\(`,'m').exec(pageSource.slice(from));
    return match ? from+match.index : -1;
  };
  const start=methodStart(name),end=methodStart(next,start+1);
  assert.ok(start>=0&&end>start);
  return vm.runInNewContext(`({${pageSource.slice(start,end)}})`,globals)[name];
}

test('candidate list keeps separate authorized lines at the same endpoint', () => {
  const build=pageMethod('buildTransitProxyList','isCurrentMainTransitLine');
  const result=build.call({hasCommonParams:true,mall:{has_one_agent_ip_v2:{candidateIndex:0,ip:'gateway.test',port:443,proxy_type:'https',transfer_proxies:[{candidateIndex:1,ip:'gateway.test',port:443,proxy_type:'socks5'}]}}});
  assert.deepEqual(Array.from(result.list,line=>line.candidateIndex),[0,1]);
});

test('fallback from a saved last line still tries primary and every remaining candidate once', () => {
  const attempt=pageMethod('trySwitchTransferProxy','normalizeJumpMethod',{_:{info(){},error(){}}});
  const tried=[2],switched=[];
  const state={initJson:{desktopProtocol:'super-power-browser-desktop/1'},transferProxies:[{candidateIndex:0},{candidateIndex:1},{candidateIndex:2}],spTriedCandidateIndexes:tried,canUseTransitPoolFlow:()=>true,isTransitLatencyTesting:false,$t:value=>value,transferProxySwitchCount:0,swithTransit(line){tried.push(line.candidateIndex);switched.push(line.candidateIndex);}};
  assert.equal(attempt.call(state),true);
  assert.equal(attempt.call(state),true);
  assert.equal(attempt.call(state),true);
  assert.deepEqual(switched,[0,1]);
  assert.equal(state.transferProxySwitchCount,2);
});

function switchingPage(rpc,{count=3,current=2,measure=async()=>({delay:3,entryLatencyMs:1,sampledAt:new Date().toISOString()})}={}) {
  const requests=[],checks=[],listeners=[],measurements=[];
  const globals={
    _:{info(){},warn(){},error(){}},console:{log(){}},
    S:{event_type:{init_proxy_complete:'init_proxy_complete'}},
    chrome:{runtime:{onMessage:{addListener:listener=>listeners.push(listener)}}},
    requestProxyRoutes:async()=>({snapshotId,candidateIndex:state.currentTransferProxyIndex,candidates:state.transferProxies}),
    requestTransferDetails:async index=>{measurements.push(index);return measure(index);},
    requestProxySwitch:(index,snapshot)=>requestProxySwitch(index,snapshot,async message=>{
      try {
        return await switchAuthorizedProxy(message,sender,context({
          rpc:async(action,args)=>{requests.push(args.proxyInfo.candidateIndex);return rpc(args.proxyInfo.candidateIndex);},
          notify:message=>listeners.forEach(listener=>listener(message)),
        }));
      } catch(error) {
        return {isSuccess:false,...(Number.isInteger(error.candidateIndex)?{candidateIndex:error.candidateIndex}:{})};
      }
    }),
  };
  const state={
    initJson:{desktopProtocol:'super-power-browser-desktop/1'},
    mall:{check_env:'1',has_one_agent_ip:{}},
    transferProxies:Array.from({length:count},(_,candidateIndex)=>({candidateIndex,ip:'fixture.test',port:1080})),
    currentTransferProxyIndex:current,nextTransferProxyIndex:current+1,
    spTriedCandidateIndexes:[current],spProxySwitchAttempt:0,transferProxySwitchCount:0,
    spProxySnapshotId:snapshotId,
    switchingIndex:-1,isTransitLatencyTesting:false,isBatchTransitTesting:false,
    checkIp:false,checkIpEnd:false,loadIp:false,hasPendingTransferReport:false,
    spNetwork:{message:''},canUseTransitPoolFlow:()=>true,$t:value=>value,encryptLogText:value=>value,
    checkIpHandle(){checks.push(this.currentTransferProxyIndex);this.loadIp=false;this.checkIp=true;this.switchingIndex=-1;},
  };
  for (const [name,next] of [
    ['trySwitchTransferProxy','normalizeJumpMethod'],
    ['handleManualSwitchTransit','reportSelectedTransferOnSuccess'],
    ['syncTransitCandidateIndex','swithTransit'],
    ['swithTransit','openMall'],
    ['initMessageWithServiceWorker','initPageData'],
    ['switchTransitAndWaitReady','fetchLatencyOnce'],
    ['getTransitSelectionSnapshot','restoreTransitSelectionAfterTest'],
    ['restoreTransitSelectionAfterTest','runTransitLatencyTest'],
    ['runTransitLatencyTest','sendTransferProxiesTest'],
    ['testAllTransitLines','handleManualSwitchTransit'],
  ]) state[name]=pageMethod(name,next,globals);
  state.initMessageWithServiceWorker();
  return {state,requests,checks,measurements};
}
const switchReply=index=>({ret:200,returnObj:{isSuccess:true,candidateIndex:index,snapshotId}});
const failedSwitch=index=>({ret:400,returnObj:{isSuccess:false,candidateIndex:index}});
const settle=()=>new Promise(resolve=>setImmediate(resolve));

test('a rejected automatic switch advances to the next untried line without a ready event',async()=>{
  const {state,requests,checks}=switchingPage(index=>index===0?failedSwitch(2):switchReply(index));
  assert.equal(state.trySwitchTransferProxy(),true);
  assert.equal(state.currentTransferProxyIndex,2,'pending request must preserve the confirmed line');
  await settle();
  assert.deepEqual(requests,[0,1]);
  assert.deepEqual(Array.from(state.spTriedCandidateIndexes),[2,0,1]);
  assert.deepEqual(checks,[1],'only the successful desktop result starts environment detection');
  assert.equal(state.currentTransferProxyIndex,1);
  assert.equal(state.switchingIndex,-1);
  assert.equal(state.checkIp,true);
});

test('automatic fallback stops after the entire authorized pool fails',async()=>{
  const {state,requests,checks}=switchingPage(()=>failedSwitch(8),{count:9,current:8});
  state.trySwitchTransferProxy();
  await settle();
  assert.deepEqual(requests,[0,1,2,3,4,5,6,7]);
  assert.equal(state.transferProxySwitchCount,8);
  assert.deepEqual(checks,[]);
  assert.equal(state.currentTransferProxyIndex,8);
  assert.equal(state.switchingIndex,-1);
  assert.equal(state.loadIp,false);
  assert.equal(state.checkIpEnd,false,'failure must not also activate the detection watcher');
  assert.equal(state.hasPendingTransferReport,false);
  assert.equal(state.checkResult,'check.content.the_test_failed');
  assert.equal(state.spNetwork.message,state.checkResult);
});

test('manual rejection shows the error and restores the actual desktop line without fallback',async()=>{
  const {state,requests,checks}=switchingPage(()=>failedSwitch(2),{current:0});
  const pending=state.handleManualSwitchTransit(state.transferProxies[1],1);
  assert.equal(state.currentTransferProxyIndex,0);
  assert.equal(await pending,false);
  await settle();
  assert.deepEqual(requests,[1]);
  assert.deepEqual(checks,[]);
  assert.equal(state.currentTransferProxyIndex,2);
  assert.equal(state.nextTransferProxyIndex,3);
  assert.equal(state.switchingIndex,-1);
  assert.equal(state.loadIp,false);
  assert.equal(state.checkIpEnd,false);
  assert.match(state.checkResult,/线路切换失败/);
  assert.equal(state.spNetwork.message,state.checkResult);
});

test('manual transport failure without a confirmed index retains the previous line',async()=>{
  const {state,requests}=switchingPage(()=>{throw new Error('fixture transport closed');},{current:0});
  assert.equal(await state.handleManualSwitchTransit(state.transferProxies[1],1),false);
  assert.deepEqual(requests,[1]);
  assert.equal(state.currentTransferProxyIndex,0);
  assert.equal(state.nextTransferProxyIndex,1);
  assert.equal(state.checkIpEnd,false);
});

test('desktop batch latency tests isolated candidates without switching or restoring the active line',async()=>{
  const {state,requests,checks,measurements}=switchingPage(index=>switchReply(index),{measure:async index=>{
    if(index===0)throw new Error('unavailable');return {delay:3,entryLatencyMs:1,sampledAt:new Date().toISOString()};
  }});
  const latency=new Map();
  Object.assign(state,{
    updateTransitLatencyState(index,value){latency.set(index,{...latency.get(index),...value});},
    measureLocalToTransit:async()=>1,
    getTransitLatencyTargetUrl:()=> 'https://fixture.test/',
    measureTransitToWebAvg:async()=>({samples:[2],average:2}),
    measureTransferLineTotalLatency:async()=>3,
    toTransitLatencyErrorMessage:error=>error.message,
    switchBestTransitAfterTestAllIfEnabled:async()=>{},
  });
  await state.testAllTransitLines();
  assert.deepEqual(requests,[],'testing must never restart the shop forwarder');
  assert.deepEqual(measurements,[0,1,2]);
  assert.deepEqual(checks,[],'latency testing suppresses normal environment checks');
  assert.equal(latency.get(0).status,'fail');
  assert.equal(latency.get(1).status,'success');
  assert.equal(latency.get(2).status,'success');
  assert.equal(state.currentTransferProxyIndex,2);
  assert.equal(state.isTransitLatencyTesting,false);
  assert.equal(state.isBatchTransitTesting,false);
  assert.deepEqual(state.spTriedCandidateIndexes,[2],'latency testing does not consume fallback candidates');
});

test('desktop latency completion does not restore an old selection over a concurrent actual route',async()=>{
  const {state,requests}=switchingPage(()=>failedSwitch(1),{current:1});
  state.isTransitLatencyTesting=true;
  await state.restoreTransitSelectionAfterTest({currentTransferProxyIndex:2,nextTransferProxyIndex:3});
  assert.deepEqual(requests,[]);
  assert.equal(state.currentTransferProxyIndex,1);
  assert.equal(state.nextTransferProxyIndex,2);
});

test('successful SP line reporting preserves UUID shop IDs',async()=>{
  const reported=[];
  const report=pageMethod('reportSelectedTransferOnSuccess','trySwitchTransferProxy',{
    _:{info(){},error(){}},E:{updateMainTransfer:async payload=>{reported.push(payload);return {errorCode:0};}},
  });
  const uuid='550e8400-e29b-41d4-a716-446655440000';
  const state={initJson:{desktopProtocol:'super-power-browser-desktop/1'},mallId:uuid,mall:{has_one_agent_ip:{}},
    canUseTransitPoolFlow:()=>true,hasPendingTransferReport:true,currentTransferProxyIndex:0,hasCommonParams:true,
    spProxySnapshotId:snapshotId,
    transferProxies:[{candidateIndex:2,ip:'fixture.test',port:1080}],encryptLogText:value=>value};
  await report.call(state);
  assert.equal(reported.length,1);
  assert.equal(reported[0].mall_id,uuid);
  assert.equal(reported[0].candidateIndex,2);
  assert.equal(reported[0].snapshotId,snapshotId);
  assert.equal(state.hasPendingTransferReport,false);
});

test('route state comes from the desktop and never exposes returned connection secrets',async()=>{
  const state={snapshotId,candidateIndex:1,candidates:[
    {candidateIndex:0,ip:'main.test',port:8080,proxy_type:'http'},
    {candidateIndex:1,ip:'original.test',port:8081,proxy_type:'socks5',username:'synthetic-user',password:'synthetic-secret'},
  ]};
  const reply=await requestProxyRoutes(async message=>{
    assert.deepEqual(message,{type:'sp:proxy-routes'});
    return queryAuthorizedProxyRoutes(sender,context({rpc:async(action,args)=>{
      assert.equal(action,'GetProxyRoutes');assert.deepEqual(args,{});return {ret:200,returnObj:state};
    }}));
  });
  assert.equal(reply.candidateIndex,1);assert.equal(reply.candidates[1].ip,'original.test');
  assert.equal(JSON.stringify(reply).includes('synthetic-secret'),false);
  assert.equal('username' in reply.candidates[1],false);
  await assert.rejects(queryAuthorizedProxyRoutes({id:sender.id,url:'https://page.test/'},context({rpc:()=>assert.fail('unauthorized RPC')})),/未授权/);
  await assert.rejects(requestProxyRoutes(async()=>({...state,candidateIndex:2})),/当前线路无效/);
});

test('reloading the check page uses live snapshot routes and selection after server edits',async()=>{
  const running={snapshotId,candidateIndex:1,candidates:[
    {candidateIndex:0,ip:'main.test',port:8080,proxy_type:'http'},
    {candidateIndex:1,ip:'original.test',port:8081,proxy_type:'http'},
  ]};
  let backendCalls=0,desktopCalls=0,starts=0;
  const globals={
    E:{getMallInfo:async()=>{backendCalls++;return {errorCode:0,data:{has_one_agent_ip:{ip:'main.test'},has_one_platform:{},has_one_agent_ip_v2:{ip:'main.test',port:8080,proxy_type:'http',candidateIndex:0,preferredCandidateIndex:0,transfer_proxies:[{ip:'replacement.test',port:8082,proxy_type:'http',candidateIndex:1}]}}};}},
    requestProxyRoutes:async()=>{desktopCalls++;return running;},
    console:{log(){},error(){}},chrome:{storage:{local:{get:async()=>({})}}},Y:id=>id,_:{warn(){}},
  };
  const load=pageMethod('getMallInfo','checkUserAgent',globals);
  const state={initJson:{desktopProtocol:'super-power-browser-desktop/1',preferredCandidateIndex:0},mallId:'shop-fixture',hasCommonParams:true,
    $t:value=>value,
    buildTransitProxyList:pageMethod('buildTransitProxyList','isCurrentMainTransitLine'),canUseTransitPoolFlow:()=>true,
    resetTransitLatencyStates(){},syncPageLoadJumpMethod(){},checkUserAgent(){},getWebsiteList(){},getAdsRecommend(){},startProxy(){starts++;},normalizeJumpMethod(){},
  };
  await load.call(state);await load.call(state);
  assert.equal(backendCalls,2);assert.equal(desktopCalls,2);assert.equal(starts,2);
  assert.equal(state.transferProxies[1].ip,'original.test');
  assert.equal(state.currentTransferProxyIndex,1);assert.equal(state.spProxySnapshotId,snapshotId);
});

test('missing latency remains unavailable and real zero latency remains valid',()=>{
  const format=pageMethod('formatLatency','getTransitMetricValue');
  const level=pageMethod('getTransitMetricLevel','getTransitLatencySummary');
  for(const value of [null,undefined,'',NaN,-1]){
    assert.equal(format(value),'--');
    assert.equal(level.call({getTransitLatencyState:()=>({status:'success'}),getTransitMetricValue:()=>value},0,'line'),'gray');
  }
  assert.equal(format(0),'0ms');assert.equal(format(12.4),'12ms');
});

test('latency restoration snapshots the desktop current line after another page switches it',async()=>{
  const state={initJson:{desktopProtocol:'super-power-browser-desktop/1'},spProxySnapshotId:snapshotId,
    transferProxies:[{candidateIndex:0},{candidateIndex:1}],currentTransferProxyIndex:0,nextTransferProxyIndex:1,
    syncTransitCandidateIndex:pageMethod('syncTransitCandidateIndex','swithTransit')};
  const capture=pageMethod('getTransitSelectionSnapshot','restoreTransitSelectionAfterTest',{
    requestProxyRoutes:async()=>({snapshotId,candidateIndex:1}),
  });
  const before=await capture.call(state);
  assert.equal(before.currentTransferProxyIndex,1);assert.equal(before.nextTransferProxyIndex,2);
});

test('local latency RPC carries the same route snapshot as switching and total latency',async()=>{
  const ping=pageMethod('measureLocalToTransit','closeAllMultiOpen',{
    N:{sendAction:async(action,args)=>{
      assert.equal(action,'Ping');
      assert.deepEqual(JSON.parse(JSON.stringify(args)),{currentTransferProxies:[{candidateIndex:1}],snapshotId});
      return {parsedMessage:{returnObj:[{latency:7}]}};
    }},S:{event_type:{ping:'Ping'}},console:{info(){}},
  });
  assert.equal(await ping.call({isClientPingMethodSupported:true,initJson:{desktopProtocol:'super-power-browser-desktop/1'},spProxySnapshotId:snapshotId,
    extractPingLatency:pageMethod('extractPingLatency','measureLocalToTransit')},{candidateIndex:1}),7);
});

test('total line latency uses only the authorized snapshot and candidate and rejects missing measurements',async()=>{
  const calls=[];
  const delay=await requestTransferSpeed(1,snapshotId,message=>measureAuthorizedTransfer({...message,target_url:'https://untrusted.test/',password:'ignored'},sender,context({
    rpc:async(action,args)=>{calls.push({action,args});return {ret:200,returnObj:{available:true,delay:37.6,candidateIndex:1,snapshotId}};},
  })));
  assert.equal(delay,38);
  assert.deepEqual(calls,[{action:'TransferSpeed',args:{candidateIndex:1,snapshotId}}]);
  for(const reply of [{available:true,delay:null,candidateIndex:1,snapshotId},{available:true,delay:1,candidateIndex:0,snapshotId},{available:true,delay:1,candidateIndex:1,snapshotId:'b'.repeat(64)},{available:false}]) {
    await assert.rejects(requestTransferSpeed(1,snapshotId,async()=>reply),/transfer_speed_unavailable/);
  }
  await assert.rejects(measureAuthorizedTransfer({candidateIndex:1,snapshotId},{id:sender.id,url:'https://untrusted.test/'},context({rpc:()=>assert.fail('unauthorized RPC')})),/未授权/);
  const measure=pageMethod('measureTransferLineTotalLatency','toTransitLatencyErrorMessage',{requestTransferSpeed:async(index,snapshot)=>{assert.equal(index,1);assert.equal(snapshot,snapshotId);return 38;}});
  assert.equal(await measure.call({initJson:{desktopProtocol:'super-power-browser-desktop/1'},spProxySnapshotId:snapshotId},{candidateIndex:1},'https://ignored.test/'),38);
});
