<template>
  <el-dialog
    v-model="visible"
    class="importModelDialog"
    width="860px"
    :close-on-click-modal="false"
    append-to-body
  >
    <template #header>
      <div class="dialogTitle">{{ t("model.modelImportOwnDialogTitle") }}</div>
    </template>

    <div class="tipsBox">
      <div>{{ t("model.modelImportTipLine1") }}</div>
    </div>

    <div class="formItem required">
      <label>{{ t("model.modelImportFieldModelName") }}</label>
      <el-input
        v-model="modelForm.custom_name"
        maxlength="50"
        show-word-limit
        :placeholder="t('model.modelImportPhModelName')"
      />
    </div>
    <div class="formItem required">
      <label>{{ t("model.modelTableProvider") }}</label>
      <el-select
        v-model="modelForm.providerName"
        class="w-100%"
        :placeholder="t('model.modelImportPhSelectModel')"
        allow-create
        filterable
        @change="changeProvider"
      >
        <el-option
          v-for="item in modelOptions"
          :key="item.id"
          :label="item.name"
          :value="item.code"
        />
      </el-select>
      <div class="quotaTip">
        <span class="red">{{ t("model.modelCallQuotaTip1") }}</span>
        <span>{{ t("model.modelCallQuotaTip2") }}</span>
      </div>
    </div>

    <div class="formItem required">
      <label>{{ t("model.modelImportFieldApiKey") }}</label>
      <el-input v-model="modelForm.apiKey" type="password" show-password :placeholder="t('model.modelImportPhApiKey')" />
    </div>

    <div class="formItem required">
      <label>{{ t("model.modelImportFieldProtocol") }}</label>
      <el-select v-model="modelForm.apiProtocol" class="w-100%">
        <el-option v-for="item in OWN_MODEL_PROTOCOLS" :key="item.value" :label="item.label" :value="item.value" />
      </el-select>
    </div>

    <div class="formItem required">
      <label>{{ t("model.modelImportFieldBaseUrl") }}</label>
      <el-input v-model="modelForm.apiUrl" :placeholder="t('model.modelImportPhBaseUrl')" />
    </div>
    <div class="formItem required">
      <label>{{ t("model.modelImportFieldProvider") }}</label>
      <el-autocomplete
        v-model="modelForm.modelName"
        class="model-name-input"
        :fetch-suggestions="queryRemoteModelSuggestions"
        :placeholder="t('model.modelImportPhModelId')"
        :trigger-on-focus="true"
        clearable
      />
    </div>
    <div class="encryptBlock">
      <div class="encryptHeader">
        <span class="title">{{ t("model.modelImportEncryptBlockTitle") }}</span>
        <span class="safeTag">
          <img :src="Safety" alt="" />
          {{ t("model.modelImportEncryptSafeTag") }}
        </span>
      </div>
      <div class="encryptDesc">
        {{ t("model.modelImportEncryptDesc") }}
      </div>
    </div>

    <template #footer>
      <div class="dialogFooter">
        <el-button :loading="testingConnection" @click="testModelConnection">
          {{ testingConnection ? t("model.modelTesting") : t("model.modelTestConnection") }}
        </el-button>
        <span
          v-if="connectionResult"
          :class="[connectionResult.ok ? 'success' : 'error', 'testResult']"
        >
          <el-icon v-if="connectionResult.ok"><SuccessFilled /></el-icon>
          <el-icon v-else><CircleCloseFilled /></el-icon>
          {{ connectionResult.message }}
        </span>
        <el-button type="primary" class="dialogFooter-btn" :loading="saving" @click="submitForm">
          {{ t("globalCommonWord.add") }}
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { CircleCloseFilled, SuccessFilled } from "@element-plus/icons-vue";
import { useDebounceFn } from "@vueuse/core";
import {
  apiProvider,
  createUserModelImportedApi,
  queryRemoteModelListApi,
  type ModelProviderOption,
  type UserModelImportedInput,
} from "@/ai/api/modelManage";
import Safety from "@/ai/assets/images/Safety.png";
import { errorMessage } from "@/ai/store/modules/superpower-agent.store";
import { superpowerTestConnection, type SuperPowerConnectionResult } from "@/ai/utils/electronApi";
import { createDefaultSettings } from "@/ai/views/superpowerAgent/constants";
import { findModelProvider, OWN_MODEL_PROTOCOLS, ownModelPayload, ownModelProtocol } from "@/ai/utils/ownModelImport";

const emit = defineEmits<{
  saved: [model: { customName: string; modelName: string }];
}>();
const { t } = useI18n();

const visible = ref(false);
const saving = ref(false);
const testingConnection = ref(false);
const connectionResult = ref<SuperPowerConnectionResult | null>(null);
const modelOptions = ref<ModelProviderOption[]>([]);
const remoteModelNames = ref<string[]>([]);
let remoteModelSeq = 0;

const modelForm = reactive<UserModelImportedInput>({
  providerName: "",
  modelName: "",
  apiKey: "",
  apiProtocol: "chat",
  apiUrl: "",
  custom_name: "",
});

function resetForm() {
  modelForm.providerName = "";
  modelForm.modelName = "";
  modelForm.apiKey = "";
  modelForm.apiProtocol = "chat";
  modelForm.apiUrl = "";
  modelForm.custom_name = "";
  connectionResult.value = null;
  remoteModelNames.value = [];
}

async function openCreate() {
  resetForm();
  visible.value = true;
  if (modelOptions.value.length) return;
  try {
    const res: any = await apiProvider();
    if (res?.errorCode === 0) modelOptions.value = res.data || [];
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  }
}

function changeProvider() {
  const provider = findModelProvider(modelForm.providerName, modelOptions.value);
  if (!provider) return;
  modelForm.providerName = provider.code;
  modelForm.apiUrl = provider.url || "";
  modelForm.apiProtocol = ownModelProtocol(provider.defaultApiProtocol);
}

function hasRequiredFields() {
  return [
    modelForm.custom_name,
    modelForm.providerName,
    modelForm.modelName,
    modelForm.apiKey,
    modelForm.apiProtocol,
    modelForm.apiUrl,
  ].every((value) => String(value ?? "").trim());
}

async function testModelConnection() {
  if (!hasRequiredFields()) {
    ElMessage.warning(t("model.modelImportRequired"));
    return;
  }
  testingConnection.value = true;
  connectionResult.value = null;
  try {
    connectionResult.value = await superpowerTestConnection({
      ...createDefaultSettings(),
      providerName: findModelProvider(modelForm.providerName, modelOptions.value)?.name || modelForm.providerName.trim(),
      modelSource: "own",
      modelId: modelForm.modelName.trim(),
      baseUrl: modelForm.apiUrl.trim(),
      apiProtocol: modelForm.apiProtocol,
      apiKey: modelForm.apiKey.trim(),
      hasApiKey: true,
    });
  } catch (cause) {
    connectionResult.value = { ok: false, message: errorMessage(cause) };
  } finally {
    testingConnection.value = false;
  }
}

async function submitForm() {
  if (saving.value) return;
  if (!hasRequiredFields()) {
    ElMessage.warning(t("model.modelImportRequired"));
    return;
  }
  saving.value = true;
  try {
    const res: any = await createUserModelImportedApi(ownModelPayload(modelForm));
    if (res?.errorCode !== 0) {
      ElMessage.error(res?.message || t("model.modelImportRequired"));
      return;
    }
    ElMessage.success(res.message);
    visible.value = false;
    emit("saved", {
      customName: modelForm.custom_name.trim(),
      modelName: modelForm.modelName.trim(),
    });
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  } finally {
    saving.value = false;
  }
}

function normalizeBaseUrl(base: string) {
  const trimmed = base.trim().replace(/\/+$/, "");
  if (!/^https?:\/\//i.test(trimmed)) return "";
  return trimmed;
}

function remoteModelId(item: unknown) {
  if (typeof item === "string") return item.trim();
  if (!item || typeof item !== "object") return "";
  const model = item as Record<string, unknown>;
  return String(model.id || model.name || model.model || "").trim();
}

function parseRemoteModelNames(data: unknown) {
  const record = data && typeof data === "object" ? (data as Record<string, unknown>) : {};
  const list = Array.isArray(data)
    ? data
    : Array.isArray(record.data)
      ? record.data
      : Array.isArray(record.models)
        ? record.models
        : Array.isArray(record.list)
          ? record.list
          : Array.isArray(record.items)
            ? record.items
            : [];
  return [...new Set(list.map(remoteModelId).filter(Boolean))];
}

async function loadRemoteModels() {
  if (!visible.value) return;
  const apiUrl = normalizeBaseUrl(modelForm.apiUrl);
  const seq = ++remoteModelSeq;
  if (!apiUrl) {
    remoteModelNames.value = [];
    return;
  }
  try {
    const res = await queryRemoteModelListApi({
      apiUrl,
      apiKey: modelForm.apiKey.trim(),
    });
    if (seq !== remoteModelSeq) return;
    remoteModelNames.value = res?.errorCode === 0 ? parseRemoteModelNames(res.data) : [];
  } catch {
    if (seq !== remoteModelSeq) return;
    remoteModelNames.value = [];
  }
}

const loadRemoteModelsDebounced = useDebounceFn(loadRemoteModels, 400);

async function queryRemoteModelSuggestions(queryString: string) {
  if (normalizeBaseUrl(modelForm.apiUrl) && !remoteModelNames.value.length) await loadRemoteModels();
  const keyword = queryString.trim().toLowerCase();
  return remoteModelNames.value.filter(name => !keyword || name.toLowerCase().includes(keyword)).map(value => ({value}));
}

watch(
  () => [modelForm.apiUrl, modelForm.apiKey, visible.value] as const,
  ([url, , open]) => {
    ++remoteModelSeq;
    remoteModelNames.value = [];
    if (!open) return;
    if (!normalizeBaseUrl(url)) {
      remoteModelNames.value = [];
      return;
    }
    loadRemoteModelsDebounced();
  }
);

watch(modelForm, () => {
  connectionResult.value = null;
});

defineExpose({ openCreate });
</script>

<style lang="scss" scoped>
.dialogTitle {
  font-weight: 700;
  color: #0f172a;
}

.tipsBox {
  padding: 8px 12px;
  margin-bottom: 18px;
  font-size: 13px;
  line-height: 1.5;
  color: #334155;
  background: #f8fbff;
  border: 1px solid #3370ff;
}

.formItem {
  width: 90%;
  margin-bottom: 12px;
  margin-left: 5%;

  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    color: #111827;
  }

  &.required > label::before {
    margin-right: 4px;
    color: #ff4d4f;
    content: "*";
  }

  :deep(.model-name-input) {
    width: 100%;
  }
}

.quotaTip {
  margin-top: 8px;
  font-size: 13px;
  color: #475569;

  .red {
    color: #ff4d4f;
  }
}

.encryptBlock {
  width: 90%;
  margin-top: 4px;
  margin-bottom: 14px;
  margin-left: 5%;

  .encryptHeader {
    display: flex;
    gap: 10px;
    align-items: center;
    margin-bottom: 4px;
  }

  .title {
    font-size: 14px;
    font-weight: 600;
    color: #0f172a;
  }

  .safeTag {
    display: flex;
    gap: 4px;
    align-items: center;
    padding: 2px 8px;
    font-size: 12px;
    color: #68bf94;
    background: #ecfdf3;
    border-radius: 2px;
  }

  .encryptDesc {
    font-size: 13px;
    line-height: 1.55;
    color: #475569;
  }
}

.testResult {
  width: 70%;
  margin-top: 4px;
  margin-left: 12px;
  font-size: 14px;
  text-align: left;

  .el-icon {
    font-size: 16px;
    transform: translateY(3px);
  }
}

.success.testResult {
  color: #16a34a;
}

.error.testResult {
  color: #ef4444;
}

.dialogFooter {
  display: flex;
  align-items: flex-start;
  padding: 0 5% 12px;
  margin-top: 12px;
  margin-left: 15px;

  .dialogFooter-btn {
    margin-right: 15px;
    margin-left: auto;
  }
}
</style>

<style lang="scss">
.importModelDialog {
  margin-top: 50px;

  .el-dialog__header {
    padding-bottom: 0;
    margin-right: 0;
    border-bottom: 0;
  }

  .el-dialog__body {
    padding: 16px 22px 8px;
  }

  .el-dialog__footer {
    padding: 0;
  }
}
</style>
