<template>
  <aside class="agent-sidebar">
    <div class="brand-row">
      <strong>{{ t("router.zhifu_agent") }}</strong>
    </div>

    <button class="new-task" type="button" @click="createConversation">
      <el-icon><ChatLineSquare /></el-icon>
      <span>{{ t("zhifuAgent.chat.newTask") }}</span>
    </button>

    <nav class="feature-nav">
      <button
        type="button"
        :class="{ active: store.activePage === 'skills' }"
        @click="store.openPage('skills')"
      >
        <svg class="nav-icon" viewBox="0 0 15 15" aria-hidden="true">
          <path
            d="M3,3C3,1.3431449,4.3431454,0,6,0C7.6568251,0,9,1.3431449,9,3L11.25,3C11.664225,3,12,3.3357902,12,3.75L12,6C13.656826,6,15,7.3431749,15,9C15,10.656825,13.656826,12,12,12L12,14.25C12,14.664225,11.664225,15,11.25,15L0.75,15C0.33579004,15,0,14.664225,0,14.25L0,3.75C0,3.3357902,0.33579004,3,0.75,3L3,3ZM6,1.5C5.1715722,1.5,4.5,2.1715727,4.5,3C4.5,3.1766548,4.5302253,3.3446398,4.5851626,3.5000625C4.6662898,3.7296147,4.6309576,3.9842625,4.4903851,4.1830425C4.3498049,4.3818226,4.1214905,4.5,3.8780322,4.5L1.5,4.5L1.5,13.5L10.5,13.5L10.5,11.121975C10.5,10.878525,10.6182,10.650225,10.81695,10.5096C11.015776,10.36905,11.270401,10.333725,11.499901,10.414875C11.655375,10.469774,11.823375,10.5,12,10.5C12.828451,10.5,13.5,9.8284502,13.5,9C13.5,8.1715498,12.828451,7.5,12,7.5C11.823375,7.5,11.655375,7.5302253,11.499901,7.585125C11.270401,7.666275,11.015776,7.63095,10.81695,7.4903998C10.6182,7.3497748,10.5,7.1214752,10.5,6.8780251L10.5,4.5L8.1219749,4.5C7.8785248,4.5,7.6502252,4.3818226,7.5096002,4.1830425C7.36905,3.9842625,7.333725,3.7296147,7.414875,3.5000625C7.4697747,3.3446398,7.5,3.1766624,7.5,3C7.5,2.1715727,6.8284502,1.5,6,1.5Z"
            fill="currentColor"
          />
        </svg>
        <span>{{ t("zhifuAgent.skills.title") }}</span>
      </button>
      <button
        type="button"
        :class="{ active: store.activePage === 'scheduled' }"
        @click="store.openPage('scheduled')"
      >
        <svg class="nav-icon" viewBox="0 0 15.75 15.75" aria-hidden="true">
          <path
            d="M3.75,1.5L3.75,0L5.25,0L5.25,1.5L9.75,1.5L9.75,0L11.25,0L11.25,1.5L14.25,1.5C14.664225,1.5,15,1.83579,15,2.25L15,6L13.5,6L13.5,3L11.25,3L11.25,4.5L9.75,4.5L9.75,3L5.25,3L5.25,4.5L3.75,4.5L3.75,3L1.5,3L1.5,13.5L6,13.5L6,15L0.75,15C0.33579004,15,0,14.664225,0,14.25L0,2.25C0,1.83579,0.33579004,1.5,0.75,1.5L3.75,1.5ZM11.25,8.25C9.5931749,8.25,8.25,9.5931749,8.25,11.25C8.25,12.906826,9.5931749,14.25,11.25,14.25C12.906826,14.25,14.25,12.906826,14.25,11.25C14.25,9.5931749,12.906826,8.25,11.25,8.25ZM6.75,11.25C6.75,8.7647247,8.7647247,6.75,11.25,6.75C13.735275,6.75,15.75,8.7647247,15.75,11.25C15.75,13.735275,13.735275,15.75,11.25,15.75C8.7647247,15.75,6.75,13.735275,6.75,11.25ZM10.5,9L10.5,11.56065L12.219675,13.280325L13.280325,12.219675L12,10.93935L12,9L10.5,9Z"
            fill="currentColor"
          />
        </svg>
        <span>{{ t("zhifuAgent.scheduled.title") }}</span>
        <span v-if="store.unreadScheduledCount" class="nav-unread">
          {{ store.unreadScheduledCount > 99 ? "99+" : store.unreadScheduledCount }}
        </span>
      </button>
    </nav>

    <button
      v-if="mainConversation"
      type="button"
      :class="[
        'conversation-item',
        'main-conversation',
        {
          active: store.activePage === 'chat' && mainConversation.id === store.activeId,
          error: mainConversation.notificationType === 'error',
          approval: awaitingApproval(mainConversation),
        },
      ]"
      :aria-current="
        store.activePage === 'chat' && mainConversation.id === store.activeId ? 'page' : undefined
      "
      @click="selectConversation(mainConversation.id)"
    >
      <el-icon class="main-conversation-icon"><ChatLineSquare /></el-icon>
      <span class="conversation-title" :title="mainConversation.title">
        {{ mainConversation.title }}
      </span>
      <small v-if="awaitingApproval(mainConversation)" class="run-state run-state-approval">
        {{ t("zhifuAgent.chat.awaitingConfirmation") }}
      </small>
      <small
        v-else-if="
          ['queued', 'running', 'failed', 'interrupted'].includes(
            mainConversation.executionState || ''
          )
        "
        class="run-state"
        :class="{
          'run-state-error': ['failed', 'interrupted'].includes(
            mainConversation.executionState || ''
          ),
        }"
      >
        {{ t(`zhifuAgent.chat.runState.${mainConversation.executionState}`) }}
      </small>
      <span v-if="mainConversation.unreadCount" class="unread-count">
        {{ mainConversation.unreadCount > 99 ? "99+" : mainConversation.unreadCount }}
      </span>
    </button>
    <div class="panel-label conversation-heading">
      <span>{{ t("zhifuAgent.chat.recentTasks") }}</span>
      <el-dropdown trigger="click" @command="setConversationFilter">
        <button
          class="conversation-filter"
          type="button"
          :class="{ filtered: conversationFilter !== 'all' }"
          :aria-label="t('zhifuAgent.chat.filterConversations')"
        >
          <span v-if="conversationFilter !== 'all'">
            {{ t(`zhifuAgent.chat.conversationKinds.${conversationFilter}`) }}
          </span>
          <el-icon><Filter /></el-icon>
        </button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item v-for="kind in conversationFilters" :key="kind" :command="kind">
              <span :class="{ 'selected-filter': conversationFilter === kind }">
                {{ t(`zhifuAgent.chat.conversationKinds.${kind}`) }}
              </span>
              <el-icon v-if="conversationFilter === kind"><Check /></el-icon>
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    <el-scrollbar class="conversation-scroll">
      <div
        v-for="item in recentConversations"
        :key="item.id"
        :class="[
          'conversation-item',
          {
            active: store.activePage === 'chat' && item.id === store.activeId,
            unread: item.unreadCount,
            error: item.notificationType === 'error',
            approval: awaitingApproval(item),
          },
        ]"
        @click="selectConversation(item.id)"
      >
        <el-icon
          class="conversation-type"
          :title="t(`zhifuAgent.chat.conversationKinds.${conversationKind(item)}`)"
        >
          <component :is="conversationIcons[conversationKind(item)]" />
        </el-icon>
        <span
          class="conversation-copy"
          :title="`${item.title}\n${new Date(conversationActivityAt(item)).toLocaleString()}`"
        >
          <span class="conversation-title">{{ conversationDisplayTitle(item) }}</span>
          <span class="conversation-date">
            {{ conversationDate(conversationActivityAt(item)) }}
          </span>
        </span>
        <small v-if="awaitingApproval(item)" class="run-state run-state-approval">
          {{ t("zhifuAgent.chat.awaitingConfirmation") }}
        </small>
        <small
          v-else-if="
            ['queued', 'running', 'failed', 'interrupted'].includes(item.executionState || '')
          "
          class="run-state"
          :class="{
            'run-state-error':
              item.executionState === 'failed' || item.executionState === 'interrupted',
          }"
        >
          {{ t(`zhifuAgent.chat.runState.${item.executionState}`) }}
        </small>
        <span v-if="item.unreadCount" class="unread-count">
          {{ item.unreadCount > 99 ? "99+" : item.unreadCount }}
        </span>
        <el-dropdown
          v-if="!item.isMainConversation"
          trigger="click"
          @command="(command) => handleCommand(command, item)"
        >
          <el-icon class="conversation-more" @click.stop><MoreFilled /></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="rename" :icon="EditPen">
                {{ t("zhifuAgent.chat.rename") }}
              </el-dropdown-item>
              <el-dropdown-item command="delete" :icon="Delete" class="danger-item">
                {{ t("zhifuAgent.common.delete") }}
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      <div v-if="!recentConversations.length" class="conversation-empty">
        {{ t("zhifuAgent.chat.noFilteredConversations") }}
      </div>
      <el-button
        v-if="store.conversationHasMore"
        text
        :loading="store.conversationPageLoading"
        style="width: 100%"
        @click="store.loadMoreConversations()"
      >
        加载更多会话
      </el-button>
    </el-scrollbar>

    <div class="sidebar-footer">
      <div v-if="planChecked && showTrial" class="benefit-card">
        <img class="benefit-card__bg" :src="benefitSidebar" alt="" />
        <button type="button" class="benefit-card__btn" :disabled="claiming" @click="claimBenefit">
          {{ t("zhifuAgent.settings.benefitClaim") }}
        </button>
      </div>
      <div v-else-if="planChecked" class="plan-card">
        <div class="plan-copy">
          <div class="plan-name">
            <img class="plan-gem" :src="planSparkle" alt="" />
            <strong :title="activePlan?.name || t('zhifuAgent.settings.planUnsubscribed')">
              {{ activePlan?.name || t("zhifuAgent.settings.planUnsubscribed") }}
            </strong>
          </div>
          <p v-if="activePlan?.expireDate">
            {{ t("zhifuAgent.settings.planExpire", { date: activePlan.expireDate }) }}
          </p>
          <p v-else>{{ t("zhifuAgent.settings.planUnsubscribedDesc") }}</p>
        </div>
        <button v-if="hasPerm('ai.purchase')" type="button" class="plan-renew" @click="openRenew">
          {{
            activePlan && showAsSubscribed
              ? t("zhifuAgent.settings.planRenew")
              : t("zhifuAgent.settings.planSubscribe")
          }}
        </button>
      </div>
      <button
        type="button"
        :class="['settings-entry', { active: isModelManage }]"
        @click="openModelManage"
      >
        <img class="entry-icon" :src="modelManageIcon" alt="" />
        <span>{{ t("zhifuAgent.settings.modelManagement") }}</span>
        <span :class="['entry-detail', { active: isModelUsage }]" @click.stop="openModelUsage">
          {{ t("zhifuAgent.settings.modelDetail") }}
        </span>
      </button>
      <button
        type="button"
        :class="['settings-entry', { active: isAppSettings }]"
        @click="openSettings('general')"
      >
        <img class="entry-icon" :src="appSettingsIcon" alt="" />
        <span>{{ t("zhifuAgent.settings.appSettings") }}</span>
      </button>
    </div>

    <el-dialog
      v-model="benefitVisible"
      append-to-body
      class="benefit-claim-dialog"
      width="465px"
      :show-close="false"
      :close-on-click-modal="false"
    >
      <div class="benefit-claim">
        <div class="benefit-claim__banner-wrap">
          <img class="benefit-claim__banner" :src="benefitPopup" alt="" />
        </div>
        <button type="button" class="benefit-claim__close" @click="benefitVisible = false">
          <img src="@/ai/assets/images/coupangClose.png" width="24" height="24" alt="" />
        </button>
        <div class="benefit-claim__body">
          <p class="benefit-claim__title">{{ activity?.unlimited ? t("zhifuAgent.settings.benefitPopupTitle") : "新用户福利！领取专属限时 Token 试用" }}</p>
          <ul>
            <li>{{ activity?.unlimited ? t("zhifuAgent.settings.benefitPopupRule1") : `领取后即可获取 ${Number(activity?.total_amount || 0).toLocaleString()} Tokens；` }}</li>
            <li>{{ `领取后，有效期 ${Number(activity?.duration_days || 1) * 24} 小时。` }}</li>
          </ul>
          <button
            type="button"
            class="benefit-claim__btn"
            :disabled="claiming"
            @click="claimBenefit"
          >
            {{ t("zhifuAgent.settings.benefitClaim") }}
          </button>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="renewVisible"
      append-to-body
      class="usage-renew-dialog"
      width="820px"
      :show-close="false"
      :close-on-click-modal="false"
    >
      <ModelPlanBuyPanel
        v-if="renewVisible"
        embedded
        :plan-id="showAsSubscribed ? (activePlan?.planId ?? null) : null"
        :plan-name="showAsSubscribed ? activePlan?.name || '' : ''"
        :use-renew-api="useRenewApi"
        @close="renewVisible = false"
        @success="handleRenewSuccess"
      />
    </el-dialog>
  </aside>
</template>

<script setup lang="ts">
import {
  ChatLineSquare,
  Delete,
  EditPen,
  MoreFilled,
  Filter,
  Check,
  MagicStick,
  Clock,
} from "@element-plus/icons-vue";
import { nextTick } from "vue";
import ModelPlanBuyPanel from "@/ai/views/modelManage/components/ModelPlanBuyPanel.vue";
import { useModelPlanAccess } from "@/ai/views/modelManage/composables/useModelPlanAccess";
import planSparkle from "@/ai/assets/icons/plan-sparkle.png";
import benefitSidebar from "@/ai/assets/images/benefit-sidebar.png";
import benefitPopup from "@/ai/assets/images/benefit-popup.png";
import appSettingsIcon from "@/ai/assets/icons/appSettings.png";
import modelManageIcon from "@/ai/assets/icons/modelManageIcon.png";
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { useUserStore } from "@/ai/store/modules/user.store";
import { hasPerm } from "@/ai/utils/permission";
import type { Conversation } from "../type";
import {
  conversationKind,
  conversationDisplayTitle,
  conversationActivityAt,
  recentConversationList,
  type ConversationKind,
} from "../utils/sidebarConversations";

const store = useZhifuAgentStore();
const userStore = useUserStore();
/** 当前登录账号。活动和订阅是模块级缓存，换账号后还会留着上一个人的结果 */
const accountId = computed(() => String(userStore.userInfo?.id || userStore.userInfo?.uid || ""));
/** 已经用这份结果确认过的账号。空字符串表示还没查完 */
const confirmedAccountId = ref("");
/** 只有查完且仍是当前账号，才显示福利卡或套餐卡，否则先留白 */
const planChecked = computed(
  () => confirmedAccountId.value !== "" && confirmedAccountId.value === accountId.value
);
const { t } = useI18n();
const mainConversation = computed(() =>
  store.conversations.find((item) => item.isMainConversation)
);
const localConversationFilter = ref<ConversationKind | "all">("all");
const conversationFilter = computed({
  get: () => store.conversationFilter ?? localConversationFilter.value,
  set: (value) => {
    localConversationFilter.value = value;
    void store.setConversationFilter?.(value);
  },
});
const conversationFilters = ["all", "ordinary", "skill", "scheduled"] as const;
const conversationIcons = { ordinary: ChatLineSquare, skill: MagicStick, scheduled: Clock };
const recentConversations = computed(() =>
  recentConversationList(store.conversations, conversationFilter.value)
);
function setConversationFilter(kind: string) {
  if (conversationFilters.includes(kind as (typeof conversationFilters)[number]))
    conversationFilter.value = kind as ConversationKind | "all";
}
function awaitingApproval(item: Conversation) {
  return store.hasPendingApproval
    ? store.hasPendingApproval(item.id)
    : item.notificationType === "approval";
}
function conversationDate(timestamp: number) {
  if (!Number.isFinite(timestamp)) return "";
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 1);
  const day =
    date.toDateString() === today.toDateString()
      ? t("zhifuAgent.chat.today")
      : date.toDateString() === yesterday.toDateString()
        ? t("zhifuAgent.chat.yesterday")
        : date.toLocaleDateString();
  return `${day} ${date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
}

const isAppSettings = computed(() => store.activePage === "settings");
const isModelManage = computed(() => store.activePage === "model");
const isModelUsage = computed(() => store.activePage === "modelUsage");

const {
  activeSubscription,
  showTrial,
  showAsSubscribed,
  useRenewApi,
  claiming,
  claimTrial,
  activity,
  refresh: refreshPlanAccess,
} = useModelPlanAccess();

interface ActivePlan {
  name: string;
  expireDate: string;
  planId: number | null;
}

const activePlan = ref<ActivePlan | null>(null);
const renewVisible = ref(false);
const benefitVisible = ref(false);
const benefitPrompted = ref(false);

function planExpireDate(value?: string | null) {
  return String(value || "").match(/\d{4}-\d{2}-\d{2}/)?.[0] || "";
}

async function loadPlan() {
  const uid = accountId.value;
  if (!uid) return;
  try {
    await refreshPlanAccess();
    // 请求回来时已经换成别的账号，这份结果丢掉
    if (accountId.value !== uid) return;
    if (!showTrial.value) benefitVisible.value = false;
    else if (!benefitPrompted.value) {
      benefitVisible.value = true;
      benefitPrompted.value = true;
    }
    const current = activeSubscription.value;
    if (!current?.name) {
      activePlan.value = null;
      return;
    }
    activePlan.value = {
      name: current.name,
      expireDate: planExpireDate(current.end_at),
      planId: current.plan_id ?? null,
    };
  } catch {
    if (accountId.value !== uid) return;
    activePlan.value = null;
  } finally {
    // 确认之后 planChecked 才为 true，侧边栏结束留白
    if (accountId.value === uid) confirmedAccountId.value = uid;
  }
}

function openRenew() {
  if (!hasPerm('ai.purchase')) return;
  renewVisible.value = true;
}

async function claimBenefit() {
  const claimed = await claimTrial();
  if (!claimed) return;
  benefitVisible.value = false;
  ElMessage.success(t("zhifuAgent.settings.benefitClaimed"));
  await handleRenewSuccess();
}

watch(
  () => store.planBuySignal,
  (value) => {
    if (value) openRenew();
  }
);

watch(
  () => store.benefitClaimSignal,
  (value) => {
    if (value) benefitVisible.value = true;
  }
);

// 一切换账号，planChecked 立刻变 false，福利卡先隐藏，再查当前账号
watch(accountId, (uid, prev) => {
  if (prev == null || uid === prev) return;
  benefitVisible.value = false;
  benefitPrompted.value = false;
  if (!uid) return;
  void loadPlan();
});

async function handleRenewSuccess() {
  renewVisible.value = false;
  await loadPlan();
  void store.refreshModelUser();
}

function openModelManage() {
  store.openPage("model");
}

function openModelUsage() {
  store.openPage("modelUsage");
}

function openSettings(tab: "general") {
  store.openPage("settings", tab);
}

function emptyNewConversation() {
  return store.conversations.find(
    (item) =>
      !item.isMainConversation &&
      !item.skillTrial &&
      !item.scheduledTaskId &&
      !item.channel &&
      !item._summary &&
      !item.messages.length
  );
}

async function revealActiveConversation() {
  conversationFilter.value = "all";
  await nextTick();
  document
    .querySelector(".agent-sidebar .conversation-item.active")
    ?.scrollIntoView({ block: "nearest" });
}

async function createConversation() {
  const existing = emptyNewConversation();
  store.openPage("chat");
  if (existing) {
    await store.selectConversation(existing.id);
    await revealActiveConversation();
    return;
  }
  store.addConversation();
  await revealActiveConversation();
}

async function selectConversation(id: string) {
  store.openPage("chat");
  await store.selectConversation(id);
}

async function handleRename(conversation: Conversation) {
  try {
    const { value } = await ElMessageBox.prompt(
      t("zhifuAgent.chat.renamePrompt"),
      t("zhifuAgent.chat.rename"),
      {
        inputValue: conversation.title,
        inputPattern: /^.{0,80}$/,
        inputErrorMessage: t("zhifuAgent.chat.titleTooLong"),
        confirmButtonText: t("zhifuAgent.common.confirm"),
        cancelButtonText: t("zhifuAgent.common.cancel"),
      }
    );
    store.renameConversation(conversation, value || "");
  } catch {
    // 用户取消
  }
}

async function handleDelete(conversation: Conversation) {
  if (store.conversationRuns[conversation.id]) {
    ElMessage.warning(t("zhifuAgent.chat.stopBeforeDelete"));
    return;
  }
  try {
    await ElMessageBox.confirm(
      t("zhifuAgent.chat.deleteConfirm", { title: conversation.title }),
      t("zhifuAgent.common.tip"),
      {
        type: "warning",
        confirmButtonText: t("zhifuAgent.common.delete"),
        cancelButtonText: t("zhifuAgent.common.cancel"),
      }
    );
  } catch {
    return;
  }
  store.deleteConversation(conversation);
}

function handleCommand(command: string, conversation: Conversation) {
  if (conversation.isMainConversation) return;
  if (command === "rename") handleRename(conversation);
  if (command === "delete") handleDelete(conversation);
}

onMounted(loadPlan);
</script>

<style lang="scss" scoped>
.agent-sidebar {
  display: flex;
  flex: 0 0 240px;
  flex-direction: column;
  width: 240px;
  min-height: 0;
  padding: 12px 8px;
  // background: var(--el-fill-color-lighter);
  border-right: 1px solid var(--el-border-color-lighter);
}

.brand-row {
  display: flex;
  gap: 9px;
  align-items: center;
  height: 36px;
  padding: 0 8px;
  margin-bottom: 0px;
  color: var(--el-text-color-primary);

  strong {
    font-size: 17px;
    font-weight: 600;
  }
}

.brand-mark {
  display: grid;
  flex: none;
  place-items: center;
  height: 22px;

  img {
    display: block;
    height: 22px;
    width: auto;
    object-fit: contain;
  }
}

.new-task,
.feature-nav button,
.settings-entry {
  display: flex;
  gap: 9px;
  align-items: center;
  width: 100%;
  height: 36px;
  padding: 0 10px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 7px;

  &:hover,
  &.active {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color);
  }
}

.new-task {
  // margin-bottom: 6px;
  // color: var(--el-color-primary);
  // border: 1px solid var(--el-color-primary-light-5);
  .el-icon {
    font-size: 17px;
    color: #333333;
  }
}

.feature-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-bottom: 12px;
  .nav-icon {
    flex: none;
    width: 16px;
    height: 16px;
  }
}

.nav-unread {
  min-width: 17px;
  padding: 1px 5px;
  margin-left: auto;
  font-size: 12px;
  height: 17px;
  color: #fff;
  text-align: center;
  background: var(--el-color-danger);
  border-radius: 9px;
}

.panel-label {
  padding: 0 10px 8px;
  font-size: 13px;
  color: var(--el-text-color-secondary);
}

.conversation-scroll {
  flex: 1;
  min-height: 0;
  // Extend the scroll track into the sidebar gutter, keeping row actions clear.
  margin-right: -8px;

  :deep(.el-scrollbar__view) {
    padding-right: 8px;
  }

  :deep(.el-scrollbar__bar.is-vertical) {
    right: 0;
    width: 5px;
  }
}
.conversation-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.conversation-filter {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 3px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  cursor: pointer;
}
.conversation-filter:hover,
.conversation-filter.filtered,
.selected-filter {
  color: var(--el-color-primary);
}
.conversation-filter:focus-visible {
  outline: 2px solid var(--el-color-primary);
}
.conversation-type {
  flex: none;
  align-self: flex-start;
  margin-top: 3px;
  font-size: 15px;
  color: var(--el-text-color-secondary);
}
.conversation-copy {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
  > .conversation-title {
    flex: none;
    line-height: 20px;
  }
}
.conversation-date {
  font-size: 11px;
  line-height: 14px;
  color: var(--el-text-color-secondary);
}
.conversation-empty {
  padding: 16px 10px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
}
.run-state-approval {
  color: var(--el-color-warning);
}

.conversation-item {
  box-sizing: border-box;
  display: flex;
  gap: 6px;
  align-items: center;
  min-height: 32px;
  padding: 5px 6px 5px 8px;
  font-size: 14px;
  color: var(--el-text-color-regular);
  cursor: pointer;
  border-radius: 6px;
  margin-bottom: 4px;

  &:hover,
  &.active {
    color: var(--el-text-color-primary);
    background: var(--el-fill-color);
  }

  &.unread .conversation-title {
    font-weight: 600;
  }

  &:hover .conversation-more,
  &:focus-within .conversation-more {
    opacity: 1;
  }
}

.conversation-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.main-conversation {
  flex: none;
  width: 100%;
  height: 40px;
  gap: 8px;
  padding: 0 12px;
  margin: 0 0 12px;
  text-align: left;
  font-family: inherit;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border: 0;
  border-radius: 8px;
  transition: background-color 0.15s ease;

  .conversation-title {
    font-weight: 600;
  }
  .main-conversation-icon {
    flex: none;
    font-size: 16px;
  }
  &:hover {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  &.active {
    color: var(--el-color-primary);
    background: var(--el-color-primary-light-9);
  }
  .run-state {
    padding: 2px 6px;
    line-height: 16px;
    border-radius: 4px;
    background: var(--el-fill-color);
  }
  .run-state-error {
    color: var(--el-color-danger);
    background: var(--el-color-danger-light-9);
  }
  &:focus-visible {
    outline: 2px solid var(--el-color-primary);
    outline-offset: 2px;
  }
}

.run-state {
  flex: none;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.run-state-error {
  color: var(--el-color-danger);
}

.unread-count {
  display: grid;
  place-items: center;
  min-width: 17px;
  height: 17px;
  padding: 0 5px;
  font-size: 10px;
  color: #fff;
  background: var(--el-color-primary);
  border-radius: 9px;

  .error & {
    background: var(--el-color-danger);
  }

  .approval & {
    background: var(--el-color-warning);
  }
}

.conversation-more {
  color: var(--el-text-color-secondary);
  border-radius: 4px;
  opacity: 0;

  &:hover {
    background: var(--el-fill-color-dark);
  }
}

.sidebar-footer {
  // padding-top: 8px;
  margin-top: 8px;
  // border-top: 1px solid var(--el-border-color-lighter);
}

.benefit-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 8px;
  padding-bottom: 10px;
  overflow: hidden;
  background: #fff;
  border-radius: 10px;
}

.benefit-card__bg {
  display: block;
  width: 100%;
  height: auto;
}

.benefit-card__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 178px;
  height: 28px;
  padding: 0;
  margin-top: 8px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  line-height: 1;
  color: #fff !important;
  cursor: pointer;
  background-color: #1b44ca !important;
  border: 0;
  border-radius: 14px;
  appearance: none;

  &:hover:not(:disabled) {
    color: #fff !important;
    background-color: #1638a8 !important;
  }

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

.plan-card {
  display: flex;
  gap: 8px;
  align-items: center;
  padding: 8px 10px;
  margin-bottom: 8px;
  background: #e7f2ff;
  border: 1px solid #e6eaed;
  border-radius: 8px;
}

.plan-copy {
  flex: 1;
  min-width: 0;
}

.plan-name {
  display: flex;
  gap: 4px;
  align-items: center;
  min-width: 0;
  color: #262c30;

  strong {
    overflow: hidden;
    font-size: 14px;
    font-weight: 600;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.plan-gem {
  flex: none;
  width: 16px;
  height: 16px;
}

.plan-copy p {
  margin: 2px 0 0 20px;
  font-size: 12px;
  line-height: 1.4;
  color: #8b9499;
}

.plan-renew {
  flex: none;
  height: 28px;
  padding: 0 12px;
  font-size: 13px;
  line-height: 28px;
  color: #fff;
  cursor: pointer;
  background: #3370ff;
  border: 0;
  border-radius: 14px;
}

.entry-icon {
  flex: none;
  display: block;
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.entry-detail {
  margin-left: auto;
  font-size: 14px;
  color: #3370ff;

  &.active {
    font-weight: 600;
  }
}

:deep(.danger-item) {
  color: var(--el-color-danger);
}
</style>

<style lang="scss">
.benefit-claim-dialog.el-dialog {
  overflow: hidden;
  background: #fff;
  border: none;
  border-radius: 22px;

  > .el-dialog__header {
    display: none;
    padding: 0;
    margin: 0;
    border-bottom: none;
  }

  > .el-dialog__body {
    padding: 0 !important;
  }
}

.benefit-claim {
  position: relative;
  overflow: hidden;
  background: #fff;
  border-radius: 22px;
  padding: 6px;
}

.benefit-claim__banner-wrap {
  overflow: hidden;
  line-height: 0;
}

.benefit-claim__banner {
  display: block;
  width: 453px;
  height: auto;
  margin: 0 auto;
}

.benefit-claim__close {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  padding: 0;
  cursor: pointer;
  background: transparent;
  border: 0;

  img {
    display: block;
    width: 24px;
    height: 24px;
  }
}

.benefit-claim__body {
  padding: 20px 28px 24px;
}

.benefit-claim__title {
  margin: 0;
  font-size: 18px;
  font-weight: 700;
  line-height: 1.5;
  color: #1d2129;
}

.benefit-claim__body ul {
  padding-left: 1.2em;
  margin: 12px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: #4e5969;
  list-style: disc;
}

.benefit-claim__body li {
  list-style: disc;
}

.benefit-claim__btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 280px;
  height: 40px;
  margin: 20px auto 0;
  font-size: 15px;
  font-weight: 500;
  color: #fff;
  cursor: pointer;
  background: #1b44ca;
  border: 0;
  border-radius: 20px;

  &:disabled {
    cursor: wait;
    opacity: 0.7;
  }
}

.usage-renew-dialog.el-dialog {
  overflow: hidden;
  border-radius: 12px;

  > .el-dialog__header {
    display: none;
    padding: 0;
    border-bottom: none;
  }

  > .el-dialog__body {
    padding: 0 !important;
  }
}
</style>
