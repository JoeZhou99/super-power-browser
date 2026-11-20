<template>
  <el-popover v-model:visible="visible" placement="top-start" :width="260" trigger="click">
    <template #reference>
      <el-button size="small" text :icon="Lock">
        <span>{{ t("company.authority") }}：</span>
        <span v-if="permissions.includes('*')">{{ t("superpowerAgent.modes.sessionAuto") }}</span>
        <span v-else>
          {{ t(`superpowerAgent.modes.${store.effectiveMode}Label`) }}
          <template v-if="permissions.length">
            · {{ t("superpowerAgent.modes.authorizedCount", { count: permissions.length }) }}
          </template>
        </span>
        <el-icon class="el-icon--right"><ArrowDown /></el-icon>
      </el-button>
    </template>

    <div class="section-title">{{ t("superpowerAgent.modes.title") }}</div>
    <div v-for="mode in AGENT_MODES" :key="mode" class="mode-option" @click="choose(mode)">
      <div>
        <strong>{{ t(`superpowerAgent.modes.${mode}Label`) }}</strong>
        <small>{{ t(`superpowerAgent.modes.${mode}Detail`) }}</small>
      </div>
      <el-icon v-if="store.effectiveMode === mode" class="checked"><Check /></el-icon>
    </div>

    <template v-if="permissions.length">
      <el-divider />
      <div class="section-title">{{ t("superpowerAgent.modes.sessionGrants") }}</div>
      <div v-for="toolName in permissions" :key="toolName" class="grant-item">
        <span>
          {{ toolName === "*" ? t("superpowerAgent.modes.allChanges") : formatTool(toolName) }}
        </span>
        <el-icon class="revoke" @click="revoke(toolName)"><Close /></el-icon>
      </div>
      <el-button class="revoke-all" size="small" text type="danger" @click="revokeAll">
        {{ t("superpowerAgent.modes.revokeAll") }}
      </el-button>
    </template>
  </el-popover>
</template>

<script setup lang="ts">
import { ArrowDown, Check, Close, Lock } from "@element-plus/icons-vue";
import { errorMessage, useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import type { SuperPowerAgentMode } from "@/ai/utils/electronApi";
import { AGENT_MODES } from "../../constants";
import { formatTool } from "../../utils/format";
import { useAgentRun } from "../composables/useAgentRun";

const store = useSuperPowerAgentStore();
const { t } = useI18n();
const { setMode, revokePermission, revokeAllPermissions } = useAgentRun();

const visible = ref(false);
const permissions = computed(() => store.currentPermissions);

function choose(mode: SuperPowerAgentMode) {
  setMode(mode);
  visible.value = false;
}

async function revoke(toolName: string) {
  try {
    await revokePermission(toolName);
  } catch (cause) {
    store.error = errorMessage(cause);
  }
}

async function revokeAll() {
  try {
    await revokeAllPermissions();
  } catch (cause) {
    store.error = errorMessage(cause);
  }
}
</script>

<style lang="scss" scoped>
.section-title {
  margin-bottom: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.mode-option {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: var(--el-fill-color-light);
  }

  strong {
    display: block;
    font-size: 13px;
    font-weight: 500;
  }

  small {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.checked {
  color: var(--el-color-primary);
}

.el-divider {
  margin: 8px 0;
}

.grant-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 12px;
}

.revoke {
  color: var(--el-text-color-secondary);
  cursor: pointer;

  &:hover {
    color: var(--el-color-danger);
  }
}

.revoke-all {
  width: 100%;
  margin-top: 4px;
}
</style>
