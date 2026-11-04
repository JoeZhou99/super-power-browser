/** 从旧 RuxToSbp 提取的核心字段映射，环境标识来自后端持久化 seed。 */
const {applyFingerprint}=require('./FingerprintConfig');
const {pathToFileURL}=require('node:url');
const path=require('node:path');
function translate(environment,{profile,proxyUrl,plugins,debugPort,downloads,pipeName,iconPath,apiUrl}){
  const fp=environment.fingerprint;
  const language=fp.language==='auto'?(environment.proxy.language||''):fp.language;
  const timezone=fp.timezone==='auto'?(environment.proxy.timezone||''):fp.timezone;
  if(!language||!timezone)throw new Error('设备未提供 IP 对应的语言与时区，请在店铺指纹配置中手工选择');
  const id=environment.id;
  const config={run_type:4,error_log_path:profile,browser_title:`${environment.name} · SuperPower`,environment_key:environment.fingerprintSeed,
    ipc:{is_pipe:true,from_client_pipe:`SPB_${id}`,to_client_pipe:pipeName||`SPB_CORE_${process.pid}`,rnclient_window_name:id,browser_window_name:id,to_client:id,from_client:id},
    cookies:{value_encrypt:true},launcher_page:'about:blank',webdriver:false,can_webdriver:true,is_DisableExtensionOnStartUp:false,
    is_webrtc_enable:fp.webRtc!=='disabled',webrtc_policy:fp.webRtc==='real'?0:3,
    time_zone:{id:timezone},accept_languages:language,intl:{accept_languages:language,selected_languages:language},
    cmd_line:{'proxy-server':proxyUrl,'proxy-bypass-list':'127.0.0.1;localhost;[::1]','remote-debugging-port':String(debugPort),'remote-debugging-address':'127.0.0.1','disable-quic':'','load-extension':plugins.join(','),'lang':language},
    address_bar_custom:[],native_messaging:[],externally_connectable:{ids:[]},resolve_dns:0,
    custom_password_manage_enable:false,download:{default_directory:downloads}};
  if(fp.webgl===false)config.cmd_line['disable-webgl']='';
  const system=({Windows:'Windows NT 10.0; Win64; x64',Mac:'Macintosh; Intel Mac OS X 10_15_7',Android:'Linux; Android 13; Pixel 7'})[fp.os||'Windows'];
  if(!system)throw new Error('不支持的指纹系统');
  config.cmd_line['user-agent']=`Mozilla/5.0 (${system}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${environment.kernelVersion}.0.0.0 Safari/537.36`;
  if(fp.userAgent){if(typeof fp.userAgent!=='string'||fp.userAgent.length>1000||/[\r\n]/.test(fp.userAgent))throw new Error('User Agent 格式不正确');config.cmd_line['user-agent']=fp.userAgent;}
  if(!/^\d{3,4}x\d{3,4}$/.test(fp.resolution))throw new Error('分辨率格式不正确');
  config.cmd_line['window-size']=fp.resolution.replace('x',',');
  // 兼容内核使用稳定环境标识；不在每次启动时重新生成随机指纹。
  // This native protocol identifier is required by the licensed kernel, not a product label.
  config.machine='RuxBrowser';
  if(iconPath){config.app_logo=9999;config.icon={9999:iconPath};config.outside_icon=iconPath;}
  const rules=fp.accessRules;
  if(rules?.domains?.length){
    // 与旧版内核 black_white_list 相同。控制页面与出口检测仍需可访问。
    const internal=['127.0.0.1','localhost','myip.ipip.net','lumtest.com','ifconfig.me'];
    if(apiUrl)internal.push(new URL(apiUrl).hostname);
    // 运行中的旧版通过 exception_list 放行内部协议，white_schemes 不足以放行。
    const exceptions=['chrome://','chrome-extension:','chrome-untrusted://print/','about:srcdoc','file://'];
    config.black_white_list={type:rules.mode==='whitelist'?2:1,black_schemes:[],white_schemes:[],
      black_list:rules.mode==='whitelist'?[]:rules.domains,white_list:rules.mode==='whitelist'?[...internal,...rules.domains]:[],exception_list:[...exceptions,...(rules.exceptions||[])],
      tips:pathToFileURL(path.join(profile,'access-blocked.html')).href};
  }
  return applyFingerprint(config,environment);
}
module.exports={translate};
