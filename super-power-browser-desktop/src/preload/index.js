const {contextBridge,ipcRenderer}=require('electron');
const methods=['setSession','openBrowser','closeBrowser','closeAll','browserStates','browserProgress','settings','clearCache','checkUpdate','checkProxy'];
contextBridge.exposeInMainWorld('api',{
  ...Object.fromEntries(methods.map(name=>[name,(...args)=>ipcRenderer.invoke(`spb:${name}`,...args)])),
  onLoggedOut(callback){if(typeof callback!=='function')throw new Error('回调不合法');const handler=()=>callback();ipcRenderer.on('spb:loggedOut',handler);return ()=>ipcRenderer.removeListener('spb:loggedOut',handler);}
});
