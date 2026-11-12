import { mkdir, readFile, writeFile, cp, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { validateBuildConfig, rewriteServices } from '../lib/build-config.mjs';
import { files, zipDirectory } from '../lib/zip.mjs';
import { applyBranding } from '../lib/branding.mjs';
import { networkPresentation } from '../lib/network-presentation.mjs';
import { bookmarkLifecycle } from '../lib/bookmark-lifecycle.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function build(input = {}, output = path.join(root, 'dist', input.mode ?? 'superpower')) {
  const config = validateBuildConfig(input);
  const relative = path.relative(path.join(root, 'dist'), output);
  if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('构建目标必须在工程 dist 子目录内');
  await rm(output, { recursive: true, force: true });
  await mkdir(path.join(output, 'Plugin'), { recursive: true });
  const apiSource = await readFile(path.join(root, 'src/mall/js/api.js'), 'utf8');
  const requiredMethods = [...apiSource.matchAll(/async (\w+)\(/g)].map(m => m[1]);
  requiredMethods.push('createAccountData', 'editAccountData', 'removeAccountData', 'getMallsAccountFillingList', 'addCustomSiteInfo', 'getSiteTreeByCategories', 'delCustomSiteInfo');
  const artifacts = [];
  const identities = JSON.parse(await readFile(path.join(root, 'lib/extension-identities.json'), 'utf8'));
  for (const [source, name, title] of [['mall', 'RXMallHelper', 'Super Power 店铺助手'], ['account', 'RXAccountManage', 'Super Power 账号助手']]) {
    const target = path.join(output, name);
    await cp(path.join(root, 'src', source), target, { recursive: true });
    for (const file of await files(target)) {
      if (/(?:^|\/)(?:config\.dat|init\.json|bootstrap\.json)$/.test(file)) throw new Error('源码中出现私有启动配置');
      if (!/\.(?:js|css|html|json)$/.test(file)) continue;
      const full = path.join(target, file);
      let text = rewriteServices((await readFile(full, 'utf8')).replace(/\r\n/g, '\n'), config);
      if(config.mode==='superpower'&&source==='mall'&&file.replaceAll('\\','/')==='contentPage/contentPage.js')text=networkPresentation(text);
      // Map account cookies to the new auth origin as well as request hosts.
      // Cookie setters in the authentication modules use this form.
      if (config.mode === 'superpower' && config.authOrigin.startsWith('http:')) text = text.replace(/secure: ([a-z])\.secure \?\? !0/g, 'secure: $1.secure ?? false');
      if(config.mode==='superpower'){
        text=text.replaceAll('Number(this.mallId)','String(this.mallId)').replaceAll('parseInt(this.mallId)','String(this.mallId)').replaceAll('parseInt(this.initJson.sysMallId)','String(this.initJson.sysMallId)').replaceAll('Number(this.initJson?.sysMallId || n.id || 0)','String(this.initJson?.sysMallId || n.id || "")');
        if(source==='account'){
          text=text.replaceAll('new Set(["userInfo", "mall_id"])','new Set(["userInfo", "mall_id", "spStartup"])');
          text=text.replace('let r = await (0, a.getToken)();','let r = await (0, a.getToken)(); t.baseURL=(await chrome.storage.session.get("spEndpoint")).spEndpoint || t.baseURL;');
        }
        if(source==='mall'&&file.replaceAll('\\\\','/')==='js/api.js')text=`const __spCompiledApi=${JSON.stringify(config.apiBase)};
const fetch=async(input,options)=>{const base=(await chrome.storage.session.get('spEndpoint')).spEndpoint||__spCompiledApi;return globalThis.fetch(typeof input==='string'&&input.startsWith(__spCompiledApi+'/')?base+input.slice(__spCompiledApi.length):input,{...options,redirect:'error'});};\n${text}`;
      }
      text = text.replace(/^\/\/# sourceMappingURL=.*$/gm, '');
      await writeFile(full, text);
    }
    await cp(path.join(root, 'runtime'), path.join(target, 'runtime'), { recursive: true });
    if(source==='account')await rm(path.join(target,'runtime/desktop-adapter.mjs'));
    const manifestPath = path.join(target, 'manifest.json');
    const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
    const defaultPopup = manifest.action.default_popup ?? '';
    manifest.name = title;
    manifest.version = config.version;
    manifest.version_name = config.version;
    manifest.description = source === 'mall' ? '店铺环境检测、代理、Cookie、访问控制与平台辅助工具' : '店铺账号管理、表单识别与自动填充';
    delete manifest.homepage_url;
    manifest.background.type = 'module';
    if(config.mode==='superpower'){
      manifest.key=identities[name];
      manifest.permissions=manifest.permissions.filter(p=>p!=='superbrowser');
      if(source==='mall'){
        manifest.permissions=[...new Set([...manifest.permissions,'webRequest','webRequestAuthProvider'])];
        manifest.content_scripts.unshift({js:['runtime/environment-policy.js'],matches:['http://*/*','https://*/*'],run_at:'document_start',world:'MAIN',all_frames:true,match_about_blank:true,match_origin_as_fallback:true});
        await writeFile(path.join(target,'runtime/environment-policy.js'),'// Configured by the desktop before launch.\n');
        const pageFile=path.join(target,'contentPage/contentPage.js');
        let page=await readFile(pageFile,'utf8');
        page=page.replace('chrome.superbrowser.showMessageDialog(', '__spMessageDialog(');
        page=`function __spMessageDialog(title,content,unused,ok,cancel,modal,callback){if(window.confirm(title+'\\n\\n'+content))callback(true);}\n${page}`;
        await writeFile(pageFile,page);
      }
    }
    const worker = path.join(target, manifest.background.service_worker);
    let workerText = await readFile(worker, 'utf8');
    if(source==='mall'&&config.mode==='superpower')workerText=bookmarkLifecycle(workerText);
    const guardImport = path.posix.relative(path.posix.dirname(manifest.background.service_worker), 'runtime/guard.mjs');
    if (source === 'mall') {
      const entries = [...workerText.matchAll(/^([\w$]+)\.init\(\);$/gm)];
      if (entries.length !== 1) throw new Error('店铺助手入口发生变化，请更新构建适配');
      workerText = workerText.replace(entries[0][0], `__spRun(async () => { __spInstallDesktop(); await __spInstallAccessPolicy(); return ${entries[0][1]}.init(); });`);
      workerText = `import { installAccessPolicy as __spInstallAccessPolicy } from '../runtime/access-policy.mjs';\nimport { installDesktopAdapter as __spInstallDesktop } from '../runtime/desktop-adapter.mjs';\n${workerText}`;
      if(config.mode==='superpower'){
        workerText = `import { createProxyPac as __spProxyPac } from '../runtime/proxy-routing.mjs';\nimport { installProxyAuthentication as __spInstallProxyAuth } from '../runtime/proxy-auth.mjs';\n__spInstallProxyAuth({early:true});\n${workerText}`;
        workerText=workerText.replace('const ut = chrome?.superbrowser;', 'const ut = true;');
        workerText=`function __spInternalCookie(c){const host=c.domain.replace(/^\\./,'');return ['127.0.0.1','localhost',new URL(globalThis.__SP_BOOTSTRAP__.authOrigin).hostname].includes(host)&&['chrome_token','browserVersion','lang'].includes(c.name);}\n${workerText}`;
        workerText=workerText.replace(/([ci])\.domain\.indexOf\("zhanfubrowser"\) < 0/g, '$1.domain.indexOf("zhanfubrowser") < 0 && !__spInternalCookie($1)');
      }
      // Preserve proxy selected by the desktop until the helper can install its
      // complete PAC. Network repair remains available.
      workerText = workerText.replace('setProxyDirect() {', 'setProxyDirect() {\n      if (globalThis.__SP_BUILD__?.mode === "superpower") return;');
      workerText = workerText.replace('async getPacScript(e, t) {', `async getPacScript(e, t) {
        if (globalThis.__SP_BUILD__?.mode === 'superpower') return __spProxyPac(globalThis.__SP_BOOTSTRAP__,{verified:globalThis.__SP_NETWORK_VERIFIED__===true});`);
      if(config.mode==='superpower'){
        workerText=workerText.replace('const o = t.check_env,','const o = "1",');
        workerText=workerText.replace('e.type === h.event_type.check_completed)','e.type === h.event_type.check_completed && globalThis.__SP_NETWORK_VERIFIED__===true)');
        workerText=workerText.replace('e.type === h.event_type.report_opened_tab_urls)','e.type === h.event_type.report_opened_tab_urls && globalThis.__SP_NETWORK_VERIFIED__===true)');
        workerText=workerText.replace('readyType: h.event_type.init_proxy_complete,','readyType: h.event_type.init_proxy_complete,\n              prepareNetwork: () => globalThis.__SP_BEGIN_NETWORK_CHECK__(),');
      }
      if(config.mode==='superpower')workerText=workerText.replace('const t = Number(e);\n  return Number.isFinite(t) ? t : null;', 'return String(e);');
      if(config.mode==='superpower'){
        const bridgeFile=path.join(target,'js/desktop-bridge.js');
        let bridge=await readFile(bridgeFile,'utf8');
        bridge=bridge.replace('this.handleCallbackFuns = e','globalThis.__SP_SOCKET__ = this, this.handleCallbackFuns = e');
        bridge=bridge.replace('this.handleCallbackFuns.onMessageHandle(o);','globalThis.__SP_REPLY__?.(o); this.handleCallbackFuns.onMessageHandle(o);');
        bridge=bridge.replace('"&sign=" + e;', '"&sign=" + encodeURIComponent(e);');
        bridge=bridge.replace(/function k\(\) \{[\s\S]*?\nfunction L\(/, `const __spNativeListeners=[];
function A(s) {
  const deliver=data=>{for(const listener of __spNativeListeners)listener(data);};
  if(globalThis.__SP_RPC__) {globalThis.__SP_RPC__(JSON.parse(N(s))).then(reply=>deliver(_(JSON.stringify(reply)))).catch(()=>{});return;}
  chrome.runtime.sendMessage({type:'sp:native',data:s}).then(reply=>{if(reply?.data)deliver(reply.data);}).catch(()=>{});
}
function L(`);
        bridge=bridge.replace(/function F\(s\) \{[\s\S]*?\n\}/,'function F(s) { __spNativeListeners.push(s); }');
        bridge=bridge.replace(/  install\(s\) \{[\s\S]*?  async isExistSameVersionPlugin/, `  install(s) { throw new Error('独立内核仅加载桌面发布的内置插件，暂不支持插件市场安装'); },\n  unistall(s) { throw new Error('请从桌面管理已发布的插件'); },\n  async isExistSameVersionPlugin`);
        await writeFile(bridgeFile,bridge);
      }
    } else {
      if(config.mode==='superpower'){
        workerText=workerText.replace('chrome.runtime.onMessageExternal.addListener(async (e, t, r) => {','chrome.runtime.onMessageExternal.addListener(async (e, t, r) => { if(t.id!==globalThis.__SP_BOOTSTRAP__?.pluginIdMap?.RXMallHelper)return;');
        workerText=workerText.replace('await g(i || []),','await g(i || []), await chrome.storage.local.set({spStartup:{state:"ready",message:"店铺账号已同步",at:new Date().toISOString()}}),');
      }
      workerText = `function __spStartAccount() {\n${workerText}\n${config.mode==='superpower'?'return globalThis.__SP_ACCOUNT_STARTUP__;':''}\n}\n__spRun(__spStartAccount);\n`;
    }
    await writeFile(worker, `import { run as __spRun } from ${JSON.stringify(guardImport)};\n${workerText}`);
    if(config.mode==='superpower')await applyBranding(target,source,manifest,path.resolve(root,'../branding'));
    await writeFile(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    await writeFile(path.join(target, 'runtime/build.json'), JSON.stringify({ ...config, requiredMethods, defaultPopup }, null, 2) + '\n');
    // Cover imported modules and page assets too: a manifest version can stay
    // unchanged during development while Chromium retains an old worker.
    const identity = createHash('sha256');
    for (const file of (await files(target)).sort()) {
      const content = await readFile(path.join(target, file));
      identity.update(JSON.stringify([file, content.length]) + '\n').update(content);
    }
    const buildId = identity.digest('hex');
    // A literal in executed code distinguishes a cached worker from new files
    // on disk. Reading build.json at runtime alone cannot detect that mismatch.
    await writeFile(worker, `globalThis.__SP_PLUGIN_BUILD_ID__ = ${JSON.stringify(buildId)};\n${await readFile(worker, 'utf8')}`);
    await writeFile(path.join(target, 'runtime/build.json'), JSON.stringify({ ...config, requiredMethods, defaultPopup, buildId }, null, 2) + '\n');
    const zip = await zipDirectory(target);
    await writeFile(path.join(output, 'Plugin', name + '.zip'), zip);
    artifacts.push({ name, buildId, bytes: zip.length, sha256: createHash('sha256').update(zip).digest('hex') });
  }
  await writeFile(path.join(output, 'build-report.json'), JSON.stringify({ ...config, requiredMethods, artifacts }, null, 2) + '\n');
  return { output, mode: config.mode, requiredMethods: requiredMethods.length, artifacts };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), configFile = args.indexOf('--config');
  const input = configFile >= 0 ? JSON.parse(await readFile(args[configFile + 1], 'utf8')) : { mode: args.includes('--legacy') ? 'legacy' : 'superpower' };
  console.log(JSON.stringify(await build(input), null, 2));
}
