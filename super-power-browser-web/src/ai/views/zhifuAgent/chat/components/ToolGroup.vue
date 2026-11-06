<template>
  <el-collapse class="tool-group">
    <el-collapse-item name="tools">
      <template #title>
        <span class="tool-group-title">
          <el-icon><Monitor /></el-icon>
          {{ t("zhifuAgent.tools.groupTitle", { count: tools.length }) }}
          <span class="tool-group-result">
            {{
              streaming && !tools.some((tool) => tool.status === "running")
                ? t("zhifuAgent.tools.waitingForModel")
                : toolGroupStatus(tools, executionStatus)
            }}
          </span>
        </span>
      </template>
      <div v-for="tool in tools" :key="tool.id" class="tool-row">
        <el-icon :class="['tool-status', tool.status]">
          <Monitor v-if="tool.name === 'run_commands'" />
          <Document v-else />
        </el-icon>
        <div class="tool-copy">
          <strong>{{ formatTool(tool.name) }}</strong>
          <code>{{ summarizeInput(tool.input) }}</code>
        </div>
        <span :class="['tool-result', tool.status]">{{ toolStatusLabel(tool) }}</span>
      </div>
    </el-collapse-item>
  </el-collapse>
</template>

<script setup lang="ts">
import { Document, Monitor } from "@element-plus/icons-vue";
import type { ToolItem } from "../../type";
import { formatTool, summarizeInput, toolGroupStatus, toolStatusLabel } from "../../utils/format";

defineProps<{ tools: ToolItem[]; streaming?: boolean; executionStatus?: string }>();
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.tool-group {
  margin-bottom: 8px;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;

  :deep(.el-collapse-item__header) {
    height: 36px;
    padding: 0 12px;
    font-size: 12px;
    border-bottom: 0;
  }

  :deep(.el-collapse-item__wrap) {
    border-bottom: 0;
  }

  :deep(.el-collapse-item__content) {
    padding: 0 12px 8px;
  }
}

.tool-group-title {
  display: flex;
  flex: 1;
  gap: 6px;
  align-items: center;
  color: var(--el-text-color-regular);
}

.tool-group-result {
  margin-left: auto;
  margin-right: 8px;
  color: var(--el-text-color-secondary);
}

.tool-row {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 8px 0;
  border-top: 1px dashed var(--el-border-color-lighter);
}

.tool-status {
  margin-top: 2px;
  color: var(--el-text-color-secondary);

  &.running {
    color: var(--el-color-primary);
  }

  &.error {
    color: var(--el-color-danger);
  }

  &.done {
    color: var(--el-color-success);
  }
}

.tool-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
  font-size: 12px;

  code {
    overflow: hidden;
    font-family: Consolas, Menlo, monospace;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: pre-wrap;
    word-break: break-all;
  }
}

.tool-result {
  font-size: 12px;
  color: var(--el-text-color-secondary);

  &.error {
    color: var(--el-color-danger);
  }
}
</style>
