import request from "@/ai/utils/request";

const desktopApi = "api/v1/model/device";


const zhifuModelApi = "api/v1/zhifu/model";


/** GET /api/v1/zhifu/model/subscription/list 单条订阅 */
export interface ModelSubscriptionItem {
  unlimited?: boolean;
  order_no?: string;
  /** 开通后的订阅 ID。与活动信息里的 subscription_id 相同则为试用套餐 */
  subscription_id?: number;
  plan_type?: number;
  /** 套餐名称，如「月版」 */
  name?: string;
  /** 当前周期总额度 */
  total_amount?: number;
  /** 当前周期已使用额度 */
  used_amount?: number;
  /** 当前周期剩余额度 */
  remain_amount?: number;
  /** active 生效中、expired 已过期、cancelled 已取消 */
  status?: string;
  /** 官方模型套餐 ID，对应套餐列表 id。部分响应放在 plan_id */
  plan_id?: number;
  start_at?: string | null;
  /** 权益到期时间 */
  end_at?: string | null;
  cycle_end_at?: string | null;
  quota_reset_period?: string;
  last_reset_at?: string | null;
  next_reset_at?: string | null;
}


/**
 * 查询当前用户模型订阅。
 * 未开户或无订阅时 data 为 []；已过期、已取消的记录不能按已订阅展示。
 */
export function getModelSubscriptionList() {
  return request({
    url: `${zhifuModelApi}/subscription/list`,
    method: "get",
  });
}


/** GET /api/v1/zhifu/model/activity/info 试用活动 */
export interface ModelActivityInfo {
  unlimited?: boolean;
  /** 当前是否有上架且处于领取时间内的活动 */
  enabled?: boolean;
  /** 官方模型套餐 ID */
  plan_id?: number;
  /** 活动名称 */
  name?: string;
  /** 赠送天数 */
  duration_days?: number;
  /** 活动总额度 */
  total_amount?: number;
  /** 当前用户是否可以领取 */
  can_claim?: boolean;
  /** 不可领取原因 */
  reason?: string;
  /** 未领取为 null；0 待处理、1 处理中、2 成功、3 作废 */
  grant_status?: number | null;
  /** 领取后生成的活动订单号 */
  order_no?: string;
  /** 开通后的订阅 ID */
  subscription_id?: number;
  /** 实际权益开始时间 */
  start_at?: string | null;
  /** 实际权益到期时间 */
  end_at?: string | null;
}


export function getModelActivityInfo() {
  return request({
    url: `${zhifuModelApi}/activity/info`,
    method: "get",
  });
}


/** POST /api/v1/zhifu/model/activity/claim 领取试用 */
export function postModelActivityClaim() {
  return request({
    url: `${zhifuModelApi}/activity/claim`,
    method: "post",
    data: {},
  });
}


/** GET /api/v1/zhifu/model/plan/list 套餐计划 */
export interface ModelPlanItem {
  unlimited?: boolean;
  id: number;
  name?: string;
  /** 售价，人民币分 */
  price?: number;
  /** 划线原价，人民币分。与 discount 同时有效时才展示 */
  display_price?: number;
  /** 展示折扣，如 3 表示 3 折；0 表示不展示划线价 */
  discount?: number;
  /** 每个额度周期的总额度 */
  total_amount?: number;
  /** month 月、year 年 */
  duration_unit?: string;
  duration_value?: number;
  quota_reset_period?: string;
}


/** 套餐计划列表。无可用套餐时 data 为 [] */
export function getModelPlanList() {
  return request({
    url: `${zhifuModelApi}/plan/list`,
    method: "get",
  });
}


/** POST /api/v1/zhifu/model/order/create */
export interface ModelOrderCreateBody {
  plan_id: number;
  /** 同一次购买重试保持不变 */
  request_id: string;
  /** 1 支付宝、4 微信 */
  pay_type: 1 | 4;
  /** 模型套餐优惠券，类型 9；不使用时不传 */
  coupon_sn?: string;
}


/** 创建订单 / 查询订单共用的订单字段 */
export interface ModelOrderInfo {
  order_no?: string;
  plan_id?: number;
  name?: string;
  price?: number;
  pay_amount?: number;
  pay_type?: number;
  pay_url?: string;
  /** 0 创建中、1 待支付、2 已支付、3 失败 */
  pay_status?: number;
  /** 0 待开通、1 开通中、2 已开通、3 已取消、4 创建失败 */
  grant_status?: number;
  subscription_id?: number;
  total_amount?: number;
  start_at?: string | null;
  end_at?: string | null;
  expected_end_at?: string | null;
  created_at?: string;
}


/** 创建模型套餐购买订单 */
export function postModelOrderCreate(data: ModelOrderCreateBody) {
  return request({
    url: `${zhifuModelApi}/order/create`,
    method: "post",
    data,
  });
}


/** POST /api/v1/zhifu/model/subscription/renew 续费当前订阅 */
export function postModelSubscriptionRenew(data: ModelOrderCreateBody) {
  return request({
    url: `${zhifuModelApi}/subscription/renew`,
    method: "post",
    data,
  });
}


/** GET /api/v1/zhifu/model/order/info */
export function getModelOrderInfo(params: { order_no: string }) {
  return request({
    url: `${zhifuModelApi}/order/info`,
    method: "get",
    params,
  });
}

//api厂商列表
export function apiProvider(params?: any) {
  return request({
    url: `${desktopApi}/apiProvider/list`,
    method: "get",
    params,
  });
}

//查询自有模型
export function queryUserModelImportedApi(params?: any) {
  return request({
    url: `${desktopApi}/config/userImported`,
    method: "get",
    params,
  });
}


// 删除自有导入模型
export function deleteUserModelImportedApi(data: any) {
  return request({
    url: `${desktopApi}/config/userImported/delete`,
    method: "post",
    data,
  });
}

//新增自有导入模型
export function createUserModelImportedApi(data: any) {
  return request({
    url: `${desktopApi}/config/userImported/create`,
    method: "post",
    data,
  });
}

//编辑自由模型
export function updateUserModelImportedApi(data: any) {
  return request({
    url: `${desktopApi}/config/userImported/update`,
    method: "post",
    data,
  });
}


/** 拉取自定义基础 URL 下的模型列表
 * POST /api/v1/model/device/config/userImported/models
 * 后台请求 GET {apiUrl}/models，apiKey 有值时带 Authorization: Bearer {apiKey}
 * 成功时 data 为上游原样返回，常见为 { data: [{ id }] }，也可能是模型 ID 字符串数组
 */
export interface RemoteModelListBody {
  apiUrl: string;
  apiKey?: string;
}


export async function queryRemoteModelListApi(data: RemoteModelListBody): Promise<{errorCode: number;data?: unknown;message?: string}> {
  const bridge = (window as any).localflow;
  if (!bridge?.queryModels) throw new Error('请在 SuperPower Browser 客户端中查询模型');
  return bridge.queryModels(data);
}