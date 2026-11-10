const WebSocket=require('ws');
const {check,cancelled,pause}=require('../runtime/Cancellation');

function command(url,method,params={},signal,timeoutMs=10000){
  check(signal);
  return new Promise((resolve,reject)=>{
    const socket=new WebSocket(url);let done=false;
    const abort=()=>{socket.terminate();finish(signal.reason||cancelled());};
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);socket.close();error?reject(error):resolve(value);};
    const timer=setTimeout(()=>{socket.terminate();const error=new Error('插件初始化响应超时');error.code='SPB_PLUGIN_CDP_TIMEOUT';finish(error);},timeoutMs);
    socket.on('open',()=>socket.send(JSON.stringify({id:1,method,params})));
    socket.on('message',raw=>{const reply=JSON.parse(raw);if(reply.id===1)finish(reply.error?new Error(reply.error.message):null,reply.result);});
    socket.on('error',error=>finish(error));
    socket.on('close',()=>finish(new Error('插件初始化连接已关闭')));
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
}

// A hidden target is not a browser tab and belongs to its creating CDP session.
// Keep that session alive only during an upgrade; closing it releases the target
// even if activation is cancelled. Never borrow or close one of the user's tabs.
async function hiddenControl(run,signal){
  check(signal);
  const socket=new WebSocket(run.debuggerUrl),pending=new Map();let sequence=0;
  const closed=new Promise(resolve=>socket.once('close',resolve));
  const fail=error=>{for(const item of pending.values()){clearTimeout(item.timer);item.reject(error);}pending.clear();};
  const close=()=>{signal?.removeEventListener('abort',abort);socket.terminate();return closed;};
  const abort=()=>{fail(signal.reason||cancelled());void close();};
  socket.on('error',fail);
  socket.on('close',()=>fail(new Error('后台插件升级连接已关闭')));
  socket.on('message',raw=>{
    const reply=JSON.parse(raw),item=pending.get(reply.id);if(!item)return;
    pending.delete(reply.id);clearTimeout(item.timer);
    reply.error?item.reject(new Error(reply.error.message)):item.resolve(reply.result);
  });
  const call=(method,params={},sessionId)=>new Promise((resolve,reject)=>{
    if(socket.readyState!==WebSocket.OPEN){reject(new Error('后台插件升级连接已关闭'));return;}
    const id=++sequence,timer=setTimeout(()=>{pending.delete(id);reject(new Error('后台插件升级响应超时'));},10000);
    pending.set(id,{resolve,reject,timer});socket.send(JSON.stringify({id,method,params,...(sessionId?{sessionId}:{})}));
  });
  try{
    await new Promise((resolve,reject)=>{
      const finish=error=>{clearTimeout(timer);socket.removeListener('open',ready);socket.removeListener('error',failed);socket.removeListener('close',ended);error?reject(error):resolve();};
      const ready=()=>finish(),failed=error=>finish(error),ended=()=>finish(new Error('后台插件升级连接已关闭'));
      const timer=setTimeout(()=>finish(new Error('后台插件升级初始化超时')),5000);
      socket.once('open',ready);socket.once('error',failed);socket.once('close',ended);
      signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
    });
    check(signal);
    const {targetId}=await call('Target.createTarget',{url:'chrome://extensions/',background:true,hidden:true});
    const {sessionId}=await call('Target.attachToTarget',{targetId,flatten:true});
    await call('Runtime.runIfWaitingForDebugger',{},sessionId);
    return {targetId,close,evaluate:params=>call('Runtime.evaluate',params,sessionId)};
  }catch(error){await close();throw error;}
}

async function targets(run,signal){
  const timeout=AbortSignal.timeout(1000);
  const response=await fetch(`http://127.0.0.1:${run.port}/json/list`,{signal:signal?AbortSignal.any([signal,timeout]):timeout});
  if(!response.ok)throw new Error('无法读取店铺插件运行状态');
  return response.json();
}
async function workerTarget(run,plugin,signal){
  const url=`chrome-extension://${plugin.id}/${plugin.worker}`;
  return (await targets(run,signal)).find(item=>item.type==='service_worker'&&item.url===url&&item.webSocketDebuggerUrl);
}
async function workerBuild(run,plugin,signal){
  const worker=await workerTarget(run,plugin,signal);
  if(!worker)return undefined;
  try{
    const state=await command(worker.webSocketDebuggerUrl,'Runtime.evaluate',{returnByValue:true,expression:'globalThis.__SP_PLUGIN_BUILD_ID__'},signal,1000);
    return state.exceptionDetails?undefined:(state.result?.value||'');
  }catch(error){
    check(signal);
    // A reload can remove the old target before its WebSocket is connected.
    if(error.code==='SPB_PLUGIN_CDP_TIMEOUT'||/context|target|closed|404|ECONNRESET/i.test(error.message))return undefined;
    throw error;
  }
}
async function waitForBuild(run,plugin,signal,timeout){
  const deadline=Date.now()+timeout;
  do{
    check(signal);
    if(await workerBuild(run,plugin,signal)===plugin.buildId)return true;
    await pause(100,signal);
  }while(Date.now()<deadline);
  return false;
}

// Chromium can keep an unpacked extension's cached worker after its files have
// been replaced. Verify executed code, then reload only mismatched built-ins.
// This preserves extension storage, Cookies and protected profile preferences.
async function activatePlugins(run,builds,signal,{onReload=()=>{}}={}){
  if(!Array.isArray(builds)||!builds.length||!builds.every(plugin=>/^[a-p]{32}$/.test(plugin.id)&&/^[a-f0-9]{64}$/.test(plugin.buildId)&&/^[\w./-]+\.m?js$/.test(plugin.worker)&&!plugin.worker.split('/').includes('..')))throw new Error('插件构建标识不合法');
  const matched=await Promise.all(builds.map(plugin=>waitForBuild(run,plugin,signal,1000)));
  if(matched.every(Boolean))return builds.map(plugin=>({id:plugin.id,buildId:plugin.buildId,reloaded:false}));
  const control=await hiddenControl(run,signal),verified=[];
  try{
    let ready=false;
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      check(signal);
      try{
        const state=await control.evaluate({returnByValue:true,expression:"location.origin==='chrome://extensions'&&document.readyState==='complete'&&!!globalThis.chrome?.developerPrivate"});
        if(state.result?.value===true){ready=true;break;}
      }catch(error){check(signal);if(!/context|target|closed/i.test(error.message))throw error;}
      await pause(100,signal);
    }
    if(!ready)throw new Error('后台插件升级接口未就绪');
    const result=await control.evaluate({awaitPromise:true,returnByValue:true,expression:`(async()=>{
      const call=(method,...args)=>new Promise((resolve,reject)=>chrome.developerPrivate[method](...args,value=>{const error=chrome.runtime.lastError;error?reject(new Error(error.message)):resolve(value);}));
      const profile=await call('getProfileConfiguration');
      if(!profile.inDeveloperMode)await call('updateProfileConfiguration',{inDeveloperMode:true});
      const ids=${JSON.stringify(builds.map(plugin=>plugin.id))},deadline=Date.now()+5000;
      while(Date.now()<deadline){
        const extensions=await call('getExtensionsInfo',{includeDisabled:true,includeTerminated:true});
        if(ids.every(id=>extensions.some(extension=>extension.id===id&&extension.state==='ENABLED')))return true;
        await new Promise(resolve=>setTimeout(resolve,100));
      }
      throw new Error('内置插件未启用，请检查插件安装状态');
    })()`});
    if(result.exceptionDetails||result.result?.value!==true)throw new Error('内置插件未启用，请检查插件安装状态');
    for(const plugin of builds){
      let reloaded=false;
      if(!await waitForBuild(run,plugin,signal,1000)){
        await onReload(plugin);
        check(signal);
        const reload=await control.evaluate({awaitPromise:true,returnByValue:true,expression:`new Promise((resolve,reject)=>chrome.developerPrivate.reload(${JSON.stringify(plugin.id)},{failQuietly:true},()=>{const error=chrome.runtime.lastError;error?reject(new Error(error.message)):resolve(true);} ))`});
        if(reload.exceptionDetails||reload.result?.value!==true)throw new Error('内置插件升级失败，请关闭店铺后重试');
        reloaded=true;
        if(!await waitForBuild(run,plugin,signal,10000))throw new Error('内置插件版本未生效，请关闭店铺后重试');
      }
      verified.push({id:plugin.id,buildId:plugin.buildId,reloaded});
    }
    return verified;
  }finally{
    await control.close();
  }
}
module.exports={activatePlugins};
