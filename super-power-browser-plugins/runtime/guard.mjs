// Runs before the extension worker. Never clear or replace a browser proxy
// before authenticated startup configuration and the host contract are valid.
import {configureProxyAuthentication} from './proxy-auth.mjs';
import {createProxyPac} from './proxy-routing.mjs';
const bytes = text => Uint8Array.from(atob(text), c => c.charCodeAt(0));
const utf8 = new TextEncoder();
export async function readBootstrap(configText, initText, cryptoApi = crypto) {
  const parts = configText.trim().split('|');
  if (parts.length !== 3) throw new Error('启动密钥格式错误');
  const offsetBytes = bytes(parts[1]);
  if (offsetBytes.length !== 4) throw new Error('启动密钥偏移错误');
  const offset = new DataView(offsetBytes.buffer).getUint32(0, true);
  const raw = utf8.encode(parts[0].slice(offset, offset + 32));
  if (raw.length !== 32) throw new Error('启动密钥长度错误');
  const envelope = JSON.parse(new TextDecoder().decode(bytes(initText.trim())));
  const macKey = await cryptoApi.subtle.importKey('raw', raw, { name: 'HMAC', hash: 'SHA-256' }, false, ['verify']);
  if (!/^[a-f0-9]{64}$/i.test(envelope.mac ?? '')) throw new Error('启动配置校验失败');
  const signature = Uint8Array.from(envelope.mac.match(/../g), h => parseInt(h, 16));
  if (!await cryptoApi.subtle.verify('HMAC', macKey, signature, utf8.encode(envelope.iv + envelope.value))) throw new Error('启动配置校验失败');
  const aesKey = await cryptoApi.subtle.importKey('raw', raw, 'AES-CBC', false, ['decrypt']);
  const plain = await cryptoApi.subtle.decrypt({ name: 'AES-CBC', iv: bytes(envelope.iv) }, aesKey, bytes(envelope.value));
  const config = JSON.parse(new TextDecoder().decode(plain));
  if (!config.accessToken || !config.browserId || !config.sysMallId || !config.websocketPort) throw new Error('启动配置不完整');
  if (!config.proxyInfo?.proxyAuthUrl && !config.proxyInfo?.proxyUrl) throw new Error('店铺代理尚未配置');
  if (!config.staticProxy?.exchange) throw new Error('翻译代理尚未配置');
  return config;
}

export async function checkBackend(build, bootstrap, fetcher = fetch, timeoutMs = 8000) {
  if (build.mode === 'legacy') return;
  const response = await fetcher(`${build.apiBase}/capabilities`, {
    headers: { Authorization: `Bearer ${bootstrap.accessToken}` },
    signal: AbortSignal.timeout(Math.max(1,Math.ceil(timeoutMs))), redirect: 'error', cache: 'no-store',
  });
  if (!response.ok) throw new Error(`插件后台尚未就绪（HTTP ${response.status}）`);
  const body = await response.json();
  if (body.protocol !== 'super-power-browser-extension/1' || body.ready !== true || body.nativeBridge !== true) throw new Error('后台未声明完整插件协议和桌面通信支持');
  const missing = build.requiredMethods.filter(method => !body.methods?.includes(method));
  if (missing.length) throw new Error(`后台缺少 ${missing.length} 项插件接口：${missing.slice(0, 3).join('、')}`);
}

async function prepareProxyRouting(chromeApi, bootstrap) {
  // Account helper has no proxy permission. Only the mall helper controls PAC.
  if (!chromeApi.proxy?.settings) return false;
  const data = createProxyPac(bootstrap);
  await new Promise((resolve, reject) => chromeApi.proxy.settings.set({
    scope:'regular', value:{mode:'pac_script',pacScript:{data,mandatory:true}},
  }, () => {
    const error=chromeApi.runtime.lastError;
    error ? reject(new Error('无法设置当前店铺代理，请重新打开店铺')) : resolve();
  }));
  return true;
}

async function checkBackendAfterRouting(build, bootstrap, fetcher, controlsProxy) {
  if(build.mode!=='superpower'||controlsProxy)return checkBackend(build,bootstrap,fetcher);
  const deadline=Date.now()+8000;
  let previous;
  for (;;) {
    if(Date.now()>=deadline)throw previous||new Error('插件后台连接超时');
    try { return await checkBackend(build, bootstrap, fetcher,deadline-Date.now()); }
    catch (error) {
      // Both workers start independently. Account startup may hit the previous
      // profile's PAC before the mall helper replaces its now-closed ports.
      // Retry only transport failures, never invalid capabilities or HTTP auth.
      if (!(error instanceof TypeError)||Date.now()>=deadline) throw error;
      previous=error;
      await new Promise(resolve=>setTimeout(resolve,Math.min(200,deadline-Date.now())));
    }
  }
}

export async function boot(chromeApi = chrome, fetcher = fetch) {
  const read = async file => {
    try {
      const r = await fetcher(chromeApi.runtime.getURL(file));
      if (!r.ok) throw new Error('missing');
      return await r.text();
    } catch { throw new Error(`缺少 ${file}，请从桌面客户端启动店铺`); }
  };
  const [buildText, configText, initText] = await Promise.all(['runtime/build.json', 'config.dat', 'init.json'].map(read));
  const build = JSON.parse(buildText), bootstrap = await readBootstrap(configText, initText);
  if(build.mode==='superpower'&&bootstrap.apiBase){
    const endpoint=new URL(bootstrap.apiBase);
    if(endpoint.protocol!=='https:'&&!(endpoint.protocol==='http:'&&['127.0.0.1','localhost'].includes(endpoint.hostname)))throw new Error('插件后台地址必须使用 HTTPS 或本机地址');
    build.compiledApiBase=build.apiBase;build.apiBase=bootstrap.apiBase;build.authOrigin=bootstrap.authOrigin;
  }
  let controlsProxy=false;
  if (build.mode === 'superpower') {
    if (bootstrap.desktopProtocol !== 'super-power-browser-desktop/1' || bootstrap.kernelProtocol !== 'fingerprint-chromium/1') throw new Error('桌面与独立内核启动协议不匹配');
    if (!chromeApi.storage?.session || !chromeApi.cookies) throw new Error('当前浏览器缺少必需的扩展能力');
    configureProxyAuthentication(bootstrap);
    // A profile may retain an earlier extension PAC, and resource/direct rules
    // also differ from the command-line proxy. Install current routing first.
    controlsProxy=await prepareProxyRouting(chromeApi,bootstrap);
  } else if (!chromeApi.superbrowser) throw new Error('当前浏览器缺少所需的专用内核接口');
  await checkBackendAfterRouting(build, bootstrap, fetcher, controlsProxy);
  bootstrap.authOrigin ||= build.authOrigin;
  return { build, bootstrap };
}

export function backendFetch(originalFetch,build,bootstrap){
  const compiled=build.compiledApiBase||build.apiBase;
  return (input,options={})=>{
    const url=typeof input==='string'?input:input instanceof URL?input.href:input.url;
    if(url===compiled||url.startsWith(compiled+'/')){
      const headers=new Headers(options.headers||input?.headers);headers.set('Authorization',`Bearer ${bootstrap.accessToken}`);
      const target=build.apiBase+url.slice(compiled.length);
      const request=input instanceof Request?new Request(target,input):target;
      return originalFetch(request,{...options,headers,redirect:'error'});
    }
    return originalFetch(input,options);
  };
}

export function run(start) {
  // Listener is registered synchronously for MV3 worker wakeups.
  chrome.runtime.onMessage.addListener((message, sender, reply) => {
    if (message?.type !== 'sp:startup-status' || sender.id !== chrome.runtime.id) return;
    chrome.storage.local.get('spStartup').then(reply);
    return true;
  });
  return boot().then(async ({ build, bootstrap }) => {
    globalThis.__SP_BUILD__ = build;
    globalThis.__SP_BOOTSTRAP__ = bootstrap;
    if(build.mode==='superpower'){
      await chrome.storage.session.set({spEndpoint:build.apiBase});
      globalThis.fetch=backendFetch(globalThis.fetch.bind(globalThis),build,bootstrap);
    }
    await chrome.storage.local.set({ spStartup: { state: 'starting', message: '配置校验通过，正在连接店铺服务', mode: build.mode, at: new Date().toISOString() } });
    await chrome.action.setBadgeText({ text: '' });
    // Restore the account popup after recovering from an incomplete setup.
    await chrome.action.setPopup({ popup: build.defaultPopup });
    return start();
  }).catch(async error => {
    await chrome.storage.local.set({ spStartup: { state: 'blocked', message: error.message, at: new Date().toISOString() } });
    await chrome.action.setBadgeText({ text: '!' });
    await chrome.action.setBadgeBackgroundColor({ color: '#b45309' });
    await chrome.action.setPopup({ popup: 'runtime/status.html' });
  });
}
