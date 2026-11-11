const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const WebSocket = require('ws');
const { prepareLaunch } = require('../src/main/runtime/IndependentKernel');

// Opt in with SPB_FINGERPRINT_EXECUTABLE pointing to a fingerprint-chromium
// binary. No installed shop profile, runtime config, or external service is read.
// Headed is the default. SPB_FINGERPRINT_HEADLESS=1 is a separate, limited run;
// its graphics/font results must not be described as headed-browser validation.
const executable = process.env.SPB_FINGERPRINT_EXECUTABLE;
const headless = process.env.SPB_FINGERPRINT_HEADLESS === '1';
const pageUrl = 'http://fingerprint.invalid/native-fixture';
const pause = milliseconds => new Promise(resolve => setTimeout(resolve, milliseconds));
const digest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

async function localProxy() {
  const sockets = new Set();
  const requests = [];
  const server = http.createServer((request, response) => {
    if (request.method !== 'GET' || request.url !== pageUrl) {
      response.writeHead(502); response.end('External requests are disabled'); return;
    }
    requests.push({ language: request.headers['accept-language'] || '' });
    response.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
      'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; img-src data:; connect-src 'none'",
    });
    response.end('<!doctype html><html><head><title>Isolated native fingerprint test</title></head><body></body></html>');
  });
  server.on('connection', socket => {
    sockets.add(socket); socket.on('close', () => sockets.delete(socket));
  });
  server.on('connect', (_request, socket) => socket.destroy());
  await new Promise((resolve, reject) => {
    server.once('error', reject); server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`, requests,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise(resolve => server.close(resolve));
    },
  };
}

async function connectCdp(url) {
  const socket = new WebSocket(url);
  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { socket.terminate(); reject(new Error('CDP connection timeout')); }, 5000);
    socket.once('open', () => { clearTimeout(timer); resolve(); });
    socket.once('error', error => { clearTimeout(timer); reject(error); });
  });
  let sequence = 0;
  const pending = new Map();
  socket.on('message', raw => {
    const message = JSON.parse(raw);
    const operation = pending.get(message.id);
    if (!operation) return;
    pending.delete(message.id); clearTimeout(operation.timer);
    message.error ? operation.reject(new Error(message.error.message)) : operation.resolve(message.result);
  });
  socket.on('close', () => {
    for (const operation of pending.values()) {
      clearTimeout(operation.timer); operation.reject(new Error('Isolated browser closed'));
    }
    pending.clear();
  });
  return {
    send(method, params = {}, sessionId) {
      return new Promise((resolve, reject) => {
        const id = ++sequence;
        const timer = setTimeout(() => { pending.delete(id); reject(new Error(`CDP timeout: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timer });
        socket.send(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }));
      });
    },
    close() { socket.close(); },
  };
}

// Browser-native reads only: there are no CDP emulation overrides, injected
// navigator properties, extension shims, or replaced graphics/audio methods.
async function measureNative() {
  await document.fonts.ready;
  const canvas = document.createElement('canvas');
  canvas.width = 320; canvas.height = 100;
  const context = canvas.getContext('2d');
  context.fillStyle = '#f4b240'; context.fillRect(3, 5, 210, 55);
  context.font = '18px Arial'; context.fillStyle = '#164a8d';
  context.fillText('Native fingerprint 0123456789', 11, 31);
  context.globalCompositeOperation = 'multiply';
  context.beginPath(); context.arc(154, 49, 28, 0, Math.PI * 2); context.fill();
  const canvasData = canvas.toDataURL();

  const audioContext = new OfflineAudioContext(1, 8192, 44100);
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'triangle'; oscillator.frequency.value = 10000;
  const compressor = audioContext.createDynamicsCompressor();
  compressor.threshold.value = -50; compressor.knee.value = 40;
  compressor.ratio.value = 12; compressor.attack.value = 0; compressor.release.value = 0.25;
  oscillator.connect(compressor); compressor.connect(audioContext.destination); oscillator.start(0);
  const rendered = await audioContext.startRendering();
  const audio = Array.from(rendered.getChannelData(0));
  oscillator.disconnect(); compressor.disconnect();

  const graphics = document.createElement('canvas');
  graphics.width = 64; graphics.height = 64;
  const gl = graphics.getContext('webgl', { antialias: false, preserveDrawingBuffer: true });
  if (!gl) throw new Error('Native WebGL context is unavailable');
  const shader = (type, source) => {
    const result = gl.createShader(type); gl.shaderSource(result, source); gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  };
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, 'attribute vec2 p;void main(){gl_Position=vec4(p,0.0,1.0);}'));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, 'precision mediump float;void main(){gl_FragColor=vec4(gl_FragCoord.x/64.0,gl_FragCoord.y/64.0,0.37,1.0);}'));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-0.8, -0.7, 0.9, -0.4, -0.2, 0.9]), gl.STATIC_DRAW);
  const location = gl.getAttribLocation(program, 'p');
  gl.enableVertexAttribArray(location); gl.vertexAttribPointer(location, 2, gl.FLOAT, false, 0, 0);
  gl.clearColor(0.12, 0.23, 0.34, 1); gl.clear(gl.COLOR_BUFFER_BIT); gl.drawArrays(gl.TRIANGLES, 0, 3);
  const pixels = new Uint8Array(64 * 64 * 4); gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
  const debug = gl.getExtension('WEBGL_debug_renderer_info');
  const webgl = {
    vendor: gl.getParameter(gl.VENDOR), renderer: gl.getParameter(gl.RENDERER),
    unmaskedVendor: debug && gl.getParameter(debug.UNMASKED_VENDOR_WEBGL),
    unmaskedRenderer: debug && gl.getParameter(debug.UNMASKED_RENDERER_WEBGL),
    maxTexture: gl.getParameter(gl.MAX_TEXTURE_SIZE), pixels: Array.from(pixels),
  };
  gl.getExtension('WEBGL_lose_context')?.loseContext();

  const element = document.createElement('div');
  element.style.cssText = 'position:absolute;left:17.25px;top:20.5px;width:217.375px;font:17px/23px Arial;letter-spacing:0.125px;transform:rotate(0.12deg);';
  element.textContent = 'Native geometry 0123456789: stable across restarts.';
  document.body.appendChild(element);
  const rect = value => Object.fromEntries(['x', 'y', 'width', 'height', 'top', 'right', 'bottom', 'left'].map(key => [key, value[key]]));
  const range = document.createRange(); range.selectNodeContents(element);
  const clientRects = { bounding: rect(element.getBoundingClientRect()), lines: Array.from(range.getClientRects(), rect) };
  element.remove();
  const fonts = {};
  for (const [sample, text] of Object.entries({
    ascii: 'mmmmmmmmmmlli 0123456789', japanese: '\u65e5\u672c\u8a9e\u304b\u306a\u30ab\u30ca', chinese: '\u4e2d\u6587\u6c49\u5b57\u6d4b\u8bd5',
  })) {
    fonts[sample] = {};
    for (const family of ['Arial', 'Times New Roman', 'Courier New', 'Verdana', 'monospace', 'sans-serif', 'serif', 'SPB absent synthetic font']) {
      // CSS generic families must be unquoted. The nonexistent named family
      // separately measures locale-dependent fallback to a default font.
      const generic = ['monospace', 'sans-serif', 'serif'].includes(family);
      context.font = `23px ${generic ? family : JSON.stringify(family)}`;
      const metrics = context.measureText(text);
      fonts[sample][family] = {
        available: document.fonts.check(context.font, text), width: metrics.width,
        ascent: metrics.actualBoundingBoxAscent, descent: metrics.actualBoundingBoxDescent,
        left: metrics.actualBoundingBoxLeft, right: metrics.actualBoundingBoxRight,
      };
    }
  }
  const dates = ['2026-01-15T12:00:00Z', '2026-07-15T12:00:00Z'];
  const marker = localStorage.getItem('spb-native-fixture');
  localStorage.setItem('spb-native-fixture', 'synthetic-profile-retained');
  return {
    fixed: {
      canvas: canvasData, audio, webgl, clientRects, fonts,
      userAgent: navigator.userAgent, platform: navigator.platform,
      hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory,
    },
    locale: {
      language: navigator.language, languages: Array.from(navigator.languages),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      offsets: dates.map(value => new Date(value).getTimezoneOffset()),
      rendered: dates.map(value => new Date(value).toString()),
    },
    marker,
  };
}

test('native fingerprint stability and locale behavior across isolated restarts', {
  skip: !executable && 'Set SPB_FINGERPRINT_EXECUTABLE to opt into isolated native validation',
  timeout: 120000,
}, async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'spb-native-fingerprint-'));
  const profile = path.join(root, 'profile');
  const downloads = path.join(root, 'downloads');
  const proxies = [];
  let child, cdp, exited, spawnError, childClosed = true;
  const waitExit = timeout => new Promise(resolve => {
    const timer = setTimeout(resolve, timeout);
    exited.then(() => { clearTimeout(timer); resolve(); });
  });
  const stop = async () => {
    if (!child) return;
    try {
      if (!childClosed && cdp) await cdp.send('Browser.close').catch(() => {});
      if (!childClosed) await waitExit(5000);
      if (!childClosed) { child.kill(); await waitExit(3000); }
      assert.ok(childClosed, 'The test-owned browser must exit before its profile is removed');
    } finally { cdp?.close(); cdp = null; if (childClosed) child = null; }
  };
  try {
    assert.ok((await fs.stat(executable)).isFile(), 'The explicit native executable must exist');
    await fs.mkdir(profile); await fs.mkdir(downloads);
    proxies.push(await localProxy(), await localProxy());
    assert.notEqual(proxies[0].url, proxies[1].url);
    const kernel = {
      protocol: 'fingerprint-chromium/1', version: '144', fullVersion: '144.0.7559.132',
      sha256: createHash('sha256').update(await fs.readFile(executable)).digest('hex'),
    };
    const base = {
      kernelVersion: kernel.fullVersion, fingerprintSeed: 'synthetic-native-stability-seed-v1', proxy: {},
      fingerprint: {
        os: 'Windows', language: 'en-US,en', timezone: 'Etc/UTC', resolution: '1100x720',
        hardwareConcurrency: 8, webRtc: 'privacy', hardwareAcceleration: true,
      },
    };
    const sample = async (proxy, fingerprint = base.fingerprint) => {
      await fs.rm(path.join(profile, 'DevToolsActivePort'), { force: true });
      const { args } = await prepareLaunch({ ...base, fingerprint }, {
        kernel, profile, downloads, plugins: [], proxyUrl: proxy.url, debugPort: 0,
      });
      args.push('--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE 127.0.0.1, EXCLUDE localhost');
      args.push(headless ? '--headless=new' : '--start-minimized');
      spawnError = null; childClosed = false;
      child = spawn(executable, args, { cwd: path.dirname(executable), windowsHide: true, stdio: 'ignore' });
      exited = new Promise(resolve => {
        child.once('error', error => { spawnError = error; if (!child.pid) { childClosed = true; resolve(); } });
        child.once('exit', () => { childClosed = true; resolve(); });
      });
      try {
        const deadline = Date.now() + 20000;
        while (Date.now() < deadline) {
          if (spawnError) throw spawnError;
          assert.equal(child.exitCode, null, 'Native browser exited during startup');
          try {
            const port = Number((await fs.readFile(path.join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]);
            const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
            cdp = await connectCdp((await response.json()).webSocketDebuggerUrl); break;
          } catch { await pause(100); }
        }
        assert.ok(cdp, 'Native browser must expose its own local debugging endpoint');
        const { targetInfos } = await cdp.send('Target.getTargets');
        const target = targetInfos.find(item => item.type === 'page' && item.url === 'about:blank');
        assert.ok(target, 'The isolated initial page must exist');
        if (!headless) {
          const { windowId } = await cdp.send('Browser.getWindowForTarget', { targetId: target.targetId });
          await cdp.send('Browser.setWindowBounds', { windowId, bounds: { windowState: 'minimized' } });
        }
        const { sessionId } = await cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
        await cdp.send('Page.navigate', { url: pageUrl }, sessionId);
        let ready = false;
        for (let attempt = 0; attempt < 100; attempt++) {
          const state = await cdp.send('Runtime.evaluate', {
            expression: `location.href === ${JSON.stringify(pageUrl)} && document.readyState === 'complete'`, returnByValue: true,
          }, sessionId);
          if (state.result?.value) { ready = true; break; }
          await pause(50);
        }
        assert.ok(ready, 'Only the loopback proxy may serve the measurement page');
        const result = await cdp.send('Runtime.evaluate', {
          expression: `(${measureNative.toString()})()`, awaitPromise: true, returnByValue: true,
        }, sessionId);
        assert.equal(result.exceptionDetails, undefined, result.exceptionDetails?.text || 'Native measurement failed');
        const snapshot = result.result.value;
        snapshot.identitySeed = JSON.parse(await fs.readFile(path.join(profile, 'spb-identity.json'), 'utf8')).seed;
        assert.ok(snapshot.fixed.audio.some(value => value !== 0), 'OfflineAudio must produce measurable samples');
        assert.ok(snapshot.fixed.webgl.pixels.some(value => value !== 0), 'WebGL must produce measurable pixels');
        assert.equal(snapshot.fixed.hardwareConcurrency, 8);
        assert.match(snapshot.fixed.userAgent, /Chrome\/144\.0\.7559\.132/);
        return snapshot;
      } finally { await stop(); }
    };
    const first = await sample(proxies[0]);
    const newProxy = await sample(proxies[1]);
    const newLocale = await sample(proxies[1], { ...base.fingerprint, language: 'ja-JP,ja', timezone: 'Asia/Tokyo' });
    const restoredLocale = await sample(proxies[1]);
    assert.equal(first.marker, null);
    assert.equal(newProxy.marker, 'synthetic-profile-retained');
    assert.equal(newLocale.marker, 'synthetic-profile-retained');
    assert.equal(restoredLocale.marker, 'synthetic-profile-retained');
    assert.equal(proxies[0].requests.length, 1);
    assert.equal(proxies[1].requests.length, 3);
    const fontChanges = Object.keys(first.fixed.fonts).flatMap(sample => Object.keys(first.fixed.fonts[sample]).filter(family =>
      digest(first.fixed.fonts[sample][family]) !== digest(newLocale.fixed.fonts[sample][family])).map(family => ({
        sample, family, changedMetrics: Object.keys(first.fixed.fonts[sample][family]).filter(metric =>
          first.fixed.fonts[sample][family][metric] !== newLocale.fixed.fonts[sample][family][metric]),
      })));
    await t.test('a changed loopback proxy entry preserves every measured fixed field', () => {
      for (const key of Object.keys(first.fixed)) assert.equal(digest(newProxy.fixed[key]), digest(first.fixed[key]), key);
      assert.equal(newProxy.identitySeed, first.identitySeed);
      assert.deepEqual(newProxy.locale, first.locale);
    });
    await t.test('locale changes preserve fixed native surfaces and named ASCII font measurements', () => {
      for (const key of Object.keys(first.fixed).filter(key => key !== 'fonts')) assert.equal(digest(newLocale.fixed[key]), digest(first.fixed[key]), key);
      assert.equal(newLocale.identitySeed, first.identitySeed);
      for (const family of ['Arial', 'Times New Roman', 'Courier New', 'Verdana']) {
        assert.deepEqual(newLocale.fixed.fonts.ascii[family], first.fixed.fonts.ascii[family], family);
      }
    });
    await t.test('navigator languages, request headers, Intl timezone, and Date reflect native locale settings', () => {
      assert.deepEqual(first.locale.languages, ['en-US', 'en']);
      assert.deepEqual(newLocale.locale.languages, ['ja-JP', 'ja']);
      assert.equal(newLocale.locale.language, 'ja-JP');
      assert.ok(['UTC', 'Etc/UTC'].includes(first.locale.timezone));
      assert.equal(newLocale.locale.timezone, 'Asia/Tokyo');
      assert.deepEqual(first.locale.offsets, [0, 0]);
      assert.deepEqual(newLocale.locale.offsets, [-540, -540]);
      assert.notDeepEqual(newLocale.locale.rendered, first.locale.rendered);
      assert.match(proxies[0].requests[0].language, /^en-US/);
      assert.match(proxies[1].requests[1].language, /^ja-JP/);
    });
    await t.test('restoring the original locale restores every font measurement as well', () => {
      for (const key of Object.keys(first.fixed)) assert.equal(digest(restoredLocale.fixed[key]), digest(first.fixed[key]), key);
      assert.deepEqual(restoredLocale.locale, first.locale);
      assert.equal(restoredLocale.identitySeed, first.identitySeed);
    });
    t.diagnostic(JSON.stringify({ mode: headless ? 'headless-limited' : 'headed-minimized',
      version: kernel.fullVersion, measured: Object.keys(first.fixed),
      baseline: first.locale, changed: newLocale.locale,
      proxyStable: Object.keys(first.fixed).filter(key => digest(first.fixed[key]) === digest(newProxy.fixed[key])),
      localeStable: Object.keys(first.fixed).filter(key => digest(first.fixed[key]) === digest(newLocale.fixed[key])),
      fontChanges,
    }));
  } finally {
    await stop();
    await Promise.all(proxies.map(proxy => proxy.close()));
    const target = await fs.realpath(root);
    assert.equal(path.dirname(target), await fs.realpath(os.tmpdir()));
    assert.ok(path.basename(target).startsWith('spb-native-fingerprint-'));
    await fs.rm(target, { recursive: true, force: true, maxRetries: 10, retryDelay: 200 });
  }
});
