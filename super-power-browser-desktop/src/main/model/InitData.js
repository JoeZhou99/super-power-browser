const fs=require('node:fs');
const path=require('node:path');
const {app}=require('electron');
const {configureOperations}=require('../services/OperationsConfig');
function configuration(){
  const root=app.isPackaged?path.dirname(app.getPath('exe')):path.resolve(__dirname,'../../..');
  // Signed Mac app bundles stay immutable; deployment/user configuration lives in userData.
  const file=path.join(app.isPackaged&&process.platform==='darwin'?app.getPath('userData'):root,'runtime.config.json');
  const supplied=fs.existsSync(file)?JSON.parse(fs.readFileSync(file,'utf8')):{};
  const dataPath=path.resolve(supplied.dataPath||app.getPath('userData'));
  const apiUrl=process.env.SPB_API_URL||supplied.apiUrl||'http://127.0.0.1:8080';
  const operationsUrl=process.env.SPB_OPERATIONS_URL||supplied.operationsUrl||'';
  configureOperations(operationsUrl);
  const api=new URL(apiUrl);
  if(api.protocol!=='https:' && !(api.protocol==='http:'&&['127.0.0.1','localhost'].includes(api.hostname)))throw new Error('远程后端必须使用 HTTPS');
  return {apiUrl,operationsUrl,webUrl:supplied.webUrl||'',dataPath,profiles:path.join(dataPath,'UserFile','independent'),corePath:path.resolve(process.env.SPB_CORE_PATH||supplied.corePath||path.join(dataPath,'Core')),downloads:path.join(app.getPath('downloads'),'super-power-browser'),resources:app.isPackaged?process.resourcesPath:root};
}
module.exports={configuration};
