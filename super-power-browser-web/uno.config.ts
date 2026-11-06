import {defineConfig,presetUno,presetIcons,presetAttributify} from 'unocss';
import {FileSystemIconLoader} from '@iconify/utils/lib/loader/node-loaders';
export default defineConfig({
  content:{pipeline:{include:[/src[\\/]ai[\\/].*\.(vue|ts)$/]}},
  presets:[presetUno({preflight:false}),presetAttributify(),presetIcons({collections:{svg:FileSystemIconLoader('./src/ai/assets/icons')},extraProperties:{display:'inline-block',width:'1em',height:'1em'}})],
  preflights:[],
  safelist:['i-svg:refreshSvg','i-svg:monthlyToken','i-svg:scheduledTask','i-svg:allModels'],
  shortcuts:{'wh-full':'w-full h-full','flex-center':'flex justify-center items-center','flex-x-center':'flex justify-center','flex-y-center':'flex items-center','flex-x-start':'flex items-center justify-start','flex-x-between':'flex items-center justify-between','flex-x-end':'flex items-center justify-end','flex-column':'flex flex-col',cp:'cursor-pointer','wh-20':'w-20px h-20px','wh-18':'w-18px h-18px','wh-16':'w-16px h-16px','wh-14':'w-14px h-14px'},
  theme:{colors:{primary:'var(--el-color-primary)',primary_dark:'var(--el-color-primary-light-5)',primary_UI:'var(--el-color-primary)',primary_dark_UI:'#8c8c8c'}}
});
