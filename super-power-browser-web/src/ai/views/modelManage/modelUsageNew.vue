<template>
  <div :class="['model-usage', { 'model-usage--detail': detail, 'zhifu-page': detail }]">
    <header v-if="detail" class="page-header">
      <h2>{{ t("zhifuAgent.settings.modelDetailTitle") }}</h2>
    </header>
    <header class="usage-header">
      <el-card v-loading="quotaLoading" class="usage-plan-card" shadow="always">
        <div class="usage-plan-card__body">
          <div class="usage-plan-card__intro">
            <div class="usage-plan-card__title">
              {{ hasSubscription ? subscriptionName : t("model.modelUsageNoPlanTitle") }}
            </div>
            <div class="usage-plan-card__desc">
              {{
                hasSubscription
                  ? t("model.modelUsagePlanExpire", { time: subscriptionExpire })
                  : t("model.modelUsageNoPlanDesc")
              }}
            </div>
          </div>
          <div v-if="!detail" class="usage-plan-card__quota-head">
            <div class="usage-plan-card__label">{{ t("model.modelUsagePlanQuota") }}</div>
            <el-button type="primary" class="usage-plan-card__btn" @click="handleTopUpQuota">
              {{
                showAsSubscribed ? t("model.modelUsageRenewPlan") : t("model.modelUsageOrderPlan")
              }}
            </el-button>
          </div>
          <el-progress
            v-if="!detail"
            class="usage-plan-card__progress"
            :percentage="tokenRemainingPercent"
            :stroke-width="8"
            :show-text="false"
            color="var(--el-color-primary)"
          />
          <div v-if="!detail" class="usage-plan-card__stats">
            {{
              t("model.modelUsageRemainSlashTotal", {
                remain: activeSubscription?.unlimited ? "不限量" : formatAmount(quotaStats.tokenRemaining),
                total: activeSubscription?.unlimited ? "不限量" : formatAmount(quotaStats.tokenTotal),
              })
            }}
          </div>
          <el-button
            v-if="detail"
            type="primary"
            class="usage-plan-card__btn"
            @click="handleTopUpQuota"
          >
            {{ showAsSubscribed ? t("model.modelUsageRenewPlan") : t("model.modelUsageOrderPlan") }}
          </el-button>
        </div>
      </el-card>
    </header>

    <div class="usage-toolbar-divider" />

    <div class="screen-container filter-container">
      <div class="first-line">
        <div class="mall-left order-left">
          <el-popover
            class="box-item"
            placement="bottom"
            :popper-style="{ width: '120px', padding: '10px 8px' }"
            trigger="click"
          >
            <div class="popup-more-link">
              <el-link underline="never" @click="handleExportByType(1)">
                {{ t("mall.exportSearchConditions") }}
              </el-link>
              <el-link underline="never" @click="handleExportByType(2)">
                {{ t("mall.exportSelected") }}
              </el-link>
              <el-link underline="never" @click="handleExportByType(3)">
                {{ t("mall.exportCurrentPage") }}
              </el-link>
            </div>
            <template #reference>
              <div justify-center gap-3px>
                <el-button type="primary">
                  {{ t("globalCommonWord.export") }}
                  <el-icon style="margin-left: 4px">
                    <ArrowDownBold />
                  </el-icon>
                </el-button>
              </div>
            </template>
          </el-popover>
        </div>
        <div class="mall-left order-left">
          <el-date-picker
            v-model="filterDateRange"
            type="daterange"
            class="usage-date-range"
            range-separator="~"
            :start-placeholder="t('money.start_time')"
            :end-placeholder="t('money.end_time')"
            value-format="YYYY-MM-DD"
            :disabled-date="disableUsageFilterDateAfterToday"
            @change="handleDateChange"
          />
          <div style="margin-left: 12px">
            <el-button class="iconBtn" @click="handleRefresh">
              <img src="@/ai/assets/icons/refreshPng.png" alt="" />
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <div class="app-table">
      <el-table
        v-loading="listLoading"
        :data="tableList"
        element-loading-text="Loading"
        fit
        :height="detail ? '100%' : 'calc(100vh - 406px)'"
        :class="{ 'usage-table': detail }"
        highlight-current-row
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="50" align="center" />
        <el-table-column
          show-overflow-tooltip
          align="left"
          min-width="168"
          :label="t('model.modelUsageColumnTime')"
        >
          <template #default="{ row }">
            {{ row.use_time || "-" }}
          </template>
        </el-table-column>
        <el-table-column
          show-overflow-tooltip
          align="left"
          min-width="160"
          :label="t('model.modelUsageColumnModel')"
        >
          <template #default="{ row }">
            {{ row.modelName || row.model_name || "-" }}
          </template>
        </el-table-column>
        <el-table-column show-overflow-tooltip align="left" width="120" label="Tokens">
          <template #default="{ row }">
            {{ row.total_token || "-" }}
          </template>
        </el-table-column>
        <el-table-column align="left" min-width="220" :label="t('model.modelUsageColumnDetail')">
          <template #default="{ row }">
            <div v-if="row.token_detail" class="detail-cell detail-cell--plain">
              <div>
                {{
                  t("model.modelUsageTokenDetailInput", {
                    count: row.token_detail.input_tokens ?? "-",
                  })
                }}
              </div>
              <div>
                {{
                  t("model.modelUsageTokenDetailOutput", {
                    count: row.token_detail.output_tokens ?? "-",
                  })
                }}
              </div>
            </div>
          </template>
        </el-table-column>
        <template #empty>
          <div class="usage-table-empty">
            <img :src="usageNoDataImg" alt="" />
            <p>{{ t("company.no_data") }}</p>
          </div>
        </template>
      </el-table>
      <div v-if="tableList.length > 0" class="pagination-wrap">
        <el-pagination
          background
          layout="total, sizes, prev, pager, next, jumper"
          :current-page="listQuery.page"
          :total="listQuery.total"
          :page-size="listQuery.limit"
          :page-sizes="listQuery.page_sizes"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

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
import { computed, onMounted, reactive, ref } from "vue";
import { useI18n } from "vue-i18n";
import {
  postZhifuModelConsumeRecords,
  type ZhifuConsumeRecord,
  type ZhifuConsumeRecordsBody,
  type ZhifuConsumeRecordsResp,
} from "@/ai/api/zhifuAgent";
import ModelPlanBuyPanel from "./components/ModelPlanBuyPanel.vue";
import { useModelPlanAccess } from "./composables/useModelPlanAccess";
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { importBilling } from "@/ai/utils";
import usageNoDataImg from "@/ai/views/mallManage/assets/nodata.png";

/** SuperPower AI里的模型明细只保留套餐名称、到期时间和续费 */
defineProps<{
  detail?: boolean;
}>();

const { t, locale } = useI18n();
const agentStore = useZhifuAgentStore();

const listLoading = ref(false);
const quotaLoading = ref(false);
const renewVisible = ref(false);
const filterDateRange = ref<string[]>([]);

const quotaStats = reactive({
  tokenRemaining: 0,
  tokenTotal: 0,
});
const {
  activeSubscription,
  showAsSubscribed,
  useRenewApi,
  refresh: refreshPlanAccess,
} = useModelPlanAccess();
/** 试用订阅也是当前套餐，展示名称、到期和额度。按钮仍显示订购 */
const hasSubscription = computed(() => !!activeSubscription.value);
const subscriptionName = computed(() => activeSubscription.value?.name?.trim() || "-");
const subscriptionExpire = computed(() => activeSubscription.value?.end_at || "-");

/** 横向条表示剩余占比 */
const tokenRemainingPercent = computed(() => {
  const { tokenRemaining, tokenTotal } = quotaStats;
  if (!tokenTotal) return 0;
  return Math.min(100, Math.round((tokenRemaining / tokenTotal) * 100));
});

type UsageTableRow = {
  use_time: string;
  model_name: string;
  total_token: string;
  token_detail: { input_tokens: string; output_tokens: string } | null;
};

const tableList = ref<UsageTableRow[]>([]);
const selectedRows = ref<UsageTableRow[]>([]);

const listQuery = reactive({
  model_name: "",
  page: 1,
  limit: 20,
  page_sizes: [10, 20, 50],
  total: 0,
  /** 时间筛选，格式 YYYY-MM-DD */
  start_at: "",
  end_at: "",
});

/** 仅可选择今天及之前的日期（不可选未来日） */
function disableUsageFilterDateAfterToday(date: Date) {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const cell = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  return cell > todayStart;
}

function usageFilterTodayYmd() {
  const n = new Date();
  const y = n.getFullYear();
  const m = String(n.getMonth() + 1).padStart(2, "0");
  const d = String(n.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatAmount(n: number) {
  return n.toLocaleString();
}

function parseQuotaNum(v: number | string | undefined) {
  if (v === undefined || v === null || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

/** 查询是否已订阅套餐，并带上试用活动状态 */
async function fetchQuotaStats() {
  quotaLoading.value = true;
  try {
    await refreshPlanAccess();
    const active = activeSubscription.value;
    quotaStats.tokenTotal = active ? parseQuotaNum(active.total_amount) : 0;
    quotaStats.tokenRemaining = active ? parseQuotaNum(active.remain_amount) : 0;
  } catch {
    quotaStats.tokenTotal = 0;
    quotaStats.tokenRemaining = 0;
  } finally {
    quotaLoading.value = false;
  }
}

function formatTokenCount(n: number) {
  if (!Number.isFinite(n)) return "-";
  if (locale.value === "zh-cn" && n >= 10000) {
    const w = n / 10000;
    return (Number.isInteger(w) ? w.toFixed(0) : w.toFixed(1)) + "万";
  }
  return n.toLocaleString();
}

function formatTokenField(value: number | undefined) {
  if (value === undefined || value === null) return "-";
  return String(value);
}

/** 新记录没有 total_tokens，Tokens 列用输入加输出 */
function mapConsumeItemToRow(item: ZhifuConsumeRecord): UsageTableRow {
  const input = parseQuotaNum(item.input_tokens);
  const output = parseQuotaNum(item.output_tokens);
  const hasDetail = item.input_tokens != null || item.output_tokens != null;
  return {
    use_time: item.created_at || "-",
    model_name: item.model || "-",
    total_token: hasDetail ? formatTokenCount(input + output) : "-",
    token_detail: hasDetail
      ? {
          input_tokens: formatTokenField(item.input_tokens),
          output_tokens: formatTokenField(item.output_tokens),
        }
      : null,
  };
}

/** POST /api/v1/zhifu/model/consume/records */
async function fetchUsageList() {
  const res = await postZhifuModelConsumeRecords(
    buildConsumeRecordQuery(listQuery.page, listQuery.limit)
  );
  const d = res?.data as ZhifuConsumeRecordsResp | undefined;
  const items = d?.list ?? [];
  listQuery.total = Number(d?.total ?? 0);
  tableList.value = items.map((it) => mapConsumeItemToRow(it));
}

/** YYYY-MM-DD 转为本地秒级时间戳。开始取当天 00:00:00，结束取当天 23:59:59 */
function usageDateToUnix(value: string, endOfDay: boolean) {
  const [year, month, day] = value.split("-").map(Number);
  if (!year || !month || !day) return undefined;
  const date = endOfDay
    ? new Date(year, month - 1, day, 23, 59, 59)
    : new Date(year, month - 1, day, 0, 0, 0);
  return Math.floor(date.getTime() / 1000);
}

function buildConsumeRecordQuery(page: number, limit: number): ZhifuConsumeRecordsBody {
  const body: ZhifuConsumeRecordsBody = {
    page,
    limit,
  };
  if (listQuery.model_name) body.model = listQuery.model_name;
  if (listQuery.start_at) body.start_at = usageDateToUnix(listQuery.start_at, false);
  if (listQuery.end_at) body.end_at = usageDateToUnix(listQuery.end_at, true);
  return body;
}

async function loadQuotaStats() {
  await fetchQuotaStats();
}

async function loadUsageList() {
  listLoading.value = true;
  try {
    await fetchUsageList();
  } catch {
    tableList.value = [];
    listQuery.total = 0;
  } finally {
    listLoading.value = false;
  }
}

function applyDateRange() {
  const today = usageFilterTodayYmd();
  let start = filterDateRange.value?.[0] || "";
  let end = filterDateRange.value?.[1] || "";
  if (start > today) start = today;
  if (end > today) end = today;
  if (start && end && start > end) end = start;
  listQuery.start_at = start;
  listQuery.end_at = end;
}

function handleDateChange() {
  applyDateRange();
  listQuery.page = 1;
  loadUsageList();
}

function handleRefresh() {
  listQuery.start_at = "";
  listQuery.end_at = "";
  filterDateRange.value = [];
  listQuery.page = 1;
  loadQuotaStats();
  loadUsageList();
}

function handleSelectionChange(val: UsageTableRow[]) {
  selectedRows.value = val;
}

function escapeHtml(text: string) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function rowDetailText(row: UsageTableRow) {
  if (row.token_detail) {
    return [
      t("model.modelUsageTokenDetailInput", {
        count: row.token_detail.input_tokens ?? "-",
      }),
      t("model.modelUsageTokenDetailOutput", {
        count: row.token_detail.output_tokens ?? "-",
      }),
    ].join("；");
  }
  return "-";
}

function exportRows(rows: UsageTableRow[]) {
  const header = `
    <tr></tr>
    <tr>
      <td>${t("model.modelUsageColumnTime")}</td>
      <td>${t("model.modelUsageColumnModel")}</td>
      <td>Tokens</td>
      <td>${t("model.modelUsageColumnDetail")}</td>
    </tr>`;
  const body = rows
    .map((row) => {
      return `
      <tr>
        <td>${escapeHtml(row.use_time || "-")}</td>
        <td>${escapeHtml(row.model_name || "-")}</td>
        <td>${escapeHtml(row.total_token || "-")}</td>
        <td>${escapeHtml(rowDetailText(row))}</td>
      </tr>`;
    })
    .join("");

  importBilling(
    `${t("router.model_usage")}${t("globalCommonWord.export")}`,
    `${header}${body}`,
    "Sheet1"
  );
}

async function fetchAllRowsByCondition() {
  const limit = 100;
  let page = 1;
  const allRows: UsageTableRow[] = [];
  while (true) {
    const res = await postZhifuModelConsumeRecords(buildConsumeRecordQuery(page, limit));
    const d = res?.data as ZhifuConsumeRecordsResp | undefined;
    const items = d?.list ?? [];
    if (!items.length) break;
    allRows.push(...items.map((it) => mapConsumeItemToRow(it)));
    const total = Number(d?.total ?? 0);
    if (page * limit >= total) break;
    page++;
  }
  return allRows;
}

async function handleExportByType(type: number) {
  try {
    let rows: UsageTableRow[] = [];
    if (type === 1) {
      rows = await fetchAllRowsByCondition();
    } else if (type === 2) {
      if (!selectedRows.value.length) {
        ElMessage.warning(t("company.choose_store"));
        return;
      }
      rows = selectedRows.value;
    } else {
      if (!tableList.value.length) {
        ElMessage.warning(t("mall.current_page_no_data"));
        return;
      }
      rows = tableList.value;
    }

    if (!rows.length) {
      ElMessage.warning(t("mall.current_page_no_data"));
      return;
    }
    exportRows(rows);
  } catch (error) {
    console.log("导出模型使用记录异常", error);
  }
}

const renewPlanId = computed(() =>
  showAsSubscribed.value ? (activeSubscription.value?.plan_id ?? null) : null
);

function handleTopUpQuota() {
  renewVisible.value = true;
}

function handleRenewSuccess() {
  renewVisible.value = false;
  loadQuotaStats();
  loadUsageList();
  void agentStore.refreshModelUser();
}

function handleCurrentChange(val: number) {
  listQuery.page = val;
  loadUsageList();
}

function handleSizeChange(val: number) {
  listQuery.limit = val;
  listQuery.page = 1;
  loadUsageList();
}

onMounted(() => {
  loadQuotaStats();
  loadUsageList();
});
</script>

<style scoped lang="scss">
@use "../zhifuAgent/styles/page.scss";

.model-usage {
  padding: 16px;
}

.model-usage.model-usage--detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  box-sizing: border-box;
  padding: 20px 24px;
  background: var(--el-bg-color);

  .usage-header,
  .usage-toolbar-divider,
  .filter-container {
    flex-shrink: 0;
  }

  .app-table {
    display: flex;
    flex: 1;
    flex-direction: column;
    min-height: 0;
  }

  .usage-table {
    flex: 1;
    width: 100%;
    min-height: 0;
  }

  .pagination-wrap {
    display: flex;
    flex-shrink: 0;
    justify-content: flex-end;
    float: none;
    padding-top: 12px;
  }
}

.model-usage--detail {
  .usage-plan-card__body {
    flex-direction: row;
    gap: 16px;
    align-items: center;
    justify-content: space-between;
  }

  .usage-plan-card__intro {
    gap: 4px;
  }
}

.usage-header {
  margin-bottom: 0;
}

.usage-plan-card {
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 4px 10px 0 rgba(0, 0, 0, 0.08);

  :deep(.el-card__body) {
    padding: 20px 24px;
  }

  &__body {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  &__intro {
    display: flex;
    flex-direction: column;
    gap: 8px;
    min-width: 0;
  }

  &__quota-head {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 16px;
    margin-top: 4px;
  }

  &__title {
    font-size: 16px;
    font-weight: 600;
    line-height: 24px;
    color: #1d2129;
  }

  &__desc,
  &__label {
    font-size: 13px;
    line-height: 20px;
    color: #86909c;
  }

  &__label {
    margin-right: auto;
  }

  &__progress {
    width: 100%;
    align-self: stretch;

    :deep(.el-progress-bar__outer) {
      background-color: #f2f3f5;
      border-radius: 4px;
    }

    :deep(.el-progress-bar__inner) {
      border-radius: 4px;
    }
  }

  &__stats {
    font-size: 14px;
    line-height: 22px;
    color: #4e5969;
  }

  &__btn {
    flex-shrink: 0;
    min-width: 88px;
  }
}

.usage-toolbar-divider {
  margin: 16px 0;
  border: none;
  border-top: 1px dashed var(--el-border-color);
}

.screen-container {
  display: flex;
  flex-direction: column !important;

  .first-line {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;

    .order-left {
      display: flex;
      align-items: center;
    }
  }
}

.filter-container {
  margin-bottom: 16px;
}

.usage-date-range {
  width: 280px;
}

.popup-more-link {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.app-table {
  :deep(.el-table__empty-block) {
    min-height: 280px;
  }

  :deep(.el-table__empty-text) {
    line-height: 1.35;
  }

  .pagination-wrap {
    float: right;
  }
}

.usage-table-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 24px 0;

  img {
    display: block;
    height: auto;
  }

  p {
    margin: 0;
    font-size: 14px;
    line-height: 1.35;
    color: #595959;
  }
}

.detail-cell {
  font-size: 13px;
  line-height: 1.5;
  color: var(--el-text-color-regular);

  &--plain {
    white-space: pre-wrap;
    word-break: break-word;
  }
}
</style>

<style lang="scss">
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
