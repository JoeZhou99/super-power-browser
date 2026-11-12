const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {createHash,randomUUID}=require('node:crypto');

// This cache is a local ranking hint, never authorization to open the gate.
// Only hashes and measurement summaries are persisted; no proxy credentials.
class ProxyRouteCache{
  constructor(directory,{interfaces=os.networkInterfaces,now=Date.now}={}){this.directory=path.join(directory,'route-measurements');this.interfaces=interfaces;this.now=now;}
  key(identity){
    const network=Object.entries(this.interfaces()).flatMap(([name,items])=>(items||[]).filter(item=>!item.internal).map(item=>[name,item.family,item.address,item.netmask,item.mac])).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)));
    return createHash('sha256').update(JSON.stringify([identity,network])).digest('hex');
  }
  async load(identity){
    try{const value=JSON.parse(await fs.readFile(path.join(this.directory,this.key(identity)+'.json'),'utf8'));
      if(value.version!==1||!Number.isFinite(value.at)||this.now()-value.at>300000||value.at>this.now()+5000)return null;
      return value;
    }catch{return null;}
  }
  async save(identity,{preferredId,health}){
    const file=path.join(this.directory,this.key(identity)+'.json'),temporary=file+'.'+randomUUID()+'.tmp';
    try{
      await fs.mkdir(this.directory,{recursive:true});
      const safe=health.slice(0,9).map(({id,available,pathLatencyMs,pathMeasuredAt,entryLatencyMs,entryMeasuredAt})=>({id,available,pathLatencyMs,pathMeasuredAt,entryLatencyMs,entryMeasuredAt}));
      await fs.writeFile(temporary,JSON.stringify({version:1,at:this.now(),preferredId,health:safe}),{mode:0o600,flag:'wx'});
      await fs.rename(temporary,file);
    }catch{await fs.rm(temporary,{force:true}).catch(()=>{});}
  }
}
module.exports={ProxyRouteCache};
