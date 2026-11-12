<template>
  <div
    v-loading="loading"
    :class="['plan-buy', { 'plan-buy--single': isSingleLayout, 'plan-buy--embedded': embedded }]"
  >
    <header class="plan-buy__header">
      <div>
        <h2>{{ t("model.modelPlanBuyTitle") }}</h2>
        <p>{{ t("model.modelPlanCurrent", { name: currentPlanName }) }}</p>
      </div>
      <button type="button" class="plan-buy__close" @click="backHandle">
        <el-icon><Close /></el-icon>
      </button>
    </header>

    <div v-if="!isSingleLayout && planList.length" class="plan-periods">
      <button
        v-for="item in periodOptions"
        :key="item.value"
        type="button"
        :class="{ 'is-active': period === item.value }"
        @click="selectPeriod(item.value)"
      >
        {{ item.label }}
      </button>
    </div>

    <div v-if="visiblePlans.length" class="plan-list">
      <button
        v-for="plan in visiblePlans"
        :key="plan.id"
        type="button"
        :class="['plan-card', selectedPlanId === plan.id ? 'is-active' : '']"
        @click="selectedPlanId = plan.id"
      >
        <div class="plan-card__top">
          <div class="plan-card__info">
            <div class="plan-card__name">
              <span>{{ plan.name || "-" }}</span>
              <span v-if="planDiscount(plan)" class="plan-card__launch">
                <img :src="launchDiscountIcon" alt="" />
                {{ t("model.modelPlanLaunchDiscount", { discount: planDiscount(plan) }) }}
              </span>
            </div>
            <div class="plan-card__desc">
              <span class="is-highlight">{{ plan.unlimited ? t("model.modelPlanQuotaHighlight") : `${Number(plan.total_amount || 0).toLocaleString()} Tokens` }}</span>
              {{ t("model.modelPlanQuotaDesc") }}
            </div>
          </div>
          <div class="plan-card__price">
            <span class="plan-card__amount">¥{{ formatYuan(plan.price) }}</span>
            <span v-if="hasListPrice(plan)" class="plan-card__origin">
              ¥{{ formatYuan(plan.display_price) }}
            </span>
          </div>
        </div>
        <ul class="plan-card__features">
          <li>
            <el-icon class="i-svg:monthlyToken plan-card__icon"></el-icon>
            <span>{{ plan.unlimited ? t("model.modelPlanBaseQuota") : `套餐额度 ${Number(plan.total_amount || 0).toLocaleString()} Tokens` }}</span>
          </li>
          <li>
            <el-icon class="i-svg:scheduledTask plan-card__icon"></el-icon>
            <span>{{ t("model.modelPlanScheduled") }}</span>
          </li>
          <li>
            <el-icon class="i-svg:allModels plan-card__icon"></el-icon>
            <span>{{ t("model.modelPlanAllModels") }}</span>
          </li>
        </ul>
        <btnIcon v-if="selectedPlanId === plan.id" class="plan-card__check" />
      </button>
    </div>
    <el-empty v-else :description="t('company.no_data')" />

    <template v-if="couponCount">
      <h3 class="plan-buy__section">{{ t("commonWord.coupon") }}</h3>
      <div class="plan-coupon">
        <CouponDialog
          ref="couponRef"
          :coupon-type="9"
          :current-select="couponSn"
          @coupon-info="handleSelectCoupon"
        />
      </div>
    </template>

    <div v-if="cheaperList.length" class="plan-discount">
      <button type="button" class="plan-discount__bar" @click="discountOpen = !discountOpen">
        <span class="plan-discount__summary">
          <span>{{ t("model.modelPlanDiscount") }}：</span>
          <span v-if="hasOfferSelected" class="plan-discount__hint">
            {{ t("agentIp.autoBestCoupon") }}
          </span>
          <span v-if="discountAmount" class="plan-discount__amount">
            {{ discountType === 1 ? t("commonWord.coupon") : t("mall.discount")
            }}{{ t("agentIp.discount") }}：-￥{{ discountAmount }}
          </span>
        </span>
        <span class="plan-discount__toggle">
          {{ t("mall.viewOtherDiscounts") }}
          <el-icon>
            <ArrowUp v-if="discountOpen" />
            <ArrowDown v-else />
          </el-icon>
        </span>
      </button>
      <ul v-show="discountOpen" class="plan-discount__list">
        <li v-for="(item, index) in cheaperList" :key="`${item.coupon_sn || 'discount'}-${index}`">
          <div class="plan-discount__price">
            <p>
              <span>￥</span>
              {{ item.coupon_amount }}
            </p>
            <p>{{ item.activity_name }}</p>
          </div>
          <div class="plan-discount__info">
            <p v-if="item.type === 0">
              {{ t("mall.purchaseDuration") }}{{ selectedPlan ? durationText(selectedPlan) : "" }}，
              <span>{{ t("mall.discountOffer") }}：￥{{ item.coupon_amount }}</span>
            </p>
            <p v-else>
              <span v-if="item.range === 3">{{ t("commonWord.universal") }}</span>
              <span v-else-if="item.range === 9">{{ t("mall.modelPlanOnly") }}</span>
              <span v-else-if="item.range === 1">{{ t("wxwProxy.deviceApplicable") }}</span>
              <span class="plan-discount__limit">，{{ t("mall.couponUsageRestriction") }}</span>
            </p>
            <p class="plan-discount__time">
              {{ t("mall.validityPeriod") }}：{{
                item.type === 0 ? item.collection_at_string : item.collection_at
              }}-{{ item.type === 0 ? item.expire_at_string : item.expire_at }}
            </p>
          </div>
          <div class="plan-discount__pick">
            <img v-if="index === 0" class="plan-discount__recommend" :src="recommendImg" alt="" />
            <img
              v-if="isOfferSelected(item, index)"
              class="plan-discount__check"
              src="@/ai/assets/icons/selected.png"
              alt=""
              @click="clearDiscount"
            />
            <img
              v-else
              class="plan-discount__check"
              src="@/ai/assets/icons/noSelect.png"
              alt=""
              @click="chooseDiscount(index)"
            />
          </div>
        </li>
      </ul>
    </div>

    <h3 class="plan-buy__section">{{ t("agentIp.payment_method") }}</h3>
    <div class="pay-list">
      <button
        v-if="aliShow"
        type="button"
        :class="['pay-card', currentPayType.includes(1) ? 'is-active' : '']"
        @click="togglePayType(1)"
      >
        <img :src="alipay3Png" alt="" />
        <div class="pay-card__text">
          <div class="pay-card__title">{{ t("mall.alipay") }}</div>
          <p>Alipay</p>
        </div>
        <btnIcon v-if="currentPayType.includes(1)" class="pay-card__check" />
      </button>
      <button
        v-if="wxShow"
        type="button"
        :class="['pay-card', currentPayType.includes(4) ? 'is-active' : '']"
        @click="togglePayType(4)"
      >
        <img :src="wechatLogo" alt="" />
        <div class="pay-card__text">
          <div class="pay-card__title">{{ t("wxwProxy.wechatPay") }}</div>
          <p>Wechat pay</p>
        </div>
        <btnIcon v-if="currentPayType.includes(4)" class="pay-card__check" />
      </button>
    </div>

    <p v-if="!loading && !aliShow && !wxShow && payableYuan > 0" class="pay-unavailable">支付渠道暂未开通</p>

    <div class="plan-buy__submit">
      <el-button
        type="primary"
        :loading="submitLoading"
        :disabled="!hasPerm('ai.purchase') || !selectedPlan || (!aliShow && !wxShow && payableYuan > 0)"
        @click="submitOrder"
      >
        {{ t("wxwProxy.submitOrder") }}
      </el-button>
      <el-checkbox v-model="agreeChecked" :disabled="!selectedPlan">
        <div v-if="agreeTip && !agreeChecked" class="agree-tip">
          {{ t("wxwProxy.agreementCheckNotice") }}
        </div>
        {{ t("model.modelPlanAgreePrefix") }}
        <a class="event" @click.stop.prevent="serviceDialogVisible = true">
          {{ t("model.modelPlanAgreementService") }}
        </a>
        、
        <a class="event" @click.stop.prevent="noticeDialogVisible = true">
          {{ t("model.modelPlanAgreementNotice") }}
        </a>
      </el-checkbox>
    </div>

    <el-dialog
      v-model="payDialogVisible"
      append-to-body
      class="plan-pay-dialog"
      width="380px"
      :show-close="true"
      :close-on-click-modal="false"
      :before-close="handlePayBeforeClose"
      @closed="handlePayClosed"
    >
      <div class="pay-panel">
        <div class="pay-panel__label">{{ t("model.modelPlanPayAmount") }}</div>
        <div class="pay-panel__amount">¥ {{ payableText }}</div>
        <p v-if="payCouponCut" class="pay-panel__coupon">
          {{ t("mall.couponDiscountAmount") }}：-¥{{ payCouponCut }}
        </p>
        <template v-if="orderLink">
          <div class="pay-panel__code">
            <qrcode-vue :size="168" :value="orderLink" :logo="qrLogo" />
          </div>
          <p class="pay-panel__hint">{{ t("model.modelPlanPayScan", { name: scanName }) }}</p>
        </template>
        <div class="pay-panel__meta">
          <div class="pay-panel__row">
            <span>{{ t("model.modelPlanPayProduct") }}</span>
            <span>{{ payProductName }}</span>
          </div>
          <div class="pay-panel__row">
            <span>{{ t("model.modelPlanPayScheme") }}</span>
            <span>{{ paySchemeText }}</span>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dialog
      v-model="serviceDialogVisible"
      append-to-body
      class="plan-agreement-dialog"
      :title="t('model.modelPlanAgreementService')"
      width="560px"
    >
      <p>{{ t("model.modelWalletPackageIntro") }}</p>
    </el-dialog>
    <el-dialog
      v-model="noticeDialogVisible"
      append-to-body
      class="buyInstructionsDialog"
      width="720px"
    >
      <template #header>
        <span>{{ t("Buy.modelDevicePurchaseNoticeTitle") }}</span>
      </template>
      <div class="tip">
        <p>{{ t("Buy.model1PurchasePolicy") }}</p>
        <p>{{ t("Buy.model2DeviceAllocationTime") }}</p>
        <p>{{ t("Buy.modelLiuLanQi") }}</p>
        <p>{{ t("Buy.model4DeviceInfoNotice") }}</p>
        <p>{{ t("Buy.model5DeviceUsage") }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script lang="ts">
export default {
  name: "ModelPlanBuyPanel",
};
</script>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { ArrowDown, ArrowUp, Close } from "@element-plus/icons-vue";
import qrcodeVue from "@chenfengyuan/vue-qrcode";
import alipay3Png from "@/ai/assets/icons/alipay3.png";
import wechatLogo from "@/ai/assets/icons/wechatLogo.png";
import wxPayPng from "@/ai/assets/icons/wxPay.png";
import recommendImg from "@/ai/assets/icons/recommend.png";
import launchDiscountIcon from "@/ai/assets/icons/launchDiscount.svg";
import btnIcon from "@/ai/components/btnIcon/btnIcon.vue";
import CouponDialog from "@/ai/components/coupon/coupon.vue";
import { getAllCoupon, getAllCouponAndDiscount, getInfoByKey } from "@/ai/api/agentIp";
import {
  getModelOrderInfo,
  getModelPlanList,
  postModelOrderCreate,
  postModelSubscriptionRenew,
  type ModelOrderInfo,
  type ModelPlanItem,
} from "@/ai/api/modelManage";
import { useModelPlanAccess } from "@/ai/views/modelManage/composables/useModelPlanAccess";
import { useAppStore } from "@/ai/store/modules/app.store";
import { hasPerm } from "@/ai/utils/permission";

const props = defineProps<{
  /**
   * 续费时传入官方模型套餐 ID（订阅 plan_id，或与套餐列表 id 相同的 subscription_id）。
   * 对不上时再用 planName 按名称匹配。
   */
  planId?: number | null;
  /** 当前订阅套餐名称，编号对不上时用来匹配套餐计划 */
  planName?: string;
  /** 在弹窗里打开时收紧高度，订购和续费共用这一套样式 */
  embedded?: boolean;
  /** 已有订阅（含试用）时走续费接口。试用中不传套餐，页面仍是订购布局 */
  useRenewApi?: boolean;
}>();

const emit = defineEmits<{
  close: [];
  success: [];
}>();

/** 传入套餐时是续费卡片。试用中不传套餐，仍展示订购页。 */
const isSingleLayout = computed(() => props.planId != null || !!props.planName?.trim());
const planAccess = useModelPlanAccess();
/** 正式续费或试用转正，都调用续费接口 */
const shouldRenew = computed(
  () => isSingleLayout.value || props.useRenewApi || planAccess.useRenewApi.value
);

const { t } = useI18n();
const appStore = useAppStore();

const loading = ref(false);
const submitLoading = ref(false);
type PlanPeriod = "month" | "quarter" | "year";

const planList = ref<ModelPlanItem[]>([]);
const period = ref<PlanPeriod>("month");
const selectedPlanId = ref<number | null>(null);
const currentPlanName = ref(t("model.modelPlanNone"));
const currentPayType = ref<(1 | 4)[]>([]);
const aliShow = ref(false);
const wxShow = ref(false);
const agreeChecked = ref(false);
const agreeTip = ref(false);
const serviceDialogVisible = ref(false);
const noticeDialogVisible = ref(false);
const payDialogVisible = ref(false);
const skipPayCloseConfirm = ref(false);
/** 支付成功要等支付弹窗关完，再通知外层页面刷新并关闭续费弹窗 */
const closePayThenSuccess = ref(false);
const orderLink = ref("");
const payOrderSn = ref("");
const payableText = ref("0.00");
const orderEndAt = ref("");
const requestId = ref(createRequestId());
let agreeTipTimer: ReturnType<typeof setTimeout> | null = null;

const periodOptions = computed(() => [
  { value: "month" as const, label: t("model.modelPlanTabMonth") },
  { value: "quarter" as const, label: t("model.modelPlanTabQuarter") },
  { value: "year" as const, label: t("model.modelPlanTabYear") },
]);

const visiblePlans = computed(() => {
  if (isSingleLayout.value) return planList.value;
  return planList.value.filter((item) => planPeriod(item) === period.value);
});

const selectedPlan = computed(
  () => visiblePlans.value.find((item) => item.id === selectedPlanId.value) ?? null
);

const orderTotalYuan = computed(() =>
  selectedPlan.value ? Number(selectedPlan.value.price || 0) / 100 : 0
);
const couponRef = ref<{
  setNotUseDiscount?: (unused: boolean) => void;
  refreshCoupons?: () => Promise<void>;
} | null>(null);
const couponSn = ref("");
const couponAmount = ref(0);
const couponCount = ref(0);
const cheaperList = ref<DiscountOffer[]>([]);
const discountOpen = ref(true);
const discountType = ref<number | null>(null);
const discountAmount = ref(0);
const selectedDiscountIndex = ref(-1);
/** 券或设备优惠的抵扣额，单位元。折扣和优惠券不同时扣 */
const payableYuan = computed(() => {
  const cut = discountType.value === 0 ? discountAmount.value : couponAmount.value;
  return Math.max(0, orderTotalYuan.value - Number(cut || 0));
});
const payCouponCut = computed(() => {
  if (discountType.value !== 1) return "";
  const amount = Number(couponAmount.value || 0);
  if (!amount) return "";
  return Number.isInteger(amount) ? String(amount) : amount.toFixed(2);
});


const scanName = computed(() =>
  currentPayType.value.includes(4) ? t("money.weixin") : t("money.zhifubao")
);

const qrLogo = computed(() => (currentPayType.value.includes(4) ? wxPayPng : alipay3Png));

const payProductName = computed(() => {
  const name = selectedPlan.value?.name?.trim() || "-";
  return name.endsWith("套餐") ? name : `${name}套餐`;
});

const paySchemeText = computed(() => {
  const plan = selectedPlan.value;
  if (!plan) return "-";
  return t("model.modelPlanPaySchemeValue", {
    duration: durationText(plan),
    price: formatYuan(plan.price),
    date: orderEndAt.value || expireDateText(plan),
  });
});


watch(selectedPlanId, () => {
  requestId.value = createRequestId();
  setDefaultPayType();
  void loadDiscounts();
});

function createRequestId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseNum(value: unknown) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatYuan(cents: number | undefined) {
  const yuan = parseNum(cents) / 100;
  return Number.isInteger(yuan) ? String(yuan) : yuan.toFixed(2);
}

function hasListPrice(plan: ModelPlanItem) {
  const origin = parseNum(plan.display_price);
  return origin > 0 && planDiscount(plan) > 0;
}

function planDiscount(plan: ModelPlanItem) {
  const discount = parseNum(plan.discount);
  return discount > 0 ? discount : 0;
}

function durationMonths(plan: ModelPlanItem) {
  const value = parseNum(plan.duration_value);
  return plan.duration_unit === "year" ? value * 12 : value;
}

function planPeriod(plan: ModelPlanItem): PlanPeriod | null {
  const months = durationMonths(plan);
  if (months >= 12) return "year";
  if (months >= 6) return null;
  if (months >= 3) return "quarter";
  return "month";
}

function pickDefaultPeriod(list: ModelPlanItem[]) {
  const periods = new Set(
    list.map((item) => planPeriod(item)).filter((item): item is PlanPeriod => !!item)
  );
  const order: PlanPeriod[] = ["month", "quarter", "year"];
  period.value = order.find((item) => periods.has(item)) || "month";
}

function selectPeriod(value: PlanPeriod) {
  period.value = value;
  selectedPlanId.value = visiblePlans.value[0]?.id ?? null;
  requestId.value = createRequestId();
}

function durationText(plan: ModelPlanItem) {
  return t("model.modelPlanDuration", { count: durationMonths(plan) });
}

function expireDateText(plan: ModelPlanItem, endAt?: string | null) {
  if (endAt) return endAt.slice(0, 10);
  const date = new Date();
  const day = date.getDate();
  date.setMonth(date.getMonth() + durationMonths(plan));
  if (date.getDate() < day) date.setDate(0);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const dateText = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${dateText}`;
}

function unwrapList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  if (data && typeof data === "object") {
    const record = data as Record<string, unknown>;
    if (Array.isArray(record.list)) return record.list as T[];
    if (Array.isArray(record.items)) return record.items as T[];
  }
  return [];
}

function getAvailableOnlinePayType() {
  if (aliShow.value) return 1;
  if (wxShow.value) return 4;
  return 0;
}

function setDefaultPayType() {
  const channel = getAvailableOnlinePayType();
  currentPayType.value = channel ? [channel] : [];
}

function getApiPayType(): 0 | 1 | 4 {
  if (currentPayType.value.includes(1) && aliShow.value) return 1;
  if (currentPayType.value.includes(4) && wxShow.value) return 4;
  return payableYuan.value === 0 ? 1 : 0;
}

function togglePayType(value: 1 | 4) {
  currentPayType.value = [value];
  requestId.value = createRequestId();
}

interface DiscountOffer {
  type?: number;
  coupon_amount?: number | string;
  coupon_sn?: string;
  activity_name?: string;
  range?: number;
  collection_at?: string;
  expire_at?: string;
  collection_at_string?: string;
  expire_at_string?: string;
}

function sameSn(left?: string | number, right?: string | number) {
  return String(left ?? "") === String(right ?? "");
}

function applyCoupon(coupon?: { coupon_sn?: string; coupon_amount?: number | string }) {
  const nextSn = String(coupon?.coupon_sn || "");
  const nextAmount = nextSn ? Number(coupon?.coupon_amount || 0) : 0;
  if (nextSn === couponSn.value && nextAmount === couponAmount.value) return;
  couponSn.value = nextSn;
  couponAmount.value = Number.isFinite(nextAmount) ? nextAmount : 0;
  requestId.value = createRequestId();
  setDefaultPayType();
}

function applyOffer(index: number, options?: { keepNotUse?: boolean }) {
  const item = cheaperList.value[index];
  if (!item) return;
  selectedDiscountIndex.value = index;
  discountType.value = Number(item.type ?? 0);
  discountAmount.value = Number(item.coupon_amount || 0);
  if (discountType.value === 1) applyCoupon(item);
  else applyCoupon();
  if (!options?.keepNotUse) couponRef.value?.setNotUseDiscount?.(false);
}

function chooseDiscount(index: number) {
  applyOffer(index);
}

const hasOfferSelected = computed(
  () =>
    (discountType.value === 1 && !!couponSn.value) ||
    (discountType.value === 0 && selectedDiscountIndex.value >= 0)
);

function isOfferSelected(item: DiscountOffer, index: number) {
  if (discountType.value === 1 && couponSn.value) return sameSn(item.coupon_sn, couponSn.value);
  return selectedDiscountIndex.value === index && discountType.value === 0;
}

function selectPlainDiscount() {
  const index = cheaperList.value.findIndex((item) => Number(item.type) !== 1);
  if (index >= 0) {
    applyOffer(index, { keepNotUse: true });
    return;
  }
  selectedDiscountIndex.value = -1;
  discountType.value = null;
  discountAmount.value = 0;
  applyCoupon();
}

function clearDiscount() {
  selectPlainDiscount();
}

function handleSelectCoupon(val?: {
  data?: { coupon_sn?: string; coupon_amount?: number | string };
}) {
  const coupon = val?.data;
  if (coupon?.coupon_sn) {
    const index = cheaperList.value.findIndex((item) => sameSn(item.coupon_sn, coupon.coupon_sn));
    if (index >= 0) {
      applyOffer(index, { keepNotUse: true });
      return;
    }
    selectedDiscountIndex.value = -1;
    discountType.value = 1;
    discountAmount.value = Number(coupon.coupon_amount || 0);
    applyCoupon(coupon);
    return;
  }
  selectPlainDiscount();
}

/** 类型 9 为模型套餐券，通用券 range=3 也可使用。默认选中第一张可用券 */
async function loadCoupons() {
  try {
    const res: any = await getAllCoupon({ range: 9 });
    const list = Array.isArray(res?.data?.not_use) ? res.data.not_use : [];
    const usable = list.filter((item: {range: number}) => item?.range === 9 || item?.range === 3);
    couponCount.value = usable.length;
    if (!cheaperList.value.length && usable.length) applyCoupon(usable[0]);
  } catch {
    couponCount.value = 0;
    if (!cheaperList.value.length) applyCoupon();
  }
}

/** 设备优惠：与设备购买同一接口，类型传 9 */
async function loadDiscounts() {
  const plan = selectedPlan.value;
  if (!plan) {
    cheaperList.value = [];
    return;
  }
  try {
    const res: any = await getAllCouponAndDiscount({
      type: 9,
      plan_id: plan.id,
      period: durationMonths(plan),
      num: 1,
      buy_or_renewal: shouldRenew.value ? 2 : 1,
      period_type: 0,
    });
    const data = res?.data?.discount_list || res?.data;
    cheaperList.value = Array.isArray(data) ? data : [];
    if (cheaperList.value.length) chooseDiscount(0);
    else clearDiscount();
  } catch {
    cheaperList.value = [];
    clearDiscount();
  }
}


function showAgreeTip() {
  agreeTip.value = true;
  if (agreeTipTimer) clearTimeout(agreeTipTimer);
  agreeTipTimer = setTimeout(() => {
    agreeTip.value = false;
  }, 3000);
}

function samePlanId(plan: ModelPlanItem, planId: number) {
  return Number(plan.id) === Number(planId);
}

function samePlanName(plan: ModelPlanItem, planName: string) {
  const current = planName.trim();
  const target = plan.name?.trim() || "";
  if (!current || !target) return false;
  return target === current || target.includes(current) || current.includes(target);
}

/** 续费只保留当前套餐。编号对不上时按名称匹配，避免弹窗空白。 */
function pickRenewPlans(list: ModelPlanItem[]) {
  const renewing = props.planId != null || !!props.planName?.trim();
  if (!renewing) return list;
  if (props.planId != null) {
    const byId = list.filter((item) => samePlanId(item, props.planId as number));
    if (byId.length) return byId;
  }
  const byName = list.filter((item) => samePlanName(item, props.planName || ""));
  return byName.length ? byName : list;
}

async function loadPage() {
  loading.value = true;
  try {
    const [planRes] = await Promise.all([getModelPlanList(), planAccess.refresh()]);
    const list = unwrapList<ModelPlanItem>(planRes?.data);
    planList.value = pickRenewPlans(list);
    if (!isSingleLayout.value) pickDefaultPeriod(planList.value);
    selectedPlanId.value = visiblePlans.value[0]?.id ?? null;
    const active = planAccess.activeSubscription.value;
    currentPlanName.value = active?.name?.trim() || t("model.modelPlanNone");
    setDefaultPayType();
  } catch {
    planList.value = [];
  } finally {
    loading.value = false;
  }
}

function loadPayChannels() {
  getInfoByKey({ key: "payList" }).then((res: any) => {
    const data = res?.data?.contents;
    if (!data) return;
    wxShow.value = Boolean(data.wx);
    aliShow.value = Boolean(data.ali);
    setDefaultPayType();
  }).catch(() => { aliShow.value = false; wxShow.value = false; setDefaultPayType(); });
}

function stopPoll() {
  appStore.clearOrderInterval();
}

function startPoll(orderNo: string) {
  let times = 0;
  appStore.setOrderInterval(async () => {
    times += 1;
    if (times >= 60 || !payOrderSn.value) {
      stopPoll();
      return;
    }
    try {
      const res = await getModelOrderInfo({ order_no: orderNo });
      const data = res?.data as ModelOrderInfo | undefined;
      if (isOrderGranted(data)) {
        finishPaid();
      }
    } catch {
      // 轮询失败时继续等待下一次
    }
  }, 5000);
}

async function createOrder() {
  if (!hasPerm('ai.purchase')) return;
  if (!selectedPlan.value) return;
  const payType = getApiPayType();
  if (!payType) {
    ElMessage.warning(t("agentIp.buy_rule_pay_type"));
    return;
  }
  submitLoading.value = true;
  try {
    const res = await (shouldRenew.value ? postModelSubscriptionRenew : postModelOrderCreate)({
      plan_id: selectedPlan.value.id,
      request_id: requestId.value,
      pay_type: payType,
      ...(couponSn.value ? { coupon_sn: couponSn.value } : {}),
    });
    const data = res?.data as ModelOrderInfo | undefined;
    payOrderSn.value = data?.order_no || "";
    orderEndAt.value = data?.expected_end_at || "";
    if (data?.pay_amount != null) {
      payableText.value = (Number(data.pay_amount) / 100).toFixed(2);
    }
    if (isOrderGranted(data)) {
      finishPaid();
      return;
    }
    orderLink.value = data?.pay_url || "";
    if (orderLink.value) {
      payDialogVisible.value = true;
      if (payOrderSn.value) startPoll(payOrderSn.value);
      return;
    }
    ElMessage.error(res?.message || t("money.payment_failed"));
  } finally {
    submitLoading.value = false;
  }
}

async function submitOrder() {
  if (!selectedPlan.value) return;
  if (!agreeChecked.value) {
    showAgreeTip();
    return;
  }
  await createOrder();
}

function isOrderGranted(data?: ModelOrderInfo) {
  return Number(data?.pay_status) === 2;
}

function finishPaid() {
  stopPoll();
  if (!payDialogVisible.value) {
    void orderClose();
    ElMessage.success(t("commonWord.submitSuccess"));
    emit("success");
    return;
  }
  closePayThenSuccess.value = true;
  skipPayCloseConfirm.value = true;
  payDialogVisible.value = false;
}

function handlePayClosed() {
  if (!closePayThenSuccess.value) return;
  closePayThenSuccess.value = false;
  ElMessage.success(t("commonWord.submitSuccess"));
  emit("success");
}

// function closePayDialog(skipConfirm = false) {
//   skipPayCloseConfirm.value = skipConfirm;
//   payDialogVisible.value = false;
// }

function handlePayBeforeClose(done: () => void) {
  if (skipPayCloseConfirm.value || closePayThenSuccess.value) {
    const notifySuccess = closePayThenSuccess.value;
    skipPayCloseConfirm.value = false;
    closePayThenSuccess.value = false;
    void orderClose();
    done();
    if (notifySuccess) {
      ElMessage.success(t("commonWord.submitSuccess"));
      emit("success");
    }
    return;
  }
  ElMessageBox.confirm(t("agentIp.orderClose"), {
    confirmButtonText: t("globalCommonWord.confirm"),
    cancelButtonText: t("globalCommonWord.cancel"),
    type: "warning",
    showClose: false,
  })
    .then(() => {
      done();
      void orderClose(true);
    })
    .catch(() => {});
}

async function orderClose(refreshAssets = false) {
  stopPoll();
  payOrderSn.value = "";
  orderLink.value = "";
  orderEndAt.value = "";
  requestId.value = createRequestId();
  if (!refreshAssets) return;
  await loadDiscounts();
  await loadCoupons();
  await nextTick();
  await couponRef.value?.refreshCoupons?.();
  setDefaultPayType();
}

function backHandle() {
  if (payDialogVisible.value) {
    payDialogVisible.value = false;
    return;
  }
  emit("close");
}

onMounted(() => {
  loadPayChannels();
  void loadPage();
  void loadCoupons();
});

onBeforeUnmount(() => {
  stopPoll();
  if (agreeTipTimer) clearTimeout(agreeTipTimer);
});
</script>

<style scoped lang="scss">
.plan-buy {
  min-height: calc(100vh - 120px);
  padding: 24px 28px 40px;
  background: #fff;
}

.plan-buy__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 700;
    line-height: 26px;
    color: #1d2129;
  }

  p {
    margin: 4px 0 0;
    font-size: 12px;
    line-height: 18px;
    color: #86909c;
  }
}

.plan-buy__close {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #c9cdd4;
  font-size: 16px;
  cursor: pointer;
}

.plan-list,
.pay-list {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: 16px;
}

.plan-card,
.pay-card {
  position: relative;
  box-sizing: border-box;
  border: 1px solid #e5e6eb;
  border-radius: 10px;
  background: #fff;
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  overflow: hidden;

  &.is-active {
    border-color: var(--el-color-primary);
    box-shadow: 0 0 0 1px var(--el-color-primary);
  }
}

.plan-card {
  flex: 1 1 340px;
  max-width: 380px;
  min-height: 248px;
  padding: 18px 20px 16px;

  &__top {
    display: flex;
    flex-direction: column;
  }

  &__name {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
    color: #1d2129;
  }

  &__launch {
    display: inline-flex;
    gap: 2px;
    align-items: center;
    height: 22px;
    padding: 0 8px 0 4px;
    font-size: 12px;
    font-weight: 500;
    line-height: 22px;
    color: #02bb00;
    white-space: nowrap;
    background: #e8f8e6;
    border-radius: 11px;

    img {
      width: 14px;
      height: 14px;
    }
  }

  &__desc {
    margin-top: 6px;
    font-size: 12px;
    line-height: 18px;
    color: #86909c;

    .is-highlight {
      color: #ff481b;
    }
  }

  &__price {
    display: flex;
    align-items: baseline;
    gap: 2px;
    margin: 16px 0 0;
    padding-bottom: 14px;
    border-bottom: 1px solid #f2f3f5;
  }

  &__amount {
    font-size: 30px;
    font-weight: 700;
    line-height: 36px;
    letter-spacing: -0.4px;
    color: #ff481b;
  }

  &__period {
    font-size: 14px;
    line-height: 20px;
    color: #86909c;
  }

  &__origin {
    margin-left: 8px;
    font-size: 14px;
    font-weight: 400;
    line-height: 20px;
    color: #c9cdd4;
    text-decoration: line-through;
  }

  &__features {
    margin: 4px 0 0;
    padding: 0;
    list-style: none;

    li {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-top: 12px;
      font-size: 13px;
      line-height: 20px;
      color: #4e5969;
      white-space: nowrap;
    }

    .plan-card__icon {
      flex-shrink: 0;
      font-size: 14px;
      color: #86909c;
    }
  }

  &__check {
    position: absolute;
    top: 0;
    right: 0;
    color: var(--el-color-primary);
  }
}

.plan-coupon {
  :deep(.coupon) {
    display: flex;
    flex-wrap: wrap;
    gap: 2px 16px;
    align-items: center;
  }

  :deep(.coupon .flex) {
    gap: 12px;
    align-items: center;
  }

  :deep(.coupon h2) {
    margin: 0;
    font-size: 16px;
    line-height: 22px;
  }

  :deep(.coupon h3) {
    margin: 0;
    font-size: 14px;
    line-height: 22px;
  }

  :deep(.coupon p) {
    margin: 0;
    line-height: 22px;
  }

  :deep(.el-checkbox) {
    height: 22px;
  }
}

.plan-discount {
  margin-top: 8px;

  &__bar {
    display: flex;
    gap: 12px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    padding: 4px 10px;
    font-size: 13px;
    line-height: 20px;
    color: #595959;
    text-align: left;
    cursor: pointer;
    background: #f7f8fa;
    border: 0;
    border-radius: 6px;
  }

  &__summary {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
  }

  &__hint {
    color: #8c8c8c;
  }

  &__amount {
    color: #ff481b;
  }

  &__toggle {
    display: inline-flex;
    flex-shrink: 0;
    gap: 4px;
    align-items: center;
    color: var(--el-color-primary);
  }

  &__list {
    max-height: 120px;
    padding: 6px 8px 8px;
    margin: 0;
    overflow-y: auto;
    list-style: none;
    background: #f7f8fa;
    border-top: 1px dashed #e5e6eb;
    border-radius: 0 0 6px 6px;

    li {
      display: flex;
      gap: 12px;
      align-items: center;
      min-height: 0;
      padding: 6px 10px;
      margin-bottom: 6px;
      background: #fef3f4;
      border-radius: 6px;

      &:last-child {
        margin-bottom: 0;
      }
    }
  }

  &__price {
    flex-shrink: 0;
    width: 88px;
    text-align: center;

    p {
      margin: 0;
    }

    p:first-child {
      font-size: 18px;
      font-weight: 700;
      line-height: 22px;
      color: #f04d29;

      span {
        font-size: 14px;
      }
    }

    p:last-child {
      margin-top: 4px;
      font-size: 12px;
      line-height: 18px;
      color: #595959;
    }
  }

  &__info {
    flex: 1;
    min-width: 0;

    p {
      margin: 0;
      font-size: 13px;
      line-height: 20px;
      color: #262626;
    }

    span {
      color: #ff481b;
    }
  }

  &__limit,
  &__time {
    color: #8c8c8c !important;
  }

  &__time {
    margin-top: 4px !important;
    font-size: 12px !important;
  }

  &__pick {
    display: flex;
    flex-shrink: 0;
    gap: 8px;
    align-items: center;
  }

  &__recommend {
    height: 18px;
  }

  &__check {
    width: 18px;
    height: 18px;
    cursor: pointer;
  }
}

.plan-periods {
  display: inline-flex;
  gap: 4px;
  margin-bottom: 16px;
  padding: 4px;
  background: #f2f3f5;
  border-radius: 18px;

  button {
    height: 28px;
    padding: 0 16px;
    font-size: 13px;
    line-height: 28px;
    color: #4e5969;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 14px;

    &.is-active {
      font-weight: 600;
      color: #1d2129;
      background: #fff;
      box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
    }
  }
}

.plan-buy--single,
.plan-buy--embedded {
  min-height: 0;
  padding: 20px 24px 24px;

  .plan-buy__header {
    margin-bottom: 16px;

    h2 {
      font-size: 16px;
      line-height: 24px;
    }

    p {
      margin-top: 2px;
    }
  }

  .plan-buy__close {
    margin-top: 0;
    color: #86909c;
  }

  .plan-list {
    display: block;
  }

  .plan-card {
    display: block;
    width: 100%;
    max-width: none;
    min-height: 0;
    padding: 16px 20px 14px;
    border-radius: 8px;

    &.is-active {
      box-shadow: none;
    }
  }

  .plan-card__top {
    flex-direction: row;
    align-items: center;
    justify-content: space-between;
    gap: 24px;
    padding-bottom: 14px;
    border-bottom: 1px solid #f2f3f5;
  }

  .plan-card__info {
    min-width: 0;
  }

  .plan-card__name {
    font-size: 16px;
    font-weight: 700;
    line-height: 22px;
    color: #1d2129;
  }

  .plan-card__desc {
    margin-top: 4px;
    font-size: 12px;
    line-height: 18px;
    color: #86909c;
  }

  .plan-card__price {
    flex-shrink: 0;
    align-items: baseline;
    margin: 0 18px 0 0;
    padding: 0;
    border-bottom: 0;
    gap: 0;
  }

  .plan-card__amount {
    font-size: 22px;
    font-weight: 700;
    line-height: 28px;
    letter-spacing: 0;
    color: #ff481b;
  }

  .plan-card__period {
    margin-left: 0;
    font-size: 14px;
    line-height: 20px;
    color: #86909c;
  }

  .plan-card__origin {
    margin-left: 8px;
    font-size: 14px;
    line-height: 20px;
    color: #c9cdd4;
  }

  .plan-card__features {
    margin: 2px 0 0;

    li {
      gap: 8px;
      margin-top: 12px;
      font-size: 13px;
      line-height: 20px;
      color: #4e5969;
    }

    .plan-card__icon {
      font-size: 14px;
      color: #86909c;
    }
  }

  .plan-buy__section {
    margin: 16px 0 8px;
    font-size: 16px;
    line-height: 24px;
  }

  .pay-list {
    flex-wrap: nowrap;
    gap: 12px;
  }

  .pay-card {
    flex: 1 1 0;
    min-width: 0;
    height: 64px;
    padding: 8px 10px;
    border-radius: 8px;
    gap: 8px;

    &.is-active {
      box-shadow: none;
    }

    img {
      width: 28px;
      height: 28px;
    }

  }

  .pay-unavailable { color: #86909c; font-size: 13px; }

.plan-buy__submit {
    margin-top: 16px;
  }
}

.plan-buy__section {
  margin: 28px 0 12px;
  font-size: 16px;
  font-weight: 700;
  line-height: 24px;
  color: #1d2129;
}

.pay-card {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 168px;
  height: 68px;
  padding: 10px 14px 10px 12px;

  img {
    width: 32px;
    height: 32px;
    object-fit: contain;
    flex-shrink: 0;
  }

  &__text {
    min-width: 0;
  }

  &__title {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    line-height: 18px;
    color: #1d2129;
    white-space: nowrap;

    :deep(.el-link) {
      font-size: 12px;
    }
  }

  p {
    margin: 2px 0 0;
    font-size: 12px;
    line-height: 16px;
    color: #86909c;
    white-space: nowrap;
  }


  &__check {
    position: absolute;
    top: 0;
    right: 0;
    color: var(--el-color-primary);
  }
}

.plan-buy__submit {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 22px;

  :deep(.el-button) {
    height: 36px;
    padding: 0 18px;
    border-radius: 4px;
    font-size: 14px;
  }

  .event {
    color: var(--el-color-primary);
    cursor: pointer;
  }

  :deep(.el-checkbox) {
    height: auto;
  }

  :deep(.el-checkbox__label) {
    position: relative;
    font-size: 12px;
    line-height: 18px;
    color: #86909c;
    white-space: nowrap;
  }
}

.agree-tip {
  position: absolute;
  top: -34px;
  left: 0;
  padding: 4px 8px;
  border-radius: 4px;
  background: #1d2129;
  color: #fff;
  font-size: 12px;
  white-space: nowrap;
}

</style>

<style lang="scss">
.plan-agreement-dialog.el-dialog {
  .el-dialog__body {
    padding: 8px 24px 28px;
  }

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.7;
    color: var(--el-text-color-regular);
  }
}

.buyInstructionsDialog.el-dialog {
  .el-dialog__header {
    padding: 23px 27px 19px;
    margin-bottom: 0;
    border-bottom: none;

    span {
      font-size: 18px;
      font-weight: 700;
      color: #0e2d75;
    }
  }

  .el-dialog__body {
    padding: 0 27px 38px !important;
  }

  .tip {
    padding: 16px;
    background-color: #edf2ff;

    p {
      margin: 0 0 6px;
      font-size: 14px;
      line-height: 22px;
      color: var(--el-text-color-primary);
    }
  }
}

.plan-pay-dialog.el-dialog {
  border-radius: 12px;
  padding: 0 !important;

  .el-dialog__header {
    height: 0;
    padding: 0;
    margin: 0;
    border-bottom: none;
  }

  .el-dialog__headerbtn {
    top: 16px;
    right: 16px;
    width: 24px;
    height: 24px;
    z-index: 2;
  }

  .el-dialog__body {
    padding: 40px 24px 24px !important;
  }

  .pay-panel {
    text-align: center;
  }

  .pay-panel__label {
    font-size: 16px;
    font-weight: 700;
    line-height: 24px;
    color: #1d2129;
  }

  .pay-panel__amount {
    margin-top: 8px;
    font-size: 28px;
    font-weight: 700;
    line-height: 36px;
    color: #ff481b;
  }

  .pay-panel__coupon {
    margin: 8px 0 0;
    font-size: 14px;
    line-height: 22px;
    color: #ff481b;
  }

  .pay-panel__code {
    display: inline-flex;
    margin-top: 20px;
    padding: 12px;
    border: 1px solid #e5e6eb;
    border-radius: 12px;
  }

  .pay-panel__hint {
    margin: 12px 0 0;
    font-size: 13px;
    line-height: 20px;
    color: #86909c;
  }


  .pay-panel__meta {
    margin-top: 24px;
    text-align: left;
  }

  .pay-panel__row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 16px;
    padding: 16px 0;
    border-top: 1px solid #f2f3f5;
    font-size: 14px;
    line-height: 22px;

    span:first-child {
      flex-shrink: 0;
      color: #86909c;
    }

    span:last-child {
      color: #1d2129;
      text-align: right;
    }
  }

  .pay-panel__row:last-child {
    padding-bottom: 0;
  }
}
</style>
