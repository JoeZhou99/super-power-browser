import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {installAccessPolicy,blockedByPolicy} from '../runtime/access-policy.mjs';

const worker=await readFile(new URL('../src/mall/background/service-worker.js',import.meta.url),'utf8');
const implementation=worker.slice(worker.indexOf('let K = Promise.resolve();'),worker.indexOf('function H(e, t)'));
async function refresh({enabled=true,local=[],global=['https://*.amazon.com/ap/signin*'],failure=false}={}){
  const registered=[];
  const context={
    __SP_BUILD__:{mode:'superpower'},
    __SP_BOOTSTRAP__:{passkeyRules:{enabled,loginMatches:global,registerMatches:[]}},
    S:{login:{configKey:'passkey_urls',fallbackMatches:['https://builtin.test/*'],scripts:[{id:'login',js:['content/amazon_signin.js']}]},
      register:{configKey:'passkey_register_urls',fallbackMatches:['https://register.test/*'],scripts:[{id:'register',js:['content/amazon_intercept.js']}]}},
    he:{},console:{warn(){}},
    d:{getInfoByKey:async()=>{if(failure)throw new Error('synthetic API unavailable');return {data:{contents:local}};}},
    chrome:{scripting:{getRegisteredContentScripts:async()=>[],
      updateContentScripts:async scripts=>registered.push(...scripts),
      registerContentScripts:async scripts=>registered.push(...scripts)}},
  };
  await vm.runInNewContext(implementation+'\not();',context);
  return JSON.parse(JSON.stringify(registered));
}
test('passkey publication reaches actual content script registration and local nonempty rules win',async()=>{
  const configured=await refresh();
  assert.deepEqual(configured.find(s=>s.id==='login').matches,['https://*.amazon.com/ap/signin*']);
  const local=await refresh({local:['https://personal.test/*']});
  assert.deepEqual(local.find(s=>s.id==='login').matches,['https://personal.test/*']);
  const disabled=await refresh({enabled:false});
  assert.deepEqual(disabled.find(s=>s.id==='login').matches,['https://builtin.test/*']);
  const missing=await refresh({global:[]});
  assert.deepEqual(missing.find(s=>s.id==='login').matches,['https://builtin.test/*']);
  const failed=await refresh({failure:true});
  assert.deepEqual(failed.find(s=>s.id==='login').matches,['https://*.amazon.com/ap/signin*']);
});
test('published access policy is enforced by the existing declarative request rule consumer',async()=>{
  const previous={chrome:globalThis.chrome,build:globalThis.__SP_BUILD__,bootstrap:globalThis.__SP_BOOTSTRAP__};
  const policy={mode:'whitelist',domains:['shop.test'],exceptions:['https://support.test/help/']};
  let applied;
  globalThis.__SP_BUILD__={mode:'superpower'};
  globalThis.__SP_BOOTSTRAP__={apiBase:'https://business.test/extension',accessRules:policy};
  globalThis.chrome={declarativeNetRequest:{getSessionRules:async()=>[],updateSessionRules:async rules=>{applied=rules;}},
    webNavigation:{onErrorOccurred:{addListener(){}}}};
  try{
    await installAccessPolicy();
    assert.equal(applied.addRules.find(rule=>rule.action.type==='block').condition.regexFilter,'^(https?|wss?)://');
    assert.ok(applied.addRules.find(rule=>rule.condition.requestDomains)?.condition.requestDomains.includes('shop.test'));
    assert.equal(blockedByPolicy('https://shop.test/',policy),false);
    assert.equal(blockedByPolicy('https://orders.shop.test/',policy),false);
    assert.equal(blockedByPolicy('https://other.test/',policy),true);
    assert.equal(blockedByPolicy('https://support.test/help/article',policy),false);
  }finally{
    globalThis.chrome=previous.chrome;globalThis.__SP_BUILD__=previous.build;globalThis.__SP_BOOTSTRAP__=previous.bootstrap;
  }
});
