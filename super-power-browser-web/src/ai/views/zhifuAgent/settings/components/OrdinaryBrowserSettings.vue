<template>
  <div class="ordinary-browser-settings">
    <div class="section-title">普通浏览器</div>
    <div class="browser-panel settings-card">
      <p class="section-description">
        用于未选择店铺的网页任务，各会话独立，不使用日常浏览器的个人资料。
      </p>
      <el-select
        v-model="preference"
        :disabled="busy"
        aria-label="普通浏览器"
        @change="selectBrowser"
      >
        <el-option label="自动选择（Edge → Chrome）" value="auto" />
        <el-option label="Microsoft Edge" value="msedge" />
        <el-option label="Google Chrome" value="chrome" />
      </el-select>
      <div class="browser-selection" role="status">
        <span class="selection-label">新环境使用</span>
        <strong>{{ status?.selected || "正在检测…" }}</strong>
      </div>
      <p class="browser-note">已有会话继续使用原浏览器，店铺浏览器不受影响。</p>
      <div
        v-if="status?.message"
        class="browser-feedback"
        :class="{ 'is-error': status?.state === 'error' }"
        role="status"
      >
        <p v-if="status?.message">{{ status.message }}</p>
      </div>
      <div class="browser-actions">
        <el-button :icon="Refresh" :disabled="busy" @click="refresh">重新检测</el-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ElMessage } from "element-plus";
import { Refresh } from "@element-plus/icons-vue";
import { errorMessage } from "@/ai/store/modules/zhifu-agent.store";
import {
  zhifuOrdinaryBrowserGet,
  zhifuOrdinaryBrowserSelect,
  zhifuOnOrdinaryBrowserStatus,
  type OrdinaryBrowserStatus,
} from "@/ai/utils/electronApi";

const status = ref<OrdinaryBrowserStatus | null>(null);
const preference = ref("auto");
const busy = ref(false);
async function refresh() {
  try {
    status.value = await zhifuOrdinaryBrowserGet();
    preference.value = status.value.preference;
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  }
}
async function selectBrowser(value: string) {
  busy.value = true;
  try {
    status.value = await zhifuOrdinaryBrowserSelect(value);
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
    await refresh();
  } finally {
    busy.value = false;
  }
}
let off: (() => void) | undefined;
onMounted(() => {
  off = zhifuOnOrdinaryBrowserStatus((value) => {
    status.value = value;
  });
  refresh();
});
onUnmounted(() => off?.());
</script>

<style scoped>
.ordinary-browser-settings {
  margin: 24px 0;
}
.section-title {
  margin-bottom: 6px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}
.browser-panel {
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}
.el-select {
  width: 100%;
  max-width: 440px;
}
p {
  margin: 0;
  color: var(--el-text-color-secondary);
  font-size: 13px;
  line-height: 1.7;
}
.section-description {
  margin: 0 0 12px;
}
.browser-selection {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 6px 12px;
  margin-top: 14px;
  font-size: 13px;
  line-height: 20px;
}
.selection-label {
  color: var(--el-text-color-secondary);
}
.browser-selection strong {
  color: var(--el-text-color-primary);
  font-weight: 500;
}
.browser-note {
  margin-top: 4px;
  font-size: 12px;
}
.browser-feedback {
  margin-top: 12px;
}
.browser-feedback p {
  margin-top: 6px;
  overflow-wrap: anywhere;
}
.browser-feedback.is-error p {
  color: var(--el-color-danger);
}
.browser-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--el-border-color-extra-light);
}
.browser-actions .el-button + .el-button {
  margin-left: 0;
}
</style>
