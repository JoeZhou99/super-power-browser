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
  const snapshotId = proxySnapshotId(value?.snapshotId), selected = candidateIndex(value?.candidateIndex);
  if (!Array.isArray(value?.candidates) || !value.candidates.length || value.candidates.length > 9) throw new Error('线路列表无效');
  const candidates = value.candidates.map((line, index) => {
    if (candidateIndex(line?.candidateIndex) !== index || typeof line.ip !== 'string' || !line.ip || !Number.isInteger(line.port) || line.port < 1 || line.port > 65535 || typeof line.proxy_type !== 'string') throw new Error('线路列表无效');
    const result={candidateIndex:index, ip:line.ip, port:line.port, proxy_type:line.proxy_type};
    for(const key of ['id','name','region','poolId','poolName'])if(typeof line[key]==='string')result[key]=line[key].slice(0,200);
    if(line.health&&typeof line.health.available==='boolean')result.health={available:line.health.available,
      delay:Number.isFinite(line.health.delay)&&line.health.delay>=0?line.health.delay:null,
      entryLatencyMs:Number.isFinite(line.health.entryLatencyMs)&&line.health.entryLatencyMs>=0?line.health.entryLatencyMs:null,
      sampledAt:typeof line.health.sampledAt==='string'?line.health.sampledAt:''};
    return result;
  });
  if (selected >= candidates.length) throw new Error('当前线路无效');
  const result={snapshotId, candidateIndex:selected, candidates};
  if(value.relayPool&&typeof value.relayPool.id==='string'){
    result.relayPool={id:value.relayPool.id,name:String(value.relayPool.name||'平台中继池').slice(0,200)};
    result.automatic=value.automatic===true;
    result.relayStatus=['initializing','healthy','degraded','unavailable','monitoring','locked'].includes(value.relayStatus)?value.relayStatus:'monitoring';
  }
  return result;
}

export async function requestProxyRoutes(send = message => chrome.runtime.sendMessage(message)) {
  return proxyRouteSnapshot(await send({type:'sp:proxy-routes'}));
}

export async function queryAuthorizedProxyRoutes(sender, options) {
  authorize(sender, options);
  const reply = await options.rpc('GetProxyRoutes', {});
  if (reply?.ret !== 200) throw new Error('无法读取当前线路');
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
  return {delay,entryLatencyMs:Number.isFinite(value.entryLatencyMs)&&value.entryLatencyMs>=0?value.entryLatencyMs:null,
    sampledAt:typeof value.sampledAt==='string'?value.sampledAt:new Date().toISOString()};
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
  const reply = await options.rpc('TransferSpeed', {candidateIndex:selected, snapshotId});
  if (reply?.ret !== 200) throw new Error('transfer_speed_failed');
  const delay = transferLatency(reply.returnObj, selected, snapshotId);
  return {available:true, delay, candidateIndex:selected, snapshotId,
    ...(Number.isFinite(reply.returnObj.entryLatencyMs)?{entryLatencyMs:reply.returnObj.entryLatencyMs}:{}),
    ...(typeof reply.returnObj.sampledAt==='string'?{sampledAt:reply.returnObj.sampledAt}:{})};
}
