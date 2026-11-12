const https=require('node:https');
const {isIP}=require('node:net');
const {HttpsProxyAgent}=require('https-proxy-agent');
const {check,waitFor}=require('../runtime/Cancellation');

function publicIp(value){
  if(!isIP(value))return '';
  if(isIP(value)===4){const [a,b]=value.split('.').map(Number);if(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127))return '';}
  else if(/^(::|::1|f[cd][\da-f:]*|fe[89ab][\da-f:]*)$/i.test(value)||value.toLowerCase().startsWith('::ffff:'))return '';
  return value;
}
function normalize(data){
  const ip=publicIp(String(data.ip||''));if(!ip)throw new Error('服务未返回公网 IP');
  const country_code=String(data.country_code||data.country||'').toUpperCase();
  let country_name=String(data.country_name||data.country||'');
  if(/^[A-Z]{2}$/i.test(country_code))country_name=new Intl.DisplayNames(['zh-CN'],{type:'region'}).of(country_code.toUpperCase());
  const result={ip,country_code,country_name,region_name:String(data.region_name||data.region||''),city_name:String(data.city_name||data.city||'')};
  const timezone=typeof data.timezone==='string'?data.timezone:data.timezone?.id||data.geo?.tz;
  if(typeof timezone==='string'&&timezone.length<=100){try{new Intl.DateTimeFormat('en-US',{timeZone:timezone});result.timezone=timezone;}catch{}}
  return result;
}
const proxyProviders=['https://myip.ipip.net/','https://ifconfig.me/ip','https://lumtest.com/myip.json'];
const localProviders=['https://ipwho.is/','https://ipinfo.io/json','https://api.ipify.org?format=json'];
function parseResponse(body){
  const value=body.trim();
  if(publicIp(value))return normalize({ip:value});
  if(value.startsWith('{'))return normalize(JSON.parse(value));
  const match=value.match(/^当前\s*IP[：:]\s*(\S+)\s+来自于[：:]\s*(.+)$/);
  if(!match)throw new Error('检测服务未返回有效 IP');
  const [country_name='',region_name='',city_name='']=match[2].trim().split(/\s+/);
  return normalize({ip:match[1],country_code:country_name==='中国'?'CN':'',country_name,region_name,city_name});
}
const canonical=ip=>isIP(ip)===6?new URL(`http://[${ip}]/`).hostname:ip;
function expectedExit(proxy){return Number(proxy.webType)===1?'':publicIp(proxy.mapIp||proxy.host||'');}
function validateExit(proxy,exit){
  if(!exit?.available||!publicIp(exit.ip||''))return {allowed:false,message:exit?.failure==='timeout'?'代理出口检测超时，请稍后重试或检查代理线路':'代理出口检测失败，请检查代理后重试'};
  const expected=expectedExit(proxy);
  if(expected&&canonical(expected)!==canonical(exit.ip))return {allowed:false,code:'PROXY_EXIT_MISMATCH',message:'实际出口 IP 与绑定的固定 IP 不一致'};
  return {allowed:true,message:'代理出口检测通过'};
}
function createExitValidation(proxy){
  let fixed=expectedExit(proxy);
  return {
    get expectedIp(){return fixed;},
    validate(exit){
      const result=validateExit(proxy,exit);
      if(!result.allowed||!proxy.relayPool)return result;
      // A domain gateway has no known public address until the first successful
      // probe. Pin that actual exit for this session before comparing relays.
      fixed ||= exit.ip;
      return validateExit({...proxy,webType:2,mapIp:fixed},exit);
    },
  };
}
function requestJson(url,agent,signal){return new Promise((resolve,reject)=>{
  const request=https.get(url,{agent,signal,headers:{Accept:'application/json'}},response=>{
    let body='';response.setEncoding('utf8');response.on('data',chunk=>{body+=chunk;if(body.length>65536)request.destroy(new Error('检测响应过大'));});
    response.on('error',reject);response.on('end',()=>{try{if(response.statusCode!==200)throw Object.assign(new Error('检测服务暂不可用'),{status:response.statusCode});resolve(parseResponse(body));}catch(error){reject(error);}});
  });request.on('error',reject);
});}
// Match the legacy connectivity probe's sequential attempts and 8-second
// allowance, but cap the whole round at 12 seconds (below the 15-second RPC).
// Managed routes may opt into two simultaneous providers so one unavailable
// detection site cannot consume the whole round. Ordinary calls stay sequential.
// Local geolocation remains parallel and never delays the shop window.
async function collectGeo({proxyUrl,expectedIp='',timeout=proxyUrl?12000:5000,requestTimeout=8000,providers=proxyUrl?proxyProviders:localProviders,providerConcurrency=1,request=requestJson,accept=()=>true,firstValid=false,signal}={}){
  check(signal);
  const started=performance.now(),diagnostics=[];
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  const abort=()=>controller.abort(signal.reason);
  signal?.addEventListener('abort',abort,{once:true});if(signal?.aborted)abort();
  const observed=new Set(),responses=[];let first=null,confirmed=null;
  const attempt=async(url,index)=>{
    if(controller.signal.aborted)return;
    const connection=new AbortController(),began=performance.now();
    const cancel=()=>connection.abort();
    controller.signal.addEventListener('abort',cancel,{once:true});
    const attemptTimer=setTimeout(cancel,requestTimeout);
    // ClientRequest does not yet own the socket while the CONNECT response is
    // pending. Pass the signal to the underlying dial as well as the request.
    const agent=proxyUrl?new HttpsProxyAgent(proxyUrl,{signal:connection.signal}):new https.Agent();
    const detail={provider:new URL(url).hostname};
    diagnostics[index]=detail;
    try{
      const geo=await waitFor(request(url,agent,connection.signal),connection.signal);
      check(connection.signal);
      if(!publicIp(geo.ip))throw new Error('检测服务未返回公网 IP');
      if(!accept(geo))throw new Error('检测服务未返回所需的出口地区信息');
      detail.result='success';
      if(expectedIp)detail.matchesExpected=canonical(geo.ip)===canonical(expectedIp);
      if(!first||(!first.country_code&&geo.country_code))first=geo;
      responses[index]={...geo,source:detail.provider};
      const key=geo.country_code+'|'+geo.ip;
      if(proxyUrl&&firstValid&&(!expectedIp||detail.matchesExpected)){confirmed=geo;controller.abort();}
      else if(!proxyUrl&&geo.country_code&&observed.has(key)){confirmed=geo;controller.abort();}
      else observed.add(key);
    }catch(error){
      // Only classifications are retained: no credential-bearing URLs, IPs,
      // response bodies or arbitrary provider error messages in diagnostics.
      detail.result=signal?.aborted||confirmed?'cancelled':connection.signal.aborted?'timeout':
        error.status?'http-error':['ENOTFOUND','EAI_AGAIN'].includes(error.code)?'dns-error':
        error.code==='ECONNREFUSED'?'connection-refused':error.code?'network-error':'invalid-response';
      if(Number.isInteger(error.status))detail.status=error.status;
    }finally{
      clearTimeout(attemptTimer);controller.signal.removeEventListener('abort',cancel);
      connection.abort();agent.destroy();detail.durationMs=Math.round(performance.now()-began);
    }
  };
  try{
    if(proxyUrl){
      const concurrency=Number(providerConcurrency)>=2?2:1;
      let next=0;
      const worker=async()=>{
        while(next<providers.length&&!confirmed&&!controller.signal.aborted){
          const index=next++;
          await attempt(providers[index],index);
        }
      };
      // Join every worker, including cancelled attempts, before exposing a
      // result; each attempt releases its timer, listeners and proxy agent.
      await Promise.allSettled(Array.from({length:Math.min(concurrency,providers.length)},worker));
    }else await Promise.allSettled(providers.map(attempt));
    check(signal);
    const diagnostic={durationMs:Math.round(performance.now()-started),diagnostics:diagnostics.filter(Boolean)};
    const unavailable={available:false,message:'暂未获取出口 IP',failure:diagnostic.diagnostics.some(item=>item.result==='timeout')?'timeout':'unavailable',...diagnostic};
    if(proxyUrl){
      // 固定设备按多检测地址中任意一次匹配判定；回环入口按
      // 配置顺序选择真实检测结果，不拿设备配置 IP 伪造“实际检测”。
      const valid=responses.filter(Boolean),matched=expectedIp&&valid.find(geo=>canonical(geo.ip)===canonical(expectedIp));
      const value=matched||(firstValid?confirmed:null)||valid[0];
      return value?{...value,available:true,multipleExits:new Set(valid.map(geo=>canonical(geo.ip))).size>1,observations:valid.map(({source,ip})=>({source,ip})),...diagnostic}:unavailable;
    }
    const value=confirmed||first;
    return value?{...value,available:true,...diagnostic}:unavailable;
  }finally{clearTimeout(timer);signal?.removeEventListener('abort',abort);controller.abort();}
}
let localCache=null,localPending=null;
async function localGeo({providers=localProviders,request=requestJson}={}){
  const key=JSON.stringify(providers);
  if(localCache?.key===key&&Date.now()-localCache.at<60000)return localCache.value;
  if(localPending?.key!==key){
    const pending={key};
    pending.promise=collectGeo({providers,request}).then(value=>{
      if(localPending===pending)localCache={key,at:Date.now(),value};return value;
    }).finally(()=>{if(localPending===pending)localPending=null;});
    localPending=pending;
  }
  return localPending.promise;
}
module.exports={publicIp,normalize,parseResponse,collectGeo,localGeo,validateExit,expectedExit,createExitValidation};
