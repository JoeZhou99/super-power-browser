const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const os=require('node:os');
const path=require('node:path');
const {normalize,parseResponse,collectGeo,validateExit}=require('../src/main/pluginManage/NetworkInfo');
const {followsProxy,localeProbe,resolveProxyLocale}=require('../src/main/runtime/ProxyLocale');
const {compileFingerprint,prepareLaunch}=require('../src/main/runtime/IndependentKernel');

const kernel={protocol:'fingerprint-chromium/1',version:'144',fullVersion:'144.0.7559.132',sha256:'a'.repeat(64)};
const environment=()=>({kernelVersion:'144',fingerprintSeed:'synthetic-persistent-shop-seed',fingerprint:{os:'Windows',language:'auto',languageMode:'ip',timezone:'auto',resolution:'1280x720'},proxy:{host:'proxy.synthetic.invalid',port:1080,webType:1}});
const us={available:true,ip:'1.1.1.1',country_code:'US',timezone:'America/New_York'};
const jp={available:true,ip:'8.8.8.8',country_code:'JP',timezone:'Asia/Tokyo'};

test('locale providers preserve validated timezones from legacy, ipwho and ipinfo responses',()=>{
  for(const input of [
    {ip:us.ip,country:'US',geo:{tz:us.timezone}},
    {ip:us.ip,country_code:'us',timezone:{id:us.timezone}},
    {ip:us.ip,country:'US',timezone:us.timezone},
  ]){
    const result=parseResponse(JSON.stringify(input));
    assert.equal(result.timezone,us.timezone);
    assert.equal(result.country_code,'US');
  }
  assert.equal(normalize({ip:us.ip,timezone:'Invalid/Zone'}).timezone,undefined);
  assert.equal(normalize({ip:us.ip,timezone:{offset:3600}}).timezone,undefined);
});

test('auto locale skips IP-only evidence and uses a complete response through the same proxy',async()=>{
  const env=environment(),calls=[];
  const options=localeProbe(env.fingerprint,['https://myip.ipip.net/','https://first.synthetic.invalid/']);
  assert.ok(!options.providers.includes('https://myip.ipip.net/'));
  const result=await collectGeo({
    ...options,proxyUrl:'http://127.0.0.1:1',firstValid:true,
    request:async(url,agent)=>{
      calls.push(url);assert.equal(agent.proxy.hostname,'127.0.0.1');
      return calls.length===1?{ip:us.ip}:normalize(jp);
    },
  });
  assert.equal(calls.length,2);
  assert.equal(result.ip,jp.ip);
  assert.deepEqual(resolveProxyLocale(env.fingerprint,result),{language:'ja-JP,ja',timezone:'Asia/Tokyo'});
});

test('fixed exit validation is still enforced when geographic data is present',async()=>{
  const env=environment();
  const result=await collectGeo({
    ...localeProbe(env.fingerprint),proxyUrl:'http://127.0.0.1:1',expectedIp:us.ip,firstValid:true,
    request:async()=>normalize(jp),
  });
  assert.equal(validateExit({webType:2,host:us.ip},result).allowed,false);
});

test('custom locale does not probe or inherit proxy geography and mixed modes change only the selected field',()=>{
  const env=environment();
  env.fingerprint={...env.fingerprint,languageMode:'custom',language:'zh-CN',timezone:'Europe/London'};
  assert.deepEqual(localeProbe(env.fingerprint),{});
  assert.deepEqual(resolveProxyLocale(env.fingerprint,{available:false}),{});
  env.runtimeLocale=resolveProxyLocale(env.fingerprint,jp);
  assert.equal(compileFingerprint(env,kernel).language,'zh-CN');
  assert.equal(compileFingerprint(env,kernel).timezone,'Europe/London');
  env.fingerprint.timezone='auto';
  env.runtimeLocale=resolveProxyLocale(env.fingerprint,jp);
  assert.equal(compileFingerprint(env,kernel).language,'zh-CN');
  assert.equal(compileFingerprint(env,kernel).timezone,'Asia/Tokyo');
  env.fingerprint.timezone='__local__';env.fingerprint.languageMode='ip';
  env.runtimeLocale=resolveProxyLocale(env.fingerprint,{available:true,country_code:'SG'});
  assert.equal(compileFingerprint(env,kernel).language,'en-SG,zh,ms');
  assert.equal(compileFingerprint(env,kernel).timezone,Intl.DateTimeFormat().resolvedOptions().timeZone);
});

test('unresolved or unknown proxy locale never falls back to local or stale device values',async()=>{
  const env=environment();env.proxy={...env.proxy,language:'en-US',timezone:'Europe/London'};
  assert.throws(()=>compileFingerprint(env,kernel),/未获取代理出口/);
  assert.doesNotThrow(()=>compileFingerprint(env,kernel,{deferProxyLocale:true}));
  assert.throws(()=>compileFingerprint({...env,fingerprintSeed:''},kernel,{deferProxyLocale:true}),/持久化指纹/);
  for(const geo of [{available:false},{...jp,country_code:'ZZ'},{...jp,timezone:'Invalid/Zone'}])assert.throws(()=>resolveProxyLocale(env.fingerprint,geo),/无法获取代理出口/);
  const abort=new AbortController();abort.abort();
  await assert.rejects(collectGeo({...localeProbe(env.fingerprint),proxyUrl:'http://127.0.0.1:1',signal:abort.signal}),{name:'AbortError'});
  assert.deepEqual(followsProxy({language:'auto',languageMode:'custom',timezone:'__local__'}),{language:true,timezone:false});
});

test('proxy switches and locale resolution preserve identity, stored settings and browser data across launches',async t=>{
  const profile=await fs.mkdtemp(path.join(os.tmpdir(),'spb-fingerprint-identity-'));
  t.after(async()=>{
    assert.equal(path.dirname(path.resolve(profile)),path.resolve(os.tmpdir()));
    assert.ok(path.basename(profile).startsWith('spb-fingerprint-identity-'));
    await fs.rm(profile,{recursive:true,force:true});
  });
  const env=environment(),saved=structuredClone(env);
  Object.freeze(env.fingerprint);
  await fs.mkdir(path.join(profile,'Default'));
  await fs.writeFile(path.join(profile,'Default','Preferences'),JSON.stringify({customSyntheticPreference:true}));
  await fs.writeFile(path.join(profile,'Default','Cookies'),'synthetic-cookie-marker');
  const launch=async(geo,proxyUrl)=>prepareLaunch({...env,runtimeLocale:resolveProxyLocale(env.fingerprint,geo)},{kernel,profile,plugins:[],proxyUrl,debugPort:12345,downloads:profile});
  const first=await launch(us,'socks5://127.0.0.1:10001');
  const identity=await fs.readFile(path.join(profile,'spb-identity.json'),'utf8');
  const second=await launch(jp,'socks5://127.0.0.1:10002');
  const stable=fp=>{const {language,timezone,...rest}=fp;return rest;};
  assert.deepEqual(stable(first.fingerprint),stable(second.fingerprint));
  assert.deepEqual(env,saved);
  assert.equal(await fs.readFile(path.join(profile,'spb-identity.json'),'utf8'),identity);
  assert.equal(await fs.readFile(path.join(profile,'Default','Cookies'),'utf8'),'synthetic-cookie-marker');
  const preferences=JSON.parse(await fs.readFile(path.join(profile,'Default','Preferences'),'utf8'));
  assert.equal(preferences.customSyntheticPreference,true);
  assert.equal(preferences.intl.accept_languages,'ja-JP,ja');
  assert.ok(second.args.includes('--timezone=Asia/Tokyo'));
  const fixedArgs=args=>args.filter(arg=>!/^--(?:lang|accept-lang|timezone|proxy-server)=/.test(arg));
  assert.deepEqual(fixedArgs(first.args),fixedArgs(second.args));
  assert.notEqual(compileFingerprint({...env,fingerprintSeed:'another-synthetic-shop',runtimeLocale:resolveProxyLocale(env.fingerprint,jp)},kernel).seed,first.fingerprint.seed);
});
