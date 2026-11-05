const fs=require('node:fs/promises');
const {createReadStream}=require('node:fs');
const path=require('node:path');
const {createHash,randomUUID}=require('node:crypto');
const AdmZip=require('adm-zip');
const {cancelled,check,waitFor,pause}=require('./Cancellation');

const versionPattern=/^\d{2,3}(?:\.\d+){0,3}$/;
function inside(root,name){
  if(typeof name!=='string'||!name||/[\x00-\x1f:]/.test(name)||name.includes('\\')||name.split('/').some(part=>!part||/[. ]$/.test(part)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))throw new Error('内核资源路径不合法');
  const target=path.resolve(root,name),relative=path.relative(root,target);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('内核资源路径越界');
  return target;
}
async function hash(file,algorithm='sha256',signal){
  const digest=createHash(algorithm);
  check(signal);
  for await(const chunk of createReadStream(file,{signal}))digest.update(chunk);
  return digest.digest('hex');
}
async function exists(file){try{await fs.access(file);return true;}catch(error){if(error.code==='ENOENT')return false;throw error;}}
async function plainPath(root,file){
  const relative=path.relative(root,file);
  if(relative.startsWith('..')||path.isAbsolute(relative))throw new Error('内核文件越界');
  let current=root;
  for(const segment of ['',...relative.split(path.sep).filter(Boolean)]){
    if(segment)current=path.join(current,segment);
    const stat=await fs.lstat(current);
    if(stat.isSymbolicLink())throw new Error('内核目录不能包含链接或重解析目录');
  }
}
function normalizeCatalog(raw){
  if(Array.isArray(raw?.kernels))return raw.kernels;
  // Compatibility with the old chromium_list_v5 response, including platform gates.
  const list=raw?.contents?.win;
  if(!Array.isArray(list))throw new Error('内核版本清单格式不正确');
  return list.map(item=>({version:String(item.version),platform:'win32',arch:'x64',protocol:'legacy',executable:'zhanfubrowser.exe',downloadUrl:item.link,md5:item.md5,recommended:!!item.isRecommend,disabled:!!item.disableWin,requiresLegacyAuthorization:true}));
}
function validateDescriptor(entry){
  if(!entry||!versionPattern.test(String(entry.version)))throw new Error('内核版本不合法');
  if(!['legacy','fingerprint-chromium/1'].includes(entry.protocol))throw new Error('该内核配置协议尚未接通');
  inside(path.resolve('.'),entry.executable);
  if(entry.sha256&&!/^[a-f0-9]{64}$/i.test(entry.sha256))throw new Error('内核 SHA-256 不合法');
  if(entry.md5&&!/^[a-f0-9]{32}$/i.test(entry.md5))throw new Error('内核 MD5 不合法');
  if(!entry.sha256&&!entry.md5)throw new Error('内核资源未提供校验值');
  if(!entry.downloadDescriptorPath&&!entry.downloadPath&&!entry.downloadUrl)throw new Error('内核资源未配置下载地址');
  return {...entry,version:String(entry.version)};
}
async function verifyDirectory(root,entry,signal){
  try{
    check(signal);
    await plainPath(root,inside(root,entry.executable));
    let records=entry.files,algorithm='sha256';
    if(!records){
      if(entry.protocol!=='legacy')return false;
      await plainPath(root,path.join(root,'checkmd5.txt'));
      const rows=(await fs.readFile(path.join(root,'checkmd5.txt'),'utf8')).trim().split(/\r?\n/);
      records={};algorithm='md5';
      for(const row of rows){const [name,value,...rest]=row.split(',');if(rest.length||!name||!/^[a-f0-9]{32}$/i.test(value?.trim()||''))return false;records[name.trim().replaceAll('\\','/')]=value.trim();}
    }
    if(!records||Array.isArray(records)||typeof records!=='object'||!Object.keys(records).length||!Object.hasOwn(records,entry.executable))return false;
    const files=Object.entries(records);let index=0;
    const checked=await Promise.allSettled(Array.from({length:Math.min(4,files.length)},async()=>{
      for(;;){const record=files[index++];if(!record)return;const [name,expected]=record;
        if(typeof expected!=='string'||!(algorithm==='sha256'?/^[a-f0-9]{64}$/i:/^[a-f0-9]{32}$/i).test(expected))throw new Error('内核文件校验表不合法');
        const file=inside(root,name);await plainPath(root,file);
        if(await hash(file,algorithm,signal)!==expected.toLowerCase())throw new Error('内核文件校验失败');
      }
    }));
    check(signal);if(checked.some(result=>result.status==='rejected'))return false;
    const required=entry.protocol==='legacy'?(Number(entry.version.split('.')[0])<=140?['locales','MEIPreload']:await fs.readFile(path.join(root,'checkfolder.txt'),'utf8').then(text=>text.split(/\r?\n/).map(s=>s.trim()).filter(Boolean)).catch(error=>{if(error.code==='ENOENT')return [];throw error;})):(entry.requiredDirectories||[]);
    for(const name of required){const dir=inside(root,name);await plainPath(root,dir);if(!(await fs.readdir(dir)).length)return false;}
    return true;
  }catch(error){check(signal);return false;}
}

class KernelManager{
  constructor(config,api,{inUse=()=>false,fetcher=fetch}={}){this.root=config.corePath;this.api=api;this.inUse=inUse;this.fetcher=fetcher;this.pending=new Map();this.catalog=null;}
  async list(signal){
    const entries=normalizeCatalog(await this.api.request('/runtime/kernels',{signal}));
    return entries.filter(item=>(item.platform||'win32')===process.platform&&(item.arch||'x64')===process.arch);
  }
  async ensure(version,progress=()=>{},{signal}={}){
    check(signal);
    version=String(version);if(!versionPattern.test(version))throw new Error('内核版本不合法');
    let task=this.pending.get(version);
    if(task?.controller.signal.aborted){await waitFor(task.promise.catch(()=>{}),signal);task=this.pending.get(version);}
    if(!task){
      task={listeners:new Set(),state:null,controller:new AbortController()};
      const report=state=>{task.state={version,...state};for(const listener of task.listeners)listener.progress(task.state);};
      task.promise=Promise.resolve().then(()=>this.install(version,report,task.controller.signal)).finally(()=>{if(this.pending.get(version)===task)this.pending.delete(version);});
      this.pending.set(version,task);
    }
    const subscription={progress};task.listeners.add(subscription);
    try{if(task.state)progress(task.state);return await waitFor(task.promise,signal);}
    finally{task.listeners.delete(subscription);if(!task.listeners.size&&!task.controller.signal.aborted)task.controller.abort(cancelled());}
  }
  async cancelAll(){const tasks=[...this.pending.values()];for(const task of tasks)task.controller.abort(cancelled());await Promise.allSettled(tasks.map(task=>task.promise));}
  async acquire(version,report,signal){
    const locks=path.join(this.root,'.locks');await fs.mkdir(locks,{recursive:true});await plainPath(this.root,locks);
    const file=path.join(locks,version+'.json'),owner=randomUUID(),deadline=Date.now()+15*60*1000;
    while(Date.now()<deadline){
      check(signal);
      try{const handle=await fs.open(file,'wx');try{await handle.writeFile(JSON.stringify({pid:process.pid,owner,startedAt:Date.now()}));}finally{await handle.close();}
        return async()=>{try{if(JSON.parse(await fs.readFile(file,'utf8')).owner===owner)await fs.unlink(file);}catch(error){if(error.code!=='ENOENT')throw error;}};
      }catch(error){if(error.code!=='EEXIST')throw error;}
      try{
        const lock=JSON.parse(await fs.readFile(file,'utf8'));let alive=true;
        if(Number.isInteger(lock.pid)&&lock.pid>0){try{process.kill(lock.pid,0);}catch(error){if(error.code==='ESRCH')alive=false;}}
        else throw new Error('内核安装锁无效，请检查安装状态');
        if(!alive){const current=JSON.parse(await fs.readFile(file,'utf8'));if(current.owner===lock.owner)await fs.unlink(file);continue;}
      }catch(error){if(error.code==='ENOENT')continue;if(!(error instanceof SyntaxError))throw error;}
      report({stage:'waiting',percent:null,message:'等待其他进程准备内核'});await pause(500,signal);
    }
    throw new Error('等待内核安装超时');
  }
  async download(entry,file,report,signal){
    const algorithm=entry.sha256?'sha256':'md5',expected=(entry.sha256||entry.md5).toLowerCase();
    check(signal);if(await exists(file)&&await hash(file,algorithm,signal)===expected)return;
    const ownOrigin=new URL(this.api.base).origin;
    const partial=file+'.partial';
    for(let attempt=0;attempt<2;attempt++){
      check(signal);
      let location=entry;
      if(entry.downloadDescriptorPath){
        if(!/^\/runtime\/kernels\/\d{2,3}(?:\.\d+){0,3}\/download$/.test(entry.downloadDescriptorPath))throw new Error('内核下载配置地址不合法');
        location=await this.api.request(entry.downloadDescriptorPath,{signal});
        if(location.sha256!==entry.sha256||location.archiveBytes!==entry.archiveBytes)throw new Error('内核下载资源与选定版本不一致');
      }
      const url=location.downloadPath?new URL('/api'+location.downloadPath,this.api.base):new URL(location.downloadUrl);
      if(location.downloadPath&&(!/^\/runtime\/kernels\/\d{2,3}(?:\.\d+){0,3}\/archive$/.test(location.downloadPath)||url.origin!==ownOrigin))throw new Error('内核下载地址不合法');
      if(url.username||url.password||url.hash)throw new Error('内核下载地址不能包含用户凭据或片段');
      if(url.protocol!=='https:'&&!(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)))throw new Error('内核下载必须使用 HTTPS');
      const offset=await fs.stat(partial).then(stat=>stat.size).catch(error=>{if(error.code==='ENOENT')return 0;throw error;});
      const headers={};if(url.origin===ownOrigin&&location.downloadPath)headers.Authorization=`Bearer ${this.api.token}`;
      if(offset)headers.Range=`bytes=${offset}-`;
      report({stage:'downloading',percent:null,message:offset?'继续下载内核':'正在下载内核'});
      const timeout=AbortSignal.timeout(10*60*1000);
      const response=await this.fetcher(url,{headers,signal:signal?AbortSignal.any([signal,timeout]):timeout,redirect:'error'});
      if([401,403].includes(response.status)&&entry.downloadDescriptorPath&&!location.downloadPath&&attempt===0){await response.body?.cancel();continue;}
      if(response.status===416){await response.body?.cancel();await fs.rm(partial,{force:true});continue;}
      if(!response.ok||!response.body)throw new Error(`内核下载失败（HTTP ${response.status}）`);
      const resume=response.status===206;
      const range=response.headers.get('content-range')?.match(/^bytes (\d+)-(\d+)\/(\d+)$/);
      if(resume&&(!range||Number(range[1])!==offset)){await response.body.cancel();throw new Error('内核下载续传位置不正确');}
      const total=resume?Number(range[3]):Number(response.headers.get('content-length'))||null;
      let received=resume?offset:0,lastReport=0;
      const handle=await fs.open(partial,resume?'a':'w');
      try{for await(const chunk of response.body){check(signal);received+=chunk.length;if(received>2*1024**3)throw new Error('内核压缩包超过大小限制');let written=0;while(written<chunk.length){const result=await handle.write(chunk,written,chunk.length-written);written+=result.bytesWritten;}
        if(Date.now()-lastReport>=200){report({stage:'downloading',percent:total?Math.min(100,Math.floor(received/total*100)):null,message:'正在下载内核'});lastReport=Date.now();}
      }}finally{await handle.close();}
      if(total&&received!==total)throw new Error('内核下载不完整，可重新打开店铺继续下载');
      report({stage:'verifying',percent:null,message:'校验内核压缩包'});
      if(await hash(partial,algorithm,signal)!==expected){await fs.rm(partial,{force:true});if(attempt===0)continue;throw new Error('内核压缩包校验失败');}
      check(signal);
      await fs.rename(partial,file);return;
    }
    throw new Error('内核下载未完成');
  }
  async install(version,report,signal){
    check(signal);
    if(process.platform!=='win32'||process.arch!=='x64')throw new Error('当前启动适配器仅支持 Windows x64');
    report({stage:'checking',percent:null,message:'检查内核版本与文件'});
    const selected=(await this.list(signal)).find(item=>String(item.version)===version&&!item.disabled);
    check(signal);
    if(!selected)throw new Error(`内核 ${version} 尚未发布或已停用，请选择资源清单中的版本`);
    const entry=validateDescriptor(selected);
    await fs.mkdir(this.root,{recursive:true});await plainPath(this.root,this.root);
    const target=inside(this.root,version);
    const release=await this.acquire(version,report,signal);let stage;
    try{
      if(await verifyDirectory(target,entry,signal)){report({stage:'ready',percent:100,message:'内核已就绪'});return {...entry,executable:inside(target,entry.executable)};}
      if(this.inUse(version))throw new Error('内核需要修复，请先关闭使用该版本的店铺');
      const downloads=path.join(this.root,'.downloads');await fs.mkdir(downloads,{recursive:true});await plainPath(this.root,downloads);
      const archive=path.join(downloads,version+'-'+(entry.sha256||entry.md5).toLowerCase()+'.zip');
      await this.download(entry,archive,report,signal);check(signal);
      report({stage:'extracting',percent:null,message:'正在解压内核'});
      stage=path.join(this.root,`.install-${version}-${randomUUID()}`);await fs.mkdir(stage);
      const zip=new AdmZip(archive);let bytes=0;const seen=new Set();
      for(const file of zip.getEntries()){
        const name=file.entryName.replace(/\/$/,'');if(!name)continue;
        inside(stage,name);const key=name.toLowerCase();if(seen.has(key))throw new Error('内核压缩包包含重复文件');seen.add(key);
        if(((file.attr>>>16)&0xf000)===0xa000)throw new Error('内核压缩包不能包含符号链接');
        bytes+=file.header.size;if(bytes>4*1024**3)throw new Error('内核解压大小超过限制');
      }
      // AdmZip performs decompression synchronously; yielding before it exposes the stage to the UI.
      await pause(0,signal);zip.extractAllTo(stage,false);check(signal);
      report({stage:'verifying',percent:null,message:'校验内核文件完整性'});
      if(!await verifyDirectory(stage,entry,signal))throw new Error('解压后的内核文件不完整或校验失败');
      await fs.writeFile(path.join(stage,'.spb-installation.json'),JSON.stringify({version,protocol:entry.protocol,archiveHash:entry.sha256||entry.md5,installedAt:new Date().toISOString(),requiresLegacyAuthorization:entry.protocol==='legacy'}),{mode:0o600});
      const previous=path.join(this.root,`.previous-${version}-${randomUUID()}`),hadPrevious=await exists(target);
      check(signal);
      if(hadPrevious){await plainPath(this.root,target);await fs.rename(target,previous);}
      try{await fs.rename(stage,target);stage=null;}catch(error){if(hadPrevious)await fs.rename(previous,target);throw error;}
      if(hadPrevious)await fs.rm(previous,{recursive:true,force:true});
      report({stage:'ready',percent:100,message:'内核已就绪'});
      return {...entry,executable:inside(target,entry.executable)};
    }finally{try{if(stage)await fs.rm(stage,{recursive:true,force:true});}finally{await release();}}
  }
}
module.exports={KernelManager,normalizeCatalog,validateDescriptor,verifyDirectory,hash,inside};
