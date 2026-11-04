import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { files } from '../lib/zip.mjs';

export async function verify(distribution) {
  const report = JSON.parse(await readFile(path.join(distribution, 'build-report.json'), 'utf8'));
  const result = { mode: report.mode, files: 0, scripts: 0, references: 0, missing: [] };
  for (const name of ['RXMallHelper', 'RXAccountManage']) {
    const root = path.join(distribution, name), list = await files(root);
    const manifest = JSON.parse(await readFile(path.join(root, 'manifest.json'), 'utf8'));
    const refs = [manifest.background.service_worker, ...Object.values(manifest.icons), ...manifest.content_scripts.flatMap(x => [...(x.js ?? []), ...(x.css ?? [])])];
    if (manifest.action.default_popup) refs.push(manifest.action.default_popup);
    const check = async (file, reference) => {
      if (!reference || /^(?:[a-z][a-z\d+.-]*:|\/\/|#|\*)/i.test(reference)) return;
      const clean = reference.split(/[?#]/)[0];
      const target = clean.startsWith('/') ? path.join(root, clean) : path.resolve(path.dirname(file), clean);
      if (path.relative(root, target).startsWith('..')) throw new Error(`资源路径越界: ${reference}`);
      try { await access(target); result.references++; } catch { result.missing.push(`${name}/${path.relative(root, file)} -> ${reference}`); }
    };
    for (const ref of refs) await check(path.join(root, 'manifest.json'), ref);
    for (const file of list) {
      result.files++;
      if (/(?:^|\/)(config\.dat|init\.json|bootstrap\.json)$/.test(file)) throw new Error('发布包含有店铺运行时配置');
      const absolute = path.join(root, file);
      if (!/\.(js|mjs|html|css|json)$/.test(file)) continue;
      const text = await readFile(absolute, 'utf8');
      if (/\.(js|mjs)$/.test(file)) {
        const checked = spawnSync(process.execPath, ['--check', absolute], { encoding: 'utf8' });
        if (checked.error) throw checked.error;
        if (checked.status !== 0) throw new Error(`JavaScript 语法错误: ${file}\n${checked.stderr}`);
        result.scripts++;
        for (const match of text.matchAll(/(?:\bfrom\s*|\bimport\s*)["'](\.[^"']+)["']/g)) await check(absolute, match[1]);
      }
      if (file.endsWith('.html')) for (const match of text.matchAll(/(?:src|href)=["']([^"']+)["']/g)) await check(absolute, match[1]);
      if (file.endsWith('.css')) for (const match of text.matchAll(/url\(["']?([^)'"\s]+)["']?\)/g)) await check(absolute, match[1]);
      if (report.mode === 'superpower' && /(?:https?|wss?):\/\/(?:[\w-]+\.)*zhanfubrowser\.com(?=[/"'`\s?]|$)/.test(text)) throw new Error(`存在旧服务直连地址: ${file}`);
    }
  }
  if (result.missing.length) throw new Error(`缺少资源:\n${result.missing.join('\n')}`);
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  console.log(JSON.stringify(await verify(path.resolve(process.argv[2] ?? path.join(root, 'dist/superpower'))), null, 2));
}
