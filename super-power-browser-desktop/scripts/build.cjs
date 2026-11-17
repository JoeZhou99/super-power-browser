const fs=require('node:fs');
const path=require('node:path');
const {execFileSync}=require('node:child_process');
const root=path.resolve(__dirname,'..');
execFileSync(process.execPath,[path.join(__dirname,'prepare-proxy-runtime.cjs')],{cwd:root,stdio:'inherit'});
execFileSync(process.execPath,[path.join(__dirname,'prepare-ssr-runtime.cjs'),'--host-if-supported'],{cwd:root,stdio:'inherit'});
const aiRoot=path.resolve(root,'resources/ai');
execFileSync(process.execPath,[path.join(aiRoot,'scripts/build-embedded.mjs')],{cwd:aiRoot,stdio:'inherit'});
fs.cpSync(path.resolve(root,'../branding'),path.join(root,'branding'),{recursive:true});
require('./notification-sound.cjs')(path.join(root,'branding'));
for(const asset of ['app.ico','icon-16.png','icon-32.png']){
  if(!fs.existsSync(path.join(root,'branding',asset)))throw new Error(`缺少桌面发布资源: branding/${asset}`);
}
const pluginDir=path.join(root,'Plugin');
const pluginPackages=['RXMallHelper','RXAccountManage'];
for(const name of pluginPackages){
  const archive=path.join(pluginDir,`${name}.zip`);
  if(!fs.existsSync(archive)||fs.statSync(archive).size<1024)throw new Error(`缺少有效插件安装包: Plugin/${name}.zip，请先在平级的 super-power-browser-plugins 项目构建并复制 ZIP`);
  const AdmZip=require('adm-zip');
  const zip=new AdmZip(archive);
  if(!zip.getEntry('manifest.json')||!zip.getEntry('runtime/build.json'))throw new Error(`插件安装包内容不完整: Plugin/${name}.zip`);
}
function check(dir){for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())check(file);else if(file.endsWith('.js'))execFileSync(process.execPath,['--check',file],{stdio:'inherit'});}}
check(path.join(root,'src'));
const out=path.join(root,'out');
if(path.dirname(out)!==root)throw new Error('构建目录越界');
fs.rmSync(out,{recursive:true,force:true});
fs.cpSync(path.join(root,'src/main'),path.join(root,'out/main'),{recursive:true});
fs.cpSync(path.join(root,'src/preload'),path.join(root,'out/preload'),{recursive:true});
fs.appendFileSync(path.join(root,'out/preload/index.js'),'\n'+fs.readFileSync(path.join(root,'src/preload/ai-bridge.js'),'utf8'));
const web=path.resolve(root,'../super-power-browser-web/dist');
if(!fs.existsSync(path.join(web,'index.html')))throw new Error('请先构建 super-power-browser-web');
const webTarget=path.resolve(root,'resources/web');
if(!webTarget.startsWith(root+path.sep))throw new Error('构建资源目录越界');
fs.rmSync(webTarget,{recursive:true,force:true});
fs.cpSync(web,webTarget,{recursive:true});
console.log('桌面主进程语法检查完成，Web 资源已复制。');
