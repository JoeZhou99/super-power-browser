import {cp,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {files} from './zip.mjs';

// Apply product branding without changing copyright and third-party notices.
export async function applyBranding(target,source,manifest,brandRoot){
  await cp(brandRoot,path.join(target,'branding'),{recursive:true});
  const label=source==='mall'?'SuperPower 环境助手':'SuperPower 账号助手';
  manifest.name=label;
  manifest.action.default_title=label;
  const iconPaths=new Map(Object.entries(manifest.icons||{}).map(([size,file])=>[file,Number(size)]));
  const actionIcons=manifest.action.default_icon;
  if(typeof actionIcons==='string')iconPaths.set(actionIcons,48);
  else for(const [size,file] of Object.entries(actionIcons||{}))iconPaths.set(file,Number(size));
  for(const [file,size] of iconPaths)await cp(path.join(brandRoot,`icon-${size}.png`),path.join(target,file));
  if(source==='mall'){
    for(const file of ['icons/favicon.ico','assets/favicon-DLMzPxpA.ico'])await cp(path.join(brandRoot,'app.ico'),path.join(target,file));
    for(const file of ['icons/icon.png','icons/icon19.png','assets/imageLogoHelp-DBeOKbnV.png','assets/avatar_extracted-BsUeCeNq.png'])await cp(path.join(brandRoot,file.includes('icon19')?'icon-19.png':'icon-128.png'),path.join(target,file));
  }
  for(const file of await files(target)){
    if(!/\.(?:html|js|css)$/.test(file)||file.includes('vendor-'))continue;
    const full=path.join(target,file);
    let content=await readFile(full,'utf8');
    content=content.replaceAll('/assets/bgCheck-eVhq9yDi.png','/branding/check-background.svg');
    content=content.replaceAll('"/assets/imageLogoHelp-DBeOKbnV.png"','"/branding/wordmark.svg"');
    if(file.endsWith('.html')){
      const page=source==='account'?'账号助手':file.includes('check')?'环境检查':file.includes('newtab')?'新标签页':file.includes('warning')?'访问提示':file.includes('cookieTool')?'Cookie 工具':'环境助手';
      content=content.replace(/<title>[^<]*<\/title>/,'<title>SuperPower · '+page+'</title>');
      content=content.replace('</head>','<link rel="icon" href="/branding/app.ico"/><link rel="stylesheet" href="/branding/plugin.css"/>\n</head>');
    }
    await writeFile(full,content);
  }
}
