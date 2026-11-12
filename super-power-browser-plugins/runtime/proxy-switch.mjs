export function candidateIndex(value) {
  if (!Number.isInteger(value) || value < 0 || value > 8) throw new Error('线路编号无效');
  return value;
}

export function proxySnapshotId(value) {
  if (typeof value !== 'string' || !/^[a-f0-9]{64}$/.test(value)) throw new Error('线路配置已失效，请重新获取线路');
  return value;
}

function authorize(sender, {extensionId, extensionRoot}) {
  if (sender?.id !== extensionId || !sender.url?.startsWith(extensionRoot)) throw new Error('未授权的线路操作');
}

export function proxyRouteSnapshot(value) {
  const snapshotId = proxySnapshotId(value?.snapshotId), selected = value?.currentRevoked===true&&value?.candidateIndex===-1?-1:candidateIndex(value?.candidateIndex);
  if (!Array.isArray(value?.candidates) || !value.candidates.length || value.candidates.length > 9) throw new Error('线路列表无效');
  const candidates = value.candidates.map((line, index) => {
    if (candidateIndex(line?.candidateIndex) !== index || typeof line.ip !== 'string' || !line.ip || !Number.isInteger(line.port) || line.port < 1 || line.port > 65535 || typeof line.proxy_type !== 'string') throw new Error('线路列表无效');
    const result={candidateIndex:index, ip:line.ip, port:line.port, proxy_type:line.proxy_type};
    for(const key of ['id','name','region','poolId','poolName'])if(typeof line[key]==='string')result[key]=line[key].slice(0,200);
    result.kind=line.kind==='relay'?'relay':'direct';
    if(line.health)result.health=measurementDetails(line.health);
    return result;
  });
  if (selected >= candidates.length) throw new Error('当前线路无效');
  const result={snapshotId, candidateIndex:selected, candidates,currentRevoked:value.currentRevoked===true,
    refreshMessage:String(value.refreshMessage||'').slice(0,300),authorizationCheckedAt:String(value.authorizationCheckedAt||'').slice(0,50),
    networkAttempt:Number.isInteger(value.networkAttempt)?value.networkAttempt:null,networkPending:value.networkPending===true,needsAcknowledgement:value.needsAcknowledgement===true};
  if(value.relayPool&&typeof value.relayPool.id==='string'){
    result.relayPool={id:value.relayPool.id,name:String(value.relayPool.name||'平台中继池').slice(0,200)};
    result.automatic=value.automatic===true;
    result.automaticSupported=value.automaticSupported!==false;
    result.relayStatus=['initializing','healthy','degraded','unavailable','monitoring','locked'].includes(value.relayStatus)?value.relayStatus:'monitoring';
  }
  if(value.measurement&&Number.isInteger(value.measurement.id)){
    const job=value.measurement;
    result.measurement={id:job.id,pending:job.pending===true,optimize:job.optimize===true,status:String(job.status||'').slice(0,30),
      completed:Number.isInteger(job.completed)?job.completed:0,total:Number.isInteger(job.total)?job.total:0,
      changed:job.changed===true,message:String(job.message||'').slice(0,300),selectedIndex:Number.isInteger(job.selectedIndex)?job.selectedIndex:null};
  }
  return result;
}

function measurementDetails(value){
  const result={available:value.available===true,cached:value.cached===true,status:String(value.status||'').slice(0,30)};
  for(const key of ['delay','entryLatencyMs','pathLatencyMs','siteLatencyMs','exitLatencyMs'])result[key]=Number.isFinite(value[key])&&value[key]>=0?value[key]:null;
  for(const key of ['sampledAt','entryMeasuredAt','pathMeasuredAt','siteMeasuredAt','exitCheckedAt'])result[key]=typeof value[key]==='string'?value[key].slice(0,50):'';
  for(const key of ['failure','siteFailure'])if(typeof value[key]==='string')result[key]=value[key].slice(0,300);
  return result;
}

export async function requestProxyRoutes(send = message => chrome.runtime.sendMessage(message)) {
  return proxyRouteSnapshot(await send({type:'sp:proxy-routes'}));
}
export async function requestProxyRefresh(send=message=>chrome.runtime.sendMessage(message)){
  return proxyRouteSnapshot(await send({type:'sp:proxy-refresh'}));
}
export async function requestRouteMeasurement(optimize,snapshot,send=message=>chrome.runtime.sendMessage(message)){
  return proxyRouteSnapshot(await send({type:'sp:route-measurement',optimize:optimize===true,snapshotId:proxySnapshotId(snapshot)}));
}

export async function queryAuthorizedProxyRoutes(sender, options,refresh=false) {
  authorize(sender, options);
  const reply = await options.rpc(refresh?'RefreshProxyRoutes':'GetProxyRoutes', {});
  if (reply?.ret !== 200) throw new Error('无法读取当前线路');
  return proxyRouteSnapshot(reply.returnObj);
}
export async function measureAuthorizedRoutes(message,sender,options){
  authorize(sender,options);
  if(typeof message.optimize!=='boolean')throw new Error('测速参数不合法');
  const reply=await options.rpc(message.optimize?'OptimizeProxyRoutes':'MeasureProxyRoutes',{snapshotId:proxySnapshotId(message.snapshotId)});
  if(reply?.ret!==200)throw new Error('无法开始线路检测');
  if(message.optimize)await options.prepareNetwork?.();
  return proxyRouteSnapshot(reply.returnObj);
}

function switchFailure(result) {
  const error = new Error('线路切换失败，请重试或选择其他线路');
  if (Number.isInteger(result?.candidateIndex) && result.candidateIndex >= 0 && result.candidateIndex <= 8) error.candidateIndex = result.candidateIndex;
  return error;
}

export async function requestProxySwitch(index, snapshot, send = message => chrome.runtime.sendMessage(message)) {
  const selected = candidateIndex(index), snapshotId = proxySnapshotId(snapshot);
  const reply = await send({type:'sp:proxy-switch', candidateIndex:selected, snapshotId}).catch(error => { throw switchFailure(error); });
  if (reply?.isSuccess !== true || reply.candidateIndex !== selected || reply.snapshotId !== snapshotId) throw switchFailure(reply);
  return reply;
}

// Only the local desktop knows the authorized connection and its credentials.
// Notify the page after the native forwarding process is actually ready.
export async function switchAuthorizedProxy(message, sender, {extensionId, extensionRoot, rpc, notify, readyType, prepareNetwork}) {
  authorize(sender, {extensionId, extensionRoot});
  const selected = candidateIndex(message?.candidateIndex), snapshotId = proxySnapshotId(message?.snapshotId);
  if(prepareNetwork)await prepareNetwork();
  const reply = await rpc('StartProxy', {proxyInfo:{candidateIndex:selected, snapshotId}}).catch(error => { throw switchFailure(error); });
  const result = reply?.returnObj;
  if (reply?.ret !== 200 || result?.isSuccess !== true || result.candidateIndex !== selected || result.snapshotId !== snapshotId) throw switchFailure(result);
  // A closed check page does not undo a successful desktop switch.
  try { Promise.resolve(notify({type:readyType, candidateIndex:selected, snapshotId})).catch(() => {}); } catch {}
  return {isSuccess:true, candidateIndex:selected, snapshotId};
}

function transferLatency(value, index, snapshotId) {
  if (value?.candidateIndex !== index || value.snapshotId !== snapshotId || value.available !== true || typeof value.delay !== 'number' || !Number.isFinite(value.delay) || value.delay < 0) throw new Error('transfer_speed_unavailable');
  return Math.round(value.delay);
}

export async function requestTransferSpeed(index, snapshot, send = message => chrome.runtime.sendMessage(message)) {
  const selected = candidateIndex(index), snapshotId = proxySnapshotId(snapshot);
  return transferLatency(await send({type:'sp:transfer-speed', candidateIndex:selected, snapshotId}), selected, snapshotId);
}

export async function requestTransferDetails(index, snapshot, send = message => chrome.runtime.sendMessage(message)) {
  const selected=candidateIndex(index),snapshotId=proxySnapshotId(snapshot);
  const value=await send({type:'sp:transfer-speed',candidateIndex:selected,snapshotId});
  const delay=transferLatency(value,selected,snapshotId);
  return {...measurementDetails(value),delay};
}
export async function requestWebsiteDetails(index,snapshot,send=message=>chrome.runtime.sendMessage(message)){
  const selected=candidateIndex(index),snapshotId=proxySnapshotId(snapshot),value=await send({type:'sp:website-speed',candidateIndex:selected,snapshotId});
  transferLatency(value,selected,snapshotId);return measurementDetails(value);
}

export async function requestProxyAutomatic(automatic,snapshot,send=message=>chrome.runtime.sendMessage(message)) {
  if(typeof automatic!=='boolean')throw new Error('自动切换参数不合法');
  return proxyRouteSnapshot(await send({type:'sp:proxy-automatic',automatic,snapshotId:proxySnapshotId(snapshot)}));
}

export async function setAuthorizedProxyAutomatic(message,sender,options) {
  authorize(sender,options);
  if(typeof message.automatic!=='boolean')throw new Error('自动切换参数不合法');
  const reply=await options.rpc('SetProxyAutomatic',{automatic:message.automatic,snapshotId:proxySnapshotId(message.snapshotId)});
  if(reply?.ret!==200)throw new Error('无法更新自动切换状态');
  return proxyRouteSnapshot(reply.returnObj);
}

export async function measureAuthorizedTransfer(message, sender, options) {
  authorize(sender, options);
  const selected = candidateIndex(message?.candidateIndex), snapshotId = proxySnapshotId(message?.snapshotId);
  // The desktop chooses the shop's configured target, never a page-supplied URL.
  const reply = await options.rpc(message.type==='sp:website-speed'?'TestProxyWebsite':'TransferSpeed', {candidateIndex:selected, snapshotId});
  if (reply?.ret !== 200) throw new Error('transfer_speed_failed');
  const delay = transferLatency(reply.returnObj, selected, snapshotId);
  return {...measurementDetails(reply.returnObj),available:true, delay, candidateIndex:selected, snapshotId};
}
