<template>
  <el-dialog
    :model-value="dialogVisible"
    width="560px"
    :show-close="false"
    :close-on-click-modal="false"
    :close-on-press-escape="false"
    append-to-body
    class="zhifu-approval-dialog"
  >
    <template #header>
      <div class="approval-heading">
        <div class="approval-icon">
          <el-icon :size="20"><Lock /></el-icon>
        </div>
        <div>
          <h2>{{ manual ? "需要你完成操作" : "确认操作授权" }}</h2>
          <p>请确认来源会话和操作内容</p>
        </div>
      </div>
    </template>
    <template v-if="store.approval">
      <div class="approval-source">
        <div class="source-topline">
          <span class="source-label">来源会话</span>
          <el-button link type="primary" :disabled="!sourceConversation" @click="viewSource">
            查看该会话 ↗
          </el-button>
        </div>
        <strong class="source-title">{{ conversationTitle }}</strong>
        <p v-if="taskText" class="source-task" :title="taskText">{{ taskText }}</p>
        <span v-if="sourceCreatedAt" class="source-date">创建于 {{ sourceCreatedAt }}</span>
      </div>
      <p v-if="manual" class="manual-instruction">
        {{ store.approval.input?.message || "请完成登录或验证码，完成后点击继续。" }}
      </p>
      <template v-else>
        <div class="operation-summary">
          <span>请求操作</span>
          <strong>{{ formatTool(store.approval.toolName) }}</strong>
        </div>
        <details class="operation-details">
          <summary>查看操作详情</summary>
          <pre>{{ approvalInput }}</pre>
        </details>
        <fieldset class="scope-options">
          <legend>授权范围</legend>
          <label
            v-for="option in scopeOptions"
            :key="option.value"
            :class="['scope-option', { selected: selectedScope === option.value }]"
          >
            <input
              v-model="selectedScope"
              type="radio"
              name="approval-scope"
              :value="option.value"
            />
            <span>
              <strong>{{ option.label }}</strong>
              <small>{{ option.description }}</small>
            </span>
          </label>
        </fieldset>
      </template>
      <p class="approval-scope">
        {{ manual ? "确认后仅继续此来源会话的任务。" : "仅对上方来源会话生效，不会授权其他会话。" }}
      </p>
    </template>
    <template #footer>
      <div class="approval-actions">
        <span class="deny-hint">拒绝将停止本次任务</span>
        <el-button @click="decideApproval(false)">拒绝</el-button>
        <el-button type="primary" @click="decideApproval(true, manual ? 'once' : selectedScope)">
          {{ manual ? "已完成，继续" : "允许并继续" }}
        </el-button>
      </div>
    </template>
  </el-dialog>
  <div
    v-if="noticeConversations.length"
    class="background-approval"
    role="status"
    aria-live="polite"
  >
    <div>
      <strong>
        {{ noticeConversations[0].id === store.activeId ? "当前会话等待确认" : "其他会话等待确认" }}
      </strong>
      <p>
        {{ noticeConversations[0].title
        }}{{ noticeConversations.length > 1 ? ` 等 ${noticeConversations.length} 个会话` : "" }}
      </p>
    </div>
    <el-button type="primary" plain @click="viewConversation(noticeConversations[0].id)">
      查看并处理
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { Lock } from "@element-plus/icons-vue";
import { computed, ref, watch } from "vue";
import type { ZhifuApprovalScope } from "@/ai/utils/electronApi";
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { formatTool } from "../../utils/format";
import { useAgentRun } from "../composables/useAgentRun";

const store = useZhifuAgentStore();
const approvalInput = computed(() => {
  const input = store.approval?.input;
  return typeof input === "string" ? input : input == null ? "" : JSON.stringify(input, null, 2);
});
const manual = computed(() => store.approval?.toolName === "browser_wait_user");
const selectedScope = ref<ZhifuApprovalScope>("turn");
const scopeOptions = [
  { value: "turn", label: "本次任务允许", description: "当前消息的后续操作可继续，任务结束后失效" },
  {
    value: "session",
    label: "此会话允许同类操作",
    description: "后续消息使用同类工具时也不再询问",
  },
  {
    value: "all_session",
    label: "此会话允许所有操作",
    description: "后续消息的工具操作持续放行，人工确认除外",
  },
] as const;
watch(
  () => store.approval?.approvalId,
  () => {
    selectedScope.value = "turn";
  }
);
const { decideApproval } = useAgentRun();
const deferredId = ref("");
const dialogVisible = computed(() =>
  Boolean(
    store.approval &&
    store.approval.conversationId === store.activeId &&
    deferredId.value !== store.approval.approvalId
  )
);

const sourceConversation = computed(() =>
  store.conversations.find((item) => item.id === store.approval?.conversationId)
);
const conversationTitle = computed(() => sourceConversation.value?.title || "来源会话已不可用");
const taskText = computed(
  () =>
    [...(sourceConversation.value?.messages || [])].reverse().find((item) => item.role === "user")
      ?.content || ""
);
const sourceCreatedAt = computed(() =>
  sourceConversation.value?.createdAt
    ? new Date(sourceConversation.value.createdAt).toLocaleString()
    : ""
);
const backgroundConversations = computed(() => store.backgroundApprovalConversations || []);
const noticeConversations = computed(() =>
  store.approval && deferredId.value === store.approval.approvalId && sourceConversation.value
    ? [sourceConversation.value, ...backgroundConversations.value]
    : backgroundConversations.value
);
async function viewConversation(id: string, openDetails = true) {
  if (openDetails) deferredId.value = "";
  store.activePage = "chat";
  await store.selectConversation(id);
}
async function viewSource() {
  if (sourceConversation.value) {
    deferredId.value = store.approval?.approvalId || "";
    await viewConversation(sourceConversation.value.id, false);
  }
}
</script>

<style lang="scss" scoped>
.approval-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 8px;
  .el-button + .el-button {
    margin-left: 0;
  }
}
.deny-hint {
  margin-right: auto;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.approval-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.approval-heading p {
  margin: 4px 0 0;
  font-size: 12px;
  text-align: left;
}
.approval-icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  border-radius: 12px;
}

h2 {
  margin: 0 0 6px;
  font-size: 17px;
  text-align: left;
}

.approval-source {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 6px;
  padding: 14px 16px;
  margin: 0 0 18px;
  border: 1px solid var(--el-color-primary-light-8);
  border-left: 3px solid var(--el-color-primary);
  border-radius: 8px;
  background: var(--el-color-primary-light-9);
  strong {
    max-width: 100%;
    overflow-wrap: anywhere;
  }
}
.source-topline {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}
.source-title {
  color: var(--el-text-color-primary);
  font-size: 17px;
  line-height: 1.5;
}
.source-task {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  overflow: hidden;
  margin: 0;
  text-align: left;
  line-height: 1.6;
  color: var(--el-text-color-regular);
}
.operation-summary {
  display: flex;
  gap: 12px;
  align-items: baseline;
  font-size: 13px;
  margin-bottom: 8px;
}
.operation-summary span {
  color: var(--el-text-color-secondary);
}
.operation-summary strong {
  color: var(--el-text-color-primary);
}
.operation-details {
  margin-bottom: 18px;
}
.operation-details summary {
  cursor: pointer;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  padding: 4px 0;
}
.scope-options {
  display: grid;
  gap: 8px;
  padding: 0;
  margin: 0;
  border: 0;
  min-width: 0;
}
.scope-options legend {
  font-size: 13px;
  color: var(--el-text-color-primary);
  font-weight: 600;
  padding: 0;
  margin-bottom: 10px;
}
.scope-option {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 11px 12px;
  cursor: pointer;
}
.scope-option.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}
.scope-option input {
  margin: 3px 0 0;
  accent-color: var(--el-color-primary);
  flex-shrink: 0;
}
.scope-option strong {
  display: block;
  font-size: 13px;
  line-height: 20px;
  color: var(--el-text-color-primary);
}
.scope-option small {
  display: block;
  margin-top: 2px;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}
.manual-instruction {
  text-align: left;
  line-height: 1.7;
  padding: 12px;
  border-radius: 8px;
  background: var(--el-fill-color-light);
}
.source-label,
.source-date {
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.approval-scope {
  font-size: 12px;
  line-height: 1.6;
  text-align: left;
  margin: 12px 0 0;
}
.background-approval {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1999;
  display: flex;
  align-items: center;
  gap: 16px;
  max-width: min(420px, calc(100vw - 48px));
  padding: 14px 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  background: var(--el-bg-color-overlay);
  box-shadow: var(--el-box-shadow-light);
  font-size: 13px;
  div {
    min-width: 0;
  }
  p {
    margin: 4px 0 0;
    text-align: left;
    overflow-wrap: anywhere;
    font-size: 12px;
  }
}

p {
  margin: 0 0 10px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

pre {
  max-height: 220px;
  padding: 10px 12px;
  margin: 0;
  overflow: auto;
  font-family: Consolas, Menlo, monospace;
  font-size: 12px;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--el-fill-color-light);
  border-radius: 8px;
}
@media (max-width: 600px) {
  .deny-hint {
    flex-basis: 100%;
    text-align: left;
  }
}
</style>

<style lang="scss">
.el-dialog.zhifu-approval-dialog {
  max-width: calc(100vw - 32px);
  margin-top: 6vh;
  padding: 0;
  border-radius: 12px;
  overflow: hidden;
  .el-dialog__header {
    padding: 20px 24px 16px;
    margin: 0;
    border-bottom: 1px solid var(--el-border-color-extra-light);
  }
  .el-dialog__body {
    padding: 20px 24px;
    max-height: min(65vh, calc(100dvh - 260px));
    overflow-y: auto;
  }
  .el-dialog__footer {
    padding: 14px 24px;
    border-top: 1px solid var(--el-border-color-extra-light);
  }
}
</style>
