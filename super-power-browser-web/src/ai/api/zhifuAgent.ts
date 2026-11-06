import request from "@/ai/utils/request";
import { normalizeTaskShops } from "@/ai/views/zhifuAgent/utils/taskShops";

/** SuperPower AI 后台接口前缀，字段使用 camelCase */
const zhifuApi = "api/v1/zhifu";

/* ---------------- 技能商店 ---------------- */

export interface SkillStoreItem {
  id: number;
  uid: string;
  name: string;
  explain: string;
  version: string;
  category_id: number;
  /** 分类名称，上传、商店列表、我的技能、上传列表、绑定及解绑均返回 */
  category_name?: string;
  /** 平台分类，0 表示未选。商店列表、上传列表及上传响应返回 */
  sub_category_id?: number;
  sub_category_name?: string;
  source: 0 | 1;
  /** 1 公开，2 仅自己可见 */
  scope: 1 | 2 | 3;
  /** 0 无需审核，1 通过，2 拒绝，3 待审核 */
  review_status: 0 | 1 | 2 | 3;
  /** 审核完成时间；未审核、无需审核为 null */
  review_at?: string | null;
  /** 审核拒绝原因 */
  review_reason?: string | null;
  filename: string;
  file_md5: string;
  /** 技能包 HTTPS 下载地址，安装到工作区时使用 */
  file_url?: string;
  skills_url?: string;
  status: 1 | 2 | 3;
  is_bound: boolean;
  /** 下载次数，商店列表返回 */
  download_count?: number;
  /** 分享记录 ID。取消分享时传这个，不是技能版本 id */
  share_id?: number;
  created_at: string;
  updated_at: string;
}

export interface SkillStoreListParams {
  page?: number;
  limit?: number;
  /** 名称或简介关键字。商店列表用 name，上传列表用 keyword */
  name?: string;
  keyword?: string;
  /** 上传列表审核筛选：2 拒绝，3 待审核。不传表示全部 */
  review_status?: number;
  category_id?: number;
  /** 平台分类 ID，0 或不传表示不按平台筛选 */
  sub_category_id?: number;
  source?: 0 | 1;
  is_bound?: boolean;
}

export interface SkillStoreBindingResult {
  id: number;
  skill_store_id: number;
  is_bound: boolean;
  category_id?: number;
  category_name?: string;
  sub_category_id?: number;
  sub_category_name?: string;
}

/** 技能分类 GET …/skillStore/classfyList（后端路径拼写） */
export interface SkillStoreClassifyItem {
  id: number;
  name: string;
}

export function getSkillStoreClassifyList(params?: { page?: number; limit?: number }) {
  return request({
    url: `${zhifuApi}/skillStore/classfyList`,
    method: "get",
    params,
  });
}

/** 平台分类的父级分类 ID */
export const SKILL_PLATFORM_PARENT_ID = 2;

/** 平台分类 GET …/skillStore/subClassfyList，返回结构与 classfyList 一致 */
export function getSkillStoreSubClassifyList(params?: {
  parent_id?: number;
  page?: number;
  limit?: number;
}) {
  return request({
    url: `${zhifuApi}/skillStore/subClassfyList`,
    method: "get",
    params,
  });
}

/** 重新上传，参数与 upload 相同，并额外带 skill_store_id。POST …/skillStore/resubmit */
export function resubmitSkillStore(data: FormData) {
  return request({
    url: `${zhifuApi}/skillStore/resubmit`,
    method: "post",
    data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/** 上传 ZIP 技能包，成功后自动绑定 POST …/skillStore/upload */
export function uploadSkillStore(data: FormData) {
  return request({
    url: `${zhifuApi}/skillStore/upload`,
    method: "post",
    data,
    headers: {
      "Content-Type": "multipart/form-data",
    },
  });
}

/** 技能商店列表 GET …/skillStore/list */
export function getSkillStoreList(params?: SkillStoreListParams) {
  return request({
    url: `${zhifuApi}/skillStore/list`,
    method: "get",
    params,
  });
}

/** 当前账号已绑定的技能 GET …/skillStore/myList */
export function getMySkillStoreList(params?: SkillStoreListParams) {
  return request({
    url: `${zhifuApi}/skillStore/myList`,
    method: "get",
    params,
  });
}

/** 当前账号上传的技能 GET …/skillStore/uploadedList */
export function getUploadedSkillStoreList(params?: SkillStoreListParams) {
  return request({
    url: `${zhifuApi}/skillStore/uploadedList`,
    method: "get",
    params,
  });
}

/** 绑定技能版本 POST …/skillStore/bind */
export function bindSkillStore(skill_store_id: number) {
  return request({
    url: `${zhifuApi}/skillStore/bind`,
    method: "post",
    data: { skill_store_id },
  });
}

/** 删除本人上传的技能 POST …/skillStore/delete，不卸载工作区里的本地技能 */
export function deleteSkillStore(skill_store_id: number) {
  return request({
    url: `${zhifuApi}/skillStore/delete`,
    method: "post",
    data: { skill_store_id },
  });
}

/** 解绑技能版本 POST …/skillStore/unbind */
export function unbindSkillStore(skill_store_id: number) {
  return request({
    url: `${zhifuApi}/skillStore/unbind`,
    method: "post",
    data: { skill_store_id },
  });
}

/** 上报技能下载次数 POST …/skillStore/downloadCount。失败不打断安装 */
export function reportSkillDownload(skill_store_id: number) {
  return request({
    url: `${zhifuApi}/skillStore/downloadCount`,
    method: "post",
    data: { skill_store_id },
    silentError: true,
  });
}

export interface SkillShareCode {
  /** 分享记录 ID，用于作废口令 */
  id: number;
  skill_store_id: number;
  /** 16 位十六进制，每 4 位用 - 分隔 */
  code: string;
  /** 技能名称 */
  name: string;
}

/** 作废分享口令 POST …/skillStore/share/revoke。id 是列表里的 share_id，不是技能版本 ID */
export function revokeSkillShare(id: number) {
  return request({
    url: `${zhifuApi}/skillStore/share/revoke`,
    method: "post",
    data: { id },
  });
}

/** 创建技能分享口令 POST …/skillStore/share/create */
export function createSkillShare(skill_store_id: number) {
  return request({
    url: `${zhifuApi}/skillStore/share/create`,
    method: "post",
    data: { skill_store_id },
  });
}

/** 凭口令查看的技能详情 GET …/skillStore/share/info */
export interface SkillShareInfo {
  id: number;
  uid: number;
  name: string;
  explain: string;
  version: string;
  category_id: number;
  category_name?: string;
  sub_category_id?: number;
  sub_category_name?: string;
  source: 0 | 1;
  recommend_flag?: 0 | 1;
  scope: 1 | 2 | 3;
  review_status: 0 | 1;
  review_at?: string | null;
  filename: string;
  file_md5: string;
  status: 1 | 3;
  is_bound: boolean;
  created_at: string;
  updated_at: string;
}

/** 凭口令查看技能详情 GET …/skillStore/share/info */
export function getSkillShareInfo(code: string) {
  return request({
    url: `${zhifuApi}/skillStore/share/info`,
    method: "get",
    params: { code },
  });
}

/** 凭口令添加到我的技能 POST …/skillStore/share/bind */
export function bindSkillByShare(code: string) {
  return request({
    url: `${zhifuApi}/skillStore/share/bind`,
    method: "post",
    data: { code },
  });
}

/* ---------------- 定时任务 ---------------- */

export type ScheduledFrequency = "once" | "daily" | "weekly";
export type ScheduledRunStatus =
  | "running"
  | "pending"
  | "success"
  | "error"
  | "partial"
  | "unverified"
  | "cancelled";
export type PushPlatform = "feishu" | "wechat" | "wecom";

/** 定时任务绑定的店铺，字段与对话中的店铺选择一致 */
export interface ScheduledShop {
  id: number | string;
  name: string;
  platform?: string;
  account?: string;
  logo?: string;
}

export interface ScheduledTaskRun {
  runAt: number;
  startedAt?: number | null;
  completedAt?: number;
  status: ScheduledRunStatus;
  result: string;
  diagnostics?: {
    artifacts?: { id: string; name: string; status: "done"; input: any; output: any }[];
  };
  /** 每家店铺的执行结果 */
  shops?: { id: string | number; name: string; status: string }[];
}

export interface ScheduledTask {
  id?: string;
  /** 创建该任务的登录账号。仅在对应账号的任务列表中展示 */
  accountId?: string;
  title: string;
  prompt: string;
  workspace: string;
  skillNames: string[];
  /** 执行时使用的店铺，结构与对话中的已选店铺一致 */
  shops?: ScheduledShop[];
  autoCloseShops?: boolean;
  pushPlatforms: PushPlatform[];
  frequency: ScheduledFrequency;
  /** YYYY-MM-DD，frequency 为 once 时使用 */
  date: string;
  /** HH:mm */
  time: string;
  /** 0-6，0 为周日 */
  weekdays: number[];
  /** 当前账号希望它执行。换到其他账号时 enabled 会被关掉，这个值保留 */
  ownerEnabled?: boolean;
  enabled: boolean;
  createdAt?: number;
  updatedAt?: number;
  lastRunAt?: number;
  lastStatus?: ScheduledRunStatus;
  lastResult?: string;
  /** 任务仍在执行时的进度文本 */
  progress?: string;
  unread?: boolean;
  runs?: ScheduledTaskRun[];
}

function parseMallExts(value: unknown): ScheduledShop[] {
  let raw = value;
  if (typeof raw === "string") {
    const text = raw.trim();
    if (!text) return [];
    try {
      raw = JSON.parse(text);
    } catch {
      return [];
    }
  }
  return normalizeTaskShops(raw);
}

/** 列表里的 mall_exts 还原成页面使用的 shops */
export function normalizeScheduledTask(raw: Record<string, any>): ScheduledTask {
  const { mall_exts: mallExts, ...task } = raw;
  let metadata = mallExts ?? task.shops;
  if (typeof metadata === "string") {
    try {
      metadata = JSON.parse(metadata);
    } catch {
      metadata = [];
    }
  }
  const autoCloseShops =
    task.autoCloseShops === true ||
    (Array.isArray(metadata) && metadata.some((shop) => shop.autoCloseAfterTask === true));
  return { ...task, autoCloseShops, shops: parseMallExts(mallExts ?? task.shops) } as ScheduledTask;
}

/* ---------------- 消息通道 ---------------- */

/** 与大模型管理消息通道 categoryId 保持一致：1=飞书，4=微信，5=企业微信 */
export type MessageChannelCategoryId = 1 | 4 | 5;

export interface MessageChannelConfig {
  categoryId: MessageChannelCategoryId;
  appId: string;
  /** 提交时填写新值；读取时为空，以 hasAppSecret 判断是否已保存 */
  appSecret: string;
  hasAppSecret: boolean;
  enabled: boolean;
  accountId?: string;
  /** 微信 iLink 接口地址 */
  baseurl?: string;
  /** 微信 iLink 用户 ID */
  ilink_user_id?: string;
}

export interface MessageChannelSettings {
  channelConfigList: MessageChannelConfig[];
}

/** 获取消息通道配置 GET …/config/channel/list */
export function getMessageChannelConfig() {
  return request({
    url: `${zhifuApi}/config/channel/list`,
    method: "get",
  });
}

/** 增量保存消息通道配置 POST …/config/channel/save */
export function saveMessageChannelConfig(data: MessageChannelSettings) {
  return request({
    url: `${zhifuApi}/config/channel/save`,
    method: "post",
    data,
  });
}

/* ---------------- 设置 ---------------- */

export type ApiProtocol = "chat" | "responses";
export type ReasoningEffort = "low" | "medium" | "high" | "xhigh";

export interface AgentSettings {
  providerId: string;
  providerName: string;
  modelId: string;
  baseUrl: string;
  apiProtocol: ApiProtocol;
  /** 模型接口或模型设置写入。不属于通用设置，保存后内存清空，以 hasApiKey 判断是否已保存 */
  apiKey: string;
  hasApiKey: boolean;
  clearApiKey?: boolean;
  reasoningEffort: ReasoningEffort;
  /** 显示名称、工作区、并发和超时只读写本机 */
  userName: string;
  agentName: string;
  workspace?: string;
  /** 同时执行的店铺数，1～8，默认 2 */
  shopConcurrency: number;
  /** 本机会话并发数，1～8，默认 2 */
  conversationConcurrency: number;
  /** 单店任务超时分钟数，1～120，默认 10 */
  executionTimeoutMinutes: number;
}

/** SuperPower AI模型网关账号 GET …/model/user，市场模型共用这一套密钥和地址 */
export interface ZhifuModelUser {
  username?: string;
  api_key?: string;
  api_url?: string;
}

export function getZhifuModelUser() {
  return request({
    url: `${zhifuApi}/model/user`,
    method: "get",
  });
}

/** GET /api/v1/zhifu/model/market/models 官方模型列表 */
export interface ZhifuMarketModel {
  protocol?: ApiProtocol;
  /** 模型入口 ID，对话时作为 model 传入 */
  id?: string;
  /** 模型名称 */
  name?: string;
  /** 模型描述 */
  description?: string;
  /** 计费方式，目前固定为包月 */
  billing_type?: string;
}

export function getZhifuMarketModels() {
  return request({
    url: `${zhifuApi}/model/market/models`,
    method: "get",
  });
}

/** POST /api/v1/zhifu/model/consume/records 请求体 */
export interface ZhifuConsumeRecordsBody {
  /** 模型名称，对应记录里的 model */
  model?: string;
  /** 开始时间，秒级时间戳，当天 00:00:00 */
  start_at?: number;
  /** 结束时间，秒级时间戳，当天 23:59:59 */
  end_at?: number;
  page?: number;
  limit?: number;
}

/** 单条模型消费记录 */
export interface ZhifuConsumeRecord {
  id?: number;
  request_id?: string;
  /** 模型名称 */
  model?: string;
  input_tokens?: number;
  output_tokens?: number;
  quota?: number;
  created_at?: string;
  subscription_id?: number;
}

/** 消费记录列表响应 data */
export interface ZhifuConsumeRecordsResp {
  total?: number;
  list?: ZhifuConsumeRecord[];
}

/** 模型消费记录 */
export function postZhifuModelConsumeRecords(data: ZhifuConsumeRecordsBody) {
  return request({
    url: `${zhifuApi}/model/consume/records`,
    method: "post",
    data,
  });
}
