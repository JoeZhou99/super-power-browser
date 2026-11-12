const http = require('node:http');
const https = require('node:https');
const net = require('node:net');
const { createHash } = require('node:crypto');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { ProxyRuntime, proxyError, safeProxyMessage } = require('./ProxyRuntime');
const { check } = require('../runtime/Cancellation');

function ordered(value) {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, ordered(value[key])]));
  return value;
}
function proxySnapshotId(proxy) {
  const connection = {};
  for (const key of ['protocol', 'host', 'port', 'username', 'password', 'proxyOptions']) {
    if (Object.hasOwn(proxy, key)) connection[key] = proxy[key];
  }
  if(proxy.relayPool)connection.authorization={revision:proxy.relayPool.revision,candidates:proxy.relayPool.candidates?.map(({id,kind})=>({id,kind}))};
  return createHash('sha256').update(JSON.stringify(ordered(connection))).digest('hex');
}

// Measures the authorized shop target only. A renderer cannot choose a URL,
// upstream or credentials, and the request never carries shop cookies/tokens.
function targetLatency(target, proxyUrl, { signal, timeout = 8000 } = {}) {
  check(signal);
  const url = new URL(target);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw proxyError('店铺测速地址不合法');
  // A CONNECT socket is not yet owned by ClientRequest while the proxy is
  // answering. Abort the underlying dial as well as the request/agent.
  const connection = new AbortController();
  const agent = new HttpsProxyAgent(proxyUrl, { signal: connection.signal });
  const started = performance.now();
  return new Promise((resolve, reject) => {
    let done = false, request, timer;
    const finish = (error, value) => {
      if (done) return;
      done = true; clearTimeout(timer); signal?.removeEventListener('abort', abort);
      connection.abort(); request?.destroy(); agent.destroy(); error ? reject(error) : resolve(value);
    };
    const abort = () => finish(signal.reason || proxyError('测速已取消'));
    try {
      request = (url.protocol === 'https:' ? https : http).request(url, {
        method: 'HEAD', agent, headers: { 'Accept': '*/*', 'Connection': 'close' },
      }, response => {
        const status = response.statusCode || 0;
        response.destroy();
        // Redirect/403/405 still prove a real response from the selected site.
        finish(status >= 200 && status < 600 && status !== 407 ? null : proxyError('线路未能到达测速网站'), Math.round(performance.now() - started));
      });
      request.on('error', () => finish(proxyError('线路测速失败，请检查代理或稍后重试')));
      request.on('proxyConnect', response => {
        if (response.statusCode !== 200) finish(proxyError('代理无法建立测速连接'));
      });
      timer = setTimeout(() => finish(proxyError('线路测速超时')), timeout);
      signal?.addEventListener('abort', abort, { once: true });
      if (signal?.aborted) abort(); else request.end();
    } catch { finish(proxyError('线路测速失败')); }
  });
}

function firstHop(connection) {
  while (connection.proxyOptions?.transit) connection = connection.proxyOptions.transit;
  return connection;
}
function tcpLatency(connection, {signal, timeout = 5000} = {}) {
  check(signal);
  return new Promise((resolve, reject) => {
    const started = performance.now(), socket = net.connect({host:connection.host, port:connection.port});
    const finish = (error, value) => { signal?.removeEventListener('abort', abort); socket.destroy(); error ? reject(error) : resolve(value); };
    const abort = () => finish(signal.reason || proxyError('测速已取消'));
    socket.setTimeout(timeout, () => finish(proxyError('入口连接超时')));
    socket.once('connect', () => finish(null, Math.round(performance.now() - started)));
    socket.once('error', () => finish(proxyError('入口连接失败')));
    signal?.addEventListener('abort', abort, {once:true});
    if (signal?.aborted) abort();
  });
}

// A client-wide limiter also covers simultaneous optimizations in other shops.
let activeMeasurements=0;
const measurementQueue=[];
async function measurementSlot(signal){
  check(signal);
  if(activeMeasurements<3){activeMeasurements++;return;}
  await new Promise((resolve,reject)=>{
    const item={start:()=>{signal?.removeEventListener('abort',abort);activeMeasurements++;resolve();}};
    const abort=()=>{const index=measurementQueue.indexOf(item);if(index>=0)measurementQueue.splice(index,1);reject(signal.reason);};
    measurementQueue.push(item);signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  });
}
function releaseSlot(){activeMeasurements--;measurementQueue.shift()?.start();}
const time=()=>new Date().toISOString();
class ProxyRoutes {
  constructor(proxy, runtime, {target,resources,signal,Runtime=ProxyRuntime,measure=targetLatency,validate,probe,tcp=tcpLatency,cache,reuse=false}={}){
    this.snapshotId=proxySnapshotId(proxy);this.runtime=runtime;this.target=target;this.resources=resources;
    this.controllerSignal=new AbortController();this.signal=signal?AbortSignal.any([signal,this.controllerSignal.signal]):this.controllerSignal.signal;
    this.Runtime=Runtime;this.measure=measure;this.validate=validate;this.probe=probe;this.tcp=tcp;this.cache=cache;this.reuse=reuse;
    this.relayPool=proxy.relayPool;this.deviceId=proxy.id||proxy.deviceId||'';this.health=new Map();this.active=new Map();this.idle=new Map();
    this.batch=null;this.sequence=0;this.readyBusy=false;this.optimizing=false;this.currentRevoked=false;this.refreshMessage='';
  }
  get measuring(){return this.readyBusy||this.active.size>0||this.batch?.status==='testing';}
  metadata(index){return this.relayPool?.candidates?.[index]||{id:index===0?'direct':String(index),kind:index===0?'direct':'relay',name:index===0?'直连代理':`中继 ${index}`};}
  cacheIdentity(){return [this.deviceId,this.snapshotId];}
  async restoreCache(){
    const snapshotId=this.snapshotId,value=await this.cache?.load(this.cacheIdentity());
    if(snapshotId!==this.snapshotId||!value)return;
    this.preferredId=value.preferredId;
    for(const row of value.health||[]){const index=this.runtime.candidates.findIndex((_,i)=>this.metadata(i).id===row.id);
      if(index>=0&&!this.health.has(index))this.health.set(index,{...row,delay:row.pathLatencyMs??null,cached:true,status:'previous'});
    }
  }
  async saveCache(preferredIndex){
    if(Number.isInteger(preferredIndex)&&preferredIndex>=0)this.preferredId=this.metadata(preferredIndex).id;
    await this.cache?.save(this.cacheIdentity(),{preferredId:this.preferredId,health:[...this.health].map(([index,value])=>({id:this.metadata(index).id,...value}))});
  }
  startupIndexes(){
    const indexes=this.runtime.candidates.map((_,index)=>index),current=this.runtime.candidateIndex;
    const preferred=indexes.find(index=>this.metadata(index).id===this.preferredId);
    // A fresh local preference is only a startup ordering hint. Cache loading
    // checks its TTL, network and proxy identity; the chosen route is still
    // verified in isolation and again through the actual running proxy.
    if(preferred!==undefined)
      return [preferred,...indexes.filter(index=>index!==preferred)];
    return current>=0?[current,...indexes.filter(index=>index!==current)]:indexes;
  }
  state(){
    return {snapshotId:this.snapshotId,candidateIndex:this.runtime.candidateIndex,currentRevoked:this.currentRevoked,
      refreshMessage:this.refreshMessage,authorizationCheckedAt:this.authorizationCheckedAt||null,
      relayPool:this.relayPool?{id:this.relayPool.id,name:this.relayPool.name,revision:this.relayPool.revision}:{id:'direct',name:'代理线路'},
      automaticSupported:Boolean(this.controller),automatic:false,...this.controller?.state(),
      measurement:this.batch?{...this.batch}:null,...this.networkStatus?.(),
      candidates:this.runtime.candidates.map((candidate,candidateIndex)=>{
        const hop=firstHop(candidate),metadata=this.metadata(candidateIndex);
        return {candidateIndex,ip:hop.host,port:hop.port,proxy_type:hop.protocol,...metadata,
          ...(this.health.has(candidateIndex)?{health:{...this.health.get(candidateIndex)}}:{})};
      })};
  }
  select(selection){
    if(!selection||typeof selection!=='object'||Array.isArray(selection)||Object.keys(selection).some(key=>!['candidateIndex','snapshotId'].includes(key))||selection.snapshotId!==this.snapshotId)
      throw proxyError('线路配置已变化，请刷新检测页面后重试');
    return this.runtime.candidate(selection.candidateIndex);
  }
  async replace(proxy){
    if(this.measuring||this.optimizing)throw proxyError('线路正在检测，请稍后刷新');
    await this.closeIdle();
    this.snapshotId=proxySnapshotId(proxy);this.relayPool=proxy.relayPool;this.health.clear();this.preferredId=undefined;this.batch=null;
  }
  async closeIdle(){const values=[...this.idle.values()];this.idle.clear();await Promise.allSettled(values.map(value=>{clearTimeout(value.timer);return value.runtime.close();}));}
  async borrow(index,signal){
    const cached=this.idle.get(index);if(cached){clearTimeout(cached.timer);this.idle.delete(index);return cached.runtime;}
    const runtime=new this.Runtime(this.runtime.candidate(index),{resources:this.resources,signal:this.signal,isolated:true});
    const abort=()=>{void runtime.close().catch(()=>{});};
    signal.addEventListener('abort',abort,{once:true});
    try{check(signal);await runtime.listen();check(signal);return runtime;}
    catch(error){await runtime.close();throw error;}
    finally{signal.removeEventListener('abort',abort);}
  }
  async release(index,runtime,healthy){
    if(!runtime)return;
    if(!this.reuse||!healthy||this.signal.aborted)return runtime.close();
    const previous=this.idle.get(index);if(previous){clearTimeout(previous.timer);await previous.runtime.close();}
    const item={runtime,timer:setTimeout(()=>{if(this.idle.get(index)===item){this.idle.delete(index);void runtime.close().catch(()=>{});}},30000)};
    item.timer.unref?.();this.idle.set(index,item);
    while(this.idle.size>3){const [key,value]=this.idle.entries().next().value;this.idle.delete(key);clearTimeout(value.timer);await value.runtime.close();}
  }
  async observe(index,runtime,signal,{site=false}={}){
    if(!this.probe){
      const sampledAt=time();let entryLatencyMs=null;
      try{if(this.relayPool)entryLatencyMs=await this.tcp(firstHop(this.runtime.candidate(index)),{signal}).catch(()=>null);
        check(signal);await this.validate?.(runtime,signal);const delay=await this.measure(this.target,runtime.url,{signal});
        const value={available:true,delay,entryLatencyMs,sampledAt,pathLatencyMs:delay,pathMeasuredAt:sampledAt};this.health.set(index,value);return {...value,candidateIndex:index,snapshotId:this.snapshotId};
      }catch(error){check(signal);this.health.set(index,{available:false,delay:null,entryLatencyMs,sampledAt});throw error;}
    }
    const before=this.health.get(index)||{};
    const patch=fields=>this.health.set(index,{...this.health.get(index),...fields});
    patch({...before,status:'testing',cached:false,failure:undefined});
    const tcpTask=this.tcp(firstHop(this.runtime.candidate(index)),{signal}).then(entryLatencyMs=>patch({entryLatencyMs,entryMeasuredAt:time()}),()=>{if(!signal.aborted)patch({entryLatencyMs:null,entryMeasuredAt:time()});});
    try{
      const exit=await this.probe(runtime,signal);
      check(signal);
      const delay=exit.durationMs;
      if(!Number.isFinite(delay)||delay<0)throw proxyError('检测服务未返回有效耗时');
      patch({available:true,delay,pathLatencyMs:delay,pathMeasuredAt:time(),sampledAt:time(),status:site?'testing-site':'success',cached:false});
      if(site){
        try{const siteLatencyMs=await this.measure(this.target,runtime.url,{signal});patch({siteLatencyMs,siteMeasuredAt:time(),siteFailure:null});}
        catch(error){check(signal);patch({siteLatencyMs:null,siteMeasuredAt:time(),siteFailure:safeProxyMessage(error)});}
      }
      patch({status:'success'});
      return {...this.health.get(index),candidateIndex:index,snapshotId:this.snapshotId};
    }catch(error){check(signal);patch({available:false,delay:null,pathLatencyMs:null,pathMeasuredAt:time(),sampledAt:time(),status:'failed',failure:safeProxyMessage(error)});throw error;}
    finally{await tcpTask;}
  }
  async measureOne(index,{signal=this.signal,site=false}={}){
    if(this.active.has(index))return this.active.get(index);
    const operation=(async()=>{
      let runtime,healthy=false,acquired=false;
      try{await measurementSlot(signal);acquired=true;check(signal);runtime=await this.borrow(index,signal);
        const result=await this.observe(index,runtime,signal,{site});healthy=true;return {...result,...this.health.get(index)};
      }catch(error){if(!signal.aborted)this.health.set(index,{...this.health.get(index),available:false,delay:null,pathLatencyMs:null,cached:false,status:'failed',failure:safeProxyMessage(error),pathMeasuredAt:time()});throw error;}
      finally{try{await this.release(index,runtime,healthy);}finally{if(acquired)releaseSlot();this.active.delete(index);}}
    })();this.active.set(index,operation);return operation;
  }
  async latency(selection,{signal=this.signal,site=false}={}){
    this.select(selection);check(signal);if(this.measuring||this.optimizing)throw proxyError('线路正在测速，请稍后重试');
    const result=await this.measureOne(selection.candidateIndex,{signal,site});await this.saveCache();return result;
  }
  startBatch({optimize=false,onComplete}={}){
    check(this.signal);if(this.measuring||this.optimizing)throw proxyError('线路正在检测或切换，请稍后重试');
    const snapshotId=this.snapshotId,indices=this.runtime.candidates.map((_,index)=>index);
    this.batch={id:++this.sequence,snapshotId,status:'testing',pending:true,optimize,completed:0,total:indices.length,startedAt:time(),message:optimize?'正在检测并比较可用线路':'正在检测完整代理链路'};
    this.optimizing=optimize;
    for(const index of indices)this.health.set(index,{...this.health.get(index),status:'queued',cached:Boolean(this.health.get(index)?.pathMeasuredAt)});
    const batch=this.batch;
    this.batchPromise=(async()=>{
      let next=0;
      await Promise.allSettled(Array.from({length:Math.min(3,indices.length)},async()=>{
        while(next<indices.length&&!this.signal.aborted){const index=indices[next++];try{await this.measureOne(index);}catch{}finally{batch.completed++;}}
      }));
      check(this.signal);if(snapshotId!==this.snapshotId)throw proxyError('线路配置已变化，请重新测速');
      batch.status='selecting';
      if(optimize&&onComplete)Object.assign(batch,await onComplete(this.recommend()));
      batch.status='complete';if(!optimize)batch.message='线路检测完成';await this.saveCache(batch.selectedIndex);
    })().catch(error=>{batch.status='failed';batch.message=safeProxyMessage(error);}).finally(()=>{batch.pending=false;batch.finishedAt=time();this.optimizing=false;this.batchPromise=null;});
    return this.state();
  }
  recommend(){
    const values=[...this.health].filter(([,value])=>value.available&&!value.cached&&value.status==='success'&&Number.isFinite(value.pathLatencyMs)).sort((a,b)=>a[1].pathLatencyMs-b[1].pathLatencyMs);
    if(!values.length)throw proxyError('当前没有通过完整链路检测的线路');
    let best=values[0];const direct=values.find(([index])=>this.metadata(index).kind==='direct');
    const worthwhile=(from,to)=>from-to>=100&&to<=from*0.8;
    if(direct&&!worthwhile(direct[1].pathLatencyMs,best[1].pathLatencyMs))best=direct;
    const current=values.find(([index])=>index===this.runtime.candidateIndex);
    if(current&&best[0]!==current[0]&&!worthwhile(current[1].pathLatencyMs,best[1].pathLatencyMs))return current[0];
    return best[0];
  }
  async current({signal=this.signal}={}){if(this.measuring)throw proxyError('线路正在测速，请稍后重试');this.readyBusy=true;try{return await this.observe(this.runtime.candidateIndex,this.runtime,signal);}finally{this.readyBusy=false;}}
  async ready({signal=this.signal}={}){
    check(signal);if(this.measuring)throw proxyError('线路正在测速，请稍后重试');this.readyBusy=true;
    const index=this.runtime.candidateIndex,started=performance.now();
    try{if(!this.validate)throw proxyError('未配置代理出口校验');const network=await this.validate(this.runtime,signal);check(signal);
      const previous=this.health.get(index)||{},value={...previous,available:true,delay:previous.delay??null,entryLatencyMs:previous.entryLatencyMs??null,
        exitLatencyMs:Math.round(performance.now()-started),exitCheckedAt:time(),stage:'exit',failure:undefined};
      // Path/TCP timestamps belong to their original samples; health polling
      // must never make an old speed measurement look newly refreshed.
      this.health.set(index,value);return {...value,candidateIndex:index,snapshotId:this.snapshotId,network};
    }catch(error){this.health.set(index,{...this.health.get(index),available:false,exitLatencyMs:Math.round(performance.now()-started),exitCheckedAt:time(),stage:'exit',failure:safeProxyMessage(error)});check(signal);throw error;}
    finally{this.readyBusy=false;}
  }
  async close(){this.controllerSignal.abort();await this.batchPromise?.catch(()=>{});await Promise.allSettled([...this.active.values()]);await this.closeIdle();}
}
module.exports={ProxyRoutes,proxySnapshotId,targetLatency,firstHop,tcpLatency};
