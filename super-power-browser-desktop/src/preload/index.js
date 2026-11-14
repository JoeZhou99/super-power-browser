const {contextBridge,ipcRenderer}=require('electron');
const methods=['runtimePlatform','runtimeKernels','downloadKernel','windowState','windowControl','setSession','openBrowser','closeBrowser','closeAll','browserStates','browserProgress','settings','setPreventSleep','clearCache','checkUpdate','checkProxy','rotateProxy'];
contextBridge.exposeInMainWorld('api',{
  ...Object.fromEntries(methods.map(name=>[name,(...args)=>ipcRenderer.invoke(`spb:${name}`,...args)])),
  onWindowState(callback){if(typeof callback!=='function')throw new Error('回调不合法');const handler=(_event,state)=>callback(state);ipcRenderer.on('spb:windowState',handler);return ()=>ipcRenderer.removeListener('spb:windowState',handler);},
  onKernelProgress(callback){if(typeof callback!=='function')throw new Error('回调不合法');const handler=(_event,state)=>callback(state);ipcRenderer.on('spb:kernelProgress',handler);return ()=>ipcRenderer.removeListener('spb:kernelProgress',handler);},
  getWebDriverOpenStatus(callback){const handler=(_event,data)=>callback(null,data);ipcRenderer.on('spb:shopStatus',handler);return ()=>ipcRenderer.removeListener('spb:shopStatus',handler);},
  onLoggedOut(callback){if(typeof callback!=='function')throw new Error('回调不合法');const handler=()=>callback();ipcRenderer.on('spb:loggedOut',handler);return ()=>ipcRenderer.removeListener('spb:loggedOut',handler);}
});
