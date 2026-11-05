const fs=require('node:fs/promises');
const path=require('node:path');
const net=require('node:net');
const {spawn}=require('node:child_process');
const {Server}=require('proxy-chain');
const WebSocket=require('ws');
const {preparePlugins,clearBootstrap}=require('../pluginManage/PluginService');
const {DesktopBridge}=require('../pluginManage/DesktopBridge');
const {prepareLaunch,compileFingerprint}=require('../runtime/IndependentKernel');
const {localGeo,collectGeo,validateExit,expectedExit}=require('../pluginManage/NetworkInfo');
const {NativeWindow}=require('./NativeWindow');
const {activatePlugins}=require('../pluginManage/PluginActivation');
const {KernelManager}=require('../runtime/KernelManager');
const {cancelled,check,waitFor,pause}=require('../runtime/Cancellation');

async function freePort(){const server=net.createServer();await new Promise((resolve,reject)=>server.once('error',reject).listen(0,'127.0.0.1',resolve));const port=server.address().port;await new Promise(resolve=>server.close(resolve));return port;}
function upstream(proxy){const host=proxy.host.includes(':')?`[${proxy.host}]`:proxy.host;const url=new URL(`${proxy.protocol}://${host}:${proxy.port}`);url.username=proxy.username||'';url.password=proxy.password||'';return url.href;}
async function cdp(url,method){return new Promise((resolve,reject)=>{const socket=new WebSocket(url);const timer=setTimeout(()=>{socket.terminate();reject(new Error('浏览器响应超时'));},8000);const finish=(error,value)=>{clearTimeout(timer);socket.close();error?reject(error):resolve(value);};socket.on('open',()=>socket.send(JSON.stringify({id:1,method})));socket.on('message',raw=>{const reply=JSON.parse(raw);if(reply.id===1)finish(reply.error?new Error(reply.error.message):null,reply.result);});socket.on('error',error=>finish(error));socket.on('close',()=>{if(method==='Browser.close')finish(null,{});});});}
class BrowserHost {
  constructor(config,api,{onApplicationAction,onActionError=()=>{}}={}){this.config=config;this.api=api;this.onApplicationAction=onApplicationAction;this.onActionError=onActionError;this.windows=new NativeWindow();this.running=new Map();this.pending=new Map();this.starting=new Map();this.preparing=new Map();this.journal=path.join(config.dataPath,'running-independent.json');this.kernels=new KernelManager(config,api,{inUse:version=>[...this.running.values()].some(run=>run.kernelVersion===version)});}
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
      if(this.windows.reveal(run.child?.pid,run.iconPath)){run.windowVisible=true;return;}
      await pause(100,signal);
    }
    throw new Error('浏览器已启动，但主窗口未能显示，请重新打开');
  }
  async start(id,signal){
    const environment=await this.api.request(`/environments/${id}/launch-config`,{signal});check(signal);
    const profile=path.join(this.config.profiles,id,environment.kernelVersion);
    const kernel=await this.kernels.ensure(environment.kernelVersion,state=>this.preparing.set(id,state),{signal});check(signal);
    const executable=kernel.executable;
    this.preparing.set(id,{version:kernel.version,stage:'starting',percent:null,message:'正在准备店铺环境'});
    compileFingerprint(environment,kernel);
    await fs.mkdir(profile,{recursive:true});await fs.mkdir(this.config.downloads,{recursive:true});
    const iconPath=path.join(profile,'superpower.ico');
    await fs.copyFile(path.join(this.config.resources,'branding/app.ico'),iconPath);
    check(signal);
    const proxy=new Server({port:0,host:'127.0.0.1',prepareRequestFunction:()=>({upstreamProxyUrl:upstream(environment.proxy)})});
    const run={status:'starting',notifications:environment.fingerprint.notifications!==false,kernelVersion:kernel.version,proxy,profile,iconPath,child:null,port:await freePort(),debuggerUrl:null};
    this.running.set(id,run);
    try{
      check(signal);await proxy.listen();check(signal);
      run.session=await this.api.request(`/environments/${id}/extension-sessions`,{method:'POST',body:{},signal});check(signal);
      const extensionRequest=async(route,body)=>{
        const timeout=AbortSignal.timeout(10000);
        const response=await fetch(new URL('/extension'+route,this.config.apiUrl),{method:body===undefined?'GET':'POST',headers:{Authorization:`Bearer ${run.session.token}`,'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body),signal:signal?AbortSignal.any([signal,timeout]):timeout,redirect:'error'});
        const result=await response.json();if(!response.ok||result.errorCode)throw new Error(result.message||'插件后台请求失败');return result;
      };
      const saved=await extensionRequest('/bootstrap');
      const local=await waitFor(localGeo(),signal);check(signal);
      run.bridge=new DesktopBridge({id,proxy:environment.proxy,onAction:async(action,args)=>{
        if(action==='GetNetworkInfo'){
          run.networkProbe??=collectGeo({proxyUrl:`http://127.0.0.1:${proxy.port}`,expectedIp:expectedExit(environment.proxy)}).then(exit=>{run.networkChecked=true;return {local,exit,...validateExit(environment.proxy,exit)};}).finally(()=>{run.networkProbe=null;});
          return run.networkProbe;
        }
        if(action==='UpdateMallCookie'||action==='UploadCookies')return (await extensionRequest('/api/v1/bindMall/setCookie',{mallId:id,cookie:args.cookie||''})).data;
        if(action==='CheckCompleted')return (await extensionRequest('/api/v1/bindMall/setAccessStatus',{mallId:id,status:1})).data;
        if(action==='UploadCache')throw new Error('完整浏览器缓存同步尚未配置；Cookie 已独立同步');
        if(action==='StartProxy')throw new Error('当前设备没有已配置的备用线路');
        return this.desktopAction(id,action);
      }});
      const websocketPort=await run.bridge.listen();
      check(signal);
      const plugins=await preparePlugins(this.config.resources,profile,{environment,session:run.session,websocketPort,proxyUrl:`http://127.0.0.1:${proxy.port}`,apiUrl:this.config.apiUrl,cookie:saved.cookie,localGeo:local.available?local:null});
      run.bridge.configure(plugins.bundle,Object.values(plugins.pluginIdMap));
      const {args}=await prepareLaunch(environment,{kernel,profile,proxyUrl:`http://127.0.0.1:${proxy.port}`,plugins:plugins.dirs,debugPort:run.port,downloads:this.config.downloads});
      check(signal);
      const child=spawn(executable,args,{cwd:path.dirname(executable),windowsHide:false,stdio:'ignore'});run.child=child;
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
      await this.reveal(run,signal);
      await this.writeJournal();
      await waitFor(activatePlugins(run,Object.values(plugins.pluginIdMap),signal),signal);check(signal);
      const pluginDeadline=Date.now()+60000;
      while(!run.bridge.ready&&!run.networkChecked&&Date.now()<pluginDeadline){check(signal);if(exited)throw new Error(`内核提前退出（${run.exitCode}）`);await pause(250,signal);}
      check(signal);
      if(!run.bridge.ready&&!run.networkChecked)throw new Error(run.bridge.connected?'插件未发起环境检测，请查看插件启动状态':'店铺插件未连接桌面，请查看插件启动状态');
      run.status='running';await this.writeJournal();return {status:'running'};
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
      await fs.writeFile(path.join(run.profile,'runtime-diagnostics.json'),JSON.stringify({exitCode:run.exitCode,startError:run.startError,connected:run.bridge?.connected,ready:run.bridge?.ready,events:run.bridge?.events,at:new Date().toISOString()},null,2)).catch(()=>{});
      await Promise.allSettled([run.proxy.close(true),run.bridge?.close(),run.session?this.api.request(`/environments/${id}/extension-sessions/${run.session.id}`,{method:'DELETE'}):Promise.resolve()]);
      try{await clearBootstrap(run.profile);}finally{this.running.delete(id);this.windows.release(run.child?.pid);await this.writeJournal();}
    })();return run.cleaning;
  }
  async close(id){
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
