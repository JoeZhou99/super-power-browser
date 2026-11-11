const {isIP}=require('node:net');

let configuredUrl='';
const groups=['directDomains','resourceDomains','cdnDomains'];
function endpoint(value){
  if(!value)return '';
  let url;try{url=new URL(value);}catch{throw new Error('运营配置服务地址格式不正确');}
  if(url.username||url.password||url.search||url.hash||
      (url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname))))
    throw new Error('运营配置服务地址须使用 HTTPS 或本机 HTTP，且不能包含账号密码、查询参数或片段');
  return url.href;
}
function configureOperations(value){configuredUrl=endpoint(value);}
function object(value){return value&&typeof value==='object'&&!Array.isArray(value);}
function invalid(){throw new Error('运营配置格式不正确，请检查已发布的配置');}
function list(value,limit,normalize,{nonempty=false}={}){
  if(!Array.isArray(value)||value.length>limit||(nonempty&&!value.length))invalid();
  return [...new Set(value.map(item=>{if(typeof item!=='string'||!item||item!==item.trim()||/[\u0000-\u0020\u007f]/.test(item))invalid();return normalize(item);}))];
}
function domain(value,wildcard=false){
  let host=value.toLowerCase();
  if(wildcard&&host.startsWith('*.'))host=host.slice(2);
  const suffix=host.split('.').at(-1);
  if(host.length>253||!host.includes('.')||isIP(host)||host==='home.arpa'||host.endsWith('.home.arpa')||
      suffix.length<2||/^\d+$/.test(suffix)||/\.(localhost|local|localdomain|lan|internal|test|invalid|onion)$/.test(host)||
      !host.split('.').every(label=>/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)))invalid();
  return value.toLowerCase();
}
function webUrl(value,httpsOnly){
  let url;try{url=new URL(value);}catch{invalid();}
  if(!(httpsOnly?url.protocol==='https:':['https:','http:'].includes(url.protocol))||url.username||url.password||url.hash||url.port&&url.port!=='443')invalid();
  domain(url.hostname);
  return url.href;
}
function pattern(value){
  if(value.length>2048||/[#\\]/.test(value))invalid();
  const match=/^https:\/\/(\*\.)?([^/]+)(\/.*)$/.exec(value);
  if(!match)invalid();domain(match[2]);
  return 'https://'+(match[1]||'')+match[2].toLowerCase()+match[3];
}
function validateOperations(body){
  if(!object(body)||body.schemaVersion!==1||!Number.isSafeInteger(body.revision)||body.revision<1||
      !['networkRouting','networkChecks','accessPolicy','passkeyRules'].every(key=>object(body[key])&&typeof body[key].enabled==='boolean'))invalid();
  const networkRouting={enabled:body.networkRouting.enabled,...Object.fromEntries(groups.map(key=>[key,list(body.networkRouting[key],100,value=>domain(value,true))]))};
  const networkChecks={enabled:body.networkChecks.enabled,...Object.fromEntries(['proxyProviders','localProviders'].map(key=>[key,list(body.networkChecks[key],10,value=>webUrl(value,true),{nonempty:body.networkChecks.enabled})]))};
  const policy=body.accessPolicy;if(!['blacklist','whitelist'].includes(policy.mode))invalid();
  const accessPolicy={enabled:policy.enabled,mode:policy.mode,domains:list(policy.domains,100,value=>domain(value),{nonempty:policy.enabled&&policy.mode==='whitelist'}),exceptions:list(policy.exceptions,100,value=>{if(/[?*#]/.test(value))invalid();return webUrl(value,true);})};
  const passkeyRules={enabled:body.passkeyRules.enabled,...Object.fromEntries(['loginMatches','registerMatches'].map(key=>[key,list(body.passkeyRules[key],100,pattern,{nonempty:body.passkeyRules.enabled})]))};
  return {schemaVersion:1,revision:body.revision,networkRouting,networkChecks,accessPolicy,passkeyRules};
}
async function loadOperations({url=configuredUrl,token,signal,fetcher=globalThis.fetch}={}){
  const base=endpoint(url);if(!base)return null;
  if(typeof token!=='string'||!token||token.length>500||/[\r\n]/.test(token))throw new Error('请先登录，再读取运营配置');
  const timeout=AbortSignal.timeout(5000),requestSignal=signal?AbortSignal.any([signal,timeout]):timeout;
  try{
    const response=await fetcher(new URL('/api/runtime/config',base),{
      method:'GET',headers:{Accept:'application/json',Authorization:'Bearer '+token},cache:'no-store',redirect:'error',signal:requestSignal,
    });
    if(!response.ok)throw new Error('HTTP '+response.status);
    const text=await response.text();if(text.length>1_000_000)invalid();
    return validateOperations(JSON.parse(text));
  }catch(error){
    if(signal?.aborted)throw signal.reason;
    throw new Error('无法读取运营配置，请检查运营服务连接后重试',{cause:error});
  }
}
function effectiveRouting(proxy,operations){
  const options=proxy.proxyOptions||{};
  if(options.routing&&groups.some(key=>Array.isArray(options.routing[key])&&options.routing[key].length))return options.routing;
  if(!operations?.networkRouting.enabled)return {};
  const routing=Object.fromEntries(groups.map(key=>[key,operations.networkRouting[key]]));
  if(!options.resourceProxy&&(routing.resourceDomains.length||routing.cdnDomains.length))
    throw new Error('全局资源或 CDN 分流已启用，请先为此店铺配置专用资源代理');
  return routing;
}
function effectiveAccessPolicy(fingerprint,operations){
  if(fingerprint.accessRules?.domains?.length)return fingerprint.accessRules;
  if(!operations?.accessPolicy.enabled||!operations.accessPolicy.domains.length)return undefined;
  const {mode,domains,exceptions}=operations.accessPolicy;return {mode,domains,exceptions};
}
module.exports={configureOperations,loadOperations,validateOperations,effectiveRouting,effectiveAccessPolicy};
