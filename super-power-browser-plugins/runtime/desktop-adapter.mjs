import {a as encrypt, i as decrypt, f as socketEncrypt} from '../js/common.js';
import {installProxyAuthentication} from './proxy-auth.mjs';
const pending=new Map();
export function installDesktopAdapter(){
  if(globalThis.__SP_BUILD__?.mode!=='superpower')return;
  installProxyAuthentication();
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
    if(['sp:network-info','sp:local-network-info'].includes(message?.type)&&sender.id===chrome.runtime.id&&sender.url?.startsWith(chrome.runtime.getURL(''))){
      globalThis.__SP_EVENT__(message.type==='sp:local-network-info'?'GetLocalNetworkInfo':'GetNetworkInfo').then(result=>reply(result.returnObj),()=>reply({exit:{available:false,message:'暂未获取出口 IP'}}));
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
