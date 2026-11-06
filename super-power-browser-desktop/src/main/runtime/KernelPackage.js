const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const {check}=require('./Cancellation');

function inside(root,name){
  if(typeof name!=='string'||!name||/[\x00-\x1f:]/.test(name)||name.includes('\\')||name.split('/').some(part=>!part||/[. ]$/.test(part)||/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(part)))throw new Error('内核资源路径不合法');
  const target=path.resolve(root,name),relative=path.relative(root,target);
  if(!relative||relative.startsWith('..')||path.isAbsolute(relative))throw new Error('内核资源路径越界');
  return target;
}
function supported(platform,arch){return platform==='win32'&&arch==='x64'||platform==='darwin'&&['x64','arm64'].includes(arch);}
function linkTarget(name,target){
  if(typeof target!=='string'||!target||target.startsWith('/')||/[\\:\x00-\x1f]/.test(target))throw new Error('内核链接目标不合法');
  const resolved=path.posix.normalize(path.posix.join(path.posix.dirname(name),target));
  inside(path.resolve('.'),resolved);return resolved;
}
function validateLayout(files,symlinks={},executableFiles=[],executable){
  if(!files||Array.isArray(files)||typeof files!=='object'||!Object.keys(files).length||Object.keys(files).length>20000)throw new Error('内核文件清单不合法');
  if(!symlinks||Array.isArray(symlinks)||typeof symlinks!=='object'||!Array.isArray(executableFiles))throw new Error('内核链接或权限清单不合法');
  const seen=new Set(),directories=new Set(),links=Object.keys(symlinks);
  for(const name of [...Object.keys(files),...links]){
    inside(path.resolve('.'),name);if(seen.has(name.toLowerCase()))throw new Error('内核包含重复路径');seen.add(name.toLowerCase());
    for(let dir=path.posix.dirname(name);dir!=='.';dir=path.posix.dirname(dir))directories.add(dir);
  }
  for(const name of [...Object.keys(files),...links]){
    if(directories.has(name))throw new Error('内核文件或链接不能作为归档条目的父目录');
  }
  for(const digest of Object.values(files))if(typeof digest!=='string'||!/^[a-f0-9]{64}$/i.test(digest))throw new Error('内核文件校验值不合法');
  const resolve=(name,visited=new Set())=>{
    const parts=name.split('/');
    for(let i=1;i<=parts.length;i++){
      const prefix=parts.slice(0,i).join('/');
      if(!Object.hasOwn(symlinks,prefix))continue;
      if(visited.has(prefix)||visited.size>=40)throw new Error('内核链接存在循环');
      return resolve(path.posix.join(linkTarget(prefix,symlinks[prefix]),...parts.slice(i)),new Set([...visited,prefix]));
    }
    if(!Object.hasOwn(files,name)&&!directories.has(name))throw new Error('内核链接目标不存在');return name;
  };
  for(const name of links)resolve(name);
  for(const name of executableFiles)if(!Object.hasOwn(files,name))throw new Error('可执行权限只能赋予已校验的普通文件');
  if(executable&&!Object.hasOwn(files,executable))throw new Error('内核启动程序未包含在校验清单中');
}
function inspectZip(zip,{platform,arch,executable}={}){
  if(!supported(platform,arch))throw new Error('仅支持 Windows x64、Mac Intel 和 Apple Silicon');
  const files={},symlinks={},executableFiles=[],seen=new Set();let bytes=0;
  for(const entry of zip.getEntries()){
    const name=entry.entryName.replace(/\/$/,'');if(!name)continue;inside(path.resolve('.'),name);
    const key=name.toLowerCase();if(seen.has(key))throw new Error('内核压缩包包含重复文件');seen.add(key);
    bytes+=entry.header.size;if(bytes>4*1024**3)throw new Error('内核解压大小超过限制');
    const mode=entry.attr>>>16,type=mode&0xf000;
    if(type===0xa000){if(platform!=='darwin')throw new Error('Windows 内核不能包含符号链接');symlinks[name]=entry.getData().toString('utf8');}
    else if(entry.isDirectory){if(type&&type!==0x4000)throw new Error('内核目录类型不合法');}
    else{
      if(type&&type!==0x8000)throw new Error('内核包含非普通文件');
      files[name]=createHash('sha256').update(entry.getData()).digest('hex');
      if(platform==='darwin'&&(mode&0o111))executableFiles.push(name);
    }
  }
  validateLayout(files,symlinks,executableFiles,executable);
  // Explicit empty directories must not create descendants below a link/file either.
  for(const entry of zip.getEntries())for(let dir=path.posix.dirname(entry.entryName.replace(/\/$/,''));dir!=='.'&&dir!=='/';dir=path.posix.dirname(dir))if(Object.hasOwn(files,dir)||Object.hasOwn(symlinks,dir))throw new Error('归档条目不能位于链接或文件内部');
  return {files,symlinks,executableFiles};
}
function machArchitectures(data){
  const cpus=new Map([[0x01000007,'x64'],[0x0100000c,'arm64']]);if(data.length<8)return [];
  const magic=data.readUInt32BE(0);
  if(magic===0xcffaedfe)return [cpus.get(data.readUInt32LE(4))].filter(Boolean);
  if(magic===0xfeedfacf)return [cpus.get(data.readUInt32BE(4))].filter(Boolean);
  if(magic!==0xcafebabe&&magic!==0xcafebabf)return [];
  const count=data.readUInt32BE(4),stride=magic===0xcafebabf?32:20;
  if(count>16||8+count*stride>data.length)return [];
  return Array.from({length:count},(_,i)=>cpus.get(data.readUInt32BE(8+i*stride))).filter(Boolean);
}
async function extractZip(zip,root,entry,signal){
  const layout=inspectZip(zip,entry);
  for(const key of ['files','symlinks']){
    const expected=entry[key]||{},actual=layout[key];
    if(Object.keys(expected).length!==Object.keys(actual).length||Object.entries(actual).some(([name,value])=>expected[name]!==value))throw new Error('归档内容与内核发布清单不一致');
  }
  if(entry.platform==='darwin'){
    if(!layout.executableFiles.includes(entry.executable)||!machArchitectures(zip.getEntry(entry.executable).getData()).includes(entry.arch))throw new Error('Mac 内核启动程序权限或芯片架构不匹配');
    if(JSON.stringify([...layout.executableFiles].sort())!==JSON.stringify([...(entry.executableFiles||[])].sort()))throw new Error('Mac 内核权限清单不一致');
  }
  // Write regular files first, then internal links. Never extract through an archive link.
  for(const file of zip.getEntries()){
    check(signal);const name=file.entryName.replace(/\/$/,'');if(!name||Object.hasOwn(layout.symlinks,name))continue;
    const target=inside(root,name);
    if(file.isDirectory){await fs.mkdir(target,{recursive:true,mode:0o755});continue;}
    await fs.mkdir(path.dirname(target),{recursive:true,mode:0o755});
    await fs.writeFile(target,file.getData(),{flag:'wx',mode:layout.executableFiles.includes(name)?0o755:0o644});
  }
  for(const [name,target] of Object.entries(layout.symlinks)){
    check(signal);const file=inside(root,name);await fs.mkdir(path.dirname(file),{recursive:true,mode:0o755});await fs.symlink(target,file);
  }
}
module.exports={inside,supported,linkTarget,validateLayout,inspectZip,machArchitectures,extractZip};
