<template>
  <div class="zhifu-page">
    <header class="page-header">
      <div>
        <h2>{{ t("zhifuAgent.scheduled.title") }}</h2>
        <p>{{ t("zhifuAgent.scheduled.desc") }}</p>
      </div>
    </header>
    <div class="hint">
      <!-- <span>{{ t("zhifuAgent.scheduled.systemHint") }}</span> -->
      <el-button type="primary" size="small" :icon="Plus" @click="openEditor()">
        {{ t("zhifuAgent.scheduled.create") }}
      </el-button>
    </div>

    <div v-loading="busy && !visibleTasks.length" class="task-list">
      <el-empty v-if="!busy && !visibleTasks.length" :description="t('zhifuAgent.scheduled.empty')">
        <span class="empty-tip">{{ t("zhifuAgent.scheduled.emptyTip") }}</span>
      </el-empty>

      <div v-for="task in visibleTasks" :key="task.id" class="task-item">
        <div class="task-icon">
          <el-icon><Calendar /></el-icon>
        </div>
        <div class="task-copy">
          <strong>
            {{ task.title }}
            <i v-if="task.unread" class="unread-dot"></i>
          </strong>
          <span>{{ nextRunLabel(task) }} · {{ task.workspace }}</span>
          <small v-if="task.skillNames?.length">
            {{ t("zhifuAgent.scheduled.skillsSummary", { skills: task.skillNames.join("、") }) }}
          </small>
          <small v-if="task.shops?.length">
            {{
              t("zhifuAgent.scheduled.shopsSummary", {
                shops: task.shops.map((shop) => shop.name).join("、"),
              })
            }}
          </small>
          <small v-if="task.pushPlatforms?.length">
            {{
              t("zhifuAgent.scheduled.pushSummary", {
                platforms: task.pushPlatforms.map((id) => t(`zhifuAgent.im.${id}`)).join("、"),
              })
            }}
          </small>
          <small>{{ t("zhifuAgent.scheduled.clientOnly") }}</small>
          <small v-if="task.lastRunAt && task.lastStatus !== 'pending'">
            {{ lastRunText(task) }}
          </small>
          <small v-if="task.lastResult" class="result" :title="task.lastResult">
            {{ task.lastResult }}
          </small>
        </div>
        <div class="task-actions">
          <el-tooltip
            v-if="task.lastRunAt && !['running', 'pending'].includes(task.lastStatus || '')"
            :content="t('zhifuAgent.scheduled.viewResult')"
          >
            <el-button type="text" :icon="View" @click="store.viewScheduledResult(task)" />
          </el-tooltip>
          <el-tooltip :content="t('zhifuAgent.scheduled.runNow')">
            <span>
              <el-button
                type="text"
                :icon="VideoPlay"
                :disabled="task.lastStatus === 'running'"
                @click="runNow(task)"
              />
            </span>
          </el-tooltip>
          <el-tooltip
            :content="
              task.enabled
                ? t('zhifuAgent.scheduled.pauseTask')
                : t('zhifuAgent.scheduled.startTask')
            "
          >
            <span class="task-switch">
              <el-switch :model-value="task.enabled" size="small" @change="toggle(task)" />
            </span>
          </el-tooltip>
          <el-tooltip :content="t('zhifuAgent.common.edit')">
            <el-button type="text" :icon="EditPen" @click="openEditor(task)" />
          </el-tooltip>
          <el-tooltip :content="t('zhifuAgent.common.delete')">
            <el-button type="text" :icon="Delete" @click="remove(task)" />
          </el-tooltip>
        </div>
      </div>
    </div>

    <ScheduledTaskEditor v-model="editingTask" :saving="busy" @save="save" />
  </div>
</template>

<script setup lang="ts">
import { Calendar, Delete, EditPen, Plus, VideoPlay, View } from "@element-plus/icons-vue";
import type { ScheduledTask } from "@/ai/api/zhifuAgent";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuRunScheduledTask } from "@/ai/utils/electronApi";
import { formatMessageTime } from "../utils/format";
import { normalizeTaskShops } from "../utils/taskShops";
import ScheduledTaskEditor from "./components/ScheduledTaskEditor.vue";
import { sameWorkspace } from "../utils/taskWorkspace";

const store = useZhifuAgentStore();
const { t } = useI18n();

const busy = ref(false);
const editingTask = ref<ScheduledTask | null>(null);
const visibleTasks = computed(() =>
  store.workspace.trim()
    ? store.scheduledTasks.filter((task) => sameWorkspace(task.workspace, store.workspace))
    : []
);
watch(
  () => store.workspace,
  () => {
    editingTask.value = null;
  }
);

const emptyTask = (): ScheduledTask => ({
  title: "",
  prompt: "",
  workspace: store.workspace,
  skillNames: [],
  shops: [],
  autoCloseShops: false,
  pushPlatforms: [],
  frequency: "daily",
  date: new Date().toISOString().slice(0, 10),
  time: "09:00",
  weekdays: [1],
  enabled: true,
});

function statusText(status?: string) {
  const value = status || "running";
  return t(`zhifuAgent.scheduled.status${value.charAt(0).toUpperCase()}${value.slice(1)}`);
}

function lastRunText(task: ScheduledTask) {
  const status = String(task.lastStatus || "");
  const key =
    status === "running"
      ? "zhifuAgent.scheduled.lastRunStarted"
      : status === "cancelled"
        ? "zhifuAgent.scheduled.lastRunStopped"
        : "zhifuAgent.scheduled.lastRunFinished";
  return t(key, {
    time: formatMessageTime(task.lastRunAt || 0),
    status: statusText(status),
  });
}

function nextRunLabel(task: ScheduledTask) {
  if (!task.enabled) return t("zhifuAgent.scheduled.paused");
  if (task.frequency === "once") {
    return t("zhifuAgent.scheduled.nextOnce", { date: task.date, time: task.time });
  }
  return task.frequency === "weekly"
    ? t("zhifuAgent.scheduled.nextWeekly", { time: task.time })
    : t("zhifuAgent.scheduled.nextDaily", { time: task.time });
}

async function reload() {
  busy.value = true;
  try {
    await store.loadScheduledTasks();
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  } finally {
    busy.value = false;
  }
}

watch(
  () => store.pendingScheduledDraft,
  (draft) => {
    if (!draft) return;
    const next = { ...draft };
    store.pendingScheduledDraft = null;
    openEditor({ ...emptyTask(), ...next, enabled: next.enabled ?? false });
  },
  { immediate: true }
);

function openEditor(task?: ScheduledTask) {
  editingTask.value = task
    ? {
        ...task,
        skillNames: [...(task.skillNames || [])],
        shops: normalizeTaskShops(task.shops),
        pushPlatforms: [...(task.pushPlatforms || [])],
        weekdays: [...(task.weekdays || [])],
      }
    : emptyTask();
}

async function save(task: ScheduledTask) {
  busy.value = true;
  try {
    await store.saveScheduledTask(task);
    editingTask.value = null;
    ElMessage.success(t("zhifuAgent.common.saveSuccess"));
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  } finally {
    busy.value = false;
  }
}

async function toggle(task: ScheduledTask) {
  try {
    await store.toggleScheduledTask(task);
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  }
}

async function remove(task: ScheduledTask) {
  try {
    await ElMessageBox.confirm(
      t("zhifuAgent.scheduled.deleteConfirm", { title: task.title }),
      t("zhifuAgent.common.tip"),
      {
        type: "warning",
        confirmButtonText: t("zhifuAgent.common.delete"),
        cancelButtonText: t("zhifuAgent.common.cancel"),
      }
    );
  } catch {
    return;
  }
  try {
    await store.deleteScheduledTask(task.id!);
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  }
}

async function runNow(task: ScheduledTask) {
  if (task.lastStatus === "running") return;
  const current = store.scheduledTasks.find((item) => item.id === task.id);
  const previousStatus = current?.lastStatus;
  if (current) {
    current.lastStatus = "running";
    current.lastRunAt = Date.now();
  }
  try {
    await zhifuRunScheduledTask(task.id!);
    await store.loadScheduledTasks();
    ElNotification({
      title: t("zhifuAgent.common.tip"),
      message: t("zhifuAgent.scheduled.runStarted", { title: task.title }),
      type: "success",
      duration: 3000,
    });
  } catch (cause) {
    if (current && current.lastStatus === "running") current.lastStatus = previousStatus;
    ElMessage.error(errorMessage(cause));
  }
}

onMounted(() => {
  store.init();
});

onActivated(reload);
</script>

<style lang="scss" scoped>
@use "../styles/page.scss";

.page-header {
  display: flex;
  align-items: center;
  min-height: 76px;
  margin: -20px -24px 0;
  padding: 0 22px;
  border-bottom: 1px solid var(--el-border-color-lighter);

  h2 {
    margin: 0;
    font-size: 18px;
  }

  p {
    margin: 5px 0 0;
    font-size: 12px;
  }
}

.hint {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  min-height: 58px;
  margin: 0 -24px;
  padding: 10px 18px;
  font-size: 11px;
  color: var(--el-text-color-secondary);
  border-bottom: 1px solid var(--el-border-color-lighter);

  :deep(.el-button) {
    height: 32px;
    padding: 0 12px;
    font-size: 13px;
    font-weight: 600;
    border-radius: 4px;
  }
}

.task-list {
  min-height: 160px;
  padding-top: 8px;
}

.empty-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.task-item {
  display: flex;
  gap: 14px;
  align-items: center;
  padding: 14px 16px;
  margin-bottom: 10px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;

  &:hover {
    border-color: var(--el-border-color);
  }
}

.task-icon {
  display: grid;
  flex: 0 0 38px;
  place-items: center;
  width: 38px;
  height: 38px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 8px;
}

.task-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 14px;
    font-weight: 500;
  }

  span,
  small {
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .warning {
    color: var(--el-color-warning);
  }

  .result {
    color: var(--el-text-color-regular);
  }
}

.unread-dot {
  width: 7px;
  height: 7px;
  background: var(--el-color-danger);
  border-radius: 50%;
}

.task-actions {
  display: flex;
  // gap: 4px;
  align-items: center;

  .el-button + .el-button {
    margin-left: 0;
  }
  .el-button {
    padding: 0 6px;
    font-size: 16px;
  }

  .el-button.is-disabled {
    color: var(--el-text-color-disabled);
    cursor: not-allowed;
  }

  .task-switch {
    display: inline-flex;
    align-items: center;
    margin: 0 6px;
  }
}
</style>
