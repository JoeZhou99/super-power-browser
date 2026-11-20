<template>
  <section v-if="visible" class="skill-update-page">
    <header class="skill-update-header">
      <button type="button" class="back" @click="close">
        <el-icon :size="18"><ArrowLeft /></el-icon>
      </button>
      <div>
        <h2>{{ t("superpowerAgent.skills.updatePageTitle") }}</h2>
        <p>{{ t("superpowerAgent.skills.updatePageDesc") }}</p>
      </div>
    </header>

    <main class="skill-update-body">
      <div class="intro">
        <el-icon class="intro-icon" :size="22"><EditPen /></el-icon>
        <div>
          <strong>{{ t("superpowerAgent.skills.updateStartTitle") }}</strong>
          <p>{{ t("superpowerAgent.skills.updateStartDesc") }}</p>
        </div>
      </div>

      <div class="setup-card">
        <el-form label-position="top" @submit.prevent="start">
          <el-form-item :label="t('superpowerAgent.skills.updatePageSkillLabel')">
            <el-input :model-value="skillName" readonly>
              <template #prefix><el-icon><MagicStick /></el-icon></template>
            </el-input>
          </el-form-item>

          <div class="shop-filter-row">
            <el-form-item class="shop-form-item" :label="t('superpowerAgent.skills.updatePageShopLabel')" required>
              <el-select
                v-model="selectedIds"
                class="shop-select"
                popper-class="skill-update-shop-popper"
                multiple
                collapse-tags
                collapse-tags-tooltip
                filterable
                remote
                reserve-keyword
                clearable
                :remote-method="searchShops"
                :loading="shopsLoading"
                :placeholder="t('superpowerAgent.skills.updateShopPlaceholder')"
                :no-data-text="t('superpowerAgent.skills.updateShopEmpty')"
                @visible-change="onShopVisible"
                @popup-scroll="onShopScroll"
              >
                <el-option
                  v-for="shop in shopOptions"
                  :key="String(shop.id)"
                  :value="String(shop.id)"
                  :label="shopLabel(shop)"
                >
                  <span class="shop-option">
                    <span class="shop-option-main">
                      <img v-if="shop.logo" :src="shop.logo" alt="" />
                      <span>{{ shop.name }}</span>
                    </span>
                    <small v-if="shop.platform || shop.account">
                      {{ shop.platform }}
                      <template v-if="shop.account"> · {{ shop.account }}</template>
                    </small>
                  </span>
                </el-option>
                <el-option v-if="shopsLoadingMore" disabled value="__shop_loading__" label=" ">
                  <span class="shop-more">{{ t("superpowerAgent.composer.shopLoading") }}</span>
                </el-option>
              </el-select>
              <small class="field-hint">{{ t("superpowerAgent.skills.updateShopHint") }}</small>
            </el-form-item>

            <el-form-item class="platform-form-item" :label="t('superpowerAgent.skills.createPlatformLabel')">
              <el-select
                v-model="platformIds"
                class="platform-filter"
                multiple
                collapse-tags
                collapse-tags-tooltip
                clearable
                filterable
                :placeholder="t('superpowerAgent.skills.platformPlaceholder')"
                @change="onPlatformChange"
              >
                <el-option
                  v-for="platform in platforms"
                  :key="String(platform.id)"
                  :label="platform.name"
                  :value="platform.id"
                />
              </el-select>
            </el-form-item>
          </div>
          <small class="field-hint shop-url-hint">{{ t("superpowerAgent.skills.shopUrlContextHint") }}</small>

          <el-form-item :label="t('superpowerAgent.skills.createPageUrlLabel')">
            <el-input
              v-model="pageUrl"
              clearable
              type="url"
              :placeholder="t('superpowerAgent.skills.createPageUrlPlaceholder')"
            />
          </el-form-item>
        </el-form>
      </div>

      <div class="automation-note">
        <el-icon><InfoFilled /></el-icon>
        <div>
          <strong>{{ t("superpowerAgent.skills.startAutomationTitle") }}</strong>
          <p>{{ t("superpowerAgent.skills.startAutomationHint") }}</p>
        </div>
      </div>
    </main>

    <footer class="skill-update-footer">
      <p class="start-hint">{{ t("superpowerAgent.skills.createStartHint") }}</p>
      <el-button @click="close">{{ t("superpowerAgent.common.cancel") }}</el-button>
      <el-button type="primary" :disabled="!selectedShops.length" @click="start">
        {{ t("superpowerAgent.skills.updatePageStart") }}
      </el-button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { ArrowLeft, EditPen, InfoFilled, MagicStick } from "@element-plus/icons-vue";
import { useDebounceFn } from "@vueuse/core";
import { getNewMallList, getSiteInfoList } from "@/ai/api/mall/mall.api";
import { errorMessage } from "@/ai/store/modules/superpower-agent.store";
import type { SelectedShop } from "../../chat/components/ShopSelect.vue";

const visible = defineModel<boolean>({ default: true });
const props = defineProps<{ skillName: string; shops: SelectedShop[] }>();
const emit = defineEmits<{
  close: [];
  start: [payload: { skillName: string; shops: SelectedShop[]; url: string }];
}>();

const { t } = useI18n();
const selectedIds = ref<string[]>([]);
const pageUrl = ref("");
const platformIds = ref<Array<number | string>>([]);
const platforms = ref<{ id: number | string; name: string }[]>([]);
const shopList = ref<SelectedShop[]>([]);
const shopTotal = ref(0);
const shopPage = ref(1);
const shopsLoading = ref(false);
const shopsLoadingMore = ref(false);
const shopKeyword = ref("");
const shopCatalog = new Map<string, SelectedShop>();
let shopRequestId = 0;

const selectedShops = computed(() =>
  selectedIds.value
    .map((id) => shopCatalog.get(id) || shopList.value.find((shop) => String(shop.id) === id))
    .filter((shop): shop is SelectedShop => Boolean(shop))
);
const shopOptions = computed(() => {
  const merged = new Map<string, SelectedShop>();
  for (const id of selectedIds.value) {
    const shop = shopCatalog.get(id);
    if (shop) merged.set(id, shop);
  }
  for (const shop of shopList.value) merged.set(String(shop.id), shop);
  return [...merged.values()];
});

function shopLabel(shop: SelectedShop) {
  return shop.platform ? `${shop.name} · ${shop.platform}` : shop.name;
}

function toShop(item: Record<string, any>): SelectedShop {
  return {
    id: item.id,
    name: String(item.mall_name || item.name || item.id),
    platform: item.platform_name || item.site_name || item.platform || "",
    account: item.mall_account || item.account || "",
    logo: item.logo || "",
  };
}

async function loadPlatforms() {
  try {
    const res: any = await getSiteInfoList({ mySelf: true });
    platforms.value = (res?.data?.siteList || [])
      .map((item: any) => ({
        id: item.id ?? item.site_info_id,
        name: String(item.name ?? item.site_name ?? item.title ?? ""),
      }))
      .filter((item: { id: number | string; name: string }) => item.name);
  } catch {
    platforms.value = [];
  }
}

async function fetchShops(reset: boolean) {
  if (!reset && (shopsLoading.value || shopsLoadingMore.value || shopList.value.length >= shopTotal.value)) return;
  const current = reset ? ++shopRequestId : shopRequestId;
  const nextPage = reset ? 1 : shopPage.value + 1;
  if (reset) shopsLoading.value = true;
  else shopsLoadingMore.value = true;
  try {
    const query: Record<string, any> = {
      page: nextPage,
      limit: 20,
      mall_name: shopKeyword.value.trim(),
      status: 1,
    };
    if (platformIds.value.length) query.site_info_ids = platformIds.value;
    const res: any = await getNewMallList(query);
    if (current !== shopRequestId) return;
    const list = res?.data?.list || res?.data?.bind_mall_list || [];
    const mapped = list.map(toShop);
    for (const shop of mapped) shopCatalog.set(String(shop.id), shop);
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

const searchShops = useDebounceFn((query: string = shopKeyword.value) => {
  shopKeyword.value = String(query || "");
  void fetchShops(true);
}, 300);

function onPlatformChange() {
  void fetchShops(true);
}

function onShopVisible(open: boolean) {
  if (!open || shopList.value.length) return;
  void fetchShops(true);
}

function onShopScroll({ scrollTop }: { scrollTop: number }) {
  const target = document.querySelector(".skill-update-shop-popper .el-select-dropdown__wrap") as HTMLElement | null;
  if (target && target.scrollHeight - scrollTop - target.clientHeight <= 24) void fetchShops(false);
}

function reset() {
  shopRequestId += 1;
  const initial = props.shops || [];
  for (const shop of initial) shopCatalog.set(String(shop.id), shop);
  selectedIds.value = initial.map((shop) => String(shop.id));
  shopList.value = [];
  shopPage.value = 1;
  shopTotal.value = 0;
  shopKeyword.value = "";
  platformIds.value = [];
  pageUrl.value = "";
  void fetchShops(true);
  void loadPlatforms();
}

function close() {
  visible.value = false;
  emit("close");
}

function start() {
  if (!selectedShops.value.length) {
    ElMessage.warning(t("superpowerAgent.skills.updatePageShopRequired"));
    return;
  }
  emit("start", { skillName: props.skillName, shops: selectedShops.value, url: pageUrl.value.trim() });
  visible.value = false;
}

watch(() => [visible.value, props.skillName, props.shops] as const, ([open]) => {
  if (open) reset();
}, { immediate: true });

onBeforeUnmount(() => {
  shopRequestId += 1;
  searchShops.cancel?.();
});
</script>

<style lang="scss" scoped>
.skill-update-page {
  display: flex;
  flex-direction: column;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--el-bg-color);
}

.skill-update-header {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  padding: 4px 0 18px;

  .back {
    display: grid;
    flex: 0 0 auto;
    place-items: center;
    width: 30px;
    height: 30px;
    padding: 0;
    margin-top: 1px;
    color: var(--el-text-color-secondary);
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 6px;

    &:hover {
      color: var(--el-text-color-primary);
      background: var(--el-fill-color-light);
    }
  }

  h2 {
    margin: 0;
    font-size: 20px;
    font-weight: 650;
    line-height: 1.35;
  }

  p {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.5;
    color: var(--el-text-color-secondary);
  }
}

.skill-update-body {
  width: min(640px, 100%);
  padding: 18px 0 26px;
  overflow: auto;
}

.intro {
  display: flex;
  gap: 12px;
  align-items: flex-start;
  padding: 14px 16px;
  margin-bottom: 22px;
  background: var(--el-color-primary-light-9);
  border: 1px solid var(--el-color-primary-light-8);
  border-radius: 9px;

  .intro-icon {
    flex: 0 0 auto;
    margin-top: 1px;
    color: var(--el-color-primary);
  }

  strong {
    font-size: 14px;
    line-height: 1.5;
  }

  p {
    margin: 4px 0 0;
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-secondary);
  }
}

.setup-card {
  padding: 20px 22px 8px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 12px;
  box-shadow: 0 8px 24px rgb(28 44 78 / 5%);
}

.shop-filter-row {
  display: flex;
  gap: 14px;
  align-items: flex-start;
}

.shop-form-item {
  flex: 1 1 auto;
  min-width: 0;
}

.platform-form-item {
  flex: 0 0 220px;
}

.shop-select {
  width: 100%;
}

.platform-filter {
  width: 100%;
}

.shop-option {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;

  img {
    flex: 0 0 auto;
    width: 22px;
    height: 22px;
    object-fit: contain;
    border-radius: 4px;
  }
}

.shop-option-main {
  display: flex;
  flex-direction: column;
  min-width: 0;

  strong,
  small {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  strong {
    font-size: 13px;
    font-weight: 500;
  }

  small {
    margin-top: 1px;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.field-hint {
  display: block;
  margin-top: 6px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.automation-note {
  display: flex;
  gap: 9px;
  align-items: flex-start;
  padding: 12px 14px;
  margin-top: 4px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-lighter);
  border-radius: 8px;

  > .el-icon {
    flex: 0 0 auto;
    margin-top: 2px;
    color: var(--el-color-info);
  }

  strong {
    display: block;
    color: var(--el-text-color-regular);
    font-size: 13px;
    line-height: 1.5;
  }

  p {
    margin: 3px 0 0;
    font-size: 12px;
    line-height: 1.6;
  }
}

.start-hint {
  flex: 1;
  margin: 0 auto 0 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-text-color-secondary);
}

.skill-update-footer {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 14px 0 2px;
  margin-top: auto;
  border-top: 1px solid var(--el-border-color-lighter);
}

@media (max-width: 600px) {
  .shop-filter-row {
    display: block;
  }

  .platform-form-item {
    width: 100%;
  }
}
</style>
