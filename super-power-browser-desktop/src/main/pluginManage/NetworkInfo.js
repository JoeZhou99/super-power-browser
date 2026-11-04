const https=require('node:https');
const {isIP}=require('node:net');
const {HttpsProxyAgent}=require('https-proxy-agent');

function publicIp(value){
  if(!isIP(value))return '';
  if(isIP(value)===4){const [a,b]=value.split('.').map(Number);if(a===0||a===10||a===127||a>=224||(a===169&&b===254)||(a===172&&b>=16&&b<=31)||(a===192&&b===168)||(a===100&&b>=64&&b<=127))return '';}
  else if(/^(::|::1|f[cd][\da-f:]*|fe[89ab][\da-f:]*)$/i.test(value)||value.toLowerCase().startsWith('::ffff:'))return '';
  return value;
}
function normalize(data){
  const ip=publicIp(String(data.ip||''));if(!ip)throw new Error('服务未返回公网 IP');
  const country_code=String(data.country_code||data.country||'');
  let country_name=String(data.country_name||data.country||'');
  if(/^[A-Z]{2}$/i.test(country_code))country_name=new Intl.DisplayNames(['zh-CN'],{type:'region'}).of(country_code.toUpperCase());
  return {ip,country_code,country_name,region_name:String(data.region_name||data.region||''),city_name:String(data.city_name||data.city||'')};
}
const proxyProviders=['https://myip.ipip.net/','https://lumtest.com/myip.json','https://ifconfig.me/ip'];
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
  if(!exit?.available||!publicIp(exit.ip||''))return {allowed:false,message:'代理出口检测失败，请检查代理后重试'};
  const expected=expectedExit(proxy);
  if(expected&&canonical(expected)!==canonical(exit.ip))return {allowed:false,message:'实际出口 IP 与绑定的固定 IP 不一致'};
  return {allowed:true,message:'代理出口检测通过'};
}
function requestJson(url,agent,signal){return new Promise((resolve,reject)=>{
  const request=https.get(url,{agent,signal,headers:{Accept:'application/json'}},response=>{
    let body='';response.setEncoding('utf8');response.on('data',chunk=>{body+=chunk;if(body.length>65536)request.destroy(new Error('检测响应过大'));});
    response.on('error',reject);response.on('end',()=>{try{if(response.statusCode!==200)throw new Error('检测服务暂不可用');resolve(parseResponse(body));}catch(error){reject(error);}});
  });request.on('error',reject);
});}
// Same selection rule as the legacy localGeo collector: first usable response,
// replaced by the first IP/country pair confirmed by two services.
async function collectGeo({proxyUrl,expectedIp='',timeout=5000,providers=proxyUrl?proxyProviders:localProviders,request=requestJson}={}){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeout);
  const agent=proxyUrl?new HttpsProxyAgent(proxyUrl):new https.Agent();
  const observed=new Set(),responses=[];let first=null,confirmed=null;
  try{
    await Promise.allSettled(providers.map(async(url,index)=>{
      const geo=await request(url,agent,controller.signal);
      if(!publicIp(geo.ip))throw new Error('检测服务未返回公网 IP');
      if(!first||(!first.country_code&&geo.country_code))first=geo;
      responses[index]={...geo,source:new URL(url).hostname};
      const key=geo.country_code+'|'+geo.ip;
      if(!proxyUrl&&geo.country_code&&observed.has(key)){confirmed=geo;controller.abort();}else observed.add(key);
    }));
    if(proxyUrl){
      // 旧插件固定设备按多检测地址中任意一次匹配判定；回环入口按
      // 配置顺序选择真实检测结果，不拿设备配置 IP 伪造“实际检测”。
      const valid=responses.filter(Boolean),matched=expectedIp&&valid.find(geo=>canonical(geo.ip)===canonical(expectedIp));
      const value=matched||valid[0];
      return value?{...value,available:true,multipleExits:new Set(valid.map(geo=>canonical(geo.ip))).size>1,observations:valid.map(({source,ip})=>({source,ip}))}:{available:false,message:'暂未获取出口 IP'};
    }
    const value=confirmed||first;
    return value?{...value,available:true}:{available:false,message:'暂未获取出口 IP'};
  }finally{clearTimeout(timer);agent.destroy();}
}
let localCache=null,localPending=null;
async function localGeo(){
  if(localCache&&Date.now()-localCache.at<60000)return localCache.value;
  if(!localPending)localPending=collectGeo().then(value=>{localCache={at:Date.now(),value};return value;}).finally(()=>{localPending=null;});
  return localPending;
}
module.exports={publicIp,normalize,parseResponse,collectGeo,localGeo,validateExit,expectedExit};
