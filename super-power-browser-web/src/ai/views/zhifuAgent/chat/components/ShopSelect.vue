<template>
  <el-popover
    v-model:visible="visible"
    :placement="placement"
    :width="520"
    :popper-style="{ maxWidth: 'calc(100vw - 24px)' }"
    trigger="click"
    @show="handleShow"
  >
    <template #reference>
      <el-button size="small" text :class="{ active: visible || modelValue.length > 0 }">
        <el-icon><Shop /></el-icon>
        <span class="label">{{ t("zhifuAgent.composer.pickShop") }}</span>
      </el-button>
    </template>
    <div class="shop-filters">
      <el-input
        v-model="keyword"
        class="shop-search"
        :prefix-icon="Search"
        :placeholder="t('zhifuAgent.composer.searchShop')"
        clearable
        @input="searchShops"
      />
      <el-select
        v-model="platformIds"
        class="platform-filter"
        popper-class="mall-pingtai-select"
        :teleported="false"
        placement="top-start"
        :fallback-placements="['top-start']"
        clearable
        multiple
        collapse-tags
        :placeholder="t('mall.selectPlatform')"
        @change="searchShops"
      >
        <el-option v-for="item in platforms" :key="item.id" :label="item.name" :value="item.id" />
      </el-select>
    </div>
    <div class="shop-list-hint">仅显示绑定设备的店铺</div>
    <div class="selection-toolbar">
      <el-checkbox
        :model-value="allVisibleSelected"
        :indeterminate="someVisibleSelected && !allVisibleSelected"
        :disabled="loading || !shops.length"
        title="仅选择当前已加载的绑定设备店铺"
        @change="toggleVisibleShops"
      >
        全选已加载
      </el-checkbox>
      <span
        class="selection-count"
        aria-live="polite"
        :title="
          '当前已加载列表中选中 ' +
          (loading ? '—' : visibleSelectedCount) +
          ' 家；筛选会保留其他店铺的选择'
        "
      >
        已选
        <strong>{{ modelValue.length }}</strong>
        /{{ MAX_SHOPS }}
        <span v-if="!loading && modelValue.length > visibleSelectedCount">
          （列表外 {{ modelValue.length - visibleSelectedCount }} 家）
        </span>
      </span>
      <el-button link type="primary" :disabled="!modelValue.length" @click="modelValue = []">
        清空
      </el-button>
    </div>
    <el-scrollbar ref="scrollbarRef" v-loading="loading" height="280px" @scroll="onScroll">
      <div v-if="!loading && !shops.length" class="empty">
        {{ t("zhifuAgent.composer.noShop") }}
      </div>
      <div
        v-for="shop in shops"
        :key="shop.id"
        class="shop-item"
        :class="{ selected: isSelected(shop) }"
        role="checkbox"
        :aria-checked="isSelected(shop)"
        tabindex="0"
        @click="choose(shop)"
        @keydown.enter.prevent="choose(shop)"
        @keydown.space.prevent="choose(shop)"
      >
        <img v-if="shop.logo" class="platform-icon" :src="shop.logo" alt="" />
        <div class="shop-copy">
          <strong>{{ shop.name }}</strong>
          <small v-if="shop.platform || shop.account">
            {{ shop.platform }}
            <template v-if="shop.account">· {{ shop.account }}</template>
          </small>
        </div>
        <!-- <span class="shop-id">{{ shop.id }}</span> -->
        <el-icon v-if="isSelected(shop)" class="checked"><Check /></el-icon>
      </div>
      <div v-if="loadingMore" class="more">{{ t("zhifuAgent.composer.shopLoading") }}</div>
    </el-scrollbar>
    <div v-if="showExecutionOptions" class="caption execution-options">
      <el-checkbox v-model="autoCloseShops">
        {{ t("zhifuAgent.composer.autoCloseShops") }}
      </el-checkbox>
      <small style="display: block; white-space: normal">
        {{ t("zhifuAgent.composer.autoCloseShopsHint") }}
      </small>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { Check, Search, Shop } from "@element-plus/icons-vue";
import type { ScrollbarInstance } from "element-plus";
import { useDebounceFn } from "@vueuse/core";
import { getNewMallList, getSiteInfoList } from "@/ai/api/mall/mall.api";
import { errorMessage } from "@/ai/store/modules/zhifu-agent.store";

export interface SelectedShop {
  id: number | string;
  name: string;
  platform?: string;
  account?: string;
  logo?: string;
}

const PAGE_SIZE = 20;
const MAX_SHOPS = 20;

withDefaults(
  defineProps<{
    placement?: "top" | "top-start" | "bottom" | "bottom-start";
    /** 为 true 时点击切换选中，并保持列表打开以便连续多选 */
    multiple?: boolean;
    showExecutionOptions?: boolean;
  }>(),
  { placement: "top-start", multiple: false }
);

const modelValue = defineModel<SelectedShop[]>({ default: () => [] });
const autoCloseShops = defineModel<boolean>("autoCloseShops", { default: false });

const { t } = useI18n();
const visible = ref(false);
const keyword = ref("");
/** 与店铺列表相同，按平台站点 ID 筛选 */
const platformIds = ref<Array<number | string>>([]);
const platforms = ref<{ id: number | string; name: string }[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const shops = ref<SelectedShop[]>([]);
const page = ref(1);
const total = ref(0);
const scrollbarRef = ref<ScrollbarInstance>();
let requestId = 0;

function toShop(item: Record<string, any>): SelectedShop {
  return {
    id: item.id,
    name: String(item.mall_name || item.name || item.id),
    platform: item.platform_name || item.site_name || item.platform || "",
    account: item.mall_account || item.account || "",
    logo: item.logo || "",
  };
}

async function fetchShops(reset: boolean) {
  if (!reset && (loading.value || loadingMore.value || shops.value.length >= total.value)) return;
  const current = reset ? ++requestId : requestId;
  const nextPage = reset ? 1 : page.value + 1;
  if (reset) loading.value = true;
  else loadingMore.value = true;
  try {
    const query: Record<string, any> = {
      page: nextPage,
      limit: PAGE_SIZE,
      mall_name: keyword.value.trim(),
      status: 1,
    };
    if (platformIds.value.length) query.site_info_ids = platformIds.value;
    const res: any = await getNewMallList(query);
    if (current !== requestId) return;
    const list = res?.data?.list || res?.data?.bind_mall_list || [];
    const mapped = list.map(toShop);
    total.value = Number(res?.data?.total ?? mapped.length);
    shops.value = reset ? mapped : shops.value.concat(mapped);
    page.value = nextPage;
  } catch (cause) {
    if (current !== requestId) return;
    if (reset) shops.value = [];
    ElMessage.error(errorMessage(cause));
  } finally {
    if (current === requestId) {
      loading.value = false;
      loadingMore.value = false;
    }
  }
}

const searchShops = useDebounceFn(() => fetchShops(true), 300);

let platformsLoaded = false;

/** 平台选项与店铺列表一致，只取当前账号自己的平台 */
async function loadPlatforms() {
  if (platformsLoaded) return;
  try {
    const res: any = await getSiteInfoList({ mySelf: true });
    platforms.value = res?.data?.siteList || [];
    platformsLoaded = true;
  } catch {
    platforms.value = [];
  }
}

function handleShow() {
  searchShops.cancel?.();
  keyword.value = "";
  platformIds.value = [];
  void loadPlatforms();
  fetchShops(true);
}

function onScroll({ scrollTop }: { scrollTop: number; scrollLeft: number }) {
  const wrap = scrollbarRef.value?.wrapRef;
  if (!wrap) return;
  if (wrap.scrollHeight - scrollTop - wrap.clientHeight <= 24) fetchShops(false);
}

function isSelected(shop: SelectedShop) {
  return modelValue.value.some((item) => String(item.id) === String(shop.id));
}

const allVisibleSelected = computed(() => shops.value.length > 0 && shops.value.every(isSelected));
const visibleSelectedCount = computed(() => shops.value.filter(isSelected).length);
const someVisibleSelected = computed(() => visibleSelectedCount.value > 0);

function showSelectionLimit() {
  const hasHiddenSelection = modelValue.value.length > visibleSelectedCount.value;
  ElMessage.warning(
    hasHiddenSelection
      ? "已选满 20 家，包含其他平台或筛选条件下的店铺，请先取消部分选择或清空已选。"
      : "已选满 20 家，请先取消部分选择或清空已选。"
  );
}

function toggleVisibleShops(checked: boolean | string | number) {
  if (loading.value) return;
  if (!checked) {
    const visibleIds = new Set(shops.value.map((shop) => String(shop.id)));
    modelValue.value = modelValue.value.filter((shop) => !visibleIds.has(String(shop.id)));
    return;
  }
  const selected = [...modelValue.value];
  const ids = new Set(selected.map((shop) => String(shop.id)));
  let exceeded = false;
  for (const shop of shops.value) {
    if (ids.has(String(shop.id))) continue;
    if (selected.length >= MAX_SHOPS) {
      exceeded = true;
      break;
    }
    selected.push(shop);
    ids.add(String(shop.id));
  }
  modelValue.value = selected;
  if (exceeded) showSelectionLimit();
}

function choose(shop: SelectedShop) {
  if (isSelected(shop)) {
    modelValue.value = modelValue.value.filter((item) => String(item.id) !== String(shop.id));
    return;
  }
  if (modelValue.value.length >= MAX_SHOPS) {
    showSelectionLimit();
    return;
  }
  modelValue.value = [...modelValue.value, shop];
}
</script>

<style lang="scss" scoped>
.label {
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.active {
  color: var(--el-color-primary);
}

.shop-filters {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  :deep(.el-input__wrapper),
  :deep(.el-select__wrapper) {
    min-height: 34px;
    box-sizing: border-box;
    border-radius: 6px;
  }
}

.shop-search {
  flex: 1 1 220px;
  width: 0;
  min-width: 160px;
}

.platform-filter {
  flex: 1 1 170px;
  width: 0;
  min-width: 140px;
  max-width: 190px;
}

.execution-options {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid var(--el-border-color-lighter);

  small {
    margin-top: 2px;
    line-height: 1.6;
  }
}

@media (max-width: 480px) {
  .shop-search,
  .platform-filter {
    flex-basis: 100%;
    max-width: none;
  }
}
.caption {
  margin: 10px 2px 6px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.shop-list-hint {
  margin: 8px 2px 0;
  font-size: 12px;
  line-height: 18px;
  color: var(--el-text-color-secondary);
}

.selection-toolbar {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 4px 2px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.selection-count {
  display: flex;
  flex: 1;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);

  strong {
    color: var(--el-color-primary);
    font-weight: 600;
  }
}

.empty,
.more {
  padding: 18px 0;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.more {
  padding: 8px 0 12px;
}

.shop-item {
  display: flex;
  gap: 10px;
  align-items: center;
  padding: 8px;
  cursor: pointer;
  border-radius: 6px;

  &:hover {
    background: var(--el-fill-color-light);
  }

  &.selected {
    background: var(--el-color-primary-light-9);
  }
}

.platform-icon {
  flex: 0 0 24px;
  width: 24px;
  height: 24px;
  object-fit: contain;
  border-radius: 4px;
}

.shop-copy {
  display: flex;
  flex: 1;
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
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.shop-id {
  flex: 0 0 auto;
  padding: 2px 5px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  background: var(--el-fill-color-light);
  border-radius: 4px;
}

.checked {
  color: var(--el-color-primary);
}
</style>
