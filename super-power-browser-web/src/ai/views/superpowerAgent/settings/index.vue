<template>
  <div class="superpower-page">
    <header class="page-header">
      <div>
        <h2>{{ t("superpowerAgent.settings.appSettings") }}</h2>
        <p>{{ t("superpowerAgent.settings.appSettingsDesc") }}</p>
      </div>
    </header>
    <el-tabs v-model="activeTab" class="page-tabs">
      <el-tab-pane :label="t('superpowerAgent.settings.tabGeneral')" name="general">
        <GeneralSettings />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script setup lang="ts">
import { useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import GeneralSettings from "./components/GeneralSettings.vue";

const store = useSuperPowerAgentStore();
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
