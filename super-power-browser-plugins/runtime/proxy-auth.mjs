// Reply only to the private loopback proxy chosen by the desktop. Never supply
// these credentials to website authentication or arbitrary upstream challenges.
const installed = new WeakSet();
let configured, resolveConfiguration;
const configurationReady = new Promise(resolve => { resolveConfiguration = resolve; });
export function configureProxyAuthentication(configuration) {
  configured = configuration;
  resolveConfiguration(configuration);
}

export function proxyAuthentication(details, config) {
  if (!details.isProxy || details.statusCode !== 407) return null;
  const proxy = [config?.localProxy, config?.localResourceProxy].find(value => value?.host === '127.0.0.1' &&
    details.challenger?.host === value.host && Number(details.challenger?.port) === value.port && value.username && value.password);
  if (!proxy) return null;
  return { username: proxy.username, password: proxy.password };
}

export function installProxyAuthentication({early = false} = {}) {
  if (!early && globalThis.__SP_BUILD__?.mode !== 'superpower') return;
  if (installed.has(chrome.webRequest)) return;
  installed.add(chrome.webRequest);
  const attempts = new Map();
  chrome.webRequest.onAuthRequired.addListener((details, callback) => {
    if (!details.isProxy || details.statusCode !== 407) { callback({}); return; }
    const reply = configuration => {
      const authCredentials = proxyAuthentication(details, configuration);
      if (!authCredentials) { callback({}); return; }
      const count = attempts.get(details.requestId) || 0;
      if (count >= 2) { callback({ cancel: true }); return; }
      if (attempts.size >= 1024) attempts.delete(attempts.keys().next().value);
      attempts.set(details.requestId, count + 1);
      callback({ authCredentials });
    };
    const configuration = globalThis.__SP_BOOTSTRAP__ || configured;
    if (configuration) { reply(configuration); return; }
    // MV3 listeners must be registered on worker evaluation, before async boot.
    // Release verified local credentials before checking the remote API, whose
    // own request may already need this proxy authentication.
    let timer;
    Promise.race([configurationReady, new Promise(resolve => { timer = setTimeout(() => resolve(null), 8000); })])
      .then(reply).finally(() => clearTimeout(timer));
  }, { urls: ['<all_urls>'] }, ['asyncBlocking']);
  const clear = details => attempts.delete(details.requestId);
  chrome.webRequest.onCompleted.addListener(clear, { urls: ['<all_urls>'] });
  chrome.webRequest.onErrorOccurred.addListener(clear, { urls: ['<all_urls>'] });
}
