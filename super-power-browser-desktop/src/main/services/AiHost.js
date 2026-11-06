const {createAiDeviceSettings}=require('./AiDeviceIdentity');
const path=require('node:path');
const {ipcMain}=require('electron');

/** The AI runtime never owns login or shop permissions. This adapter is the authority. */
class AiHost {
  constructor({api,browsers,config,window,origin,loadRuntime=()=>import('@super-power-browser/ai')}){
    Object.assign(this,{api,browsers,config,window,origin,loadRuntime});this.runtime=null;this.starting=null;this.generation=0;
    ipcMain.handle('trident:ready',event=>{this.source(event);return this.ready().then(()=>true);});
    ipcMain.handle('trident:browser-connection',async(event,id)=>{this.source(event);await this.actor();return this.connection(id);});
    ipcMain.handle('spb:aiQueryModels',async(event,input)=>{this.source(event);await this.actor();return this.queryModels(input);});
  }
  source(event){if(event.sender!==this.window.webContents||event.senderFrame!==this.window.webContents.mainFrame||new URL(event.senderFrame.url).origin!==this.origin)throw new Error('AI 请求来源不合法');}
  async actor(){
    if(!this.api.token)throw new Error('请先登录账号');
    const token=this.api.token,actor=await this.api.request('/me/permissions');
    if(token!==this.api.token||!actor.permissions?.includes('ai.use'))throw Object.assign(new Error('账号已变化或没有 AI 使用权限'),{status:403});
    return actor;
  }
  async connection(value){
    const id=String(value);if(!/^[a-f0-9-]{36}$/i.test(id))throw new Error('店铺 ID 不合法');
    await this.api.request(`/environments/${id}/access`);
    const run=this.browsers.running.get(id);
    return {browserId:id,isopen:run?.status==='running'&&Boolean(run.debuggerUrl),browserInstanceId:run?.debuggerUrl||'',WebDriverPort:run?.port||0,KernalNumber:Number(run?.kernelVersion?.split('.')[0])||0,cdpUrl:run?.debuggerUrl||''};
  }
  async checkedConnection(input){
    if(!input?.mallId||String(input.mallId)!==String(input.browserId))throw new Error('店铺连接与店铺 ID 不匹配');
    const live=await this.connection(input.mallId);
    if(!live.isopen||input.cdpUrl!==live.cdpUrl||input.browserInstanceId!==live.browserInstanceId)throw new Error('店铺浏览器实例已变化，请重新连接');
    return {...input,...live,ok:true};
  }
  async ready(){
    if(this.runtime)return this.runtime;
    if(this.starting)return this.starting;
    const generation=this.generation;
    this.starting=(async()=>{
      const actor=await this.actor(),token=this.api.token;
      const valid=async()=>{const current=await this.actor();if(generation!==this.generation||token!==this.api.token||current.id!==actor.id||current.tenantId!==actor.tenantId)throw new Error('登录账号已变化');return current;};
      const authorize=async(event,channel,args)=>{
        this.source(event);await valid();
        if((channel.startsWith('conversations:')||channel==='scheduled:save')&&args[0]&&typeof args[0]==='object'){
          if(args[0].accountId&&String(args[0].accountId)!==actor.id)throw new Error('请求账号与当前登录账号不匹配');
          args[0]={...args[0],accountId:actor.id};
        }
        if(channel==='scheduled:save')args[0]={...args[0],pushPlatforms:[]};
        if(channel==='agent:run'){
          const input={...args[0]};
          if(!input.conversationId||typeof input.conversationId!=='string')throw new Error('缺少会话编号');
          const shops=Array.isArray(input.shops)?input.shops:[];
          if(input.mode!=='plan')input.shopResults=await Promise.all(shops.map(shop=>{
            const connection=input.shopResults?.find(row=>String(row.mallId)===String(shop.id));return this.checkedConnection(connection);
          }));
          args[0]=input;
        }
        if(channel==='scheduled:shops-result'&&!args[0]?.error)args[0]={...args[0],results:await Promise.all((args[0]?.results||[]).map(r=>r.ok?this.checkedConnection(r):r))};
        if(channel==='shops:validate-connection')args[0]=await this.checkedConnection(args[0]);
        return args;
      };
      const root=path.dirname(path.dirname(path.dirname(require.resolve('@super-power-browser/ai'))));
      process.env.TRIDENT_APP_ROOT=root;
      const {startTridentHost}=await this.loadRuntime();
      await valid();
      const prepareModelSettings=createAiDeviceSettings(this.config.dataPath);
      const runtime=await startTridentHost({prepareModelSettings,getWindow:()=>this.window,getWebContents:()=>this.window.webContents,
        dataDir:path.join(this.config.dataPath,'ai','accounts',actor.tenantId,actor.id),conversationDir:path.join(this.config.dataPath,'ai'),authorize,authorizeTask:valid,
        getBrowserConnection:id=>this.connection(id),isShopBrowserOpen:async id=>(await this.connection(id)).isopen,
        closeShopBrowser:async(id,expected)=>{const live=await this.connection(id);if(!live.isopen||live.browserInstanceId!==expected.browserInstanceId)return {closed:false,reason:'店铺实例已变化'};await this.browsers.close(id);return {closed:!this.browsers.running.has(id)};}
      });
      if(generation!==this.generation){await runtime.dispose();throw new Error('登录账号已变化');}
      this.runtime=runtime;return runtime;
    })().finally(()=>{this.starting=null;});
    return this.starting;
  }
  async stop(){
    this.generation++;
    if(this.starting)await this.starting.catch(()=>{});
    const runtime=this.runtime;this.runtime=null;if(runtime)await runtime.dispose();
  }
  async enforceAccess(){
    if(!this.runtime||this.checkingAccess)return;
    this.checkingAccess=true;
    try{await this.actor();}catch(error){if([401,403].includes(error.status))await this.stop();}
    finally{this.checkingAccess=false;}
  }
  async queryModels(input){
    const url=new URL(String(input?.apiUrl||'').replace(/\/+$/,'')+'/models');
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password||url.search||url.hash)throw new Error('模型地址格式不正确');
    const key=String(input?.apiKey||'');if(key.length>2000)throw new Error('模型凭据过长');
    const response=await fetch(url,{headers:{Accept:'application/json',...(key?{Authorization:`Bearer ${key}`}:{})},redirect:'error',signal:AbortSignal.timeout(20000)});
    if(!response.ok)throw new Error(`模型列表获取失败（${response.status}）`);
    const chunks=[];let size=0;for await(const chunk of response.body){size+=chunk.length;if(size>2*1024*1024)throw new Error('模型列表过大');chunks.push(chunk);}
    return {errorCode:0,data:JSON.parse(Buffer.concat(chunks).toString('utf8'))};
  }
}
module.exports={AiHost};
