import { access, cp, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodeBootstrap, extensionId } from '../lib/bootstrap.mjs';

export async function prepareProfile({ distribution, profile, bootstrap, replace = false }) {
  distribution = path.resolve(distribution); profile = path.resolve(profile);
  const report = JSON.parse(await readFile(path.join(distribution, 'build-report.json'), 'utf8'));
  const names = ['RXMallHelper', 'RXAccountManage'];
  const dirs = names.map(name => path.join(profile, 'RBP', name));
  const config = { ...bootstrap, browserId: String(bootstrap.browserId ?? ''), sysMallId: String(bootstrap.sysMallId ?? ''), pluginIdMap: Object.fromEntries(names.map((name, i) => [name, extensionId(dirs[i])])) };
  const encoded = encodeBootstrap(config);
  // Preflight every source and destination before mutating either plugin.
  for (let i = 0; i < names.length; i++) {
    await access(path.join(distribution, names[i], 'manifest.json'));
    let exists = false; try { await access(dirs[i]); exists = true; } catch (e) { if (e.code !== 'ENOENT') throw e; }
    if (exists && !replace) throw new Error('目标插件目录已存在；关闭店铺后使用 --replace，原目录会自动备份');
  }
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const prepared = [];
  for (let i = 0; i < names.length; i++) {
    const dir = dirs[i], stage = dir + `.stage-${stamp}`;
    await mkdir(path.dirname(dir), { recursive: true });
    await cp(path.join(distribution, names[i]), stage, { recursive: true });
    await writeFile(path.join(stage, 'config.dat'), encoded.configDat, { mode: 0o600 });
    await writeFile(path.join(stage, 'init.json'), encoded.initJson, { mode: 0o600 });
    prepared.push({ dir, stage, backup: null });
  }
  try {
    for (const item of prepared) {
      try { await access(item.dir); item.backup = item.dir + `.backup-${stamp}`; await rename(item.dir, item.backup); } catch (e) { if (e.code !== 'ENOENT') throw e; }
      await rename(item.stage, item.dir);
      item.installed = true;
    }
  } catch (error) {
    // Preserve all failed-stage data and roll the original directories back.
    for (const item of [...prepared].reverse()) {
      if (item.installed) await rename(item.dir, item.stage);
      if (item.backup) await rename(item.backup, item.dir);
    }
    throw error;
  }
  // Never return/write the token, keys, cookies or proxy credentials to logs.
  return { mode: report.mode, dirs, pluginIdMap: config.pluginIdMap, backups: prepared.map(x => x.backup).filter(Boolean) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2), value = flag => args[args.indexOf(flag) + 1];
  for (const flag of ['--distribution', '--profile', '--bootstrap']) if (!args.includes(flag) || !value(flag)) throw new Error(`缺少 ${flag}`);
  console.log(JSON.stringify(await prepareProfile({ distribution: value('--distribution'), profile: value('--profile'), bootstrap: JSON.parse(await readFile(value('--bootstrap'), 'utf8')), replace: args.includes('--replace') }), null, 2));
}
