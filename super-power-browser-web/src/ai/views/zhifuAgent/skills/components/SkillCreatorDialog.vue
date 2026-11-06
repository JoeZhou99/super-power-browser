<template>
  <section class="creator-page">
    <div class="creator-top">
      <header class="creator-header">
        <button type="button" class="back" @click="goBack">
          <el-icon :size="18"><ArrowLeft /></el-icon>
        </button>
        <div>
          <h2>{{ t("zhifuAgent.skills.create") }}</h2>
          <p>{{ t("zhifuAgent.skills.createDesc") }}</p>
        </div>
      </header>

      <div v-if="step < 3" class="creator-steps">
        <div :class="['step', { active: step === 1, done: step > 1 }]">
          <span>1</span>
          {{ t("zhifuAgent.skills.stepDescribe") }}
        </div>
        <i class="step-line"></i>
        <div :class="['step', { active: step === 2 }]">
          <span>2</span>
          {{ t("zhifuAgent.skills.stepPreview") }}
        </div>
      </div>
    </div>

    <div class="creator-scroll">
      <div class="body">
        <template v-if="step === 1">
          <div class="heading">
            <strong>{{ t("zhifuAgent.skills.requirementTitle") }}</strong>
            <span>{{ t("zhifuAgent.skills.requirementHint") }}</span>
          </div>
          <section class="examples">
            <div class="examples-heading">
              <el-icon><MagicStick /></el-icon>
              <strong>{{ t("zhifuAgent.skills.examplesTitle") }}</strong>
              <span>{{ t("zhifuAgent.skills.examplesHint") }}</span>
            </div>
            <div class="examples-grid">
              <button
                v-for="example in examples"
                :key="example.label"
                type="button"
                :class="{ selected: selectedExample === example }"
                @click="applyExample(example)"
              >
                <span class="card-title">
                  <strong>{{ example.label }}</strong>
                  <em>{{ templateLabel(example.templateId) }}</em>
                </span>
                <small>{{ example.action }}</small>
                <span class="use">{{ t("zhifuAgent.skills.useExample") }}</span>
              </button>
            </div>
          </section>
          <div class="guidance">
            <strong>{{ t("zhifuAgent.skills.sentenceTitle") }}</strong>
            <div class="sentence">
              <label>
                {{ t("zhifuAgent.skills.sentenceTrigger") }}
                <el-input
                  v-model="sentence.trigger"
                  :placeholder="t('zhifuAgent.skills.sentenceTriggerPlaceholder')"
                />
              </label>
              <label>
                {{ t("zhifuAgent.skills.sentenceTarget") }}
                <el-input
                  v-model="sentence.target"
                  :placeholder="t('zhifuAgent.skills.sentenceTargetPlaceholder')"
                />
              </label>
              <label>
                {{ t("zhifuAgent.skills.sentenceAction") }}
                <el-input
                  v-model="sentence.action"
                  :placeholder="t('zhifuAgent.skills.sentenceActionPlaceholder')"
                />
              </label>
              <label>
                {{ t("zhifuAgent.skills.sentenceOutput") }}
                <el-input
                  v-model="sentence.output"
                  :placeholder="t('zhifuAgent.skills.sentenceOutputPlaceholder')"
                />
              </label>
            </div>
            <el-button @click="applySentence">
              {{ t("zhifuAgent.skills.fillRequirement") }}
            </el-button>
          </div>
          <el-form label-position="top" require-asterisk-position="left">
            <el-form-item :label="t('zhifuAgent.skills.skillName')" required>
              <el-input
                v-model="draft.name"
                maxlength="50"
                :placeholder="t('zhifuAgent.skills.namePlaceholder')"
              />
            </el-form-item>
            <el-form-item :label="t('zhifuAgent.skills.requirementField')" required>
              <el-input
                v-model="draft.requirement"
                type="textarea"
                :rows="4"
                :placeholder="t('zhifuAgent.skills.requirementPlaceholder')"
              />
            </el-form-item>
          </el-form>
        </template>

        <template v-else-if="step === 2">
          <div class="heading">
            <strong>{{ t("zhifuAgent.skills.previewTitle") }}</strong>
            <span>{{ t("zhifuAgent.skills.previewHint") }}</span>
          </div>
          <div class="guidance">
            <strong>{{ t("zhifuAgent.skills.willDo") }}</strong>
            <ol>
              <li v-for="(item, index) in draftSteps" :key="index">{{ item }}</li>
            </ol>
            <small>{{ t("zhifuAgent.skills.stepsNote") }}</small>
          </div>
          <el-form label-position="top">
            <el-form-item :label="t('zhifuAgent.skills.skillName')">
              <el-input v-model="draft.name" maxlength="50" />
            </el-form-item>
            <el-form-item :label="t('zhifuAgent.skills.requirementField')">
              <el-input
                v-model="draft.requirement"
                type="textarea"
                :rows="4"
                @input="draft.description = draft.requirement"
              />
            </el-form-item>
          </el-form>
          <div v-if="pendingChecks.length" class="guidance">
            <div v-for="check in pendingChecks" :key="check" class="check">
              {{ t("zhifuAgent.skills.checkPending", { label: check }) }}
            </div>
            <el-button @click="repairDraft">{{ t("zhifuAgent.skills.repair") }}</el-button>
          </div>
        </template>

        <div v-else class="created">
          <el-icon :size="28"><CircleCheck /></el-icon>
          <strong>{{ t("zhifuAgent.skills.createdTitle") }}</strong>
          <p>{{ t("zhifuAgent.skills.createdDesc", { name: createdName }) }}</p>
        </div>
      </div>
    </div>

    <div class="footer">
      <el-alert v-if="errorText" class="error" type="error" :title="errorText" show-icon />
      <el-button v-if="step === 2" :disabled="busy" @click="step = 1">
        {{ t("zhifuAgent.skills.editRequirement") }}
      </el-button>
      <span class="footer-spacer"></span>
      <el-button v-if="step === 1" type="primary" @click="generateDraft">
        {{ t("zhifuAgent.skills.generate") }}
      </el-button>
      <el-button v-else-if="step === 2" type="primary" :loading="busy" @click="createSkill">
        {{ busy ? t("zhifuAgent.skills.creating") : t("zhifuAgent.skills.createSkill") }}
      </el-button>
      <template v-else>
        <el-button @click="emit('schedule', createdSkill())">
          {{ t("zhifuAgent.chat.scheduleRun") }}
        </el-button>
        <!-- <el-button @click="emit('trial', createdSkill())">
          {{ t("zhifuAgent.skills.trialOnce") }}
        </el-button> -->
        <el-button @click="useCreated">{{ t("zhifuAgent.skills.useNow") }}</el-button>
      </template>
    </div>
  </section>
</template>

<script lang="ts">
let skillCreatorFinished = false;
</script>

<script setup lang="ts">
import { ArrowLeft, CircleCheck, MagicStick } from "@element-plus/icons-vue";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuCreateSkill } from "@/ai/utils/electronApi";
import { ZHIFU_STORAGE_KEYS } from "../../constants";
import type { DisplaySkill, SkillCreatorPrefill } from "../../type";

interface SkillExample {
  label: string;
  templateId: string;
  trigger: string;
  target: string;
  action: string;
  output: string;
}

const emit = defineEmits<{
  close: [];
  created: [];
  trial: [skill: DisplaySkill];
  schedule: [skill: DisplaySkill];
}>();

const store = useZhifuAgentStore();
const { t } = useI18n();

const templates = [
  {
    id: "browser",
    label: "浏览器自动化",
    name: "浏览器操作助手",
    instruction: "确认目标页面和操作要求，检查页面状态后逐步执行，并向用户返回操作结果。",
    permissions: ["操作浏览器页面"],
  },
  {
    id: "files",
    label: "文件处理",
    name: "文件处理助手",
    instruction: "确认输入文件和输出要求，在当前工作区处理文件，并说明生成文件的位置。",
    permissions: ["读取工作区文件", "在工作区创建文件"],
  },
  {
    id: "data",
    label: "数据查询",
    name: "数据查询助手",
    instruction: "理解查询条件，获取并核对数据来源，将结果整理为清晰的摘要。",
    permissions: ["访问外部网络"],
  },
  {
    id: "message",
    label: "消息通知",
    name: "消息通知助手",
    instruction: "确认通知对象和内容，执行发送操作，并返回明确的发送结果。",
    permissions: ["发送外部消息"],
  },
  {
    id: "content",
    label: "内容生成",
    name: "内容生成助手",
    instruction: "根据用户提供的主题、语气和格式要求生成内容，并在输出前检查完整性。",
    permissions: [] as string[],
  },
];

const examples: SkillExample[] = [
  {
    label: "获取店铺订单数据",
    templateId: "browser",
    trigger: "获取店铺订单",
    target: "已选择并打开的店铺浏览器",
    action:
      "进入订单页面，按用户指定的日期范围查询订单，读取订单编号、商品、金额和订单状态；未指定日期时先询问，仅查询数据，不修改订单，不重复打开浏览器",
    output: "订单明细和统计摘要，注明查询日期范围及未能获取的字段",
  },
  {
    label: "整理文件",
    templateId: "files",
    trigger: "整理文件",
    target: "工作区文件",
    action: "按类型分类并整理",
    output: "文件清单和保存位置",
  },
  {
    label: "查询城市天气",
    templateId: "data",
    trigger: "查询天气",
    target: "我指定的城市",
    action: "查询当天的天气、温度和降水信息，并注明数据来源",
    output: "天气摘要和出行建议",
  },
  {
    label: "发送工作通知",
    templateId: "message",
    trigger: "发送工作通知",
    target: "已配置的消息渠道",
    action: "确认接收对象和通知内容后发送消息",
    output: "发送结果和失败原因",
  },
  {
    label: "生成工作日报",
    templateId: "content",
    trigger: "生成日报",
    target: "我提供的工作记录",
    action: "整理完成事项、问题和下一步计划",
    output: "一份简洁的日报",
  },
  {
    label: "汇总数据",
    templateId: "files",
    trigger: "汇总数据",
    target: "工作区的数据文件",
    action: "统计并核对数据",
    output: "CSV 文件和统计摘要",
  },
];

const emptyDraft = () => ({
  requirement: "",
  templateId: "",
  name: "",
  description: "",
  triggersText: "",
  instructions: "",
  permissions: [] as string[],
});
const emptySentence = () => ({ trigger: "", target: "", action: "", output: "" });

const draft = reactive(emptyDraft());
const sentence = reactive(emptySentence());
const step = ref(1);
const busy = ref(false);
const errorText = ref("");
const createdName = ref("");
const createdId = ref("");

if (skillCreatorFinished) {
  localStorage.removeItem(ZHIFU_STORAGE_KEYS.skillCreatorDraft);
  skillCreatorFinished = false;
}

try {
  const saved = JSON.parse(localStorage.getItem(ZHIFU_STORAGE_KEYS.skillCreatorDraft) || "{}");
  const { sentence: savedSentence, ...savedDraft } = saved;
  Object.assign(draft, savedDraft);
  if (!Array.isArray(draft.permissions)) draft.permissions = [];
  if (savedSentence) Object.assign(sentence, savedSentence);
  else {
    const example = examples.find((item) => item.label === draft.name);
    if (example) {
      Object.assign(sentence, {
        trigger: example.trigger,
        target: example.target,
        action: example.action,
        output: example.output,
      });
      if (!draft.requirement.trim()) applySentence();
    }
  }
} catch {
  /* 草稿损坏时使用空白表单 */
}
watch(
  [draft, sentence],
  () => {
    localStorage.setItem(
      ZHIFU_STORAGE_KEYS.skillCreatorDraft,
      JSON.stringify({ ...draft, sentence: { ...sentence } })
    );
  },
  { deep: true }
);

const selectedExample = computed(() =>
  examples.find((example) =>
    (["trigger", "target", "action", "output"] as const).every(
      (key) => sentence[key] === example[key]
    )
  )
);
const draftSteps = computed(() =>
  draft.instructions
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*\d+[.、]\s*/, "").trim())
    .filter(Boolean)
);
const pendingChecks = computed(() => {
  const checks = [
    {
      label: t("zhifuAgent.skills.checkName"),
      ok: Boolean(draft.name.trim() && draft.description.trim()),
    },
    { label: t("zhifuAgent.skills.checkTrigger"), ok: Boolean(draft.triggersText.trim()) },
    {
      label: t("zhifuAgent.skills.checkSteps"),
      ok: Boolean(draft.instructions.trim() && /输出|返回|保存|结果/.test(draft.instructions)),
    },
  ];
  return checks.filter((item) => !item.ok).map((item) => item.label);
});
const involvedOperations = computed(() => {
  const text = `${draft.requirement} ${draft.instructions}`;
  const operations = new Set(
    templates.find((item) => item.id === draft.templateId)?.permissions || []
  );
  if (/浏览器|店铺|网页|页面/.test(text)) operations.add("操作浏览器页面");
  if (/读取|文件|数据文件/.test(text)) operations.add("读取工作区文件");
  if (/保存|导出|创建文件|写入|CSV|Excel/i.test(text)) operations.add("在工作区创建文件");
  if (/天气|新闻|网络|网站|实时/.test(text)) operations.add("访问外部网络");
  if (/发送|推送|通知|飞书|钉钉/.test(text)) operations.add("发送外部消息");
  return [...operations];
});

const templateLabel = (id: string) => templates.find((item) => item.id === id)?.label || "";

function goBack() {
  if (step.value === 2) {
    step.value = 1;
    return;
  }
  emit("close");
}

function applySentence() {
  const { trigger, target, action, output } = sentence;
  if (![trigger, target, action, output].every((value) => value.trim())) {
    errorText.value = t("zhifuAgent.skills.sentenceIncomplete");
    return;
  }
  draft.requirement = `当我说“${trigger.trim()}”时，帮我对${target.trim()}执行${action.trim()}，最后输出${output.trim()}。`;
  errorText.value = "";
}

function applyExample(example: SkillExample) {
  Object.assign(sentence, example);
  draft.templateId = example.templateId;
  draft.name = example.label;
  draft.instructions = "";
  draft.triggersText = example.trigger;
  applySentence();
}

function matchTemplate(requirement: string) {
  if (selectedExample.value) return selectedExample.value.templateId;
  const rules: Array<[string, RegExp]> = [
    ["browser", /店铺|浏览器|网页|页面|browser|playwright/i],
    ["message", /通知|发送消息|推送|飞书|钉钉|企业微信/],
    ["files", /文件|目录|文件夹|整理文件|导出|excel|csv|pdf/i],
    ["data", /查询|天气|搜索|获取数据|数据来源/],
    ["content", /生成|写作|日报|文案|总结|文章/],
  ];
  return rules.find(([, pattern]) => pattern.test(requirement))?.[0] || "";
}

function generateDraft() {
  const requirement = draft.requirement.trim();
  if (requirement.length < 6) {
    errorText.value = t("zhifuAgent.skills.requirementTooShort");
    return;
  }
  draft.templateId = matchTemplate(requirement);
  const template = templates.find((item) => item.id === draft.templateId);
  const shortRequirement = requirement
    .replace(/[。！？!?，,]/g, " ")
    .trim()
    .slice(0, 16);
  draft.name ||= template?.name || `${shortRequirement}助手`;
  draft.description = requirement;
  draft.triggersText ||= requirement;
  draft.instructions ||= `1. 确认用户的目标和必要输入：${requirement}\n2. ${template?.instruction || "根据用户要求逐步完成任务，缺少输入时先询问用户。"}\n3. 输出${sentence.output || "结果摘要和产出位置"}，明确说明未完成事项；工具不可用时说明原因，不声称执行成功。`;
  draft.permissions = [...(template?.permissions || [])];
  errorText.value = "";
  step.value = 2;
}

function repairDraft() {
  draft.triggersText ||= sentence.trigger || draft.requirement;
  if (!/输出|返回|保存|结果/.test(draft.instructions)) {
    draft.instructions += "\n执行完成后返回结果摘要、产出位置和未完成事项。";
  }
  errorText.value = "";
}

async function createSkill() {
  if (!draft.name.trim() || !draft.description.trim() || !draft.instructions.trim()) {
    errorText.value = t("zhifuAgent.skills.draftIncomplete");
    return;
  }
  busy.value = true;
  errorText.value = "";
  try {
    if (!store.workspace) {
      await store.selectWorkspace().catch((cause) => {
        errorText.value = errorMessage(cause);
      });
    }
    if (!store.workspace) return;
    const created = await zhifuCreateSkill({
      scope: "workspace",
      workspace: store.workspace,
      name: draft.name.trim(),
      description: draft.description.trim(),
      triggers: draft.triggersText
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean),
      instructions: draft.instructions.trim(),
      permissions: [...involvedOperations.value],
    });
    createdName.value = created.name;
    createdId.value = created.id;
    await store.loadSkills();
    emit("created");
    skillCreatorFinished = true;
    step.value = 3;
  } catch (cause) {
    errorText.value = errorMessage(cause);
  } finally {
    busy.value = false;
  }
}

function createdSkill(): DisplaySkill {
  return {
    id: createdId.value,
    name: createdName.value,
    description: draft.description,
    scope: "workspace",
    enabled: true,
  };
}

function applyDraft(input: SkillCreatorPrefill) {
  Object.assign(draft, emptyDraft(), input);
  Object.assign(sentence, emptySentence());
  step.value = input.step || 2;
  errorText.value = "";
  skillCreatorFinished = false;
}

function useCreated() {
  const skill = store.skillsByScope("workspace").find((item) => item.id === createdId.value);
  store.pendingSkill = {
    id: skill?.id || createdId.value,
    name: skill?.name || createdName.value,
    scope: "workspace",
  };
  localStorage.removeItem(ZHIFU_STORAGE_KEYS.skillCreatorDraft);
  Object.assign(draft, emptyDraft());
  Object.assign(sentence, emptySentence());
  skillCreatorFinished = false;
  emit("close");
  store.openPage("chat");
}

defineExpose({ applyDraft });
</script>

<style lang="scss" scoped>
.creator-page {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  background: #fff;
}

.creator-top {
  flex: none;
  background: #fff;
}

.creator-scroll {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
  padding-top: 12px;
  &::-webkit-scrollbar {
    display: none;
  }
}

.creator-header {
  display: flex;
  gap: 8px;
  align-items: flex-start;

  h2 {
    margin: 0;
    font-size: 18px;
    font-weight: 650;
    line-height: 1.3;
    color: #262c30;
  }

  p {
    margin: 4px 0 0;
    font-size: 13px;
    color: #8b9499;
  }
}

.back {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  color: #262c30;
  cursor: pointer;
  background: transparent;
  border: 0;
  border-radius: 6px;

  &:hover {
    background: #f3f5f6;
  }
}

.creator-steps {
  display: flex;
  gap: 16px;
  align-items: center;
  justify-content: center;
  padding: 14px 20px;
  margin: 12px 0 0;
  background: #f4f6f8;
  border-radius: 10px;
  border: 1px solid var(--el-border-color-lighter);
  // box-shadow: 0 8px 12px -8px rgb(38 44 48 / 28%);
}

.step {
  display: flex;
  gap: 8px;
  align-items: center;
  font-size: 14px;
  color: #98a2a8;

  span {
    display: grid;
    place-items: center;
    width: 22px;
    height: 22px;
    font-size: 12px;
    color: #98a2a8;
    background: #fff;
    border: 1px solid #d7dee3;
    border-radius: 50%;
  }

  &.active,
  &.done {
    color: #262c30;

    span {
      color: #fff;
      background: #3370ff;
      border-color: #3370ff;
    }
  }
}

.step-line {
  width: 72px;
  border-top: 1px dashed #d5dbe0;
}

.body {
  min-height: 280px;
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

.examples {
  padding: 18px;
  margin-bottom: 14px;
  background: #f4f6f8;
  border-radius: 12px;
}

.examples-heading {
  display: flex;
  gap: 6px;
  align-items: center;
  margin-bottom: 14px;
  font-size: 14px;
  color: #262c30;

  span {
    font-size: 12px;
    color: #8b9499;
  }
}

.examples-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
}

.examples-grid button {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: flex-start;
  min-height: 132px;
  padding: 16px 16px 12px;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e6eaed;
  border-radius: 10px;

  &.selected,
  &:hover {
    border-color: #3370ff;
    box-shadow: 0 0 0 1px #3370ff;
  }

  small {
    display: -webkit-box;
    overflow: hidden;
    font-size: 13px;
    line-height: 1.5;
    color: #8b9499;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .use {
    margin-top: auto;
    font-size: 13px;
    color: #3370ff;
  }
}

.card-title {
  display: flex;
  gap: 8px;
  align-items: center;

  strong {
    font-size: 15px;
    font-weight: 650;
    color: #262c30;
  }

  em {
    font-style: normal;
    font-size: 12px;
    color: #3370ff;
  }
}

.guidance {
  padding: 12px;
  margin-bottom: 14px;
  background: var(--el-fill-color-lighter);
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.sentence {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin: 10px 0;

  label {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: 12px;
  }
}

.guidance {
  ol {
    padding-left: 18px;
    margin: 8px 0;
  }

  small {
    color: var(--el-text-color-secondary);
  }
}

.check {
  margin-bottom: 6px;
  font-size: 13px;
  color: var(--el-color-warning);
}

.created {
  display: flex;
  flex-direction: column;
  gap: 8px;
  align-items: center;
  padding: 48px 16px;
  text-align: center;

  .el-icon {
    color: var(--el-color-success);
  }

  p {
    margin: 0;
    color: var(--el-text-color-secondary);
  }
}

.error {
  position: absolute;
  top: -40px;
  right: 0;
  width: 100%;
}

.footer {
  position: relative;
  z-index: 1;
  display: flex;
  flex: none;
  gap: 8px;
  width: 100%;
  padding-top: 16px;
  background: #fff;
  box-shadow: 0 -8px 20px rgb(38 44 48 / 8%);

  .el-button {
    margin-left: 0;
  }
}

.footer-spacer {
  flex: 1;
}
</style>
