function endpoint(proxy) {
  if (proxy?.host !== '127.0.0.1' || !Number.isInteger(proxy.port) || proxy.port < 1 || proxy.port > 65535) {
    throw new Error('本地代理入口不合法');
  }
  return `PROXY 127.0.0.1:${proxy.port}`;
}
function domains(value) {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length > 100) throw new Error('网站分流规则不合法');
  return [...new Set(value.map(domain => {
    if (typeof domain !== 'string' || domain.length > 255) throw new Error('网站分流域名不合法');
    domain = domain.toLowerCase();
    const host = domain.startsWith('*.') ? domain.slice(2) : domain;
    if (!host.includes('.') || /^[\d.]+$/.test(host) || host === 'home.arpa' || host.endsWith('.home.arpa') ||
        /\.(?:localhost|local|localdomain|lan|internal)$/.test(host) ||
        !host.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) throw new Error('网站分流域名不合法');
    return domain;
  }))];
}

// Only the authenticated backend origin can bypass the closed shop gate.
// Its scheme and port matter; other services on the same host stay isolated.
export function controlPlaneOrigin(config) {
  if (!config.apiBase) return '';
  let endpoint, auth;
  try { endpoint = new URL(config.apiBase); auth = new URL(config.authOrigin); }
  catch { throw new Error('插件后台地址配置不完整'); }
  const local = endpoint.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(endpoint.hostname);
  if ((!local && endpoint.protocol !== 'https:') || endpoint.username || endpoint.password ||
      auth.username || auth.password || auth.pathname !== '/' || auth.search || auth.hash || endpoint.origin !== auth.origin) {
    throw new Error('插件后台必须使用匹配认证源的 HTTPS 或本机地址');
  }
  return local ? '' : endpoint.origin;
}

// Preserve the old order: translation/static/CDN resources, explicit direct
// rules, then the shop proxy. No failure fallback or vendor-owned CDN rewrite.
export function createProxyPac(config, {verified=false}={}) {
  const shop = endpoint(config.localProxy), routing = config.proxyRouting || {};
  const controlOrigin = controlPlaneOrigin(config);
  const configuredResources = [...domains(routing.resourceDomains), ...domains(routing.cdnDomains)];
  const configuredDirect = domains(routing.directDomains);
  // Until the desktop confirms the exit, every public destination goes through
  // its closed startup gate. Resource proxies must not bypass that gate either.
  const resourceDomains = verified ? configuredResources : [];
  const directDomains = verified ? configuredDirect : [];
  if (resourceDomains.length && !config.localResourceProxy) throw new Error('资源分流尚未配置专用代理');
  const resource = config.localResourceProxy ? endpoint(config.localResourceProxy) : shop;
  return `function FindProxyForURL(url,host){
  host=host.toLowerCase().replace(/\\.$/,'');
  if(host==='127.0.0.1'||host==='localhost'||host==='::1'||host==='[::1]')return 'DIRECT';
  var controlOrigin=${JSON.stringify(controlOrigin)};
  if(controlOrigin&&(url.toLowerCase()===controlOrigin||url.slice(0,controlOrigin.length+1).toLowerCase()===controlOrigin+'/'))return 'DIRECT';
  function matches(list){for(var i=0;i<list.length;i++){var p=list[i];if(p.slice(0,2)==='*.'){var suffix=p.slice(1);if(host.length>suffix.length&&host.slice(-suffix.length)===suffix)return true;}else if(host===p)return true;}return false;}
  if(matches(${JSON.stringify(resourceDomains)}))return ${JSON.stringify(resource)};
  if(matches(${JSON.stringify(directDomains)}))return 'DIRECT';
  return ${JSON.stringify(shop)};
}`;
}

export async function installProxyPac(config, verified, chromeApi=chrome) {
  const data=createProxyPac(config,{verified});
  await new Promise((resolve,reject)=>chromeApi.proxy.settings.set({scope:'regular',value:{mode:'pac_script',pacScript:{data,mandatory:true}}},()=>{
    chromeApi.runtime.lastError?reject(new Error('无法更新店铺网络规则，请重新检测')):resolve();
  }));
}
