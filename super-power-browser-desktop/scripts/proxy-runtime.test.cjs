const test=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const net=require('node:net');
const {generateKeyPairSync}=require('node:crypto');
const {EventEmitter,once}=require('node:events');
const {PassThrough}=require('node:stream');
const {ProxyRuntime,SshTunnel,upstream,proxyHost}=require('../src/main/services/ProxyRuntime');
const {ProxyChecks,requestRotation}=require('../src/main/services/ProxyChecks');
const {validateExit}=require('../src/main/pluginManage/NetworkInfo');

const id='11111111-2222-3333-4444-555555555555';
async function listen(server){await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});return server.address().port;}
async function close(server){server.closeAllConnections?.();await new Promise(resolve=>server.close(resolve));}
function localRequest(port,path){return new Promise((resolve,reject)=>{http.get({host:'127.0.0.1',port,path},response=>{let body='';response.setEncoding('utf8');response.on('data',chunk=>body+=chunk);response.on('end',()=>resolve({status:response.statusCode,body}));response.on('error',reject);}).on('error',reject);});}

test('proxy addresses preserve credentials, gateway domains and IPv6 without accepting URL injection',()=>{
  const url=new URL(upstream({protocol:'socks5',host:'gateway.example.test',port:1080,username:'a:b@c',password:'p@ss:/?#%'}));
  assert.equal(url.hostname,'gateway.example.test');assert.equal(decodeURIComponent(url.username),'a:b@c');assert.equal(decodeURIComponent(url.password),'p@ss:/?#%');
  for(const host of ['2001:db8::1','[2001:db8::1]'])assert.equal(new URL(upstream({protocol:'http',host,port:8080})).hostname,'[2001:db8::1]');
  assert.equal(proxyHost('Proxy.Example.COM'),'proxy.example.com');
  for(const host of ['a.example/path','name@host','host:8080','[bad]','evil\\host','host?x=1','a%2fb','a b'])assert.throws(()=>proxyHost(host));
  assert.throws(()=>upstream({protocol:'direct',host:'127.0.0.1',port:80}));
  assert.throws(()=>upstream({protocol:'http',host:'127.0.0.1',port:0}));
  assert.equal(validateExit({webType:1,host:'1.1.1.1'},{available:true,ip:'8.8.8.8'}).allowed,true);
});

test('rotation sends an isolated GET, rejects redirects and never exposes the URL in failures',async()=>{
  const requests=[];
  const server=http.createServer((request,response)=>{
    requests.push({url:request.url,method:request.method,headers:request.headers});
    if(request.url.startsWith('/redirect')){response.writeHead(302,{Location:'/target'});response.end();}
    else if(request.url.startsWith('/deny')){response.writeHead(403);response.end('secret-token');}
    else{response.end('{"ok":true}');}
  });
  const port=await listen(server);
  try{
    await requestRotation(`http://127.0.0.1:${port}/rotate?token=secret-token`);
    assert.equal(requests[0].method,'GET');assert.equal(requests[0].headers.authorization,undefined);assert.equal(requests[0].headers.cookie,undefined);assert.equal(requests[0].headers.referer,undefined);
    await assert.rejects(requestRotation(`http://127.0.0.1:${port}/redirect?token=secret-token`),/重定向/);
    assert.equal(requests.some(request=>request.url==='/target'),false);
    await assert.rejects(requestRotation(`http://127.0.0.1:${port}/deny?token=secret-token`),error=>/HTTP 403/.test(error.message)&&!error.message.includes('secret-token'));
    assert.throws(()=>requestRotation(`http://user:secret-token@127.0.0.1:${port}/`),/不能包含用户认证信息/);
    assert.throws(()=>requestRotation('file:///tmp/secret'),/HTTP/);
  }finally{await close(server);}
});

test('rotation bounds complete response time and both declared and streaming response size',async()=>{
  const server=http.createServer((request,response)=>{
    if(request.url==='/large'){response.writeHead(200,{'Content-Length':'100000'});response.end('large');}
    else if(request.url==='/stream'){response.writeHead(200);response.write(Buffer.alloc(100));response.end(Buffer.alloc(100));}
    else if(request.url==='/stall'){response.writeHead(200);response.write('partial');}
  });
  const port=await listen(server);
  try{
    await assert.rejects(requestRotation(`http://127.0.0.1:${port}/large`,{maxBytes:128}),/响应过大/);
    await assert.rejects(requestRotation(`http://127.0.0.1:${port}/stream`,{maxBytes:128}),/响应过大/);
    await assert.rejects(requestRotation(`http://127.0.0.1:${port}/stall`,{timeout:50}),/请求超时/);
  }finally{await close(server);}
});

test('probe saves failures without credentials and releases its runtime',async()=>{
  const calls=[];let closed=0;
  class FailingRuntime{async listen(){throw new Error('socks5://secret-user:secret-password@gateway.test');}async close(){closed++;}}
  const api={request:async(path,options)=>{calls.push({path,options});return {ipType:2};}};
  const checks=new ProxyChecks(api,{Runtime:FailingRuntime});
  const result=await checks.check(id);
  assert.equal(closed,1);assert.equal(result.connected,false);assert.equal(calls[1].path,`/proxies/${id}/check-result`);
  assert.equal(calls[1].options.body.connected,false);assert.equal(JSON.stringify(result).includes('secret-'),false);
  await assert.rejects(checks.check('../unauthorized'),/编号/);
});

test('rotation obtains its URL only from the proxy API, probes and persists dynamic exits',async()=>{
  const calls=[];let rotated;
  class FakeRuntime{async listen(){}get url(){return 'http://127.0.0.1:1';}async close(){}}
  const api={request:async(path,options)=>{calls.push({path,options});return {ipType:2,webType:1,host:'1.1.1.1',changeIpUrl:'https://provider.test/rotate?key=secret'};}};
  const checks=new ProxyChecks(api,{Runtime:FakeRuntime,rotate:async url=>{rotated=url;},collect:async()=>({available:true,ip:'8.8.8.8',country_name:'美国'})});
  const result=await checks.changeIp(id);
  assert.equal(calls[0].path,`/proxies/${id}/connection`);assert.equal(rotated,'https://provider.test/rotate?key=secret');
  assert.equal(result.connected,true);assert.equal(result.ip,'8.8.8.8');assert.equal(result.rotationRequested,true);assert.match(result.message,/不保证/);
  assert.equal(calls[1].path,`/proxies/${id}/check-result`);assert.equal(JSON.stringify(result).includes('secret'),false);
});

test('SSH cancellation destroys a pending client and prevents a listener from escaping',async()=>{
  let client;
  class PendingClient extends EventEmitter{constructor(){super();client=this;}connect(){}destroy(){this.destroyed=true;this.emit('close');}}
  const controller=new AbortController(),tunnel=new SshTunnel({host:'127.0.0.1',port:22,username:'user'},{Client:PendingClient,signal:controller.signal});
  const operation=tunnel.listen();controller.abort(new DOMException('Cancelled','AbortError'));
  await assert.rejects(operation,{name:'AbortError'});assert.equal(client.destroyed,true);assert.equal(tunnel.server,undefined);
});

test('SSH authentication failure is sanitized and releases its client',async()=>{
  let client;
  class RejectedClient extends EventEmitter{constructor(){super();client=this;}connect(){queueMicrotask(()=>{const error=new Error('secret-password at private-host');error.level='client-authentication';this.emit('error',error);});}destroy(){this.destroyed=true;this.emit('close');}}
  const runtime=new ProxyRuntime({protocol:'ssh',host:'127.0.0.1',port:22,username:'user',password:'secret-password'},{Client:RejectedClient});
  await assert.rejects(runtime.listen(),error=>/SSH 认证失败/.test(error.message)&&!error.message.includes('secret-password'));
  assert.equal(client.destroyed,true);assert.equal(runtime.closed,true);assert.equal(runtime.server,undefined);
});

test('SSH closes channels delivered after their requesting socket has closed',async()=>{
  let deliver;
  class Client extends EventEmitter{connect(){queueMicrotask(()=>this.emit('ready'));}forwardOut(_src,_port,_host,_target,callback){deliver=callback;}destroy(){}}
  const tunnel=new SshTunnel({host:'127.0.0.1',port:22,username:'user'},{Client});await tunnel.listen();
  const socket=net.connect(tunnel.port,'127.0.0.1');await once(socket,'connect');
  socket.write(Buffer.from([5,1,0]));await once(socket,'data');
  socket.write(Buffer.from([5,1,0,1,127,0,0,1,0,80]));
  while(!deliver)await new Promise(resolve=>setImmediate(resolve));
  socket.destroy();await once(socket,'close');await new Promise(resolve=>setImmediate(resolve));
  const channel=new PassThrough();deliver(null,channel);
  await tunnel.close();assert.equal(channel.destroyed,true);assert.equal(tunnel.server.listening,false);
});

test('SSH runtime forwards HTTP and CONNECT through SSH and closes all resources',async()=>{
  const {Server}=require('ssh2');
  const {privateKey}=generateKeyPairSync('rsa',{modulusLength:2048,privateKeyEncoding:{type:'pkcs1',format:'pem'},publicKeyEncoding:{type:'pkcs1',format:'pem'}});
  const upstreams=new Set(),clients=new Set();let forwards=0;
  const target=http.createServer((_request,response)=>response.end('through-ssh'));
  const targetPort=await listen(target);
  const ssh=new Server({hostKeys:[privateKey]},client=>{
    clients.add(client);client.on('error',()=>{});client.once('close',()=>clients.delete(client));
    client.on('authentication',ctx=>ctx.method==='password'&&ctx.username==='user'&&ctx.password==='pass'?ctx.accept():ctx.reject());
    client.on('ready',()=>client.on('tcpip',(accept,reject,info)=>{
      if(info.destIP!=='127.0.0.1'||Number(info.destPort)!==targetPort){reject();return;}
      forwards++;const channel=accept(),socket=net.connect(targetPort,'127.0.0.1');upstreams.add(socket);
      socket.on('error',()=>channel.destroy());channel.on('error',()=>socket.destroy());
      socket.once('close',()=>{upstreams.delete(socket);channel.destroy();});channel.once('close',()=>socket.destroy());socket.pipe(channel).pipe(socket);
    }));
  });
  const sshPort=await listen(ssh),runtime=new ProxyRuntime({protocol:'ssh',host:'127.0.0.1',port:sshPort,username:'user',password:'pass'});
  try{
    await runtime.listen();
    const response=await localRequest(runtime.port,`http://127.0.0.1:${targetPort}/`);assert.deepEqual(response,{status:200,body:'through-ssh'});
    const tunnel=await new Promise((resolve,reject)=>{const request=http.request({host:'127.0.0.1',port:runtime.port,method:'CONNECT',path:`127.0.0.1:${targetPort}`});request.on('connect',(response,socket)=>response.statusCode===200?resolve(socket):reject(new Error('CONNECT failed')));request.on('error',reject);request.end();});
    let body='';tunnel.on('data',chunk=>body+=chunk);tunnel.write('GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n');await once(tunnel,'end');assert.match(body,/through-ssh/);
    assert.equal(forwards,2);
    await runtime.close();assert.equal(runtime.tunnel.server.listening,false);assert.equal(runtime.closed,true);await runtime.close();
  }finally{await runtime.close();for(const socket of upstreams)socket.destroy();for(const client of clients)client.end();await close(target);await close(ssh);}
});

test('unavailable upstream fails without falling back to a direct target connection',async()=>{
  let directCalls=0;const target=http.createServer((_request,response)=>{directCalls++;response.end('unexpected');}),unused=net.createServer();
  const targetPort=await listen(target),unusedPort=await listen(unused);await close(unused);
  const runtime=new ProxyRuntime({protocol:'http',host:'127.0.0.1',port:unusedPort});
  try{await runtime.listen();const response=await localRequest(runtime.port,`http://127.0.0.1:${targetPort}/`);assert.notEqual(response.status,200);assert.equal(directCalls,0);}
  finally{await runtime.close();await close(target);}
});
