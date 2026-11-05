const fs=require('node:fs/promises');
const path=require('node:path');
const TEMP=['Cache','Code Cache','GPUCache'];
async function sizeOf(dir){let size=0;for(const entry of await fs.readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isSymbolicLink())continue;if(entry.isDirectory())size+=await sizeOf(file);else size+=(await fs.stat(file)).size;}return size;}
async function cacheFolders(profiles){
  const result=[];let entries;
  try{entries=await fs.readdir(profiles,{withFileTypes:true});}catch(e){if(e.code==='ENOENT')return [];throw e;}
  for(const entry of entries){
    if(!entry.isDirectory()||entry.isSymbolicLink())continue;
    const shop=path.join(profiles,entry.name),boundary=await fs.realpath(shop),versions=await fs.readdir(shop,{withFileTypes:true});
    const roots=[shop,...versions.filter(v=>v.isDirectory()&&!v.isSymbolicLink()&&/^\d{2,3}(?:\.\d+){0,3}$/.test(v.name)).map(v=>path.join(shop,v.name))];
    for(const root of roots)for(const prefix of ['', 'Default'])for(const name of TEMP){
      const dir=path.join(root,prefix,name);
      try{const real=await fs.realpath(dir);if(!real.startsWith(boundary+path.sep))continue;const stat=await fs.lstat(dir);if(!stat.isDirectory()||stat.isSymbolicLink())continue;result.push({id:entry.name,path:dir,bytes:await sizeOf(dir)});}catch(e){if(e.code!=='ENOENT')throw e;}
    }
  }
  return result;
}
async function clearCache(profiles,active){let removed=0;const skipped=[];for(const dir of await cacheFolders(profiles)){if(active.has(dir.id)){skipped.push(dir.path);continue;}try{await fs.rm(dir.path,{recursive:true});removed+=dir.bytes;}catch{skipped.push(dir.path);}}return {removed,skipped};}
module.exports={cacheFolders,clearCache};
