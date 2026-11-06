import {defineConfig} from 'vite';
import UnoCSS from 'unocss/vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath,URL} from 'node:url';
import AutoImport from 'unplugin-auto-import/vite';
import Components from 'unplugin-vue-components/vite';
import {ElementPlusResolver} from 'unplugin-vue-components/resolvers';
export default defineConfig({base:'./',plugins:[vue(),UnoCSS(),AutoImport({imports:['vue','vue-router','pinia','vue-i18n'],resolvers:[ElementPlusResolver()],dts:'src/ai/auto-imports.d.ts'}),Components({resolvers:[ElementPlusResolver()],dirs:['src/ai/components'],dts:'src/ai/components.d.ts'})],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},server:{port:3100,strictPort:true,proxy:{'/api':{target:process.env.API_URL||'http://127.0.0.1:8080'}}}});
