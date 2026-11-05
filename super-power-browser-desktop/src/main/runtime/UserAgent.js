function userAgentData(ua){
  const fullVersion=ua.match(/Chrome\/([\d.]+)/)?.[1];if(!fullVersion)throw new Error('UA 必须包含 Chrome 版本');
  const major=Number(fullVersion.split('.')[0]);let platform='Windows',platformVersion='10.0.0',architecture='x86',bitness=/Win64|x64|WOW64/.test(ua)?'64':'32',mobile=false,model='';
  if(/Android/i.test(ua)){platform='Android';platformVersion=[...(ua.match(/Android\s+([\d.]+)/)?.[1]||'13').split('.'),'0','0'].slice(0,3).join('.');architecture='arm';bitness='64';mobile=true;model=ua.match(/Android[^;)]*;\s*([^;)]+)/)?.[1]||'';}
  else if(/Macintosh/.test(ua)){platform='macOS';platformVersion=(ua.match(/Mac OS X\s+([\d_]+)/)?.[1]||'10_15_7').replaceAll('_','.');bitness='64';}
  else if(/Windows NT/.test(ua)){const version=ua.match(/Windows NT\s+([\d.]+)/)?.[1]||'10.0';platformVersion=({'6.1':'0.1.0','6.2':'0.2.0','6.3':'0.3.0','10.0':'10.0.0','11.0':'15.0.0'})[version]||version+'.0';}
  else throw new Error('仅支持 Windows、Mac 和 Android UA');
  return {architecture,bitness,brands:[{brand:'Google Chrome',version:major,fullVersion},{brand:'Chromium',version:major,fullVersion},{brand:'Not/A)Brand',version:'24',fullVersion:'24.0.0.0'}],mobile,model,platform,platformVersion,uaFullVersion:fullVersion,wow64:/WOW64/.test(ua)};
}
module.exports={userAgentData};
