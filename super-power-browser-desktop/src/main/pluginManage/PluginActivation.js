const WebSocket=require('ws');
const {check,cancelled,pause}=require('../runtime/Cancellation');

function command(url,method,params={},signal){
  check(signal);
  return new Promise((resolve,reject)=>{
    const socket=new WebSocket(url);let done=false;
    const abort=()=>{socket.terminate();finish(signal.reason||cancelled());};
    const finish=(error,value)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);socket.close();error?reject(error):resolve(value);};
    const timer=setTimeout(()=>{socket.terminate();finish(new Error('插件初始化响应超时'));},10000);
    socket.on('open',()=>socket.send(JSON.stringify({id:1,method,params})));
    socket.on('message',raw=>{const reply=JSON.parse(raw);if(reply.id===1)finish(reply.error?new Error(reply.error.message):null,reply.result);});
    socket.on('error',error=>finish(error));
    socket.on('close',()=>finish(new Error('插件初始化连接已关闭')));
    signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
}

// First-run Chromium preference protection can reset a prewritten developer_mode.
// Use the browser's own configuration API so it persists a valid protected setting.
// This is scoped to the new shop profile and only verifies our bundled extensions.
async function activatePlugins(run,ids,signal){
  if(!ids.every(id=>/^[a-p]{32}$/.test(id)))throw new Error('插件编号不合法');
  const {targetId}=await command(run.debuggerUrl,'Target.createTarget',{url:'chrome://extensions/',background:true},signal);
  try{
    let target;
    const deadline=Date.now()+5000;
    while(Date.now()<deadline){
      check(signal);const timeout=AbortSignal.timeout(1000);
      const targets=await (await fetch(`http://127.0.0.1:${run.port}/json/list`,{signal:signal?AbortSignal.any([signal,timeout]):timeout})).json();
      target=targets.find(item=>item.id===targetId&&item.webSocketDebuggerUrl);if(target)break;
      await pause(100,signal);
    }
    if(!target)throw new Error('未能初始化店铺插件');
    let pageReady=false;
    while(Date.now()<deadline){
      try{
        const state=await command(target.webSocketDebuggerUrl,'Runtime.evaluate',{returnByValue:true,expression:"location.origin==='chrome://extensions'&&document.readyState==='complete'&&!!globalThis.chrome?.developerPrivate"},signal);
        if(state.result?.value===true){pageReady=true;break;}
      }catch(error){if(!/context|target|closed/i.test(error.message))throw error;}
      await pause(100,signal);
    }
    if(!pageReady)throw new Error('插件配置页面未就绪');
    const result=await command(target.webSocketDebuggerUrl,'Runtime.evaluate',{awaitPromise:true,returnByValue:true,expression:`(async()=>{
      const wait=()=>new Promise(resolve=>setTimeout(resolve,100));
      const deadline=Date.now()+5000;
      while(!globalThis.chrome?.developerPrivate&&Date.now()<deadline)await wait();
      if(!globalThis.chrome?.developerPrivate)throw new Error('插件配置接口不可用');
      const call=(method,...args)=>new Promise((resolve,reject)=>chrome.developerPrivate[method](...args,value=>{const error=chrome.runtime.lastError;error?reject(new Error(error.message)):resolve(value);}));
      const profile=await call('getProfileConfiguration');
      if(!profile.inDeveloperMode)await call('updateProfileConfiguration',{inDeveloperMode:true});
      const ids=${JSON.stringify(ids)};
      while(Date.now()<deadline){
        const extensions=await call('getExtensionsInfo',{includeDisabled:true,includeTerminated:true});
        if(ids.every(id=>extensions.some(e=>e.id===id&&e.state==='ENABLED')))return true;
        await wait();
      }
      throw new Error('内置插件未启用，请检查插件安装状态');
    })()`},signal);
    if(result.exceptionDetails||result.result?.value!==true)throw new Error('店铺插件初始化失败：'+(result.exceptionDetails?.exception?.description||'插件未启用'));
  }finally{if(!signal?.aborted)await command(run.debuggerUrl,'Target.closeTarget',{targetId},signal).catch(()=>{});}
}
module.exports={activatePlugins};
