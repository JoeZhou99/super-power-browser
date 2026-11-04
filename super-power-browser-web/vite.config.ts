import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {fileURLToPath,URL} from 'node:url';
export default defineConfig({base:'./',plugins:[vue()],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},server:{port:3100,strictPort:true,proxy:{'/api':{target:process.env.API_URL||'http://127.0.0.1:8080'}}}});
