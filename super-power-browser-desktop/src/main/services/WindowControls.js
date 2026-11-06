function registerWindowControls(window,handle){
  const state=()=>({maximized:window.isMaximized(),fullScreen:window.isFullScreen()});
  const publish=()=>{if(!window.isDestroyed())window.webContents.send('spb:windowState',state());};
  handle('windowState',state);
  handle('windowControl',action=>{
    if(!['minimize','toggleMaximize','close'].includes(action))throw new Error('不支持的窗口操作');
    if(action==='minimize')window.minimize();
    if(action==='toggleMaximize'){
      if(window.isFullScreen())window.setFullScreen(false);
      else if(window.isMaximized())window.unmaximize();
      else window.maximize();
    }
    // Keep the main window's existing shutdown handler responsible for closing shops and AI.
    if(action==='close')window.close();
  });
  for(const event of ['maximize','unmaximize','enter-full-screen','leave-full-screen'])window.on(event,publish);
}
module.exports={registerWindowControls};
