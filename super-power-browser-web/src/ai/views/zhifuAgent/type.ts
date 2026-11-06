import type { ZhifuImProvider, ZhifuSkillScope } from "@/ai/utils/electronApi";

export type NotificationType = "" | "agent" | "error" | "approval" | "scheduled" | "cancelled";

export interface MessageAttachment {
  id: string;
  name: string;
  type: string;
  /** 消息气泡里的小图 */
  preview: string;
  /** 发送时的原图，下载和查看大图用它，避免用缩略图导致发糊 */
  source?: string;
}

export interface MessageFile {
  id: string;
  name: string;
  path: string;
}

export interface MessageShop {
  id: number | string;
  name: string;
}

export interface ExecutionShop {
  id: number | string;
  name: string;
  status: string;
}

export interface ChatMessage {
  workspace?: string;
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
  completedAt?: number;
  streaming?: boolean;
  /** 打开店铺或等待回复时显示的临时状态 */
  statusLabel?: string;
  /** 定时任务执行过程中的临时进度消息，完成后会被正式结果替换 */
  scheduledProgress?: boolean;
  attachments?: MessageAttachment[];
  files?: MessageFile[];
  shops?: MessageShop[];
  skills?: SelectedSkill[];
  /** 本次执行的整体状态，如 success、error */
  executionStatus?: string;
  /** 按店铺记录的执行状态 */
  executionShops?: ExecutionShop[];
  /** IM 渠道的原始消息 id，用于去重 */
  externalId?: string;
  source?: ZhifuImProvider;
  scheduledRunAt?: number;
}

export interface ToolItem {
  id: string;
  messageId?: string;
  name: string;
  input: any;
  status: "running" | "done" | "error" | "cancelled";
  output: any;
  error?: any;
}

export interface Conversation {
  _summary?: boolean;
  executionState?: "queued" | "running" | "completed" | "failed" | "stopped" | "interrupted";
  id: string;
  title: string;
  createdAt: number;
  messages: ChatMessage[];
  tools: ToolItem[];
  unreadCount: number;
  notificationType: NotificationType;
  lastMessageAt: number;
  /** 标题仍为默认值，首条消息发送时自动生成 */
  autoTitle?: boolean;
  scheduledTaskId?: string;
  channel?: ZhifuImProvider;
  /** 唯一的默认主会话 */
  isMainConversation?: boolean;
  /** 从技能中心发起的试跑 */
  skillTrial?: {
    skill: { id: string | number; name: string; scope: ZhifuSkillScope };
  };
}

export interface ConversationRun {
  errorMessage?: string;
  runId: string;
  controller: AbortController;
  toolCount: number;
  notified?: boolean;
  stopping?: boolean;
  sessionId?: string;
}

export interface SkillCreatorPrefill {
  name: string;
  requirement: string;
  description: string;
  triggersText: string;
  instructions: string;
  step?: number;
}

/** 输入框中待发送的图片 */
export interface PendingImage {
  id: string;
  name: string;
  type: string;
  dataUrl: string;
  preview: string;
}

export interface PendingFile {
  id: string;
  name: string;
  path: string;
}

export interface SelectedSkill {
  id: string | number;
  name: string;
  scope: ZhifuSkillScope;
}

/** 本地技能与商店技能合并后的展示结构 */
export interface DisplaySkill {
  id: string | number;
  name: string;
  description?: string;
  /** 已安装技能目录里 _meta.json 的版本号 */
  version?: string;
  scope: ZhifuSkillScope;
  enabled: boolean;
  invalid?: boolean;
  /** 技能目录创建时间，毫秒时间戳 */
  createdAt?: number;
  /** 来自技能商店的安装记录 */
  fromStore?: boolean;
  category_id?: number;
  category_name?: string;
  sub_category_id?: number;
  sub_category_name?: string;
}
