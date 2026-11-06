const localflowApi = (window as any).localflow;
export const electronApi = (window as any).api;
export const getAppVersion = async () => (await electronApi?.settings())?.version || '0.0.0';
export const getSystemPlatform = async () => (await (window as any).localflow?.bootstrap())?.platform || '';
export type ZhifuAgentMode = "plan" | "act" | "yolo";
export type ZhifuSkillScope = "global" | "workspace";
export type ZhifuImProvider = "feishu" | "wechat" | "wecom";
export type ZhifuApprovalScope = "once" | "turn" | "session" | "all_session";

export interface ZhifuImStatus {
  provider?: ZhifuImProvider;
  state: "disconnected" | "connecting" | "connected" | "error" | string;
  message: string;
  [key: string]: any;
}

export interface ZhifuBootstrapResult {
  settings: Record<string, any>;
  platform: string;
  imStatus: {
    feishu?: ZhifuImStatus;
    wechat?: ZhifuImStatus;
    wecom?: ZhifuImStatus;
  };
}

export interface ZhifuSelectedFile {
  path: string;
  name: string;
  /** 字节数，客户端可能不返回 */
  size?: number;
}

export interface ZhifuConnectionResult {
  ok: boolean;
  message: string;
  status?: number;
  modelAvailable?: boolean;
}

export interface ZhifuRunAgentInput {
  conversationId: string;
  messageId?: string;
  history?: {
    id: string;
    role: string;
    content: string;
    shops?: { id: string | number; name?: string }[];
    skills?: { id?: string | number; name?: string }[];
    files?: { name?: string; path?: string }[];
    attachments?: { name?: string }[];
  }[];
  runId?: string;
  autoCloseShops?: boolean;
  shopUsageTokens?: Record<string, string>;
  prompt: string;
  /** data URL */
  images: string[];
  /** 绝对路径 */
  files: string[];
  skillNames: string[];
  workspace: string;
  mode: ZhifuAgentMode;
  shops?: { id: string | number; name?: string; platform?: string; account?: string }[];
  shopResults?: {
    ok: boolean;
    mallId: string;
    message?: string;
    isopen?: boolean;
    browserId?: string;
    cdpUrl?: string;
    WebDriverPort?: number;
    KernalNumber?: number;
    reused?: boolean;
  }[];
  shopPrompt?: string;
}

export type ZhifuAgentEvent = { conversationId?: string; runId?: string } & (
  | { kind: "approvals-cleared"; sessionId?: string; approvalIds: string[] }
  | { kind: "chunk"; sessionId: string; stream: string; text: string }
  | { kind: "error"; sessionId: string; message: string; errorClass?: string }
  | { kind: "tool-start"; sessionId: string; toolName: string; toolCallId: string; input: any }
  | {
      kind: "tool-end";
      sessionId: string;
      toolName: string;
      toolCallId: string;
      output: any;
      error?: any;
      durationMs?: number;
    }
  | { kind: "ended" | "status"; sessionId: string; status: string; reason?: string }
  | { kind: "text-final"; sessionId: string; text: string }
  | {
      kind: "shop-progress";
      sessionId?: string;
      conversationId?: string;
      content?: string;
      shops?: { id: string | number; name: string; status: string }[];
    }
  | { kind: "waiting" | "executing"; sessionId?: string; message?: string }
);

export interface ZhifuApprovalRequest {
  force?: boolean;
  conversationId?: string;
  runId?: string;
  approvalId: string;
  sessionId: string;
  toolCallId: string;
  toolName: string;
  input: any;
}

export interface ZhifuImMessage {
  provider: ZhifuImProvider;
  phase: "user" | "assistant";
  conversationId: string;
  title?: string;
  messageId: string;
  content: string;
  createdAt: number;
  status?: string;
}

export interface ZhifuLocalSkill {
  id: string;
  name: string;
  description: string;
  scope: ZhifuSkillScope;
  path: string;
  file?: string;
  requiresShop?: boolean;
  enabled: boolean;
  invalid?: boolean;
  /** 技能目录创建时间，毫秒时间戳 */
  createdAt?: number;
  /** 已安装技能目录里 _meta.json 的版本号 */
  version?: string;
}

export interface ZhifuInstallSkillResult {
  canceled: boolean;
  installed?: ZhifuLocalSkill;
}

type ZhifuUnsubscribe = () => void;

const zhifuUnavailable = () => Promise.reject(new Error("当前环境不支持，请在客户端中使用"));

const zhifuInvoke = <T = any>(method: string, ...args: any[]): Promise<T> => {
  const fn = localflowApi?.[method];
  if (typeof fn !== "function") return zhifuUnavailable();
  return Promise.resolve(fn(...args));
};

const zhifuSubscribe = (method: string, callback: (_payload: any) => void): ZhifuUnsubscribe => {
  const fn = localflowApi?.[method];
  if (typeof fn !== "function") return () => {};
  const off = fn(callback);
  return typeof off === "function" ? off : () => {};
};

export const zhifuBootstrap = () => zhifuInvoke<ZhifuBootstrapResult>("bootstrap");
export const zhifuExportDiagnostics = (input: Record<string, unknown>) =>
  zhifuInvoke<{ issueId: string; path: string; collected: number; skipped: number } | null>(
    "exportDiagnostics",
    input
  );
export const zhifuPreviewResultImage = (path: string) =>
  zhifuInvoke<string>("previewResultImage", path);

export interface OrdinaryBrowserStatus {
  preference: string;
  selected: string;
  available: { id: string; label: string }[];
  state: string;
  message: string;
  percent?: number;
}
export const zhifuOrdinaryBrowserGet = () =>
  zhifuInvoke<OrdinaryBrowserStatus>("ordinaryBrowserGet");
export const zhifuOrdinaryBrowserSelect = (value: string) =>
  zhifuInvoke<OrdinaryBrowserStatus>("ordinaryBrowserSelect", value);
export const zhifuCloseConversationBrowser = (input: {
  workspace: string;
  conversationId: string;
}) => zhifuInvoke<void>("closeConversationBrowser", input);
export const zhifuOnOrdinaryBrowserStatus = (listener: (_status: OrdinaryBrowserStatus) => void) =>
  zhifuSubscribe("onOrdinaryBrowserStatus", listener);

/** 选择工作区目录，取消时返回 null */
export const zhifuSelectWorkspace = () => zhifuInvoke<string | null>("selectWorkspace");

export const zhifuSelectFiles = () => zhifuInvoke<ZhifuSelectedFile[]>("selectFiles");

export const zhifuSetWorkspace = (workspace: string) =>
  zhifuInvoke<string>("setWorkspace", workspace);

export const zhifuTestConnection = (settings: Record<string, any>) =>
  zhifuInvoke<ZhifuConnectionResult>("testConnection", settings);

export const zhifuTestImConnection = (input: {
  provider: ZhifuImProvider;
  clientId: string;
  clientSecret: string;
}) => zhifuInvoke<ZhifuConnectionResult>("testImConnection", input);

export const zhifuRunAgent = (input: ZhifuRunAgentInput) =>
  zhifuInvoke<{
    sessionId?: string;
    status?: string;
    output?: string;
    error?: string;
    stopped?: boolean;
    closeMessage?: string;
  }>("runAgent", input);

export const zhifuBeginShopUsage = (shops: { id: string | number }[]) =>
  zhifuInvoke<Record<string, string>>("beginShopUsage", shops);
export const zhifuFinishShopUsage = (input: { token: string; connection: Record<string, any> }) =>
  zhifuInvoke<string>("finishShopUsage", input);
export const zhifuCancelShopUsage = (tokens: Record<string, string>) =>
  zhifuInvoke<void>("cancelShopUsage", tokens);

export const zhifuValidateShopConnection = (connection: Record<string, any>) =>
  zhifuInvoke<{ ok?: boolean; error?: string }>("validateShopConnection", connection);

export const zhifuGetBrowserConnection = (browserId: string | number) =>
  zhifuInvoke<Record<string, any> | null>("getBrowserConnection", browserId);

export const zhifuCompleteScheduledShops = (input: {
  requestId: string;
  results?: ZhifuRunAgentInput["shopResults"];
  error?: string;
}) => zhifuInvoke<unknown>("completeScheduledShops", input);

export const zhifuOnOpenScheduledShops = (
  callback: (_payload: { requestId: string; shops: { id: string | number }[] }) => void
) => zhifuSubscribe("onOpenScheduledShops", callback);

export const zhifuStopAgent = (conversationId: string) =>
  zhifuInvoke<boolean>("stopAgent", conversationId);

export const zhifuApproveTool = (input: {
  approvalId: string;
  approved: boolean;
  scope: ZhifuApprovalScope;
}) => zhifuInvoke<boolean>("approveTool", input);

export const zhifuClearApprovals = (input: { conversationId: string; toolName?: string }) =>
  zhifuInvoke<boolean>("clearApprovals", input);

export const zhifuListSkills = (input: { workspace: string }) =>
  zhifuInvoke<ZhifuLocalSkill[]>("listSkills", input);

export const zhifuInstallSkill = (input: {
  kind: "folder" | "zip";
  scope: ZhifuSkillScope;
  workspace: string;
}) => zhifuInvoke<ZhifuInstallSkillResult>("installSkill", input);

/** 读取本地 .md 或 .zip 里的技能名称和描述。没有本地路径时传文件内容 */
export const zhifuPreviewSkillFile = (input: {
  filePath?: string;
  filename?: string;
  contentBase64?: string;
}) => zhifuInvoke<{ name: string; description: string }>("previewSkillFile", input);

export const zhifuGetPathForFile = (file: File) => {
  const getPath = (window as any).localflow?.getPathForFile;
  if (typeof getPath !== "function") return "";
  try {
    return String(getPath(file) || "");
  } catch {
    return "";
  }
};

export const zhifuInstallRemoteSkill = (input: {
  url: string;
  id: number | string;
  fileMd5?: string;
  scope: ZhifuSkillScope;
  workspace: string;
  /** 为 true 时覆盖工作区里已有的同名技能 */
  replace?: boolean;
}) => zhifuInvoke<ZhifuInstallSkillResult>("installRemoteSkill", input);

export const zhifuToggleSkill = (input: { id: string; scope: ZhifuSkillScope; enabled: boolean }) =>
  zhifuInvoke<boolean>("toggleSkill", input);

export const zhifuUninstallSkill = (input: {
  id: string;
  scope: ZhifuSkillScope;
  workspace: string;
}) => zhifuInvoke<boolean>("uninstallSkill", input);

export interface ZhifuSkillDraft {
  scope: ZhifuSkillScope;
  workspace: string;
  name: string;
  description: string;
  triggers: string[];
  instructions: string;
  permissions: string[];
}

export interface ZhifuCreatedSkill {
  id: string;
  name: string;
  scope: ZhifuSkillScope;
  path: string;
}

export interface ZhifuSkillDetail {
  id: string;
  scope: ZhifuSkillScope;
  name: string;
  description: string;
  content: string;
  file: string;
  /** includeFiles 为 true 时返回技能目录下的全部文件 */
  files?: { path: string; data: string }[];
}

export const zhifuCreateSkill = (input: ZhifuSkillDraft) =>
  zhifuInvoke<ZhifuCreatedSkill>("createSkill", input);

export const zhifuGetSkill = (input: {
  id: string;
  scope: ZhifuSkillScope;
  workspace: string;
  includeFiles?: boolean;
}) => zhifuInvoke<ZhifuSkillDetail>("getSkill", input);

export const zhifuUpdateSkill = (input: {
  id: string;
  scope: ZhifuSkillScope;
  workspace: string;
  name: string;
  description: string;
  content: string;
}) =>
  zhifuInvoke<{
    id: string;
    scope: ZhifuSkillScope;
    name: string;
    description: string;
    path: string;
  }>("updateSkill", input);

export const zhifuRunScheduledTask = (id: string) => zhifuInvoke<boolean>("runScheduledTask", id);

export const zhifuOpenResultFile = (path: string) => zhifuInvoke<void>("openResultFile", path);
export const zhifuRevealResultFile = (path: string) => zhifuInvoke<void>("revealResultFile", path);

export const zhifuListLocalScheduledTasks = () =>
  zhifuInvoke<Record<string, any>[]>("listScheduledTasks");

export const zhifuSaveLocalScheduledTask = (task: Record<string, any>) =>
  zhifuInvoke<Record<string, any>>("saveScheduledTask", task);

export const zhifuDeleteLocalScheduledTask = (id: string) =>
  zhifuInvoke<boolean>("deleteScheduledTask", id);

/** 保存设置到 Electron 本地安全存储，返回不含明文凭据的设置 */
export const zhifuSaveSettings = (settings: Record<string, any>) =>
  zhifuInvoke<Record<string, any>>("saveSettings", settings);

export const zhifuOnAgentEvent = (callback: (_event: ZhifuAgentEvent) => void) =>
  zhifuSubscribe("onAgentEvent", callback);

export const zhifuOnApprovalRequested = (callback: (_request: ZhifuApprovalRequest) => void) =>
  zhifuSubscribe("onApprovalRequested", callback);

export const zhifuOnImMessage = (callback: (_message: ZhifuImMessage) => void) =>
  zhifuSubscribe("onImMessage", callback);

export const zhifuOnImStatus = (callback: (_status: ZhifuImStatus) => void) =>
  zhifuSubscribe("onImStatus", callback);

export const zhifuOnScheduledTaskUpdated = (callback: (_task: Record<string, any>) => void) =>
  zhifuSubscribe("onScheduledTaskUpdated", callback);

export const zhifuOnOpenScheduledTaskResult = (callback: (_payload: { id: string }) => void) =>
  zhifuSubscribe("onOpenScheduledTaskResult", callback);

/**
 * 比较版本号
 * 当 v1 大于 v2 时返回  1
 * 当 v1 等于 v2 时返回  0
 * 当 v1 小于 v2 时返回  -1
 */
export const compareVersion = (v1 = "5.0.0", v2: string) => {
  if (v1 === v2) {
    return 0;
  }

  const vs1 = v1.split(".").map((a) => parseInt(a));
  const vs2 = v2.split(".").map((a) => parseInt(a));

  const length = Math.min(vs1.length, vs2.length);
  for (let i = 0; i < length; i++) {
    if (vs1[i] > vs2[i]) {
      return 1;
    } else if (vs1[i] < vs2[i]) {
      return -1;
    }
  }

  if (length === vs1.length) {
    return -1;
  } else {
    return 1;
  }
};

export const zhifuLoadConversations = (input: {
  accountId: string;
  sourceId?: string;
  page?: number;
  kind?: "all" | "ordinary" | "skill" | "scheduled";
  excludeIds?: string[];
  conversationId?: string;
  legacy?: unknown[];
}) =>
  zhifuInvoke<{
    conversations: import("@/ai/views/zhifuAgent/type").Conversation[];
    revision: number;
    legacyImported: boolean;
    total?: number;
    hasMore?: boolean;
    related?: import("@/ai/views/zhifuAgent/type").Conversation[];
    path: string;
  }>("loadConversations", input);
export const zhifuSaveConversations = (input: {
  accountId: string;
  conversations: unknown[];
  expectedRevision: number;
  partial?: boolean;
  deletedIds?: string[];
}) =>
  zhifuInvoke<{ revision: number; storage?: ConversationStorageInfo }>("saveConversations", input);

export const zhifuExportConversations = (input: { accountId: string; conversations: unknown[] }) =>
  zhifuInvoke<{ path: string } | null>("exportConversations", input);
export const zhifuImportConversations = (input: { accountId: string }) =>
  zhifuInvoke<{
    conversations: import("@/ai/views/zhifuAgent/type").Conversation[];
    revision: number;
  } | null>("importConversations", input);

export interface ConversationStorageInfo {
  path: string;
  directory: string;
  freeBytes: number | null;
  lowSpace: boolean;
  previousPath?: string;
}
export const zhifuConversationStorageInfo = () =>
  zhifuInvoke<ConversationStorageInfo>("conversationStorageInfo");
export const zhifuMoveConversationStorage = () =>
  zhifuInvoke<ConversationStorageInfo | null>("moveConversationStorage");
