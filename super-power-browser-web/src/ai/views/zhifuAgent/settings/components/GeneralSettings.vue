<template>
  <div class="general-settings">
    <section class="settings-block">
      <div class="section-title">{{ t("zhifuAgent.settings.generalWorkspace") }}</div>
      <div class="workspace-row settings-card">
        <div class="workspace-copy">
          <strong>
            {{ store.workspace ? store.workspaceName : t("zhifuAgent.chat.noWorkspace") }}
          </strong>
          <span>{{ store.workspace || t("zhifuAgent.settings.generalWorkspaceTip") }}</span>
        </div>
        <el-button :icon="FolderOpened" @click="selectWorkspace">
          {{
            store.workspace
              ? t("zhifuAgent.settings.generalSwitchDir")
              : t("zhifuAgent.settings.generalChooseDir")
          }}
        </el-button>
      </div>
    </section>
    <OrdinaryBrowserSettings class="settings-block" />
    <section class="settings-block conversation-settings">
      <div class="section-title">会话记录</div>
      <div class="conversation-card settings-card">
        <p class="conversation-description">
          聊天记录自动保存在本机，按登录账号隔离，切换工作区不受影响。
        </p>
        <div v-if="store.conversationDatabasePath" class="conversation-location">
          <div class="conversation-location-heading">
            <span class="conversation-location-label">保存位置</span>
            <el-button
              link
              type="primary"
              :icon="FolderOpened"
              :loading="conversationBackupAction === 'move'"
              :disabled="!!conversationBackupAction || store.anyRunning"
              @click="moveStorage"
            >
              转移目录
            </el-button>
          </div>
          <span class="conversation-path">{{ store.conversationDatabasePath }}</span>
        </div>
        <p v-if="store.conversationStorageSpace?.freeBytes != null" class="conversation-hint">
          当前磁盘可用
          {{ (store.conversationStorageSpace.freeBytes / 1024 / 1024 / 1024).toFixed(2) }} GB
        </p>
        <el-alert
          v-if="store.conversationStorageSpace?.lowSpace"
          type="warning"
          :closable="false"
          show-icon
          title="剩余空间不足 256 MB，建议清理空间或转移到其他磁盘。"
        />
        <el-alert
          v-if="store.conversationStorageError"
          type="error"
          :closable="false"
          show-icon
          title="会话保存失败，请勿关闭客户端。可导出备份到其他磁盘，或清理空间后重试。"
        />
        <div class="conversation-backup-actions">
          <el-button
            :icon="Download"
            :loading="conversationBackupAction === 'export'"
            :disabled="!!conversationBackupAction && conversationBackupAction !== 'export'"
            @click="backupConversations(false)"
          >
            导出会话备份
          </el-button>
          <el-button
            :icon="Upload"
            :loading="conversationBackupAction === 'import'"
            :disabled="
              !store.conversationStorageReady ||
              store.anyRunning ||
              (!!conversationBackupAction && conversationBackupAction !== 'import')
            "
            @click="backupConversations(true)"
          >
            导入会话备份
          </el-button>
          <el-button
            v-if="store.conversationStorageError"
            :loading="conversationBackupAction === 'retry'"
            :disabled="!!conversationBackupAction"
            @click="retryStorage"
          >
            重试保存
          </el-button>
        </div>
        <p class="conversation-hint">
          转移涉及本机所有账号，成功后保留旧库备份，不会自动清理旧盘空间。
        </p>
        <p class="conversation-hint">
          导入仅添加新会话，不覆盖已有记录；请等待当前任务结束后导入。
        </p>
      </div>
    </section>
    <section class="settings-block">
      <div class="section-title">{{ t("zhifuAgent.settings.generalExecution") }}</div>
      <el-form :model="form" label-position="top" class="execution-form settings-card">
        <el-form-item :label="t('zhifuAgent.settings.generalConversationConcurrency')">
          <el-input-number
            v-model="form.conversationConcurrency"
            @change="saveField('conversationConcurrency', $event)"
            :min="1"
            :max="8"
            :step="1"
            :precision="0"
            controls-position="right"
          />
        </el-form-item>
        <p class="note">{{ t("zhifuAgent.settings.generalConversationConcurrencyNote") }}</p>
        <el-form-item :label="t('zhifuAgent.settings.generalShopConcurrency')">
          <el-input-number
            v-model="form.shopConcurrency"
            @change="saveField('shopConcurrency', $event)"
            :min="1"
            :max="8"
            :step="1"
            :precision="0"
            controls-position="right"
          />
        </el-form-item>
        <p class="note">{{ t("zhifuAgent.settings.generalShopConcurrencyNote") }}</p>
        <el-form-item :label="t('zhifuAgent.settings.generalExecutionTimeout')">
          <el-input-number
            v-model="form.executionTimeoutMinutes"
            @change="saveField('executionTimeoutMinutes', $event)"
            :min="1"
            :max="120"
            :step="1"
            :precision="0"
            controls-position="right"
          />
        </el-form-item>
        <p class="note">{{ t("zhifuAgent.settings.generalExecutionTimeoutNote") }}</p>
      </el-form>
    </section>
    <section class="settings-block">
      <div class="section-title">{{ t("zhifuAgent.settings.generalDisplay") }}</div>
      <div class="settings-card display-card">
        <el-form :model="form" label-position="top" class="name-form">
          <el-form-item :label="t('zhifuAgent.settings.generalUserName')">
            <el-input
              v-model="form.userName"
              @change="saveField('userName', $event)"
              maxlength="24"
              :placeholder="t('zhifuAgent.settings.generalUserNamePlaceholder')"
            />
          </el-form-item>
          <el-form-item :label="t('zhifuAgent.settings.generalAgentName')">
            <el-input
              @change="saveField('agentName', $event)"
              v-model="form.agentName"
              maxlength="24"
              :placeholder="DEFAULT_AGENT_NAME"
            />
          </el-form-item>
        </el-form>
        <p class="note">{{ t("zhifuAgent.settings.generalNameNote") }}</p>
        <div
          v-if="saveStatus"
          class="save-status"
          :class="{ 'is-error': saveError }"
          role="status"
          aria-live="polite"
        >
          <span>{{ saving ? "正在保存…" : saveStatus }}</span>
          <el-button v-if="saveError && !saving" link type="primary" @click="flush">
            重试保存
          </el-button>
        </div>
      </div>
    </section>
    <DiagnosticSettings class="settings-block" />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch, onBeforeUnmount } from "vue";
import { ElMessage } from "element-plus";
import { FolderOpened, Download, Upload } from "@element-plus/icons-vue";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { DEFAULT_AGENT_NAME } from "../../constants";
import OrdinaryBrowserSettings from "./OrdinaryBrowserSettings.vue";
import DiagnosticSettings from "./DiagnosticSettings.vue";
import { normalizeExecutionTimeout, normalizeShopConcurrency } from "../../utils/taskShops";

const store = useZhifuAgentStore();
const conversationBackupAction = ref<"" | "import" | "export" | "move" | "retry">("");
async function moveStorage() {
  if (conversationBackupAction.value) return;
  conversationBackupAction.value = "move";
  try {
    const result = await store.moveConversationStorage();
    if (result) ElMessage.success("会话存储目录已转移");
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  } finally {
    conversationBackupAction.value = "";
  }
}
async function retryStorage() {
  if (conversationBackupAction.value) return;
  conversationBackupAction.value = "retry";
  try {
    await store.retryConversationSave();
    ElMessage.success("会话已保存");
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  } finally {
    conversationBackupAction.value = "";
  }
}
async function backupConversations(importing: boolean) {
  if (conversationBackupAction.value) return;
  conversationBackupAction.value = importing ? "import" : "export";
  try {
    const result = importing
      ? await store.importConversationBackup()
      : await store.exportConversationBackup();
    if (result) ElMessage.success(importing ? "会话备份已导入" : "会话备份已导出");
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  } finally {
    conversationBackupAction.value = "";
  }
}
const { t } = useI18n();

const pickForm = () => ({
  userName: store.settings.userName,
  agentName: store.settings.agentName,
  shopConcurrency: normalizeShopConcurrency(Number(store.settings.shopConcurrency)),
  conversationConcurrency: normalizeShopConcurrency(Number(store.settings.conversationConcurrency)),
  executionTimeoutMinutes: normalizeExecutionTimeout(
    Number(store.settings.executionTimeoutMinutes)
  ),
});
const form = reactive(pickForm());
type FormKey = keyof typeof form;
const saving = ref(false);
const saveStatus = ref("");
const saveError = ref("");
let pending: Partial<typeof form> = {};
const dirty = new Set<FormKey>();

async function selectWorkspace() {
  try {
    await store.selectWorkspace();
  } catch (cause) {
    ElMessage.error(errorMessage(cause));
  }
}

function saveField(key: FormKey, value: string | number | boolean | undefined) {
  if (value === undefined) return;
  const normalized =
    key === "userName"
      ? String(value).trim() || t("zhifuAgent.settings.generalUserNamePlaceholder")
      : key === "agentName"
        ? String(value).trim() || DEFAULT_AGENT_NAME
        : key === "executionTimeoutMinutes"
          ? normalizeExecutionTimeout(Number(value))
          : normalizeShopConcurrency(Number(value));
  Object.assign(pending, { [key]: normalized });
  dirty.add(key);
  void flush();
}

async function flush() {
  if (saving.value || !Object.keys(pending).length) return;
  const patch = pending;
  const draft = { ...form };
  pending = {};
  saving.value = true;
  saveStatus.value = "正在保存…";
  saveError.value = "";
  let failed = false;
  try {
    await store.saveSettings(patch);
    const stored = pickForm();
    for (const key of Object.keys(patch) as FormKey[]) {
      if (!(key in pending) && form[key] === draft[key]) {
        Object.assign(form, { [key]: stored[key] });
        dirty.delete(key);
      }
    }
    saveStatus.value = "已保存";
  } catch (cause) {
    pending = { ...patch, ...pending };
    failed = true;
    saveError.value = errorMessage(cause);
    saveStatus.value = "保存失败：" + saveError.value;
  } finally {
    saving.value = false;
    if (!failed) void flush();
  }
}

watch(pickForm, (next, previous) => {
  for (const key of Object.keys(next) as FormKey[]) {
    if (!dirty.has(key) && form[key] === previous[key]) Object.assign(form, { [key]: next[key] });
  }
});

onBeforeUnmount(() => {
  const stored = pickForm();
  for (const key of Object.keys(stored) as FormKey[]) {
    if (form[key] !== stored[key]) saveField(key, form[key]);
  }
});
</script>

<style lang="scss" scoped>
.general-settings {
  display: flex;
  flex-direction: column;
  gap: 24px;
  max-height: 620px;
  margin: 0 auto;
  overflow-y: auto;
  scrollbar-width: none;
  padding-top: 16px;
  &::-webkit-scrollbar {
    display: none;
  }
}

.general-settings > .settings-block {
  flex-shrink: 0;
  margin: 0;
}

.general-settings :deep(.settings-card) {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-blank);
}

.general-settings :deep(.section-title) {
  margin: 0 0 10px;
  font-size: 14px;
  font-weight: 600;
  color: var(--el-text-color-primary);
}

.workspace-row {
  display: flex;
  gap: 12px;
  align-items: center;
  margin-bottom: 0;
}

.workspace-copy {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;

  strong {
    font-size: 13px;
    font-weight: 500;
  }

  span {
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.conversation-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.conversation-description,
.conversation-hint {
  margin: 0;
  font-size: 12px;
  line-height: 1.7;
  color: var(--el-text-color-secondary);
}
.conversation-location {
  display: flex;
  flex-direction: column;
  gap: 5px;
  padding: 10px 12px;
  background: var(--el-fill-color-light);
  border-radius: 6px;
  font-size: 12px;
  line-height: 1.6;
}
.conversation-location-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}
.conversation-location-label {
  color: var(--el-text-color-secondary);
}
.conversation-path {
  color: var(--el-text-color-regular);
  overflow-wrap: anywhere;
  user-select: text;
}
.conversation-backup-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  .el-button + .el-button {
    margin-left: 0;
  }
}
.display-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.display-card .note {
  margin: 0;
}
.name-form {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  :deep(.el-form-item) {
    margin-bottom: 0;
  }
}

@media (max-width: 640px) {
  .name-form {
    grid-template-columns: 1fr;
  }
  .workspace-row {
    flex-wrap: wrap;
  }
}

.note {
  margin: 0 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  margin-top: -12px;
}

.save-status {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 24px;
  color: var(--el-text-color-secondary);
  font-size: 12px;
  &.is-error {
    color: var(--el-color-danger);
  }
}
</style>
