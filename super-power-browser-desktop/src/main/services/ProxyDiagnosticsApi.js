const {proxyError,safeProxyMessage}=require('./ProxyConfig');

// The extension asks for an operation on an authorized snapshot. Endpoints,
// credentials, provider attempts and runtime configuration never form this API.
const requests={
  GetNetworkInfo:['retry'],GetLocalNetworkInfo:[],GetProxyRoutes:[],RefreshProxyRoutes:[],
  TransferSpeed:['candidateIndex','snapshotId'],TestProxyWebsite:['candidateIndex','snapshotId'],
  MeasureProxyRoutes:['snapshotId'],OptimizeProxyRoutes:['snapshotId'],
  SetProxyAutomatic:['snapshotId','automatic'],StartProxy:['proxyInfo'],
};
const string=(value,max=300)=>typeof value==='string'?value.slice(0,max):undefined;
function pick(value,strings=[],numbers=[],booleans=[]){
  const result={};
  for(const key of strings)if(typeof value?.[key]==='string')result[key]=string(value[key]);
  for(const key of numbers)if(Number.isFinite(value?.[key])&&value[key]>=0)result[key]=value[key];
  for(const key of booleans)if(typeof value?.[key]==='boolean')result[key]=value[key];
  return result;
}
function publicGeo(value){
  return {available:value?.available===true,...pick(value,
    ['ip','country_code','country_name','region_name','city_name','timezone'],['durationMs'])};
}
function publicNetworkInfo(value){
  const result=pick(value,['phase','message','code'],['attemptId','elapsedMs','routeRevision'],['pending','allowed']);
  if(value?.exit)result.exit=publicGeo(value.exit);
  if(value?.local)result.local=publicGeo(value.local);
  return result;
}
function publicMeasurement(value){
  const result=pick(value,['status','sampledAt','entryMeasuredAt','pathMeasuredAt','siteMeasuredAt','exitCheckedAt','failure','siteFailure','snapshotId'],
    ['candidateIndex','delay','entryLatencyMs','pathLatencyMs','siteLatencyMs','exitLatencyMs'],['available','cached']);
  for(const key of ['delay','entryLatencyMs','pathLatencyMs','siteLatencyMs','exitLatencyMs'])if(value?.[key]===null)result[key]=null;
  return result;
}
function publicRouteState(value){
  const result=pick(value,['snapshotId','refreshMessage','authorizationCheckedAt','relayStatus'],['networkAttempt'],
    ['currentRevoked','automaticSupported','automatic','networkPending','needsAcknowledgement']);
  if(Number.isInteger(value?.candidateIndex))result.candidateIndex=value.candidateIndex;
  if(value?.relayPool)result.relayPool=pick(value.relayPool,['id','name'],['revision']);
  result.candidates=(value?.candidates||[]).map(candidate=>{
    const row=pick(candidate,['id','kind','name','region','poolId','poolName'],['candidateIndex']);
    if(candidate.health)row.health=publicMeasurement(candidate.health);
    return row;
  });
  if(value?.measurement)result.measurement=pick(value.measurement,
    ['status','message','startedAt','finishedAt'],['id','completed','total','selectedIndex'],['pending','optimize','changed']);
  return result;
}
function fields(args,allowed){
  if(!args||typeof args!=='object'||Array.isArray(args)||Object.keys(args).some(key=>!allowed.includes(key)))throw proxyError('检测请求包含不支持的参数');
}
function selection(args){
  fields(args,['candidateIndex','snapshotId']);
  if(!Number.isInteger(args.candidateIndex)||args.candidateIndex<0||args.candidateIndex>8||typeof args.snapshotId!=='string'||!/^[a-f0-9]{64}$/.test(args.snapshotId))throw proxyError('线路配置已变化，请刷新检测页面');
}
function withProxyDiagnostics(handler){
  return async(action,args={})=>{
    if(!Object.hasOwn(requests,action))return handler(action,args);
    fields(args,requests[action]);
    if(action==='StartProxy')selection(args.proxyInfo);
    else if(['TransferSpeed','TestProxyWebsite'].includes(action))selection(args);
    else if(['MeasureProxyRoutes','OptimizeProxyRoutes','SetProxyAutomatic'].includes(action)&&(typeof args.snapshotId!=='string'||!/^[a-f0-9]{64}$/.test(args.snapshotId)))throw proxyError('线路配置已变化，请刷新检测页面');
    if(('retry' in args&&typeof args.retry!=='boolean')||(action==='SetProxyAutomatic'&&typeof args.automatic!=='boolean'))throw proxyError('检测请求参数不合法');
    let value;
    try{value=await handler(action,args);}
    catch(error){if(error?.name==='AbortError'||error?.proxySafe)throw error;throw proxyError(safeProxyMessage(error));}
    if(action==='GetNetworkInfo')return publicNetworkInfo(value);
    if(action==='GetLocalNetworkInfo')return publicGeo(value);
    if(['TransferSpeed','TestProxyWebsite'].includes(action))return publicMeasurement(value);
    if(action==='StartProxy')return pick(value,['snapshotId'],['candidateIndex'],['isSuccess']);
    return publicRouteState(value);
  };
}
module.exports={withProxyDiagnostics,publicGeo,publicNetworkInfo,publicMeasurement,publicRouteState};
