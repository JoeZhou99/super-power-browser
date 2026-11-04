// A responsive debugging port does not prove the user can see the window.
// Only inspect windows owned by the exact process launched for this shop.
let sharedApi;
class NativeWindow {
  load(){
    if(sharedApi)return sharedApi;
    if(this.api)return this.api;
    const koffi=require('koffi'),user32=koffi.load('user32.dll');
    const fn=(name,result,args)=>user32.func('__stdcall',name,result,args);
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
  reveal(pid){
    if(process.platform!=='win32')return true;
    const window=this.windows(pid).find(w=>w.title.includes('SuperPower'));if(!window)return false;
    const a=this.load();
    if(window.minimized)a.show(window.handle,9);
    else if(!window.visible)a.show(window.handle,5);
    // Bring forward without making the shop permanently topmost or moving it.
    a.position(window.handle,null,0,0,0,0,0x43);
    a.foreground(window.handle);
    return a.visible(window.handle)&&!a.minimized(window.handle);
  }
}
module.exports={NativeWindow};
