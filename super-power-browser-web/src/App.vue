<script setup lang="ts">
import {useRoute} from 'vue-router';
import Layout from '@/layout/index.vue';
import DesktopTitlebar from '@/components/DesktopTitlebar.vue';
const route=useRoute();
document.documentElement.classList.toggle('is-desktop',Boolean(window.api));
</script>
<template>
  <DesktopTitlebar/>
  <router-view v-if="route.path==='/login'"/>
  <Layout v-else/>
</template>
