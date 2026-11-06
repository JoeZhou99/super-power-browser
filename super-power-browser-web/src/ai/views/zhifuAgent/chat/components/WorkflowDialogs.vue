<template>
  <el-dialog
    v-model="creatorOpen"
    class="chat-skill-creator-dialog"
    width="min(960px, calc(100vw - 48px))"
    top="4vh"
    append-to-body
    destroy-on-close
    :title="t('zhifuAgent.skills.create')"
    :close-on-click-modal="false"
  >
    <SkillCreatorDialog
      v-if="creatorOpen"
      ref="creatorRef"
      @close="creatorOpen = false"
      @trial="onCreatorTrial"
      @schedule="onCreatorSchedule"
    />
  </el-dialog>

  <SkillEditorDialog v-model="editorOpen" :skill="editingSkill" />
  <ScheduledTaskEditor
    v-model="editingTask"
    save-and-view
    :saving="scheduleSaving"
    @save="saveSchedule"
    @save-and-view="saveScheduleAndView"
  />
  <SkillTrialDialog v-model="trialSkill" />
</template>

<script lang="ts">
import type { InjectionKey } from "vue";
import type { ScheduledTask } from "@/ai/api/zhifuAgent";
import type { DisplaySkill, SkillCreatorPrefill } from "../../type";

export interface ChatWorkflowDialogs {
  openSkillCreator: (_draft: SkillCreatorPrefill) => void;
  openSkillEditor: (_skill: DisplaySkill) => void;
  openScheduleEditor: (_draft: Partial<ScheduledTask>) => void;
}

export const chatWorkflowDialogsKey: InjectionKey<ChatWorkflowDialogs> =
  Symbol("chatWorkflowDialogs");
</script>

<script setup lang="ts">
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import ScheduledTaskEditor from "../../scheduled/components/ScheduledTaskEditor.vue";
import SkillCreatorDialog from "../../skills/components/SkillCreatorDialog.vue";
import SkillEditorDialog from "../../skills/components/SkillEditorDialog.vue";
import SkillTrialDialog from "../../skills/components/SkillTrialDialog.vue";
import { normalizeTaskShops } from "../../utils/taskShops";

const store = useZhifuAgentStore();
const { t } = useI18n();

const creatorOpen = ref(false);
const creatorDraft = ref<SkillCreatorPrefill | null>(null);
const creatorRef = ref<InstanceType<typeof SkillCreatorDialog>>();
const editorOpen = ref(false);
const editingSkill = ref<DisplaySkill | null>(null);
const editingTask = ref<ScheduledTask | null>(null);
const scheduleSaving = ref(false);
const trialSkill = ref<DisplaySkill | null>(null);

function emptyTask(): ScheduledTask {
  return {
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
  };
}

function applyCreatorDraft() {
  if (creatorDraft.value) creatorRef.value?.applyDraft(creatorDraft.value);
}

watch(creatorRef, () => applyCreatorDraft());

function openSkillCreator(draft: SkillCreatorPrefill) {
  creatorDraft.value = { ...draft };
  if (creatorOpen.value) {
    applyCreatorDraft();
    return;
  }
  creatorOpen.value = true;
}

async function openSkillEditor(skill: DisplaySkill) {
  editingSkill.value = skill;
  if (!editorOpen.value) {
    editorOpen.value = true;
    return;
  }
  editorOpen.value = false;
  await nextTick();
  editorOpen.value = true;
}

function buildTask(draft: Partial<ScheduledTask>): ScheduledTask {
  const next = { ...emptyTask(), ...draft, enabled: draft.enabled ?? false };
  return {
    ...next,
    skillNames: [...(next.skillNames || [])],
    shops: normalizeTaskShops(next.shops),
    pushPlatforms: [...(next.pushPlatforms || [])],
    weekdays: [...(next.weekdays || [])],
  };
}

async function openScheduleEditor(draft: Partial<ScheduledTask>) {
  const task = buildTask(draft);
  if (editingTask.value) {
    editingTask.value = null;
    await nextTick();
  }
  editingTask.value = task;
}

async function onCreatorTrial(skill: DisplaySkill) {
  creatorOpen.value = false;
  await nextTick();
  trialSkill.value = skill;
}

function onCreatorSchedule(skill: DisplaySkill) {
  creatorOpen.value = false;
  openScheduleEditor({
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
  });
}

async function saveSchedule(task: ScheduledTask, view = false) {
  scheduleSaving.value = true;
  try {
    await store.saveScheduledTask(task);
    editingTask.value = null;
    ElMessage.success(t("zhifuAgent.common.saveSuccess"));
  } catch (cause) {
    scheduleSaving.value = false;
    ElMessage.error(errorMessage(cause));
    return;
  }
  scheduleSaving.value = false;
  if (view) store.openPage("scheduled");
}

function saveScheduleAndView(task: ScheduledTask) {
  return saveSchedule(task, true);
}

function closeDialogs() {
  creatorOpen.value = false;
  editorOpen.value = false;
  editingTask.value = null;
  trialSkill.value = null;
}

onDeactivated(closeDialogs);

defineExpose({ openSkillCreator, openSkillEditor, openScheduleEditor });
</script>

<style lang="scss">
.chat-skill-creator-dialog.el-dialog {
  display: flex;
  flex-direction: column;
  max-height: calc(100vh - 48px);
  margin-bottom: 24px;
  overflow: hidden;

  .el-dialog__header {
    position: absolute;
    top: 12px;
    right: 12px;
    z-index: 3;
    width: auto;
    padding: 0;
    margin: 0;
  }

  .el-dialog__title {
    display: none;
  }

  .el-dialog__headerbtn {
    position: static;
    width: 28px;
    height: 28px;
  }

  .el-dialog__body {
    display: flex;
    flex: 1;
    flex-direction: column;
    height: min(760px, calc(100vh - 80px));
    min-height: 0;
    padding: 18px 22px 14px;
    overflow: hidden;
  }

  .creator-page {
    flex: 1;
    width: 100%;
    min-height: 0;
  }

  .creator-header {
    padding-right: 28px;
  }
}
</style>
