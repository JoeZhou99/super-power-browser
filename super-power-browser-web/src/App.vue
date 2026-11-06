<script setup lang="ts">
import {useRoute} from 'vue-router';
import {watch} from 'vue';
import Layout from '@/layout/index.vue';
import DesktopTitlebar from '@/components/DesktopTitlebar.vue';
const route=useRoute();
document.documentElement.classList.toggle('is-desktop',Boolean(window.api));
document.documentElement.classList.toggle('legacy-window-controls',Boolean(window.api&&!window.api.windowControl));
watch(()=>route.path,path=>document.documentElement.classList.toggle('is-login',path==='/login'),{immediate:true});
</script>
<template>
  <DesktopTitlebar v-if="route.path==='/login'"/>
  <router-view v-if="route.path==='/login'"/>
  <Layout v-else/>
</template>
