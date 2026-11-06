import type { AgentSettings, MessageChannelSettings } from "@/ai/api/zhifuAgent";
import type { ZhifuAgentMode } from "@/ai/utils/electronApi";

export const ZHIFU_STORAGE_KEYS = {
  conversations: "localflow.conversations",
  workspace: "localflow.workspace",
  mode: "localflow.mode",
  skillCreatorDraft: "localflow.skill-creator-draft",
  scheduledRead: "localflow.scheduled-read",
  /** 定时任务属于哪个登录账号。任务文件里不一定带这个字段 */
  scheduledOwners: "localflow.scheduled-owners",
  /** 本机模型密钥属于哪个账号。对不上时不能继续用上一账号的 Key */
  settingsOwner: "localflow.settings-owner",
} as const;

/** 本地最多保留的会话数 */
export const MAX_SAVED_CONVERSATIONS = 30;
export const MAX_PASTED_IMAGES = 4;
export const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
export const MAX_ATTACHED_FILES = 10;
/** 单条附件必须小于 50MB */
export const MAX_ATTACHMENT_SIZE = 50 * 1024 * 1024;

export interface ModelProvider {
  id: string;
  name: string;
  model: string;
  needsUrl: boolean;
  baseUrl: string;
  protocol: "chat" | "responses";
}

export const MODEL_PROVIDERS: ModelProvider[] = [
  {
    id: "openai-compatible",
    name: "SuperPower AI 模型服务",
    model: "gpt-5.5",
    needsUrl: true,
    baseUrl: "",
    protocol: "chat",
  },
];

export const QUICK_MODEL_PRESETS: Record<string, string[]> = {
  "openai-compatible": [
    "gpt-5.5",
    "gpt-5.6-luna",
    "gpt-5.6-terra",
    "gpt-5.6-sol",
    "gpt-6-luna",
    "gpt-6-sol",
    "gpt-6-astra",
  ],
};

/** 不需要 API Key 的本地模型提供商 */
export const LOCAL_PROVIDERS = ["ollama", "lmstudio"];

export const AGENT_MODES: ZhifuAgentMode[] = ["plan", "act", "yolo"];

export const DEFAULT_AGENT_NAME = "SuperPower AI";

export const createDefaultSettings = (): AgentSettings => ({
  providerId: MODEL_PROVIDERS[0].id,
  providerName: MODEL_PROVIDERS[0].name,
  modelId: MODEL_PROVIDERS[0].model,
  baseUrl: MODEL_PROVIDERS[0].baseUrl,
  modelSource: "official",
  apiKey: "",
  apiProtocol: MODEL_PROVIDERS[0].protocol,
  hasApiKey: false,
  clearApiKey: false,
  reasoningEffort: "medium",
  userName: "你",
  agentName: DEFAULT_AGENT_NAME,
  shopConcurrency: 2,
  conversationConcurrency: 2,
  executionTimeoutMinutes: 10,
});

export const createDefaultMessageChannelSettings = (): MessageChannelSettings => ({
  channelConfigList: [
    { categoryId: 1, appId: "", appSecret: "", hasAppSecret: false, enabled: false },
    { categoryId: 4, appId: "", appSecret: "", hasAppSecret: false, enabled: false },
    { categoryId: 5, appId: "", appSecret: "", hasAppSecret: false, enabled: false },
  ],
});

/** 工具名到 i18n key 的映射（zhifuAgent.tools.xxx） */
export const KNOWN_TOOLS = [
  "browser_prepare",
  "browser_wait_user",
  "browser_upload",
  "browser_snapshot",
  "browser_navigate",
  "browser_click",
  "browser_fill",
  "browser_press",
  "browser_read",
  "browser_screenshot",
  "browser_export_excel",
  "browser_result",
  "browser_run_skill_script",
  "read_files",
  "search_codebase",
  "run_commands",
  "apply_patch",
  "editor",
];
