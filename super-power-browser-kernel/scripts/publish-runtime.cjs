// Publish the verified upstream archive through our own backend catalog.
const fs=require('node:fs/promises');
const path=require('node:path');
const {createHash}=require('node:crypto');
const desktop=path.resolve(__dirname,'../../super-power-browser-desktop');
const AdmZip=require(path.join(desktop,'node_modules/adm-zip'));
const {hash,inside}=require(path.join(desktop,'src/main/runtime/KernelManager'));
async function main(){
  const [archiveArg,outputArg]=process.argv.slice(2);if(!archiveArg||!outputArg)throw new Error('Usage: publish-runtime.cjs UPSTREAM_ZIP OUTPUT_DIRECTORY');
  const lock=JSON.parse(await fs.readFile(path.resolve(__dirname,'../upstream.lock.json'),'utf8'));
  const archive=path.resolve(archiveArg),output=path.resolve(outputArg);
  if(await hash(archive)!==lock.sha256)throw new Error('The runtime archive does not match the pinned upstream digest.');
  const zip=new AdmZip(archive),files={};let executable;
  for(const entry of zip.getEntries()){
    const name=entry.entryName.replace(/\/$/,'');if(!name)continue;inside(output,name);
    if(((entry.attr>>>16)&0xf000)===0xa000)throw new Error('Symbolic links are not supported in the runtime package.');
    if(entry.isDirectory)continue;
    files[name]=createHash('sha256').update(entry.getData()).digest('hex');
    if(name.endsWith('/chrome.exe')||name==='chrome.exe'){if(executable)throw new Error('More than one browser executable');executable=name;}
  }
  if(!executable)throw new Error('The archive has no Chromium executable.');
  const prefix=path.posix.dirname(executable);
  const descriptor={version:lock.version,fullVersion:lock.fullVersion,protocol:lock.protocol,provider:lock.provider,platform:lock.platform,arch:lock.arch,executable,archive:`kernel-${lock.version}-win-x64.zip`,archiveBytes:lock.archiveBytes,sha256:lock.sha256,sourceCommit:lock.sourceCommit,sourceUrl:lock.sourceUrl,files,requiredDirectories:[prefix==='.'?'locales':prefix+'/locales'],recommended:true,requiresLegacyAuthorization:false,
    capabilities:{nativeFingerprint:true,platforms:['Windows','Mac'],webRtc:['privacy','real','disabled'],webRtcDisabledImplementation:'extension-policy',speechVoicesPrivacyImplementation:'extension-policy',customFontList:false,customGpuStrings:false,coupledNoiseFields:['canvas','fontMetrics','webglFingerprint']}};
  await fs.mkdir(output,{recursive:true});const destination=path.join(output,descriptor.archive);
  if(archive!==destination)await fs.copyFile(archive,destination);
  const manifest={schemaVersion:1,source:'project',kernels:[descriptor]};
  await fs.writeFile(path.join(output,'kernels.json.partial'),JSON.stringify(manifest,null,2)+'\n');await fs.rename(path.join(output,'kernels.json.partial'),path.join(output,'kernels.json'));
  console.log(JSON.stringify({version:lock.version,fullVersion:lock.fullVersion,files:Object.keys(files).length,requiresLegacyAuthorization:false}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
