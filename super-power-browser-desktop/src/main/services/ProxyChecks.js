const http=require('node:http');
const https=require('node:https');
const {ProxyRuntime,proxyError,safeProxyMessage}=require('./ProxyRuntime');
const {collectGeo,validateExit,expectedExit}=require('../pluginManage/NetworkInfo');
const {check,waitFor}=require('../runtime/Cancellation');

function proxyId(value){if(typeof value!=='string'||!/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(value))throw proxyError('代理编号不合法');return value;}
// This is a standalone request from the client machine. It deliberately has no
// platform Authorization/Cookie headers, credential store, or redirect handling.
function requestRotation(value,{timeout=15000,maxBytes=65536,request,signal}={}){
  check(signal);
  let url;try{url=new URL(value);}catch{throw proxyError('换 IP 链接格式不正确');}
  if(!['http:','https:'].includes(url.protocol)||url.username||url.password||!url.hostname||url.href.length>4096)throw proxyError('换 IP 链接必须是有效的 HTTP 或 HTTPS 地址，且不能包含用户认证信息');
  return new Promise((resolve,reject)=>{
    let settled=false,timer,req;
    const abort=()=>{finish(signal.reason);req?.destroy();};
    const finish=error=>{if(settled)return;settled=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);error?reject(error):resolve();};
    try{
      const send=request||(url.protocol==='https:'?https.request:http.request);
      req=send(url,{method:'GET',agent:false,headers:{Accept:'application/json, text/plain;q=0.9, */*;q=0.8','Accept-Encoding':'identity'}},response=>{
        const code=response.statusCode||0;
        if(code<200||code>=300){finish(proxyError(code>=300&&code<400?'换 IP 服务返回了重定向，请填写最终请求地址':`换 IP 服务拒绝请求（HTTP ${code}）`));response.destroy();return;}
        const length=Number(response.headers['content-length']);
        if(Number.isFinite(length)&&length>maxBytes){finish(proxyError('换 IP 服务响应过大，请检查链接'));response.destroy();return;}
        let bytes=0;
        response.on('data',chunk=>{bytes+=Buffer.byteLength(chunk);if(bytes>maxBytes){finish(proxyError('换 IP 服务响应过大，请检查链接'));response.destroy();}});
        response.on('error',()=>finish(proxyError('换 IP 服务响应中断，请稍后重试')));
        response.on('aborted',()=>finish(proxyError('换 IP 服务响应中断，请稍后重试')));
        response.on('end',()=>finish());
      });
      req.on('error',()=>finish(proxyError('换 IP 请求失败，请检查服务地址和本机网络')));
      timer=setTimeout(()=>{finish(proxyError('换 IP 请求超时，供应商可能已经收到请求，请先检测出口再决定是否重试'));req.destroy();},timeout);
      signal?.addEventListener('abort',abort,{once:true});
      if(signal?.aborted){abort();return;}
      req.end();
    }catch{req?.destroy();finish(proxyError('换 IP 请求失败，请检查服务地址和本机网络'));}
  });
}
class ProxyChecks {
  constructor(api,{Runtime=ProxyRuntime,collect=collectGeo,rotate=requestRotation,resources}={}){this.api=api;this.Runtime=Runtime;this.collect=collect;this.rotate=rotate;this.resources=resources;this.pending=new Map();this.queue=[];this.active=0;}
  async exclusive(id,action){
    id=proxyId(id);if(this.pending.has(id))throw proxyError('该代理正在检测或换 IP，请稍后再试');
    if(this.cancelling||this.suspended)throw proxyError('正在结束代理检测，请稍后再试');
    const controller=new AbortController(),signal=controller.signal;
    const operation=(async()=>{
      if(this.active>=4)await new Promise((resolve,reject)=>{
        const next=()=>{signal.removeEventListener('abort',abort);this.active++;resolve();};
        const abort=()=>{const index=this.queue.indexOf(next);if(index>=0)this.queue.splice(index,1);reject(signal.reason);};
        this.queue.push(next);signal.addEventListener('abort',abort,{once:true});
      });else this.active++;
      try{check(signal);return await action(id,signal);}
      finally{this.active--;this.queue.shift()?.();}
    })();
    this.pending.set(id,{controller,operation});
    try{return await operation;}finally{this.pending.delete(id);}
  }
  async cancelAll(){
    this.cancelling=true;
    try{const pending=[...this.pending.values()];for(const item of pending)item.controller.abort();await Promise.allSettled(pending.map(item=>item.operation));}
    finally{this.cancelling=false;}
  }
  async suspend(){this.suspended=true;await this.cancelAll();}
  resume(){this.suspended=false;}
  async probe(proxy,signal){
    const start=performance.now();let runtime,result;
    try{
      check(signal);runtime=new this.Runtime(proxy,{resources:this.resources,signal});await runtime.listen();
      const exit=await waitFor(this.collect({proxyUrl:runtime.url,expectedIp:expectedExit(proxy),signal}),signal),validation=validateExit(proxy,exit);
      result={connected:validation.allowed,ip:exit.ip||'',countryName:exit.country_name||'',latencyMs:Math.round(performance.now()-start),message:validation.allowed?`代理连接成功，检测 IP：${exit.ip}${exit.country_name?'（'+exit.country_name+'）':''}${exit.multipleExits?'；不同检测地址返回不同出口，请检查代理分流规则':''}`:validation.message};
    }catch(error){check(signal);result={connected:false,ip:'',countryName:'',latencyMs:Math.round(performance.now()-start),message:safeProxyMessage(error)};}
    finally{await runtime?.close();}
    return result;
  }
  async save(id,result,signal){
    check(signal);
    try{await this.api.request(`/proxies/${id}/check-result`,{method:'POST',body:result,signal});}
    catch{check(signal);result.message+='；检测结果未能保存，请稍后刷新重试';result.saved=false;}
    return result;
  }
  check(id){return this.exclusive(id,async(key,signal)=>{const proxy=await this.api.request(`/devices/${key}/connection`,{signal}),result=await this.probe(proxy,signal);return Number(proxy.ipType)===2?this.save(key,result,signal):result;});}
  changeIp(id){return this.exclusive(id,async(key,signal)=>{
    const proxy=await this.api.request(`/proxies/${key}/connection`,{signal});check(signal);
    if(!proxy.changeIpUrl)throw proxyError('此代理尚未配置换 IP 链接');
    await this.rotate(proxy.changeIpUrl,{signal});check(signal);
    const result=await this.probe(proxy,signal);result.message=`换 IP 请求已提交；${result.message}。请以实际检测为准，供应商不保证出口 IP 立即变化。`;
    await this.save(key,result,signal);return {...result,rotationRequested:true};
  });}
}
module.exports={ProxyChecks,requestRotation,proxyId};
