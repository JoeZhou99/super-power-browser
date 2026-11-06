<template>
  <el-dialog
    :model-value="!!task"
    :title="task?.id ? t('zhifuAgent.scheduled.editTitle') : t('zhifuAgent.scheduled.createTitle')"
    width="560px"
    top="5vh"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    :close-on-press-escape="!scanProvider"
    @close="closeEditor"
  >
    <el-form v-if="task" ref="formRef" :model="task" :rules="rules" label-position="top">
      <div class="access-notice">
        <span class="access-notice-icon" aria-hidden="true">!</span>
        <div>
          <div class="access-notice-title">{{ t("zhifuAgent.scheduled.accessNoticeTitle") }}</div>
          <ul>
            <li>{{ t("zhifuAgent.scheduled.accessNoticeAuto") }}</li>
            <li>{{ t("zhifuAgent.scheduled.accessNoticeRisk") }}</li>
          </ul>
        </div>
      </div>
      <el-form-item :label="t('zhifuAgent.scheduled.formTitle')" prop="title">
        <el-input
          v-model="task.title"
          maxlength="60"
          :placeholder="t('zhifuAgent.scheduled.formTitlePlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="t('zhifuAgent.scheduled.formPrompt')" prop="prompt">
        <el-input
          v-model="task.prompt"
          type="textarea"
          :rows="4"
          :placeholder="t('zhifuAgent.scheduled.formPromptPlaceholder')"
        />
      </el-form-item>
      <el-form-item :label="t('zhifuAgent.chat.usingSkills')">
        <el-select
          v-model="task.skillNames"
          multiple
          filterable
          clearable
          :loading="skillsBusy"
          :placeholder="t('zhifuAgent.scheduled.formSkillsPlaceholder')"
          :no-data-text="t('zhifuAgent.composer.noSkill')"
        >
          <el-option
            v-for="skill in skills"
            :key="`${skill.scope}:${skill.id}`"
            :label="skill.name"
            :value="skill.name"
          >
            <span class="skill-option">
              <span>{{ skill.name }}</span>
              <small>
                {{
                  t(
                    `zhifuAgent.skills.scope${skill.scope.charAt(0).toUpperCase()}${skill.scope.slice(1)}`
                  )
                }}
              </small>
            </span>
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="t('zhifuAgent.scheduled.formShops')">
        <el-select
          v-model="shopIds"
          class="shop-select"
          popper-class="scheduled-shop-popper"
          multiple
          filterable
          remote
          reserve-keyword
          clearable
          fit-input-width
          :remote-method="searchShops"
          :loading="shopSelectLoading"
          :placeholder="t('zhifuAgent.scheduled.formShopsPlaceholder')"
          :no-data-text="t('zhifuAgent.composer.noShop')"
          @visible-change="onShopVisible"
          @popup-scroll="onShopScroll"
        >
          <template #header>
            <div class="shop-dropdown-platform" @mousedown.stop @click.stop @keydown.stop>
              <el-select
                v-model="platformIds"
                class="platform-filter"
                popper-class="mall-pingtai-select"
                :teleported="false"
                placement="bottom-start"
                :fallback-placements="['bottom-start']"
                filterable
                clearable
                multiple
                collapse-tags
                fit-input-width
                :placeholder="t('mall.selectPlatform')"
                @change="onPlatformChange"
              >
                <el-option
                  v-for="item in platforms"
                  :key="item.id"
                  :label="item.name"
                  :value="item.id"
                />
              </el-select>
              <el-checkbox
                :model-value="allFilteredSelected"
                :indeterminate="someFilteredSelected"
                :disabled="!canSelectAllShops"
                @change="onSelectAllShops"
                @click.stop
              >
                {{ t("zhifuAgent.scheduled.selectAllShops") }}
              </el-checkbox>
              <span class="shop-selected-count">
                {{
                  t("zhifuAgent.scheduled.selectedShopCount", {
                    count: shopIds.length,
                    max: MAX_SHOPS,
                  })
                }}
              </span>
            </div>
          </template>
          <el-option
            v-for="shop in shopOptions"
            :key="shop.id"
            :label="shop.name"
            :value="String(shop.id)"
            :class="{ 'shop-option-hidden': !isShopListed(shop) }"
          >
            <span class="skill-option">
              <img v-if="shop.logo" class="platform-icon" :src="shop.logo" alt="" />
              <span class="shop-option-name">{{ shop.name }}</span>
              <small v-if="shop.platform">
                {{ shop.platform }}
              </small>
            </span>
          </el-option>
          <el-option v-if="shopsLoadingMore" disabled :value="SHOP_LOADING_VALUE" label=" ">
            <span class="shop-more">{{ t("zhifuAgent.composer.shopLoading") }}</span>
          </el-option>
        </el-select>
      </el-form-item>

      <div class="schedule-fields">
        <el-form-item v-if="task.shops?.length" style="grid-column: 1 / -1">
          <el-checkbox v-model="task.autoCloseShops">
            {{ t("zhifuAgent.composer.autoCloseShops") }}
          </el-checkbox>
          <small style="display: block; line-height: 1.5">
            {{ t("zhifuAgent.composer.autoCloseShopsHint") }}
          </small>
        </el-form-item>
        <el-form-item :label="t('zhifuAgent.scheduled.formFrequency')">
          <el-select v-model="task.frequency">
            <el-option value="once" :label="t('zhifuAgent.scheduled.frequencyOnce')" />
            <el-option value="daily" :label="t('zhifuAgent.scheduled.frequencyDaily')" />
            <el-option value="weekly" :label="t('zhifuAgent.scheduled.frequencyWeekly')" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="task.frequency === 'once'" :label="t('zhifuAgent.scheduled.formDate')">
          <el-date-picker
            v-model="task.date"
            type="date"
            value-format="YYYY-MM-DD"
            :clearable="false"
          />
        </el-form-item>
        <el-form-item
          v-else-if="task.frequency === 'weekly'"
          :label="t('zhifuAgent.scheduled.formWeekday')"
        >
          <el-select v-model="task.weekdays[0]">
            <el-option
              v-for="day in WEEKDAYS"
              :key="day"
              :value="day"
              :label="t(`zhifuAgent.scheduled.weekday${day}`)"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('zhifuAgent.scheduled.formTime')">
          <el-time-picker
            v-model="task.time"
            format="HH:mm"
            value-format="HH:mm"
            :clearable="false"
          />
        </el-form-item>
      </div>


      <el-form-item style="margin-bottom: 0">
        <el-checkbox v-model="task.enabled">
          {{ t("zhifuAgent.scheduled.formEnabled") }}
        </el-checkbox>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button :disabled="saving" @click="task = null">
        {{ t("zhifuAgent.common.cancel") }}
      </el-button>
      <el-button
        v-if="saveAndView"
        type="primary"
        :loading="saving && pendingView"
        :disabled="saving"
        @click="submit(true)"
      >
        {{ t("zhifuAgent.scheduled.formSaveAndView") }}
      </el-button>
      <el-button
        type="primary"
        :loading="saving && !pendingView"
        :disabled="saving"
        @click="submit()"
      >
        {{ t("zhifuAgent.scheduled.formSave") }}
      </el-button>
    </template>
  </el-dialog>
  <ImConfigDialog v-model="scanProvider" @configured="selectConfiguredChannel" />
</template>

<script setup lang="ts">
import type { FormInstance, FormRules } from "element-plus";
import { useDebounceFn } from "@vueuse/core";
import { getNewMallList, getSiteInfoList } from "@/ai/api/mall/mall.api";
import type { PushPlatform, ScheduledShop, ScheduledTask } from "@/ai/api/zhifuAgent";
import ImConfigDialog from "@/ai/views/zhifuAgent/settings/components/ImConfigDialog.vue";
import { errorMessage, skillIdentity, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuListSkills, type ZhifuLocalSkill } from "@/ai/utils/electronApi";
import { normalizeTaskShops } from "../../utils/taskShops";

const task = defineModel<ScheduledTask | null>({ default: null });
const props = defineProps<{ saving?: boolean; saveAndView?: boolean }>();
const emit = defineEmits<{
  (event: "save" | "saveAndView", task: ScheduledTask): void;
}>();

const store = useZhifuAgentStore();
const { t } = useI18n();

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0];
const SHOP_PAGE_SIZE = 20;
const SHOP_LOADING_VALUE = "__shop_loading__";
/** 与聊天里选择店铺一致，一次最多 20 家 */
const MAX_SHOPS = 20;

const formRef = ref<FormInstance>();
const pushSelectRef = ref<{ blur: () => void }>();
const scanProvider = ref<PushPlatform | "">("");
let preserveEditor = false;

function closeEditor() {
  if (scanProvider.value || preserveEditor) return;
  task.value = null;
}

function selectConfiguredChannel(id: PushPlatform) {
  setPushPlatform(id);
}

watch(scanProvider, (value) => {
  if (value) {
    preserveEditor = true;
    return;
  }
  window.setTimeout(() => {
    preserveEditor = false;
  }, 400);
});
const skills = ref<ZhifuLocalSkill[]>([]);
const skillsBusy = ref(false);
const shopKeyword = ref("");
/** 与店铺列表相同，按平台站点 ID 筛选 */
const platformIds = ref<Array<number | string>>([]);
const platforms = ref<{ id: number | string; name: string }[]>([]);
const shopList = ref<ScheduledShop[]>([]);
const shopPage = ref(1);
const shopTotal = ref(0);
const shopsLoading = ref(false);
const shopsLoadingMore = ref(false);
/** 列表还是空的才显示加载态，筛选平台时不把已打开的下拉藏起来 */
const shopSelectLoading = computed(() => shopsLoading.value && shopList.value.length === 0);
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

/** 下拉按接口返回的顺序展示，已选但不在当前筛选里的店铺只用来保留名称 */
const shopOptions = computed(() => {
  const listedIds = new Set(shopList.value.map((shop) => String(shop.id)));
  const extra = (task.value?.shops || []).filter((shop) => !listedIds.has(String(shop.id)));
  return [...shopList.value, ...extra];
});

const shopIds = computed<string[]>({
  get: () => (task.value?.shops || []).map((shop) => String(shop.id)),
  set: (ids) => {
    if (!task.value) return;
    const current = task.value.shops || [];
    const currentIds = new Set(current.map((shop) => String(shop.id)));
    const requested = ids.filter((id) => id !== SHOP_LOADING_VALUE);
    const requestedIds = new Set(requested);
    const kept = current.filter((shop) => requestedIds.has(String(shop.id)));
    const adding = requested.filter((id) => !currentIds.has(id));
    if (!adding.length) {
      task.value.shops = kept;
      return;
    }
    const room = MAX_SHOPS - kept.length;
    if (room <= 0) {
      task.value.shops = [...current];
      showShopLimit();
      return;
    }
    const accepted = adding.slice(0, room).flatMap((id) => {
      const shop = shopCatalog.get(id);
      return shop ? [shop] : [];
    });
    task.value.shops = [...kept, ...accepted];
    if (accepted.length < adding.length) showShopLimit();
  },
});

function isShopListed(shop: ScheduledShop) {
  return shopList.value.some((item) => String(item.id) === String(shop.id));
}

/** 当前筛选结果已经全部出现在列表里，并且都被选中 */
const allFilteredSelected = computed(() => {
  if (!shopList.value.length || shopList.value.length < shopTotal.value) return false;
  const selected = new Set(shopIds.value);
  return shopList.value.every((shop) => selected.has(String(shop.id)));
});

/** 当前筛选里只选中了一部分 */
const someFilteredSelected = computed(() => {
  if (allFilteredSelected.value) return false;
  const selected = new Set(shopIds.value);
  return shopList.value.some((shop) => selected.has(String(shop.id)));
});

const canSelectAllShops = computed(() => !shopsLoading.value && shopTotal.value > 0);

/** 已选满 20 家时提示，和其他筛选里已经选中的店铺一起算 */
function showShopLimit() {
  const listedIds = new Set(shopList.value.map((shop) => String(shop.id)));
  const hidden = (task.value?.shops || []).filter((shop) => !listedIds.has(String(shop.id))).length;
  ElMessage.warning(
    hidden > 0
      ? t("zhifuAgent.scheduled.shopLimitWithHidden", { max: MAX_SHOPS })
      : t("zhifuAgent.scheduled.shopLimit", { max: MAX_SHOPS })
  );
}

/** 勾上时从当前筛选里补到 20 家，取消时只去掉这批已加载的店铺 */
async function onSelectAllShops(checked: boolean | string | number) {
  if (!task.value || !canSelectAllShops.value) return;
  if (checked !== true) {
    const listedIds = new Set(shopList.value.map((shop) => String(shop.id)));
    task.value.shops = (task.value.shops || []).filter((shop) => !listedIds.has(String(shop.id)));
    return;
  }
  let guard = 0;
  while (guard < 20 && task.value) {
    const current = task.value.shops || [];
    const currentIds = new Set(current.map((shop) => String(shop.id)));
    const available = shopList.value.filter((shop) => !currentIds.has(String(shop.id))).length;
    if (current.length >= MAX_SHOPS || available >= MAX_SHOPS - current.length) break;
    if (shopList.value.length >= shopTotal.value) break;
    const before = shopList.value.length;
    await fetchShops(false);
    if (!task.value || shopList.value.length === before) break;
    guard += 1;
  }
  if (!task.value) return;
  const current = task.value.shops || [];
  const currentIds = new Set(current.map((shop) => String(shop.id)));
  const room = MAX_SHOPS - current.length;
  if (room <= 0) {
    showShopLimit();
    return;
  }
  const extras = shopList.value.filter((shop) => !currentIds.has(String(shop.id)));
  const adding = extras.slice(0, room);
  task.value.shops = [...current, ...adding];
  if (adding.length < extras.length || shopList.value.length < shopTotal.value) showShopLimit();
}

const rules = computed<FormRules>(() => ({
  title: [
    { required: true, message: t("zhifuAgent.scheduled.formTitleRequired"), trigger: "blur" },
  ],
  prompt: [
    { required: true, message: t("zhifuAgent.scheduled.formPromptRequired"), trigger: "blur" },
  ],
}));

function pushChannelStatus(enabled: boolean, state: string) {
  if (!enabled) return { tone: "muted" as const, statusText: "" };
  if (state === "connected") {
    return { tone: "success" as const, statusText: t("zhifuAgent.im.connected") };
  }
  if (state === "connecting") {
    return { tone: "warning" as const, statusText: t("zhifuAgent.im.connecting") };
  }
  return { tone: "danger" as const, statusText: t("zhifuAgent.im.abnormal") };
}

const pushOptions = computed(() => [
  {
    id: "feishu" as PushPlatform,
    label: t("zhifuAgent.im.feishu"),
    enabled: store.findMessageChannel(1).enabled,
    ...pushChannelStatus(store.findMessageChannel(1).enabled, store.feishuConnection.state),
  },
  {
    id: "wechat" as PushPlatform,
    label: t("zhifuAgent.im.wechat"),
    enabled: store.findMessageChannel(4).enabled,
    ...pushChannelStatus(store.findMessageChannel(4).enabled, store.wechatConnection.state),
  },
  {
    id: "wecom" as PushPlatform,
    label: t("zhifuAgent.im.wecom"),
    enabled: store.findMessageChannel(5).enabled,
    ...pushChannelStatus(store.findMessageChannel(5).enabled, store.wecomConnection.state),
  },
]);

let skillRequestId = 0;
async function loadSkills() {
  if (!task.value) return;
  const requestId = ++skillRequestId;
  skills.value = [];
  skillsBusy.value = true;
  try {
    const items = await zhifuListSkills({ workspace: task.value.workspace });
    if (requestId !== skillRequestId) return;
    const unique = new Map<string, ZhifuLocalSkill>();
    for (const skill of items || []) {
      const identity = skillIdentity(skill.name);
      if (!skill.enabled || skill.invalid || unique.has(identity)) continue;
      unique.set(identity, skill);
    }
    skills.value = [...unique.values()];
  } catch (cause) {
    if (requestId !== skillRequestId) return;
    skills.value = [];
    ElMessage.error(errorMessage(cause));
  } finally {
    if (requestId === skillRequestId) skillsBusy.value = false;
  }
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
    const query: Record<string, any> = {
      page: nextPage,
      limit: SHOP_PAGE_SIZE,
      mall_name: shopKeyword.value.trim(),
      status: 1,
    };
    if (platformIds.value.length) query.site_info_ids = platformIds.value;
    const res: any = await getNewMallList(query);
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

function onPlatformChange() {
  searchShops.cancel?.();
  fetchShops(true);
}

function onShopVisible(open: boolean) {
  if (!open) return;
  searchShops.cancel?.();
  shopKeyword.value = "";
  void loadPlatforms();
  fetchShops(true);
  nextTick(bindShopScroll);
}

function bindShopScroll() {
  const wrap = document.querySelector(
    ".scheduled-shop-popper .el-select-dropdown__wrap"
  ) as HTMLElement | null;
  if (!wrap || wrap.dataset.shopScrollBound) return;
  wrap.dataset.shopScrollBound = "1";
  wrap.addEventListener("scroll", () => {
    if (wrap.scrollHeight - wrap.scrollTop - wrap.clientHeight <= 24) fetchShops(false);
  });
}

function onShopScroll({ scrollTop }: { scrollTop: number }) {
  const wrap = document.querySelector(
    ".scheduled-shop-popper .el-select-dropdown__wrap"
  ) as HTMLElement | null;
  if (!wrap) return;
  if (wrap.scrollHeight - scrollTop - wrap.clientHeight <= 24) fetchShops(false);
}

function setPushPlatform(value: PushPlatform | "") {
  if (task.value) task.value.pushPlatforms = value ? [value] : [];
}

function openChannelScan(id: PushPlatform) {
  preserveEditor = true;
  scanProvider.value = id;
  pushSelectRef.value?.blur();
}

const pendingView = ref(false);

watch(
  () => props.saving,
  (value) => {
    if (!value) pendingView.value = false;
  }
);

async function submit(view = false) {
  if (!task.value || !formRef.value || skillsBusy.value) return;
  const valid = await formRef.value.validate().catch(() => false);
  if (!valid) return;
  const available = new Set(skills.value.map((skill) => skillIdentity(skill.name)));
  const unavailable = (task.value.skillNames || []).filter(
    (name) => !available.has(skillIdentity(name))
  );
  if (unavailable.length) {
    ElMessage.error(
      t("zhifuAgent.scheduled.skillsUnavailable", { skills: unavailable.join("、") })
    );
    return;
  }
  pendingView.value = view;
  task.value.shops = normalizeTaskShops(task.value.shops);
  emit(view ? "saveAndView" : "save", task.value);
}

watch(
  () => task.value && `${task.value.id || "new"}:${task.value.workspace}`,
  (key) => {
    if (!key || !task.value) {
      skillRequestId++;
      skills.value = [];
      skillsBusy.value = false;
      return;
    }
    shopList.value = [];
    shopPage.value = 1;
    shopTotal.value = 0;
    shopKeyword.value = "";
    platformIds.value = [];
    void loadPlatforms();
    rememberShops(task.value.shops || []);
    loadSkills();
  }
);
</script>

<style lang="scss" scoped>
.access-notice {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin-bottom: 16px;
  padding: 12px 14px;
  background: #fff8e8;
  border: 1px solid #ffe4b3;
  border-radius: 8px;

  .access-notice-icon {
    display: flex;
    flex: none;
    align-items: center;
    justify-content: center;
    width: 16px;
    height: 16px;
    margin-top: 2px;
    font-size: 12px;
    font-weight: 700;
    line-height: 1;
    color: #fff;
    background: #f5a524;
    border-radius: 50%;
  }

  .access-notice-title {
    margin-bottom: 4px;
    font-size: 14px;
    font-weight: 600;
    line-height: 20px;
    color: var(--el-text-color-primary);
  }

  ul {
    margin: 0;
    // padding-left: 18px;
    font-size: 13px;
    line-height: 1.6;
    color: var(--el-text-color-regular);
  }
}

.schedule-fields {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;

  :deep(.el-date-editor),
  :deep(.el-select) {
    width: 100%;
  }
}

:deep(.el-select) {
  width: 100%;
}

.platform-icon {
  flex: 0 0 18px;
  width: 18px;
  height: 18px;
  object-fit: contain;
  border-radius: 4px;
}

.shop-option-name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shop-more {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.skill-option,
.push-option {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  width: 100%;

  .push-option-extra {
    display: flex;
    gap: 8px;
    align-items: center;
  }

  small {
    font-size: 12px;
    color: var(--el-text-color-secondary);

    &.is-success {
      color: var(--el-color-success);
    }

    &.is-warning {
      color: var(--el-color-warning);
    }

    &.is-danger {
      color: var(--el-color-danger);
    }
  }
}
</style>

<style lang="scss">
.scheduled-shop-popper .shop-option-hidden {
  display: none;
}

.scheduled-shop-popper.el-select-dropdown {
  box-sizing: border-box;
  overflow-x: hidden;
}

.scheduled-shop-popper .el-select-dropdown__item {
  overflow: hidden;
}

.scheduled-shop-popper .el-select-dropdown__wrap {
  height: 280px;
  max-height: 280px !important;
}

.scheduled-shop-popper .mall-pingtai-select .el-select-dropdown__wrap {
  height: auto;
  max-height: 274px !important;
}

.scheduled-shop-popper .shop-dropdown-platform {
  display: flex;
  gap: 8px;
  align-items: center;
  width: 100%;
  padding: 0 4px;
}

.scheduled-shop-popper .shop-dropdown-platform .el-select {
  flex: 1;
  width: auto;
  min-width: 0;
}

.scheduled-shop-popper .shop-selected-count {
  flex-shrink: 0;
  font-size: 12px;
  line-height: 1;
  color: var(--el-text-color-secondary);
  white-space: nowrap;
}

.scheduled-push-popper .el-select-dropdown__item.is-disabled .el-link {
  pointer-events: auto;
  cursor: pointer;
}
</style>
