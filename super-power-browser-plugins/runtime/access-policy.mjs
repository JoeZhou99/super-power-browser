const internalHosts=new Set(['127.0.0.1','localhost','[::1]','myip.ipip.net','lumtest.com','ifconfig.me']);
export function blockedByPolicy(url,rules){
  if(!rules?.domains?.length)return false;
  let parsed;try{parsed=new URL(url);}catch{return false;}
  if(!['http:','https:','ws:','wss:'].includes(parsed.protocol))return false;
  if((rules.exceptions||[]).some(prefix=>url.startsWith(prefix)))return false;
  const host=parsed.hostname.toLowerCase();
  const listed=rules.domains.some(domain=>host===domain.toLowerCase()||host.endsWith('.'+domain.toLowerCase()));
  return rules.mode==='whitelist'?!internalHosts.has(host)&&!listed:listed;
}
export async function installAccessPolicy(){
  if(globalThis.__SP_BUILD__?.mode!=='superpower')return;
  const bootstrap=globalThis.__SP_BOOTSTRAP__,policy=bootstrap.accessRules;
  const firstId=1900000000, rules=[];
  const resourceTypes=['main_frame','sub_frame','stylesheet','script','image','font','object','xmlhttprequest','ping','csp_report','media','websocket','webtransport','webbundle','other'];
  const add=(action,condition,priority=1000000)=>rules.push({id:firstId+rules.length,priority,action:{type:action},condition:{resourceTypes,...condition}});
  if(policy?.domains?.length){
    if(policy.mode==='whitelist'){
      add('block',{regexFilter:'^(https?|wss?)://'});
      add('allow',{requestDomains:[...policy.domains,...internalHosts,new URL(bootstrap.apiBase).hostname]},1000001);
    }else add('block',{requestDomains:policy.domains});
    for(const prefix of policy.exceptions||[])add('allow',{regexFilter:'^'+prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')},1000002);
  }
  // Session rules are separate from the helper's dynamic-rule updates.
  const existing=await chrome.declarativeNetRequest.getSessionRules();
  await chrome.declarativeNetRequest.updateSessionRules({removeRuleIds:existing.filter(r=>r.id>=firstId).map(r=>r.id),addRules:rules});
  chrome.webNavigation.onErrorOccurred.addListener(details=>{
    if(details.frameId!==0||!details.error?.includes('ERR_BLOCKED_BY_CLIENT'))return;
    if(new URL(details.url).origin===new URL(globalThis.__SP_BOOTSTRAP__.apiBase).origin)return;
    if(!blockedByPolicy(details.url,globalThis.__SP_BOOTSTRAP__?.accessRules))return;
    chrome.tabs.update(details.tabId,{url:chrome.runtime.getURL('runtime/access-denied.html')}).catch(()=>{});
  });
}
