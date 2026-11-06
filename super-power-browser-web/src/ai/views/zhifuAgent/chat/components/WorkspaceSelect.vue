<template>
  <el-tooltip :content="store.workspace || t('zhifuAgent.chat.noWorkspace')" placement="top">
    <span class="workspace-path" @click="emit('select')">
      <el-icon><FolderOpened /></el-icon>
      <span class="path-text">{{ store.workspace || t("zhifuAgent.chat.noWorkspace") }}</span>
    </span>
  </el-tooltip>
</template>

<script setup lang="ts">
import { FolderOpened } from "@element-plus/icons-vue";
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";

const emit = defineEmits<{ select: [] }>();
const store = useZhifuAgentStore();
const { t } = useI18n();
</script>

<style lang="scss" scoped>
.workspace-path {
  display: inline-flex;
  flex: 1;
  gap: 4px;
  align-items: center;
  min-width: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }
}

.path-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  direction: rtl;
  text-align: left;
}
</style>
