import { toPlainDiagnosticData } from "../diagnostics";

const localflowApi = (window as any).localflow;
export const electronApi = (window as any).api;
export const getAppVersion = async () => (await electronApi?.settings())?.version || '0.0.0';
export const getSystemPlatform = async () => (await (window as any).localflow?.bootstrap())?.platform || '';
export type SuperPowerAgentMode = "plan" | "act" | "yolo";
export type SuperPowerSkillScope = "global" | "workspace";
export type SuperPowerImProvider = "feishu" | "wechat" | "wecom";
export type SuperPowerApprovalScope = "once" | "turn" | "session" | "all_session";

export interface SuperPowerImStatus {
  provider?: SuperPowerImProvider;
  state: "disconnected" | "connecting" | "connected" | "error" | string;
  message: string;
  [key: string]: any;
}

export interface SuperPowerBootstrapResult {
  settings: Record<string, any>;
  platform: string;
  imStatus: {
    feishu?: SuperPowerImStatus;
    wechat?: SuperPowerImStatus;
    wecom?: SuperPowerImStatus;
  };
}

export interface SuperPowerSelectedFile {
  path: string;
  name: string;
  /** 字节数，客户端可能不返回 */
  size?: number;
}

export interface SuperPowerConnectionResult {
  ok: boolean;
  message: string;
  status?: number;
  modelAvailable?: boolean;
}

export interface SuperPowerRunAgentInput {
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
  /** 仅打开并返回店铺结果，不执行 Agent 任务；名额由宿主覆盖整个打开流程。 */
  openOnly?: boolean;
  shopUsageTokens?: Record<string, string>;
  prompt: string;
  /** data URL */
  images: string[];
  /** 绝对路径 */
  files: string[];
  skillNames: string[];
  workspace: string;
  mode: SuperPowerAgentMode;
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

export type SuperPowerAgentEvent = { conversationId?: string; runId?: string } & (
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

export interface SuperPowerApprovalRequest {
  force?: boolean;
  conversationId?: string;
  runId?: string;
  approvalId: string;
  sessionId: string;
  toolCallId: string;
  toolName: string;
  shopName?: string;
  input: any;
}

export interface SuperPowerImMessage {
  provider: SuperPowerImProvider;
  phase: "user" | "assistant";
  conversationId: string;
  title?: string;
  messageId: string;
  content: string;
  createdAt: number;
  status?: string;
}

export interface SuperPowerLocalSkill {
  id: string;
  name: string;
  description: string;
  scope: SuperPowerSkillScope;
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

export interface SuperPowerInstallSkillResult {
  canceled: boolean;
  installed?: SuperPowerLocalSkill;
}

type SuperPowerUnsubscribe = () => void;

const superpowerUnavailable = () => Promise.reject(new Error("当前环境不支持，请在客户端中使用"));

const superpowerInvoke = <T = any>(method: string, ...args: any[]): Promise<T> => {
  const fn = localflowApi?.[method];
  if (typeof fn !== "function") return superpowerUnavailable();
  return Promise.resolve(fn(...args));
};

const superpowerSubscribe = (method: string, callback: (_payload: any) => void): SuperPowerUnsubscribe => {
  const fn = localflowApi?.[method];
  if (typeof fn !== "function") return () => {};
  const off = fn(callback);
  return typeof off === "function" ? off : () => {};
};

export const superpowerBootstrap = () => superpowerInvoke<SuperPowerBootstrapResult>("bootstrap");
export const superpowerExportDiagnostics = (input: Record<string, unknown>) =>
  superpowerInvoke<{ issueId: string; path: string; collected: number; skipped: number } | null>(
    "exportDiagnostics",
    toPlainDiagnosticData(input)
  );
export const superpowerPreviewResultImage = (path: string) =>
  superpowerInvoke<string>("previewResultImage", path);

export interface OrdinaryBrowserStatus {
  preference: string;
  selected: string;
  available: { id: string; label: string }[];
  state: string;
  message: string;
  percent?: number;
}
export const superpowerOrdinaryBrowserGet = () =>
  superpowerInvoke<OrdinaryBrowserStatus>("ordinaryBrowserGet");
export const superpowerOrdinaryBrowserSelect = (value: string) =>
  superpowerInvoke<OrdinaryBrowserStatus>("ordinaryBrowserSelect", value);
export const superpowerCloseConversationBrowser = (input: {
  workspace: string;
  conversationId: string;
}) => superpowerInvoke<void>("closeConversationBrowser", input);
export const superpowerOnOrdinaryBrowserStatus = (listener: (_status: OrdinaryBrowserStatus) => void) =>
  superpowerSubscribe("onOrdinaryBrowserStatus", listener);

/** 选择工作区目录，取消时返回 null */
export const superpowerSelectWorkspace = () => superpowerInvoke<string | null>("selectWorkspace");

export const superpowerSelectFiles = () => superpowerInvoke<SuperPowerSelectedFile[]>("selectFiles");

export const superpowerSetWorkspace = (workspace: string) =>
  superpowerInvoke<string>("setWorkspace", workspace);

export const superpowerTestConnection = (settings: Record<string, any>) =>
  superpowerInvoke<SuperPowerConnectionResult>("testConnection", settings);

export const superpowerTestImConnection = (input: {
  provider: SuperPowerImProvider;
  clientId: string;
  clientSecret: string;
}) => superpowerInvoke<SuperPowerConnectionResult>("testImConnection", input);

export const superpowerRunAgent = (input: SuperPowerRunAgentInput) =>
  superpowerInvoke<{
    sessionId?: string;
    status?: string;
    output?: string;
    error?: string;
    stopped?: boolean;
    closeMessage?: string;
  }>("runAgent", input);

export const superpowerBeginShopUsage = (shops: { id: string | number }[]) =>
  superpowerInvoke<Record<string, string>>("beginShopUsage", shops);
export const superpowerFinishShopUsage = (input: { token: string; connection: Record<string, any> }) =>
  superpowerInvoke<string>("finishShopUsage", input);
export const superpowerCancelShopUsage = (tokens: Record<string, string>) =>
  superpowerInvoke<void>("cancelShopUsage", tokens);

export const superpowerValidateShopConnection = (connection: Record<string, any>) =>
  superpowerInvoke<{ ok?: boolean; error?: string }>("validateShopConnection", connection);

export const superpowerGetBrowserConnection = (browserId: string | number) =>
  superpowerInvoke<Record<string, any> | null>("getBrowserConnection", browserId);

export const superpowerCompleteScheduledShops = (input: {
  requestId: string;
  results?: SuperPowerRunAgentInput["shopResults"];
  error?: string;
}) => superpowerInvoke<unknown>("completeScheduledShops", input);

export const superpowerOnOpenScheduledShops = (
  callback: (_payload: { requestId: string; shops: { id: string | number }[] }) => void
) => superpowerSubscribe("onOpenScheduledShops", callback);

export const superpowerStopAgent = (conversationId: string) =>
  superpowerInvoke<boolean>("stopAgent", conversationId);

export const superpowerApproveTool = (input: {
  approvalId: string;
  approved: boolean;
  scope: SuperPowerApprovalScope;
}) => superpowerInvoke<boolean>("approveTool", input);

export const superpowerClearApprovals = (input: { conversationId: string; toolName?: string }) =>
  superpowerInvoke<boolean>("clearApprovals", input);

export const superpowerListSkills = (input: { workspace: string }) =>
  superpowerInvoke<SuperPowerLocalSkill[]>("listSkills", input);

export const superpowerInstallSkill = (input: {
  kind: "folder" | "zip";
  scope: SuperPowerSkillScope;
  workspace: string;
}) => superpowerInvoke<SuperPowerInstallSkillResult>("installSkill", input);

/** 读取本地 .md 或 .zip 里的技能名称和描述。没有本地路径时传文件内容 */
export const superpowerPreviewSkillFile = (input: {
  filePath?: string;
  filename?: string;
  contentBase64?: string;
}) => superpowerInvoke<{ name: string; description: string }>("previewSkillFile", input);

export const superpowerGetPathForFile = (file: File) => {
  const getPath = (window as any).localflow?.getPathForFile;
  if (typeof getPath !== "function") return "";
  try {
    return String(getPath(file) || "");
  } catch {
    return "";
  }
};

export const superpowerInstallRemoteSkill = (input: {
  url: string;
  id: number | string;
  fileMd5?: string;
  scope: SuperPowerSkillScope;
  workspace: string;
  /** 为 true 时覆盖工作区里已有的同名技能 */
  replace?: boolean;
}) => superpowerInvoke<SuperPowerInstallSkillResult>("installRemoteSkill", input);

export const superpowerToggleSkill = (input: { id: string; scope: SuperPowerSkillScope; enabled: boolean }) =>
  superpowerInvoke<boolean>("toggleSkill", input);

export const superpowerUninstallSkill = (input: {
  id: string;
  scope: SuperPowerSkillScope;
  workspace: string;
}) => superpowerInvoke<boolean>("uninstallSkill", input);

export interface SuperPowerSkillDraft {
  scope: SuperPowerSkillScope;
  workspace: string;
  name: string;
  description: string;
  triggers: string[];
  instructions: string;
  permissions: string[];
}

export interface SuperPowerCreatedSkill {
  id: string;
  name: string;
  scope: SuperPowerSkillScope;
  path: string;
}

export interface SuperPowerSkillDetail {
  id: string;
  scope: SuperPowerSkillScope;
  name: string;
  description: string;
  content: string;
  file: string;
  /** includeFiles 为 true 时返回技能目录下的全部文件 */
  files?: { path: string; data: string }[];
}

export const superpowerCreateSkill = (input: SuperPowerSkillDraft) =>
  superpowerInvoke<SuperPowerCreatedSkill>("createSkill", input);

export const superpowerGetSkill = (input: {
  id: string;
  scope: SuperPowerSkillScope;
  workspace: string;
  includeFiles?: boolean;
}) => superpowerInvoke<SuperPowerSkillDetail>("getSkill", input);

export const superpowerUpdateSkill = (input: {
  id: string;
  scope: SuperPowerSkillScope;
  workspace: string;
  name: string;
  description: string;
  content: string;
}) =>
  superpowerInvoke<{
    id: string;
    scope: SuperPowerSkillScope;
    name: string;
    description: string;
    path: string;
  }>("updateSkill", input);

export const superpowerRunScheduledTask = (id: string) => superpowerInvoke<boolean>("runScheduledTask", id);

export const superpowerOpenResultFile = (path: string) => superpowerInvoke<void>("openResultFile", path);
export const superpowerRevealResultFile = (path: string) => superpowerInvoke<void>("revealResultFile", path);

export const superpowerListLocalScheduledTasks = () =>
  superpowerInvoke<Record<string, any>[]>("listScheduledTasks");

export const superpowerSaveLocalScheduledTask = (task: Record<string, any>) =>
  superpowerInvoke<Record<string, any>>("saveScheduledTask", task);

export const superpowerDeleteLocalScheduledTask = (id: string) =>
  superpowerInvoke<boolean>("deleteScheduledTask", id);

/** 保存设置到 Electron 本地安全存储，返回不含明文凭据的设置 */
export const superpowerSaveSettings = (settings: Record<string, any>) =>
  superpowerInvoke<Record<string, any>>("saveSettings", settings);

export const superpowerOnAgentEvent = (callback: (_event: SuperPowerAgentEvent) => void) =>
  superpowerSubscribe("onAgentEvent", callback);

export const superpowerOnApprovalRequested = (callback: (_request: SuperPowerApprovalRequest) => void) =>
  superpowerSubscribe("onApprovalRequested", callback);

export const superpowerOnImMessage = (callback: (_message: SuperPowerImMessage) => void) =>
  superpowerSubscribe("onImMessage", callback);

export const superpowerOnImStatus = (callback: (_status: SuperPowerImStatus) => void) =>
  superpowerSubscribe("onImStatus", callback);

export const superpowerOnScheduledTaskUpdated = (callback: (_task: Record<string, any>) => void) =>
  superpowerSubscribe("onScheduledTaskUpdated", callback);

export const superpowerOnOpenScheduledTaskResult = (callback: (_payload: { id: string }) => void) =>
  superpowerSubscribe("onOpenScheduledTaskResult", callback);

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

export const superpowerLoadConversations = (input: {
  accountId: string;
  sourceId?: string;
  page?: number;
  kind?: "all" | "ordinary" | "skill" | "scheduled";
  excludeIds?: string[];
  conversationId?: string;
  legacy?: unknown[];
}) =>
  superpowerInvoke<{
    conversations: import("@/ai/views/superpowerAgent/type").Conversation[];
    revision: number;
    legacyImported: boolean;
    total?: number;
    hasMore?: boolean;
    related?: import("@/ai/views/superpowerAgent/type").Conversation[];
    path: string;
  }>("loadConversations", input);
export const superpowerSaveConversations = (input: {
  accountId: string;
  conversations: unknown[];
  expectedRevision: number;
  partial?: boolean;
  deletedIds?: string[];
}) =>
  superpowerInvoke<{ revision: number; storage?: ConversationStorageInfo }>("saveConversations", input);

export const superpowerExportConversations = (input: { accountId: string; conversations: unknown[] }) =>
  superpowerInvoke<{ path: string } | null>("exportConversations", input);
export const superpowerImportConversations = (input: { accountId: string }) =>
  superpowerInvoke<{
    conversations: import("@/ai/views/superpowerAgent/type").Conversation[];
    revision: number;
  } | null>("importConversations", input);

export interface ConversationStorageInfo {
  path: string;
  directory: string;
  freeBytes: number | null;
  lowSpace: boolean;
  previousPath?: string;
}
export const superpowerConversationStorageInfo = () =>
  superpowerInvoke<ConversationStorageInfo>("conversationStorageInfo");
export const superpowerMoveConversationStorage = () =>
  superpowerInvoke<ConversationStorageInfo | null>("moveConversationStorage");
