<template>
  <div class="model-page zhifu-page">
    <header class="page-header">
      <h2>{{ t("zhifuAgent.settings.modelManagement") }}</h2>
    </header>
    <div class="toolbar">
      <div class="toolbar-left" v-if="activeTab === 'official'">
        <el-button v-if="hasPerm('ai.purchase')" class="recharge-btn" type="primary" @click="goBuy">
          {{ buyActionText }}
        </el-button>
        <span class="model-total">
          {{ t("model.modelTotalPrefix") }}{{ supplier_total }}{{ t("model.modelTotalSuffix") }}
        </span>
      </div>
      <div v-show="activeTab === 'mine'" flex>
        <el-button v-if="hasPerm('ai.purchase')" class="recharge-btn" type="primary" @click="goBuy">
          {{ buyActionText }}
        </el-button>
        <el-button
          class="experienceTips-btn mr-12px"
          v-if="hasPerm('zfclaw.import')"
          @click="openImportModel"
        >
          {{ t("model.modelImportBtn") }}
        </el-button>
      </div>
      <div class="toolbar-right">
        <div class="search-wrap">
          <el-icon class="search-icon"><Search /></el-icon>
          <el-input
            v-model="searchText"
            class="search-input"
            :placeholder="t('mall.supportMultipleNames')"
            clearable
          />
        </div>
        <el-button
          class="iconBtn"
          @click="activeTab === 'mine' ? queryUserModelImported() : getModelsList()"
        >
          <el-icon :class="`i-svg:refreshSvg iconStyle`" />
        </el-button>
      </div>
    </div>

    <div class="tabs">
      <span
        :class="['tab', activeTab === 'official' ? 'active' : '']"
        @click="activeTab = 'official'"
      >
        {{ t("model.modelOfficialTab") }}
      </span>
      <span :class="['tab', activeTab === 'mine' ? 'active' : '']" @click="activeTab = 'mine'">
        {{ t("model.modelMineTab") }}
      </span>
    </div>
    <div class="table-panel">
      <!-- 官方模型列表 -->
      <el-table
        v-show="activeTab === 'official'"
        :data="officialModelData"
        class="model-table"
        height="100%"
        header-row-class-name="table-header-row"
        row-class-name="table-body-row"
      >
        <el-table-column prop="name" :label="t('model.modelTableName')" width="180" />
        <el-table-column
          prop="description"
          :label="t('model.commonWord.description')"
          min-width="280"
          show-overflow-tooltip
        />
        <el-table-column
          prop="billing_type"
          :label="t('model.modelTableBillingType')"
          width="120"
        />
        <template #empty>
          <div class="nodata">
            <img :src="noData" />
            <p class="empty-list">
              {{ t("model.Duration.notmodels") }}
            </p>
          </div>
        </template>
      </el-table>
      <!-- 我导入的模型 -->
      <el-table
        v-show="activeTab === 'mine'"
        :data="mineModelData"
        class="model-table"
        height="100%"
        header-row-class-name="table-header-row"
        row-class-name="table-body-row"
      >
        <el-table-column
          prop="custom_name"
          :label="t('model.modelImportFieldModelName')"
          width="140"
        />
        <el-table-column
          prop="modelName"
          :label="t('model.modelWalletPackageOrderModel')"
          min-width="100"
          show-overflow-tooltip
        />
        <el-table-column :label="t('model.commonWord.Exclusive')" min-width="140">
          <template #default="{ row }">
            <p class="copyLine">
              <span class="copyText" :title="row.apiKey">
                {{ row.apiKey.length > 5 ? row.apiKey.slice(0, 5) + "***" : row.apiKey }}
              </span>
              <img :src="copyPng" class="copyIcon" @click="copyContent(row.apiKey)" />
            </p>
            <p class="copyLine">
              <span class="copyText" :title="row.apiUrl">{{ row.apiUrl }}</span>
              <img :src="copyPng" class="copyIcon" @click="copyContent(row.apiUrl)" />
            </p>
          </template>
        </el-table-column>
        <el-table-column :label="t('model.modelTableSource')">
          <template #default>{{ t("model.modelSourceImported") }}</template>
        </el-table-column>
        <el-table-column prop="createdAt" :label="t('model.commonWord.creationTime')" width="170" />
        <el-table-column prop="consume_type" :label="t('commonWord.remark')" width="140">
          <template #default="{ row }">
            <span>{{ row.remark }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="t('mall.operation')" width="150">
          <template #default="{ row }">
            <span
              class="operation-text"
              @click="editModel(row)"
              style="cursor: pointer; color: var(--el-color-primary); margin-right: 12px"
            >
              {{ t("globalCommonWord.update") }}
            </span>
            <span
              class="operation-text"
              @click="deleteModel(row)"
              style="cursor: pointer; color: var(--el-color-danger); margin-right: 12px"
            >
              {{ t("commonWord.delete") }}
            </span>
          </template>
        </el-table-column>
        <template #empty>
          <div class="nodata">
            <img :src="noData" />
            <div class="empty-list">
              {{ t("model.Duration.notImport") }}
            </div>
            <div class="tableEmpty">
              <div class="aligned-text">
                <div v-if="userInfo.level !== 3">
                  <span></span>
                  {{ t("mall.goToManagement") }}
                  <el-button @click="jumpImportModel" link>
                    {{ t("model.importModel") }}
                  </el-button>
                  {{ t("model.toConfigure") }}
                </div>
              </div>
            </div>
          </div>
        </template>
      </el-table>
      <div v-show="activeTab === 'official' && officialTotal > 0" class="pagination-wrap">
        <el-pagination
          background
          v-model:current-page="officialPage"
          v-model:page-size="officialLimit"
          :page-sizes="[10, 20, 50, 100]"
          :total="officialTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handleOfficialPageChange"
          @size-change="handleOfficialSizeChange"
        />
      </div>
      <div v-show="activeTab === 'mine' && mineTotal > 0" class="pagination-wrap">
        <el-pagination
          background
          v-model:current-page="minePage"
          v-model:page-size="mineLimit"
          :page-sizes="[10, 20, 50, 100]"
          :total="mineTotal"
          layout="total, sizes, prev, pager, next, jumper"
          @current-change="handleMinePageChange"
          @size-change="handleMineSizeChange"
        />
      </div>
    </div>

    <!-- 导入或编辑自有模型 -->
    <el-dialog
      v-model="editDialogVisible"
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
          @change="changeProvider"
          class="w-100%"
          :placeholder="t('model.modelImportPhSelectModel')"
          allow-create
          filterable
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
        <el-input v-model="modelForm.apiKey" :placeholder="t('model.modelImportPhApiKey')" />
      </div>

      <div class="formItem required">
        <label>{{ t("model.modelImportFieldProtocol") }}</label>
        <el-input v-model="modelForm.apiProtocol" :placeholder="t('model.modelImportPhProtocol')" />
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
          :placeholder="t('model.modelImportPhModelName')"
          :trigger-on-focus="true"
          clearable
        />
      </div>
      <div class="formItem">
        <label>{{ t("model.modelImportFieldRemark") }}</label>
        <el-input v-model="modelForm.remark" :placeholder="t('model.modelImportPhRemark')" />
      </div>

      <div class="encryptBlock">
        <div class="encryptHeader">
          <span class="title">{{ t("model.modelImportEncryptBlockTitle") }}</span>
          <span class="safeTag">
            <img :src="Safety" />
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
          <el-button type="primary" class="dialogFooter-btn" @click="submitmodelForm">
            {{ isEditMode ? t("globalCommonWord.save") : t("globalCommonWord.add") }}
          </el-button>
          <!-- <span class="footerTip">{{ t("model.modelImportFooterHint") }}</span> -->
        </div>
      </template>
    </el-dialog>

    <!-- 订购和续费都在弹窗里完成 -->
    <el-dialog
      v-model="renewVisible"
      append-to-body
      class="usage-renew-dialog"
      width="820px"
      :show-close="false"
      :close-on-click-modal="false"
    >
      <ModelPlanBuyPanel
        v-if="renewVisible"
        embedded
        :plan-id="showAsSubscribed ? renewPlanId : null"
        :plan-name="showAsSubscribed ? activeSubscription?.name || '' : ''"
        :use-renew-api="useRenewApi"
        @close="renewVisible = false"
        @success="handleRenewSuccess"
      />
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
/** 模型管理：官方模型目录、自有模型导入，以及套餐充值 / 续费 */
import { onActivated, onDeactivated, onMounted, reactive, ref, watch } from "vue";
import { useDebounceFn } from "@vueuse/core";
// import { useRouter, useRoute } from "vue-router";
import { useI18n } from "vue-i18n";
import { Search } from "@element-plus/icons-vue";
import {
  apiProvider,
  createUserModelImportedApi,
  deleteUserModelImportedApi,
  queryRemoteModelListApi,
  queryUserModelImportedApi,
  updateUserModelImportedApi,
} from "@/ai/api/modelManage";
import copyPng from "@/ai/assets/images/copy.png";
import ModelPlanBuyPanel from "./components/ModelPlanBuyPanel.vue";
import { useModelPlanAccess } from "./composables/useModelPlanAccess";
import { getZhifuMarketModels, type ApiProtocol, type ZhifuMarketModel } from "@/ai/api/zhifuAgent";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuTestConnection, type ZhifuConnectionResult } from "@/ai/utils/electronApi";
import { createDefaultSettings } from "@/ai/views/zhifuAgent/constants";
// import lightbulb from "@/ai/assets/icons/lightbulb-fill.svg";
import { useUserStore } from "@/ai/store";
import Safety from "@/ai/assets/images/Safety.png";
import noData from "@/ai/views/mallManage/assets/nodata.png";
import { hasPerm } from "@/ai/utils/permission";
const userStore = useUserStore();
const agentStore = useZhifuAgentStore();

const userInfo = computed(() => {
  return userStore.userInfo;
});
const { t } = useI18n();
// const router = useRouter();

const activeTab = ref<"official" | "mine">("official");
const searchText = ref("");
const editDialogVisible = ref(false);
const isEditMode = ref(false);
const modelForm = reactive({
  id: undefined as number | string | undefined,
  providerName: "",
  modelName: "",
  apiKey: "",
  apiProtocol: "",
  apiUrl: "",
  remark: "",
  providerCode: "",
  custom_name: "",
});
const modelOptions = ref<{id: number | string;name: string;code: string;url?: string;defaultApiProtocol?: string}[]>([]);
const remoteModelNames = ref<string[]>([]);
const remoteModelLoading = ref(false);
let remoteModelSeq = 0;
const testingConnection = ref(false);
const connectionResult = ref<ZhifuConnectionResult | null>(null);

const marketModelList = ref<ZhifuMarketModel[]>([]);
const mineModelData = ref<any[]>([]);
const officialPage = ref(1);
const officialLimit = ref(10);
/** 按名称、描述本地筛选官方模型 */
const filteredMarketModels = computed(() => {
  const keyword = searchText.value.trim().toLowerCase();
  if (!keyword) return marketModelList.value;
  return marketModelList.value.filter((item) => {
    const name = String(item.name || "").toLowerCase();
    const description = String(item.description || "").toLowerCase();
    return name.includes(keyword) || description.includes(keyword);
  });
});
const supplier_total = computed(() => marketModelList.value.length);
const officialTotal = computed(() => filteredMarketModels.value.length);
const officialModelData = computed(() => {
  const start = (officialPage.value - 1) * officialLimit.value;
  return filteredMarketModels.value.slice(start, start + officialLimit.value);
});
const minePage = ref(1);
const mineLimit = ref(10);
const mineTotal = ref(0);
const getSearchParams = () => {
  const keyword = searchText.value?.trim();
  return keyword ? { model_name: keyword } : {};
};

const renewVisible = ref(false);
const {
  activeSubscription,
  showAsSubscribed,
  useRenewApi,
  refresh: refreshPlanAccess,
} = useModelPlanAccess();
const renewPlanId = computed(() =>
  showAsSubscribed.value ? (activeSubscription.value?.plan_id ?? null) : null
);
const buyActionText = computed(() =>
  showAsSubscribed.value ? t("model.modelRenewPackage") : t("model.modelOrderPackage")
);

async function loadActiveSubscription() {
  try {
    await refreshPlanAccess();
  } catch {
    // 订阅和活动查询失败时保持上一次结果
  }
}

/** 订购和续费都打开套餐弹窗；有生效套餐时只展示当前套餐 */
const goBuy = async () => {
  if (!hasPerm('ai.purchase')) return;
  await loadActiveSubscription();
  renewVisible.value = true;
};

/** 续费完成后关闭弹窗，并刷新当前列表和模型网关账号 */
function handleRenewSuccess() {
  renewVisible.value = false;
  void loadActiveSubscription();
  void agentStore.refreshModelUser();
  if (activeTab.value === "mine") {
    queryUserModelImported();
    return;
  }
  getModelsList();
}

/** 厂商列表只在第一次打开导入弹窗时拉取 */
const ensureProviderOptions = async () => {
  if (modelOptions.value.length > 0) return;
  const res = await apiProvider();
  if (res.errorCode === 0) {
    modelOptions.value = res.data || [];
  }
};

/** 打开编辑弹窗，并带上当前导入模型的配置 */
const editModel = async (row: Record<string, any>) => {
  await ensureProviderOptions();
  isEditMode.value = true;
  modelForm.id = row.id;
  modelForm.providerName = row.providerName;
  modelForm.modelName = row.modelName || "";
  modelForm.apiKey = row.apiKey || "";
  modelForm.apiProtocol = row.apiProtocol || "";
  modelForm.apiUrl = row.apiUrl || "";
  modelForm.remark = row.remark || "";
  modelForm.providerCode = row.providerCode || "";
  modelForm.custom_name = row.custom_name || "";
  connectionResult.value = null;
  editDialogVisible.value = true;
};
/** 删除已导入的模型 */
const deleteModel = (row: Record<string, any>) => {
  ElMessageBox.confirm(t("model.modelDeleteConfirm"), t("commonWord.prompt"), {
    confirmButtonText: t("globalCommonWord.confirm"),
    cancelButtonText: t("globalCommonWord.cancel"),
    type: "warning",
  })
    .then(async () => {
      const res = await deleteUserModelImportedApi({ id: row?.id });
      if (res?.errorCode === 0) {
        ElMessage.success(t("model.modelDeleteSuccess"));
        queryUserModelImported();
      } else {
        ElMessage.error(res?.message || t("model.modelDeleteFail"));
      }
    })
    .catch(() => {});
};
/** 复制密钥或接口地址，剪贴板不可用时退回文本框复制 */
const copyContent = async (value: string) => {
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    ElMessage.success(t("model.modelCopySuccess"));
  } catch (error) {
    console.error(error);
    const textArea = document.createElement("textarea");
    textArea.value = value;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand("copy");
    document.body.removeChild(textArea);
    ElMessage.success(t("model.modelCopySuccess"));
  }
};
/** 连接测试只区分 chat 和 responses 两种协议 */
function toApiProtocol(value: string): ApiProtocol {
  return value.trim().toLowerCase() === "responses" ? "responses" : "chat";
}

/** 用当前表单检测自有模型是否能连通 */
async function testModelConnection() {
  const modelId = modelForm.modelName.trim();
  const apiKey = modelForm.apiKey.trim();
  const baseUrl = modelForm.apiUrl.trim();
  if (!hasRequiredImportFields()) {
    ElMessage.warning(t("model.modelImportRequired"));
    return;
  }
  testingConnection.value = true;
  connectionResult.value = null;
  try {
    connectionResult.value = await zhifuTestConnection({
      ...createDefaultSettings(),
      providerName: modelForm.providerName,
      modelId,
      baseUrl,
      apiProtocol: toApiProtocol(modelForm.apiProtocol),
      apiKey,
      hasApiKey: true,
    });
  } catch (cause) {
    connectionResult.value = { ok: false, message: errorMessage(cause) };
  } finally {
    testingConnection.value = false;
  }
}

function hasRequiredImportFields() {
  return [
    modelForm.custom_name,
    modelForm.providerName,
    modelForm.modelName,
    modelForm.apiKey,
    modelForm.apiProtocol,
    modelForm.apiUrl,
  ].every((value) => String(value ?? "").trim());
}

/** 编辑走更新接口，新建走创建接口 */
const submitmodelForm = () => {
  if (!hasRequiredImportFields()) {
    ElMessage.warning(t("model.modelImportRequired"));
    return;
  }
  if (isEditMode.value) {
    updateUserModelImportedApi(modelForm).then((res) => {
      if (res.errorCode === 0) {
        ElMessage.success(res.message);
        editDialogVisible.value = false;
        queryUserModelImported();
      } else {
        ElMessage.error(res.message);
      }
    });
  } else {
    createUserModelImportedApi(modelForm).then((res) => {
      if (res.errorCode === 0) {
        ElMessage.success(res.message);
        editDialogVisible.value = false;
        queryUserModelImported();
      } else {
        ElMessage.error(res.message);
      }
    });
  }
};
/** 官方模型目录一次返回全量，筛选和分页在本地完成 */
const getModelsList = () => {
  getZhifuMarketModels().then((res) => {
    if (res.errorCode === 0) {
      marketModelList.value = Array.isArray(res.data) ? res.data : [];
    }
  });
};
/** 清空表单后打开新建导入弹窗 */
const openImportModel = () => {
  isEditMode.value = false;
  modelForm.id = undefined;
  modelForm.providerName = "";
  modelForm.modelName = "";
  modelForm.apiKey = "";
  modelForm.apiProtocol = "";
  modelForm.apiUrl = "";
  modelForm.remark = "";
  modelForm.providerCode = "";
  modelForm.custom_name = "";
  connectionResult.value = null;
  remoteModelNames.value = [];
  editDialogVisible.value = true;
};

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

/** 兼容字符串数组，以及 OpenAI /models 原样返回的 { data: [{ id }] } 等结构 */
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
  const apiUrl = normalizeBaseUrl(modelForm.apiUrl);
  const seq = ++remoteModelSeq;
  if (!apiUrl) {
    remoteModelNames.value = [];
    remoteModelLoading.value = false;
    return;
  }
  remoteModelLoading.value = true;
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
  } finally {
    if (seq === remoteModelSeq) remoteModelLoading.value = false;
  }
}

const loadRemoteModelsDebounced = useDebounceFn(loadRemoteModels, 400);

async function queryRemoteModelSuggestions(queryString: string) {
  if (normalizeBaseUrl(modelForm.apiUrl) && !remoteModelNames.value.length) await loadRemoteModels();
  const keyword = queryString.trim().toLowerCase();
  return remoteModelNames.value.filter(name => !keyword || name.toLowerCase().includes(keyword)).map(value => ({value}));
}

watch(
  () => [modelForm.apiUrl, modelForm.apiKey, editDialogVisible.value] as const,
  ([url, , visible]) => {
    if (!visible) return;
    if (!normalizeBaseUrl(url)) {
      remoteModelNames.value = [];
      return;
    }
    loadRemoteModelsDebounced();
  }
);
/** 按所选厂商回填接口地址和协议 */
const changeProvider = () => {
  modelForm.apiUrl = modelOptions.value.find((item) => item.code === modelForm.providerName)?.url || "";
  modelForm.apiProtocol = modelOptions.value.find(
    (item) => item.code === modelForm.providerName
  )?.defaultApiProtocol || "chat";
};

onMounted(() => {
  pageActive.value = true;
  getModelsList();
  void loadActiveSubscription();
  openImportFromQuery();
});
/** 我导入的模型 */
const queryUserModelImported = () => {
  queryUserModelImportedApi({
    ...getSearchParams(),
    page: minePage.value,
    limit: mineLimit.value,
  }).then((res) => {
    if (res.errorCode === 0) {
      mineModelData.value = res.data?.modelConfigList || [];
      mineTotal.value = Number(res.data?.total || mineModelData.value.length || 0);
    }
  });
};
const handleOfficialPageChange = (page: number) => {
  officialPage.value = page;
};
const handleOfficialSizeChange = (size: number) => {
  officialLimit.value = size;
  officialPage.value = 1;
};
const handleMinePageChange = (page: number) => {
  minePage.value = page;
  queryUserModelImported();
};
const handleMineSizeChange = (size: number) => {
  mineLimit.value = size;
  minePage.value = 1;
  queryUserModelImported();
};
const searchModels = useDebounceFn(() => {
  if (activeTab.value === "mine") {
    queryUserModelImported();
  }
}, 300);
const jumpImportModel = () => {
  editDialogVisible.value = true;
};
// const handlebuymodel = () => {
//   router.push("/modelManage/modelWalletPackageBuy");
// };
watch(activeTab, (newVal) => {
  if (newVal === "mine") {
    queryUserModelImported();
    apiProvider().then((res) => {
      if (res.errorCode === 0) {
        modelOptions.value = res.data;
      }
    });
  } else {
    getModelsList();
  }
});
/** 搜索关键字变化后回到第一页；官方模型本地筛选，我的模型重新请求 */
watch(searchText, () => {
  officialPage.value = 1;
  minePage.value = 1;
  searchModels();
});
/** 其他页面带 importModel 参数进来时，只由当前显示的这一页打开导入弹窗 */
const route = useRoute();
const pageActive = ref(true);
let openedImportQuery = "";

function openImportFromQuery() {
  const val = String(route.query.importModel || "");
  if (!pageActive.value || !val || openedImportQuery === val) return;
  openedImportQuery = val;
  activeTab.value = "mine";
  openImportModel();
}

function openImportFromStore() {
  if (!agentStore.consumeImportModelRequest()) return;
  activeTab.value = "mine";
  openImportModel();
}

onMounted(openImportFromStore);
watch(
  () => agentStore.importModelRequested,
  (pending) => {
    if (pending) openImportFromStore();
  }
);

onActivated(() => {
  pageActive.value = true;
  void loadActiveSubscription();
  openImportFromQuery();
});
onDeactivated(() => {
  pageActive.value = false;
  editDialogVisible.value = false;
});
watch(() => route.query.importModel, openImportFromQuery);
</script>

<style scoped lang="scss">
@use "../zhifuAgent/styles/page.scss";

.model-page {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #fff;
  box-sizing: border-box;
}

.table-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
}

.toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;

  .toolbar-left {
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .model-total {
    font-size: 13px;
    color: #666;
  }

  .toolbar-right {
    display: flex;
    align-items: center;
    gap: 8px;
  }
}

.search-wrap {
  display: flex;
  align-items: center;
  width: 280px;
  height: 30px;
  border: 1px solid #e5e7eb;
  border-radius: 2px;

  .search-icon {
    margin-left: 8px;
    font-size: 16px;
    color: #9ca3af;
  }

  .search-input :deep(.el-input__wrapper) {
    box-shadow: none;
    border: none;
    height: 28px;
    padding-left: 6px;
  }
}

.tabs {
  display: flex;
  align-items: center;
  gap: 26px;
  padding-bottom: 8px;
  margin-bottom: 8px;
  border-bottom: 1px solid #f0f2f5;

  .tab {
    position: relative;
    font-size: 15px;
    font-weight: 600;
    color: #333;
    cursor: pointer;
    transition: color 0.25s ease;
  }

  .tab::after {
    position: absolute;
    bottom: -10px;
    left: 0;
    width: 100%;
    height: 2px;
    content: "";
    background: var(--el-color-primary);
    transform: scaleX(0);
    transform-origin: left center;
    transition: transform 0.25s ease;
  }

  .tab.active {
    color: var(--el-color-primary);
  }

  .tab.active::after {
    transform: scaleX(1);
  }
}

.model-table {
  flex: 1;
  width: 100%;
  min-height: 0;
  :deep(.el-table__header th) {
    height: 36px;
    font-size: 14px;
    font-weight: 600;
    color: #374151;
    background: #f7f9fc;
  }

  :deep(.el-table__body td) {
    height: 48px;
    font-size: 14px;
    color: #4b5563;
  }

  :deep(.el-table__row:hover td) {
    background: #fafcff;
  }

  :deep(.el-table__empty-block) {
    min-height: auto;
    padding: 12px 0;
  }

  :deep(.el-table__empty-text) {
    line-height: 1.35;
  }
}

.nodata {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 12px 0;
  margin-top: 100px;
  img {
    display: block;
    height: auto;
  }

  .empty-list {
    margin: 0;
    font-size: 14px;
    line-height: 1.35;
    color: #595959;
  }

  .tableEmpty {
    margin-top: 2px;
  }

  .aligned-text {
    line-height: 1.45;

    > div {
      margin: 0;
    }
  }
}

.price-line {
  line-height: 1.4;
  color: #4b5563;
}
.copyLine {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  line-height: 1.5;
  min-width: 0;
}

.copyText {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.copyIcon {
  width: 14px;
  height: 14px;
  cursor: pointer;
  flex-shrink: 0;
}

.pagination-wrap {
  display: flex;
  flex-shrink: 0;
  justify-content: flex-end;
  padding-top: 12px;
}
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
  border: 1px solid #3370ff;
  background: #f8fbff;
}

.formItem {
  margin-bottom: 12px;
  width: 90%;
  margin-left: 5%;
  label {
    display: block;
    margin-bottom: 6px;
    font-size: 14px;
    color: #111827;
  }

  &.required > label::before {
    content: "*";
    margin-right: 4px;
    color: #ff4d4f;
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
  margin-top: 4px;
  margin-bottom: 14px;
  margin-left: 5%;
  width: 90%;
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
    padding: 2px 8px;
    font-size: 12px;
    color: #68bf94;
    background: #ecfdf3;
    border-radius: 2px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .encryptDesc {
    font-size: 13px;
    line-height: 1.55;
    color: #475569;
  }
}

.testResult {
  width: 70%;
  margin-left: 12px;
  text-align: left;
  margin-top: 4px;
  font-size: 14px;
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
  padding-left: 5%;
  padding-right: 5%;
  margin-top: 12px;
  padding-bottom: 12px;
  margin-left: 15px;
  .footerTip {
    margin-top: 8px;
    font-size: 13px;
    color: #ff4d4f;
    margin-left: 10px;
  }
  .dialogFooter-btn {
    margin-left: auto;
    margin-right: 15px;
  }
}
.iconStyle {
  color: #7b7983;
  width: 16px;
  height: 16px;
  padding: 5px;
}

.iconStyle:hover {
  color: var(--el-color-primary);
}
.iconBtn {
  padding: 10px;
}

.tableEmpty {
  width: 280px;
  text-align: left;
  border-radius: 8px;
  border: 1px solid #dde2e9;
  padding: 12px;
  margin: 0 auto;
}
</style>

<style lang="scss">
.importModelDialog {
  margin-top: 50px;
  .el-dialog__header {
    margin-right: 0;
    border-bottom: 0px solid #fff;
    padding-bottom: 0px;
  }

  .el-dialog__body {
    padding: 16px 22px 8px;
  }

  .el-dialog__footer {
    padding: 0;
  }
}

.usage-renew-dialog.el-dialog {
  border-radius: 12px;
  overflow: hidden;

  > .el-dialog__header {
    display: none;
    padding: 0;
    border-bottom: none;
  }

  > .el-dialog__body {
    padding: 0 !important;
  }
}
</style>
