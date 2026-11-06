const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {userAgentData}=require('./UserAgent');

function compileFingerprint(environment,kernel){
  if(kernel.protocol!=='fingerprint-chromium/1')throw new Error('独立模式不支持此内核协议，请选择已发布的开源内核');
  const fp=environment.fingerprint;
  if(fp.hardwareConcurrency!==undefined&&(!Number.isInteger(fp.hardwareConcurrency)||fp.hardwareConcurrency<1||fp.hardwareConcurrency>128))throw new Error('CPU 并发数必须是 1 至 128 的整数');
  if(!['Windows','Mac'].includes(fp.os||'Windows'))throw new Error('当前独立内核仅支持 Windows 和 Mac 环境');
  if(fp.webRtc==='replace')throw new Error('当前独立内核尚未实现 WebRTC 指定 IP 替换，请选择隐私、禁用或真实模式');
  if(fp.fontList?.length||fp.webglVendor||fp.webglRenderer)throw new Error('当前独立内核使用原生生成的字体与 GPU 配置，暂不支持自定义列表或 GPU 字符串');
  const privacy=key=>fp[key]!=='real';
  if(privacy('canvas')!==privacy('fontMetrics')||privacy('canvas')!==privacy('webglFingerprint'))throw new Error('当前内核的 Canvas、字体测量和 WebGL 噪声使用同一开关，请将三项设为相同模式');
  const language=fp.language==='auto'?environment.proxy.language:fp.language;
  const timezone=fp.timezone==='auto'?environment.proxy.timezone:fp.timezone;
  if(!language||!timezone)throw new Error('设备未提供语言与时区，请在店铺环境配置中选择');
  new Intl.DateTimeFormat('en-US',{timeZone:timezone});
  if(!/^[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?(?:,[a-zA-Z]{2,3}(?:-[a-zA-Z0-9]{2,8})?)*$/.test(language))throw new Error('语言配置不合法');
  if(!/^[1-9]\d{2,3}x[1-9]\d{2,3}$/.test(fp.resolution))throw new Error('窗口尺寸不合法');
  const system=fp.os==='Mac'?'Macintosh; Intel Mac OS X 10_15_7':'Windows NT 10.0; Win64; x64';
  const uaVersion=environment.kernelVersion.includes('.')?environment.kernelVersion:environment.kernelVersion+'.0.0.0';
  const ua=fp.userAgent||`Mozilla/5.0 (${system}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${uaVersion} Safari/537.36`;
  const metadata=userAgentData(ua),platform=fp.os==='Mac'?'macos':'windows';
  if(metadata.platform!==(platform==='macos'?'macOS':'Windows')||metadata.uaFullVersion.split('.')[0]!==String(kernel.version).split('.')[0])throw new Error('UA 与所选内核或操作系统不一致');
  if(typeof environment.fingerprintSeed!=='string'||!environment.fingerprintSeed)throw new Error('店铺缺少持久化指纹标识');
  const seed=createHash('sha256').update(environment.fingerprintSeed).digest().readUInt32LE()%2147483646+1;
  const disabled=[];
  for(const [setting,surface]of [['audio','audio'],['canvas','canvas'],['clientRects','clientrects'],['fonts','font'],['webglFingerprint','gpu']])if(!privacy(setting))disabled.push(surface);
  return {schemaVersion:1,protocol:kernel.protocol,version:kernel.version,fullVersion:kernel.fullVersion,seed,platform,language,timezone,userAgent:ua,userAgentData:metadata,windowSize:fp.resolution,hardwareConcurrency:fp.hardwareConcurrency||[4,8,12,16][seed%4],disableSpoofing:disabled,webRtc:fp.webRtc||'privacy',speechVoices:fp.speechVoices||'privacy'};
}

async function prepareLaunch(environment,{kernel,profile,plugins,proxyUrl,debugPort,downloads}){
  const fp=compileFingerprint(environment,kernel),identityPath=path.join(profile,'spb-identity.json');
  let identity;try{identity=JSON.parse(await fs.readFile(identityPath,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(identity&&(identity.seed!==fp.seed||identity.protocol!==fp.protocol))throw new Error('本地店铺目录与指纹身份不一致，请使用独立的新环境目录');
  if(identity?.archiveHash&&identity.archiveHash!==kernel.sha256)throw new Error('此店铺已绑定其他内核构建，请先确认浏览数据与指纹配置的切换方案，不能静默更换指纹算法');
  await fs.writeFile(identityPath,JSON.stringify({schemaVersion:1,seed:fp.seed,protocol:fp.protocol,version:fp.version,fullVersion:kernel.fullVersion,archiveHash:kernel.sha256}),{mode:0o600});
  await fs.writeFile(path.join(profile,'startup-config.json'),JSON.stringify(fp,null,2),{mode:0o600});
  const args=[`--user-data-dir=${profile}`,`--fingerprint=${fp.seed}`,'--fingerprint-brand=Chrome',`--fingerprint-brand-version=${fp.userAgentData.uaFullVersion}`,`--fingerprint-platform=${fp.platform}`,`--fingerprint-platform-version=${fp.userAgentData.platformVersion}`,`--fingerprint-hardware-concurrency=${fp.hardwareConcurrency}`,`--user-agent=${fp.userAgent}`,`--lang=${fp.language.split(',')[0]}`,`--accept-lang=${fp.language}`,`--timezone=${fp.timezone}`,`--window-size=${fp.windowSize.replace('x',',')}`,`--proxy-server=${proxyUrl}`,'--proxy-bypass-list=127.0.0.1;localhost;[::1]',`--remote-debugging-port=${debugPort}`,'--remote-debugging-address=127.0.0.1',`--load-extension=${plugins.join(',')}`,'--no-first-run','--no-default-browser-check','--disable-sync','--disable-quic','--disable-background-networking','--disable-default-apps','--silent-debugger-extension-api'];
  if(process.platform==='win32')args.push('--disable-features=PrintCompositorLPAC');
  if(fp.disableSpoofing.length)args.push('--disable-spoofing='+fp.disableSpoofing.join(','));
  if(fp.webRtc!=='real')args.push('--force-webrtc-ip-handling-policy=disable_non_proxied_udp');
  if(environment.fingerprint.webgl===false)args.push('--disable-webgl');
  if(environment.fingerprint.hardwareAcceleration===false)args.push('--disable-gpu');
  args.push('about:blank');
  const prefsFile=path.join(profile,'Default','Preferences');
  let prefs={};try{prefs=JSON.parse(await fs.readFile(prefsFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  prefs.download={...prefs.download,default_directory:downloads};
  prefs.intl={...prefs.intl,accept_languages:fp.language,selected_languages:fp.language};
  prefs.webrtc={...prefs.webrtc,ip_handling_policy:fp.webRtc==='real'?'default':'disable_non_proxied_udp'};
  await fs.mkdir(path.dirname(prefsFile),{recursive:true});await fs.writeFile(prefsFile,JSON.stringify(prefs),{mode:0o600});
  return {args,fingerprint:fp};
}
module.exports={compileFingerprint,prepareLaunch};
