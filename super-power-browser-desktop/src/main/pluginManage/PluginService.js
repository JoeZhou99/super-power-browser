const fs=require('node:fs/promises');
const path=require('node:path');
const {pathToFileURL}=require('node:url');
const {createHash}=require('node:crypto');
const AdmZip=require('adm-zip');
async function json(file,fallback){try{return JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code==='ENOENT')return fallback;throw error;}}
async function atomic(file,text){const temporary=file+'.spb-tmp';await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(temporary,text,{mode:0o600});await fs.rename(temporary,file);}
async function preparePlugins(resources,profile,{environment,session,websocketPort,proxyUrl,apiUrl,cookie='',localGeo=null}){
  const {encodeBootstrap}=await import(pathToFileURL(path.join(__dirname,'bootstrap.mjs')).href);
  const dirs=[],pluginIdMap={};
  for(const name of ['RXMallHelper','RXAccountManage']){
    const target=path.join(profile,'RBP',name),zip=await fs.readFile(path.join(resources,'Plugin',name+'.zip'));
    const checksum=createHash('sha256').update(zip).digest('hex');
    const installed=await json(path.join(target,'.spb-package.json'),{});
    if(installed.sha256!==checksum){
      await fs.mkdir(target,{recursive:true});const archive=new AdmZip(zip);
      for(const entry of archive.getEntries()){
        const relative=path.relative(target,path.resolve(target,entry.entryName));
        if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('插件包包含越界文件');
      }
      archive.extractAllTo(target,true);
      await atomic(path.join(target,'.spb-package.json'),JSON.stringify({sha256:checksum}));
    }
    const build=await json(path.join(target,'runtime/build.json'),{});
    if(build.mode!=='superpower')throw new Error('请先构建 SuperPower Browser 内置插件包');
    await atomic(path.join(target,'runtime/endpoint.json'),JSON.stringify({apiBase:new URL('/extension',apiUrl).href,authOrigin:new URL(apiUrl).origin}));
    const manifest=await json(path.join(target,'manifest.json'),{});
    if(!manifest.key)throw new Error('内置插件缺少固定身份公钥');
    pluginIdMap[name]=createHash('sha256').update(Buffer.from(manifest.key,'base64')).digest('hex').slice(0,32).replace(/[0-9a-f]/g,c=>String.fromCharCode(97+parseInt(c,16)));dirs.push(target);
    if(name==='RXMallHelper')await atomic(path.join(target,'runtime/environment-policy.js'),environmentPolicy(environment.fingerprint));
  }
  const loopback=new URL(proxyUrl);
  const configuration={desktopProtocol:'super-power-browser-desktop/1',kernelProtocol:'fingerprint-chromium/1',browserId:environment.id,sysMallId:environment.id,accessToken:session.token,websocketPort,pluginIdMap,
    proxyInfo:{proxyAuthUrl:`http://${loopback.host}@`,proxyIp:environment.proxy.host},staticProxy:{exchange:`http://${loopback.host}@`},
    localGeo,accessRules:environment.fingerprint.accessRules,language_setPlugin:'zh-CN',language:'zh-CN',appVersion:'5.3.17',browserVersion:environment.kernelVersion,
    cookie,installPlugins:[],commonParams:{is_plugin_sync_cookie:1},logoInfo:{brand_name:'SuperPower',main_logo:`chrome-extension://${pluginIdMap.RXMallHelper}/branding/mark.svg`},openUrl:environment.startUrl,
    apiBase:new URL('/extension',apiUrl).href,authOrigin:new URL(apiUrl).origin};
  const bundle=encodeBootstrap(configuration);
  for(const target of dirs){await atomic(path.join(target,'config.dat'),bundle.configDat);await atomic(path.join(target,'init.json'),bundle.initJson);}
  for(const name of ['Preferences']){
    const file=path.join(profile,'Default',name),prefs=await json(file,{});
    prefs.extensions??={};
    // 安装状态和受保护首选项由 Chromium 自己维护。
    if(name==='Preferences'){
      prefs.extensions.ui??={};prefs.extensions.ui.developer_mode=true;
      prefs.credentials_enable_service=environment.fingerprint.rememberPassword!==false;
      prefs.profile??={};prefs.profile.default_content_setting_values??={};
      // 此开关控制 HTTPS 通知是否自动允许；关闭时由浏览器询问。
      prefs.profile.default_content_setting_values.notifications=0;
      prefs.profile.content_settings??={};prefs.profile.content_settings.exceptions??={};
      prefs.profile.content_settings.exceptions.notifications??={};
      if(environment.fingerprint.notifications===true)prefs.profile.content_settings.exceptions.notifications['https://*,*']={setting:1};
      else delete prefs.profile.content_settings.exceptions.notifications['https://*,*'];
    }
    prefs.extensions.pinned_extensions=[...new Set([...(prefs.extensions.pinned_extensions||[]),...Object.values(pluginIdMap)])];
    await atomic(file,JSON.stringify(prefs));
  }
  await fs.writeFile(path.join(profile,'First Run'),'');
  await atomic(path.join(profile,'access-blocked.html'),'<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>访问受限 · SuperPower</title><style>body{font:16px system-ui;background:#f5f7fb;color:#24324b;max-width:640px;margin:16vh auto;padding:32px}h1{font-size:26px}p{line-height:1.8;color:#60708a}</style><h1>此网站受访问规则限制</h1><p>请联系管理员检查当前店铺的访问范围。</p></html>');
  return {dirs,pluginIdMap,bundle,configuration};
}
async function clearBootstrap(profile){for(const name of ['RXMallHelper','RXAccountManage'])for(const file of ['config.dat','init.json'])await fs.rm(path.join(profile,'RBP',name,file),{force:true});}
// Compatibility restrictions in page worlds, not native fingerprint patches.
function environmentPolicy(fp){
  return `(()=>{const policy=${JSON.stringify({disableRtc:fp.webRtc==='disabled',hideVoices:fp.speechVoices!=='real'})};
    if(policy.disableRtc)for(const name of ['RTCPeerConnection','webkitRTCPeerConnection']){try{Object.defineProperty(globalThis,name,{value:undefined,writable:false,configurable:false});}catch{}}
    if(policy.hideVoices&&globalThis.SpeechSynthesis)try{Object.defineProperty(SpeechSynthesis.prototype,'getVoices',{value:function getVoices(){return [];},writable:false,configurable:false});}catch{}
  })();`;
}
module.exports={preparePlugins,clearBootstrap,environmentPolicy};
