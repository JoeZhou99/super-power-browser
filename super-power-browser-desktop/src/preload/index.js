const {contextBridge,ipcRenderer}=require('electron');
const methods=['runtimePlatform','setSession','openBrowser','closeBrowser','closeAll','browserStates','browserProgress','settings','clearCache','checkUpdate','checkProxy'];
contextBridge.exposeInMainWorld('api',{
  ...Object.fromEntries(methods.map(name=>[name,(...args)=>ipcRenderer.invoke(`spb:${name}`,...args)])),
  getWebDriverOpenStatus(callback){const handler=(_event,data)=>callback(null,data);ipcRenderer.on('spb:shopStatus',handler);return ()=>ipcRenderer.removeListener('spb:shopStatus',handler);},
  onLoggedOut(callback){if(typeof callback!=='function')throw new Error('回调不合法');const handler=()=>callback();ipcRenderer.on('spb:loggedOut',handler);return ()=>ipcRenderer.removeListener('spb:loggedOut',handler);}
});
