<script setup lang="ts">
import {onMounted,onUnmounted,ref} from 'vue';
const enabled=Boolean(window.api?.windowControl),maximized=ref(false);
let unsubscribe:(()=>void)|undefined;
function update(state:{maximized:boolean;fullScreen:boolean}){maximized.value=state.maximized||state.fullScreen;}
onMounted(async()=>{
  if(!enabled)return;
  unsubscribe=window.api?.onWindowState?.(update);
  const state=await window.api?.windowState?.();if(state)update(state);
});
onUnmounted(()=>unsubscribe?.());
function control(action:'minimize'|'toggleMaximize'|'close'){return window.api?.windowControl?.(action);}
</script>

<template>
  <div v-if="enabled" class="window-controls" aria-label="窗口控制">
    <button type="button" aria-label="最小化" title="最小化" @click="control('minimize')"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M3 8h10"/></svg></button>
    <button type="button" :aria-label="maximized?'还原窗口':'最大化'" :title="maximized?'还原窗口':'最大化'" @click="control('toggleMaximize')"><svg viewBox="0 0 16 16" aria-hidden="true"><path v-if="maximized" d="M5.5 5.5V3h7.5v7.5h-2.5M3 5.5h7.5V13H3z"/><rect v-else x="3.5" y="3.5" width="9" height="9" rx=".5"/></svg></button>
    <button type="button" class="window-close" aria-label="关闭窗口" title="关闭窗口" @click="control('close')"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4 4 8 8M12 4l-8 8"/></svg></button>
  </div>
</template>

<style scoped>
.window-controls{display:flex;align-items:center;gap:2px;-webkit-app-region:no-drag;flex-shrink:0}
.window-controls button{display:grid;place-items:center;width:38px;height:34px;border:0;border-radius:7px;background:transparent;color:#5f6e87;transition:background .15s,color .15s}
.window-controls button:hover{background:#e6ebf4;color:#223653}
.window-controls .window-close:hover{background:#e5484d;color:#fff}
.window-controls svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.2}
.window-controls button:focus-visible{outline:2px solid #386bff;outline-offset:1px}
</style>
