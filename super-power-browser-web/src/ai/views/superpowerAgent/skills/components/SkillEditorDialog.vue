<template>
  <el-dialog
    v-model="visible"
    :title="t('superpowerAgent.chat.editTrialSkill')"
    width="680px"
    append-to-body
    @closed="reset"
  >
    <div v-loading="busy && !form.id" class="body">
      <template v-if="form.id">
        <div class="heading">
          <strong>{{ t("superpowerAgent.skills.editorHeading") }}</strong>
          <span>{{ t("superpowerAgent.skills.editorHint") }}</span>
        </div>
        <div v-if="steps.length" class="guidance">
          <strong>{{ t("superpowerAgent.skills.willDo") }}</strong>
          <ol>
            <li v-for="(item, index) in steps" :key="index">{{ item }}</li>
          </ol>
        </div>
        <el-form label-position="top">
          <el-form-item :label="t('superpowerAgent.skills.skillName')">
            <el-input v-model="form.name" maxlength="80" />
          </el-form-item>
          <el-form-item :label="t('superpowerAgent.skills.requirementField')">
            <el-input v-model="form.description" type="textarea" :rows="7" />
          </el-form-item>
        </el-form>
      </template>
      <el-alert v-if="errorText" type="error" :title="errorText" show-icon />
    </div>
    <template #footer>
      <el-button @click="visible = false">{{ t("superpowerAgent.common.cancel") }}</el-button>
      <el-button type="primary" :loading="busy" :disabled="!form.id" @click="save">
        {{ busy ? t("superpowerAgent.skills.saving") : t("superpowerAgent.skills.saveChanges") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { errorMessage, useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import { superpowerGetSkill, superpowerUpdateSkill, type SuperPowerSkillScope } from "@/ai/utils/electronApi";
import type { DisplaySkill } from "../../type";

const visible = defineModel<boolean>({ default: false });
const props = defineProps<{ skill: DisplaySkill | null }>();
const emit = defineEmits<{ saved: [] }>();

const store = useSuperPowerAgentStore();
const { t } = useI18n();

const busy = ref(false);
const errorText = ref("");
const form = reactive({
  id: "",
  scope: "workspace" as SuperPowerSkillScope,
  name: "",
  description: "",
  content: "",
});

const steps = computed(() => {
  const match = form.content.match(/^## 执行说明\s*\r?\n([\s\S]*?)(?=^## |$(?![\s\S]))/m);
  return (match ? match[1] : "")
    .trim()
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.、]\s*/, "").trim())
    .filter(Boolean);
});

function reset() {
  Object.assign(form, { id: "", scope: "workspace", name: "", description: "", content: "" });
  errorText.value = "";
}

watch(visible, (open) => {
  if (open && props.skill) load(props.skill);
});

async function load(skill: DisplaySkill) {
  reset();
  form.scope = skill.scope;
  busy.value = true;
  try {
    const details = await superpowerGetSkill({
      id: String(skill.id),
      scope: skill.scope,
      workspace: store.workspace,
    });
    Object.assign(form, details);
  } catch (cause) {
    errorText.value = errorMessage(cause);
  } finally {
    busy.value = false;
  }
}

async function save() {
  busy.value = true;
  errorText.value = "";
  try {
    await superpowerUpdateSkill({
      id: form.id,
      scope: form.scope,
      workspace: store.workspace,
      name: form.name.trim(),
      description: form.description.trim(),
      content: form.content,
    });
    await store.loadSkills();
    emit("saved");
    visible.value = false;
  } catch (cause) {
    errorText.value = errorMessage(cause);
  } finally {
    busy.value = false;
  }
}
</script>

<style lang="scss" scoped>
.body {
  min-height: 180px;
}

.heading {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin-bottom: 12px;

  span {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.guidance {
  padding: 12px;
  margin-bottom: 14px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;

  ol {
    padding-left: 18px;
    margin: 8px 0 0;
  }
}
</style>
