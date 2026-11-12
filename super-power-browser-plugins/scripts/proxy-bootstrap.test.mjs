import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {boot} from '../runtime/guard.mjs';
import {encodeBootstrap} from '../../super-power-browser-desktop/src/main/pluginManage/bootstrap.mjs';

const require=createRequire(import.meta.url);
const root=fileURLToPath(new URL('../',import.meta.url));
const desktop=path.resolve(root,'../super-power-browser-desktop');
const capabilities={protocol:'super-power-browser-extension/1',ready:true,nativeBridge:true,methods:[]};
const build={mode:'superpower',apiBase:'https://backend.test/extension',authOrigin:'https://backend.test',requiredMethods:[],defaultPopup:''};
function configuration(localProxy={host:'127.0.0.1',port:29001,username:'fixture-user',password:'fixture-secret'}) {
  return {desktopProtocol:'super-power-browser-desktop/1',kernelProtocol:'fingerprint-chromium/1',browserId:'fixture-shop',sysMallId:'fixture-shop',accessToken:'synthetic-token',websocketPort:29000,
    pluginIdMap:{RXMallHelper:'a'.repeat(32),RXAccountManage:'b'.repeat(32)},proxyInfo:{proxyAuthUrl:`http://127.0.0.1:${localProxy.port}@`},staticProxy:{exchange:`http://127.0.0.1:${localProxy.port}@`},
    localProxy,apiBase:build.apiBase,authOrigin:build.authOrigin};
}
function fixture({proxy=true,failSet=false,backend,overrides={}}={}) {
  const events=[],bootstrap={...configuration(),...overrides},bundle=encodeBootstrap(bootstrap);
  const files={'runtime/build.json':JSON.stringify(build),'config.dat':bundle.configDat,'init.json':bundle.initJson};
  const chromeApi={runtime:{getURL:file=>'chrome-extension://fixture/'+file},storage:{session:{}},cookies:{}};
  if(proxy)chromeApi.proxy={settings:{set(value,callback){events.push({type:'pac',value});if(failSet)chromeApi.runtime.lastError={message:'fixture denial'};callback();delete chromeApi.runtime.lastError;}}};
  const fetcher=async url=>{
    if(url.startsWith('chrome-extension://fixture/'))return new Response(files[url.slice('chrome-extension://fixture/'.length)]);
    events.push({type:'backend'});return backend?backend(url,events):new Response(JSON.stringify(capabilities));
  };
  return {events,chromeApi,fetcher};
}

test('verified startup installs mandatory current PAC before a remote backend request',async()=>{
  const f=fixture();await boot(f.chromeApi,f.fetcher);
  assert.deepEqual(f.events.map(event=>event.type),['pac','backend']);
  assert.equal(f.events[0].value.value.pacScript.mandatory,true);
  assert.match(f.events[0].value.value.pacScript.data,/127\.0\.0\.1:29001/);
});

test('remote backend bootstrap succeeds while the shop proxy gate is closed, including compiled defaults',async()=>{
  for(const overrides of [{},{apiBase:undefined,authOrigin:undefined}]){
    const f=fixture({overrides,backend:(url,events)=>{
      const pac=events.find(event=>event.type==='pac').value.value.pacScript.data;
      const select=vm.runInNewContext(pac+'\nFindProxyForURL;');
      if(select(url,new URL(url).hostname)!=='DIRECT')throw new TypeError('closed shop gate');
      for(const host of ['merchant.test','api.ipify.org','sub.backend.test'])assert.equal(select('https://'+host+'/',host),'PROXY 127.0.0.1:29001');
      return new Response(JSON.stringify(capabilities));
    }});
    const result=await boot(f.chromeApi,f.fetcher);
    assert.equal(result.bootstrap.apiBase,build.apiBase);assert.equal(result.bootstrap.authOrigin,build.authOrigin);
    assert.deepEqual(f.events.map(event=>event.type),['pac','backend']);
  }
});

test('bootstrap rejects a mismatched authentication origin before touching browser routing or the backend',async()=>{
  const f=fixture({overrides:{authOrigin:'https://another.test'}});
  await assert.rejects(boot(f.chromeApi,f.fetcher),/匹配认证源/);
  assert.deepEqual(f.events,[]);
});

test('PAC installation failure blocks startup without contacting the backend',async()=>{
  const f=fixture({failSet:true});
  await assert.rejects(boot(f.chromeApi,f.fetcher),/无法设置当前店铺代理/);
  assert.deepEqual(f.events.map(event=>event.type),['pac']);
});

test('account helper retries a transport race without taking proxy control',async()=>{
  let attempts=0;
  const f=fixture({proxy:false,backend:()=>{if(++attempts===1)throw new TypeError('Failed to fetch');return new Response(JSON.stringify(capabilities));}});
  await boot(f.chromeApi,f.fetcher);assert.equal(attempts,2);
  assert.deepEqual(f.events.map(event=>event.type),['backend','backend']);
  const denied=fixture({proxy:false,backend:()=>new Response('',{status:401})});
  await assert.rejects(boot(denied.chromeApi,denied.fetcher),/HTTP 401/);
  assert.equal(denied.events.length,1);
});

async function chromiumExecutable() {
  if(process.env.SPB_CHROMIUM_EXECUTABLE)return path.resolve(process.env.SPB_CHROMIUM_EXECUTABLE);
  const runtime=JSON.parse(await fs.readFile(path.join(desktop,'runtime.config.json'),'utf8'));
  const directory=path.join(runtime.corePath,'144');
  const installation=JSON.parse(await fs.readFile(path.join(directory,'.spb-installation.json'),'utf8'));
  assert.equal(installation.protocol,'fingerprint-chromium/1');
  for(const item of await fs.readdir(directory,{withFileTypes:true}))if(item.isDirectory()){
    const executable=path.join(directory,item.name,'chrome.exe');
    if(await fs.stat(executable).then(stat=>stat.isFile(),()=>false))return executable;
  }
  throw new Error('Set SPB_CHROMIUM_EXECUTABLE to the isolated installed Chromium executable');
}

test('reopening the same Chromium profile replaces a replayed expired PAC before backend authentication',{
  timeout:120000,skip:process.env.SPB_PROXY_AUTH_BROWSER!=='1'?'Set SPB_PROXY_AUTH_BROWSER=1 for the isolated Chromium fixture':false,
},async t=>{
  assert.ok(process.env.SPB_PLAYWRIGHT_MODULE);
  const {chromium}=require(process.env.SPB_PLAYWRIGHT_MODULE);
  const temporary=await fs.mkdtemp(path.join(os.tmpdir(),'spb-proxy-restart-'));
  const disposers=[];
  t.after(async()=>{
    for(const dispose of disposers.reverse())await dispose();
    assert.equal(path.dirname(temporary),path.resolve(os.tmpdir()));assert.ok(path.basename(temporary).startsWith('spb-proxy-restart-'));
    await fs.rm(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  });
  async function listen(server){
    const sockets=new Set();server.on('connection',socket=>{sockets.add(socket);socket.on('error',()=>{});socket.once('close',()=>sockets.delete(socket));});
    await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
    let closed=false;
    const close=async()=>{if(closed)return;closed=true;for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));};
    disposers.push(close);return close;
  }
  let backendRequests=0;
  const backend=https.createServer({
    key:await fs.readFile(path.join(desktop,'node_modules/ssh2/test/fixtures/https_key.pem')),
    cert:await fs.readFile(path.join(desktop,'node_modules/ssh2/test/fixtures/https_cert.pem')),
  },(request,response)=>{
    assert.equal(request.url,'/extension/capabilities');assert.equal(request.headers.authorization,'Bearer synthetic-token');
    backendRequests++;response.setHeader('Content-Type','application/json');response.end(JSON.stringify(capabilities));
  });
  await listen(backend);
  const backendOrigin=`https://backend.test:${backend.address().port}`;
  async function proxy(label){
    const credentials={host:'127.0.0.1',port:0,username:label+'-user',password:label+'-secret'};
    const server=http.createServer();const close=await listen(server);credentials.port=server.address().port;
    let connected=0;
    server.on('connect',(request,socket,head)=>{
      const auth='Basic '+Buffer.from(credentials.username+':'+credentials.password).toString('base64');
      if(request.headers['proxy-authorization']!==auth){socket.end('HTTP/1.1 407 Proxy Authentication Required\r\nProxy-Authenticate: Basic realm="fixture"\r\nConnection: close\r\nContent-Length: 0\r\n\r\n');return;}
      if(request.url!=='backend.test:443'){socket.end('HTTP/1.1 502 Bad Gateway\r\nContent-Length: 0\r\n\r\n');return;}
      connected++;
      const remote=net.connect(backend.address().port,'127.0.0.1',()=>{
        socket.write('HTTP/1.1 200 Connection Established\r\n\r\n');if(head.length)remote.write(head);socket.pipe(remote).pipe(socket);
      });
      remote.on('error',()=>socket.destroy());socket.once('close',()=>remote.destroy());
    });
    return {credentials,close,connections:()=>connected};
  }
  const extension=path.join(temporary,'extension');await fs.mkdir(path.join(extension,'runtime'),{recursive:true});
  for(const file of ['guard.mjs','proxy-auth.mjs','proxy-routing.mjs'])await fs.copyFile(path.join(root,'runtime',file),path.join(extension,'runtime',file));
  await fs.writeFile(path.join(extension,'runtime/build.json'),JSON.stringify(build));
  await fs.writeFile(path.join(extension,'previous-pac.json'),'{}');
  await fs.writeFile(path.join(extension,'manifest.json'),JSON.stringify({manifest_version:3,name:'Synthetic persistent proxy bootstrap fixture',version:'1.0.0',
    permissions:['proxy','storage','cookies','webRequest','webRequestAuthProvider'],host_permissions:['<all_urls>'],background:{service_worker:'worker.mjs',type:'module'}}));
  await fs.writeFile(path.join(extension,'worker.mjs'),`
import {installProxyAuthentication} from './runtime/proxy-auth.mjs';
import {boot} from './runtime/guard.mjs';
installProxyAuthentication({early:true});
globalThis.__BOOT_DONE__=(async()=>{
  const replay=await(await fetch(chrome.runtime.getURL('previous-pac.json'))).json();
  if(replay.mode)await new Promise((resolve,reject)=>chrome.proxy.settings.set({scope:'regular',value:replay},()=>chrome.runtime.lastError?reject(new Error(chrome.runtime.lastError.message)):resolve()));
  const previous=await new Promise(resolve=>chrome.proxy.settings.get({incognito:false},resolve));
  const started=await boot();
  const current=await new Promise(resolve=>chrome.proxy.settings.get({incognito:false},resolve));
  return {previous:previous.value,current:current.value,port:started.bootstrap.localProxy.port};
})();
`);
  async function start(entry){
    const bundle=encodeBootstrap({...configuration(entry.credentials),apiBase:backendOrigin+'/extension',authOrigin:backendOrigin});
    await fs.writeFile(path.join(extension,'config.dat'),bundle.configDat);await fs.writeFile(path.join(extension,'init.json'),bundle.initJson);
    const browser=await chromium.launchPersistentContext(path.join(temporary,'profile'),{
      executablePath:await chromiumExecutable(),headless:true,
      ignoreDefaultArgs:['--disable-extensions','--disable-component-extensions-with-background-pages'],
      args:[`--disable-extensions-except=${extension}`,`--load-extension=${extension}`,`--proxy-server=http://127.0.0.1:${entry.credentials.port}`,
        '--host-resolver-rules=MAP backend.test 127.0.0.1',
        '--ignore-certificate-errors','--disable-background-networking','--disable-quic','--no-first-run','--no-default-browser-check'],
    });
    disposers.push(()=>browser.close());
    const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker',{timeout:10000});
    const result=await worker.evaluate(()=>globalThis.__BOOT_DONE__);
    assert.equal(result.current.pacScript.mandatory,true);
    assert.ok(result.current.pacScript.data.includes('127.0.0.1:'+entry.credentials.port));
    return {browser,result};
  }
  const first=await proxy('first');const one=await start(first);
  assert.equal(one.result.port,first.credentials.port);assert.equal(first.connections(),0,'control-plane startup must not depend on the shop proxy gate');
  const second=await proxy('second');assert.notEqual(first.credentials.port,second.credentials.port);
  await one.browser.close();await first.close();
  // Command-line unpacked extensions do not retain their setting consistently
  // across Chromium builds. Explicitly replay the preceding launch's PAC so
  // this regression fixture exercises a genuinely stale, closed proxy port.
  await fs.writeFile(path.join(extension,'previous-pac.json'),JSON.stringify(one.result.current));
  const two=await start(second);
  assert.equal(two.result.previous.mode,'pac_script',JSON.stringify(two.result.previous));
  assert.ok(two.result.previous.pacScript.data.includes('127.0.0.1:'+first.credentials.port),'the test must actually reopen a profile containing the expired PAC');
  assert.equal(two.result.port,second.credentials.port);assert.equal(second.connections(),0);assert.equal(backendRequests,2);
});
