const {createHash}=require('node:crypto');
const {publicIp}=require('../pluginManage/NetworkInfo');

const baseFonts=['Arial','Arial Black','Calibri','Cambria','Consolas','Courier New','Microsoft YaHei','Segoe UI','Segoe UI Emoji','SimSun','Tahoma','Times New Roman','Verdana'];
const optionalFonts=['Bahnschrift','Candara','Comic Sans MS','Constantia','Corbel','Georgia','Impact','Lucida Console','Microsoft JhengHei','Palatino Linotype','SimHei','Trebuchet MS'];
const windowsVoices=[
  ['zh-CN','Huihui - Chinese (Simplified, PRC)'],['zh-CN','Kangkang - Chinese (Simplified, PRC)'],['zh-CN','Yaoyao - Chinese (Simplified, PRC)'],
  ['en-AU','Catherine - English (Australia)'],['en-AU','James - English (Australia)'],['en-CA','Linda - English (Canada)'],['en-CA','Richard - English (Canada)'],
  ['en-GB','George - English (United Kingdom)'],['en-GB','Hazel - English (United Kingdom)'],['en-GB','Susan - English (United Kingdom)'],['en-IE','Sean - English (Ireland)'],
  ['en-IN','Heera - English (India)'],['en-IN','Ravi - English (India)'],['en-US','David - English (United States)'],['en-US','Mark - English (United States)'],['en-US','Zira - English (United States)']
].map(([lang,name])=>({name:'Microsoft '+name,voice_uri:'Microsoft '+name,lang,local_service:true,default:false,os:1,vendor:1}));
const googleVoices=[['de-DE','Deutsch'],['en-US','US English'],['en-GB','UK English Female'],['en-GB','UK English Male'],['es-ES','español'],['es-US','español de Estados Unidos'],['fr-FR','français'],['hi-IN','हिन्दी'],['id-ID','Bahasa Indonesia'],['it-IT','italiano'],['ja-JP','日本語'],['ko-KR','한국의'],['nl-NL','Nederlands'],['pl-PL','polski'],['pt-BR','português do Brasil'],['ru-RU','русский'],['zh-CN','普通话（中国大陆）'],['zh-HK','粤語（香港）'],['zh-TW','國語（臺灣）']].map(([lang,name])=>({name:'Google '+name,voice_uri:'Google '+name,lang,local_service:false,default:false,os:0,vendor:0}));

function fontList(fp,seed){
  if(fp.fontList!==undefined){if(!Array.isArray(fp.fontList)||!fp.fontList.length||fp.fontList.length>100||fp.fontList.some(s=>typeof s!=='string'||!s.trim()||s.length>100))throw new Error('隐私字体列表不合法');return [...new Set(fp.fontList.map(s=>s.trim()))];}
  // 旧版在保存时固定一组字体；这里用持久化环境标识固定候选，避免每次开店变化。
  const selected=optionalFonts.filter(name=>(createHash('sha256').update(seed+'|font|'+name).digest()[0]&1)===1);
  return [...baseFonts,...selected];
}
function speechList(language){
  const lang=language.split(',')[0].trim().toLowerCase(),primary=lang.split('-')[0];
  let local=windowsVoices.filter(v=>v.lang.toLowerCase()===lang);
  if(!local.length)local=windowsVoices.filter(v=>v.lang.toLowerCase().split('-')[0]===primary);
  if(!local.length)local=windowsVoices.filter(v=>v.lang==='en-US');
  return [...local,...googleVoices];
}
function userAgentData(ua){
  const fullVersion=ua.match(/Chrome\/([\d.]+)/)?.[1];if(!fullVersion)throw new Error('UA 必须包含 Chrome 版本');
  const major=Number(fullVersion.split('.')[0]);let platform='Windows',platformVersion='10.0.0',architecture='x86',bitness=/Win64|x64|WOW64/.test(ua)?'64':'32',mobile=false,model='';
  if(/Android/i.test(ua)){platform='Android';platformVersion=[...(ua.match(/Android\s+([\d.]+)/)?.[1]||'13').split('.'),'0','0'].slice(0,3).join('.');architecture='arm';bitness='64';mobile=true;model=ua.match(/Android[^;)]*;\s*([^;)]+)/)?.[1]||'';}
  else if(/Macintosh/.test(ua)){platform='macOS';platformVersion=(ua.match(/Mac OS X\s+([\d_]+)/)?.[1]||'10_15_7').replaceAll('_','.');bitness='64';}
  else if(/Windows NT/.test(ua)){const version=ua.match(/Windows NT\s+([\d.]+)/)?.[1]||'10.0';platformVersion=({'6.1':'0.1.0','6.2':'0.2.0','6.3':'0.3.0','10.0':'10.0.0','11.0':'15.0.0'})[version]||version+'.0';}
  else throw new Error('仅支持 Windows、Mac 和 Android UA');
  return {architecture,bitness,brands:[{brand:'Google Chrome',version:major,fullVersion},{brand:'Chromium',version:major,fullVersion},{brand:'Not/A)Brand',version:'24',fullVersion:'24.0.0.0'}],mobile,model,platform,platformVersion,uaFullVersion:fullVersion,wow64:/WOW64/.test(ua)};
}
function applyFingerprint(config,environment){
  const fp=environment.fingerprint;
  const privacy=key=>fp[key]!=='real';
  config.user_agent_data=userAgentData(config.cmd_line['user-agent']);
  config.is_canvas_finger_printing_enable=privacy('canvas');
  config.is_audio_finger_printing_enable=privacy('audio');
  config.is_clientrects_finger_printing_enable=privacy('clientRects');
  config.is_font_finger_printing_enable=privacy('fontMetrics');
  config.is_webgl_finger_printing_enable=privacy('webglFingerprint');
  config.is_webgl_enable=fp.webgl!==false;
  config.is_enumerate_devices_enable=true;
  if(fp.webglVendor)config.webgl_vendor=String(fp.webglVendor);
  if(fp.webglRenderer)config.webgl_renderer=String(fp.webglRenderer);
  if(fp.fonts==='privacy')config.full_font_list=fontList(fp,environment.fingerprintSeed);
  if(fp.speechVoices==='privacy')config.PlatformSpeechSynthesisList=speechList(config.accept_languages);
  else if(fp.speechVoices==='real')config.GoogleSpeechSynthesis=true; // 旧版 speechVoices=2
  if(fp.webRtc==='replace'){
    const ip=publicIp(environment.proxy.mapIp||environment.proxy.publicIp||environment.proxy.host||'');
    if(!ip)throw new Error('替换 WebRTC 需要设备配置有效的映射公网 IP');
    config.webrtc_policy=0;config.webrtc_fake_ip=ip;config.webrtc_local_ip=ip;
  }
  return config;
}
module.exports={applyFingerprint,fontList,speechList,userAgentData};
