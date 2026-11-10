const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const dgram = require('node:dgram');
const { createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const { proxyError } = require('./ProxyConfig');
const { check, pause } = require('../runtime/Cancellation');

const verified = new Map();
const verifying = new Map();
const owned = new Set();
process.once('exit', () => { for (const child of owned) child.kill(); });

async function verifyFile(file, expected, size) {
  let stat;
  try { stat = await fs.stat(file); } catch { throw proxyError('代理运行组件未安装，请重新构建或安装客户端'); }
  if (!stat.isFile() || (size && stat.size !== size)) throw proxyError('代理运行组件不完整，请重新安装');
  const stamp = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}:${expected}`;
  if (verified.get(file) === stamp) return;
  const key = file + ':' + stamp;
  if (!verifying.has(key)) verifying.set(key, (async () => {
    if (createHash('sha256').update(await fs.readFile(file)).digest('hex') !== expected) throw proxyError('代理运行组件校验失败，请重新安装');
    verified.set(file, stamp);
  })().finally(() => verifying.delete(key)));
  await verifying.get(key);
}

async function resolveProxyBinary(resources, kind = 'xray') {
  const directory = path.resolve(resources, 'proxy-runtime');
  let manifest;
  try { manifest = JSON.parse(await fs.readFile(path.join(directory, kind === 'ssr' ? 'ssr-manifest.json' : 'manifest.json'), 'utf8')); }
  catch { throw proxyError('代理运行组件清单缺失，请重新构建或安装客户端'); }
  const entry = manifest.platforms?.[`${process.platform}-${process.arch}`];
  if (!entry) throw proxyError(`当前系统架构暂无 ${kind === 'ssr' ? 'SSR' : 'Xray'} 运行组件`);
  const executable = path.resolve(directory, entry.file);
  if (!executable.startsWith(directory + path.sep) || !/^[a-f0-9]{64}$/i.test(entry.sha256)) throw proxyError('代理运行组件清单不合法');
  await verifyFile(executable, entry.sha256, entry.size);
  for (const [name, digest] of Object.entries(entry.dependencies || {})) {
    if (path.basename(name) !== name) throw proxyError('代理运行组件依赖不合法');
    await verifyFile(path.join(path.dirname(executable), name), digest);
  }
  return executable;
}

async function reservePorts(count) {
  if (!Number.isInteger(count) || count < 1 || count > 16) throw proxyError('本地代理端口数量不合法');
  const reservations = [];
  const close = async reservation => {
    await Promise.all([
      new Promise(resolve => {
        if (!reservation.server?.listening) return resolve();
        reservation.server.close(() => resolve());
      }),
      new Promise(resolve => {
        if (!reservation.udp) return resolve();
        try { reservation.udp.close(() => resolve()); } catch { resolve(); }
      }),
    ]);
  };
  try {
    for (let index = 0; index < count; index++) {
      let reserved;
      for (let attempt = 0; attempt < 64 && !reserved; attempt++) {
        const candidate = { udp: dgram.createSocket('udp4'), server: net.createServer() };
        try {
          // Windows can exclude UDP ranges while allowing TCP on the same port.
          // SOCKS/SSR listen on both, so let UDP choose an allowed ephemeral port
          // first, then hold its matching TCP socket until the child is spawned.
          await new Promise((resolve, reject) => {
            candidate.udp.once('error', reject);
            candidate.udp.bind({ port: 0, address: '127.0.0.1', exclusive: true }, resolve);
          });
          candidate.port = candidate.udp.address().port;
          await new Promise((resolve, reject) => {
            candidate.server.once('error', reject);
            candidate.server.listen({ port: candidate.port, host: '127.0.0.1', exclusive: true }, resolve);
          });
          reservations.push(candidate); reserved = true;
        } catch (error) {
          await close(candidate);
          if (!['EADDRINUSE', 'EACCES'].includes(error.code)) throw error;
        }
      }
      if (!reserved) throw proxyError('无法分配同时可用的 TCP/UDP 本地代理端口');
    }
    let releasing;
    return { ports: reservations.map(reservation => reservation.port), release: () => releasing ||= Promise.all(reservations.map(close)) };
  } catch (error) {
    await Promise.all(reservations.map(close));
    throw error;
  }
}

function connectable(port) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    let done = false;
    const finish = value => { if (done) return; done = true; socket.destroy(); resolve(value); };
    socket.once('connect', () => finish(true));
    socket.once('error', () => finish(false));
    socket.setTimeout(200, () => finish(false));
  });
}

function authenticateSocks(port, username, password, signal) {
  return new Promise(resolve => {
    const socket = net.connect({ host: '127.0.0.1', port });
    let done = false, stage = 0, pending = Buffer.alloc(0);
    const finish = value => { if (done) return; done = true; signal?.removeEventListener('abort', abort); socket.destroy(); resolve(value); };
    const abort = () => finish(false);
    socket.once('connect', () => socket.write(Buffer.from([5, 1, 2])));
    socket.on('data', chunk => {
      pending = Buffer.concat([pending, chunk]);
      if (pending.length < 2) return;
      if (stage === 0) {
        if (pending[0] !== 5 || pending[1] !== 2) return finish(false);
        pending = pending.subarray(2); stage = 1;
        const user = Buffer.from(username), pass = Buffer.from(password);
        socket.write(Buffer.concat([Buffer.from([1, user.length]), user, Buffer.from([pass.length]), pass]));
      } else finish(pending[0] === 1 && pending[1] === 0);
    });
    socket.once('error', () => finish(false));
    socket.once('close', () => finish(false));
    socket.setTimeout(500, () => finish(false));
    if (signal?.aborted) abort(); else signal?.addEventListener('abort', abort, { once: true });
  });
}

async function verifyXrayInbounds(socksPort, username, password, signal) {
  // A listening TCP port alone could belong to a process that won the bind race.
  // Check both acceptance and rejection without opening any upstream connection.
  const [accepted, rejected] = await Promise.all([
    authenticateSocks(socksPort, username, password, signal),
    authenticateSocks(socksPort, username, password + '-invalid', signal),
  ]);
  return accepted && !rejected;
}

function launchChild(executable, args) {
  const child = spawn(executable, args, { cwd: path.dirname(executable), windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
  owned.add(child);
  child.failure = null;
  child.on('error', () => { child.failure = proxyError('代理运行组件无法启动，请检查文件完整性与系统权限'); });
  child.stdin.on('error', () => {});
  // Drain pipes continuously. Core logs can contain credentials or destinations.
  child.stdout.on('data', () => {});
  child.stderr.on('data', () => {});
  child.once('exit', () => owned.delete(child));
  child.once('close', () => owned.delete(child));
  return child;
}

async function waitListening(child, ports, signal, timeout = 10000, verify) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    check(signal);
    if (child.failure) throw child.failure;
    if (child.exitCode !== null || child.signalCode !== null) throw proxyError('代理运行组件提前退出，请检查协议参数与端口');
    if ((await Promise.all(ports.map(connectable))).every(Boolean) && (!verify || await verify())) {
      check(signal);
      if (child.exitCode !== null || child.signalCode !== null || child.failure) throw child.failure || proxyError('代理运行组件提前退出');
      return;
    }
    await pause(25, signal);
  }
  throw proxyError('本地代理启动超时，请检查系统权限与端口占用');
}

async function stopChild(child) {
  if (!child || child.exitCode !== null || child.signalCode !== null || !child.pid) return;
  await new Promise(resolve => {
    let settled = false;
    const finish = () => { if (settled) return; settled = true; clearTimeout(force); clearTimeout(deadline); child.removeListener('exit', finish); resolve(); };
    const force = setTimeout(() => child.kill('SIGKILL'), 800);
    const deadline = setTimeout(finish, 2000);
    child.once('exit', finish);
    child.kill();
  });
}

module.exports = { resolveProxyBinary, reservePorts, launchChild, waitListening, verifyXrayInbounds, stopChild };
