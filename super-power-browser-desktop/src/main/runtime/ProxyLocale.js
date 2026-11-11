const languages=require('./ProxyLanguages.json');

const geoProviders=['https://lumtest.com/myip.json','https://ipwho.is/','https://ipinfo.io/json'];
const ipOnlyProviders=new Set(['myip.ipip.net','ifconfig.me','api.ipify.org']);
function followsProxy(fp){return {language:fp.language==='auto'||fp.languageMode==='ip',timezone:fp.timezone==='auto'};}
function validTimezone(value){
  if(typeof value!=='string'||!value)return false;
  try{new Intl.DateTimeFormat('en-US',{timeZone:value});return true;}catch{return false;}
}
function countryLanguage(geo){return languages[String(geo?.country_code||'').toUpperCase()];}
function hasLocale(fp,geo){
  const modes=followsProxy(fp);
  return (!modes.language||Boolean(countryLanguage(geo)))&&(!modes.timezone||validTimezone(geo?.timezone));
}
// Follow the legacy per-country Accept-Language order. Resolve against this
// launch's actual proxy exit, never the desktop's local IP or a previous shop.
function localeProbe(fp,providers=[]){
  const modes=followsProxy(fp);
  if(!modes.language&&!modes.timezone)return {};
  return {
    providers:[...new Set([...providers.filter(url=>!ipOnlyProviders.has(new URL(url).hostname)),...geoProviders])],
    accept:geo=>hasLocale(fp,geo),
  };
}
function resolveProxyLocale(fp,geo){
  const modes=followsProxy(fp),locale={};
  if((modes.language||modes.timezone)&&(!geo?.available||!hasLocale(fp,geo)))throw new Error('无法获取代理出口对应的语言或时区，请检查代理后重试，或在店铺环境中选择自定义值');
  if(modes.language)locale.language=countryLanguage(geo);
  if(modes.timezone)locale.timezone=geo.timezone;
  return locale;
}
module.exports={followsProxy,localeProbe,resolveProxyLocale};
