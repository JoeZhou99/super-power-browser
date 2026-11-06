<template>
  <el-dropdown
    trigger="click"
    placement="top-end"
    popper-class="zhifu-model-menu"
    @command="handleCommand"
    @visible-change="onMenuVisible"
  >
    <el-button size="small" text>
      {{ currentLabel }}
      <el-icon class="el-icon--right"><ArrowDown /></el-icon>
    </el-button>
    <template #dropdown>
      <el-dropdown-menu>
        <el-dropdown-item disabled class="menu-head">
          <div class="menu-head-inner">
            <div class="menu-title">{{ t("zhifuAgent.composer.chooseModel") }}</div>
          </div>
        </el-dropdown-item>
        <div class="menu-scroll">
          <el-dropdown-item v-if="officialOptions.length" disabled class="menu-group">
            {{ t("zhifuAgent.composer.systemModel") }}
          </el-dropdown-item>
          <el-dropdown-item
            v-for="item in officialOptions"
            :key="item.id"
            :command="String(item.id)"
          >
            <span class="option">
              <span class="option-main">
                <img :src="selectModelIcon" class="model-icon" alt="" />
                <span class="option-name">{{ item.label }}</span>
              </span>
              <el-icon v-if="item.id === selectedId" class="checked"><Check /></el-icon>
            </span>
          </el-dropdown-item>
          <el-dropdown-item v-if="ownOptions.length" disabled class="menu-group menu-group--own">
            {{ t("zhifuAgent.composer.ownModelSection") }}
          </el-dropdown-item>
          <el-dropdown-item v-for="item in ownOptions" :key="item.id" :command="String(item.id)">
            <span class="option">
              <span class="option-main">
                <img :src="selectModelIcon" class="model-icon" alt="" />
                <span class="option-name">{{ item.label }}</span>
              </span>
              <el-icon v-if="item.id === selectedId" class="checked"><Check /></el-icon>
            </span>
          </el-dropdown-item>
        </div>
        <el-dropdown-item command="__custom__" class="menu-config">
          <span class="config-line">
            <img :src="customModelIcon" class="config-icon" alt="" />
            {{ t("zhifuAgent.composer.customModel") }}
          </span>
        </el-dropdown-item>
      </el-dropdown-menu>
    </template>
  </el-dropdown>
  <ImportOwnModelDialog ref="importDialogRef" @saved="onModelImported" />
</template>

<script setup lang="ts">
import { ArrowDown, Check } from "@element-plus/icons-vue";
import { ElMessage } from "element-plus";
import selectModelIcon from "@/ai/assets/icons/selectModel.svg";
import customModelIcon from "@/ai/assets/icons/customModel.svg";
import { queryUserModelImportedApi } from "@/ai/api/modelManage";
import {
  getZhifuMarketModels,
  getZhifuModelUser,
  type ApiProtocol,
  type ZhifuMarketModel,
} from "@/ai/api/zhifuAgent";
import { useUserStore } from "@/ai/store/modules/user.store";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import ImportOwnModelDialog from "./ImportOwnModelDialog.vue";

interface ModelOption {
  id: string | number;
  label: string;
  modelId: string;
  apiKey: string;
  baseUrl: string;
  apiProtocol: ApiProtocol;
  source: "official" | "own";
}

const store = useZhifuAgentStore();
const userStore = useUserStore();
const { t } = useI18n();
const importDialogRef = ref<InstanceType<typeof ImportOwnModelDialog>>();

const options = ref<ModelOption[]>([]);
/** 与设置里的账号判断一致：先用 id，没有再用 uid */
const accountId = computed(() => String(userStore.userInfo?.id || userStore.userInfo?.uid || ""));

/** 同一账号只请求一次 model/user，展开下拉时复用。续费后 revision 变化则重新请求 */
let modelUserTask: { uid: string; promise: Promise<{ apiKey: string; baseUrl: string }> } | null =
  null;
/** 账号切换后旧的模型列表请求不能再改当前选中项或清掉密钥 */
let loadSeq = 0;

function normalizeUrl(url: string) {
  return url.trim().replace(/\/+$/, "");
}

const selectedId = computed(
  () =>
    options.value.find(
      (item) =>
        item.modelId === store.settings.modelId &&
        normalizeUrl(item.baseUrl) === normalizeUrl(store.settings.baseUrl)
    )?.id ?? ""
);
const currentLabel = computed(() => {
  const current = options.value.find((item) => item.id === selectedId.value);
  return current?.label || t("zhifuAgent.composer.chooseModel");
});
const officialOptions = computed(() => options.value.filter((item) => item.source === "official"));
const ownOptions = computed(() => options.value.filter((item) => item.source === "own"));

function toProtocol(value: unknown): ApiProtocol {
  return String(value || "").toLowerCase() === "responses" ? "responses" : "chat";
}

async function loadMarketModelItems() {
  const res: any = await getZhifuMarketModels();
  if (res?.errorCode !== 0) return [];
  return (Array.isArray(res?.data) ? res.data : []) as ZhifuMarketModel[];
}

function mapOfficialModels(items: ZhifuMarketModel[], apiKey: string, baseUrl: string) {
  const seen = new Set<string>();
  const models: ModelOption[] = [];
  for (const item of items) {
    const modelId = String(item.id || "").trim();
    if (!modelId || seen.has(modelId)) continue;
    seen.add(modelId);
    models.push({
      id: modelId,
      label: String(item.name || modelId).trim(),
      modelId,
      apiKey,
      baseUrl,
      apiProtocol: toProtocol(item.protocol),
      source: "official",
    });
  }
  return models;
}

function mapOwnModels(list: any[]) {
  return list
    .map((item) => ({
      id: item.id,
      label: String(item.custom_name || item.modelName || "").trim(),
      modelId: String(item.modelName || "").trim(),
      apiKey: String(item.apiKey || ""),
      baseUrl: String(item.apiUrl || "").trim(),
      apiProtocol: toProtocol(item.apiProtocol),
      source: "own" as const,
    }))
    .filter((item) => item.id !== undefined && item.id !== null && item.modelId);
}

function loadModelUser() {
  const uid = accountId.value;
  if (modelUserTask?.uid === uid) return modelUserTask.promise;
  const promise = getZhifuModelUser()
    .then((res: any) => {
      const user = res?.errorCode === 0 ? res.data || {} : {};
      return {
        apiKey: String(user.api_key || "").trim(),
        baseUrl: String(user.api_url || "").trim(),
      };
    })
    .catch((error) => {
      if (modelUserTask?.uid === uid) modelUserTask = null;
      throw error;
    });
  modelUserTask = { uid, promise };
  return promise;
}

/** 拉取官方模型和自有模型。切到历史会话时核对当前选中项，不可用就清掉，不自动换一个 */
async function loadModels(loadOptions?: { clearIfMissing?: boolean }) {
  const seq = ++loadSeq;
  const uid = accountId.value;
  const stale = () => seq !== loadSeq || accountId.value !== uid;
  await store.init().catch(() => {});
  await store.whenModelKeyBound().catch(() => {});
  if (stale()) return;
  const [importedResult, marketResult, userResult] = await Promise.allSettled([
    queryUserModelImportedApi({ page: 1, limit: 100 }),
    loadMarketModelItems(),
    loadModelUser(),
  ]);
  if (stale()) return;
  const importedRes: any = importedResult.status === "fulfilled" ? importedResult.value : null;
  const marketItems = marketResult.status === "fulfilled" ? marketResult.value : [];
  const user = userResult.status === "fulfilled" ? userResult.value : { apiKey: "", baseUrl: "" };
  const ownList = Array.isArray(importedRes?.data?.modelConfigList)
    ? importedRes.data.modelConfigList
    : [];
  const sharedApiKey = user.apiKey;
  const sharedBaseUrl = user.baseUrl || (sharedApiKey ? store.settings.baseUrl : "");
  const officialModels =
    sharedApiKey && sharedBaseUrl
      ? mapOfficialModels(marketItems, sharedApiKey, sharedBaseUrl)
      : [];
  options.value = [...officialModels, ...mapOwnModels(ownList)];
  const listsReady =
    importedResult.status === "fulfilled" &&
    marketResult.status === "fulfilled" &&
    userResult.status === "fulfilled";
  const hasUsableModel =
    options.value.some((item) => item.apiKey) || (Boolean(sharedApiKey) && marketItems.length > 0);
  if (loadOptions?.clearIfMissing) {
    if (!listsReady) return;
    const currentModelId = String(store.settings.modelId || "").trim();
    const selected = options.value.find((item) => item.id === selectedId.value && item.apiKey);
    if (selected) {
      await applyListedModelKey();
    } else if (currentModelId && !stale()) {
      await store.saveSettings({ modelId: "" });
      ElMessage.warning(t("zhifuAgent.composer.modelUnavailable"));
    }
    if (!hasUsableModel && !stale() && store.settings.hasApiKey) {
      await store.saveSettings({ apiKey: "", clearApiKey: true });
    }
    return;
  }
  if (!hasUsableModel && listsReady && store.settings.hasApiKey) {
    await store.saveSettings({ apiKey: "", clearApiKey: true });
    return;
  }
  // 已经清空的选择留给用户自己点，避免打开下拉时又自动选上一个
  if (!String(store.settings.modelId || "").trim()) return;
  if (options.value.length) {
    const selected = options.value.find((item) => item.id === selectedId.value);
    const next = selected?.apiKey ? selected : options.value.find((item) => item.apiKey);
    if (next) await selectModel(next);
  }
  if (importedResult.status === "rejected" && marketResult.status === "rejected") {
    throw importedResult.reason;
  }
}

watch(
  () => store.modelUserRevision,
  () => {
    modelUserTask = null;
    loadModels().catch(() => {});
  }
);

/** 刷新后本机可能没有密钥，当前选中模型在线上列表里时，用列表中的密钥补回本机 */
async function applyListedModelKey() {
  const selected = options.value.find((item) => item.id === selectedId.value);
  const current = selected?.apiKey ? selected : options.value.find((item) => item.apiKey);
  if (!current?.apiKey || store.settings.apiKey || store.settings.hasApiKey) return;
  await store.saveSettings({
    modelId: current.modelId,
    apiKey: current.apiKey,
    baseUrl: current.baseUrl || store.settings.baseUrl,
    apiProtocol: current.apiProtocol,
    hasApiKey: true,
    modelSource: current.source,
  });
}

function onMenuVisible(visible: boolean) {
  if (!visible) return;
  loadModels().catch((cause) => {
    store.error = errorMessage(cause);
  });
}

async function selectModel(model: ModelOption) {
  await store.saveSettings({
    modelId: model.modelId,
    apiKey: model.apiKey,
    baseUrl: model.baseUrl || store.settings.baseUrl,
    apiProtocol: model.apiProtocol,
    hasApiKey: Boolean(model.apiKey),
    modelSource: model.source,
  });
}

async function onModelImported(model: { customName: string; modelName: string }) {
  try {
    await loadModels();
    const imported = options.value.find(
      (item) =>
        item.source === "own" &&
        item.modelId === model.modelName &&
        (!model.customName || item.label === model.customName)
    );
    if (imported) await selectModel(imported);
  } catch (cause) {
    store.error = errorMessage(cause);
  }
}

async function handleCommand(command: string) {
  if (command === "__custom__") {
    importDialogRef.value?.openCreate();
    return;
  }
  const model = options.value.find((item) => String(item.id) === command);
  if (!model || model.id === selectedId.value) return;
  try {
    await selectModel(model);
  } catch (cause) {
    store.error = errorMessage(cause);
  }
}

watch(accountId, (uid, prev) => {
  if (!uid || uid === prev) return;
  modelUserTask = null;
  options.value = [];
  loadModels().catch(() => {});
});

watch(
  () => store.activeId,
  (id, previous) => {
    if (!id || !previous || id === previous) return;
    loadModels({ clearIfMissing: true }).catch((cause) => {
      store.error = errorMessage(cause);
    });
  }
);

onMounted(() => {
  loadModels().catch(() => {});
});
</script>

<style lang="scss">
.zhifu-model-menu {
  border-radius: 12px !important;

  .el-dropdown-menu {
    min-width: 280px;
    padding: 6px 0 0;
    overflow: hidden;
    border-radius: 12px;
  }

  .menu-scroll {
    max-height: 260px;
    overflow-y: auto;
  }

  .el-dropdown-menu__item {
    padding: 8px 16px;
    font-size: 14px;
    line-height: 24px;
    color: #262626;
  }

  .el-dropdown-menu__item.is-disabled {
    color: #8f959e;
    cursor: default;
    background: transparent !important;
    opacity: 1;
  }

  .menu-head {
    height: auto;
    padding: 10px 16px 4px;
  }

  .menu-head-inner {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
  }

  .menu-title {
    font-size: 15px;
    font-weight: 600;
    line-height: 22px;
    color: #1f2329;
  }

  .menu-desc {
    margin-top: 2px;
    font-size: 12px;
    font-weight: 400;
    line-height: 18px;
    color: #8f959e;
  }

  .menu-group {
    height: auto;
    padding: 10px 16px 2px;
    font-size: 12px;
    line-height: 18px;
    color: #8f959e;
  }

  .menu-group--own {
    margin-top: 8px;
  }

  .menu-config {
    position: sticky;
    bottom: 0;
    background: #fff;
    border-top: 1px solid #f0f0f0;
  }

  .option {
    display: flex;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
    width: 100%;
  }

  .option-main {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    min-width: 0;
  }

  .model-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
  }

  .option-name {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .checked {
    flex-shrink: 0;
    font-size: 16px;
    color: #3370ff;
  }

  .config-line {
    display: inline-flex;
    gap: 8px;
    align-items: center;
  }

  .config-icon {
    flex-shrink: 0;
    width: 16px;
    height: 16px;
  }
}
</style>
