import {a as encrypt, i as decrypt, f as socketEncrypt} from '../js/common.js';
import {installProxyAuthentication} from './proxy-auth.mjs';
import {installProxyPac} from './proxy-routing.mjs';
const pending=new Map();
const validAttempt=value=>Number.isSafeInteger(value)&&value>=0||typeof value==='string'&&value.length>0&&value.length<=128;
export function installDesktopAdapter(){
  if(globalThis.__SP_BUILD__?.mode!=='superpower')return;
  installProxyAuthentication();
  let checkGeneration=0,successfulAttempt=null,completion=null;
  globalThis.__SP_NETWORK_VERIFIED__=false;
  globalThis.__SP_BEGIN_NETWORK_CHECK__=async()=>{
    checkGeneration++;successfulAttempt=null;completion=null;globalThis.__SP_NETWORK_VERIFIED__=false;
    await installProxyPac(globalThis.__SP_BOOTSTRAP__,false);
  };
  globalThis.__SP_REPLY__=reply=>{
    const item=pending.get(reply.requestId);if(!item)return;
    pending.delete(reply.requestId);clearTimeout(item.timer);
    if(reply.ret===200)item.resolve(reply);
    else{
      const error=new Error(reply.returnObj?.message||'桌面操作失败'),index=reply.returnObj?.candidateIndex;
      if(reply.action==='StartProxy'&&Number.isInteger(index)&&index>=0&&index<=8)error.candidateIndex=index;
      item.reject(error);
    }
  };
  globalThis.__SP_RPC__=async request=>{
    const deadline=Date.now()+15000;
    while(globalThis.__SP_SOCKET__?.ws?.readyState!==1){
      if(Date.now()>deadline)throw new Error('桌面通信未连接');
      await new Promise(resolve=>setTimeout(resolve,100));
    }
    const bridge=globalThis.__SP_SOCKET__;
    request.browserId=globalThis.__SP_BOOTSTRAP__.browserId;
    request.requestId||=crypto.randomUUID();
    const response=new Promise((resolve,reject)=>{
      // Route selection validates a candidate and restarts a local helper; SSH
      // can legitimately exceed the ordinary short RPC deadline.
      const timeout=['StartProxy','TransferSpeed'].includes(request.action)?75000:15000;
      const timer=setTimeout(()=>{pending.delete(request.requestId);reject(new Error('桌面通信超时'));},timeout);
      pending.set(request.requestId,{resolve,reject,timer});
    });
    bridge.ws.send(btoa(JSON.stringify({iv:bridge.iv,mac:bridge.mac,value:socketEncrypt(JSON.stringify(request),bridge.iv,bridge.wsDecryptKey)})));
    return response;
  };
  globalThis.__SP_EVENT__=(action,args={})=>globalThis.__SP_RPC__({action,args:JSON.stringify(args)});
  chrome.runtime.onMessage.addListener((message,sender,reply)=>{
    if(message?.type==='sp:network-complete'&&sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL(''))){
      if(!validAttempt(successfulAttempt)||message.attemptId!==successfulAttempt){reply({allowed:false,message:'检测状态已变化，请重新检测'});return true;}
      const generation=checkGeneration;
      completion||=(async()=>{
        await globalThis.__SP_EVENT__('CheckCompleted',{attemptId:successfulAttempt});
        if(generation!==checkGeneration)throw new Error('stale_check');
        await installProxyPac(globalThis.__SP_BOOTSTRAP__,true);
        if(generation!==checkGeneration)throw new Error('stale_check');
        globalThis.__SP_NETWORK_VERIFIED__=true;
        await chrome.storage.local.set({spStartup:{state:'ready',message:'店铺服务已连接，环境检测完成',at:new Date().toISOString()}});
        return {allowed:true};
      })();
      completion.then(reply,()=>{completion=null;reply({allowed:false,message:'检测确认失败，请重新检测'});});
      return true;
    }
    if(['sp:network-info','sp:local-network-info'].includes(message?.type)&&sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL(''))){
      (async()=>{
        const local=message.type==='sp:local-network-info';
        if(!local&&message.retry===true)await globalThis.__SP_BEGIN_NETWORK_CHECK__();
        const generation=checkGeneration;
        const result=await globalThis.__SP_EVENT__(local?'GetLocalNetworkInfo':'GetNetworkInfo',!local&&message.retry===true?{retry:true}:{});
        const info=result.returnObj;
        if(!local){
          if(generation!==checkGeneration)throw new Error('stale_check');
          if((info?.pending||info?.allowed!==true)&&globalThis.__SP_NETWORK_VERIFIED__)await globalThis.__SP_BEGIN_NETWORK_CHECK__();
          successfulAttempt=info?.pending!==true&&info?.allowed===true&&validAttempt(info.attemptId)?info.attemptId:null;
        }
        return info;
      })().then(reply,()=>reply({pending:false,allowed:false,exit:{available:false},message:'桌面通信失败，请重新检测'}));
      return true;
    }
    if(message?.type!=='sp:native'||sender.id!==chrome.runtime.id||!sender.url?.startsWith(chrome.runtime.getURL('')))return;
    (async()=>{
      const request=JSON.parse(decrypt(message.data));
      if(!['Ping','WriteLog','closeAllMultiOpen','ExitClient'].includes(request.action))throw new Error('未授权的桌面操作');
      return {data:encrypt(JSON.stringify(await globalThis.__SP_RPC__(request)))};
    })().then(reply,error=>reply({error:error.message}));
    return true;
  });
}
