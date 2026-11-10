const test = require('node:test');
const assert = require('node:assert/strict');
const net = require('node:net');
const { once } = require('node:events');
const { Socks4Client } = require('../src/main/services/Socks4Client');

async function gateway(t, receive) {
  const sockets=new Set();
  const server=net.createServer(socket=>{
    sockets.add(socket); socket.on('error',()=>{}); socket.once('close',()=>sockets.delete(socket));
    receive(socket);
  });
  server.listen(0,'127.0.0.1'); await once(server,'listening');
  t.after(async()=>{for(const socket of sockets)socket.destroy();await new Promise(resolve=>server.close(resolve));});
  return server.address().port;
}
async function client(t, port, protocol='socks4a', extras={}) {
  const connection=new Socks4Client(extras);
  t.after(()=>connection.destroy());
  connection.connect({protocol,host:'127.0.0.1',port,username:'fixture-user',readyTimeout:200});
  await once(connection,'ready');
  return connection;
}
function forward(connection,host='unresolvable.fixture.invalid') {
  return new Promise((resolve,reject)=>connection.forwardOut('127.0.0.1',1234,host,443,(error,socket)=>error?reject(error):resolve(socket)));
}

test('SOCKS4a sends its real domain and preserves payload after a fragmented reply', async t=>{
  const port=await gateway(t,socket=>socket.once('data',request=>{
    assert.deepEqual([...request.subarray(0,8)],[4,1,1,187,0,0,0,1]);
    assert.equal(request.subarray(8).toString(),'fixture-user\0unresolvable.fixture.invalid\0');
    socket.write(Buffer.from([0,0x5a,0]));
    setImmediate(()=>socket.write(Buffer.concat([Buffer.alloc(5),Buffer.from('preserved-payload')])));
  }));
  const connection=await client(t,port);
  const socket=await forward(connection);
  const data=once(socket,'data');socket.resume();
  assert.equal((await data)[0].toString(),'preserved-payload');
});

test('SOCKS4 resolves domains to IPv4 locally and sends no domain trailer', async t=>{
  let lookups=0;
  const port=await gateway(t,socket=>socket.once('data',request=>{
    assert.deepEqual([...request.subarray(0,8)],[4,1,1,187,192,0,2,8]);
    assert.equal(request.subarray(8).toString(),'fixture-user\0');
    socket.write(Buffer.from([0,0x5a,0,0,0,0,0,0]));
  }));
  const connection=await client(t,port,'socks4',{lookup(host,options,reply){lookups++;assert.equal(host,'unresolvable.fixture.invalid');assert.equal(options.family,4);queueMicrotask(()=>reply(null,'192.0.2.8'));}});
  await forward(connection);assert.equal(lookups,1);
});

test('reject and malformed responses fail without exposing upstream bytes', async t=>{
  for(const response of [[0,0x5b,0,0,0,0,0,0],[5,0x5a,0,0,0,0,0,0]]){
    const port=await gateway(t,socket=>socket.once('data',()=>socket.write(Buffer.from(response))));
    const connection=await client(t,port);
    await assert.rejects(forward(connection),/拒绝连接或返回无效响应/);
    connection.destroy();
  }
});

test('truncated response and stalled handshake fail within bounded time', async t=>{
  for(const truncated of [true,false]){
    const port=await gateway(t,socket=>socket.once('data',()=>{if(truncated)socket.end(Buffer.from([0,0x5a]));}));
    const connection=await client(t,port);
    await assert.rejects(forward(connection),truncated?/握手完成前断开/:/握手超时/);
  }
});

test('destroy cancels an outstanding lookup without opening a connection later', async t=>{
  let completeLookup,connections=0,calls=0;
  const connection=await client(t,1080,'socks4',{lookup(_host,_options,reply){completeLookup=reply;},connect(){connections++;throw new Error('Must not connect');}});
  const pending=new Promise(resolve=>connection.forwardOut('',0,'unresolvable.fixture.invalid',443,error=>{calls++;assert.match(error.message,/取消/);resolve();}));
  connection.destroy();await pending;
  completeLookup(null,'192.0.2.8');await new Promise(resolve=>setImmediate(resolve));
  assert.equal(calls,1);assert.equal(connections,0);
});

test('destroy closes both established sockets and pending handshakes', async t=>{
  let opened=0,pendingSocket;
  const port=await gateway(t,socket=>socket.once('data',()=>{
    opened++;
    if(opened===1)socket.write(Buffer.from([0,0x5a,0,0,0,0,0,0]));
    else pendingSocket=socket;
  }));
  const connection=await client(t,port);
  const established=await forward(connection);
  let calls=0;
  const pending=new Promise(resolve=>connection.forwardOut('',0,'other.fixture.invalid',443,error=>{calls++;assert.match(error.message,/取消/);resolve();}));
  while(!pendingSocket)await new Promise(resolve=>setImmediate(resolve));
  const closed=once(pendingSocket,'close');connection.destroy();await pending;await closed;
  assert.equal(established.destroyed,true);assert.equal(calls,1);
});

test('IPv6 targets and NUL user IDs cannot produce an invalid SOCKS4 request', async t=>{
  const connection=await client(t,1080);
  await assert.rejects(forward(connection,'::1'),/不支持 IPv6/);
  assert.throws(()=>new Socks4Client().connect({protocol:'socks4',host:'127.0.0.1',port:1080,username:'a\0b'}),/用户标识/);
});
