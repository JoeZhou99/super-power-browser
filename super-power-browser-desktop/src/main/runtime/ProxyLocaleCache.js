const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const {expectedExit,validateExit}=require('../pluginManage/NetworkInfo');
const {followsProxy,resolveProxyLocale}=require('./ProxyLocale');

const TTL_MS=24*60*60*1000;
const CACHE_VERSION=1;
function ordered(value){
  if(Array.isArray(value))return value.map(ordered);
  if(value&&typeof value==='object')return Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])]));
  return value;
}
function sameLocale(left,right){
  return Boolean(left&&typeof left==='object'&&!Array.isArray(left))&&
    Object.keys(right).every(key=>left[key]===right[key]);
}

// This stores a previous locale, never evidence that the current connection is
// ready. Every launch must still verify its actual exit before opening a shop.
class ProxyLocaleCache {
  constructor(profile,environment,{now=Date.now}={}){
    this.file=path.join(profile,'proxy-locale-cache.json');
    this.now=now;
    this.fingerprint=structuredClone(environment.fingerprint||{});
    const proxy=environment.proxy||{},automatic=followsProxy(this.fingerprint);
    this.expectedIp=expectedExit(proxy);
    this.validationProxy={host:proxy.host,mapIp:proxy.mapIp,webType:proxy.webType};
    this.eligible=Number(proxy.webType)===2&&Boolean(this.expectedIp)&&
      typeof environment.id==='string'&&Boolean(environment.id)&&
      typeof environment.fingerprintSeed==='string'&&Boolean(environment.fingerprintSeed)&&
      (automatic.language||automatic.timezone);
    // Keep the complete exit authentication/transport definition in the hash.
    // Internal relay hops can change without changing the bound static exit.
    const {transit,alternatives,...proxyOptions}=proxy.proxyOptions||{};
    const upstream={proxyOptions};
    for(const key of ['id','protocol','host','port','username','password','webType','ipType','protocolFamily','mapIp','mapPort']){
      if(Object.hasOwn(proxy,key))upstream[key]=proxy[key];
    }
    this.binding=createHash('sha256').update(JSON.stringify(ordered({
      shopId:environment.id,tenantId:environment.tenantId||'',fingerprintSeed:environment.fingerprintSeed,
      kernelVersion:environment.kernelVersion,fingerprint:this.fingerprint,expectedIp:this.expectedIp,upstream,
    }))).digest('hex');
  }

  resolve(exit){
    try{
      if(exit?.available!==true||!validateExit(this.validationProxy,exit).allowed)return null;
      return resolveProxyLocale(this.fingerprint,exit);
    }catch{return null;}
  }

  matches(runtimeLocale,exit){
    const resolved=this.resolve(exit);
    return resolved!==null&&sameLocale(runtimeLocale,resolved);
  }

  async load(){
    if(!this.eligible)return null;
    try{
      const raw=await fs.readFile(this.file,'utf8');
      if(raw.length>16384)return null;
      const value=JSON.parse(raw),now=this.now();
      if(value?.version!==CACHE_VERSION||value.binding!==this.binding||
        !Number.isSafeInteger(value.verifiedAt)||!Number.isSafeInteger(value.expiresAt)||
        value.expiresAt!==value.verifiedAt+TTL_MS||value.verifiedAt>now||value.expiresAt<=now)return null;
      // Re-resolve with the same country mapping/IANA validation used for live
      // probes. A cached arbitrary language or timezone is not accepted.
      const resolved=this.resolve({available:true,ip:value.ip,country_code:value.countryCode,timezone:value.locale?.timezone});
      if(!resolved||!sameLocale(value.locale,resolved)||
        Object.keys(value.locale).length!==Object.keys(resolved).length)return null;
      return resolved;
    }catch{return null;}
  }

  async save(exit){
    if(!this.eligible)return null;
    const locale=this.resolve(exit);
    if(!locale)return null;
    const verifiedAt=this.now(),temporary=this.file+'.'+randomUUID()+'.tmp';
    const countryCode=String(exit.country_code||'').toUpperCase();
    const value={version:CACHE_VERSION,binding:this.binding,verifiedAt,expiresAt:verifiedAt+TTL_MS,
      ip:this.expectedIp,countryCode:/^[A-Z]{2}$/.test(countryCode)?countryCode:'',locale};
    try{
      await fs.mkdir(path.dirname(this.file),{recursive:true});
      await fs.writeFile(temporary,JSON.stringify(value),{mode:0o600,flag:'wx'});
      await fs.rename(temporary,this.file);
      return locale;
    }catch{return null;}
    finally{await fs.unlink(temporary).catch(()=>{});}
  }
}

module.exports={ProxyLocaleCache};
