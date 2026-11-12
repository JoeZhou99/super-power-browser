const fs=require('node:fs/promises');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {ProxyRuntime,upstream,proxyError}=require('../services/ProxyRuntime');
const {ProxyRoutes,proxySnapshotId}=require('../services/ProxyRoutes');
const {ProxyRouteCache}=require('../services/ProxyRouteCache');
const {RelayController}=require('../services/RelayController');
const {BrowserProxyGate}=require('../services/BrowserProxyGate');
const {safeProxyMessage}=require('../services/ProxyConfig');
const {loadOperations,effectiveRouting}=require('../services/OperationsConfig');
const WebSocket=require('ws');
const {preparePlugins,clearBootstrap}=require('../pluginManage/PluginService');
const {DesktopBridge}=require('../pluginManage/DesktopBridge');
const {prepareLaunch,compileFingerprint}=require('../runtime/IndependentKernel');
const {followsProxy,localeProbe,resolveProxyLocale}=require('../runtime/ProxyLocale');
const {ProxyLocaleCache}=require('../runtime/ProxyLocaleCache');
const {localGeo,collectGeo,createExitValidation}=require('../pluginManage/NetworkInfo');
const {NativeWindow}=require('./NativeWindow');
const {StartupWindow}=require('./StartupWindow');
const {activatePlugins}=require('../pluginManage/PluginActivation');
const {KernelManager}=require('../runtime/KernelManager');
const {cancelled,check,waitFor,pause}=require('../runtime/Cancellation');

async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
async function cdp(url,method){return new Promise((resolve,reject)=>{const socket=new WebSocket(url);const timer=setTimeout(()=>{socket.terminate();reject(new Error('浏览器响应超时'));},8000);const finish=(error,value)=>{clearTimeout(timer);socket.close();error?reject(error):resolve(value);};socket.on('open',()=>socket.send(JSON.stringify({id:1,method})));socket.on('message',raw=>{const reply=JSON.parse(raw);if(reply.id===1)finish(reply.error?new Error(reply.error.message):null,reply.result);});socket.on('error',error=>finish(error));socket.on('close',()=>{if(method==='Browser.close')finish(null,{});});});}
function relayDiagnostics(run){
  if(!run.relay)return;
  // Only measurements and already-sanitized failures are persisted. Runtime
  // configurations, candidate credentials and exit response bodies stay out.
  return {...run.relay.state(),
    startupChecks:(run.relay.startupChecks||[]).slice(-8).map(({candidateIndex,stage,durationMs,result,message})=>({candidateIndex,stage,durationMs,result,message})),
    health:[...(run.routes?.health||[])].slice(0,9).map(([candidateIndex,{available,delay,entryLatencyMs,entryMeasuredAt,pathLatencyMs,pathMeasuredAt,siteLatencyMs,siteMeasuredAt,exitLatencyMs,exitCheckedAt,sampledAt,stage,failure}])=>({candidateIndex,available,delay,entryLatencyMs,entryMeasuredAt,pathLatencyMs,pathMeasuredAt,siteLatencyMs,siteMeasuredAt,exitLatencyMs,exitCheckedAt,sampledAt,stage,failure})),
  };
}
class BrowserHost {
  constructor(config,api,{onApplicationAction,onActionError=()=>{},operations=loadOperations}={}){this.operations=operations;this.config=config;this.api=api;this.onApplicationAction=onApplicationAction;this.onActionError=onActionError;this.windows=new NativeWindow();this.running=new Map();this.pending=new Map();this.starting=new Map();this.preparing=new Map();this.journal=path.join(config.dataPath,'running-independent.json');this.kernels=new KernelManager(config,api,{inUse:version=>[...this.running.values()].some(run=>run.kernelVersion===version)});}
  states(){return {...Object.fromEntries([...this.preparing.keys()].map(id=>[id,'starting'])),...Object.fromEntries([...this.running].map(([id,run])=>[id,run.status]))};}
  progress(){return Object.fromEntries(this.preparing);}
  async writeJournal(){await fs.mkdir(this.config.dataPath,{recursive:true});await fs.writeFile(this.journal,JSON.stringify([...this.running].filter(([,r])=>r.debuggerUrl).map(([id,r])=>({id,debuggerUrl:r.debuggerUrl,port:r.port}))),{mode:0o600});}
  async recover(){
    let previous=[];try{previous=JSON.parse(await fs.readFile(this.journal,'utf8'));}catch(e){if(e.code!=='ENOENT')throw e;}
    // 仅关闭本应用上次记录且调试实例标识仍一致的遗留进程；保留店铺目录。
    for(const run of previous){try{const info=await (await fetch(`http://127.0.0.1:${run.port}/json/version`,{signal:AbortSignal.timeout(1000)})).json();if(info.webSocketDebuggerUrl===run.debuggerUrl)await cdp(run.debuggerUrl,'Browser.close');}catch{}}
    await this.writeJournal();
  }
  async open(id){
    if(this.closingAll)throw new Error('正在关闭店铺，请稍后再打开');
    if(!/^[\da-f-]{36}$/i.test(id))throw new Error('店铺编号不合法');
    if(this.pending.has(id))return this.pending.get(id);
    if(this.running.has(id)){
      const run=this.running.get(id);
      if(run.cleaning){await run.cleaning;return this.open(id);}
      if(run.status==='closing')throw new Error('浏览器正在关闭，请稍后重新打开');
      await this.reveal(run);return {status:run.status};
    }
    const controller=new AbortController();this.starting.set(id,controller);
    const operation=this.start(id,controller.signal).catch(error=>{if(controller.signal.aborted)return {status:'cancelled'};throw error;}).finally(()=>{this.pending.delete(id);this.starting.delete(id);this.preparing.delete(id);});this.pending.set(id,operation);return operation;
  }
  async reveal(run,signal){
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      check(signal);
      if(run.child?.exitCode!==null&&run.child?.exitCode!==undefined)throw new Error('浏览器进程已退出');
      if(await this.windows.reveal(run.child?.pid,run.iconPath)){run.windowVisible=true;return;}
      await pause(100,signal);
    }
    throw new Error('浏览器已启动，但主窗口未能显示，请重新打开');
  }
  async start(id,signal){
    const started=performance.now(),startupTimings={},mark=name=>{startupTimings[name]=Math.round(performance.now()-started);};
    let local={available:false};
    // Local geolocation is display information and must not delay the shop window.
    const environment=await this.api.request(`/environments/${id}/launch-config`,{signal});check(signal);
    const exitValidation=createExitValidation(environment.proxy);
    const operations=await this.operations({url:this.config.operationsUrl,token:this.api.token,signal});check(signal);
    effectiveRouting(environment.proxy,operations);
    const networkChecks=operations?.networkChecks.enabled?operations.networkChecks:undefined;
    const localReady=localGeo({providers:networkChecks?.localProviders}).then(value=>(local=value),()=>local);
    mark('configuration');
    const profile=path.join(this.config.profiles,id,process.platform==='win32'?environment.kernelVersion:`${process.platform}-${process.arch}-${environment.kernelVersion}`);
    const kernel=await this.kernels.ensure(environment.kernelVersion,state=>this.preparing.set(id,state),{signal});check(signal);
    mark('kernel');
    const executable=kernel.executable;
    this.preparing.set(id,{version:kernel.version,stage:'starting',percent:null,message:'正在准备店铺环境'});
    compileFingerprint(environment,kernel,{deferProxyLocale:true});
    await fs.mkdir(profile,{recursive:true});await fs.mkdir(this.config.downloads,{recursive:true});
    const iconPath=path.join(profile,'superpower.ico');
    if(process.platform==='win32')await fs.copyFile(path.join(this.config.resources,'branding/app.ico'),iconPath);
    check(signal);
    const proxy=new ProxyRuntime(environment.proxy,{signal,resources:this.config.resources,isolated:true});
    const automatic=followsProxy(environment.fingerprint),localeRequired=automatic.language||automatic.timezone;
    const localeCache=new ProxyLocaleCache(profile,environment);
    const run={status:'starting',startupTimings,pluginGeneration:0,routeRevision:0,networkAttempt:0,localeVerified:!localeRequired,networkController:new AbortController(),notifications:environment.fingerprint.notifications!==false,kernelVersion:kernel.version,proxy,profile,iconPath,child:null,port:await freePort(),debuggerUrl:null};
    const proxyProbeBudget=(startup=Boolean(run.networkStarting))=>{
      if(!environment.proxy.relayPool)return {};
      // Startup can accommodate a slow relay handshake; later checks must fit
      // inside the 15-second network-info RPC. The relay startup round is capped separately.
      const timeout=startup?20000:14000;
      return {timeout,requestTimeout:timeout,providerConcurrency:2};
    };
    this.running.set(id,run);
    proxy.on('failure',error=>{run.proxyFailure=error.message;void this.close(id).catch(this.onActionError);});
    try{
      check(signal);
      const extensionRequest=async(route,body)=>{
        const timeout=AbortSignal.timeout(10000);
        const response=await fetch(new URL('/extension'+route,this.config.apiUrl),{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${run.session.token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:signal?AbortSignal.any([signal,timeout]):timeout,redirect:'error'});
        const result=await response.json();if(!response.ok||result.errorCode)throw new Error(result.message||'插件后台请求失败');return result;
      };
      const probeSignal=signal?AbortSignal.any([signal,run.networkController.signal]):run.networkController.signal;
      run.gate=new BrowserProxyGate(proxy,{signal:probeSignal});
      const blockTraffic=()=>{run.gate?.block();run.resourceGate?.block();run.trafficAllowed=false;};
      const allowTraffic=()=>{check(probeSignal);if(run.configurationInvalid)throw proxyError(run.configurationInvalid);run.gate.allow();run.resourceGate?.allow();run.trafficAllowed=true;};
      const beginAttempt=(phase,{requiresAcknowledgement=true}={})=>{
        blockTraffic();run.checkedAttempt=null;run.checkedGeneration=null;run.networkChecked=false;
        run.networkAcknowledgementRequired=requiresAcknowledgement;
        run.networkState={pending:true,allowed:false,phase,message:phase==='switching'?'正在切换线路并验证出口':'正在连接代理并验证出口',attemptId:++run.networkAttempt,startedAt:Date.now()};
        run.startupWindow?.update({message:run.networkState.message,retry:false});
        return run.networkAttempt;
      };
      const networkSnapshot=()=>{
        const state=run.networkState;
        if(state?.pending)return {pending:true,allowed:false,phase:state.phase,message:state.message,attemptId:state.attemptId,elapsedMs:Math.max(0,Date.now()-state.startedAt)};
        return {...state,local};
      };
      const publishNetwork=(exit,attemptId,{message,allowAutomatic=false}={})=>{
        if(attemptId!==run.networkAttempt||probeSignal.aborted)return;
        const verdict=run.configurationInvalid?{allowed:false,message:run.configurationInvalid}:message?{allowed:false,message}:exitValidation.validate(exit);
        run.networkState={pending:false,...verdict,exit,local,attemptId,routeRevision:run.routeRevision};
        run.networkChecked=verdict.allowed;mark('network');
        if(!verdict.allowed)blockTraffic();
        else if(allowAutomatic&&run.accessAuthorized&&run.localeVerified&&!run.networkAcknowledgementRequired)allowTraffic();
        run.startupWindow?.update({message:verdict.allowed?'代理检测通过，正在启动店铺':verdict.message,retry:!verdict.allowed});
      };
      const routeCache=new ProxyRouteCache(this.config.dataPath);
      const routes=new ProxyRoutes(environment.proxy,proxy,{target:environment.startUrl,resources:this.config.resources,signal:probeSignal,cache:routeCache,reuse:true,
        probe:async(candidate,candidateSignal)=>{
          // One identical lightweight HTTPS endpoint for every candidate. Its
          // response proves the real exit and gives complete-path elapsed time.
          // No locale lookup or merchant HEAD is a prerequisite for list speed.
          const exit=await collectGeo({proxyUrl:candidate.url,providers:['https://api.ipify.org?format=json'],timeout:12000,requestTimeout:12000,
            expectedIp:exitValidation.expectedIp,firstValid:true,signal:candidateSignal});
          const verdict=exitValidation.validate(exit);if(!verdict.allowed)throw proxyError(verdict.message);return exit;
        },
        validate:async(candidate,candidateSignal)=>{
          if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
          const revision=run.routeRevision,attemptId=run.networkAttempt;
          try{
          const exit=candidate===proxy?await probeNetwork(candidateSignal):await collectGeo({proxyUrl:candidate.url,providers:networkChecks?.proxyProviders,...proxyProbeBudget(),expectedIp:exitValidation.expectedIp,firstValid:true,signal:candidateSignal});
          const verdict=exitValidation.validate(exit);
          if(!verdict.allowed)throw proxyError(verdict.message);
          if(candidate===proxy&&!run.localeVerified){
            try{resolveProxyLocale(environment.fingerprint,exit);}
            catch(error){throw proxyError(error.message);}
          }
          if(candidate===proxy&&!run.networkInitialization&&revision===run.routeRevision&&!run.trafficAllowed)publishNetwork(exit,attemptId,{allowAutomatic:!run.manualSelection});
          return exit;
          }catch(error){
            if(candidate===proxy&&!run.networkInitialization&&revision===run.routeRevision&&!candidateSignal?.aborted){
              // The controller counts this failure after ready() rejects. Block
              // at the same threshold even when this pool has no fallback.
              if(run.relay&&run.relay.failures+1>=run.relay.threshold)blockTraffic();
              if(!run.trafficAllowed)publishNetwork({available:false},attemptId,{message:safeProxyMessage(error)});
            }
            throw error;
          }
        }});
      run.routes=routes;
      routes.networkStatus=()=>({networkAttempt:run.networkAttempt,networkPending:run.networkState?.pending===true,needsAcknowledgement:run.networkAcknowledgementRequired===true});
      run.routeCacheReady=routes.restoreCache();
      if(environment.proxy.proxyOptions?.resourceProxy){
        run.resourceProxy=new ProxyRuntime(environment.proxy.proxyOptions.resourceProxy,{resources:this.config.resources,signal:probeSignal});
        run.resourceGate=new BrowserProxyGate(run.resourceProxy,{signal:probeSignal});
        run.resourceProxy.on('failure',error=>{run.proxyFailure=error.message;void this.close(id).catch(this.onActionError);});
      }
      const probeNetwork=async(candidateSignal=probeSignal)=>{
        const startupLocale=!run.localeVerified;
        // Locale is fixed before launch. Later health checks need only prove
        // the bound exit, so a geolocation outage cannot trigger relay changes.
        const operation=collectGeo({proxyUrl:proxy.url,providers:networkChecks?.proxyProviders,...(startupLocale?localeProbe(environment.fingerprint,networkChecks?.proxyProviders):{}),...proxyProbeBudget(),expectedIp:exitValidation.expectedIp,firstValid:true,signal:candidateSignal});
        run.networkProbe=operation;
        let exit;try{exit=await operation;}finally{if(run.networkProbe===operation)run.networkProbe=null;}
        const verdict=exitValidation.validate(exit);
        run.networkChecks=[...(run.networkChecks||[]),{at:new Date().toISOString(),available:exit.available,allowed:verdict.allowed,code:verdict.code,message:verdict.message,durationMs:exit.durationMs,providers:exit.diagnostics}].slice(-8);
        if(run.accessAuthorized&&verdict.code==='PROXY_EXIT_MISMATCH'){
          blockTraffic();
          run.proxyFailure=verdict.message;
          void proxy.close().catch(this.onActionError);
          run.networkController.abort(proxyError(verdict.message));
          // A live exit mismatch must stop the shop. Do not await close from a
          // relay check: cleanup itself awaits that controller's current work.
          void this.close(id).catch(this.onActionError);
        }
        return exit;
      };
      const switchRoute=async(candidateIndex,{signal:switchSignal}={})=>{
        if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
        if(run.routeSwitch)throw proxyError('正在切换线路，请稍后重试');
        const operationSignal=switchSignal?AbortSignal.any([switchSignal,probeSignal]):probeSignal;
        check(operationSignal);
        const operation=(async()=>{
          if(run.networkProbe)await waitFor(run.networkProbe.catch(()=>{}),operationSignal);
          check(operationSignal);
          const previous={state:run.networkState,checkedAttempt:run.checkedAttempt,checkedGeneration:run.checkedGeneration,allowed:run.trafficAllowed,requiresAcknowledgement:run.networkAcknowledgementRequired};
          if(run.networkInitialization){blockTraffic();run.networkState.phase='switching';run.networkState.message='正在切换线路并验证出口';}
          else beginAttempt('switching',{requiresAcknowledgement:Boolean(run.manualSelection||!run.accessAuthorized||run.networkAcknowledgementRequired)});
          let committed=false;
          try{
          await proxy.switchCandidate(candidateIndex,{signal:operationSignal,validate:async(connection,sessionSignal)=>{
            const candidateSignal=AbortSignal.any([sessionSignal,operationSignal]);
            const candidate=new ProxyRuntime(connection,{resources:this.config.resources,signal:candidateSignal});
            try{
              await candidate.listen();
              check(candidateSignal);
              const exit=await collectGeo({proxyUrl:candidate.url,providers:networkChecks?.proxyProviders,...proxyProbeBudget(),expectedIp:exitValidation.expectedIp,firstValid:true,signal:candidateSignal});
              const verdict=exitValidation.validate(exit);
              if(!verdict.allowed)throw proxyError(verdict.message);
            }finally{await candidate.close();}
          }});
          committed=true;run.routeRevision++;
          // An old in-flight check must not become the result of the new route.
          run.networkProbe=null;run.networkChecked=false;
          check(operationSignal);
          return {isSuccess:true,candidateIndex:proxy.candidateIndex,snapshotId:routes.snapshotId,proxyAddress:[
            {protocol:'http',ip:'127.0.0.1',port:run.gate.port}
          ]};
          }catch(error){
            // Rejecting an isolated candidate leaves the existing verified route usable.
            if(!committed&&!run.networkInitialization&&run.manualSelection&&previous.allowed&&!probeSignal.aborted){
              run.networkState={...previous.state,attemptId:run.networkAttempt};run.checkedAttempt=run.networkAttempt;run.checkedGeneration=previous.checkedGeneration;run.networkAcknowledgementRequired=previous.requiresAcknowledgement;allowTraffic();
            }else if(!run.networkInitialization)publishNetwork({available:false},run.networkAttempt,{message:safeProxyMessage(error)});
            throw error;
          }
        })().finally(()=>{if(run.routeSwitch===operation)run.routeSwitch=null;});
        run.routeSwitch=operation;return operation;
      };
      if(environment.proxy.relayPool){
        run.relay=new RelayController(routes,switchRoute,{policy:environment.proxy.relayPool,signal:probeSignal});
      }
      let saved;
      const beginNetworkCheck=({initialize=run.relay?.automatic!==false}={})=>{
        if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
        if(run.networkInitialization||run.routeSwitch||run.relay?.busy||routes.measuring)return run.networkInitialization;
        const attemptId=beginAttempt(initialize?'initializing':'checking');
        run.networkStarting=initialize&&!run.accessAuthorized;
        const operation=Promise.resolve().then(async()=>{
          check(probeSignal);
          await run.routeCacheReady;
          if(initialize&&!run.relay&&saved?.snapshotId===routes.snapshotId&&Number.isInteger(saved.preferredCandidateIndex)&&saved.preferredCandidateIndex>0){
            try{await switchRoute(saved.preferredCandidateIndex);}
            catch(error){check(probeSignal);run.routeRestoreFailure=safeProxyMessage(error);}
          }
          let ready;
          if(initialize&&run.relay){try{ready=await run.relay.initialize();}finally{mark('relay');}}
          else ready=await routes.ready({signal:probeSignal});
          check(probeSignal);
          const exit=ready.network,verdict=exitValidation.validate(exit);
          if(!verdict.allowed)throw proxyError(verdict.message);
          if(!run.localeVerified){
            let locale;try{locale=resolveProxyLocale(environment.fingerprint,exit);}catch(error){throw proxyError(error.message);}
            // Cache is only a launch hint. Real exit and locale are verified on
            // every open before any merchant traffic is admitted.
            await localeCache.save(exit).catch(()=>{});
            if(environment.runtimeLocale&&!localeCache.matches(environment.runtimeLocale,exit))throw proxyError('代理出口的语言或时区已变化，请关闭店铺后重新打开');
            environment.runtimeLocale=locale;run.localeVerified=true;mark('locale');
          }
          publishNetwork(exit,attemptId);
          routes.currentRevoked=false;
          return networkSnapshot();
        }).catch(error=>{
          if(!probeSignal.aborted)publishNetwork({available:false},attemptId,{message:safeProxyMessage(error)});
          return networkSnapshot();
        }).finally(()=>{if(run.networkInitialization===operation){run.networkInitialization=null;run.networkStarting=false;}});
        run.networkInitialization=operation;
        return operation;
      };
      const primaryIdentity=value=>{
        const {alternatives:unused,transit:unusedTransit,...proxyOptions}=value.proxyOptions||{};
        return JSON.stringify([value.id||value.deviceId||'',proxySnapshotId({...value,proxyOptions,relayPool:undefined}),value.mapIp||'',value.webType]);
      };
      const refreshRoutes=()=>{
        if(run.routeRefresh)return run.routeRefresh;
        if(run.configurationInvalid)return Promise.resolve(routes.state());
        if(run.networkInitialization||run.relay?.busy||run.routeSwitch||routes.measuring||routes.optimizing)return Promise.resolve(routes.state());
        routes.refreshing=true;
        let deferredRefresh=false;
        const operation=(async()=>{
          const update=await this.api.request(`/environments/${id}/connection`,{signal:AbortSignal.any([probeSignal,AbortSignal.timeout(10000)])});
          check(probeSignal);
          if(!update?.proxy)throw proxyError('后台没有返回可用的代理线路');
          routes.authorizationCheckedAt=new Date().toISOString();
          if(primaryIdentity(update.proxy)!==primaryIdentity(environment.proxy)){
            blockTraffic();run.configurationInvalid='绑定代理的连接信息已改变，请关闭店铺后重新打开';
            routes.currentRevoked=true;routes.refreshMessage=run.configurationInvalid;
            publishNetwork({available:false},run.networkAttempt,{message:run.configurationInvalid});return routes.state();
          }
          if(proxySnapshotId(update.proxy)===routes.snapshotId){routes.relayPool=update.proxy.relayPool;environment.proxy.relayPool=update.proxy.relayPool;routes.refreshMessage='';return routes.state();}
          // A probe/selection may have started while the HTTP request was in
          // flight. Defer replacement instead of invalidating its indices.
          if(run.networkInitialization||run.relay?.busy||run.routeSwitch||routes.measuring||routes.optimizing){deferredRefresh=true;return routes.state();}
          const current=proxy.candidates[proxy.candidateIndex];
          const candidateConfig=new ProxyRuntime(update.proxy,{resources:this.config.resources,signal:probeSignal,isolated:true});
          let retained;
          try{retained=candidateConfig.candidates.some(candidate=>proxySnapshotId(candidate)===proxySnapshotId(current||{}));}
          finally{await candidateConfig.close();}
          if(!retained)blockTraffic();
          await routes.replace(update.proxy);
          const replacement=proxy.replaceCandidates(update.proxy);
          environment.proxy=update.proxy;
          if(!run.relay&&update.proxy.relayPool){run.relay=new RelayController(routes,switchRoute,{policy:update.proxy.relayPool,signal:probeSignal});if(run.accessAuthorized)run.relay.start();}
          routes.currentRevoked=!replacement.retained;
          routes.refreshMessage=replacement.retained?'后台绑定已更新，当前线路保持连接':'当前线路已被后台移除，正在切换到仍授权的线路';
          run.routeCacheReady=routes.restoreCache();
          if(!replacement.retained){
            // Revoke immediately; never keep a removed node as an invisible
            // fallback. Replacements still pass isolated and live exit checks.
            void beginNetworkCheck({initialize:true});
          }
          return routes.state();
        })().catch(error=>{
          if([401,403,404,409].includes(error.status)){
            blockTraffic();routes.currentRevoked=true;run.configurationInvalid='代理线路授权已失效，请联系管理员并重新打开店铺';
            publishNetwork({available:false},run.networkAttempt,{message:run.configurationInvalid});
          }
          routes.refreshMessage=run.configurationInvalid||'暂时无法刷新后台线路，仍显示上次授权配置';
          return routes.state();
        }).finally(()=>{if(run.routeRefresh===operation)run.routeRefresh=null;routes.refreshing=false;run.authorizationRefreshAt=Date.now()+(deferredRefresh?0:30000);});
        run.routeRefresh=operation;return operation;
      };
      run.refreshRoutes=refreshRoutes;
      run.authorizationRefreshAt=Date.now()+30000;
      const ensureAuthorizationCurrent=async()=>{
        if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
        if(!run.routeRefresh&&Date.now()<run.authorizationRefreshAt)return;
        await refreshRoutes();
        if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
        // An in-flight batch may finish, but another batch cannot repeatedly
        // postpone an overdue authorization refresh.
        if(Date.now()>=run.authorizationRefreshAt)throw proxyError('线路正在检测或切换，请稍后刷新授权后重试');
      };
      // Only the deadline check runs each second. Successful and failed HTTP
      // refresh attempts remain spaced by 30 seconds; busy skips keep the due time.
      run.routeRefreshTimer=setInterval(()=>{if(Date.now()>=run.authorizationRefreshAt)void refreshRoutes();},1000);run.routeRefreshTimer.unref?.();
      if(localeRequired)environment.runtimeLocale=await localeCache.load();
      check(probeSignal);
      if(localeRequired&&!environment.runtimeLocale){
        run.startupWindow=new StartupWindow({onCancel:()=>void this.close(id).catch(this.onActionError),onRetry:()=>{
          if(!run.networkState?.pending&&!run.networkState?.allowed)void beginNetworkCheck();
        }});
        await run.startupWindow.show({title:environment.name||'店铺环境检测',message:'正在检测代理出口并准备语言和时区'});check(probeSignal);mark('startupWindow');
      }
      const preparations=await Promise.allSettled([
        (async()=>{await proxy.listen();check(probeSignal);await run.gate.listen();})(),
        (async()=>{run.session=await this.api.request('/environments/'+id+'/extension-sessions',{method:'POST',body:{},signal});check(signal);return extensionRequest('/bootstrap');})(),
        run.resourceProxy?(async()=>{await run.resourceProxy.listen();await run.resourceGate.listen();})():undefined
      ]);
      check(signal);const failed=preparations.find(result=>result.status==='rejected');if(failed)throw failed.reason;
      saved=preparations[1].value;mark('services');
      // Read authenticated entrances before background recovery can restart
      // their runtimes. The gate port and runtime credentials remain stable.
      const browserProxyUrl=run.gate.url,resourceProxyUrl=run.resourceGate?.url;
      void beginNetworkCheck();
      // A cold automatic-locale environment has a visible local check window.
      // Never launch its real profile with guessed language/timezone values.
      while(localeRequired&&!environment.runtimeLocale){
        check(probeSignal);
        if(run.networkInitialization)await waitFor(run.networkInitialization,probeSignal);
        else await pause(100,probeSignal);
      }
      environment.preferredCandidateIndex=proxy.candidateIndex;
      run.bridge=new DesktopBridge({id,proxy:environment.proxy,runtime:proxy,routes,onAction:async(action,args)=>{
        if(action==='GetProxyRoutes')return routes.state();
        if(action==='RefreshProxyRoutes')return refreshRoutes();
        if(['TransferSpeed','TestProxyWebsite','MeasureProxyRoutes','OptimizeProxyRoutes','StartProxy','SetProxyAutomatic'].includes(action)||action==='GetNetworkInfo'&&args.retry===true&&!run.networkState?.pending)await ensureAuthorizationCurrent();
        if(action==='TransferSpeed'||action==='TestProxyWebsite'){
          if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
          if(run.networkInitialization||run.relay?.busy||run.routeSwitch||run.routeRefresh||routes.optimizing)throw proxyError('线路正在检测或切换，请稍后重试');
          return routes.latency(args,{site:action==='TestProxyWebsite'});
        }
        if(action==='MeasureProxyRoutes'||action==='OptimizeProxyRoutes'){
          if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
          if(!args||Object.keys(args).some(key=>key!=='snapshotId')||args.snapshotId!==routes.snapshotId)throw proxyError('线路配置已变化，请刷新检测页面');
          if(run.networkInitialization||run.relay?.busy||run.routeSwitch||run.routeRefresh)throw proxyError('线路正在检测或切换，请稍后重试');
          return routes.startBatch({optimize:action==='OptimizeProxyRoutes',onComplete:async index=>{
            if(index===proxy.candidateIndex)return {changed:false,selectedIndex:index,message:'当前线路已较优，保持连接'};
            run.manualSelection=true;
            try{await (run.relay?run.relay.exclusive(()=>switchRoute(index)):switchRoute(index));}
            finally{run.manualSelection=false;}
            const result=await beginNetworkCheck({initialize:false});
            if(!result?.allowed)throw proxyError(result?.message||'切换后的出口检测未通过');
            return {changed:true,selectedIndex:index,message:'已选择更优线路，正在确认检测结果'};
          }});
        }
        if(action==='SetProxyAutomatic'){
          if(routes.optimizing||run.routeRefresh)throw proxyError('线路正在检测或刷新，请稍后重试');
          if(!run.relay||args.snapshotId!==routes.snapshotId||Object.keys(args).some(key=>!['snapshotId','automatic'].includes(key)))throw proxyError('线路配置已变化，请重新打开检测页');
          run.relay.setAutomatic(args.automatic);
          return routes.state();
        }
        if(action==='GetNetworkInfo'){
          run.networkRequested=true;
          if(args.retry===true&&!run.networkState?.pending){
            // Explicit rechecks must never report the previous success while a
            // monitor or speed test prevents starting their new attempt.
            if(run.networkInitialization||run.routeSwitch||run.relay?.busy||routes.measuring||routes.optimizing||run.routeRefresh)throw proxyError('线路正在检测或切换，请稍后重新检测');
            void beginNetworkCheck();
          }
          const result=networkSnapshot();
          if(!result.pending&&result.allowed){run.checkedAttempt=result.attemptId;run.checkedGeneration=run.pluginGeneration;}
          return result;
        }
        if(action==='GetLocalNetworkInfo')return waitFor(localReady,signal);
        if(action==='UpdateMallCookie'||action==='UploadCookies')return (await extensionRequest('/api/v1/bindMall/setCookie',{mallId:id,cookie:args.cookie||''})).data;
        if(action==='CheckCompleted'){
          const attemptId=run.networkAttempt,generation=run.pluginGeneration,revision=run.routeRevision;
          if(args.attemptId!==undefined&&args.attemptId!==attemptId)throw proxyError('检测结果已过期，请重新检测');
          const valid=()=>!run.configurationInvalid&&!run.networkState?.pending&&run.networkState?.allowed&&run.localeVerified&&run.networkState.routeRevision===revision&&run.routeRevision===revision&&run.networkAttempt===attemptId&&run.checkedAttempt===attemptId&&run.checkedGeneration===generation&&run.pluginGeneration===generation;
          if(!valid())throw proxyError('当前线路尚未完成出口检测，请等待检测通过');
          const result=(await extensionRequest('/api/v1/bindMall/setAccessStatus',{mallId:id,status:1})).data;
          check(probeSignal);if(!valid())throw proxyError('线路已变化，请重新检测');
          await routes.saveCache(proxy.candidateIndex);
          check(probeSignal);if(!valid())throw proxyError('线路已变化，请重新检测');
          run.accessAuthorized=true;run.networkAcknowledgementRequired=false;allowTraffic();run.relay?.start();return result;
        }
        if(action==='UploadCache')throw new Error('完整浏览器缓存同步尚未配置；Cookie 已独立同步');
        if(action==='StartProxy'){
          const selection=args.proxyInfo;
          routes.select(selection);
          if(run.configurationInvalid)throw proxyError(run.configurationInvalid);
          if(run.networkInitialization||run.relay?.busy||run.routeSwitch||routes.measuring||routes.optimizing||run.routeRefresh)throw proxyError('线路正在检测或切换，请稍后重试');
          run.manualSelection=true;
          try{
            const result=await (run.relay?run.relay.manual(selection.candidateIndex):switchRoute(selection.candidateIndex));
            void beginNetworkCheck({initialize:false});
            return result;
          }finally{run.manualSelection=false;}
        }
        return this.desktopAction(id,action);
      }});
      const websocketPort=await run.bridge.listen();
      check(signal);
      const plugins=await preparePlugins(this.config.resources,profile,{environment,session:run.session,websocketPort,operations,proxyUrl:browserProxyUrl,resourceProxyUrl,apiUrl:this.config.apiUrl,cookie:saved.cookie,localGeo:local.available?local:null});
      mark('plugins');
      run.bridge.configure(plugins.bundle,Object.values(plugins.pluginIdMap));
      const {args}=await prepareLaunch(environment,{kernel,profile,proxyUrl:run.gate.browserUrl,plugins:plugins.dirs,debugPort:run.port,downloads:this.config.downloads});
      check(signal);
      const child=spawn(executable,args,{cwd:path.dirname(executable),windowsHide:false,stdio:'ignore'});run.child=child;mark('process');
      let exited=false,spawnError;
      child.once('error',error=>{spawnError=error;});child.once('exit',code=>{exited=true;run.exitCode=code;void this.cleanup(id,run).catch(()=>{});});
      const deadline=Date.now()+20000;
      while(Date.now()<deadline){
        check(signal);
        if(spawnError)throw spawnError;if(exited)throw new Error(`内核提前退出（${run.exitCode}），请检查内核完整性和版本兼容性`);
        try{const info=await (await fetch(`http://127.0.0.1:${run.port}/json/version`,{signal:AbortSignal.timeout(800)})).json();run.debuggerUrl=info.webSocketDebuggerUrl;if(run.debuggerUrl)break;}catch{}
        await pause(250,signal);
      }
      if(!run.debuggerUrl)throw new Error('内核启动超时，未获得可验证的运行状态');
      await this.reveal(run,signal);mark('window');
      run.startupWindow?.close();run.startupWindow=null;
      await this.writeJournal();
      run.pluginBuilds=await waitFor(activatePlugins(run,plugins.builds,signal,{onReload:plugin=>{
        if(plugin.id===plugins.pluginIdMap.RXMallHelper){
          blockTraffic();run.accessAuthorized=false;run.pluginGeneration++;run.bridge.invalidateReadiness();run.networkRequested=false;run.checkedAttempt=null;run.checkedGeneration=null;
        }
      }}),signal);check(signal);
      mark('activation');
      const pluginDeadline=Date.now()+60000;
      while(!run.bridge.connected&&!run.networkRequested&&Date.now()<pluginDeadline){check(signal);if(exited)throw new Error(`内核提前退出（${run.exitCode}）`);await pause(250,signal);}
      check(signal);
      if(!run.bridge.connected&&!run.networkRequested)throw new Error('店铺插件未连接桌面，请查看插件启动状态');
      run.status='running';mark('ready');await this.writeJournal();return {status:'running'};
    }catch(error){run.startError=error.message;if(run.child&&!run.child.killed){if(run.debuggerUrl)await cdp(run.debuggerUrl,'Browser.close').catch(()=>{});if(run.child.exitCode===null)run.child.kill();}await this.cleanup(id,run);throw error;}
  }
  async desktopAction(id,action){
    const run=this.running.get(id);if(!run)throw new Error('店铺已关闭');
    if(['FlashWindow','PlayVideoMp3'].includes(action)){
      if(!run.notifications)return {skipped:true,reason:'notifications-disabled'};
      if(action==='FlashWindow')return this.windows.flash(run.child?.pid);
      return this.windows.playNotification(path.join(this.config.resources,'branding/notification.wav'));
    }
    if(!['CloseBrowser','LoginOut','ExitClient','closeAllMultiOpen'].includes(action))throw new Error('不支持的桌面操作：'+action);
    if(action!=='CloseBrowser'&&!this.onApplicationAction)throw new Error('客户端退出处理尚未初始化');
    // Send the acknowledgement before closing the requesting WebSocket.
    setImmediate(()=>Promise.resolve().then(()=>action==='CloseBrowser'?this.close(id):this.onApplicationAction(action)).catch(error=>this.onActionError(error)));
    return {scheduled:true,scope:action==='CloseBrowser'?'shop':'application'};
  }
  async cleanup(id,expected){
    const run=this.running.get(id);if(!run||(expected&&run!==expected))return;if(run.cleaning)return run.cleaning;
    run.cleaning=(async()=>{
      run.gate?.block();run.resourceGate?.block();run.startupWindow?.close();
      run.networkController?.abort(cancelled());
      clearInterval(run.routeRefreshTimer);
      await run.relay?.close();
      await run.routes?.close();
      await run.routeRefresh?.catch(()=>{});
      await run.networkInitialization?.catch(()=>{});
      const state=run.networkState;
      const networkState=state?{pending:state.pending,allowed:state.allowed,phase:state.phase,message:state.message,attemptId:state.attemptId,routeRevision:state.routeRevision}:undefined;
      await fs.writeFile(path.join(run.profile,'runtime-diagnostics.json'),JSON.stringify({startupTimings:run.startupTimings,networkState,relay:relayDiagnostics(run),pluginBuilds:run.pluginBuilds,networkChecks:run.networkChecks,proxyFailure:run.proxyFailure,exitCode:run.exitCode,startError:run.startError,routeRestoreFailure:run.routeRestoreFailure,connected:run.bridge?.connected,ready:run.bridge?.ready,events:run.bridge?.events,at:new Date().toISOString()},null,2)).catch(()=>{});
      await Promise.allSettled([run.gate?.close(),run.resourceGate?.close(),run.proxy.close(true),run.resourceProxy?.close(),run.bridge?.close(),run.session?this.api.request(`/environments/${id}/extension-sessions/${run.session.id}`,{method:'DELETE'}):Promise.resolve()]);
      try{await clearBootstrap(run.profile);}finally{this.running.delete(id);this.windows.release(run.child?.pid);await this.writeJournal();}
    })();return run.cleaning;
  }
  async close(id){
    const closing=this.running.get(id);closing?.gate?.block();closing?.resourceGate?.block();closing?.networkController?.abort(cancelled());
    this.starting.get(id)?.abort(cancelled());
    if(this.pending.has(id))await this.pending.get(id).catch(()=>{});
    const run=this.running.get(id);if(!run)return;
    run.status='closing';
    try{if(run.debuggerUrl)await cdp(run.debuggerUrl,'Browser.close');else run.child?.kill();}
    catch(error){run.status='running';throw error;}
    const deadline=Date.now()+5000;while(run.child?.exitCode===null&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,100));
    if(run.child?.exitCode===null){run.status='running';throw new Error('浏览器未完全关闭，请先在浏览器窗口中退出');}
    await this.cleanup(id,run);
  }
  async closeAll(){
    if(this.closingAll)return this.closingAll;
    this.closingAll=(async()=>{const results=await Promise.allSettled([...new Set([...this.running.keys(),...this.pending.keys()])].map(id=>this.close(id)));await this.kernels.cancelAll();const failed=results.find(r=>r.status==='rejected');if(failed)throw failed.reason;})();
    try{await this.closingAll;}finally{this.closingAll=null;}
  }
  async enforceAccess(){
    for(const [id,run] of this.running){if(run.status!=='running')continue;try{await this.api.request(`/environments/${id}/access`);}catch(error){if([401,403,404,409].includes(error.status))await this.close(id);}}
  }
}
module.exports={BrowserHost,upstream};
