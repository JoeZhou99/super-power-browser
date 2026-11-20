<template>
  <el-dialog
    :model-value="!!skill"
    :title="t('superpowerAgent.skills.trialTitle')"
    width="520px"
    append-to-body
    @close="skill = null"
  >
    <p class="trial-desc">{{ t("superpowerAgent.skills.trialDesc") }}</p>
    <template v-if="skill">
      <strong class="trial-name">{{ skill.name }}</strong>
      <el-form label-position="top">
        <el-form-item :label="t('superpowerAgent.skills.trialRequest')">
          <el-input
            v-model="request"
            type="textarea"
            :rows="3"
            :placeholder="t('superpowerAgent.skills.trialRequestPlaceholder')"
          />
        </el-form-item>
        <el-form-item>
          <template #label>
            {{ t("superpowerAgent.skills.trialShop") }}
            <small class="trial-optional">{{ t("superpowerAgent.skills.trialShopOptional") }}</small>
          </template>
          <el-select
            v-model="shopIds"
            popper-class="trial-shop-popper"
            filterable
            multiple
            remote
            reserve-keyword
            clearable
            :remote-method="searchShops"
            :loading="shopsLoading"
            :placeholder="t('components.searchStores')"
            :no-data-text="t('superpowerAgent.composer.noShop')"
            @visible-change="onShopVisible"
            @popup-scroll="onShopScroll"
          >
            <el-option
              v-for="shop in shopOptions"
              :key="shop.id"
              :label="shop.name"
              :value="String(shop.id)"
              :class="{ 'shop-option-hidden': !isShopListed(shop) }"
            >
              <span class="shop-option">
                <span>{{ shop.name }}</span>
                <small v-if="shop.platform || shop.account">
                  {{ shop.platform }}
                  <template v-if="shop.account">· {{ shop.account }}</template>
                </small>
              </span>
            </el-option>
            <el-option v-if="shopsLoadingMore" disabled :value="SHOP_LOADING_VALUE" label=" ">
              <span class="shop-more">{{ t("superpowerAgent.composer.shopLoading") }}</span>
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <p class="trial-note">{{ t("superpowerAgent.skills.trialNote") }}</p>
    </template>
    <template #footer>
      <el-button @click="skill = null">{{ t("superpowerAgent.skills.trialLater") }}</el-button>
      <el-button type="primary" @click="start">
        {{ t("superpowerAgent.skills.trialStart") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { useDebounceFn } from "@vueuse/core";
import { getNewMallList } from "@/ai/api/mall/mall.api";
import type { ScheduledShop } from "@/ai/api/superpowerAgent";
import { errorMessage, useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import type { DisplaySkill } from "../../type";

const skill = defineModel<DisplaySkill | null>({ default: null });

const store = useSuperPowerAgentStore();
const { t } = useI18n();
const request = ref("");
const selectedShops = ref<ScheduledShop[]>([]);

const SHOP_PAGE_SIZE = 20;
const SHOP_LOADING_VALUE = "__shop_loading__";
const shopKeyword = ref("");
const shopList = ref<ScheduledShop[]>([]);
const shopPage = ref(1);
const shopTotal = ref(0);
const shopsLoading = ref(false);
const shopsLoadingMore = ref(false);
const shopCatalog = new Map<string, ScheduledShop>();
let shopRequestId = 0;

function rememberShops(items: ScheduledShop[]) {
  for (const shop of items) shopCatalog.set(String(shop.id), shop);
}

function toShop(item: Record<string, any>): ScheduledShop {
  return {
    id: item.id,
    name: String(item.mall_name || item.name || item.id),
    platform: item.platform_name || item.site_name || item.platform || "",
    account: item.mall_account || item.account || "",
    logo: item.logo || "",
  };
}

const shopOptions = computed(() => {
  const merged = new Map<string, ScheduledShop>();
  for (const shop of selectedShops.value) merged.set(String(shop.id), shop);
  for (const shop of shopList.value) merged.set(String(shop.id), shop);
  return [...merged.values()];
});

const shopIds = computed<string[]>({
  get: () => selectedShops.value.map((shop) => String(shop.id)),
  set: (ids) => {
    selectedShops.value = ids.flatMap((id) => {
      if (id === SHOP_LOADING_VALUE) return [];
      const shop = shopCatalog.get(id);
      return shop ? [shop] : [];
    });
  },
});

function isShopListed(shop: ScheduledShop) {
  return shopList.value.some((item) => String(item.id) === String(shop.id));
}

async function fetchShops(reset: boolean) {
  if (
    !reset &&
    (shopsLoading.value || shopsLoadingMore.value || shopList.value.length >= shopTotal.value)
  ) {
    return;
  }
  const current = reset ? ++shopRequestId : shopRequestId;
  const nextPage = reset ? 1 : shopPage.value + 1;
  if (reset) shopsLoading.value = true;
  else shopsLoadingMore.value = true;
  try {
    const res: any = await getNewMallList({
      page: nextPage,
      limit: SHOP_PAGE_SIZE,
      mall_name: shopKeyword.value.trim(),
      status: 1,
    });
    if (current !== shopRequestId) return;
    const list = res?.data?.list || res?.data?.bind_mall_list || [];
    const mapped = list.map(toShop);
    if (!reset && !mapped.length) {
      shopTotal.value = shopList.value.length;
      return;
    }
    rememberShops(mapped);
    shopTotal.value = Number(res?.data?.total ?? mapped.length);
    shopList.value = reset ? mapped : shopList.value.concat(mapped);
    shopPage.value = nextPage;
  } catch (cause) {
    if (current !== shopRequestId) return;
    if (reset) shopList.value = [];
    ElMessage.error(errorMessage(cause));
  } finally {
    if (current === shopRequestId) {
      shopsLoading.value = false;
      shopsLoadingMore.value = false;
    }
  }
}

const searchShops = useDebounceFn((query: string) => {
  if (query === shopKeyword.value && (shopList.value.length || shopsLoading.value)) return;
  shopKeyword.value = query;
  fetchShops(true);
}, 300);

function onShopVisible(open: boolean) {
  if (!open) return;
  searchShops.cancel?.();
  shopKeyword.value = "";
  fetchShops(true);
  nextTick(bindShopScroll);
}

function bindShopScroll() {
  const wrap = document.querySelector(
    ".trial-shop-popper .el-select-dropdown__wrap"
  ) as HTMLElement | null;
  if (!wrap || wrap.dataset.shopScrollBound) return;
  wrap.dataset.shopScrollBound = "1";
  wrap.addEventListener("scroll", () => {
    if (wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight <= 24) fetchShops(false);
  });
}

function onShopScroll({ scrollTop }: { scrollTop: number }) {
  const wrap = document.querySelector(
    ".trial-shop-popper .el-select-dropdown__wrap"
  ) as HTMLElement | null;
  if (!wrap) return;
  if (wrap.scrollHeight - scrollTop - wrap.clientHeight <= 24) fetchShops(false);
}

watch(skill, () => {
  selectedShops.value = [];
  shopList.value = [];
  shopPage.value = 1;
  shopTotal.value = 0;
  shopKeyword.value = "";
  request.value = "";
});

function start() {
  if (!skill.value) return;
  store.startSkillTrial(skill.value, selectedShops.value, request.value.trim());
  skill.value = null;
}
</script>

<style lang="scss" scoped>
.trial-desc,
.trial-note {
  margin: 0 0 12px;
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.trial-name {
  display: block;
  margin-bottom: 12px;
  font-size: 14px;
}

.trial-optional {
  margin-left: 6px;
  font-weight: 400;
  color: var(--el-text-color-secondary);
}

:deep(.el-select) {
  width: 100%;
}

.shop-option {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  small {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.shop-more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}
</style>

<style lang="scss">
.trial-shop-popper .shop-option-hidden {
  display: none;
}
</style>
