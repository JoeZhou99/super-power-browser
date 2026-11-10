const {app,BrowserWindow,ipcMain,dialog}=require('electron');
const path=require('node:path');
const {configuration}=require('./model/InitData');
const {ApiClient}=require('./services/ApiClient');
const {serveWeb}=require('./services/WebServer');
const {registerWindowControls}=require('./services/WindowControls');
const {AiHost}=require('./services/AiHost');
const {BrowserHost}=require('./BrowserManage/BrowserHost');
const {ProxyChecks}=require('./services/ProxyChecks');
const {closeAllProxyRuntimes}=require('./services/ProxyRuntime');
const {cacheFolders,clearCache}=require('./module/SettingsModule');
app.setName('super-power-browser');
if(process.platform==='win32')app.setAppUserModelId('com.superpower.browser');
app.setPath('userData',!app.isPackaged&&process.env.SPB_USER_DATA?path.resolve(process.env.SPB_USER_DATA):path.join(app.getPath('appData'),'super-power-browser'));
if(!app.requestSingleInstanceLock())app.quit();
else app.whenReady().then(async()=>{
  const config=configuration(),api=new ApiClient(config.apiUrl),browsers=new BrowserHost(config,api,{onApplicationAction:applicationAction,onActionError:error=>dialog.showErrorBox('桌面操作失败',error.message)});
  await browsers.recover();
  const local=await serveWeb(app.isPackaged?path.join(process.resourcesPath,'web'):path.join(config.resources,'resources/web'),config.apiUrl);
  const pageUrl=config.webUrl||local.url;
  const window=new BrowserWindow({width:1440,height:940,minWidth:1100,minHeight:720,title:'SuperPower Browser',icon:path.join(config.resources,'branding/app.ico'),backgroundColor:'#f4f6fb',frame:false,webPreferences:{preload:path.join(__dirname,'../preload/index.js'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  window.setMenuBarVisibility(false);
  const origin=new URL(pageUrl).origin;
  const ai=new AiHost({api,browsers,config,window,origin});
  window.webContents.setWindowOpenHandler(()=>({action:'deny'}));
  window.webContents.on('will-navigate',(event,url)=>{if(new URL(url).origin!==origin)event.preventDefault();});
  function handle(name,fn){ipcMain.handle(`spb:${name}`,(event,...args)=>{if(event.sender!==window.webContents||!event.senderFrame||new URL(event.senderFrame.url).origin!==origin)throw new Error('请求来源不合法');return fn(...args);});}
  registerWindowControls(window,handle);
  handle('setSession',async token=>{if(typeof token!=='string'||token.length>500)throw new Error('登录凭据不合法');if(api.token!==token){await proxyChecks.suspend();try{await ai.stop();if(api.token)await browsers.closeAll();await closeAllProxyRuntimes();api.token=token;}finally{proxyChecks.resume();}}});
  handle('openBrowser',async id=>{try{const result=await browsers.open(id);window.webContents.send('spb:shopStatus',await ai.connection(id));return result;}catch(error){window.webContents.send('spb:shopStatus',{browserId:id,isopen:false});throw error;}});handle('closeBrowser',id=>browsers.close(id));handle('closeAll',()=>browsers.closeAll());handle('browserStates',()=>browsers.states());
  handle('runtimePlatform',()=>({platform:process.platform,arch:process.arch}));
  handle('browserProgress',()=>browsers.progress());
  handle('settings',async()=>({version:app.getVersion(),userData:config.profiles,corePath:config.corePath,downloads:config.downloads,cacheBytes:(await cacheFolders(config.profiles)).reduce((n,c)=>n+c.bytes,0)}));
  handle('clearCache',()=>clearCache(config.profiles,new Set([...browsers.running.keys(),...browsers.pending.keys()])));
  handle('checkUpdate',async()=>{const {manifestUrl}=await api.request('/runtime/updates');if(!manifestUrl)throw new Error('尚未配置更新服务');const url=new URL(manifestUrl);if(url.protocol!=='https:')throw new Error('更新地址必须使用 HTTPS');const manifest=await (await fetch(url,{signal:AbortSignal.timeout(10000)})).json();if(!/^\d+\.\d+\.\d+$/.test(manifest.version))throw new Error('更新版本格式不正确');const current=app.getVersion().split('.').map(Number),next=manifest.version.split('.').map(Number);let available=false;for(let i=0;i<3;i++){if(next[i]!==current[i]){available=next[i]>current[i];break;}}return {version:manifest.version,available};});
  const proxyChecks=new ProxyChecks(api,{resources:config.resources});
  handle('checkProxy',id=>proxyChecks.check(id));
  handle('rotateProxy',id=>proxyChecks.changeIp(id));
  const monitor=setInterval(()=>{browsers.enforceAccess().catch(()=>{});ai.enforceAccess().catch(()=>{});},10000);
  let quitting=false,shutdown=null,applicationTask=null;
  async function finishQuit(relaunch=false){
    if(shutdown)return shutdown;
    shutdown=(async()=>{await proxyChecks.suspend();await ai.stop();await browsers.closeAll();await closeAllProxyRuntimes();quitting=true;clearInterval(monitor);local.server.close();if(relaunch)app.relaunch();window.destroy();app.quit();})();
    try{await shutdown;}catch(error){shutdown=null;proxyChecks.resume();throw error;}
  }
  async function applicationAction(action){
    if(applicationTask)return applicationTask;
    applicationTask=(async()=>{
      if(action==='LoginOut'){
        await dialog.showMessageBox(window,{type:'error',buttons:['确认'],defaultId:0,title:'登录状态提示',message:'登录状态异常',detail:'你的登录信息已经失效，请重新登录。'});
        await proxyChecks.suspend();await browsers.closeAll();await closeAllProxyRuntimes();
        try{if(api.token)await api.request('/auth/logout',{method:'POST'});}catch(error){if(![401,403].includes(error.status))throw error;}
        finally{await ai.stop();api.token='';window.webContents.send('spb:loggedOut');window.show();}
      }else await finishQuit(action==='closeAllMultiOpen');
    })();
    try{await applicationTask;}finally{applicationTask=null;if(action==='LoginOut')proxyChecks.resume();}
  }
  window.on('close',event=>{if(quitting)return;event.preventDefault();finishQuit().catch(error=>dialog.showErrorBox('浏览器尚未关闭',error.message));});
  app.on('second-instance',()=>{if(window.isMinimized())window.restore();window.show();window.focus();});
  await window.loadURL(pageUrl);
}).catch(error=>{dialog.showErrorBox('客户端启动失败',error.message);app.quit();});
