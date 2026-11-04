const internalHosts=new Set(['127.0.0.1','localhost','myip.ipip.net','lumtest.com','ifconfig.me']);
export function blockedByPolicy(url,rules){
  if(!rules?.domains?.length)return false;
  let parsed;try{parsed=new URL(url);}catch{return false;}
  if(!['http:','https:'].includes(parsed.protocol))return false;
  if((rules.exceptions||[]).some(prefix=>url.startsWith(prefix)))return false;
  const host=parsed.hostname.toLowerCase();
  const listed=rules.domains.some(domain=>host===domain.toLowerCase()||host.endsWith('.'+domain.toLowerCase()));
  return rules.mode==='whitelist'?!internalHosts.has(host)&&!listed:listed;
}
export function installAccessPolicy(){
  if(globalThis.__SP_BUILD__?.mode!=='superpower')return;
  // Native policy blocks the request. Explain its main-frame rejection when
  // this kernel leaves a new tab blank instead of opening its configured tips.
  chrome.webNavigation.onErrorOccurred.addListener(details=>{
    if(details.frameId!==0||!details.error?.includes('ERR_BLOCKED_BY_CLIENT'))return;
    if(new URL(details.url).origin===new URL(globalThis.__SP_BOOTSTRAP__.apiBase).origin)return;
    if(!blockedByPolicy(details.url,globalThis.__SP_BOOTSTRAP__?.accessRules))return;
    chrome.tabs.update(details.tabId,{url:chrome.runtime.getURL('runtime/access-denied.html')}).catch(()=>{});
  });
}
