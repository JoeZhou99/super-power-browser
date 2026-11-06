<template>
  <div class="zhifu-page">
    <header class="page-header">
      <div>
        <h2>{{ t("zhifuAgent.settings.appSettings") }}</h2>
        <p>{{ t("zhifuAgent.settings.appSettingsDesc") }}</p>
      </div>
    </header>
    <el-tabs v-model="activeTab" class="page-tabs">
      <el-tab-pane :label="t('zhifuAgent.settings.tabGeneral')" name="general">
        <GeneralSettings />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import GeneralSettings from "./components/GeneralSettings.vue";

const store = useZhifuAgentStore();
const { t } = useI18n();

const activeTab = computed({
  get: () => store.settingsTab,
  set: (tab) => {
    store.settingsTab = tab;
  },
});

onMounted(() => {
  store.init();
});
</script>

<style lang="scss" scoped>
@use "../styles/page.scss";
</style>
