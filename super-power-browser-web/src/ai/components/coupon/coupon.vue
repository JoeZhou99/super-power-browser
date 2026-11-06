<template>
  <slot name="content" :dialogObj="dialogObj" v-if="!isLook">
    <div class="coupon">
      <div class="flex">
        <h2 v-if="notUseList && disAmount">-￥{{ disAmount }}</h2>
        <h3 v-if="notUseList && !currentItemCheap && !disAmount">
          {{ t("mall.noCouponSelected") }}
        </h3>
        <h3 v-if="!notUseList && !currentItemCheap">{{ t("mall.noCouponsAvailable") }}</h3>
        <el-checkbox
          v-model="notUseDiscount"
          class="ml-2 flex-center"
          @change="handleNotUseDiscountChange"
        >
          {{ t("agentIp.noCouponUsed") }}
        </el-checkbox>
      </div>

      <p>
        {{ t("mall.availableCoupons") }}
        <span class="number">{{ cloudRenewData ? cloudRenewData.length : 0 }}</span>
        {{ t("mall.totalCount") }}，
        <span class="event" @click="dialogObj.isShowDialog = true">
          {{ t("agentIp.check_details") }}
        </span>
      </p>
    </div>
  </slot>
  <base-dialog
    :dialogObj="dialogObj"
    class="coupon-dialog"
    id="coupon-dialog"
    top="6vh"
    :style="userStore.customInfo?.code ? 'padding-top:60px !important' : dialogBackgroundStyle"
  >
    <template #header="{ close }">
      <div v-if="!userStore.customInfo?.code" @click="Jump" class="share">
        {{ t("commonWord.immediatelyShare") }} >
      </div>
      <div class="el-dialog__headerbtn flex-center" v-if="isLook">
        <el-icon class="cursor-pointer wh-16 close" @click="close">
          <CloseBold />
        </el-icon>
      </div>
    </template>
    <template #content>
      <!-- 优惠劵功能 -->
      <div class="tabs">
        <el-tabs v-model="couponName">
          <el-tab-pane :label="t('commonWord.unused')" name="notUsed">
            <div v-if="notUseList !== null" class="coupon-box box-typeA">
              <ul>
                <li
                  v-for="(item, index) in notUseList"
                  :key="index"
                  :style="isAllowed(item)"
                  @click="isClick(index, item)"
                >
                  <div
                    class="not-used"
                    :style="currentItemCheap === item.coupon_sn ? select_bac : not_select_bac"
                  >
                    <p class="coupon-amount">
                      <span>￥</span>
                      <span>{{ Number(item.coupon_amount) }}</span>
                      <span class="ml-2">{{ item.coupon_name }}</span>
                      <br />
                      <span class="bold" v-if="item.range === 3">
                        {{ t("commonWord.universal") }}
                      </span>
                      <span class="bold" v-if="item.range === 2">
                        {{ t("mall.cloudNumberOnly") }}，
                      </span>
                      <span class="bold" v-if="item.range === 1">{{ t("mall.deviceOnly") }}，</span>
                      <span class="bold" v-if="item.range === 4">
                        {{ t("mall.cloudDesktopOnly") }}，
                      </span>
                      <span class="bold" v-if="item.range === 7">
                        {{ t("mall.largeModelOnly") }}，
                      </span>
                      <span class="bold" v-if="item.range === 9">
                        {{ t("mall.modelPlanOnly") }}，
                      </span>
                      <span class="type">{{ t("wxwProxy.couponUsageRestriction") }}</span>
                    </p>
                    <p class="coupon-name">
                      <span class="mr-2">{{ t("wxwProxy.usagePeriod") }}:</span>
                      <span>
                        {{ filterTime(item.collection_at) }} -
                        {{ filterTime(item.expire_at) }}
                      </span>
                      <template v-if="isLook">
                        <span class="to-use">{{ t("mall.useNow") }}</span>
                        <span class="to-use">{{ t("mall.useNow") }}</span>
                      </template>
                    </p>
                    <template v-if="!isLook">
                      <div
                        :style="
                          currentItemCheap === item.coupon_sn
                            ? select_bac_item
                            : not_select_bac_item
                        "
                      >
                        {{ currentItemCheap === item.coupon_sn ? t("mall.selected") : "" }}
                      </div>
                    </template>
                  </div>
                </li>
              </ul>
            </div>
            <div v-else class="coupon-box no-data">
              <img src="@/ai/assets/normal/nodata.png" alt="" srcset="" />
              <span>{{ t("wxwProxy.noUnusedCoupons") }}</span>
            </div>
          </el-tab-pane>
          <el-tab-pane :label="t('wxwProxy.used')" name="used">
            <div v-if="useList !== null" class="coupon-box box-typeB">
              <ul>
                <li v-for="(item, index) in useList" :key="index" style="cursor: not-allowed">
                  <div :style="failure_bac">
                    <p class="coupon-amount">
                      <span>￥</span>
                      <span>{{ Number(item.coupon_amount) }}</span>
                      <span class="used ml-2">{{ item.coupon_name }}</span>
                    </p>
                    <p class="coupon-name">
                      <span class="mr-2">{{ t("wxwProxy.usagePeriod") }}:</span>
                      <span>
                        {{ filterTime(item.collection_at) }} -
                        {{ filterTime(item.expire_at) }}
                      </span>
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div v-else class="coupon-box no-data">
              <img src="@/ai/assets/normal/nodata.png" alt="" srcset="" />
              <span>{{ t("wxwProxy.noUsedCoupons") }}</span>
            </div>
          </el-tab-pane>
          <el-tab-pane :label="t('wxwProxy.expired')" name="invalid">
            <div v-if="uinvalideList !== null" class="coupon-box box-typeC">
              <ul>
                <li v-for="(item, index) in uinvalideList" :key="index" style="cursor: not-allowed">
                  <div :style="use_bac">
                    <p class="coupon-amount">
                      <span>￥</span>
                      <span>{{ Number(item.coupon_amount) }}</span>
                      <span class="used ml-2">{{ item.coupon_name }}</span>
                    </p>
                    <p class="coupon-name">
                      <span class="mr-2">{{ t("wxwProxy.usagePeriod") }}:</span>
                      <span>
                        {{ filterTime(item.collection_at) }} -
                        {{ filterTime(item.expire_at) }}
                      </span>
                    </p>
                  </div>
                </li>
              </ul>
            </div>
            <div v-else class="coupon-box no-data">
              <img src="@/ai/assets/normal/nodata.png" alt="" srcset="" />
              <span>{{ t("wxwProxy.noExpiredCoupons") }}</span>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
    <template #footer>
      <div v-if="!userStore.customInfo?.code" class="footer-explain">
        <p v-if="locale !== 'en'" class="pb-3">{{ t("wxwProxy.usageRules") }}：</p>

        <ul>
          <li v-if="isLook">
            {{ t("agentIp.referralBenefits") }}
          </li>
          <li>
            {{ t("agentIp.couponPolicy") }}
          </li>
          <li>{{ t("wxwProxy.activityFinalInterpretation") }}</li>
        </ul>
      </div>
      <div class="btns" v-if="!isLook">
        <el-button @click="handelCacne">
          {{ t("globalCommonWord.cancel_") }}
        </el-button>
        <el-button type="primary" @click="confirmSelect">
          {{ t("globalCommonWord.confirm_") }}
        </el-button>
      </div>
    </template>
  </base-dialog>
</template>
<script setup lang="ts">
import { getAllCoupon } from "@/ai/api/agentIp";
import { useUserStore } from "@/ai/store";
import coupon from "@/ai/assets/images/couponBg.png";
import couponIsLook from "@/ai/assets/images/couponIsLook.png";

const { t, locale } = useI18n();
// 1-设备 2-云号码 3-全局 4-云桌面 5-云手机 6-弹性网卡 7-大模型 9-模型套餐
type couponTypeConfigs = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 9;
const props = withDefaults(
  defineProps<{
    couponType?: couponTypeConfigs;
    currentSelect?: string | number;
    isLook?: boolean; // 是否仅查看优惠劵
  }>(),
  {
    currentSelect: "",
    isLook: false,
  }
);

const userStore = useUserStore();
const router = useRouter();
const emit = defineEmits(["couponInfo", "update:currentSelect"]);
const couponName = ref("notUsed");
const currentItemCheap = ref<any>(0);
const notUseList = ref<any[] | null>(null);
const currentItemCheapPrice = ref(0);
const select_bac = reactive({});
const notUseDiscount = ref(false);
const not_select_bac = reactive({});
const cloudRenewData = ref<any[]>([]);
const select_bac_item = reactive({
  position: "absolute",
  right: "0px",
  top: "0px",
  width: "62px",
  height: "26px",
  textAlign: "center",
  lineHeight: "26px",
  borderRadius: " 0px 4px 0px 12px",
  fontsize: "14px",
  color: "#FFFFFF",
  background: "#F04D29",
});
const useList = ref<any[] | null>(null);
const uinvalideList = ref<any[] | null>(null);
const disAmount = ref<string | number>(0);
const currentItemCheapType = ref<number | null>(null);
const userInfo = computed(() => userStore.userInfo);

const use_bac = reactive({});
const not_select_bac_item = reactive({});
const failure_bac = reactive({});
const dialogObj = reactive({
  width: "837px",
  isShowDialog: false,
  title: t("commonWord.prompt"),
  header: true,
  // showClose: true,
  footer: true,
  destroyOnClose: true,
});
const renewQuery = reactive({
  type_code: "",
  country_code: "",
  source_type: "",
  area_code: "",
  cycle_id: "",
  period: "",
  price: "",
  coupon_sn: "",
  auto_renew: 0,
  use_amount: 2,
  pay_amount: 0,
  order_amount: 0,
  deduct_amount: 0,
  discount_amount: 0,
  number: 1,
  stock: 0,
  maxNumber: 99,
  amount: 0,
  button_name: t("wxwProxy.submitOrder"),
});
const dialogBackgroundStyle = computed(() => ({
  backgroundImage: `url(${props.isLook ? couponIsLook : coupon})`,
  backgroundSize: "100% 100%",
}));
function filterTime(date: string) {
  const data = date.split(" ");
  if (data.length === 2) {
    return data[0];
  }
}
// 选择优惠劵
function selectCoupon(index: number, item: any) {
  if (props.isLook) {
    toBuyIP(item.range);
    return;
  }
  console.log(index, currentItemCheap, "selectCoupon==>");
  if (currentItemCheap.value === item.coupon_sn) {
    currentItemCheapPrice.value = 0;
    disAmount.value = 0;
    currentItemCheap.value = "";
    currentItemCheapType.value = null;
  } else {
    currentItemCheapPrice.value = item?.coupon_amount || 0;
    disAmount.value = item?.coupon_amount || 0;
    currentItemCheap.value = item?.coupon_sn || "";
    currentItemCheapType.value = 1;
  }
}
// 劵是否可选
const isAllowed = computed(() => {
  return (item: any) => {
    if (props.isLook) {
      return "cursor";
    } else {
      return item.range === props.couponType || item.range === 3 ? "" : "cursor: not-allowed";
    }
  };
});
// 劵是否可点击
const isClick = computed(() => {
  return (index: number, item: any) => {
    if (props.isLook) {
      selectCoupon(index, item);
      return true;
    } else {
      item.range === props.couponType || item.range === 3 ? selectCoupon(index, item) : "";
      return true;
    }
  };
});

watch(
  () => dialogObj.isShowDialog,
  (val) => {
    if (val) {
      getCoupon();
      handelDiscount(props.currentSelect);
    }
  }
);
watch(
  () => props.currentSelect,
  (val) => {
    console.log(val, "props.currentSelect===>");
    handelDiscount(val);
  }
);
const handelDiscount = (val: string | number) => {
  const item = (notUseList.value || []).find((row) => String(row.coupon_sn) === String(val ?? ""));
  disAmount.value = item?.coupon_amount || 0;
  currentItemCheapPrice.value = item?.coupon_amount || 0;
  currentItemCheap.value = item?.coupon_sn || "";
  currentItemCheapType.value = item ? 1 : null;
  if (item) notUseDiscount.value = false;
};
onMounted(() => {
  if (!props.isLook) getCoupon();
});
const getCoupon = async () => {
  const params = { range: props.couponType };
  let res = await getAllCoupon(params);
  if (res.data) {
    cloudRenewData.value = res.data.not_use.filter((item: any) => {
      if (props.isLook) {
        return item;
      } else {
        return item.range === props.couponType || item.range === 3;
      }
    });
    notUseList.value = res.data.not_use.length === 0 ? null : res.data.not_use;
    uinvalideList.value = res.data.uinvalide.length === 0 ? null : res.data.uinvalide;
    useList.value = res.data.use.length === 0 ? null : res.data.use;
    const pickedSn = currentItemCheap.value;
    const hasPicked = pickedSn !== "" && pickedSn !== 0 && pickedSn != null;
    if (notUseDiscount.value && !hasPicked) {
      disAmount.value = "";
      renewQuery.coupon_sn = "";
      currentItemCheap.value = "";
      currentItemCheapPrice.value = 0;
      currentItemCheapType.value = null;
    } else if (hasPicked) {
      handelDiscount(pickedSn);
      renewQuery.coupon_sn = currentItemCheap.value || "";
    } else if (props.currentSelect) {
      handelDiscount(props.currentSelect);
      renewQuery.coupon_sn = currentItemCheap.value || "";
    } else {
      disAmount.value = cloudRenewData.value[0]?.coupon_amount ?? "";
      renewQuery.coupon_sn = cloudRenewData.value[0]?.coupon_sn ?? "";
    }
  }
};

function setNotUseDiscount(unused: boolean) {
  notUseDiscount.value = unused;
  if (!unused) return;
  disAmount.value = "";
  currentItemCheapPrice.value = 0;
  currentItemCheap.value = "";
  currentItemCheapType.value = null;
  renewQuery.coupon_sn = "";
}

function confirmSelect() {
  if (currentItemCheap.value !== "") {
    renewQuery.coupon_sn = currentItemCheap.value;
    notUseDiscount.value = false;
  } else {
    disAmount.value = "";
    renewQuery.coupon_sn = "";
  }
  emitParent();
  dialogObj.isShowDialog = false;
}
const handelCacne = () => {
  handelDiscount(props.currentSelect);
  dialogObj.isShowDialog = false;
};
// 通知父级
function emitParent() {
  let currentCoupon: Record<string, any> = {};
  const pickedSn = currentItemCheap.value;
  if (pickedSn !== "" && pickedSn !== 0 && pickedSn != null) {
    currentCoupon = (notUseList.value || []).find(
      (son) => String(son.coupon_sn) === String(renewQuery.coupon_sn)
    ) || {
      coupon_sn: pickedSn,
      coupon_amount: currentItemCheapPrice.value,
    };
  }
  emit("couponInfo", {
    data: currentCoupon,
    notUseNum: notUseList.value?.length ?? 0,
  });
}
function Jump() {
  const userInfoForm: any = userInfo.value;
  console.log(userInfoForm);
  if (userInfoForm.level !== 3 && userInfoForm.is_channel === 2) {
    router.push("/company/invite");
  } else if (userInfoForm.is_channel === 1 && userInfoForm.level !== 3) {
    router.push("/channel/stats");
  }
  dialogObj.isShowDialog = false;
}
const handleNotUseDiscountChange = (val: boolean | string | number) => {
  console.log(val);
  if (val) {
    disAmount.value = "";
    currentItemCheapPrice.value = 0;
    currentItemCheap.value = "";
    currentItemCheapType.value = null;
  } else {
    disAmount.value =
      notUseList.value?.find(item => String(item.coupon_sn) === String(props.currentSelect))?.coupon_amount || 0;
  }
  emit("couponInfo", {
    data: {
      coupon_amount: currentItemCheapPrice.value,
      coupon_sn: currentItemCheap.value,
      currentItemCheapType: currentItemCheapType.value,
    },
    notUseNum: notUseList?.value?.length ?? 0,
  });
};
const toBuyIP = (type: number) => {
  dialogObj.isShowDialog = false;
  console.log(type);
  // 1-设备 2-云号码 3-全局 4-云桌面 5-云手机 6-弹性网卡
  switch (type) {
    case 2:
      router.push({
        path: "/cloud/cloudBuy",
      });
      break;
    case 1:
    case 3:
      router.push({
        path: "/agentIp/aggregateBuy3",
      });
      break;
    case 4:
      router.push({
        path: "/BuyDevice",
      });
      break;
  }
};
const openCouponbox = () => {
  dialogObj.isShowDialog = true;
};

defineExpose({
  dialogObj,
  openCouponbox,
  setNotUseDiscount,
  refreshCoupons: getCoupon,
});
</script>

<style lang="scss" scoped>
.coupon {
  h2 {
    font-size: 20px;
    font-weight: bold;
    color: #ff0000;
  }
  h3 {
    font-size: 14px;
    font-weight: bold;
    color: var(--el-text-color-primary);
    line-height: 32px;
  }
  p {
    font-size: 12px;
    line-height: 14px;
    color: #8c8c8c;
    .number {
      color: rgba(254, 109, 48, 1);
    }
    .event {
      color: var(--el-color-primary);
      cursor: pointer;
    }
  }
}
.coupon-dialog {
  .share {
    position: absolute;
    top: 41px;
    width: 100%;
    height: 37px;
    font-size: 18px;
    line-height: 37px;
    color: #ffffff;
    text-align: center;
    cursor: pointer;
    background: #f04d29;
    border-radius: 30px;
    opacity: 0;
  }
  .tabs {
    padding-top: 16px;
    .coupon-h2 {
      margin-top: 0;
    }
    .coupon-box {
      height: 290px;
      ul {
        display: flex;
        flex-flow: row wrap;
        flex-wrap: wrap;
        justify-content: space-between;
        max-height: 247px;
        padding: 0;
        margin: 0;
        li {
          width: 355px;
          height: 155px;
          padding: 0;
          margin-bottom: 16px;
          cursor: pointer;

          div {
            box-sizing: border-box;
            flex-flow: row nowrap;
            width: 100%;
            height: 100%;
            padding-bottom: 1px;
            border: none;
            border-radius: 4px;
            .coupon-amount {
              height: 115px;
              padding: 16px 24px 18px 23px;
              margin: 0;
              color: rgba(255, 255, 255, 1);

              span:nth-of-type(1) {
                margin-right: -4px;
                font-size: 24px;
                font-weight: bold;
              }

              span:nth-of-type(2) {
                font-size: 42px;
                font-weight: bold;
                line-height: 42px;
              }

              span:nth-of-type(3) {
                font-size: 18px;
                vertical-align: super;
              }
            }

            .coupon-name {
              display: flex;
              height: 18px;
              padding: 9px 0px 12px 25px;
              margin: 0;
              font-size: 12px;
              color: #595959;
              span:nth-of-type(1) {
                font-size: 14px;
              }

              span:nth-of-type(2) {
                font-size: 14px;
              }
            }
          }
        }
      }
    }
    .no-data {
      display: flex;
      flex-flow: column nowrap;
      align-items: center;
    }
    .not-used {
      position: relative;

      span.type {
        font-size: 14px !important;
        color: #8c8c8c !important;
      }

      span.bold {
        display: inline-block;
        margin-top: 4px;
        color: #595959 !important;
      }

      .to-use {
        position: absolute;
        top: 0;
        right: 0;
        padding: 0 8px;
        padding-left: 10px;
        font-size: 14px;
        font-weight: 400;
        line-height: 26px;
        color: #ffffff;
        background: var(--el-color-primary);
        border-bottom-left-radius: 11px;
      }
    }
    .box-typeA {
      .coupon-amount {
        span:nth-of-type(1) {
          color: #f04d29;
        }
        span:nth-of-type(2) {
          color: #f04d29;
        }
        span:nth-of-type(3) {
          color: var(--el-text-color-primary);
        }
      }

      li {
        background-image: url(@/ai/assets/icons/box-typeA.png);
        background-size: 100% 100%;
      }
    }
    .box-typeB,
    .box-typeC {
      .coupon-amount {
        span:nth-of-type(1) {
          color: #b0b0b0;
        }
        span:nth-of-type(2) {
          color: #b0b0b0;
        }
        span:nth-of-type(3) {
          color: #b0b0b0;
        }
      }
      li {
        background-size: 100% 100%;
      }
    }
    .box-typeB {
      li {
        background-image: url(@/ai/assets/icons/box-typeB.png);
      }
    }
    .box-typeC {
      li {
        background-image: url(@/ai/assets/icons/box-typeC.png);
      }
    }
    :deep(.el-tabs) {
      .el-tabs__header {
        line-height: 35px;
        margin: 0px;
      }
      .el-tabs__content {
        height: 100%;
        overflow-x: hidden;
        overflow-y: scroll; /* 始终显示纵向滚动条 */
        scrollbar-width: none; /* 隐藏浏览器自带的滚动条 */
        -ms-overflow-style: none;
        box-sizing: border-box;
        padding: 24px 31px 0px 31px;
      }
      .el-tabs__active-bar {
        display: none;
      }
      .el-tabs__item {
        height: 100% !important;
        padding: 0px;
        margin-right: 16px;
        padding: 0px 13px;
        background: #f6f8fa;
        color: #595959;
        border-radius: 2px 2px 0px 0px;
        border: 1px solid #eaedf1;
        height: 35px;
        &:nth-child(2) {
          margin-left: 31px;
        }
      }
      .is-active {
        box-sizing: border-box;
        text-align: center;
        background: #ffffff;
        border-top: 2px solid var(--el-color-primary);
        border-right: 1px solid #eaedf1;
        border-bottom: none;
        border-left: 1px solid #eaedf1;
        opacity: 1;
      }
    }
  }
  .footer-explain {
    font-size: 14px;
    line-height: 20px;
    color: #595959;
    text-align: left;
    ul {
      padding: 0 0 0 20px;
      li {
        position: relative;
        padding-left: 15px; // 为伪元素留出空间
        &::before {
          content: "•"; // 使用圆点符号
          position: absolute;
          left: 0;
          color: var(--el-color-primary); // 蓝色
          font-size: 16px;
          line-height: 20px;
        }
      }
    }
  }
}
</style>
<style lang="scss">
#coupon-dialog {
  width: 837px;
  // height: 710px;
  padding: 148px 19px 16px 20px !important;
  background-size: 100% 100%;
  .el-dialog__header {
    padding: 0;
    margin-bottom: 0px;
    .close {
      color: #595959;
    }
  }
  .el-dialog__body {
    padding: 0px !important;
    background-color: #ffffff;
  }
  .el-dialog__footer {
    padding: 20px 16px 20px 32px !important;
    background-color: #ffffff;
    border-top: 1px solid #e4e7ed !important;
  }
}
</style>
