const {fork}=require('node:child_process');
const path=require('node:path');
const net=require('node:net');
const {randomUUID}=require('node:crypto');
class NativePipe {
  constructor(id,helper,version){this.id=id;this.helper=helper;this.version=Number(version);this.name='SPB_CORE_'+randomUUID();this.outbound='SPB_'+id;this.events=[];}
  async start(){
    this.child=fork(path.join(__dirname,'NativePipeChild.cjs'),[],{env:{...process.env,ELECTRON_RUN_AS_NODE:'1'},windowsHide:true,stdio:['ignore','ignore','ignore','ipc']});
    await new Promise((resolve,reject)=>{
      const timer=setTimeout(()=>reject(new Error('原生通信管道启动超时')),10000);
      this.child.once('error',error=>{clearTimeout(timer);reject(error);});
      this.child.once('exit',()=>{clearTimeout(timer);reject(new Error('原生通信服务退出'));});
      this.child.on('message',message=>{
        if(message.op==='ready'){clearTimeout(timer);resolve();}
        if(message.op==='ciphertext')void this.receive(message.text);
      });
      this.child.send({op:'start',pipeName:this.name});
    });
  }
  async receive(ciphertext){
    try{
      const result=this.helper.helper.call('ipc_from_browser_decrypt',{browser_version:this.version>130?131:130,data:ciphertext});
      const message=JSON.parse(String(result.data).replace(/\0+$/,''));
      if(message.from!==this.id&&message.from!==this.outbound)return;
      this.events.push({action:message.action,at:Date.now()});this.events=this.events.slice(-50);
      if(message.action==='ExitBrowser')await this.send(message);
    }catch(error){this.lastError=error.message;}
  }
  async send(message){
    const result=this.helper.helper.call('ipc_to_browser_encrypt',{browser_version:this.version>130?131:130,data:JSON.stringify(message)});
    await new Promise((resolve,reject)=>{
      const socket=net.connect('\\\\.\\pipe\\'+this.outbound);socket.setTimeout(3000);
      socket.once('connect',()=>socket.end(result.data+'\0',resolve));socket.once('error',reject);socket.once('timeout',()=>socket.destroy(new Error('原生管道发送超时')));
    });
  }
  async close(){
    const child=this.child;if(!child||child.exitCode!==null)return;
    await new Promise(resolve=>{const timer=setTimeout(()=>{child.kill();resolve();},2500);child.once('exit',()=>{clearTimeout(timer);resolve();});if(child.connected)child.send({op:'stop'});else child.kill();child.once('message',m=>{if(m.op==='stopped')child.disconnect();});});
  }
}
module.exports={NativePipe};
