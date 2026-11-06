<template>
  <footer class="composer-area">
    <el-button
      v-if="store.newMessagesBelow"
      class="new-message-jump"
      round
      size="small"
      :icon="ArrowDown"
      @click="jumpToNewMessages"
    >
      {{ t("zhifuAgent.chat.newMessages", { count: store.newMessagesBelow }) }}
    </el-button>

    <el-alert
      v-if="!store.conversationStorageReady && !store.error"
      class="error-banner"
      type="info"
      title="正在初始化 AI 服务和会话记录，请稍候…"
      :closable="false"
      show-icon
    />

    <el-alert
      v-if="store.error"
      class="error-banner"
      type="error"
      :title="store.error"
      show-icon
      @close="store.error = ''"
    />

    <div v-if="showSuggestions" class="suggestions">
      <div class="suggestions-title">{{ t("zhifuAgent.chat.suggestionsTitle") }}</div>
      <button
        v-for="item in suggestions"
        :key="item.key"
        type="button"
        class="suggestion-item"
        @click="applySuggestion(item.prompt)"
      >
        <el-icon class="suggestion-icon"><Paperclip /></el-icon>
        <span class="suggestion-label">{{ item.label }}</span>
        <span class="suggestion-desc">{{ item.prompt }}</span>
      </button>
    </div>

    <div class="composer" @mousedown="focusPrompt">
      <div v-if="images.length" class="composer-images">
        <div v-for="item in images" :key="item.id" class="composer-image">
          <img
            :src="item.preview"
            :alt="item.name"
            @click.stop="emit('open-image', item.dataUrl, item.name)"
          />
          <el-icon class="remove" @click.stop="removeImage(item.id)"><Close /></el-icon>
        </div>
      </div>
      <div class="input-row">
        <div v-if="shops.length || skills.length || files.length" class="selection-row">
          <span
            v-for="item in shops"
            :key="item.id"
            class="composer-chip selected-shop-chip"
            :title="item.name"
          >
            <el-icon aria-hidden="true"><Shop /></el-icon>
            <span class="chip-label">{{ item.name }}</span>
            <button
              type="button"
              :title="t('zhifuAgent.composer.removeShop', { name: item.name })"
              :aria-label="t('zhifuAgent.composer.removeShop', { name: item.name })"
              @click.stop="removeShop(item.id)"
            >
              <el-icon><Close /></el-icon>
            </button>
          </span>
          <span
            v-for="skill in skills"
            :key="skill.name"
            class="composer-chip skill-chip"
            :title="skill.name"
          >
            <el-icon aria-hidden="true"><MagicStick /></el-icon>
            <span class="chip-label">{{ skill.name }}</span>
            <button
              type="button"
              :title="'移除技能 ' + skill.name"
              :aria-label="'移除技能 ' + skill.name"
              @click.stop="removeSkill(skill.name)"
            >
              <el-icon><Close /></el-icon>
            </button>
          </span>
          <span
            v-for="file in files"
            :key="file.id"
            class="composer-chip file-chip"
            :title="file.path || file.name"
          >
            <el-icon aria-hidden="true"><Paperclip /></el-icon>
            <span class="chip-label">{{ file.name }}</span>
            <button
              type="button"
              :title="'移除附件 ' + file.name"
              :aria-label="'移除附件 ' + file.name"
              @click.stop="removeFile(file.id)"
            >
              <el-icon><Close /></el-icon>
            </button>
          </span>
        </div>
        <textarea
          ref="promptInput"
          v-model="prompt"
          rows="1"
          :placeholder="
            skills.length
              ? t('zhifuAgent.skills.trialRequestPlaceholder')
              : t('zhifuAgent.composer.placeholder')
          "
          @mousedown.stop
          @paste="handleImagePaste"
          @keydown.backspace="handlePromptBackspace"
          @keydown.enter.exact.prevent="send"
        ></textarea>
      </div>

      <div class="composer-footer" @mousedown.stop>
        <ShopSelect
          v-model="shops"
          v-model:auto-close-shops="autoCloseShops"
          show-execution-options
        />
        <SkillPicker @select="addSkill" />
        <el-button size="small" text :icon="Paperclip" @click="selectFiles">
          {{ t("zhifuAgent.composer.attachment") }}
        </el-button>
        <PermissionModeSelect />

        <!-- <WorkspaceSelect @select="emit('select-workspace')" /> -->
        <div class="model-switch">
          <QuickModelSwitch />
        </div>

        <el-button
          v-if="store.running"
          :disabled="store.conversationRuns[store.activeId]?.stopping"
          class="send-action"
          type="danger"
          circle
          :icon="VideoPause"
          :title="t('zhifuAgent.composer.stop')"
          @click="stopAgent"
        />
        <el-button
          v-else
          class="send-action"
          type="primary"
          circle
          :icon="Promotion"
          :disabled="!canSend(currentPayload)"
          :title="t('zhifuAgent.composer.send')"
          @click="send"
        />
      </div>
    </div>
    <div class="status-line">
      <el-icon><Lock /></el-icon>
      {{ t("zhifuAgent.composer.statusLine") }}
    </div>
  </footer>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  Close,
  Lock,
  MagicStick,
  Paperclip,
  Promotion,
  Shop,
  VideoPause,
} from "@element-plus/icons-vue";
import { errorMessage, newId, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuSelectFiles } from "@/ai/utils/electronApi";
import {
  MAX_ATTACHED_FILES,
  MAX_ATTACHMENT_SIZE,
  MAX_IMAGE_SIZE,
  MAX_PASTED_IMAGES,
} from "../../constants";
import type { DisplaySkill, PendingFile, PendingImage, SelectedSkill } from "../../type";
import { useAgentRun, type SendPromptPayload } from "../composables/useAgentRun";
import PermissionModeSelect from "./PermissionModeSelect.vue";
import QuickModelSwitch from "./QuickModelSwitch.vue";
import ShopSelect, { type SelectedShop } from "./ShopSelect.vue";
import SkillPicker from "./SkillPicker.vue";
// import WorkspaceSelect from "./WorkspaceSelect.vue";

const prompt = defineModel<string>({ default: "" });
const emit = defineEmits<{
  "open-image": [src: string, name: string];
  "select-workspace": [];
}>();

const store = useZhifuAgentStore();
const { t } = useI18n();
const { canSend, sendPrompt, stopAgent } = useAgentRun();

const images = ref<PendingImage[]>([]);
const files = ref<PendingFile[]>([]);
const skills = ref<SelectedSkill[]>([]);
const shops = ref<SelectedShop[]>([]);
const autoCloseShops = ref(false);
const promptInput = ref<HTMLTextAreaElement>();

const currentPayload = computed<SendPromptPayload>(() => ({
  text: prompt.value,
  images: images.value,
  files: files.value,
  skills: skills.value,
  shops: shops.value,
  autoCloseShops: autoCloseShops.value,
}));

const suggestionKeys = ["health", "withdraw", "automation", "feishu"] as const;
const showSuggestions = computed(() => !store.activeConversation.messages.length);
const suggestions = computed(() =>
  suggestionKeys.map((key) => {
    const name = `${key[0].toUpperCase()}${key.slice(1)}`;
    return {
      key,
      label: t(`zhifuAgent.chat.suggestion${name}Label`),
      prompt: t(`zhifuAgent.chat.suggestion${name}Prompt`),
    };
  })
);

const focusPrompt = () => nextTick(() => promptInput.value?.focus());

function applySuggestion(text: string) {
  prompt.value = text;
  focusPrompt();
}

async function send() {
  const started = await sendPrompt({
    text: prompt.value,
    images: [...images.value],
    files: [...files.value],
    skills: [...skills.value],
    shops: [...shops.value],
    autoCloseShops: autoCloseShops.value,
  });
  if (!started) return;
  prompt.value = "";
  images.value = [];
  files.value = [];
  skills.value = [];
  shops.value = [];
}

function removeShop(id: SelectedShop["id"]) {
  shops.value = shops.value.filter((item) => item.id !== id);
  focusPrompt();
}

function handlePromptBackspace(event: KeyboardEvent) {
  const target = event.currentTarget as HTMLTextAreaElement;
  if (
    event.isComposing ||
    event.keyCode === 229 ||
    event.ctrlKey ||
    event.metaKey ||
    event.altKey ||
    event.shiftKey ||
    target.value !== ""
  ) {
    return;
  }
  const skill = skills.value.at(-1);
  const shop = shops.value.at(-1);
  if (!skill && !shop) return;
  event.preventDefault();
  if (skill) removeSkill(skill.name);
  else if (shop) removeShop(shop.id);
}

function jumpToNewMessages() {
  store.markActiveConversationRead();
  store.scrollToBottom();
}

watch(
  () => store.pendingSkill,
  (skill) => {
    if (!skill) return;
    addSkill(skill);
    store.pendingSkill = null;
    focusPrompt();
  },
  { immediate: true }
);

watch(
  () => store.pendingPrompt,
  (text) => {
    if (!text) return;
    prompt.value = text;
    store.pendingPrompt = "";
    focusPrompt();
  },
  { immediate: true }
);

watch(
  () => store.pendingSend,
  async (request) => {
    if (!request) return;
    const next = request;
    store.pendingSend = null;
    prompt.value = next.text;
    skills.value = next.skills.map((skill) => ({ ...skill }));
    shops.value = next.shops.map((shop) => ({ ...shop }));
    images.value = [];
    files.value = [];
    if (!next.autoSend) {
      focusPrompt();
      return;
    }
    await nextTick();
    await send();
  },
  { immediate: true }
);

function addSkill(skill: Pick<DisplaySkill, "id" | "name" | "scope">) {
  if (!skills.value.some((item) => item.name === skill.name)) {
    skills.value.push({ id: skill.id, name: skill.name, scope: skill.scope });
  }
  focusPrompt();
}

function removeSkill(name: string) {
  skills.value = skills.value.filter((skill) => skill.name !== name);
  focusPrompt();
}

const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () =>
      reject(reader.error || new Error(t("zhifuAgent.composer.imageReadFailed")));
    reader.readAsDataURL(file);
  });

/** 生成最长边 420px 的 webp 缩略图，用于消息内展示和持久化 */
const createImagePreview = (dataUrl: string) =>
  new Promise<string>((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const maxEdge = 420;
      const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/webp", 0.78));
    };
    image.onerror = () => reject(new Error(t("zhifuAgent.composer.previewFailed")));
    image.src = dataUrl;
  });

async function handleImagePaste(event: ClipboardEvent) {
  const pasted = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean) as File[];
  if (!pasted.length) return;
  event.preventDefault();
  store.error = "";
  const clipboardName = t("zhifuAgent.composer.clipboardImage");
  for (const file of pasted) {
    if (images.value.length >= MAX_PASTED_IMAGES) {
      store.error = t("zhifuAgent.composer.maxImages", { count: MAX_PASTED_IMAGES });
      break;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      store.error = t("zhifuAgent.composer.imageTooLarge", { name: file.name || clipboardName });
      continue;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const preview = await createImagePreview(dataUrl);
      images.value.push({
        id: newId(),
        name: file.name || clipboardName,
        type: file.type,
        dataUrl,
        preview,
      });
    } catch (cause) {
      store.error = errorMessage(cause, t("zhifuAgent.composer.pasteFailed"));
    }
  }
}

function removeImage(id: string) {
  images.value = images.value.filter((item) => item.id !== id);
}

async function selectFiles() {
  try {
    store.error = "";
    const selected = await zhifuSelectFiles();
    const knownPaths = new Set(files.value.map((item) => item.path.toLowerCase()));
    for (const file of selected || []) {
      if (files.value.length >= MAX_ATTACHED_FILES) {
        store.error = t("zhifuAgent.composer.maxFiles", { count: MAX_ATTACHED_FILES });
        break;
      }
      if (typeof file.size === "number" && file.size >= MAX_ATTACHMENT_SIZE) {
        store.error = t("zhifuAgent.composer.fileTooLarge", { name: file.name });
        continue;
      }
      if (!knownPaths.has(file.path.toLowerCase())) {
        files.value.push({ ...file, id: newId() });
        knownPaths.add(file.path.toLowerCase());
      }
    }
  } catch (cause) {
    store.error = errorMessage(cause, t("zhifuAgent.composer.selectFileFailed"));
  }
}

function removeFile(id: string) {
  files.value = files.value.filter((item) => item.id !== id);
}

watch(prompt, () => {
  nextTick(() => {
    const el = promptInput.value;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  });
});

defineExpose({ focus: focusPrompt });
</script>

<style lang="scss" scoped>
.composer-area {
  position: relative;
  flex: 0 0 auto;
  width: 100%;
  max-width: 860px;
  padding: 0 24px 12px;
  margin: 0 auto;
}

.new-message-jump {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
}

.error-banner {
  margin-bottom: 8px;
}

.suggestions {
  display: flex;
  flex-direction: column;
  gap: 10px;
  width: min(820px, 100%);
  margin: 0 auto 12px;
  text-align: left;
}

.suggestions-title {
  margin-bottom: 2px;
  font-size: 13px;
  line-height: 1;
  color: #9aa3a8;
}

.suggestion-item {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  align-self: flex-start;
  width: fit-content;
  max-width: 100%;
  min-height: 42px;
  padding: 8px 14px;
  font: inherit;
  color: inherit;
  text-align: left;
  cursor: pointer;
  background: #fff;
  border: 1px solid #e6eaed;
  border-radius: 8px;

  &:hover {
    background: #f7f9fb;
    border-color: #d5dce2;
  }
}

.suggestion-icon {
  flex: none;
  font-size: 16px;
  color: #3370ff;
}

.suggestion-label {
  flex: none;
  font-size: 14px;
  font-weight: 500;
  color: #3370ff;
}

.suggestion-desc {
  font-size: 14px;
  color: #8b9499;
  white-space: nowrap;
}

.composer {
  width: min(820px, 100%);
  min-height: 100px;
  padding: 0;
  margin: 0 auto;
  background: #fff;
  border: 1px solid #eceeef;
  border-radius: 12px;
  box-shadow: 0 6px 22px rgb(32 42 48 / 4.5%);

  &:focus-within {
    border-color: #d8dde0;
    box-shadow: 0 8px 26px rgb(32 42 48 / 7%);
  }
}

.composer-images {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 12px 14px 0;
}

.composer-image {
  position: relative;

  img {
    width: 64px;
    height: 64px;
    cursor: zoom-in;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    object-fit: cover;
  }

  .remove {
    position: absolute;
    top: -6px;
    right: -6px;
    padding: 2px;
    font-size: 12px;
    color: #fff;
    cursor: pointer;
    background: rgb(0 0 0 / 55%);
    border-radius: 50%;
  }
}

.composer-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 11px 14px 0;
}

.file-path-hint {
  flex: 1 1 100%;
  margin: 0;
  font-size: 12px;
  line-height: 1.5;
  color: var(--el-color-warning);
}

.input-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: flex-start;
  min-height: 52px;
  padding: 11px 14px 4px;

  textarea {
    flex: 1 1 100%;
    width: 100%;
    min-width: 180px;
    max-height: 170px;
    padding: 4px 0 3px;
    overflow: hidden auto;
    font: inherit;
    font-size: 13px;
    line-height: 1.5;
    color: #30373a;
    field-sizing: content;
    resize: none;
    outline: none;
    background: transparent;
    border: 0;

    &::placeholder {
      color: #a2a9ad;
    }
  }
}

.selection-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
  width: 100%;
}

.composer-chip {
  display: inline-flex;
  box-sizing: border-box;
  flex: 0 1 auto;
  align-items: center;
  gap: 5px;
  max-width: min(260px, 100%);
  min-width: 0;
  height: 28px;
  padding: 0 5px 0 8px;
  font-size: 12px;
  font-weight: 500;
  line-height: 1;
  color: #697277;
  background: #f4f5f7;
  border: 1px solid #e1e4e8;
  border-radius: 5px;

  > .el-icon {
    flex: 0 0 13px;
    font-size: 13px;
  }
  .chip-label {
    min-width: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  button {
    display: grid;
    flex: 0 0 18px;
    place-items: center;
    width: 18px;
    height: 18px;
    padding: 0;
    font-size: 12px;
    color: inherit;
    cursor: pointer;
    background: transparent;
    border: 0;
    border-radius: 3px;
    &:hover {
      background: rgb(0 0 0 / 7%);
    }
    &:focus-visible {
      outline: 2px solid currentColor;
      outline-offset: 1px;
    }
  }
}
.selected-shop-chip {
  color: #276949;
  background: #eaf6ef;
  border-color: #bcdcca;
}
.skill-chip {
  color: #2868d7;
  background: #edf4ff;
  border-color: #cbdcfb;
}

.composer-footer {
  display: flex;
  gap: 8px;
  align-items: center;
  height: 38px;
  padding: 0 9px 7px 14px;
  margin-top: 0;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
  .model-switch {
    margin-left: auto;
  }
  .send-action {
    margin-right: 6px;
  }

  :deep(.el-button.is-text) {
    height: 28px;
    padding: 0 9px;
    font-size: 12px;
    color: #697277;
    background: #f5f6f6;
    border: 1px solid #e1e4e5;
    border-radius: 7px;

    &:hover,
    &.active {
      color: var(--el-text-color-primary);
      background: #ecefef;
      border-color: #d6dbdd;
    }
  }
}

.status-line {
  display: flex;
  gap: 5px;
  align-items: center;
  justify-content: center;
  height: 22px;
  margin-top: 0;
  font-size: 11px;
  color: #8d8f88;
}
</style>
