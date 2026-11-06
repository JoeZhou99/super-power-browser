<template>
  <header class="chat-header">
    <el-input
      v-if="editing"
      ref="titleInput"
      v-model="titleDraft"
      class="title-input"
      maxlength="80"
      @keydown.enter.prevent="saveTitle"
      @keydown.esc.prevent="editing = false"
      @blur="saveTitle"
    />
    <template v-else>
      <span
        class="title"
        :class="{ readonly: store.activeConversation.isMainConversation }"
        :title="
          store.activeConversation.isMainConversation
            ? undefined
            : t('zhifuAgent.chat.renamePrompt')
        "
        @click="startEdit"
      >
        {{ store.activeConversation.title }}
      </span>
      <el-icon
        v-if="!store.activeConversation.isMainConversation"
        class="edit-icon"
        @click="startEdit"
      >
        <EditPen />
      </el-icon>
    </template>
  </header>
</template>

<script setup lang="ts">
import { EditPen } from "@element-plus/icons-vue";
import type { InputInstance } from "element-plus";
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";

const store = useZhifuAgentStore();
const { t } = useI18n();

const editing = ref(false);
const titleDraft = ref("");
const titleInput = ref<InputInstance>();

async function startEdit() {
  if (store.activeConversation.isMainConversation) return;
  titleDraft.value = store.activeConversation.title;
  editing.value = true;
  await nextTick();
  titleInput.value?.focus();
  titleInput.value?.select();
}

function saveTitle() {
  if (!editing.value) return;
  store.renameConversation(store.activeConversation, titleDraft.value);
  editing.value = false;
}

watch(
  () => store.activeId,
  () => {
    editing.value = false;
  }
);
</script>

<style lang="scss" scoped>
.chat-header {
  display: flex;
  flex: 0 0 50px;
  gap: 6px;
  align-items: center;
  height: 50px;
  padding: 0 20px;
  background: rgb(255 255 255 / 96%);
  border-bottom: 1px solid #e1e6e8;
}

.title {
  max-width: 310px;
  padding: 3px 4px;
  overflow: hidden;
  font-size: 15px;
  font-weight: 650;
  color: #262c30;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: text;
  border-radius: 4px;

  &:hover {
    background: #f0f3f4;
  }

  &.readonly {
    cursor: default;

    &:hover {
      background: transparent;
    }
  }
}

.edit-icon {
  color: var(--el-text-color-secondary);
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }
}

.title-input {
  max-width: 360px;
}
</style>
