// Publish the verified upstream archive through our own backend catalog.
const fs=require('node:fs/promises');
const path=require('node:path');
const desktop=path.resolve(__dirname,'../../super-power-browser-desktop');
const AdmZip=require(require.resolve('adm-zip',{paths:[desktop]}));
const {inspectZip,machArchitectures}=require(path.join(desktop,'src/main/runtime/KernelPackage'));
const {hash}=require(path.join(desktop,'src/main/runtime/KernelManager'));
async function main(){
  const [archiveArg,outputArg,lockArg]=process.argv.slice(2);if(!archiveArg||!outputArg)throw new Error('Usage: publish-runtime.cjs UPSTREAM_ZIP OUTPUT_DIRECTORY [LOCK_JSON]');
  const lock=JSON.parse(await fs.readFile(lockArg||path.resolve(__dirname,'../upstream.lock.json'),'utf8'));
  const archive=path.resolve(archiveArg),output=path.resolve(outputArg);
  if(await hash(archive)!==lock.sha256||(await fs.stat(archive)).size!==lock.archiveBytes)throw new Error('The runtime archive does not match the pinned upstream digest.');
  const zip=new AdmZip(archive),layout=inspectZip(zip,lock),files=layout.files,mac=lock.platform==='darwin';
  const candidates=Object.keys(files).filter(name=>mac?/^[^/]+[.]app\/Contents\/MacOS\/[^/]+$/.test(name):/(^|\/)chrome[.]exe$/.test(name));
  if(candidates.length!==1)throw new Error('Expected exactly one browser executable.');const executable=candidates[0];
  if(mac&&(!layout.executableFiles.includes(executable)||!machArchitectures(zip.getEntry(executable).getData()).includes(lock.arch)))throw new Error('Mac executable does not match the declared architecture/permissions.');
  const prefix=path.posix.dirname(executable);
  const descriptor={version:lock.version,fullVersion:lock.fullVersion,protocol:lock.protocol,provider:lock.provider,platform:lock.platform,arch:lock.arch,executable,archive:`kernel-${lock.version}-${mac?'mac':'win'}-${lock.arch}.zip`,archiveBytes:lock.archiveBytes,sha256:lock.sha256,sourceCommit:lock.sourceCommit,sourceUrl:lock.sourceUrl,files,requiredDirectories:mac?[executable.split('/')[0]+'/Contents/Frameworks']:[prefix==='.'?'locales':prefix+'/locales'],recommended:true,requiresLegacyAuthorization:false,
    capabilities:{nativeFingerprint:true,platforms:['Windows','Mac'],webRtc:['privacy','real','disabled'],webRtcDisabledImplementation:'extension-policy',speechVoicesPrivacyImplementation:'extension-policy',customFontList:false,customGpuStrings:false,coupledNoiseFields:['canvas','fontMetrics','webglFingerprint']}};
  if(mac){descriptor.symlinks=layout.symlinks;descriptor.executableFiles=layout.executableFiles;}
  await fs.mkdir(output,{recursive:true});
  const lockFile=path.join(output,'.manifest.lock'),handle=await fs.open(lockFile,'wx');
  try{
    const file=path.join(output,'kernels.json');let manifest;
    try{manifest=JSON.parse(await fs.readFile(file,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;manifest={schemaVersion:1,source:'project',kernels:[]};}
    if(!Array.isArray(manifest.kernels))throw new Error('Invalid existing manifest.');
    const same=d=>d.version===descriptor.version&&d.platform===descriptor.platform&&d.arch===descriptor.arch;
    const previous=manifest.kernels.find(same);
    if(previous){
      const a={...previous},b={...descriptor};delete a.recommended;delete b.recommended;
      const stable=v=>JSON.stringify(v,(_,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.keys(item).sort().map(k=>[k,item[k]])):item);
      if(stable(a)!==stable(b))throw new Error('Existing version is immutable; choose a new identifier.');
    }
    const destination=path.join(output,descriptor.archive);
    if(archive!==destination){
      try{if(await hash(destination)!==descriptor.sha256)throw new Error('Destination archive already exists with different bytes.');}
      catch(error){if(error.code!=='ENOENT')throw error;await fs.copyFile(archive,destination,require('node:fs').constants.COPYFILE_EXCL);}
    }
    manifest.kernels=manifest.kernels.filter(d=>!same(d)).map(d=>d.platform===descriptor.platform&&d.arch===descriptor.arch?{...d,recommended:false}:d);
    manifest.kernels.push(descriptor);
    await fs.writeFile(file+'.partial',JSON.stringify(manifest,null,2)+'\n');await fs.rename(file+'.partial',file);
    console.log(JSON.stringify({version:lock.version,platform:lock.platform,arch:lock.arch,files:Object.keys(files).length,kernels:manifest.kernels.length}));
  }finally{await handle.close();await fs.unlink(lockFile);}

}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
