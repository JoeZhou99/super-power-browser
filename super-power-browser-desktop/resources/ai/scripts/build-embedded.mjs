import { build } from 'esbuild'
import { mkdir, cp } from 'node:fs/promises'
await mkdir('out/main', { recursive: true })
await build({ entryPoints: ['src/main/embed.js','src/main/browser-skill-runtime.js'], outdir:'out/main', bundle:true,
  platform:'node', format:'esm', target:'node22', packages:'external', sourcemap:true, logLevel:'info' })
await cp('src/skills','out/skills',{recursive:true})
