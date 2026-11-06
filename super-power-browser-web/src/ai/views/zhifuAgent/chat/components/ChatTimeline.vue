<template>
  <section
    ref="viewportRef"
    class="message-viewport"
    @scroll.passive="handleScroll"
    @click="handleContentClick"
  >
    <div v-if="!conversation.messages.length" class="empty-state">
      <!-- <div class="empty-icon">
        <el-icon :size="28"><MagicStick /></el-icon>
      </div> -->
      <h1>{{ t("zhifuAgent.chat.emptyTitle") }}</h1>
      <p>{{ t("zhifuAgent.chat.emptyDesc") }}</p>
    </div>

    <div v-else class="timeline">
      <el-button v-if="hasOlderMessages" class="history-load" text @click="loadOlderMessages">
        {{ t("zhifuAgent.chat.loadEarlier") }}
      </el-button>
      <MessageItem
        v-for="message in visibleMessages"
        :key="message.id"
        :message="message"
        :tools="toolsByMessage.get(message.id) || []"
        @open-image="(src, name) => emit('open-image', src, name)"
      />
    </div>
  </section>
</template>

<script setup lang="ts">
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { openExternal } from "@/ai/utils/index";
import { zhifuOpenResultFile } from "@/ai/utils/electronApi";
import type { ToolItem } from "../../type";
import { handleCodeCopyClick } from "../../utils/markdown";
import MessageItem from "./MessageItem.vue";

const emit = defineEmits<{
  "open-image": [src: string, name: string];
}>();

const store = useZhifuAgentStore();
const { t } = useI18n();

const MESSAGE_PAGE = 80;

const conversation = computed(() => store.activeConversation);
const viewportRef = ref<HTMLElement>();
const visibleMessageCount = ref(MESSAGE_PAGE);

watch(
  () => store.activeId,
  () => {
    visibleMessageCount.value = MESSAGE_PAGE;
  },
  { flush: "sync" }
);

const visibleMessages = computed(() =>
  conversation.value.messages.slice(-visibleMessageCount.value)
);
const hasOlderMessages = computed(
  () => conversation.value.messages.length > visibleMessageCount.value
);

/** 工具调用归属到对应的助手消息，未关联的归到最后一条助手消息 */
const toolsByMessage = computed(() => {
  const tools = conversation.value.tools || [];
  const grouped = new Map<string, ToolItem[]>();
  const unassigned: ToolItem[] = [];
  for (const tool of tools) {
    if (!tool.messageId) {
      unassigned.push(tool);
      continue;
    }
    const list = grouped.get(tool.messageId) || [];
    list.push(tool);
    grouped.set(tool.messageId, list);
  }
  const lastAssistantId = [...conversation.value.messages]
    .reverse()
    .find((item) => item.role === "assistant")?.id;
  const map = new Map<string, ToolItem[]>();
  for (const message of visibleMessages.value) {
    if (message.role !== "assistant") continue;
    const own = [...(grouped.get(message.id) || [])];
    if (message.id === lastAssistantId) own.push(...unassigned);
    map.set(message.id, own);
  }
  return map;
});

function isNearBottom() {
  const viewport = viewportRef.value;
  if (!viewport) return false;
  return viewport.scrollHeight - viewport.scrollTop - viewport.clientHeight < 120;
}

let scrollFrame = 0;

async function scrollToBottom() {
  await nextTick();
  if (scrollFrame) return;
  scrollFrame = window.requestAnimationFrame(() => {
    scrollFrame = 0;
    const viewport = viewportRef.value;
    if (viewport) viewport.scrollTop = viewport.scrollHeight;
  });
}

async function loadOlderMessages() {
  const viewport = viewportRef.value;
  if (!viewport) return;
  const previousHeight = viewport.scrollHeight;
  const previousTop = viewport.scrollTop;
  visibleMessageCount.value += MESSAGE_PAGE;
  await nextTick();
  viewport.scrollTop = previousTop + viewport.scrollHeight - previousHeight;
}

function handleScroll() {
  if (isNearBottom()) store.markActiveConversationRead();
}

async function handleContentClick(event: MouseEvent) {
  const target = event.target as HTMLElement | null;
  const file = target?.closest?.("[data-result-file]") as HTMLElement | null;
  if (file?.dataset.resultFile) {
    event.preventDefault();
    try {
      await zhifuOpenResultFile(file.dataset.resultFile);
    } catch (cause: any) {
      ElMessage.error(cause?.message || t("zhifuAgent.chat.openResultFileFailed"));
    }
    return;
  }
  const link = target?.closest?.(".zhifu-markdown a[href]") as HTMLAnchorElement | null;
  if (link) {
    event.preventDefault();
    try {
      const url = new URL(link.href);
      if (!["http:", "https:"].includes(url.protocol)) return;
      openExternal(url.href);
    } catch (cause: any) {
      ElMessage.error(cause?.message || t("zhifuAgent.chat.openLinkFailed"));
    }
    return;
  }
  try {
    await handleCodeCopyClick(event);
  } catch (cause: any) {
    ElMessage.error(cause?.message || t("zhifuAgent.chat.copyFailed"));
  }
}

const handleWindowFocus = () => {
  if (isNearBottom()) store.markActiveConversationRead();
};

let unregister: (() => void) | null = null;

function activate() {
  unregister?.();
  unregister = store.registerViewport({ isNearBottom, scrollToBottom });
  window.addEventListener("focus", handleWindowFocus);
  scrollToBottom();
}

function deactivate() {
  unregister?.();
  unregister = null;
  if (scrollFrame) {
    window.cancelAnimationFrame(scrollFrame);
    scrollFrame = 0;
  }
  window.removeEventListener("focus", handleWindowFocus);
}

onMounted(activate);
onActivated(activate);
onDeactivated(deactivate);
onBeforeUnmount(deactivate);

defineExpose({ scrollToBottom });
</script>

<style lang="scss" scoped>
.message-viewport {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.timeline {
  max-width: 860px;
  padding: 24px 24px 12px;
  margin: 0 auto;
}

.history-load {
  display: block;
  margin: 0 auto 12px;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100%;
  padding: 40px 28px 20px;
  text-align: center;

  h1 {
    margin: 0;
    font-size: 26px;
    font-weight: 650;
    line-height: 1.2;
    color: #262c30;
  }

  p {
    margin: 11px 0 22px;
    font-size: 14px;
    color: #747d82;
  }
}

.empty-icon {
  display: grid;
  place-items: center;
  width: 56px;
  height: 56px;
  margin-bottom: 20px;
  color: #252b2f;
  background: #edf1f2;
  border-radius: 8px;
}
</style>
