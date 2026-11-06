<script setup lang="ts">
import WindowControls from './WindowControls.vue';
const desktop = Boolean(window.api);
</script>

<template>
  <div v-if="desktop" class="desktop-titlebar">
    <div class="titlebar-brand"><img src="/brand-mark.svg" alt=""/><strong>SuperPower</strong><span>Browser</span></div>
    <WindowControls/>
  </div>
</template>

<style scoped>
.desktop-titlebar{position:fixed;inset:0 0 auto;height:44px;z-index:30;display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 18px;background:#f3f6fb;color:#2c416c;-webkit-app-region:drag;user-select:none}
.titlebar-brand{display:flex;align-items:center;gap:8px;font-family:'Segoe UI',sans-serif;font-size:13px;letter-spacing:.2px}
.titlebar-brand img{width:24px;height:24px}.titlebar-brand strong{font-weight:650}.titlebar-brand>span{color:#7788aa;font-size:12px}
</style>
