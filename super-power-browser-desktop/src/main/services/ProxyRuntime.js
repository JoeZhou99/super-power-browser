const net=require('node:net');
const {domainToASCII}=require('node:url');
const {check}=require('../runtime/Cancellation');

function proxyError(message){const error=new Error(message);error.proxySafe=true;return error;}
function safeProxyMessage(error){
  if(error?.proxySafe)return error.message;
  if(error?.level==='client-authentication')return 'SSH 认证失败，请检查代理账号和密码';
  if(['ETIMEDOUT','ETIMEOUT'].includes(error?.code))return '代理连接超时，请检查网络及代理服务';
  if(['ENOTFOUND','EAI_AGAIN'].includes(error?.code))return '代理域名解析失败，请检查代理地址';
  if(error?.code==='ECONNREFUSED')return '代理拒绝连接，请检查端口及代理服务';
  return '代理连接失败，请检查地址、认证信息及网络';
}
function proxyHost(value){
  let host=String(value||'').trim();
  if(host.startsWith('[')&&host.endsWith(']')){host=host.slice(1,-1);if(net.isIP(host)!==6)throw proxyError('代理地址必须是有效的 IP 或域名');}
  if(net.isIP(host))return host;
  if(!host||/[\s\/@:#?%\\\[\]]/.test(host))throw proxyError('代理地址必须是有效的 IP 或域名');
  host=domainToASCII(host).toLowerCase();
  if(!host||host.length>253||!host.replace(/\.$/,'').split('.').every(label=>/^[a-z\d](?:[a-z\d-]{0,61}[a-z\d])?$/.test(label)))throw proxyError('代理地址必须是有效的 IP 或域名');
  return host;
}
function normalizeProxy(proxy){
  const protocol=String(proxy?.protocol||'').toLowerCase();
  if(!['http','https','socks5','ssh'].includes(protocol))throw proxyError('不支持的代理协议');
  const host=proxyHost(proxy.host),port=Number(proxy.port);
  if(!Number.isInteger(port)||port<1||port>65535)throw proxyError('代理端口必须在 1 至 65535 之间');
  const username=String(proxy.username||''),password=String(proxy.password||'');
  if(protocol==='ssh'&&!username)throw proxyError('SSH 代理需要填写用户名');
  return {protocol,host,port,username,password};
}
function upstream(proxy){
  const config=normalizeProxy(proxy),host=net.isIP(config.host)===6?`[${config.host}]`:config.host;
  const url=new URL(`${config.protocol}://${host}:${config.port}`);
  url.username=encodeURIComponent(config.username);url.password=encodeURIComponent(config.password);return url.href;
}

// The browser always talks to proxy-chain. For SSH, its SOCKS upstream opens
// destinations through forwardOut; DNS and TCP connections stay on the SSH host.
class SshTunnel {
  constructor(config,{Client,signal,onFailure=()=>{},timeout=15000}={}){
    this.config=config;this.Client=Client||require('ssh2').Client;this.signal=signal;this.onFailure=onFailure;this.timeout=timeout;
    this.sockets=new Set();this.channels=new Set();this.closed=false;this.ready=false;
  }
  async listen(){
    check(this.signal);
    this.client=new this.Client();
    this.client.on('error',error=>{this.failure=proxyError(safeProxyMessage(error));if(this.ready)this.fail();});
    this.client.on('close',()=>{if(!this.closed&&this.ready){this.failure=proxyError('SSH 代理连接已断开');this.fail();}});
    try{
      await new Promise((resolve,reject)=>{
        let done=false;
        const finish=error=>{if(done)return;done=true;clearTimeout(timer);this.signal?.removeEventListener('abort',abort);this.client.removeListener('ready',ready);this.client.removeListener('error',failed);this.client.removeListener('close',disconnected);error?reject(error):resolve();};
        const ready=()=>finish(),failed=error=>finish(proxyError(safeProxyMessage(error))),disconnected=()=>finish(proxyError('SSH 代理在连接完成前已断开'));
        const abort=()=>finish(this.signal.reason||proxyError('代理连接已取消'));
        const timer=setTimeout(()=>finish(proxyError('SSH 代理连接超时')),this.timeout);
        this.client.once('ready',ready);this.client.once('error',failed);this.client.once('close',disconnected);this.signal?.addEventListener('abort',abort,{once:true});
        try{this.client.connect({...this.config,readyTimeout:this.timeout,keepaliveInterval:15000,keepaliveCountMax:3});}catch(error){failed(error);}
      });
      check(this.signal);if(this.closed||this.failure)throw this.failure||proxyError('SSH 代理服务已关闭');this.ready=true;
      this.server=net.createServer(socket=>this.accept(socket));
      await new Promise((resolve,reject)=>{this.server.once('error',reject);this.server.listen(0,'127.0.0.1',resolve);});
      this.server.on('error',()=>this.fail());
      check(this.signal);if(this.closed||this.failure){await new Promise(resolve=>this.server.close(resolve));throw this.failure||proxyError('SSH 代理服务已关闭');}this.port=this.server.address().port;return this;
    }catch(error){await this.close();throw error;}
  }
  accept(socket){
    this.sockets.add(socket);socket.once('close',()=>this.sockets.delete(socket));socket.on('error',()=>{});
    if(this.closed||this.failure){socket.destroy();return;}
    let pending=Buffer.alloc(0),stage='greeting';
    socket.setTimeout(this.timeout,()=>socket.destroy());
    const reject=code=>{socket.end(Buffer.from([5,code,0,1,0,0,0,0,0,0]));};
    const parse=chunk=>{
      pending=Buffer.concat([pending,chunk]);
      if(pending.length>65536){socket.destroy();return;}
      if(stage==='greeting'){
        if(pending.length<2)return;
        if(pending[0]!==5||pending[1]===0){socket.destroy();return;}
        if(pending.length<2+pending[1])return;
        if(!pending.subarray(2,2+pending[1]).includes(0)){socket.end(Buffer.from([5,255]));return;}
        pending=pending.subarray(2+pending[1]);stage='request';socket.write(Buffer.from([5,0]));
      }
      if(stage!=='request'||pending.length<4)return;
      if(pending[0]!==5||pending[1]!==1||pending[2]!==0){reject(7);return;}
      const kind=pending[3];let length,offset=4,host;
      if(kind===1)length=4;
      else if(kind===4)length=16;
      else if(kind===3){if(pending.length<5)return;length=pending[4];offset=5;if(!length){reject(8);return;}}
      else{reject(8);return;}
      if(pending.length<offset+length+2)return;
      if(kind===1)host=[...pending.subarray(offset,offset+4)].join('.');
      else if(kind===4)host=Array.from({length:8},(_,i)=>pending.readUInt16BE(offset+i*2).toString(16)).join(':');
      else host=pending.subarray(offset,offset+length).toString('utf8');
      const port=pending.readUInt16BE(offset+length),head=pending.subarray(offset+length+2);
      if(!port||/[\x00-\x20\x7f]/.test(host)){reject(8);return;}
      stage='connecting';socket.pause();socket.removeListener('data',parse);
      try{this.client.forwardOut('127.0.0.1',socket.remotePort||0,host,port,(error,channel)=>{
        if(error||this.closed||this.failure||socket.destroyed){channel?.destroy();if(!socket.destroyed)reject(5);return;}
        this.channels.add(channel);channel.on('error',()=>socket.destroy());
        channel.once('close',()=>{this.channels.delete(channel);socket.destroy();});socket.once('close',()=>channel.destroy());
        socket.setTimeout(0);socket.write(Buffer.from([5,0,0,1,127,0,0,1,0,0]));
        if(head.length)channel.write(head);socket.pipe(channel).pipe(socket);socket.resume();
      });}catch{reject(5);}
    };
    socket.on('data',parse);
  }
  fail(){if(this.closed)return;void this.close();this.onFailure(this.failure||proxyError('SSH 代理连接失败'));}
  async close(){
    if(this.closing)return this.closing;this.closed=true;
    this.closing=(async()=>{for(const socket of this.sockets)socket.destroy();for(const channel of this.channels)channel.destroy();this.client?.destroy();if(this.server?.listening)await new Promise(resolve=>this.server.close(resolve));})();
    return this.closing;
  }
}

class ProxyRuntime {
  constructor(proxy,{Server,Client,signal}={}){this.config=normalizeProxy(proxy);this.Server=Server||require('proxy-chain').Server;this.Client=Client;this.signal=signal;this.closed=false;}
  get port(){return this.server?.port;}
  get url(){if(!this.port||this.closed)throw proxyError('代理服务尚未就绪');return `http://127.0.0.1:${this.port}`;}
  async listen(){
    if(this.closed)throw proxyError('代理服务已关闭');
    if(this.starting)return this.starting;
    this.starting=(async()=>{
      try{
        check(this.signal);let upstreamProxyUrl;
        if(this.config.protocol==='ssh'){
          this.tunnel=new SshTunnel(this.config,{Client:this.Client,signal:this.signal,onFailure:()=>{void this.close();}});
          await this.tunnel.listen();upstreamProxyUrl=`socks5://127.0.0.1:${this.tunnel.port}`;
        }else upstreamProxyUrl=upstream(this.config);
        check(this.signal);if(this.closed)throw proxyError('代理服务已关闭');
        this.server=new this.Server({port:0,host:'127.0.0.1',prepareRequestFunction:()=>({upstreamProxyUrl})});
        await this.server.listen();if(this.closed){await this.server.close(true);throw proxyError('代理服务已关闭');}check(this.signal);return this;
      }catch(error){await this.close();if(error?.name==='AbortError')throw error;throw proxyError(safeProxyMessage(error));}
    })();return this.starting;
  }
  async close(){
    if(this.closing)return this.closing;this.closed=true;
    this.closing=Promise.allSettled([this.server?.close(true),this.tunnel?.close()]).then(()=>{});return this.closing;
  }
}
module.exports={ProxyRuntime,SshTunnel,upstream,proxyHost,normalizeProxy,proxyError,safeProxyMessage};
