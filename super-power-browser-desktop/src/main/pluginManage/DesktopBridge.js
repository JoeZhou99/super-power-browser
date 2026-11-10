const {WebSocketServer}=require('ws');
const {createCipheriv,createDecipheriv,createHash,timingSafeEqual}=require('node:crypto');
const net=require('node:net');

function encode(value,key,iv,mac){const cipher=createCipheriv('aes-256-cbc',Buffer.from(key),Buffer.from(iv,'base64'));return Buffer.from(JSON.stringify({iv,mac,value:Buffer.concat([cipher.update(JSON.stringify(value)),cipher.final()]).toString('base64')})).toString('base64');}
function decode(raw,key,iv,mac){const envelope=JSON.parse(Buffer.from(String(raw),'base64').toString());if(envelope.iv!==iv||envelope.mac!==mac)throw new Error('通信配置不匹配');const decipher=createDecipheriv('aes-256-cbc',Buffer.from(key),Buffer.from(iv,'base64'));return JSON.parse(Buffer.concat([decipher.update(Buffer.from(envelope.value,'base64')),decipher.final()]).toString());}
const equal=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.length===b.length&&timingSafeEqual(Buffer.from(a),Buffer.from(b));
function tcpLatency(host,port){return new Promise((resolve,reject)=>{const start=performance.now(),socket=net.connect({host,port:Number(port)});socket.setTimeout(5000);socket.once('connect',()=>{socket.destroy();resolve(Math.round(performance.now()-start));});socket.once('error',reject);socket.once('timeout',()=>socket.destroy(new Error('线路连接超时')));});}

class DesktopBridge {
  constructor({id,proxy,runtime,routes,onAction}){this.id=id;this.proxy=proxy;this.runtime=runtime;this.routes=routes;this.onAction=onAction;this.salts=new Map();this.clients=new Set();this.clientGenerations=new WeakMap();this.generation=0;this.events=[];this.connected=false;this.ready=false;}
  async listen(){
    this.server=new WebSocketServer({host:'127.0.0.1',port:0,maxPayload:3*1024*1024,verifyClient:({req},done)=>{
      try{
        if(this.closing||!this.secret)throw new Error('未配置');
        const url=new URL(req.url,'http://127.0.0.1');
        if(url.searchParams.get('browserId')!==this.id)throw new Error('店铺不匹配');
        const origin=req.headers.origin;
        if(!this.extensionIds.some(id=>origin===`chrome-extension://${id}`))throw new Error('插件来源不匹配');
        const sign=decode(url.searchParams.get('sign'),this.secret.wsKey,this.secret.iv,this.secret.mac);
        if(sign.browserId!==this.id||Math.abs(Date.now()-sign.time)>60000||typeof sign.salt!=='string'||sign.salt.length>100||this.salts.has(sign.salt))throw new Error('签名过期或重放');
        const expected=createHash('md5').update(sign.salt+sign.time+this.secret.wsKey+this.id+sign.salt).digest('hex');
        if(!equal(sign.token,expected))throw new Error('签名不匹配');
        for(const [salt,time]of this.salts)if(Date.now()-time>60000)this.salts.delete(salt);
        this.salts.set(sign.salt,Date.now());done(true);
      }catch{done(false,401,'Unauthorized');}
    }});
    this.server.on('connection',socket=>{
      if(this.closing){socket.terminate();return;}
      this.clientGenerations.set(socket,this.generation);
      this.clients.add(socket);this.connected=true;
      socket.on('close',()=>{this.clients.delete(socket);this.connected=this.clients.size>0;});
      socket.on('error',()=>{});socket.on('message',raw=>void this.receive(socket,raw));
    });
    await new Promise((resolve,reject)=>{this.server.once('listening',resolve);this.server.once('error',reject);});
    return this.server.address().port;
  }
  configure(bundle,extensionIds){const envelope=JSON.parse(Buffer.from(bundle.initJson,'base64').toString());this.secret={wsKey:bundle.wsKey,iv:envelope.iv,mac:envelope.mac};this.extensionIds=extensionIds;}
  invalidateReadiness(){
    // In-flight replies and queued messages from the worker being replaced
    // must not restore readiness after its replacement starts initializing.
    this.generation++;this.ready=false;
    const previous=[...this.clients];this.clients.clear();this.connected=false;
    for(const socket of previous)socket.terminate();
    return this.generation;
  }
  currentClient(socket,generation){return generation===this.generation&&this.clients.has(socket)&&this.clientGenerations.get(socket)===generation&&socket.readyState===1;}
  async receive(socket,raw){
    const generation=this.clientGenerations.get(socket);
    if(!this.currentClient(socket,generation))return;
    let request;
    try{
      request=decode(raw,this.secret.wsKey,this.secret.iv,this.secret.mac);
      if(request.browserId!==this.id)throw new Error('通信店铺不匹配');
      const args=typeof request.args==='string'?JSON.parse(request.args):request.args||{};
      for(const key of ['mallId','mall_id','browserId','storeId'])if(args[key]&&args[key]!==this.id)throw new Error('禁止跨店铺通信');
      let result={};
      if(request.action==='HeartBeat')result={alive:true};
      else if(request.action==='Ping'){
        const targets=args.currentTransferProxies||(this.runtime?[{candidateIndex:this.runtime.candidateIndex}]:[this.proxy]);
        if(!Array.isArray(targets)||targets.length>10)throw new Error('线路参数不合法');
        result=await Promise.all(targets.map(async target=>{
          let connection=this.proxy;
          if(this.routes)connection=this.routes.select({candidateIndex:target?.candidateIndex,snapshotId:args.snapshotId});
          else if(this.runtime)connection=this.runtime.candidate(target?.candidateIndex);
          else if((target.ip||target.host)!==this.proxy.host||Number(target.port)!==Number(this.proxy.port))throw new Error('只能检测当前店铺已配置的线路');
          // Measure the configured first hop when the route uses a transit.
          while(connection.proxyOptions?.transit)connection=connection.proxyOptions.transit;
          try{return {latency:await tcpLatency(connection.host,connection.port)};}catch{return {latency:-1};}
        }));
      }else if(request.action==='WriteLog')result={accepted:true};
      else if(request.action==='CheckCompleted'){await this.onAction?.(request.action,args);if(!this.currentClient(socket,generation))return;this.ready=true;result={ready:true};}
      else result=await this.onAction(request.action,args);
      if(!this.currentClient(socket,generation))return;
      this.events.push({action:request.action,ok:true,at:Date.now()});this.events=this.events.slice(-100);
      this.reply(socket,request,200,result);
    }catch(error){
      if(!this.currentClient(socket,generation))return;
      this.events.push({action:request?.action||'invalid',ok:false,message:error.message,at:Date.now()});this.events=this.events.slice(-100);
      if(request){
        const failure={message:error.message};
        if(request.action==='StartProxy'){
          failure.isSuccess=false;
          if(Number.isInteger(this.runtime?.candidateIndex))failure.candidateIndex=this.runtime.candidateIndex;
          if(this.routes)failure.snapshotId=this.routes.snapshotId;
        }
        this.reply(socket,request,400,failure);
      }else socket.close(1008,'Invalid message');
    }
  }
  reply(socket,request,ret,returnObj){if(socket.readyState===1)socket.send(encode({requestId:request.requestId,action:request.action,ret,returnObj},this.secret.wsKey,this.secret.iv,this.secret.mac));}
  async close(){this.closing=true;this.invalidateReadiness();if(this.server)await new Promise(resolve=>this.server.close(resolve));this.secret=null;}
}
module.exports={DesktopBridge,encode,decode,tcpLatency};
