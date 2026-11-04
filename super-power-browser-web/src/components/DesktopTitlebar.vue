<script setup lang="ts">
const desktop = Boolean(window.api);
</script>

<template>
  <div v-if="desktop" class="desktop-titlebar">
    <div class="titlebar-brand"><img src="/brand-mark.svg" alt=""/><strong>SuperPower</strong><span>Browser</span></div>
    <div class="titlebar-caption">多店铺工作台</div>
  </div>
</template>

<style scoped>
.desktop-titlebar{position:fixed;inset:0 0 auto;height:44px;z-index:2001;display:flex;align-items:center;gap:24px;padding:0 152px 0 18px;background:#eaf0ff;color:#2c416c;-webkit-app-region:drag;user-select:none}
.titlebar-brand{display:flex;align-items:center;gap:8px;font-family:'Segoe UI',sans-serif;font-size:13px;letter-spacing:.2px}
.titlebar-brand img{width:24px;height:24px}.titlebar-brand strong{font-weight:650}.titlebar-brand>span{color:#7788aa;font-size:12px}
.titlebar-caption{border-left:1px solid #cfdaf0;padding-left:22px;color:#7788aa;font-size:11px;letter-spacing:1px}
</style>
