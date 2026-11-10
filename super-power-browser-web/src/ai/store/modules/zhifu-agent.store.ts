import { queryUserModelImportedApi } from "@/ai/api/modelManage";
import { store } from "@/ai/store";
import { useUserStoreHook } from "@/ai/store/modules/user.store";
import { markRaw } from "vue";
import { ExecutionQueue } from "@/ai/views/zhifuAgent/utils/executionQueue";
import { isApprovalDenied, userError } from "@/ai/views/zhifuAgent/utils/userError";
import router from "@/ai/router";
import i18n from "@/ai/lang";
import {
  getMessageChannelConfig,
  getZhifuMarketModels,
  getZhifuModelUser,
  getMySkillStoreList,
  getSkillStoreList,
  normalizeScheduledTask,
  saveMessageChannelConfig as saveMessageChannelConfigApi,
  type AgentSettings,
  type MessageChannelCategoryId,
  type MessageChannelConfig,
  type MessageChannelSettings,
  type ScheduledTask,
  type SkillStoreItem,
} from "@/ai/api/zhifuAgent";
import {
  zhifuBootstrap,
  zhifuConversationStorageInfo,
  zhifuMoveConversationStorage,
  zhifuLoadConversations,
  zhifuSaveConversations,
  zhifuExportConversations,
  zhifuImportConversations,
  zhifuStopAgent,
  zhifuListSkills,
  zhifuOnAgentEvent,
  zhifuOnApprovalRequested,
  zhifuOnImMessage,
  zhifuOnImStatus,
  zhifuOnOpenScheduledTaskResult,
  zhifuOnScheduledTaskUpdated,
  zhifuSaveSettings,
  zhifuSelectWorkspace,
  zhifuSetWorkspace,
  zhifuCloseConversationBrowser,
  zhifuDeleteLocalScheduledTask,
  zhifuListLocalScheduledTasks,
  zhifuSaveLocalScheduledTask,
  type ZhifuAgentEvent,
  type ZhifuAgentMode,
  type ZhifuApprovalRequest,
  type ZhifuImMessage,
  type ZhifuImStatus,
  type ZhifuLocalSkill,
  type ZhifuSkillScope,
} from "@/ai/utils/electronApi";
import {
  MODEL_PROVIDERS,
  DEFAULT_AGENT_NAME,
  ZHIFU_STORAGE_KEYS,
  createDefaultMessageChannelSettings,
  createDefaultSettings,
} from "@/ai/views/zhifuAgent/constants";
import {
  gatewayBase,
  normalizeModelSource,
} from "@/ai/views/zhifuAgent/utils/modelSource";
import {
  collapseRepeatedText,
  mergeStreamText,
  stripThinkingMarkup,
} from "@/ai/views/zhifuAgent/utils/streamText";
import {
  normalizeExecutionTimeout,
  normalizeShopConcurrency,
} from "@/ai/views/zhifuAgent/utils/taskShops";
import { sameWorkspace } from "@/ai/views/zhifuAgent/utils/taskWorkspace";
import type {
  ChatMessage,
  Conversation,
  ConversationRun,
  DisplaySkill,
  NotificationType,
  SelectedSkill,
  SkillCreatorPrefill,
} from "@/ai/views/zhifuAgent/type";

const t = (key: string, params?: Record<string, any>) =>
  params ? i18n.global.t(key, params) : i18n.global.t(key);

export type ZhifuAgentPage = "chat" | "skills" | "scheduled" | "settings" | "model" | "modelUsage";
export type ZhifuAgentSettingsTab = "general" | "messaging";

/** 非安全上下文（http 访问）下 crypto.randomUUID 不可用 */
export const newId = () =>
  typeof crypto?.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

export const errorMessage = (cause: any, fallback = "") => {
  return userError(cause?.message || cause, fallback);
};

/** 返回体兼容数组或分页 { list } 两种格式 */
const pickList = <T>(res: any): T[] => {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  return [];
};

/** 名称归一化，用于匹配本地技能和商店技能 */
export const skillIdentity = (value: unknown) =>
  String(value || "")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");

/** 可选技能仅来自本地安装结果；调用方按工作区优先排序。 */
export function buildSelectableSkills<
  T extends { name?: string; enabled?: boolean; invalid?: boolean },
>(skills: T[]) {
  const unique = new Map<string, T>();

  for (const skill of skills) {
    const identity = skillIdentity(skill.name);
    if (!skill.enabled || skill.invalid || unique.has(identity)) continue;
    unique.set(identity, skill);
  }

  return [...unique.values()];
}

const createConversation = (): Conversation => ({
  id: newId(),
  title: t("zhifuAgent.chat.newTask"),
  autoTitle: true,
  createdAt: Date.now(),
  messages: [],
  tools: [],
  unreadCount: 0,
  notificationType: "",
  lastMessageAt: 0,
});

/** 保证有且只有一个主会话，并固定在列表最前，排在定时任务和消息通道之前 */
function ensureMainConversation(items: Conversation[]) {
  const title = t("zhifuAgent.chat.mainConversation");
  let main =
    items.find((item) => item.isMainConversation) ||
    items.find(
      (item) => item.title === title && !item.skillTrial && !item.scheduledTaskId && !item.channel
    );
  if (!main) {
    main = { ...createConversation(), title, autoTitle: false, isMainConversation: true };
    items.unshift(main);
  }
  main.title = title;
  main.autoTitle = false;
  main.isMainConversation = true;
  for (const item of items) {
    if (item !== main) item.isMainConversation = false;
  }
  const index = items.indexOf(main);
  if (index > 0) {
    items.splice(index, 1);
    items.unshift(main);
  }
  return main;
}

function currentAccountId() {
  const info = useUserStoreHook().userInfo;
  return String(info?.id || info?.uid || "");
}

function normalizeSavedConversations(items: Conversation[]) {
  for (const conversation of items) {
    if (["running", "queued"].includes(conversation.executionState || ""))
      conversation.executionState = "interrupted";
    conversation.tools ||= [];
    conversation.unreadCount ||= 0;
    conversation.notificationType ||= "";
    conversation.lastMessageAt ||=
      conversation.messages?.at(-1)?.createdAt || conversation.createdAt;
    if (conversation.autoTitle === undefined && conversation.title === "新会话") {
      conversation.autoTitle = true;
    }
    for (const message of conversation.messages || []) {
      if (message.streaming) {
        message.streaming = false;
        message.completedAt ||= Date.now();
        message.executionStatus = "cancelled";
      }
      message.content = collapseRepeatedText(
        message.role === "assistant" ? stripThinkingMarkup(message.content) : message.content
      );
    }
  }
  return items;
}

/** 历史数组格式兼容读取；当前数据按账号存放在 byUser 中 */
function readConversationArchive(): {
  byUser: Record<string, Conversation[]>;
  legacy: Conversation[] | null;
} {
  try {
    const raw = JSON.parse(localStorage.getItem(ZHIFU_STORAGE_KEYS.conversations) || "null");
    if (Array.isArray(raw)) return { byUser: {}, legacy: raw };
    if (raw?.byUser && typeof raw.byUser === "object" && !Array.isArray(raw.byUser)) {
      return { byUser: raw.byUser, legacy: null };
    }
  } catch {
    // 缓存损坏时按空记录处理
  }
  return { byUser: {}, legacy: null };
}

interface ScheduledOwnerRecord {
  accountId: string;
  ownerEnabled: boolean;
}

function readScheduledOwners(): Record<string, ScheduledOwnerRecord> {
  try {
    const raw = JSON.parse(localStorage.getItem(ZHIFU_STORAGE_KEYS.scheduledOwners) || "null");
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
    const owners: Record<string, ScheduledOwnerRecord> = {};
    for (const [id, value] of Object.entries(raw)) {
      if (!id || !value || typeof value !== "object") continue;
      const accountId = String((value as ScheduledOwnerRecord).accountId || "");
      if (!accountId) continue;
      owners[id] = {
        accountId,
        ownerEnabled: Boolean((value as ScheduledOwnerRecord).ownerEnabled),
      };
    }
    return owners;
  } catch {
    return {};
  }
}

function writeScheduledOwners(owners: Record<string, ScheduledOwnerRecord>) {
  localStorage.setItem(ZHIFU_STORAGE_KEYS.scheduledOwners, JSON.stringify(owners));
}

/** 本机记录还没有主人时，用会话补一次。多个账号都有时，以最早的那条为准 */
function readConversationTaskOwners() {
  const found: Record<string, { accountId: string; createdAt: number }> = {};
  for (const [accountId, list] of Object.entries(readConversationArchive().byUser)) {
    if (!Array.isArray(list)) continue;
    for (const conversation of list) {
      const taskId = conversation.scheduledTaskId;
      if (!taskId) continue;
      const createdAt = Number(conversation.createdAt) || Number.POSITIVE_INFINITY;
      const current = found[taskId];
      if (!current || createdAt < current.createdAt) found[taskId] = { accountId, createdAt };
    }
  }
  let stored: Record<string, string> = {};
  try {
    const parsed = JSON.parse(localStorage.getItem("localflow.conversation-task-owners") || "{}");
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) stored = parsed;
  } catch {
    /* Auxiliary metadata only. */
  }
  // 已有归属不能被更早的会话盖掉，否则换账号后任务会跟到另一个账号
  for (const [id, item] of Object.entries(found)) {
    if (!stored[id]) stored[id] = item.accountId;
  }
  localStorage.setItem("localflow.conversation-task-owners", JSON.stringify(stored));
  return stored as Record<string, string>;
}

function resolveScheduledOwner(
  taskId: string,
  taskAccountId: string | undefined,
  owners: Record<string, ScheduledOwnerRecord>,
  conversationOwners: Record<string, string>
) {
  return (
    String(owners[taskId]?.accountId || "") ||
    conversationOwners[taskId] ||
    String(taskAccountId || "")
  );
}

const appendAgentText = (message: ChatMessage, value: unknown) => {
  message.content = mergeStreamText(message.content, value);
};

export const formatScheduledDateTime = (timestamp: number) =>
  new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date(timestamp));

interface ViewportHandlers {
  isNearBottom: () => boolean;
  scrollToBottom: () => Promise<void> | void;
}

/** 聊天页未挂载时视为会话不可见 */
const hiddenViewport: ViewportHandlers = {
  isNearBottom: () => false,
  scrollToBottom: () => {},
};

export const useZhifuAgentStore = defineStore("zhifuAgent", () => {
  /* ---------------- 设置 ---------------- */
  const settings = reactive<AgentSettings>(createDefaultSettings());
  const messageChannelSettings = reactive<MessageChannelSettings>(
    createDefaultMessageChannelSettings()
  );
  const feishuConnection = reactive<ZhifuImStatus>({ state: "disconnected", message: "" });
  const wechatConnection = reactive<ZhifuImStatus>({ state: "disconnected", message: "" });
  const wecomConnection = reactive<ZhifuImStatus>({ state: "disconnected", message: "" });
  const workspace = ref(localStorage.getItem(ZHIFU_STORAGE_KEYS.workspace) || "");
  const workspaceSetupOpen = ref(false);
  const workspaceSetupBusy = ref(false);
  const workspaceSetupError = ref("");
  const workspaceName = computed(() =>
    workspace.value ? workspace.value.split(/[\\/]/).filter(Boolean).at(-1) || "" : ""
  );
  const activePage = ref<ZhifuAgentPage>("chat");
  const settingsTab = ref<ZhifuAgentSettingsTab>("general");
  /** 递增后由侧栏打开套餐充值弹窗 */
  const planBuySignal = ref(0);
  /** 递增后由侧栏打开试用领取弹窗 */
  const benefitClaimSignal = ref(0);
  /** 仅在点击「配置自定义模型」时为 true，模型页消费后立即清掉 */
  const importModelRequested = ref(false);

  function openPage(page: ZhifuAgentPage, tab?: ZhifuAgentSettingsTab) {
    activePage.value = page;
    if (page === "settings" && tab) settingsTab.value = tab;
  }

  function requestPlanBuy() {
    planBuySignal.value += 1;
  }

  function requestBenefitClaim() {
    benefitClaimSignal.value += 1;
  }

  function requestImportModel() {
    importModelRequested.value = true;
    openPage("model");
  }

  function consumeImportModelRequest() {
    if (!importModelRequested.value) return false;
    importModelRequested.value = false;
    return true;
  }

  /* ---------------- 会话 ---------------- */
  let conversationOwnerId = currentAccountId();
  const saved: Conversation[] = [];
  const conversationStorageReady = ref(false);
  const conversationDatabasePath = ref("");
  const conversationStorageBusy = ref(false);
  const conversationStorageError = ref("");
  const conversationStorageSpace = ref<{ freeBytes: number | null; lowSpace: boolean }>({
    freeBytes: null,
    lowSpace: false,
  });
  async function refreshConversationStorage() {
    const info = await zhifuConversationStorageInfo();
    conversationDatabasePath.value = info.path;
    conversationStorageSpace.value = info;
    return info;
  }
  async function retryConversationSave() {
    if (conversationStorageBusy.value || !conversationOwnerId)
      throw new Error("请等待当前操作结束");
    conversationStorageBusy.value = true;
    try {
      await conversationWriteQueue.catch(() => {});
      conversationWriteQueue = Promise.resolve();
      conversationStorageReady.value = true;
      await flushPersist();
      conversationStorageError.value = "";
      if (error.value.startsWith("会话记录保存失败")) error.value = "";
      await refreshConversationStorage().catch(() => {});
    } finally {
      conversationStorageBusy.value = false;
    }
  }
  async function moveConversationStorage() {
    if (conversationStorageBusy.value || anyRunning.value)
      throw new Error("请等待当前任务结束后再转移");
    conversationStorageBusy.value = true;
    const wasReady = conversationStorageReady.value;
    const initialLoadFailed = !wasReady && !conversationStorageError.value;
    try {
      await flushPersist().catch(() => {});
      conversationStorageReady.value = false;
      const result = await zhifuMoveConversationStorage();
      if (!result) {
        conversationStorageReady.value = wasReady;
        return null;
      }
      conversationDatabasePath.value = result.path;
      conversationStorageSpace.value = result;
      conversationWriteQueue = Promise.resolve();
      if (initialLoadFailed) {
        await showAccountConversations(conversationOwnerId);
        return result;
      }
      conversationStorageReady.value = true;
      await flushPersist();
      conversationStorageError.value = "";
      if (error.value.startsWith("会话记录保存失败")) error.value = "";
      return result;
    } catch (cause) {
      conversationStorageReady.value = wasReady && !conversationStorageError.value;
      throw cause;
    } finally {
      conversationStorageBusy.value = false;
    }
  }
  const conversationRevisions: Record<string, number> = {};
  let conversationWriteQueue: Promise<void> = Promise.resolve();
  let conversationLoadGeneration = 0;
  const mainConversation = ensureMainConversation(saved);
  const conversations = ref<Conversation[]>(saved);
  const activeId = ref(mainConversation.id);
  const activeConversation = computed(
    () => conversations.value.find((item) => item.id === activeId.value) || conversations.value[0]
  );
  const newMessagesBelow = ref(0);
  const error = ref("");
  watch(
    activeId,
    () => {
      error.value = "";
    },
    { flush: "sync" }
  );
  let viewport: ViewportHandlers = hiddenViewport;

  /* ---------------- Agent 运行 ---------------- */
  const mode = ref<ZhifuAgentMode>(
    (localStorage.getItem(ZHIFU_STORAGE_KEYS.mode) as ZhifuAgentMode) || "yolo"
  );
  const conversationRuns = reactive<Record<string, ConversationRun>>({});
  const conversationQueue = markRaw(new ExecutionQueue());
  const running = computed(() => Boolean(conversationRuns[activeId.value]));
  const anyRunning = computed(() => Object.keys(conversationRuns).length > 0);
  const activeToolCount = computed(() => conversationRuns[activeId.value]?.toolCount || 0);
  const clock = ref(Date.now());
  const sessionPermissions = reactive<Record<string, string[]>>({});
  const approval = ref<(ZhifuApprovalRequest & { conversationId: string }) | null>(null);
  const pendingApprovals = reactive<(ZhifuApprovalRequest & { conversationId: string })[]>([]);
  function hasPendingApproval(id: string) {
    return (
      approval.value?.conversationId === id ||
      pendingApprovals.some((item) => item.conversationId === id)
    );
  }
  const backgroundApprovalConversations = computed(() =>
    conversations.value.filter((item) => item.id !== activeId.value && hasPendingApproval(item.id))
  );
  function focusConversationApproval(id: string) {
    if (approval.value?.conversationId === id) return;
    if (approval.value) pendingApprovals.unshift(approval.value);
    const index = pendingApprovals.findIndex((item) => item.conversationId === id);
    approval.value = index >= 0 ? pendingApprovals.splice(index, 1)[0] : null;
  }
  function advanceApproval() {
    const previous = approval.value?.conversationId;
    approval.value = null;
    focusConversationApproval(activeId.value);
    const conversation = conversations.value.find((item) => item.id === previous);
    if (conversation?.notificationType === "approval" && !hasPendingApproval(conversation.id))
      conversation.notificationType = "";
  }
  function clearConversationApprovals(id: string, taskRunId?: string, toolName?: string) {
    const matches = (item: ZhifuApprovalRequest & { conversationId: string }) =>
      item.conversationId === id &&
      (!toolName || item.toolName === toolName) &&
      (!taskRunId ||
        (item.runId === taskRunId && !item.force && item.toolName !== "browser_wait_user"));
    for (let index = pendingApprovals.length - 1; index >= 0; index--) {
      if (matches(pendingApprovals[index])) pendingApprovals.splice(index, 1);
    }
    if (approval.value && matches(approval.value)) advanceApproval();
    const conversation = conversations.value.find((item) => item.id === id);
    if (conversation?.notificationType === "approval" && !hasPendingApproval(id))
      conversation.notificationType = "";
  }
  const currentPermissions = computed(() => sessionPermissions[activeConversation.value.id] || []);
  watch(activeId, (id) => focusConversationApproval(id), { flush: "sync" });
  const effectiveMode = computed<ZhifuAgentMode>(() =>
    currentPermissions.value.includes("*") ? "yolo" : mode.value
  );

  /* ---------------- 定时任务 ---------------- */
  const scheduledTasks = ref<ScheduledTask[]>([]);
  const unreadScheduledCount = computed(
    () =>
      scheduledTasks.value.filter(
        (task) => task.unread && sameWorkspace(task.workspace, workspace.value)
      ).length
  );

  /* ---------------- 技能 ---------------- */
  const localSkills = ref<ZhifuLocalSkill[]>([]);
  const pendingSkill = ref<{ id: string | number; name: string; scope: ZhifuSkillScope } | null>(
    null
  );
  const pendingPrompt = ref("");
  const pendingSend = ref<{
    text: string;
    skills: SelectedSkill[];
    shops: {
      id: string | number;
      name: string;
      platform?: string;
      account?: string;
      logo?: string;
    }[];
    autoSend?: boolean;
  } | null>(null);
  const pendingSkillDraft = ref<SkillCreatorPrefill | null>(null);
  const pendingSkillEdit = ref<{ id: string | number; scope: ZhifuSkillScope } | null>(null);
  const pendingScheduledDraft = ref<Partial<ScheduledTask> | null>(null);
  const skillsBusy = ref(false);
  const skillStoreCatalog = ref<SkillStoreItem[]>([]);
  const boundStoreSkills = ref<SkillStoreItem[]>([]);
  const installedStoreSkills = computed(() => boundStoreSkills.value.map((item) => item.id));

  const findStoreSkill = (name: string) =>
    [...boundStoreSkills.value, ...skillStoreCatalog.value].find(
      (item) => skillIdentity(item.name) === skillIdentity(name)
    );

  /** 本地内容为准，商店记录仅补充分类。 */
  const decorateLocalSkill = (skill: ZhifuLocalSkill): DisplaySkill => {
    const storeSkill = findStoreSkill(skill.name);
    return storeSkill
      ? {
          ...skill,
          category_id: storeSkill.category_id,
          category_name: storeSkill.category_name,
          sub_category_id: storeSkill.sub_category_id,
          sub_category_name: storeSkill.sub_category_name,
        }
      : { ...skill };
  };

  const skillsByScope = (scope: ZhifuSkillScope) => {
    return localSkills.value.filter((skill) => skill.scope === scope).map(decorateLocalSkill);
  };

  /** 与「我的技能」一致：只列出当前工作区已安装、已启用且有效的技能。 */
  const selectableSkills = computed<DisplaySkill[]>(() =>
    buildSelectableSkills(
      localSkills.value.filter((skill) => skill.scope === "workspace").map(decorateLocalSkill)
    )
  );

  const totalUnreadCount = computed(() =>
    conversations.value.reduce((total, item) => total + (item.unreadCount || 0), 0)
  );

  /* ================= 会话操作 ================= */

  const conversationHasMore = ref(false);
  const conversationPageLoading = ref(false);
  const conversationFilter = ref<"all" | "ordinary" | "skill" | "scheduled">("all");
  let filterGeneration = 0;
  async function setConversationFilter(kind: "all" | "ordinary" | "skill" | "scheduled") {
    if (!["all", "ordinary", "skill", "scheduled"].includes(kind)) return;
    conversationFilter.value = kind;
    const generation = ++filterGeneration;
    const owner = conversationOwnerId;
    conversationPageLoading.value = true;
    conversationHasMore.value = false;
    try {
      await flushPersist();
      const loaded = await zhifuLoadConversations({ accountId: owner, page: 0, kind });
      if (owner !== conversationOwnerId || generation !== filterGeneration) return;
      for (const item of loaded.conversations)
        if (
          !deletedConversationIds.has(item.id) &&
          !conversations.value.some((c) => c.id === item.id)
        )
          conversations.value.push(item);
      conversationPage = 0;
      conversationHasMore.value = loaded.hasMore ?? 30 < (loaded.total || 0);
    } catch (cause) {
      if (generation === filterGeneration) error.value = "会话筛选失败：" + errorMessage(cause);
    } finally {
      if (generation === filterGeneration) conversationPageLoading.value = false;
    }
  }
  let conversationPage = 0;
  const deletedConversationIds = new Set<string>();
  let selectionGeneration = 0;
  async function hydrateConversation(conversation: Conversation, owner = conversationOwnerId) {
    if (!conversation._summary) return;
    const loaded = await zhifuLoadConversations({
      accountId: owner,
      conversationId: conversation.id,
    });
    if (owner !== conversationOwnerId) return;
    const detail = loaded.conversations[0];
    if (!detail) throw new Error("会话已被删除，请重新打开页面");
    Object.assign(conversation, normalizeSavedConversations([detail])[0], { _summary: false });
  }
  async function loadMoreConversations() {
    if (conversationPageLoading.value || !conversationHasMore.value) return;
    const owner = conversationOwnerId;
    const generation = conversationLoadGeneration;
    const filterRequest = filterGeneration;
    conversationPageLoading.value = true;
    try {
      const loaded = await zhifuLoadConversations({
        accountId: owner,
        page: conversationPage + 1,
        kind: conversationFilter.value,
        excludeIds: [...conversations.value.map((c) => c.id), ...deletedConversationIds],
      });
      if (
        owner !== conversationOwnerId ||
        generation !== conversationLoadGeneration ||
        filterRequest !== filterGeneration
      )
        return;
      conversationPage++;
      for (const item of loaded.conversations)
        if (
          !deletedConversationIds.has(item.id) &&
          !conversations.value.some((c) => c.id === item.id)
        )
          conversations.value.push(item);
      conversationHasMore.value =
        loaded.hasMore ?? (conversationPage + 1) * 30 < (loaded.total || 0);
    } catch (cause) {
      error.value = "会话列表加载失败：" + errorMessage(cause);
    } finally {
      if (filterRequest === filterGeneration) conversationPageLoading.value = false;
    }
  }
  let persistTimer: number | null = null;

  function flushPersist() {
    if (persistTimer !== null) {
      window.clearTimeout(persistTimer);
      persistTimer = null;
    }
    try {
      if (conversationOwnerId && conversationStorageReady.value) {
        const accountId = conversationOwnerId;
        const snapshot = JSON.parse(JSON.stringify(conversations.value));
        const deletedIds = [...deletedConversationIds];
        conversationWriteQueue = conversationWriteQueue
          .then(async () => {
            const result = await zhifuSaveConversations({
              accountId,
              conversations: snapshot,
              partial: true,
              deletedIds,
              expectedRevision: conversationRevisions[accountId] || 0,
            });
            conversationRevisions[accountId] = result.revision;
            if (result.storage) conversationStorageSpace.value = result.storage;
          })
          .catch((cause) => {
            if (conversationOwnerId === accountId) {
              conversationStorageReady.value = false;
              conversationStorageError.value = errorMessage(cause);
              void refreshConversationStorage().catch(() => {});
              error.value =
                "会话记录保存失败，当前内容仍保留在页面，请勿关闭。" + errorMessage(cause);
            }
            throw cause;
          });
        void conversationWriteQueue.catch(() => {});
      }
      localStorage.setItem(ZHIFU_STORAGE_KEYS.workspace, workspace.value);
    } catch {
      error.value = t("zhifuAgent.chat.persistFailed");
    }
    return conversationWriteQueue;
  }

  let messageChannelOwnerId = currentAccountId();
  let messageChannelLoadGen = 0;

  async function showAccountConversations(uid: string) {
    const generation = ++conversationLoadGeneration;
    ++filterGeneration;
    conversationFilter.value = "all";
    conversationPageLoading.value = false;
    conversationStorageReady.value = false;
    const next: Conversation[] = [];
    const main = ensureMainConversation(next);
    conversations.value = next;
    activeId.value = main.id;
    newMessagesBelow.value = 0;
    approval.value = null;
    pendingApprovals.length = 0;
    if (!uid) return;
    try {
      await conversationWriteQueue;
      void refreshConversationStorage().catch(() => {});
      // Preserve schedule ownership metadata before importing chat bodies into SQLite.
      readConversationTaskOwners();
      const archive = readConversationArchive();
      for (const [accountId, legacy] of Object.entries(archive.byUser)) {
        if (!Array.isArray(legacy)) continue;
        const migrated = await zhifuLoadConversations({
          accountId,
          sourceId: location.origin,
          legacy,
        });
        if (
          !migrated.legacyImported ||
          !legacy.every((item) => migrated.conversations.some((saved) => saved.id === item.id))
        )
          throw new Error("会话转移校验失败，原缓存已保留");
        delete archive.byUser[accountId];
        if (Object.keys(archive.byUser).length)
          localStorage.setItem(
            ZHIFU_STORAGE_KEYS.conversations,
            JSON.stringify({ byUser: archive.byUser })
          );
        else localStorage.removeItem(ZHIFU_STORAGE_KEYS.conversations);
      }
      const loaded = await zhifuLoadConversations({ accountId: uid, page: 0 });
      if (generation !== conversationLoadGeneration || uid !== conversationOwnerId) return;
      conversationRevisions[uid] = loaded.revision;
      conversationDatabasePath.value = loaded.path;
      void refreshConversationStorage().catch(() => {});
      conversationPage = 0;
      deletedConversationIds.clear();
      conversationHasMore.value = 30 < (loaded.total || 0);
      const records = normalizeSavedConversations([
        ...new Map(
          [...loaded.conversations, ...(loaded.related || [])].map((c) => [c.id, c])
        ).values(),
      ]);
      conversations.value = records;
      // Hydrate the reactive instance so the timeline observes loaded messages.
      const main = ensureMainConversation(conversations.value);
      activeId.value = main.id;
      await hydrateConversation(main, uid);
      if (generation !== conversationLoadGeneration || uid !== conversationOwnerId) return;
      conversationStorageReady.value = true;
      persist();
      // 会话里还记着定时任务时，补回被换账号冲掉的归属
      if (uid) loadScheduledTasks().catch(() => {});
    } catch (cause) {
      if (generation === conversationLoadGeneration)
        error.value = "会话记录加载失败，原数据已保留。" + errorMessage(cause);
    }
  }

  watch(
    () => currentAccountId(),
    (uid) => {
      if (uid) bindModelKeyToAccount(uid);
      if (uid !== conversationOwnerId) {
        for (const [id, run] of Object.entries(conversationRuns)) {
          run.controller.abort();
          void zhifuStopAgent(id).catch(() => {});
          const chat = conversations.value.find((item) => item.id === id);
          for (const message of chat?.messages || [])
            if (message.streaming) {
              message.streaming = false;
              message.executionStatus = "cancelled";
              message.completedAt ||= Date.now();
            }
          delete conversationRuns[id];
        }
        flushPersist();
        for (const id of Object.keys(sessionPermissions)) delete sessionPermissions[id];
        conversationOwnerId = uid;
        void showAccountConversations(uid);
        scheduledTasks.value = [];
        if (uid) persist();
        // 退出瞬间账号是空的，这时重写任务文件会把归属清掉
        if (uid) loadScheduledTasks().catch(() => {});
      }
      if (uid === messageChannelOwnerId) return;
      resetImConnections();
      messageChannelSettings.channelConfigList =
        createDefaultMessageChannelSettings().channelConfigList;
      loadMessageChannelSettings()
        .then(async (fresh) => {
          if (!fresh || currentAccountId() !== uid) return;
          return syncElectronSettings();
        })
        .catch(() => {});
    }
  );

  function persist() {
    if (persistTimer !== null) return;
    persistTimer = window.setTimeout(flushPersist, 500);
  }

  async function exportConversationBackup() {
    if (!conversationOwnerId) throw new Error("请先登录账号");
    const owner = conversationOwnerId;
    await flushPersist().catch(() => {});
    if (owner !== conversationOwnerId) throw new Error("账号已切换，请重新导出");
    return zhifuExportConversations({
      accountId: conversationOwnerId,
      conversations: JSON.parse(JSON.stringify(conversations.value)),
    });
  }
  async function importConversationBackup() {
    if (!conversationStorageReady.value || anyRunning.value)
      throw new Error("请等待会话加载和当前任务结束后再导入");
    const owner = conversationOwnerId;
    await flushPersist();
    const result = await zhifuImportConversations({ accountId: owner });
    if (result && owner === conversationOwnerId) await showAccountConversations(owner);
    return result;
  }

  persist();

  function registerViewport(handlers: ViewportHandlers) {
    viewport = handlers;
    return () => {
      if (viewport === handlers) viewport = hiddenViewport;
    };
  }

  const isNearBottom = () => viewport.isNearBottom();
  const scrollToBottom = () => viewport.scrollToBottom();

  function readScheduledMarks(): Record<string, number> {
    try {
      const raw = JSON.parse(localStorage.getItem(ZHIFU_STORAGE_KEYS.scheduledRead) || "{}");
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
      return raw;
    } catch {
      return {};
    }
  }

  function scheduledReadStamp(task: ScheduledTask) {
    return Number(task.lastRunAt) || 0;
  }

  /** 同一条执行结果刷新后仍保持已读，新的执行时间会重新未读 */
  function applyScheduledReadMarks(tasks: ScheduledTask[]) {
    const marks = readScheduledMarks();
    for (const task of tasks) {
      if (task.id && task.unread && Number(marks[task.id]) === scheduledReadStamp(task)) {
        task.unread = false;
      }
    }
  }

  function markScheduledTaskReadLocal(task: ScheduledTask) {
    if (!task.id) return;
    task.unread = false;
    const marks = readScheduledMarks();
    marks[task.id] = scheduledReadStamp(task);
    localStorage.setItem(ZHIFU_STORAGE_KEYS.scheduledRead, JSON.stringify(marks));
  }

  function markScheduledConversationRead(conversation?: Conversation) {
    if (!conversation?.scheduledTaskId) return;
    const task = scheduledTasks.value.find((item) => item.id === conversation.scheduledTaskId);
    if (!task?.unread) return;
    markScheduledTaskReadLocal(task);
  }

  function markActiveConversationRead() {
    const conversation = activeConversation.value;
    if (!conversation) return;
    if (conversation.unreadCount) {
      conversation.unreadCount = 0;
      conversation.notificationType = hasPendingApproval(conversation.id) ? "approval" : "";
      newMessagesBelow.value = 0;
    }
    markScheduledConversationRead(conversation);
    persist();
  }

  function addConversation() {
    if (!conversationStorageReady.value) return activeConversation.value;
    const item = createConversation();
    conversations.value.unshift(item);
    ensureMainConversation(conversations.value);
    activeId.value = item.id;
    persist();
    return item;
  }

  function forkSkillTrial(skill: { id: string | number; name: string; scope: ZhifuSkillScope }) {
    if (!conversationStorageReady.value) return activeConversation.value;
    const item: Conversation = {
      ...createConversation(),
      title: t("zhifuAgent.chat.skillTrialTitle", { name: skill.name }),
      autoTitle: false,
      skillTrial: {
        skill: { id: skill.id, name: skill.name, scope: skill.scope || "workspace" },
      },
    };
    conversations.value.unshift(item);
    ensureMainConversation(conversations.value);
    activeId.value = item.id;
    persist();
    return item;
  }

  function startSkillTrial(
    skill: { id: string | number; name: string; scope: ZhifuSkillScope },
    shops: {
      id: string | number;
      name: string;
      platform?: string;
      account?: string;
      logo?: string;
    }[],
    request: string
  ) {
    forkSkillTrial(skill);
    openPage("chat");
    pendingSend.value = {
      text: request.trim(),
      skills: [{ id: skill.id, name: skill.name, scope: skill.scope || "workspace" }],
      shops: shops.map((shop) => ({ ...shop })),
      autoSend: false,
    };
  }

  async function selectConversation(id: string) {
    const generation = ++selectionGeneration;
    const target = conversations.value.find((item) => item.id === id);
    if (!target) return;
    try {
      await flushPersist();
      await hydrateConversation(target);
    } catch (cause) {
      error.value = errorMessage(cause);
      return;
    }
    if (generation !== selectionGeneration || !conversations.value.includes(target)) return;
    activeId.value = id;
    const conversation = conversations.value.find((item) => item.id === id);
    if (conversation) {
      conversation.unreadCount = 0;
      conversation.notificationType = hasPendingApproval(id) ? "approval" : "";
      markScheduledConversationRead(conversation);
    }
    newMessagesBelow.value = 0;
    persist();
    await scrollToBottom();
  }

  function renameConversation(conversation: Conversation, title: string) {
    if (conversation.isMainConversation) return;
    conversation.title = title.trim() || t("zhifuAgent.chat.newTask");
    conversation.autoTitle = !title.trim();
    persist();
  }

  /** 返回 false 表示当前会话正在运行或是主会话，不能删除 */
  function deleteConversation(conversation: Conversation) {
    if (!conversationStorageReady.value) return false;
    if (conversation.isMainConversation || conversationRuns[conversation.id]) return false;
    const index = conversations.value.findIndex((item) => item.id === conversation.id);
    if (index < 0) return true;
    zhifuCloseConversationBrowser({
      workspace: workspace.value,
      conversationId: conversation.id,
    }).catch((cause) => {
      error.value = errorMessage(cause);
    });
    const removingMain = conversation.isMainConversation;
    deletedConversationIds.add(conversation.id);
    conversations.value.splice(index, 1);
    delete sessionPermissions[conversation.id];
    if (removingMain || !conversations.value.some((item) => item.isMainConversation)) {
      const main = ensureMainConversation(conversations.value);
      if (activeId.value === conversation.id) activeId.value = main.id;
    } else if (!conversations.value.length) {
      conversations.value.push(createConversation());
    }
    if (activeId.value === conversation.id) {
      void selectConversation(
        conversations.value[Math.min(index, conversations.value.length - 1)].id
      );
    }
    persist();
    return true;
  }

  function currentAssistant(conversation: Conversation = activeConversation.value) {
    const list = conversation.messages;
    const last = list[list.length - 1];
    if (last?.role === "assistant" && last.streaming) return last;
    const message: ChatMessage = {
      id: newId(),
      role: "assistant",
      content: "",
      streaming: true,
      createdAt: Date.now(),
    };
    list.push(message);
    return list[list.length - 1];
  }

  const conversationForAgent = (event: { conversationId?: string; sessionId?: string }) =>
    conversations.value.find((item) =>
      event.conversationId
        ? item.id === event.conversationId
        : event.sessionId && conversationRuns[item.id]?.sessionId === event.sessionId
    );

  function notifyConversation(conversation: Conversation, type: NotificationType = "agent") {
    conversation.lastMessageAt = Date.now();
    conversation.notificationType = type;
    const isActive = conversation.id === activeId.value;
    const visibleAtBottom = isActive && document.hasFocus() && isNearBottom();
    if (type === "scheduled" && visibleAtBottom) markScheduledConversationRead(conversation);
    if (!visibleAtBottom) {
      conversation.unreadCount = (conversation.unreadCount || 0) + 1;
      if (isActive) newMessagesBelow.value = conversation.unreadCount;
    }
    if (!isActive) {
      const index = conversations.value.findIndex((item) => item.id === conversation.id);
      if (index > 0) conversations.value.unshift(...conversations.value.splice(index, 1));
      ensureMainConversation(conversations.value);
    }
    if (!document.hasFocus() && "Notification" in window && Notification.permission !== "denied") {
      const bodyKey = {
        error: "notifyError",
        approval: "notifyApproval",
        scheduled: "notifyScheduled",
        cancelled: "notifyCancelled",
      }[type as string];
      try {
        const notification = new Notification(conversation.title, {
          body: t(`zhifuAgent.chat.${bodyKey || "notifyAgent"}`),
        });
        notification.onclick = () => {
          window.focus();
          openPage("chat");
          if (router.currentRoute.value.path !== "/zhifuAgent") router.push("/zhifuAgent");
          selectConversation(conversation.id);
          notification.close();
        };
      } catch {
        // 系统通知不可用时仍保留应用内未读状态
      }
    }
    persist();
  }

  async function handleImMessage(event: ZhifuImMessage) {
    if (!["feishu", "wechat", "wecom"].includes(event.provider) || !event.conversationId) return;
    let conversation = conversations.value.find((item) => item.id === event.conversationId);
    const owner = conversationOwnerId;
    try {
      if (!conversation) {
        const loaded = await zhifuLoadConversations({
          accountId: owner,
          conversationId: event.conversationId,
        });
        if (owner !== conversationOwnerId) return;
        if (loaded.conversations[0]) {
          conversation = normalizeSavedConversations(loaded.conversations)[0];
          conversations.value.push(conversation);
        }
      }
      if (conversation?._summary) {
        await flushPersist();
        await hydrateConversation(conversation, owner);
      }
      if (owner !== conversationOwnerId) return;
    } catch (cause) {
      error.value = "消息会话加载失败：" + errorMessage(cause);
      return;
    }

    if (!conversation) {
      conversations.value.unshift({
        ...createConversation(),
        id: event.conversationId,
        autoTitle: false,
        title: event.title || t(`zhifuAgent.chat.${event.provider}Conversation`),
        channel: event.provider,
      });
      conversation = conversations.value[0];
      ensureMainConversation(conversations.value);
    }
    if (event.title) conversation.title = event.title;
    if (conversation.messages.some((item) => item.externalId === event.messageId)) return;
    const createdAt = event.createdAt || Date.now();
    conversation.messages.push({
      id: newId(),
      externalId: event.messageId,
      role: event.phase === "assistant" ? "assistant" : "user",
      content:
        event.phase === "assistant"
          ? collapseRepeatedText(stripThinkingMarkup(event.content))
          : event.content || "",
      createdAt,
      completedAt: event.phase === "assistant" ? createdAt : undefined,
      streaming: false,
      source: event.provider,
    });
    conversation.lastMessageAt = createdAt;
    if (event.phase === "assistant") {
      notifyConversation(conversation, event.status === "error" ? "error" : "agent");
    }
    persist();
    if (conversation.id === activeId.value && isNearBottom()) await scrollToBottom();
  }

  /* ================= 工作区 ================= */

  async function selectWorkspace() {
    const selected = await zhifuSelectWorkspace();
    if (!selected) return "";
    const changed = !sameWorkspace(selected, workspace.value);
    workspace.value = selected;
    persist();
    // 先停掉其他目录的任务，避免设置保存变慢时旧任务仍到点触发
    const tasksReady = changed ? loadScheduledTasks().catch(() => {}) : Promise.resolve();
    await zhifuSetWorkspace(selected);
    workspaceSetupOpen.value = false;
    await saveSettings({ workspace: selected });
    await Promise.all([loadSkills(selected).catch(() => {}), tasksReady]);
    return selected;
  }

  /** 启动时工作区为空，引导用户选择目录。取消选择时保持弹窗 */
  async function setupInitialWorkspace() {
    workspaceSetupBusy.value = true;
    workspaceSetupError.value = "";
    try {
      await selectWorkspace();
    } catch (cause) {
      workspaceSetupError.value =
        (cause as { message?: string })?.message || t("zhifuAgent.settings.workspaceSetupFailed");
    } finally {
      workspaceSetupBusy.value = false;
    }
  }

  /* ================= 设置 ================= */

  function applyProviderMigration() {
    if (settings.providerId === MODEL_PROVIDERS[0].id) return;
    const provider = MODEL_PROVIDERS[0];
    Object.assign(settings, {
      providerId: provider.id,
      providerName: provider.name,
      modelId: provider.model,
      baseUrl: provider.baseUrl,
      apiProtocol: provider.protocol,
      modelSource: "official",
    });
  }

  function resetImConnections() {
    Object.assign(feishuConnection, { state: "disconnected", message: "" });
    Object.assign(wechatConnection, { state: "disconnected", message: "" });
    Object.assign(wecomConnection, { state: "disconnected", message: "" });
  }

  function findMessageChannel(categoryId: MessageChannelCategoryId) {
    return messageChannelSettings.channelConfigList.find((item) => item.categoryId === categoryId)!;
  }

  function normalizeMessageChannels(items: unknown): MessageChannelConfig[] {
    const defaults = createDefaultMessageChannelSettings().channelConfigList;
    if (!Array.isArray(items)) return defaults;
    return defaults.map((fallback) => {
      const current = items.find(
        (item: any) => Number(item?.categoryId) === fallback.categoryId
      ) as Partial<MessageChannelConfig> | undefined;
      return {
        ...fallback,
        ...current,
        categoryId: fallback.categoryId,
        appId: String(current?.appId || ""),
        appSecret: "",
        hasAppSecret: Boolean(current?.hasAppSecret),
        enabled: Boolean(current?.enabled),
      };
    });
  }

  function legacyMessageChannels(fallback?: Record<string, any>): MessageChannelConfig[] {
    return normalizeMessageChannels([
      {
        categoryId: 1,
        appId: fallback?.feishuAppId,
        hasAppSecret: fallback?.hasFeishuAppSecret,
        enabled: fallback?.feishuEnabled,
      },
      {
        categoryId: 4,
        appId: fallback?.wechatAppId,
        hasAppSecret: fallback?.hasWechatAppSecret,
        enabled: fallback?.wechatEnabled,
        baseurl: fallback?.wechatBaseUrl,
        ilink_user_id: fallback?.wechatIlinkUserId,
      },
      {
        categoryId: 5,
        appId: fallback?.wecomAppId || fallback?.weComBotId,
        hasAppSecret: fallback?.hasWecomAppSecret || fallback?.hasWeComSecret,
        enabled: fallback?.wecomEnabled ?? fallback?.weComEnabled,
      },
    ]);
  }

  function messageChannelsForElectron(channels = messageChannelSettings.channelConfigList) {
    const feishu = channels.find((item) => item.categoryId === 1);
    const wechat = channels.find((item) => item.categoryId === 4);
    const wecom = channels.find((item) => item.categoryId === 5);
    return {
      feishuAppId: feishu?.appId || "",
      feishuAppSecret: feishu?.appSecret || "",
      hasFeishuAppSecret: Boolean(feishu?.hasAppSecret),
      feishuEnabled: Boolean(feishu?.enabled),
      wechatAppId: wechat?.appId || "",
      wechatAppSecret: wechat?.appSecret || "",
      hasWechatAppSecret: Boolean(wechat?.hasAppSecret),
      wechatEnabled: Boolean(wechat?.enabled),
      wechatBaseUrl: wechat?.baseurl || "",
      wechatIlinkUserId: wechat?.ilink_user_id || "",
      weComBotId: wecom?.appId || "",
      weComSecret: wecom?.appSecret || "",
      hasWeComSecret: Boolean(wecom?.hasAppSecret || wecom?.appSecret),
      weComEnabled: Boolean(wecom?.enabled),
    };
  }

  /**
   * 客户端按「先读整份设置、再整份写回」保存。两次同时写时，后写回的那次可能把刚存上的密钥盖掉。
   * 所以所有写设置都排成一队。
   */
  let electronSettingsChain: Promise<unknown> = Promise.resolve();
  /** 本轮已经把当前账号的密钥写进客户端。空字符串表示还没写成功 */
  let keyReadyUid = "";

  function writeElectronSettings(payload: Record<string, any> | (() => Record<string, any>)) {
    const run = electronSettingsChain.then(() =>
      zhifuSaveSettings(typeof payload === "function" ? payload() : payload)
    );
    electronSettingsChain = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  function whenSettingsWritten() {
    return electronSettingsChain.then(() => undefined);
  }

  /**
   * 只把消息通道写给客户端。模型名称和地址在真正写入时再读，避免用切换前的模型盖掉刚选中的模型。
   * 不带 API Key。客户端会整份保存，缺了模型字段会把模型清空，所以仍带上当前模型。
   */
  const syncElectronSettings = async (channels = messageChannelSettings.channelConfigList) => {
    const uid = currentAccountId();
    await modelKeyChain;
    if (!uid || currentAccountId() !== uid) return;
    return writeElectronSettings(() => {
      const modelSource = normalizeModelSource(settings.modelSource, settings.baseUrl);
      const next: Record<string, any> = {
        ...settings,
        modelSource,
        ...messageChannelsForElectron(channels),
      };
      delete next.apiKey;
      delete next.hasApiKey;
      delete next.clearApiKey;
      return next;
    });
  };

  function loadSettings(fallback?: Record<string, any>) {
    const source = { ...(fallback || {}) };
    const localHasApiKey = Boolean(fallback?.hasApiKey || String(fallback?.apiKey || "").trim());
    for (const key of ["workspace", "userName", "agentName"] as const) {
      const value = String(fallback?.[key] || "").trim();
      if (value) source[key] = value;
      else delete source[key];
    }
    if (!String(source.agentName || "").trim() || source.agentName === "盘古") {
      source.agentName = DEFAULT_AGENT_NAME;
    }
    source.shopConcurrency = normalizeShopConcurrency(fallback?.shopConcurrency);
    source.conversationConcurrency = normalizeShopConcurrency(fallback?.conversationConcurrency);
    source.executionTimeoutMinutes = normalizeExecutionTimeout(fallback?.executionTimeoutMinutes);
    source.hasApiKey = localHasApiKey;
    const apiKey = String(fallback?.apiKey || "").trim();
    for (const key of [
      "feishuAppId",
      "feishuAppSecret",
      "hasFeishuAppSecret",
      "feishuEnabled",
      "wechatAppId",
      "wechatAppSecret",
      "hasWechatAppSecret",
      "wechatEnabled",
      "wechatBaseUrl",
      "wechatIlinkUserId",
      "wecomAppId",
      "wecomAppSecret",
      "hasWecomAppSecret",
      "wecomEnabled",
    ]) {
      delete source[key];
    }
    delete source.headers;
    source.modelSource = normalizeModelSource(source.modelSource, source.baseUrl);
    Object.assign(settings, source, { apiKey, clearApiKey: false });
    applyProviderMigration();
  }

  function readSettingsOwner() {
    try {
      return localStorage.getItem(ZHIFU_STORAGE_KEYS.settingsOwner) || "";
    } catch {
      return "";
    }
  }

  function writeSettingsOwner(uid: string) {
    try {
      localStorage.setItem(ZHIFU_STORAGE_KEYS.settingsOwner, uid);
    } catch {
      // 本地存储不可用时，下次进入仍会按账号重新对齐密钥
    }
  }

  /**
   * 本机模型密钥不区分账号。账号变化后写入当前账号的模型网关；没有网关密钥时清空，避免继续用上一账号。
   */
  let modelKeyChain: Promise<void> = Promise.resolve();
  /** 续费或订购后递增，模型下拉据此重新请求 model/user */
  const modelUserRevision = ref(0);

  function bindModelKeyToAccount(uid = currentAccountId()) {
    const run = modelKeyChain.then(() => applyAccountModelKey(uid));
    modelKeyChain = run.catch(() => {});
    return run;
  }

  /** 发消息前确认客户端里真有当前账号的密钥。内存里记着有，文件里可能已经被冲掉 */
  function ensureModelKeySaved() {
    const uid = currentAccountId();
    if (!uid) return Promise.resolve();
    const run = modelKeyChain.then(() => {
      if (keyReadyUid === uid && currentAccountId() === uid) return;
      return applyAccountModelKey(uid, true);
    });
    modelKeyChain = run.catch(() => {});
    return run;
  }

  /** 重新请求 zhifu/model/user，并把网关密钥写回本机。已在用自有模型时不覆盖其密钥和地址 */
  function refreshModelUser() {
    const uid = currentAccountId();
    if (!uid) return Promise.resolve();
    const run = modelKeyChain.then(() => pullModelUser(uid));
    modelKeyChain = run.catch(() => {});
    return run;
  }

  async function pullModelUser(uid: string) {
    if (uid !== currentAccountId()) return;
    let apiKey = "";
    let baseUrl = "";
    try {
      const res: any = await getZhifuModelUser();
      if (currentAccountId() !== uid || res?.errorCode !== 0) return;
      apiKey = String(res?.data?.api_key || "").trim();
      baseUrl = String(res?.data?.api_url || "").trim();
    } catch {
      return;
    }
    modelUserRevision.value += 1;
    if (!apiKey) return;
    const provider = MODEL_PROVIDERS[0];
    const officialBase = gatewayBase(provider.baseUrl);
    const nextBase = gatewayBase(baseUrl);
    const currentBase = gatewayBase(settings.baseUrl);
    const usingGateway =
      !settings.hasApiKey ||
      !currentBase ||
      currentBase === officialBase ||
      currentBase === nextBase;
    if (!usingGateway) return;
    const patch: Partial<AgentSettings> = { apiKey, hasApiKey: true, modelSource: "official" };
    if (!settings.hasApiKey) {
      Object.assign(patch, {
        providerId: provider.id,
        providerName: provider.name,
        modelId: provider.model,
        baseUrl: baseUrl || provider.baseUrl,
        apiProtocol: provider.protocol,
      });
    } else if (nextBase) {
      patch.baseUrl = baseUrl;
    }
    writeSettingsOwner(uid);
    await saveSettings(patch);
  }

  function whenModelKeyBound() {
    return modelKeyChain;
  }

  /** 当前账号能用的系统模型 id。接口失败时返回空，调用方再退回默认模型 */
  async function marketModelIds() {
    try {
      const res: any = await getZhifuMarketModels();
      if (res?.errorCode !== 0) return [] as string[];
      const seen = new Set<string>();
      for (const item of Array.isArray(res?.data) ? res.data : []) {
        const id = String(item?.id || "").trim();
        if (id) seen.add(id);
      }
      return [...seen];
    } catch {
      return [] as string[];
    }
  }

  async function applyAccountModelKey(uid: string, force = false) {
    if (!uid || uid !== currentAccountId()) return;
    const owner = readSettingsOwner();
    const switched = owner !== "" && owner !== uid;
    if (switched) {
      writeSettingsOwner(uid);
      await saveSettings({ apiKey: "", clearApiKey: true });
      if (currentAccountId() !== uid) return;
    } else if (!force && owner === uid && settings.hasApiKey && keyReadyUid === uid) {
      return;
    }
    const provider = MODEL_PROVIDERS[0];
    let apiKey = "";
    let baseUrl = "";
    let modelId = "";
    let modelSource: AgentSettings["modelSource"] = "official";
    let apiProtocol: AgentSettings["apiProtocol"] = provider.protocol;
    // Settings are isolated per account. Resolve the selected personal
    // model against this account's server list before considering the gateway.
    try {
      const imported: any = await queryUserModelImportedApi({ page: 1, limit: 100 });
      if (currentAccountId() !== uid) return;
      const selected = (imported?.data?.modelConfigList || []).find((item: Record<string, any>) =>
        String(item.modelName || "").trim() === settings.modelId &&
        gatewayBase(item.apiUrl) === gatewayBase(settings.baseUrl) && String(item.apiKey || "").trim());
      if (selected) {
        writeSettingsOwner(uid);
        await saveSettings({modelSource:"own",modelId:selected.modelName,apiKey:selected.apiKey,baseUrl:selected.apiUrl,
          apiProtocol:String(selected.apiProtocol).toLowerCase()==="responses"?"responses":"chat",hasApiKey:true});
        keyReadyUid = uid;
        return;
      }
    } catch {
      if (settings.hasApiKey) return;
    }
    try {
      const res: any = await getZhifuModelUser();
      if (currentAccountId() !== uid) return;
      if (res?.errorCode === 0) {
        apiKey = String(res?.data?.api_key || "").trim();
        baseUrl = String(res?.data?.api_url || "").trim();
      }
    } catch {
      // 网关账号暂时拿不到时，继续查找自有模型，避免误提示去配置密钥
    }
    if (!apiKey) {
      try {
        const imported: any = await queryUserModelImportedApi({ page: 1, limit: 100 });
        if (currentAccountId() !== uid) return;
        const own = (imported?.data?.modelConfigList || []).find(
          (item: Record<string, any>) => String(item?.apiKey || "").trim() && String(item?.modelName || "").trim()
        );
        if (own) {
          modelSource = "own";
          apiKey = String(own.apiKey).trim();
          baseUrl = String(own.apiUrl || "").trim();
          modelId = String(own.modelName).trim();
          apiProtocol =
            String(own.apiProtocol || "").toLowerCase() === "responses" ? "responses" : "chat";
        }
      } catch {
        return;
      }
    } else {
      // 当前模型不在新账号的列表里时，才改选第一个可用模型
      const listed = await marketModelIds();
      if (currentAccountId() !== uid) return;
      const current = String(settings.modelId || "").trim();
      // 选中项已被清空时，不要自动补第一个，等用户自己选
      if (current && listed.length && !listed.includes(current)) {
        modelId = listed[0];
      }
    }
    if (currentAccountId() !== uid) return;
    if (!apiKey) {
      // 不记成「已确认」。下次发消息会再查，避免接口失败或稍后导入模型后一直提示没密钥
      if (owner === uid) return;
      writeSettingsOwner(uid);
      await saveSettings({ apiKey: "", clearApiKey: true });
      return;
    }
    const officialBase = gatewayBase(provider.baseUrl);
    const nextBase = gatewayBase(baseUrl);
    const currentBase = gatewayBase(settings.baseUrl);
    const resetModel =
      Boolean(modelId) ||
      Boolean(nextBase && currentBase !== nextBase && currentBase !== officialBase);
    const patch: Partial<AgentSettings> = { apiKey, hasApiKey: true, modelSource };
    if (resetModel) {
      Object.assign(patch, {
        providerId: provider.id,
        providerName: provider.name,
        modelId: modelId || provider.model,
        baseUrl: baseUrl || provider.baseUrl,
        apiProtocol: modelId ? apiProtocol : provider.protocol,
      });
    } else if (nextBase) {
      patch.baseUrl = baseUrl;
    }
    if (currentAccountId() !== uid) return;
    writeSettingsOwner(uid);
    await saveSettings(patch);
    keyReadyUid = uid;
  }

  /** 设置只写客户端本地存储。密钥只有本次修改时才写入，避免把接口密钥清掉 */
  async function saveSettings(patch: Partial<AgentSettings> = {}) {
    const payload: AgentSettings = {
      ...settings,
      ...patch,
      shopConcurrency: normalizeShopConcurrency(patch.shopConcurrency ?? settings.shopConcurrency),
      conversationConcurrency: normalizeShopConcurrency(
        patch.conversationConcurrency ?? settings.conversationConcurrency
      ),
      executionTimeoutMinutes: normalizeExecutionTimeout(
        patch.executionTimeoutMinutes ?? settings.executionTimeoutMinutes
      ),
    };
    const modelSource = normalizeModelSource(payload.modelSource, payload.baseUrl);
    payload.modelSource = modelSource;
    const localSettings: Record<string, any> = {
      ...payload,
      ...messageChannelsForElectron(),
    };
    if (!String(payload.workspace || "").trim()) delete localSettings.workspace;
    if (String(patch.apiKey || "").trim() || patch.clearApiKey) {
      localSettings.apiKey = payload.apiKey;
      localSettings.clearApiKey = Boolean(patch.clearApiKey);
    } else {
      delete localSettings.apiKey;
      delete localSettings.clearApiKey;
      delete localSettings.hasApiKey;
    }
    const local = await writeElectronSettings(localSettings);
    if (local) delete local.headers;
    const hasApiKey =
      (Boolean(settings.hasApiKey) || Boolean(String(payload.apiKey || "").trim())) &&
      !patch.clearApiKey;
    Object.assign(settings, patch, local, {
      hasApiKey,
      apiKey: "",
      clearApiKey: false,
      userName: payload.userName,
      agentName: payload.agentName,
      modelSource,
      shopConcurrency: payload.shopConcurrency,
      conversationConcurrency: payload.conversationConcurrency,
      executionTimeoutMinutes: payload.executionTimeoutMinutes,
      ...(payload.workspace ? { workspace: payload.workspace } : {}),
    });
    if (patch.clearApiKey) keyReadyUid = "";
  }

  /** 只加载当前登录账号的消息通道。返回 false 表示账号已切换，结果作废 */
  async function loadMessageChannelSettings(_fallback?: Record<string, any>) {
    messageChannelSettings.channelConfigList = createDefaultMessageChannelSettings().channelConfigList;
    return true;
  }

  async function saveMessageChannel(channel: MessageChannelConfig) {
    const owner = messageChannelOwnerId;
    if (!owner || owner !== currentAccountId()) return findMessageChannel(channel.categoryId);
    const current = findMessageChannel(channel.categoryId);
    const payloadItem = { ...current, ...channel };
    if (String(payloadItem.appSecret || "").trim()) payloadItem.hasAppSecret = true;
    const res: any = await saveMessageChannelConfigApi({
      channelConfigList: [payloadItem],
    });
    if (owner !== messageChannelOwnerId) return findMessageChannel(channel.categoryId);
    const channelsForSync = messageChannelSettings.channelConfigList.map((item) =>
      item.categoryId === payloadItem.categoryId ? payloadItem : item
    );
    await syncElectronSettings(channelsForSync).catch(() => {});

    if (owner !== messageChannelOwnerId) return findMessageChannel(channel.categoryId);
    const remoteList = res?.data?.channelConfigList;
    if (Array.isArray(remoteList)) {
      const merged = messageChannelSettings.channelConfigList.map((item) => {
        const remote = remoteList.find(
          (candidate: any) => Number(candidate?.categoryId) === item.categoryId
        );
        return remote ? { ...item, ...remote } : item;
      });
      messageChannelSettings.channelConfigList = normalizeMessageChannels(merged);
      return findMessageChannel(channel.categoryId);
    }
    Object.assign(current, payloadItem, {
      appSecret: "",
      hasAppSecret: current.hasAppSecret || !!payloadItem.appSecret,
    });
    return current;
  }

  /* ================= 技能 ================= */

  let skillsLoadSeq = 0;

  async function loadSkills(targetWorkspace = workspace.value) {
    const seq = ++skillsLoadSeq;
    const requested = targetWorkspace;
    skillsBusy.value = true;
    try {
      const skills = await zhifuListSkills({ workspace: requested });
      if (seq !== skillsLoadSeq) return skills;
      localSkills.value = skills;
      return skills;
    } finally {
      if (seq === skillsLoadSeq) skillsBusy.value = false;
    }
  }

  async function loadSkillStore(params: { keyword?: string } = {}) {
    const res: any = await getSkillStoreList({ page: 1, limit: 100, ...params });
    skillStoreCatalog.value = pickList<SkillStoreItem>(res);
    return skillStoreCatalog.value;
  }

  async function loadBoundSkillStore(params: { keyword?: string } = {}) {
    const res: any = await getMySkillStoreList({ page: 1, limit: 100, ...params });
    boundStoreSkills.value = pickList<SkillStoreItem>(res);
    return boundStoreSkills.value;
  }

  /* ================= 定时任务 ================= */

  function upsertScheduledTask(task: ScheduledTask) {
    if (!task.id) return;
    const index = scheduledTasks.value.findIndex((item) => item.id === task.id);
    if (index >= 0) scheduledTasks.value[index] = task;
    else scheduledTasks.value.unshift(task);
  }

  function syncScheduledTaskResults(tasks: ScheduledTask[]) {
    for (const task of tasks) {
      const runs = task.runs?.length
        ? task.runs
        : task.lastRunAt && task.lastStatus && !["running", "pending"].includes(task.lastStatus)
          ? [
              {
                runAt: task.lastRunAt,
                startedAt: undefined,
                completedAt: undefined,
                diagnostics: undefined,
                status: task.lastStatus!,
                result: task.lastResult || "",
              },
            ]
          : [];
      if (!runs.length && !task.progress) continue;
      const title = t("zhifuAgent.scheduled.conversationTitle", { title: task.title });
      let conversation = conversations.value.find((item) => item.scheduledTaskId === task.id);
      if (conversation?._summary) {
        conversation.lastMessageAt = Math.max(conversation.lastMessageAt || 0, task.lastRunAt || 0);
        conversation.unreadCount = task.unread ? 1 : 0;
        continue;
      }

      if (!conversation) {
        conversations.value.push({
          ...createConversation(),
          title,
          autoTitle: false,
          scheduledTaskId: task.id,
        });
        ensureMainConversation(conversations.value);
        conversation = conversations.value.find((item) => item.scheduledTaskId === task.id)!;
      }
      conversation.title = title;
      if (task.progress) {
        let progress = conversation.messages.find(
          (message) => message.scheduledProgress && message.role === "assistant"
        );
        if (!progress) {
          conversation.messages.push({
            id: newId(),
            role: "user",
            content: task.prompt,
            createdAt: Date.now(),
            scheduledProgress: true,
            shops: (task.shops || []).map(({ id, name }) => ({ id, name })),
            skills: (task.skillNames || []).map((name) => ({
              id: name,
              name,
              scope: "workspace" as const,
            })),
          });
          conversation.messages.push({
            id: newId(),
            role: "assistant",
            content: "",
            createdAt: Date.now(),
            scheduledProgress: true,
            streaming: true,
          });
          progress = conversation.messages[conversation.messages.length - 1];
        }
        progress.content = task.progress;
        progress.streaming = true;
      } else if (task.lastStatus !== "running") {
        conversation.messages = conversation.messages.filter(
          (message) => !message.scheduledProgress
        );
      }
      let addedResult = false;
      for (const run of runs) {
        if (conversation.messages.some((message) => message.scheduledRunAt === run.runAt)) continue;
        const runStatus = run.status || "running";
        const statusLabel = t(
          `zhifuAgent.scheduled.status${runStatus.charAt(0).toUpperCase()}${runStatus.slice(1)}`
        );
        conversation.messages.push({
          id: newId(),
          role: "user",
          content: `${t("zhifuAgent.scheduled.autoRunPrefix")} ${task.prompt}`,
          createdAt: run.startedAt || run.runAt,
          scheduledRunAt: run.runAt,
          shops: (task.shops || []).map(({ id, name }) => ({ id, name })),
          skills: (task.skillNames || []).map((name) => ({
            id: name,
            name,
            scope: "workspace" as const,
          })),
        });
        const result =
          collapseRepeatedText(stripThinkingMarkup(run.result || "")) ||
          t(
            run.status === "error"
              ? "zhifuAgent.scheduled.defaultFailed"
              : run.status === "cancelled"
                ? "zhifuAgent.scheduled.defaultStopped"
                : "zhifuAgent.scheduled.defaultDone"
          );
        const resultMessageId = newId();
        conversation.messages.push({
          id: resultMessageId,
          role: "assistant",
          content: t("zhifuAgent.scheduled.resultTemplate", {
            time: formatScheduledDateTime(run.startedAt || run.runAt),
            status: statusLabel,
            result,
          }),
          createdAt: run.startedAt || run.runAt,
          completedAt: run.startedAt ? run.completedAt || run.runAt : undefined,
          scheduledRunAt: run.runAt,
          executionStatus: run.status,
          executionShops: run.shops || [],
        });
        for (const artifact of run.diagnostics?.artifacts || []) {
          conversation.tools.push({
            ...artifact,
            id: resultMessageId + ":" + artifact.id,
            messageId: resultMessageId,
          });
        }
        addedResult = true;
      }
      if (addedResult && task.unread) {
        const latestStatus = runs.at(-1)?.status;
        notifyConversation(
          conversation,
          latestStatus && ["error", "partial", "unverified"].includes(latestStatus)
            ? "error"
            : "scheduled"
        );
      }
    }
    persist();
  }

  let scheduledQueue: Promise<unknown> = Promise.resolve();
  /** 已经写过「不在当前目录、停止执行」的任务，避免执行进度反复把开关写回去 */
  const pausedAwayIds = new Set<string>();

  /** 本机任务文件不能并行写，否则后一次会覆盖前一次 */
  function enqueueScheduled<T>(job: () => Promise<T>) {
    const run = scheduledQueue.then(job, job);
    scheduledQueue = run.then(
      () => undefined,
      () => undefined
    );
    return run;
  }

  async function writeScheduledTask(task: ScheduledTask) {
    const payload = JSON.parse(JSON.stringify(task)) as ScheduledTask;
    if (!payload.id) payload.id = newId();
    const savedRaw = await zhifuSaveLocalScheduledTask(payload);
    const saved = normalizeScheduledTask(
      savedRaw && typeof savedRaw === "object" ? { ...payload, ...savedRaw } : payload
    );
    if (!saved.id) saved.id = payload.id;
    return saved;
  }

  function saveScheduledTask(task: ScheduledTask) {
    const uid = currentAccountId();
    return enqueueScheduled(async () => {
      if (!uid || currentAccountId() !== uid) {
        throw new Error("账号已切换，请重新保存定时任务");
      }
      const wanted = Boolean(task.enabled);
      const payload: ScheduledTask = {
        ...task,
        id: task.id || newId(),
        accountId: uid,
        ownerEnabled: wanted,
        enabled: wanted,
      };
      // 客户端保存会丢掉 accountId，必须先把归属写进本机，再改任务文件
      const owners = readScheduledOwners();
      owners[payload.id!] = { accountId: uid, ownerEnabled: wanted };
      writeScheduledOwners(owners);
      const saved = await writeScheduledTask(payload);
      const stored: ScheduledTask = {
        ...saved,
        accountId: uid,
        ownerEnabled: wanted,
        enabled: wanted,
      };
      if (currentAccountId() !== uid) return stored;
      applyScheduledReadMarks([stored]);
      upsertScheduledTask(stored);
      return stored;
    });
  }

  function toggleScheduledTask(task: ScheduledTask) {
    return saveScheduledTask({ ...task, enabled: !task.enabled });
  }

  function deleteScheduledTask(id: string) {
    return enqueueScheduled(async () => {
      await zhifuDeleteLocalScheduledTask(id);
      const owners = readScheduledOwners();
      if (owners[id]) {
        delete owners[id];
        writeScheduledOwners(owners);
      }
      scheduledTasks.value = scheduledTasks.value.filter((item) => item.id !== id);
    });
  }

  /** 只翻转启用开关。整份重写会刷新更新时间，调度器可能立刻补跑。单条失败不能把其余任务从列表拿掉 */
  async function applyScheduledEnabled(uid: string, tasks: ScheduledTask[]) {
    const failed = new Set<string>();
    for (const task of tasks) {
      if (currentAccountId() !== uid) return failed;
      try {
        await writeScheduledTask(task);
      } catch {
        if (task.id) failed.add(task.id);
      }
    }
    return failed;
  }

  function loadScheduledTasks() {
    return enqueueScheduled(async () => {
      const uid = currentAccountId();
      const local = (await zhifuListLocalScheduledTasks()) || [];
      if (currentAccountId() !== uid) return scheduledTasks.value;
      // 退出登录时账号会先变成空。这时不能改任务文件，否则会把所有任务关掉并丢掉归属
      if (!uid) {
        scheduledTasks.value = [];
        return scheduledTasks.value;
      }
      const owners = readScheduledOwners();
      const missingOwner = local.some((item) => item?.id && !owners[String(item.id)]);
      const conversationOwners = missingOwner ? readConversationTaskOwners() : {};
      const chatsReady = conversationStorageReady.value && conversationOwnerId === uid;
      let ownersChanged = false;
      const visible: ScheduledTask[] = [];
      const enabledWrites: ScheduledTask[] = [];
      const activeWorkspace = workspace.value;
      pausedAwayIds.clear();
      for (const raw of local) {
        const task = normalizeScheduledTask(raw);
        if (!task.id) continue;
        if (!owners[task.id]) {
          const fromChat =
            chatsReady && conversations.value.some((item) => item.scheduledTaskId === task.id)
              ? uid
              : "";
          // 文件里的账号优先。会话归属只是旧数据补洞，不能盖过文件
          const recovered = String(task.accountId || "") || conversationOwners[task.id] || fromChat;
          if (recovered) {
            owners[task.id] = {
              accountId: recovered,
              ownerEnabled: task.ownerEnabled ?? Boolean(task.enabled),
            };
            ownersChanged = true;
          }
        }
        const record = owners[task.id];
        const accountId = resolveScheduledOwner(
          task.id,
          task.accountId,
          owners,
          conversationOwners
        );
        const wanted = record ? record.ownerEnabled : (task.ownerEnabled ?? Boolean(task.enabled));
        // Expired one-time tasks remain history; account restoration must not re-enable them.
        const onceAt =
          task.frequency === "once"
            ? new Date(task.date + "T" + task.time + ":00").getTime()
            : null;
        const expiredOnce = onceAt !== null && (!Number.isFinite(onceAt) || onceAt <= Date.now());
        // 列表只显示当前目录，但调度器看的是文件里的 enabled。目录不对就关掉，切回来再按原来的开关打开
        const runsHere =
          Boolean(activeWorkspace.trim()) && sameWorkspace(task.workspace, activeWorkspace);
        const shouldRun = Boolean(uid) && accountId === uid && wanted && !expiredOnce && runsHere;
        if (accountId && Boolean(task.enabled) !== shouldRun) {
          enabledWrites.push({
            ...task,
            accountId,
            ownerEnabled: wanted,
            enabled: shouldRun,
          });
        }
        if (task.id && !runsHere) pausedAwayIds.add(task.id);
        if (uid && accountId === uid) {
          visible.push({ ...task, accountId, ownerEnabled: wanted, enabled: shouldRun });
        }
      }
      if (ownersChanged) writeScheduledOwners(owners);
      if (currentAccountId() !== uid || !sameWorkspace(workspace.value, activeWorkspace)) {
        return scheduledTasks.value;
      }
      const failed = await applyScheduledEnabled(uid, enabledWrites);
      if (currentAccountId() !== uid || !sameWorkspace(workspace.value, activeWorkspace)) {
        return scheduledTasks.value;
      }
      if (failed.size) {
        for (const item of visible) {
          if (!item.id || !failed.has(item.id)) continue;
          pausedAwayIds.delete(item.id);
          const raw = local.find((entry) => String(entry?.id || "") === item.id);
          if (raw) item.enabled = Boolean(normalizeScheduledTask(raw).enabled);
        }
      }
      scheduledTasks.value = visible;
      applyScheduledReadMarks(scheduledTasks.value);
      syncScheduledTaskResults(scheduledTasks.value);
      return scheduledTasks.value;
    });
  }

  async function viewScheduledResult(task: ScheduledTask) {
    syncScheduledTaskResults([task]);
    let conversation = conversations.value.find((item) => item.scheduledTaskId === task.id);
    if (!conversation) {
      conversations.value.unshift({
        ...createConversation(),
        title: t("zhifuAgent.scheduled.conversationTitle", { title: task.title }),
        autoTitle: false,
        scheduledTaskId: task.id,
      });
      ensureMainConversation(conversations.value);
      conversation = conversations.value.find((item) => item.scheduledTaskId === task.id)!;
    }
    await selectConversation(conversation.id);
    if (!conversation._summary) syncScheduledTaskResults([task]);
    openPage("chat");
    if (router.currentRoute.value.path !== "/zhifuAgent") await router.push("/zhifuAgent");
    if (task.unread) markScheduledTaskReadLocal(task);
    persist();
    await nextTick();
    await scrollToBottom();
  }

  /* ================= Agent 事件 ================= */

  function handleAgentEvent(event: ZhifuAgentEvent) {
    const conversation = conversationForAgent(event);
    if (!conversation) return;
    const run = conversationRuns[conversation.id];
    if (!run || run.controller.signal.aborted || (event.runId && event.runId !== run.runId)) return;
    if (event.kind === "approvals-cleared") {
      const ids = new Set(event.approvalIds);
      for (let index = pendingApprovals.length - 1; index >= 0; index--) {
        if (
          pendingApprovals[index].conversationId === conversation.id &&
          ids.has(pendingApprovals[index].approvalId)
        )
          pendingApprovals.splice(index, 1);
      }
      if (approval.value?.conversationId === conversation.id && ids.has(approval.value.approvalId))
        advanceApproval();
      if (conversation.notificationType === "approval" && !hasPendingApproval(conversation.id))
        conversation.notificationType = "";
      return;
    }
    if (event.sessionId) run.sessionId = event.sessionId;
    const followOutput = conversation.id === activeId.value && isNearBottom();
    if (event.kind === "waiting" || event.kind === "executing") {
      conversation.executionState = event.kind === "waiting" ? "queued" : "running";
      currentAssistant(conversation).statusLabel = event.message || t("zhifuAgent.chat.thinking");
    }
    if (event.kind === "shop-progress") {
      const assistant = currentAssistant(conversation);
      assistant.content = event.content || "";
      assistant.executionShops = event.shops || [];
    }
    if (event.kind === "text-final") {
      currentAssistant(conversation).content = event.text || "";
    }
    if (event.kind === "chunk") {
      if (event.stream === "agent") {
        appendAgentText(currentAssistant(conversation), event.text);
      } else {
        const last = conversation.tools.at(-1);
        if (last?.status === "running") last.output = `${last.output || ""}${event.text || ""}`;
      }
    }
    if (event.kind === "error") {
      if (isApprovalDenied(event.message) || run.stopping) {
        const message = currentAssistant(conversation);
        message.executionStatus = "cancelled";
        conversation.executionState = "stopped";
        if (conversation.id === activeId.value) error.value = "";
      } else {
        const reason = errorMessage(event.message, t("zhifuAgent.chat.modelError"));
        run.errorMessage = reason;
        if (conversation.id === activeId.value) error.value = reason;
        const message = currentAssistant(conversation);
        if (!message.content) {
          message.content = t("zhifuAgent.chat.requestFailed", { message: reason });
        }
        message.executionStatus = "failed";
      }
    }
    if (event.kind === "tool-start") {
      run.toolCount += 1;
      const assistant = currentAssistant(conversation);
      conversation.tools.push({
        id: event.toolCallId || newId(),
        messageId: assistant.id,
        name: event.toolName,
        input: event.input,
        status: "running",
        output: "",
      });
    }
    if (event.kind === "tool-end") {
      run.toolCount = Math.max(0, run.toolCount - 1);
      const tool = conversation.tools.find((item) => item.id === event.toolCallId);
      if (tool) {
        Object.assign(tool, {
          status: isApprovalDenied(event.error) ? "cancelled" : event.error ? "error" : "done",
          output: event.output,
          error: isApprovalDenied(event.error) ? "" : event.error,
        });
      }
    }
    if (
      event.kind === "status" &&
      ["completed", "failed", "cancelled", "success", "error"].includes(event.status)
    ) {
      if (event.status === "cancelled" || isApprovalDenied(event.reason) || run.stopping) {
        currentAssistant(conversation).executionStatus = "cancelled";
        conversation.executionState = "stopped";
      } else {
        currentAssistant(conversation).executionStatus = event.status;
      }
    }
    if (event.kind === "ended") {
      if (event.status === "cancelled" || isApprovalDenied(event.reason) || run.stopping) {
        currentAssistant(conversation).executionStatus = "cancelled";
        conversation.executionState = "stopped";
        if (!run.notified) notifyConversation(conversation, "cancelled");
        run.notified = true;
        persist();
        if (followOutput) scrollToBottom();
        return;
      }
      if (event.status) currentAssistant(conversation).executionStatus = event.status;
      if (
        event.status === "success" &&
        !event.reason &&
        conversation.id === activeId.value &&
        run.errorMessage &&
        error.value === run.errorMessage
      )
        error.value = "";
      const failed = ["error", "partial", "unverified"].includes(event.status);
      if (failed && event.reason) {
        const message = currentAssistant(conversation);
        const statusName = `${event.status.charAt(0).toUpperCase()}${event.status.slice(1)}`;
        const note = t("zhifuAgent.chat.executionStatus", {
          status: t(`zhifuAgent.scheduled.status${statusName}`),
          message: errorMessage(event.reason),
        });
        if (!message.content.includes(note)) {
          message.content = `${message.content ? `${message.content}\n\n` : ""}${note}`;
        }
      }
      if (!run.notified) {
        notifyConversation(conversation, failed ? "error" : "agent");
        run.notified = true;
      }
    }
    persist();
    if (followOutput) scrollToBottom();
  }

  function handleScheduledTaskUpdated(task: ScheduledTask) {
    const uid = currentAccountId();
    if (!uid || !task.id) return;
    const owners = readScheduledOwners();
    const recorded = owners[task.id];
    const conversationOwners = recorded ? {} : readConversationTaskOwners();
    const owner = resolveScheduledOwner(task.id, task.accountId, owners, conversationOwners);
    if (owner !== uid) {
      if (owner) scheduledTasks.value = scheduledTasks.value.filter((item) => item.id !== task.id);
      return;
    }
    const wanted = recorded?.ownerEnabled ?? task.ownerEnabled ?? Boolean(task.enabled);
    const runsHere =
      Boolean(workspace.value.trim()) && sameWorkspace(task.workspace, workspace.value);
    // 旧目录的任务跑起来后会把 enabled 写回 true，这里立刻再关掉
    if (!runsHere && task.enabled && task.id && !pausedAwayIds.has(task.id)) {
      pausedAwayIds.add(task.id);
      const snapshot = task;
      const existing = scheduledTasks.value.find((item) => item.id === snapshot.id);
      void enqueueScheduled(async () => {
        if (currentAccountId() !== uid) {
          pausedAwayIds.delete(snapshot.id!);
          return;
        }
        if (Boolean(workspace.value.trim()) && sameWorkspace(snapshot.workspace, workspace.value)) {
          pausedAwayIds.delete(snapshot.id!);
          return;
        }
        try {
          await writeScheduledTask({
            ...existing,
            ...snapshot,
            accountId: owner,
            ownerEnabled: existing?.ownerEnabled ?? wanted,
            enabled: false,
          });
        } catch {
          pausedAwayIds.delete(snapshot.id!);
        }
      });
    }
    if (runsHere && task.id) pausedAwayIds.delete(task.id);
    const stored: ScheduledTask = {
      ...task,
      accountId: owner,
      ownerEnabled: wanted,
      enabled: runsHere ? Boolean(task.enabled) : false,
    };
    applyScheduledReadMarks([stored]);
    upsertScheduledTask(stored);
    syncScheduledTaskResults([stored]);
  }

  async function handleOpenScheduledTaskResult({ id }: { id: string }) {
    const tasks = await loadScheduledTasks().catch(() => scheduledTasks.value);
    const task = tasks.find((item) => item.id === id);
    if (task) await viewScheduledResult(task);
  }

  /* ================= 初始化 ================= */

  let initPromise: Promise<void> | null = null;

  async function bootstrapAll() {
    await showAccountConversations(conversationOwnerId);
    zhifuOnAgentEvent(handleAgentEvent);
    zhifuOnImMessage(handleImMessage);
    zhifuOnImStatus((status) => {
      if (status.provider === "feishu") Object.assign(feishuConnection, status);
      if (status.provider === "wechat") Object.assign(wechatConnection, status);
      if (status.provider === "wecom") Object.assign(wecomConnection, status);
    });
    zhifuOnApprovalRequested((request) => {
      const conversation = conversationForAgent(request);
      if (!conversation) return;
      const run = conversationRuns[conversation.id];
      if (!run || run.controller.signal.aborted || (request.runId && request.runId !== run.runId))
        return;
      const entry = { ...request, conversationId: conversation.id };
      if (
        approval.value?.approvalId === entry.approvalId ||
        pendingApprovals.some((item) => item.approvalId === entry.approvalId)
      )
        return;
      pendingApprovals.push(entry);
      focusConversationApproval(activeId.value);
      if (conversation.id !== activeId.value || !document.hasFocus()) {
        notifyConversation(conversation, "approval");
      }
    });
    zhifuOnScheduledTaskUpdated((task) => handleScheduledTaskUpdated(task as ScheduledTask));
    zhifuOnOpenScheduledTaskResult(handleOpenScheduledTaskResult);
    window.addEventListener("beforeunload", flushPersist);
    window.setInterval(() => {
      if (anyRunning.value) clock.value = Date.now();
    }, 1000);

    const initial = await zhifuBootstrap().catch(() => null);
    if (initial) {
      Object.assign(feishuConnection, initial.imStatus?.feishu || {});
      Object.assign(wechatConnection, initial.imStatus?.wechat || {});
      Object.assign(wecomConnection, initial.imStatus?.wecom || {});
    }
    const [, channelsReady] = await Promise.all([
      loadSettings(initial?.settings),
      loadMessageChannelSettings(initial?.settings),
    ]);
    const savedWorkspace = String(settings.workspace || "").trim();
    if (savedWorkspace) {
      if (workspace.value !== savedWorkspace) {
        workspace.value = savedWorkspace;
        persist();
      }
    } else if (workspace.value.trim()) {
      settings.workspace = workspace.value;
    }
    await bindModelKeyToAccount(currentAccountId()).catch(() => {});
    if (channelsReady && currentAccountId()) await syncElectronSettings().catch(() => {});
    else if (!savedWorkspace && workspace.value.trim()) {
      await saveSettings({ workspace: workspace.value }).catch(() => {});
    }
    workspaceSetupOpen.value = !workspace.value.trim();
    if (workspace.value) {
      zhifuSetWorkspace(workspace.value).catch((cause) => {
        Object.assign(feishuConnection, { state: "error", message: errorMessage(cause) });
      });
    }
    loadScheduledTasks().catch(() => {});
    loadSkillStore().catch(() => {});
    loadBoundSkillStore().catch(() => {});
  }

  /** 全局只初始化一次，事件订阅贯穿整个应用生命周期 */
  function init() {
    if (!initPromise) initPromise = bootstrapAll();
    return initPromise;
  }

  async function enterMainConversation() {
    await init();
    const main = ensureMainConversation(conversations.value);
    openPage("chat");
    await selectConversation(main.id);
  }

  return {
    enterMainConversation,
    settings,
    messageChannelSettings,
    feishuConnection,
    wechatConnection,
    wecomConnection,
    workspace,
    workspaceName,
    workspaceSetupOpen,
    workspaceSetupBusy,
    workspaceSetupError,
    setupInitialWorkspace,
    activePage,
    settingsTab,
    planBuySignal,
    requestPlanBuy,
    benefitClaimSignal,
    requestBenefitClaim,
    importModelRequested,
    requestImportModel,
    consumeImportModelRequest,
    conversations,
    conversationStorageReady,
    conversationHasMore,
    conversationFilter,
    setConversationFilter,
    conversationPageLoading,
    loadMoreConversations,
    conversationDatabasePath,
    conversationStorageBusy,
    conversationStorageError,
    conversationStorageSpace,
    refreshConversationStorage,
    moveConversationStorage,
    retryConversationSave,
    flushConversations: flushPersist,
    exportConversationBackup,
    importConversationBackup,
    activeId,
    activeConversation,
    newMessagesBelow,
    error,
    mode,
    running,
    anyRunning,
    conversationRuns,
    conversationQueue,
    advanceApproval,
    hasPendingApproval,
    backgroundApprovalConversations,
    clearConversationApprovals,
    activeToolCount,
    clock,
    sessionPermissions,
    approval,
    currentPermissions,
    effectiveMode,
    scheduledTasks,
    unreadScheduledCount,
    localSkills,
    pendingSkill,
    pendingPrompt,
    pendingSend,
    pendingSkillDraft,
    pendingSkillEdit,
    pendingScheduledDraft,
    skillsBusy,
    skillStoreCatalog,
    boundStoreSkills,
    installedStoreSkills,
    selectableSkills,
    totalUnreadCount,
    openPage,
    init,
    persist,
    registerViewport,
    isNearBottom,
    scrollToBottom,
    markActiveConversationRead,
    addConversation,
    forkSkillTrial,
    startSkillTrial,
    selectConversation,
    renameConversation,
    deleteConversation,
    currentAssistant,
    notifyConversation,
    selectWorkspace,
    loadSettings,
    modelUserRevision,
    whenModelKeyBound,
    whenSettingsWritten,
    ensureModelKeySaved,
    refreshModelUser,
    saveSettings,
    findMessageChannel,
    loadMessageChannelSettings,
    saveMessageChannel,
    loadSkills,
    loadSkillStore,
    loadBoundSkillStore,
    skillsByScope,
    findStoreSkill,
    loadScheduledTasks,
    saveScheduledTask,
    toggleScheduledTask,
    deleteScheduledTask,
    upsertScheduledTask,
    viewScheduledResult,
  };
});

export function useZhifuAgentStoreHook() {
  return useZhifuAgentStore(store);
}
