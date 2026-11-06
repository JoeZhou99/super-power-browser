import { computed, ref } from "vue";
import {
  getModelActivityInfo,
  getModelSubscriptionList,
  postModelActivityClaim,
  type ModelActivityInfo,
  type ModelSubscriptionItem,
} from "@/ai/api/modelManage";

const activity = ref<ModelActivityInfo | null>(null);
const subscriptions = ref<ModelSubscriptionItem[]>([]);

function unwrapSubscriptions(data: unknown): ModelSubscriptionItem[] {
  if (Array.isArray(data)) return data as ModelSubscriptionItem[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.list)) return record.list as ModelSubscriptionItem[];
    if (Array.isArray(record.items)) return record.items as ModelSubscriptionItem[];
    if ("name" in record || "status" in record || "end_at" in record) {
      return [record as ModelSubscriptionItem];
    }
  }
  return [];
}

function sameId(left?: number | null, right?: number | null) {
  const a = Number(left);
  const b = Number(right);
  return Number.isFinite(a) && Number.isFinite(b) && a > 0 && a === b;
}

/**
 * 模型套餐的订阅和试用活动。活动信息和订阅列表一起查。
 * 试用开通后仍是一条生效订阅，用 subscription_id 对上活动里的订阅 ID。
 * 按钮继续显示订阅，提交订单走续费。
 */
export function useModelPlanAccess() {
  const activeList = computed(() =>
    subscriptions.value.filter((item) => item?.status === "active")
  );

  /** 当前生效订阅就是已领取的试用套餐 */
  const claimedTrial = computed(() => {
    const trialId = activity.value?.subscription_id;
    return activeList.value.some((item) => sameId(item.subscription_id, trialId));
  });

  /** 正式订阅优先。只有试用时，这条试用订阅就是当前套餐 */
  const activeSubscription = computed(() => {
    const trialId = activity.value?.subscription_id;
    const paid = activeList.value.find((item) => !sameId(item.subscription_id, trialId));
    return paid ?? activeList.value[0] ?? null;
  });

  const showTrial = computed(
    () => activity.value?.enabled === true && activity.value?.can_claim === true
  );

  /** 正式订阅才展示续费。试用套餐继续显示去订阅 */
  const showAsSubscribed = computed(() => {
    const current = activeSubscription.value;
    if (!current) return false;
    return !sameId(current.subscription_id, activity.value?.subscription_id);
  });

  /** 已有订阅（含试用）时，订购弹窗提交走续费接口 */
  const useRenewApi = computed(() => !!activeSubscription.value);

  const claiming = ref(false);

  async function refresh() {
    const [activityRes, subscriptionRes] = await Promise.all([
      getModelActivityInfo().catch(() => null),
      getModelSubscriptionList().catch(() => null),
    ]);
    activity.value = (activityRes?.data as ModelActivityInfo | null) ?? null;
    subscriptions.value = unwrapSubscriptions(subscriptionRes?.data);
  }

  /** 领取试用。成功后重新拉取活动信息和订阅列表 */
  async function claimTrial() {
    if (claiming.value || !showTrial.value) return false;
    claiming.value = true;
    try {
      await postModelActivityClaim();
      await refresh();
      return true;
    } catch {
      return false;
    } finally {
      claiming.value = false;
    }
  }

  return {
    activity,
    activeSubscription,
    showTrial,
    claimedTrial,
    showAsSubscribed,
    useRenewApi,
    claiming,
    refresh,
    claimTrial,
  };
}
