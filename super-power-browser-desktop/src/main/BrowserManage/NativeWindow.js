// A responsive debugging port does not prove the user can see the window.
// Only inspect windows owned by the exact process launched for this shop.
let sharedApi;
class NativeWindow {
  load(){
    if(sharedApi)return sharedApi;
    if(this.api)return this.api;
    const koffi=require('koffi'),user32=koffi.load('user32.dll');
    const fn=(name,result,args)=>user32.func('__stdcall',name,result,args);
    const flashInfo=koffi.struct('SPBFlashInfo',{cbSize:'uint32',hwnd:'void *',dwFlags:'uint32',uCount:'uint32',dwTimeout:'uint32'});
    this.api={koffi,
      enumWindows:fn('EnumWindows','bool',['void *','intptr_t']),
      ownerPid:fn('GetWindowThreadProcessId','uint32',['void *','uint32 *']),
      owner:fn('GetWindow','void *',['void *','uint32']),
      className:fn('GetClassNameW','int',['void *','void *','int']),
      title:fn('GetWindowTextW','int',['void *','void *','int']),
      visible:fn('IsWindowVisible','bool',['void *']),
      minimized:fn('IsIconic','bool',['void *']),
      show:fn('ShowWindow','bool',['void *','int']),
      foreground:fn('SetForegroundWindow','bool',['void *']),
      position:fn('SetWindowPos','bool',['void *','void *','int','int','int','int','uint32']),
      loadImage:fn('LoadImageW','void *',['void *','void *','uint32','int','int','uint32']),
      setIcon:fn('SendMessageW','intptr_t',['void *','uint32','uintptr_t','void *']),
      destroyIcon:fn('DestroyIcon','bool',['void *']),
      flashInfo,flash:fn('FlashWindowEx','bool',[koffi.pointer(flashInfo)]),
      playSound:koffi.load('winmm.dll').func('__stdcall','PlaySoundW','bool',['void *','void *','uint32']),
      callback:koffi.proto('__stdcall','SPBWindowEnum','bool',['void *','intptr_t'])
    };sharedApi=this.api;return this.api;
  }
  windows(pid){
    if(!Number.isInteger(pid)||pid<=0)return [];
    const a=this.load(),result=[];
    const callback=a.koffi.register(handle=>{
      const process=Buffer.alloc(4);a.ownerPid(handle,process);
      if(process.readUInt32LE(0)!==pid||a.owner(handle,4))return true;
      const name=Buffer.alloc(512),title=Buffer.alloc(2048);
      a.className(handle,name,256);a.title(handle,title,1024);
      const className=name.toString('utf16le').split('\0')[0],text=title.toString('utf16le').split('\0')[0];
      if(className==='Chrome_WidgetWin_1'&&text)result.push({handle,title:text,visible:a.visible(handle),minimized:a.minimized(handle)});
      return true;
    },a.koffi.pointer(a.callback));
    try{a.enumWindows(callback,0);}finally{a.koffi.unregister(callback);}
    return result;
  }
  reveal(pid,iconFile){
    if(process.platform!=='win32')return true;
    const owned=this.windows(pid),window=owned.find(w=>w.title.includes('SuperPower'))||owned[0];if(!window)return false;
    const a=this.load();
    if(iconFile){
      this.icons??=new Map();let icon=this.icons.get(pid);
      if(!icon){icon=a.loadImage(null,Buffer.from(iconFile+'\0','utf16le'),1,0,0,0x50);if(icon)this.icons.set(pid,icon);}
      if(icon){a.setIcon(window.handle,0x80,0,icon);a.setIcon(window.handle,0x80,1,icon);}
    }
    if(window.minimized)a.show(window.handle,9);
    else if(!window.visible)a.show(window.handle,5);
    // Bring forward without making the shop permanently topmost or moving it.
    a.position(window.handle,null,0,0,0,0,0x43);
    a.foreground(window.handle);
    return a.visible(window.handle)&&!a.minimized(window.handle);
  }
  release(pid){const icon=this.icons?.get(pid);if(icon){this.load().destroyIcon(icon);this.icons.delete(pid);}}
  flash(pid){
    const window=this.windows(pid).find(w=>w.visible);if(!window)throw new Error('未找到该店铺的浏览器窗口');
    this.flashTimes??=new Map();const now=Date.now(),times=(this.flashTimes.get(pid)||[]).filter(t=>now-t<1000);
    if(times.length>=5)return {skipped:true,reason:'rate-limit'};
    times.push(now);this.flashTimes.set(pid,times);
    const a=this.load();a.flash({cbSize:a.koffi.sizeof(a.flashInfo),hwnd:window.handle,dwFlags:3,uCount:3,dwTimeout:0});
    return {flashed:true};
  }
  async playNotification(file){
    // Serialize notifications, as in the old desktop's sound mutex.
    const previous=this.soundQueue||Promise.resolve();
    const playing=previous.catch(()=>{}).then(async()=>{
      await require('node:fs/promises').access(file);
      if(!this.load().playSound(Buffer.from(file+'\0','utf16le'),null,0x20003))throw new Error('消息提示音播放失败');
      await new Promise(resolve=>setTimeout(resolve,650));return {played:true};
    });
    this.soundQueue=playing;return playing;
  }
}
module.exports={NativeWindow};
