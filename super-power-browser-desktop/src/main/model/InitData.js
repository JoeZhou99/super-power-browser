const fs=require('node:fs');
const path=require('node:path');
const {app}=require('electron');
function configuration(){
  const root=app.isPackaged?path.dirname(app.getPath('exe')):path.resolve(__dirname,'../../..');
  const file=path.join(root,'runtime.config.json');
  const supplied=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
  const dataPath=path.resolve(supplied.dataPath||app.getPath('userData'));
  const apiUrl=process.env.SPB_API_URL||supplied.apiUrl||'http://127.0.0.1:8080';
  const api=new URL(apiUrl);
  if(api.protocol!=='https:' && !(api.protocol==='http:'&&['127.0.0.1','localhost'].includes(api.hostname)))throw new Error('远程后端必须使用 HTTPS');
  return {apiUrl,webUrl:supplied.webUrl||'',dataPath,profiles:path.join(dataPath,'UserFile'),corePath:path.resolve(process.env.SPB_CORE_PATH||supplied.corePath||path.join(dataPath,'Core')),downloads:path.join(app.getPath('downloads'),'super-power-browser'),resources:app.isPackaged?process.resourcesPath:root};
}
module.exports={configuration};
