const fs=require('node:fs/promises');
const path=require('node:path');
const {randomUUID}=require('node:crypto');

// Host-level preference: keep background work running, while allowing the display to sleep.
class PowerPreference {
  constructor(file,blocker){this.file=file;this.blocker=blocker;this.id=null;this.enabled=true;this.pending=Promise.resolve();this.disposed=false;}
  async initialize(){
    try{
      const saved=JSON.parse(await fs.readFile(this.file,'utf8'));
      if(typeof saved.preventSleepWhileRunning!=='boolean')throw new Error('防休眠设置格式不正确');
      this.enabled=saved.preventSleepWhileRunning;
    }catch(error){if(error.code!=='ENOENT')throw error;}
    this.apply(this.enabled);
    return this;
  }
  apply(enabled){
    if(enabled&&this.id===null)this.id=this.blocker.start('prevent-app-suspension');
    else if(!enabled&&this.id!==null){this.blocker.stop(this.id);this.id=null;}
    this.enabled=enabled;
  }
  set(enabled){
    if(typeof enabled!=='boolean')return Promise.reject(new Error('防休眠设置必须为布尔值'));
    const operation=this.pending.then(async()=>{
      if(this.disposed)throw new Error('客户端正在退出');
      const previous=this.enabled,temp=`${this.file}.${randomUUID()}.tmp`;
      this.apply(enabled);
      try{
        await fs.mkdir(path.dirname(this.file),{recursive:true});
        await fs.writeFile(temp,JSON.stringify({preventSleepWhileRunning:enabled}),{mode:0o600});
        await fs.rename(temp,this.file);
        return {preventSleepWhileRunning:this.enabled};
      }catch(error){this.apply(previous);throw error;}
      finally{await fs.rm(temp,{force:true}).catch(()=>{});}
    });
    this.pending=operation.catch(()=>{});
    return operation;
  }
  async dispose(){
    this.disposed=true;
    await this.pending;
    if(this.id!==null){this.blocker.stop(this.id);this.id=null;}
  }
}
module.exports={PowerPreference};
