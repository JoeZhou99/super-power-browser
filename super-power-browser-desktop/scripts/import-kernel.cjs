// Import a supplied runtime once. No old installation paths or credentials are embedded.
const fs=require('node:fs/promises');
const path=require('node:path');
const AdmZip=require('adm-zip');
const {hash,verifyDirectory}=require('../src/main/runtime/KernelManager');
async function main(){
  const [sourceArg,version,outputArg]=process.argv.slice(2);
  if(!sourceArg||!/^\d{2,3}(?:\.\d+){0,3}$/.test(version||'')||!outputArg)throw new Error('Usage: node scripts/import-kernel.cjs SOURCE VERSION OUTPUT_DIRECTORY');
  const source=await fs.realpath(sourceArg),output=path.resolve(outputArg);
  if(output===source||output.startsWith(source+path.sep))throw new Error('Output directory must be outside the source kernel.');
  const descriptor={version,protocol:'legacy',executable:'zhanfubrowser.exe'};
  if(!await verifyDirectory(source,descriptor))throw new Error('Source runtime failed file and directory integrity checks.');
  const files={},zip=new AdmZip();
  async function walk(dir,prefix=''){
    for(const entry of await fs.readdir(dir,{withFileTypes:true})){
      if(entry.isSymbolicLink())throw new Error('Runtime contains a link: '+entry.name);
      const relative=prefix+entry.name,full=path.join(dir,entry.name);
      if(entry.isDirectory())await walk(full,relative+'/');
      else if(entry.isFile()&&!/\.log$|^staging_file$|^\.spb-/i.test(entry.name)){files[relative]=await hash(full);zip.addLocalFile(full,prefix);}
    }
  }
  await walk(source);await fs.mkdir(output,{recursive:true});
  const filename=`kernel-${version}-win-x64.zip`,archive=path.join(output,filename),temporary=archive+'.partial';
  await new Promise((resolve,reject)=>zip.writeZip(temporary,error=>error?reject(error):resolve()));
  const sha256=await hash(temporary),archiveBytes=(await fs.stat(temporary)).size;
  await fs.rename(temporary,archive);
  const manifestFile=path.join(output,'kernels.json');let manifest={schemaVersion:1,kernels:[]};
  try{manifest=JSON.parse(await fs.readFile(manifestFile,'utf8'));}catch(error){if(error.code!=='ENOENT')throw error;}
  if(manifest.schemaVersion!==1||!Array.isArray(manifest.kernels))throw new Error('Existing runtime catalog is not supported.');
  const imported={...descriptor,platform:'win32',arch:'x64',archive:filename,archiveBytes,sha256,files,recommended:manifest.kernels.length===0,requiresLegacyAuthorization:true};
  manifest.kernels=[...manifest.kernels.filter(entry=>entry.version!==version),imported];
  await fs.writeFile(manifestFile+'.partial',JSON.stringify(manifest,null,2)+'\n');await fs.rename(manifestFile+'.partial',manifestFile);
  console.log(JSON.stringify({version,files:Object.keys(files).length,archiveBytes,sha256,manifest:manifestFile,requiresLegacyAuthorization:true}));
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
