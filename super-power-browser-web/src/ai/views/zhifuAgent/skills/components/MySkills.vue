<template>
  <div class="my-skills" :class="{ 'has-create-tip': showCreateTip }">
    <el-alert
      v-if="statusMessage"
      :type="statusType"
      :title="statusMessage"
      show-icon
      class="status"
    />

    <div class="source-bar">
      <el-radio-group v-model="sourceTab" class="source-tabs" @change="onSourceTab">
        <el-radio-button value="local">{{ t("zhifuAgent.skills.localMine") }}</el-radio-button>
        <el-radio-button value="uploaded">
          {{ t("zhifuAgent.skills.uploadedMine") }}
        </el-radio-button>
      </el-radio-group>
      <el-select v-if="sourceTab === 'uploaded'" v-model="reviewStatus" class="review-filter">
        <el-option :value="0" :label="t('zhifuAgent.skills.filterAll')" />
        <el-option :value="3" :label="t('zhifuAgent.skills.reviewAuditing')" />
        <el-option :value="2" :label="t('zhifuAgent.skills.reviewFailed')" />
      </el-select>
    </div>

    <div
      v-show="sourceTab === 'local'"
      v-loading="store.skillsBusy && !skills.length"
      class="skill-list"
    >
      <el-empty
        v-if="!store.skillsBusy && !allSkills.length"
        :description="t('zhifuAgent.skills.emptyWorkspace')"
      >
        <template #image>
          <el-icon :size="40"><Box /></el-icon>
        </template>
        <span class="empty-tip">{{ t("zhifuAgent.skills.emptyTip") }}</span>
      </el-empty>
      <el-empty
        v-else-if="!store.skillsBusy && !skills.length"
        :description="t('zhifuAgent.skills.searchEmpty')"
      />
      <div v-for="skill in skills" :key="`${skill.scope}:${skill.id}`" class="skill-item">
        <div :class="['skill-icon', { disabled: !skill.enabled }]">
          <el-icon><Box /></el-icon>
        </div>
        <div class="skill-copy">
          <div class="skill-name">
            <strong>{{ skill.name }}</strong>
            <span class="skill-version">
              {{
                t("zhifuAgent.skills.version", {
                  version: skill.version?.trim() || "v1.0.0",
                })
              }}
            </span>
            <!-- <el-tag size="small" type="info">
              {{
                t(
                  `zhifuAgent.skills.scope${skill.scope.charAt(0).toUpperCase()}${skill.scope.slice(1)}`
                )
              }}
            </el-tag> -->
            <el-tag v-if="skill.category_name" size="small">
              {{ skill.category_name }}
            </el-tag>
            <el-tag v-if="skill.sub_category_name" size="small">
              {{ skill.sub_category_name }}
            </el-tag>
            <el-tag v-if="skill.invalid" size="small" type="danger">
              {{ t("zhifuAgent.skills.invalid") }}
            </el-tag>
          </div>
          <p>{{ skill.description }}</p>
        </div>

        <div class="skill-actions">
          <!-- <el-button
            type="primary"
            size="small"
            plain
            :icon="ChatLineRound"
            :disabled="!skill.enabled || skill.invalid"
            @click="trialSkill = skill"
          >
            {{ t("zhifuAgent.skills.trialInChat") }}
          </el-button> -->
          <el-button
            type="primary"
            size="small"
            plain
            :icon="ChatLineRound"
            :disabled="!skill.enabled || skill.invalid"
            @click="useInstalledSkillInChat(store, skill.name)"
          >
            {{ t("zhifuAgent.skills.goUse") }}
          </el-button>
          <el-button
            type="primary"
            size="small"
            plain
            :icon="Timer"
            :disabled="!skill.enabled || skill.invalid"
            @click="scheduleSkill(skill)"
          >
            {{ t("zhifuAgent.skills.scheduleTrial") }}
          </el-button>
          <el-button
            type="primary"
            size="small"
            plain
            :icon="Share"
            :disabled="skill.invalid"
            :loading="sharingId === skillKey(skill)"
            @click="openShare(skill)"
          >
            {{ t("zhifuAgent.skills.share") }}
          </el-button>
          <el-dropdown
            trigger="click"
            popper-class="skill-more-menu"
            @command="(command) => handleSkillCommand(command, skill)"
          >
            <el-button class="skill-more-button" type="text" :icon="More" />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  :icon="skill.enabled ? TurnOff : Open"
                  command="toggle"
                  :disabled="skill.invalid || skill.fromStore"
                >
                  {{
                    skill.enabled
                      ? t("zhifuAgent.skills.disablePlugin")
                      : t("zhifuAgent.skills.enablePlugin")
                  }}
                </el-dropdown-item>
                <el-dropdown-item :icon="Upload" command="upload" :disabled="skill.invalid">
                  {{ t("zhifuAgent.skills.uploadCloud") }}
                </el-dropdown-item>
                <el-dropdown-item :icon="EditPen" command="edit">
                  {{ t("zhifuAgent.common.edit") }}
                </el-dropdown-item>
                <el-dropdown-item :icon="Delete" command="delete" class="danger-item">
                  {{ t("zhifuAgent.skills.uninstall") }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
    </div>
    <UploadedSkills
      v-show="sourceTab === 'uploaded'"
      ref="uploadedSkillsRef"
      v-model:keyword="keywords.uploaded"
      :review-status="reviewStatus"
      :show-create-tip="showCreateTip"
      @error="(message) => emit('error', message)"
    />
    <SkillEditorDialog v-model="editorOpen" :skill="editingSkill" @saved="reload" />
    <SkillTrialDialog v-model="trialSkill" />
    <SkillShareDialog ref="shareDialogRef" />
  </div>
</template>

<script setup lang="ts">
import {
  Box,
  ChatLineRound,
  Delete,
  EditPen,
  More,
  Share,
  Timer,
  Upload,
  TurnOff,
  Open,
} from "@element-plus/icons-vue";
import { unbindSkillStore } from "@/ai/api/zhifuAgent";
import { errorMessage, skillIdentity, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuInstallSkill, zhifuToggleSkill, zhifuUninstallSkill } from "@/ai/utils/electronApi";
import type { DisplaySkill } from "../../type";
import { useInstalledSkillInChat } from "../skillListShared";
import SkillEditorDialog from "./SkillEditorDialog.vue";
import SkillShareDialog from "./SkillShareDialog.vue";
import UploadedSkills from "./UploadedSkills.vue";
import SkillTrialDialog from "./SkillTrialDialog.vue";

const store = useZhifuAgentStore();
const { t } = useI18n();
const keyword = defineModel("keyword", { default: "" });
const keywords = reactive({
  local: keyword.value,
  uploaded: "",
});

defineProps<{ showCreateTip?: boolean }>();
const emit = defineEmits<{ error: [message: string] }>();
const sourceTab = ref<"local" | "uploaded">("local");
const reviewStatus = ref(0);

watch(
  () => [sourceTab.value, keyword.value] as const,
  ([tab, value], prev) => {
    if (!prev || prev[0] !== tab) {
      const saved = keywords[tab];
      if (keyword.value !== saved) keyword.value = saved;
      return;
    }
    keywords[tab] = value;
  }
);
const uploadedSkillsRef = ref<InstanceType<typeof UploadedSkills>>();

function onSourceTab(tab: string | number | boolean | undefined) {
  if (tab === "uploaded") {
    uploadedSkillsRef.value?.reload();
    return;
  }
  reload();
}

const editorOpen = ref(false);
const trialSkill = ref<DisplaySkill | null>(null);
const editingSkill = ref<DisplaySkill | null>(null);
const shareDialogRef = ref<InstanceType<typeof SkillShareDialog>>();
const sharingId = ref("");
const statusMessage = ref("");
const statusType = ref<"success" | "error">("error");

const allSkills = computed(() =>
  [...store.skillsByScope("workspace")].sort(
    (left, right) =>
      Number(right.createdAt || 0) - Number(left.createdAt || 0) ||
      left.name.localeCompare(right.name)
  )
);
const skills = computed(() => {
  const query = keywords.local.trim().toLocaleLowerCase();
  if (!query) return allSkills.value;
  return allSkills.value.filter((skill) =>
    `${skill.name} ${skill.description || ""}`.toLocaleLowerCase().includes(query)
  );
});

function showError(cause: unknown) {
  statusType.value = "error";
  statusMessage.value = errorMessage(cause);
}

async function reload() {
  statusMessage.value = "";
  try {
    await store.loadSkills();
  } catch (cause) {
    showError(cause);
  }
}

async function installSkill(kind: "folder" | "zip") {
  statusMessage.value = "";
  if (!store.workspace) {
    await store.selectWorkspace().catch(showError);
    if (!store.workspace) return;
  }
  store.skillsBusy = true;
  try {
    const result = await zhifuInstallSkill({
      kind,
      scope: "workspace",
      workspace: store.workspace,
    });
    if (!result?.canceled) {
      await store.loadSkills();
      statusType.value = "success";
      statusMessage.value = t("zhifuAgent.skills.installedToWorkspace");
    }
  } catch (cause) {
    showError(cause);
  } finally {
    store.skillsBusy = false;
  }
}

function openEditor(skill: DisplaySkill) {
  editingSkill.value = skill;
  editorOpen.value = true;
}

async function toggle(skill: DisplaySkill) {
  if (skill.invalid || skill.fromStore) return;
  try {
    await zhifuToggleSkill({ id: String(skill.id), scope: skill.scope, enabled: !skill.enabled });
    await store.loadSkills();
  } catch (cause) {
    showError(cause);
  }
}

async function uninstall(skill: DisplaySkill) {
  try {
    await ElMessageBox.confirm(
      t("zhifuAgent.skills.uninstallConfirm", { name: skill.name }),
      t("zhifuAgent.common.tip"),
      {
        type: "warning",
        confirmButtonText: t("zhifuAgent.skills.uninstall"),
        cancelButtonText: t("zhifuAgent.common.cancel"),
      }
    );
  } catch {
    return;
  }
  try {
    await zhifuUninstallSkill({
      id: String(skill.id),
      scope: skill.scope,
      workspace: store.workspace,
    });
    await store.loadBoundSkillStore();
    const bound = store.boundStoreSkills.find(
      (item) => skillIdentity(item.name) === skillIdentity(skill.name)
    );
    if (bound) await unbindSkillStore(bound.id);
    await Promise.all([store.loadSkills(), store.loadBoundSkillStore(), store.loadSkillStore()]);
    ElMessage.success(t("zhifuAgent.skills.deleteSuccess"));
  } catch (cause) {
    showError(cause);
  }
}

function scheduleSkill(skill: DisplaySkill) {
  store.pendingScheduledDraft = {
    title: skill.name,
    prompt: skill.description || t("zhifuAgent.skills.trialDefaultRequest", { name: skill.name }),
    skillNames: [skill.name],
    shops: [],
    enabled: false,
    workspace: store.workspace,
    pushPlatforms: [],
    frequency: "daily",
    date: new Date().toISOString().slice(0, 10),
    time: "09:00",
    weekdays: [1],
  };
  store.openPage("scheduled");
}

function handleSkillCommand(command: string, skill: DisplaySkill) {
  if (command === "toggle") toggle(skill);
  if (command === "upload") uploadToCloud(skill);
  if (command === "edit") openEditor(skill);
  if (command === "delete") uninstall(skill);
}

async function uploadToCloud(skill: DisplaySkill) {
  if (skill.invalid) return;
  try {
    const uploaded = await shareDialogRef.value?.uploadToCloud(skill);
    if (uploaded) await uploadedSkillsRef.value?.reload();
  } catch (cause) {
    showError(cause);
  }
}

function openTrial(skill: DisplaySkill) {
  trialSkill.value = skill;
}

function skillKey(skill: DisplaySkill) {
  return `${skill.scope}:${skill.id}`;
}

async function openShare(skill: DisplaySkill) {
  if (skill.invalid || sharingId.value) return;
  sharingId.value = skillKey(skill);
  try {
    await shareDialogRef.value?.open(skill);
  } finally {
    sharingId.value = "";
  }
}

watch(
  () => store.pendingSkillEdit,
  async (target) => {
    if (!target) return;
    store.pendingSkillEdit = null;
    try {
      await store.loadSkills();
    } catch (cause) {
      showError(cause);
      return;
    }
    const skill = store
      .skillsByScope("workspace")
      .find((item) => item.id === target.id && item.scope === target.scope);
    if (!skill) {
      showError(new Error(t("zhifuAgent.chat.skillRemoved")));
      return;
    }
    openEditor(skill);
  },
  { immediate: true }
);

onMounted(reload);

async function openUpload() {
  sourceTab.value = "uploaded";
  await nextTick();
  if (!uploadedSkillsRef.value) await nextTick();
  uploadedSkillsRef.value?.openUpload();
}

defineExpose({ reload, openTrial, scheduleSkill, installSkill, openUpload });
</script>

<style lang="scss" scoped>
.status {
  margin-bottom: 12px;
}

.skill-list {
  min-height: 160px;
  max-height: calc(100vh - 255px);
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.has-create-tip .skill-list {
  max-height: calc(100vh - 380px);
}

.empty-tip {
  font-size: 12px;
  color: var(--el-text-color-secondary);
}

.source-bar {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.source-tabs {
  margin-bottom: 0;
}

.review-filter {
  width: 100px;
}

.skill-item {
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
  :deep(.el-button) {
    padding: 0 8px;
    margin-left: 0;
  }
  :deep(.el-button.el-button--text) {
    padding: 0;
    margin-left: 0;
    height: 22px;
  }
}

.skill-icon {
  display: grid;
  flex: 0 0 38px;
  place-items: center;
  width: 38px;
  height: 38px;
  font-size: 18px;
  color: var(--el-color-primary);
  background: var(--el-color-primary-light-9);
  border-radius: 8px;

  &.disabled {
    color: var(--el-text-color-placeholder);
    background: var(--el-fill-color-light);
  }
}

.skill-copy {
  flex: 1;
  min-width: 0;

  p {
    margin: 4px 0 0;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-secondary);
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.skill-name {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;

  strong {
    font-size: 14px;
    font-weight: 500;
  }
}

.skill-version {
  font-size: 12px;
  margin-left: 6px;
  color: var(--el-text-color-secondary);
}

.skill-actions {
  display: flex;
  flex: none;
  gap: 2px;
  align-items: center;

  :deep(> .el-button) {
    margin-left: 2px;
    .el-icon {
      font-size: 14px;
    }
    [class*="el-icon"] + span {
      margin-left: 2px;
    }
  }
  .skill-more-button {
    padding: 4px 4px !important;
  }
}
</style>

<style lang="scss">
.skill-more-menu {
  .el-dropdown-menu__item {
    gap: 8px;
    min-width: 148px;
    color: #595959;
  }

  .el-icon {
    margin-right: 0;
    font-size: 16px;
  }

  .danger-item,
  .danger-item .el-icon {
    color: #ff5a1f;
  }
}
</style>
