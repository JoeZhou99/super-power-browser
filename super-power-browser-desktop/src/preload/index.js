const {contextBridge,ipcRenderer}=require('electron');
const methods=['setSession','openBrowser','closeBrowser','closeAll','browserStates','settings','clearCache','checkUpdate','checkProxy'];
contextBridge.exposeInMainWorld('api',Object.fromEntries(methods.map(name=>[name,(...args)=>ipcRenderer.invoke(`spb:${name}`,...args)])));
