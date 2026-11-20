<template>
  <section
    v-if="dialogVisible && store.approval"
    class="inline-approval"
    role="dialog"
    aria-live="polite"
    aria-label="人工确认"
    @mousedown.stop
  >
    <div class="approval-heading">
      <div class="approval-icon">
        <el-icon :size="17"><Lock /></el-icon>
      </div>
      <div class="approval-heading-copy">
        <strong>{{ manual ? "需要你完成操作" : "确认操作" }}</strong>
        <span>{{ conversationTitle }}</span>
      </div>
    </div>

    <p v-if="manual" class="approval-question">
      {{ store.approval.input?.message || "请完成登录或验证码，完成后点击继续。" }}
    </p>
    <template v-else>
      <p class="approval-question">
        确认操作：<strong>{{ formatTool(store.approval.toolName) }}</strong>
        <span v-if="approvalSummary">（{{ approvalSummary }}）</span>，是否允许？
      </p>
      <details class="operation-details">
        <summary>查看操作详情</summary>
        <pre>{{ approvalInput }}</pre>
      </details>
    </template>

    <div v-if="manual" class="approval-choice-list">
      <button
        type="button"
        class="approval-choice approval-choice-primary"
        @click="decideApproval(true, 'once')"
      >
        <span class="choice-index">1</span>
        <span class="choice-copy">
          <strong>已完成，继续</strong>
          <small>我已在浏览器中完成登录或验证码操作</small>
        </span>
        <el-icon class="choice-arrow"><ArrowRight /></el-icon>
      </button>
      <button type="button" class="approval-choice" @click="decideApproval(false)">
        <span class="choice-index">2</span>
        <span class="choice-copy">
          <strong>拒绝并停止</strong>
          <small>取消本次人工操作并停止任务</small>
        </span>
      </button>
    </div>
    <template v-else>
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
      <div class="approval-actions">
        <span class="deny-hint">拒绝将停止本次任务</span>
        <el-button size="small" @click="decideApproval(false)">拒绝</el-button>
        <el-button size="small" type="primary" @click="decideApproval(true, selectedScope)">
          允许并继续
        </el-button>
      </div>
    </template>
    <p class="approval-scope">
      {{ manual ? "确认后仅继续此来源会话的任务。" : "仅对上方来源会话生效，不会授权其他会话。" }}
    </p>
  </section>

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
import { ArrowRight, Lock } from "@element-plus/icons-vue";
import { computed, ref, watch } from "vue";
import type { SuperPowerApprovalScope } from "@/ai/utils/electronApi";
import { useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import { formatTool, summarizeInput } from "../../utils/format";
import { useAgentRun } from "../composables/useAgentRun";

const store = useSuperPowerAgentStore();
const approvalInput = computed(() => {
  const input = store.approval?.input;
  return typeof input === "string" ? input : input == null ? "" : JSON.stringify(input, null, 2);
});
const approvalSummary = computed(() => {
  const input = store.approval?.input;
  if (input && typeof input === "object" && typeof input.message === "string") {
    return input.message.slice(0, 220);
  }
  return summarizeInput(input);
});
const manual = computed(() => store.approval?.toolName === "browser_wait_user");
const selectedScope = ref<SuperPowerApprovalScope>("turn");
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
const dialogVisible = computed(() =>
  Boolean(store.approval && store.approval.conversationId === store.activeId)
);
const sourceConversation = computed(() =>
  store.conversations.find((item) => item.id === store.approval?.conversationId)
);
const conversationTitle = computed(() => sourceConversation.value?.title || "来源会话已不可用");
const backgroundConversations = computed(() => store.backgroundApprovalConversations || []);
const noticeConversations = computed(() => backgroundConversations.value);

async function viewConversation(id: string) {
  store.activePage = "chat";
  await store.selectConversation(id);
}
</script>

<style lang="scss" scoped>
.inline-approval {
  padding: 12px 14px 10px;
  border-bottom: 1px solid #eef0f1;
  background: #fff;
}

.approval-heading {
  display: flex;
  align-items: center;
  gap: 9px;
}

.approval-heading-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.approval-heading-copy strong {
  color: #2d3438;
  font-size: 13px;
  line-height: 18px;
}

.approval-heading-copy span {
  overflow: hidden;
  color: #899297;
  font-size: 11px;
  line-height: 16px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.approval-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  color: var(--el-color-warning);
  background: var(--el-color-warning-light-9);
  border-radius: 9px;
}

.approval-question {
  margin: 10px 0 8px;
  color: #4c575c;
  font-size: 13px;
  line-height: 1.6;
  text-align: left;
  overflow-wrap: anywhere;
}

.operation-details {
  margin: 2px 0 10px;
}

.operation-details summary {
  padding: 4px 0;
  color: #899297;
  font-size: 11px;
  cursor: pointer;
}

.approval-choice-list {
  display: grid;
  gap: 6px;
  margin-top: 8px;
}

.approval-choice {
  display: flex;
  width: 100%;
  min-height: 42px;
  align-items: center;
  gap: 9px;
  padding: 6px 8px;
  color: #3b454a;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e5e8e9;
  border-radius: 8px;
  transition: background 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: #f8fafb;
    border-color: #cfd6da;
  }
}

.approval-choice-primary {
  border-color: #d8e5ff;
  background: #f7f9ff;

  &:hover {
    border-color: #a9c4ff;
    background: #f1f5ff;
  }
}

.choice-index {
  display: grid;
  width: 24px;
  height: 24px;
  flex: none;
  place-items: center;
  color: #6f7a80;
  font-size: 12px;
  background: #f1f3f4;
  border-radius: 6px;
}

.approval-choice-primary .choice-index {
  color: #3370ff;
  background: #e6eeff;
}

.choice-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: 1px;
}

.choice-copy strong {
  font-size: 13px;
  font-weight: 500;
  line-height: 18px;
}

.choice-copy small {
  overflow: hidden;
  color: #8b959a;
  font-size: 11px;
  line-height: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.choice-arrow {
  margin-left: auto;
  color: #606b70;
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
  padding: 0;
  margin-bottom: 8px;
  color: #49555a;
  font-size: 12px;
  font-weight: 600;
}

.scope-option {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 8px 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  cursor: pointer;
}

.scope-option.selected {
  border-color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
}

.scope-option input {
  flex-shrink: 0;
  margin: 3px 0 0;
  accent-color: var(--el-color-primary);
}

.scope-option strong {
  display: block;
  color: var(--el-text-color-primary);
  font-size: 12px;
  line-height: 18px;
}

.scope-option small {
  display: block;
  margin-top: 1px;
  color: var(--el-text-color-secondary);
  font-size: 11px;
  line-height: 16px;
}

.approval-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 10px;
  margin-top: 10px;
  border-top: 1px solid #eef0f1;

  .el-button + .el-button {
    margin-left: 0;
  }
}

.deny-hint {
  margin-right: auto;
  color: #8d969b;
  font-size: 11px;
}

.approval-scope {
  margin: 8px 0 0;
  color: #969fa3;
  font-size: 11px;
  line-height: 1.6;
  text-align: left;
}

pre {
  max-height: 160px;
  padding: 8px 10px;
  margin: 0;
  overflow: auto;
  font-family: Consolas, Menlo, monospace;
  font-size: 11px;
  white-space: pre-wrap;
  word-break: break-all;
  background: var(--el-fill-color-light);
  border-radius: 7px;
}

.background-approval {
  position: fixed;
  right: 24px;
  bottom: 24px;
  z-index: 1999;
  display: flex;
  max-width: min(420px, calc(100vw - 48px));
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  font-size: 13px;
  background: var(--el-bg-color-overlay);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 10px;
  box-shadow: var(--el-box-shadow-light);

  div {
    min-width: 0;
  }

  p {
    margin: 4px 0 0;
    overflow-wrap: anywhere;
    font-size: 12px;
    text-align: left;
  }
}

@media (max-width: 600px) {
  .approval-actions .deny-hint {
    flex-basis: 100%;
    text-align: left;
  }
}
</style>
