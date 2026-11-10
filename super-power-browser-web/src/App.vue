<script setup lang="ts">
import {useRoute} from 'vue-router';
import {computed,watch} from 'vue';
import Layout from '@/layout/index.vue';
import DesktopTitlebar from '@/components/DesktopTitlebar.vue';
const route=useRoute();
const isPublicPage=computed(()=>['/login','/register','/join'].includes(route.path));
document.documentElement.classList.toggle('is-desktop',Boolean(window.api));
document.documentElement.classList.toggle('legacy-window-controls',Boolean(window.api&&!window.api.windowControl));
watch(isPublicPage,value=>document.documentElement.classList.toggle('is-login',value),{immediate:true});
</script>
<template>
  <DesktopTitlebar v-if="isPublicPage"/>
  <router-view v-if="isPublicPage"/>
  <Layout v-else/>
</template>
