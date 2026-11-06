<template>
  <div class="zhifu-chat">
    <main class="chat-main">
      <ChatHeader />
      <ChatTimeline @open-image="openImage" />
      <Composer v-model="prompt" @open-image="openImage" @select-workspace="selectWorkspace" />
    </main>
    <ApprovalDialog />
    <ImageViewer :image="viewerImage" @close="viewerImage = null" />
    <WorkflowDialogs ref="workflowDialogsRef" />
  </div>
</template>

<script setup lang="ts">
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import ApprovalDialog from "./components/ApprovalDialog.vue";
import ChatHeader from "./components/ChatHeader.vue";
import ChatTimeline from "./components/ChatTimeline.vue";
import Composer from "./components/Composer.vue";
import ImageViewer from "./components/ImageViewer.vue";
import WorkflowDialogs, { chatWorkflowDialogsKey } from "./components/WorkflowDialogs.vue";

const store = useZhifuAgentStore();
const workflowDialogsRef = ref<InstanceType<typeof WorkflowDialogs>>();

provide(chatWorkflowDialogsKey, {
  openSkillCreator: (draft) => workflowDialogsRef.value?.openSkillCreator(draft),
  openSkillEditor: (skill) => workflowDialogsRef.value?.openSkillEditor(skill),
  openScheduleEditor: (draft) => workflowDialogsRef.value?.openScheduleEditor(draft),
});

const prompt = ref("");
const viewerImage = ref<{ src: string; name: string } | null>(null);

function openImage(src: string, name = "image") {
  viewerImage.value = { src, name };
}

async function selectWorkspace() {
  try {
    await store.selectWorkspace();
  } catch (cause) {
    store.error = errorMessage(cause);
  }
}

watch(
  () => store.totalUnreadCount,
  (count, previous) => {
    const base = document.title.replace(/^\(\d+\)\s*/, "");
    if (count || previous) document.title = count ? `(${count}) ${base}` : base;
  }
);

onMounted(() => {
  store.init();
});
</script>

<style lang="scss" scoped>
.zhifu-chat {
  display: flex;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
  background: #fff;
}

.chat-main {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  background: #fff;

  :deep(.message-viewport) {
    padding-bottom: 168px;
  }

  &:has(.suggestions) :deep(.message-viewport) {
    padding-bottom: 430px;
  }

  :deep(.composer-area) {
    position: absolute;
    right: 0;
    bottom: 0;
    left: 0;
    max-width: none;
    padding: 16px 24px 11px;
    background: linear-gradient(0deg, #fff 72%, rgb(255 255 255 / 0%));
  }
}
</style>
