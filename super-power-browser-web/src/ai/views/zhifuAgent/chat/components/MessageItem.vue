<template>
  <article :class="['message', message.role]">
    <div class="avatar">
      <el-icon>
        <User v-if="message.role === 'user'" />
        <MagicStick v-else />
      </el-icon>
    </div>
    <div class="message-body">
      <div class="message-meta">
        <span class="message-author">
          {{ message.role === "user" ? store.settings.userName : store.settings.agentName }}
        </span>
        <span
          v-if="
            message.role === 'assistant' &&
            (message.streaming ||
              (message.completedAt &&
                (!message.scheduledRunAt || message.completedAt > message.createdAt)))
          "
          class="turn-timing"
        >
          {{ message.streaming ? t("zhifuAgent.chat.running") : t("zhifuAgent.chat.elapsed") }}
          {{
            formatDuration(
              message,
              message.streaming ? store.clock : message.completedAt || message.createdAt
            )
          }}
        </span>
      </div>

      <ToolGroup
        v-if="tools.length"
        :tools="tools"
        :streaming="message.streaming"
        :execution-status="message.streaming ? undefined : message.executionStatus"
      />

      <div v-if="message.attachments?.length" class="message-images">
        <img
          v-for="item in message.attachments"
          :key="item.id"
          :src="item.preview"
          :alt="item.name"
          @click="emit('open-image', item.source || item.preview, item.name)"
        />
      </div>
      <div v-if="message.files?.length" class="message-files">
        <div v-for="file in message.files" :key="file.id" class="message-file" :title="file.path">
          <el-icon><Document /></el-icon>
          <span>{{ file.name }}</span>
        </div>
      </div>
      <div :class="{ 'user-request-card': message.role === 'user' }">
        <div v-if="message.shops?.length" class="message-context-row">
          <span class="message-context-label">{{ t("zhifuAgent.chat.usingShops") }}</span>
          <div v-for="shop in message.shops" :key="shop.id" class="message-shop" :title="shop.name">
            <el-icon><Shop /></el-icon>
            <span>{{ shop.name }}</span>
          </div>
        </div>
        <div v-if="message.skills?.length" class="message-context-row">
          <span class="message-context-label">{{ t("zhifuAgent.chat.usingSkills") }}</span>
          <span
            v-for="skill in message.skills"
            :key="skill.id || skill.name"
            class="message-skill"
            :title="skill.name"
          >
            <el-icon><MagicStick /></el-icon>
            <span>{{ skill.name }}</span>
          </span>
        </div>
        <template v-if="shopLayout.sections.length">
          <section
            v-for="section in shopLayout.sections"
            :key="section.id"
            class="shop-result-section"
          >
            <div class="zhifu-markdown" v-html="section.html"></div>
            <template v-for="path in section.files" :key="path">
              <ResultImage
                v-if="/\.(png|jpe?g|webp|gif)$/i.test(path)"
                :path="path"
                :name="resultFileName(path)"
                @open-image="(src, name) => emit('open-image', src, name)"
              />
              <ResultFileCard
                v-else
                :path="path"
                :details="
                  tools
                    .filter((tool) => tool.status === 'done')
                    .flatMap((tool) => resultFileDetails(tool.output, path))
                "
              />
            </template>
          </section>
          <section v-if="hasSummaryCard" class="batch-summary-card" aria-label="所有店铺操作汇总">
            <div class="zhifu-markdown" v-html="shopLayout.tail"></div>
            <div v-if="summaryFiles.length" class="result-artifacts">
              <ResultFileCard
                v-for="path in summaryFiles"
                :key="path"
                :path="path"
                :details="
                  tools
                    .filter((tool) => tool.status === 'done')
                    .flatMap((tool) => resultFileDetails(tool.output, path))
                "
              />
            </div>
          </section>
          <div v-else-if="shopLayout.tail" class="zhifu-markdown" v-html="shopLayout.tail"></div>
        </template>
        <div v-else-if="html" class="zhifu-markdown" v-html="html"></div>
        <div v-else-if="visibleContent" class="zhifu-markdown">{{ visibleContent }}</div>
      </div>

      <ResultImage
        v-for="path in shopLayout.remaining.filter((file) => /\.(png|jpe?g|webp|gif)$/i.test(file))"
        :key="path"
        :path="path"
        :name="resultFileName(path)"
        @open-image="(src, name) => emit('open-image', src, name)"
      />
      <div v-if="!hasSummaryCard && summaryFiles.length" class="result-artifacts">
        <ResultFileCard
          v-for="path in summaryFiles"
          :key="path"
          :path="path"
          :details="
            tools
              .filter((tool) => tool.status === 'done')
              .flatMap((tool) => resultFileDetails(tool.output, path))
          "
        />
      </div>
      <div v-if="message.streaming" class="thinking" role="status">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
        {{ streamingLabel }}
      </div>

      <div v-if="showMessageActions" class="message-actions">
        <template v-if="showWorkflowActions">
          <span v-if="doneShopCount || failedShopCount" class="workflow-result-summary">
            <span v-if="doneShopCount">
              {{ t("zhifuAgent.chat.shopsCompleted", { count: doneShopCount }) }}
            </span>
            <span v-if="failedShopCount">
              {{ t("zhifuAgent.chat.shopsFailed", { count: failedShopCount }) }}
            </span>
          </span>
          <template v-if="runSucceeded">
            <el-tooltip
              v-if="!store.activeConversation.skillTrial"
              :content="t('zhifuAgent.chat.saveAsSkill')"
              placement="top"
            >
              <el-icon
                :class="['action-icon', { 'is-disabled': store.running }]"
                @click="saveSuccessfulSkill"
              >
                <Box />
              </el-icon>
            </el-tooltip>
            <el-tooltip :content="t('zhifuAgent.chat.scheduleRun')" placement="top">
              <el-icon
                :class="['action-icon', { 'is-disabled': store.running }]"
                @click="scheduleSuccessfulRun"
              >
                <Timer />
              </el-icon>
            </el-tooltip>
          </template>
          <template v-if="store.activeConversation.skillTrial">
            <el-tooltip :content="t('zhifuAgent.chat.retryTrial')" placement="top">
              <el-icon
                :class="['action-icon', { 'is-disabled': store.running }]"
                @click="retrySkillTrial"
              >
                <RefreshRight />
              </el-icon>
            </el-tooltip>
            <el-tooltip :content="t('zhifuAgent.chat.editTrialSkill')" placement="top">
              <el-icon
                :class="['action-icon', { 'is-disabled': store.running }]"
                @click="editTrialSkill"
              >
                <EditPen />
              </el-icon>
            </el-tooltip>
          </template>
          <el-tooltip
            v-if="failedShopCount"
            :content="t('zhifuAgent.chat.retryFailedShops')"
            placement="top"
          >
            <el-icon
              :class="['action-icon', { 'is-disabled': store.running }]"
              @click="retryFailedShops"
            >
              <Refresh />
            </el-icon>
          </el-tooltip>
        </template>
        <el-tooltip
          v-if="message.content"
          :content="copied ? t('zhifuAgent.chat.copied') : t('zhifuAgent.chat.copyMessage')"
          placement="top"
        >
          <el-icon class="action-icon" @click="copyMessage">
            <Check v-if="copied" />
            <CopyDocument v-else />
          </el-icon>
        </el-tooltip>
        <time v-if="message.content">{{ formatMessageTime(message.createdAt) }}</time>
      </div>
    </div>
  </article>
</template>

<script setup lang="ts">
import {
  Box,
  Check,
  CopyDocument,
  Document,
  EditPen,
  MagicStick,
  Refresh,
  RefreshRight,
  Shop,
  Timer,
  User,
} from "@element-plus/icons-vue";
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import type { ChatMessage, ToolItem } from "../../type";
import { formatDuration, formatMessageTime } from "../../utils/format";
import { renderCachedAgentMarkdown } from "../../utils/markdown";
import { stripThinkingMarkup } from "../../utils/streamText";
import {
  confirmedResultFiles,
  groupShopArtifacts,
  renderConfirmedFileLinks,
  resultFileName,
  resultFileDetails,
} from "../../utils/resultArtifacts";
import ToolGroup from "./ToolGroup.vue";
import ResultImage from "./ResultImage.vue";
import ResultFileCard from "./ResultFileCard.vue";
import { chatWorkflowDialogsKey } from "./WorkflowDialogs.vue";

const props = defineProps<{ message: ChatMessage; tools: ToolItem[] }>();
const emit = defineEmits<{ "open-image": [src: string, name: string] }>();

const store = useZhifuAgentStore();
const workflowDialogs = inject(chatWorkflowDialogsKey);
const { t } = useI18n();

/** 技能已经用标签展示，正文里不再重复开头的 #技能名 */
const visibleContent = computed(() => {
  const content =
    props.message.role === "assistant"
      ? stripThinkingMarkup(props.message.content)
      : props.message.content || "";
  const skills = props.message.skills || [];
  if (props.message.role !== "user" || !skills.length) return content;
  const prefix = content.match(/^\[(?:定时任务自动执行|Scheduled run)\]\s*/)?.[0] || "";
  let rest = content.slice(prefix.length);
  const mentions = skills.map((skill) => `#${skill.name}`).join(" ");
  if (rest.startsWith(`${mentions} `)) rest = rest.slice(mentions.length + 1);
  else if (rest === mentions) rest = "";
  return `${prefix}${rest}`;
});

const html = computed(() => {
  const rendered = renderCachedAgentMarkdown(props.message, visibleContent.value);
  if (props.message.role !== "assistant") return rendered;
  return renderConfirmedFileLinks(rendered, resultFiles.value);
});

const shopLayout = computed(() => groupShopArtifacts(html.value, resultFiles.value));

const hasSummaryCard = computed(
  () => shopLayout.value.sections.length > 0 && /所有店铺操作汇总/.test(shopLayout.value.tail)
);
const summaryFiles = computed(() =>
  shopLayout.value.remaining.filter((file) => !/\.(png|jpe?g|webp|gif)$/i.test(file))
);

const doneStatuses = new Set(["已完成", "success", "completed"]);
const failedStatuses = new Set(["失败", "failed", "error"]);

const resultFiles = computed(() => confirmedResultFiles(props.tools));
const doneShopCount = computed(
  () => props.message.executionShops?.filter((shop) => doneStatuses.has(shop.status)).length || 0
);
const failedShopCount = computed(
  () => props.message.executionShops?.filter((shop) => failedStatuses.has(shop.status)).length || 0
);
const runSucceeded = computed(() =>
  ["success", "completed"].includes(props.message.executionStatus || "")
);
const showWorkflowActions = computed(
  () =>
    props.message.role === "assistant" &&
    Boolean(
      props.message.executionStatus ||
        props.message.executionShops?.length ||
        resultFiles.value.length
    )
);
const showMessageActions = computed(
  () => !props.message.streaming && (Boolean(props.message.content) || showWorkflowActions.value)
);

function requestBefore() {
  const list = store.activeConversation.messages;
  const index = list.findIndex((item) => item.id === props.message.id);
  return list
    .slice(0, index)
    .reverse()
    .find((item) => item.role === "user");
}

function plainRequest(request: ChatMessage) {
  const mentions = (request.skills || []).map((skill) => `#${skill.name}`).join(" ");
  if (mentions && request.content.startsWith(`${mentions} `)) {
    return request.content.slice(mentions.length + 1);
  }
  return request.content;
}

function resendRequest(shops = requestBefore()?.shops || []) {
  const request = requestBefore();
  if (!request || store.running) return;
  store.pendingSend = {
    text: plainRequest(request),
    skills: (request.skills || []).map((skill) => ({ ...skill })),
    shops: shops.map((shop) => ({ ...shop })),
    autoSend: true,
  };
}

function retrySkillTrial() {
  resendRequest();
}

function retryFailedShops() {
  const request = requestBefore();
  if (!request) return;
  const failedIds = new Set(
    (props.message.executionShops || [])
      .filter((shop) => failedStatuses.has(shop.status))
      .map((shop) => String(shop.id))
  );
  const shops = (request.shops || []).filter((shop) => failedIds.has(String(shop.id)));
  if (!shops.length) return;
  resendRequest(shops);
}

function saveSuccessfulSkill() {
  const request = requestBefore();
  if (!request || store.running) return;
  const task = request.content;
  workflowDialogs?.openSkillCreator({
    name: task.slice(0, 18),
    requirement: task,
    description: task,
    triggersText: task,
    instructions: t("zhifuAgent.chat.saveSkillInstructions", { task }),
    step: 2,
  });
}

function scheduleSuccessfulRun() {
  const request = requestBefore();
  if (!request || store.running) return;
  workflowDialogs?.openScheduleEditor({
    title: request.content.slice(0, 24),
    prompt: request.content,
    skillNames: (request.skills || []).map((skill) => skill.name),
    shops: (request.shops || []).map((shop) => ({ id: shop.id, name: shop.name })),
    enabled: false,
    workspace: store.workspace,
    pushPlatforms: [],
    frequency: "daily",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    weekdays: [1],
  });
}

async function editTrialSkill() {
  const original = store.activeConversation.skillTrial?.skill;
  if (!original || store.running) return;
  try {
    await store.loadSkills();
  } catch (cause: any) {
    store.error = cause?.message || t("zhifuAgent.chat.skillRemoved");
    return;
  }
  const skill = store
    .skillsByScope("workspace")
    .find((item) => item.id === original.id && item.scope === original.scope);
  if (!skill) {
    store.error = t("zhifuAgent.chat.skillRemoved");
    return;
  }
  workflowDialogs?.openSkillEditor(skill);
}

const streamingLabel = computed(() => {
  if (props.message.statusLabel) return props.message.statusLabel;
  if (props.tools.some((tool) => tool.status === "running")) return t("zhifuAgent.chat.executing");
  return props.message.content ? t("zhifuAgent.chat.generating") : t("zhifuAgent.chat.thinking");
});

const copied = ref(false);
let copyTimer: number | undefined;

async function copyMessage() {
  try {
    const shopNames = props.message.shops?.length
      ? `${t("zhifuAgent.composer.copyShops", {
          names: props.message.shops.map((shop) => shop.name).join("、"),
        })}\n`
      : "";
    await navigator.clipboard.writeText(`${shopNames}${visibleContent.value}`.trim());
    copied.value = true;
    window.clearTimeout(copyTimer);
    copyTimer = window.setTimeout(() => {
      copied.value = false;
    }, 1800);
  } catch (cause: any) {
    ElMessage.error(cause?.message || t("zhifuAgent.chat.copyFailed"));
  }
}

onBeforeUnmount(() => window.clearTimeout(copyTimer));
</script>

<style lang="scss" scoped>
.batch-summary-card {
  margin-top: 28px;
  padding: 18px 20px 20px;
  border: 1px solid var(--el-color-primary-light-8, #d9e4ff);
  border-radius: 12px;
  background: linear-gradient(
    135deg,
    var(--el-color-primary-light-9, #f0f5ff),
    var(--el-bg-color, #fff)
  );

  :deep(.zhifu-markdown h2) {
    margin: 0 0 10px;
    padding-left: 11px;
    border-left: 3px solid var(--el-color-primary, #409eff);
    font-size: 17px;
    line-height: 1.4;
  }
  :deep(.zhifu-markdown p) {
    margin: 0 0 14px;
    color: var(--el-text-color-secondary, #737b8c);
    font-size: 13px;
    line-height: 1.7;
  }
  .result-artifacts {
    margin-top: 0;
  }
}
@media (max-width: 640px) {
  .batch-summary-card {
    padding: 16px;
    margin-top: 24px;
  }
}

.result-artifacts {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 10px 0;
  .el-button {
    max-width: 100%;
    height: auto;
    min-height: 28px;
    white-space: normal;
    overflow-wrap: anywhere;
  }
}
.message {
  display: flex;
  gap: 12px;
  margin-bottom: 22px;

  &.user {
    flex-direction: row-reverse;

    .message-body {
      flex: 0 1 auto;
      width: fit-content;
      max-width: min(72%, 620px);
    }

    .message-meta,
    .message-actions,
    .message-images,
    .message-files {
      justify-content: flex-end;
    }

    .user-request-card .zhifu-markdown {
      padding: 0;
      background: transparent;
      border: 0;
      border-radius: 0;
    }

    .message-author {
      color: #676a64;
    }

    .zhifu-markdown {
      padding: 10px 13px;
      background: #f1f2f2;
      border: 1px solid #eceeef;
      border-radius: 8px 2px 8px 8px;

      :deep(p:last-child) {
        margin-bottom: 0;
      }
    }
  }
}

.avatar {
  display: grid;
  flex: 0 0 30px;
  place-items: center;
  width: 30px;
  height: 30px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 50%;

  .assistant & {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
}

.message-body {
  flex: 1;
  min-width: 0;
}

.message-meta {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-bottom: 6px;
  font-size: 12px;
}
.assistant .message-meta {
  border-bottom: 1px solid #eceeef;
  padding-bottom: 8px;
  margin-bottom: 8px;
}
.message-author {
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.turn-timing {
  color: var(--el-text-color-secondary);
}

.message-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;

  img {
    max-width: 180px;
    max-height: 140px;
    cursor: zoom-in;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    object-fit: cover;
  }
}

.message-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 8px;
}

.user-request-card {
  padding: 10px 13px;
  background: #f1f2f2;
  border: 1px solid #eceeef;
  border-radius: 10px 2px 10px 10px;
}

.message-context-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  margin-bottom: 10px;
}

.message-context-label {
  font-size: 11px;
  color: var(--el-text-color-secondary);
}

.message-shop,
.message-skill {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 220px;
  min-height: 26px;
  padding: 4px 8px;
  font-size: 12px;
  font-weight: 500;
  border-radius: 6px;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.message-shop {
  color: #245f41;
  background: #e4f3ea;
  border: 1px solid #b8d8c5;
}

.message-skill {
  color: #69518d;
  background: #eee8f6;
  border: 1px solid #d8cee9;
}

.message-file {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  padding: 4px 10px;
  font-size: 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
}

.thinking {
  display: inline-flex;
  gap: 4px;
  align-items: center;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  .dot {
    width: 5px;
    height: 5px;
    background: var(--el-color-primary);
    border-radius: 50%;
    animation: zhifu-blink 1.2s infinite ease-in-out;

    &:nth-child(2) {
      animation-delay: 0.2s;
    }

    &:nth-child(3) {
      margin-right: 4px;
      animation-delay: 0.4s;
    }
  }
}

@keyframes zhifu-blink {
  0%,
  80%,
  100% {
    opacity: 0.25;
  }

  40% {
    opacity: 1;
  }
}

.workflow-result-summary {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.message-actions {
  display: flex;
  flex-wrap: nowrap;
  gap: 10px;
  align-items: center;
  margin-top: 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  transition: opacity 0.15s;
  .el-icon {
    font-size: 14px;
  }
}

.action-icon {
  cursor: pointer;

  &:hover {
    color: var(--el-color-primary);
  }

  &.is-disabled {
    color: var(--el-text-color-disabled);
    cursor: not-allowed;

    &:hover {
      color: var(--el-text-color-disabled);
    }
  }
}

.zhifu-markdown {
  font-size: 14px;
  line-height: 1.7;
  color: var(--el-text-color-primary);
  word-break: break-word;

  :deep(p) {
    margin: 0 0 8px;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 22px;
    margin: 0 0 8px;
  }

  :deep(a) {
    color: var(--el-color-primary);
  }

  :deep(.shop-result-display) {
    margin: 10px 0 24px;
  }

  :deep(.shop-result-summary),
  :deep(.shop-result-details) {
    font-size: 13px;
    color: var(--el-text-color-secondary);
  }

  :deep(.shop-result-details) {
    margin-top: 12px;
    font-size: 12px;

    summary {
      width: fit-content;
      cursor: pointer;
    }

    pre {
      max-height: 240px;
      margin: 8px 0 0;
      overflow: auto;
      white-space: pre-wrap;
      overflow-wrap: anywhere;
    }
  }

  :deep(table) {
    margin-bottom: 8px;
    border-collapse: collapse;

    th,
    td {
      padding: 4px 10px;
      border: 1px solid var(--el-border-color-lighter);
    }
  }

  :deep(:not(pre) > code) {
    padding: 1px 5px;
    font-family: Consolas, Menlo, monospace;
    font-size: 12px;
    background: var(--el-fill-color-light);
    border-radius: 4px;
  }

  :deep(.code-block) {
    margin: 8px 0;
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
  }

  :deep(.code-toolbar) {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 10px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    background: var(--el-fill-color-lighter);
  }

  :deep(.code-copy) {
    padding: 2px 8px;
    font-size: 12px;
    color: inherit;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 4px;

    &:hover,
    &.copied {
      color: var(--el-color-primary);
      background: var(--el-fill-color);
    }
  }

  :deep(pre) {
    padding: 10px 12px;
    margin: 0;
    overflow-x: auto;
    font-family: Consolas, Menlo, monospace;
    font-size: 12px;
    line-height: 1.6;
    background: var(--el-bg-color);
  }

  :deep(.hljs-keyword),
  :deep(.hljs-built_in) {
    color: #a626a4;
  }

  :deep(.hljs-string),
  :deep(.hljs-attr) {
    color: #50a14f;
  }

  :deep(.hljs-number),
  :deep(.hljs-literal) {
    color: #986801;
  }

  :deep(.hljs-comment) {
    font-style: italic;
    color: #a0a1a7;
  }

  :deep(.hljs-title),
  :deep(.hljs-function) {
    color: #4078f2;
  }

  :deep(.hljs-tag),
  :deep(.hljs-name) {
    color: #e45649;
  }
}
</style>
