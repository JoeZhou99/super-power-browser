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
      {{ t("superpowerAgent.chat.newMessages", { count: store.newMessagesBelow }) }}
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

    <!-- <div v-if="showSuggestions" class="suggestions">
      <div class="suggestions-title">{{ t("superpowerAgent.chat.suggestionsTitle") }}</div>
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
    </div> -->

    <div
      ref="composerRef"
      class="composer"
      :class="{ 'is-dragging': isDraggingFiles }"
      @mousedown="focusPrompt"
      @dragenter.prevent="handleDragEnter"
      @dragover.prevent="handleDragOver"
      @dragleave.prevent="handleDragLeave"
      @drop.prevent="handleDrop"
    >
      <div v-if="isDraggingFiles" class="drop-overlay" aria-live="polite">
        <div class="drop-overlay-card">
          <el-icon class="drop-overlay-icon"><Upload /></el-icon>
          <strong>{{ t("superpowerAgent.composer.dropTitle") }}</strong>
          <span>{{ t("superpowerAgent.composer.dropHint") }}</span>
        </div>
      </div>
      <ApprovalDialog />
      <template v-if="!hasInlineApproval">
        <div class="input-row">
          <div
            v-if="images.length || shops.length || skills.length || files.length"
            class="selection-row"
          >
            <el-popover
              v-for="item in images"
              :key="item.id"
              :width="240"
              placement="top-start"
              trigger="hover"
              :show-after="120"
              popper-class="composer-image-popover"
            >
              <img class="composer-hover-image" :src="item.preview" :alt="item.name" />
              <template #reference>
                <span
                  class="composer-chip file-chip image-chip"
                  :title="item.name"
                  @click.stop="emit('open-image', item.dataUrl, item.name)"
                >
                  <el-icon aria-hidden="true"><Picture /></el-icon>
                  <span class="chip-label">{{ item.name }}</span>
                  <button
                    type="button"
                    :title="'移除附件 ' + item.name"
                    :aria-label="'移除附件 ' + item.name"
                    @click.stop="removeImage(item.id)"
                  >
                    <el-icon><Close /></el-icon>
                  </button>
                </span>
              </template>
            </el-popover>
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
                :title="t('superpowerAgent.composer.removeShop', { name: item.name })"
                :aria-label="t('superpowerAgent.composer.removeShop', { name: item.name })"
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
                ? t('superpowerAgent.skills.trialRequestPlaceholder')
                : t('superpowerAgent.composer.placeholder')
            "
            @mousedown.stop
            @input="handlePromptInput"
            @paste="handleImagePaste"
            @keydown.backspace="handlePromptBackspace"
            @keydown.enter.exact.prevent="send"
          ></textarea>
        </div>
        <div class="composer-footer" @mousedown.stop>
          <ShopSelect
            ref="shopSelect"
            v-model="shops"
            v-model:visible="shopPickerVisible"
            v-model:auto-close-shops="autoCloseShops"
            :reference-el="composerRef"
            multiple
            show-execution-options
            @select="handleShopSelect"
          />
          <SkillPicker
            ref="skillPicker"
            v-model:visible="skillPickerVisible"
            :reference-el="composerRef"
            @select="handleSkillSelect"
          />
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
            :title="t('superpowerAgent.composer.stop')"
            @click="stopAgent"
          />
          <el-button
            v-else
            class="send-action"
            type="primary"
            circle
            :icon="Promotion"
            :disabled="!canSend(currentPayload)"
            :title="t('superpowerAgent.composer.send')"
            @click="send"
          />
        </div>
      </template>
    </div>
    <div class="status-line">
      <el-icon><Lock /></el-icon>
      {{ t("superpowerAgent.composer.statusLine") }}
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
  Picture,
  Promotion,
  Shop,
  Upload,
  VideoPause,
} from "@element-plus/icons-vue";
import { errorMessage, newId, useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import { superpowerGetPathForFile } from "@/ai/utils/electronApi";
import {
  MAX_ATTACHED_FILES,
  MAX_ATTACHMENT_SIZE,
  MAX_IMAGE_SIZE,
  MAX_PASTED_IMAGES,
} from "../../constants";
import type { DisplaySkill, PendingFile, PendingImage, SelectedSkill } from "../../type";
import { useAgentRun, type SendPromptPayload } from "../composables/useAgentRun";
import ApprovalDialog from "./ApprovalDialog.vue";
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

const store = useSuperPowerAgentStore();
const { t } = useI18n();
const { canSend, sendPrompt, stopAgent } = useAgentRun();

const images = ref<PendingImage[]>([]);
const files = ref<PendingFile[]>([]);
const skills = ref<SelectedSkill[]>([]);
const shops = ref<SelectedShop[]>([]);
const autoCloseShops = ref(false);
const promptInput = ref<HTMLTextAreaElement>();
const composerRef = ref<HTMLElement>();
const shopSelect = ref<InstanceType<typeof ShopSelect>>();
const shopPickerVisible = ref(false);
const shopTriggerRange = ref<{ end: number; start: number } | null>(null);
const skillPicker = ref<InstanceType<typeof SkillPicker>>();
const skillPickerVisible = ref(false);
const skillTriggerRange = ref<{ end: number; start: number } | null>(null);
const dragDepth = ref(0);
const isDraggingFiles = ref(false);
const hasInlineApproval = computed(
  () => Boolean(store.approval && store.approval.conversationId === store.activeId)
);
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
      label: t(`superpowerAgent.chat.suggestion${name}Label`),
      prompt: t(`superpowerAgent.chat.suggestion${name}Prompt`),
    };
  })
);

const focusPrompt = () => nextTick(() => promptInput.value?.focus());

function handlePromptInput(event: Event) {
  const target = event.target as HTMLTextAreaElement | null;
  if (!target) return;
  const cursor = target.selectionStart ?? target.value.length;
  const trigger = target.value[cursor - 1];
  if (trigger !== "@" && trigger !== "/") return;
  const previous = target.value[cursor - 2];
  if (previous && !/\s/.test(previous)) return;
  const range = { start: cursor - 1, end: cursor };
  if (trigger === "@") {
    skillPicker.value?.close();
    skillTriggerRange.value = null;
    shopTriggerRange.value = range;
    shopSelect.value?.open();
  } else {
    shopSelect.value?.close();
    shopTriggerRange.value = null;
    skillTriggerRange.value = range;
    skillPicker.value?.open();
  }
}

function removeTrigger(range: { end: number; start: number } | null, trigger: string) {
  if (!range) return;
  const value = prompt.value;
  if (value.slice(range.start, range.end) === trigger) {
    prompt.value = value.slice(0, range.start) + value.slice(range.end);
  }
  nextTick(() => {
    const input = promptInput.value;
    if (!input) return;
    input.focus();
    input.setSelectionRange(range.start, range.start);
  });
}

function handleShopSelect() {
  removeTrigger(shopTriggerRange.value, "@");
  shopTriggerRange.value = null;
}

function handleSkillSelect(skill: DisplaySkill) {
  addSkill(skill);
  removeTrigger(skillTriggerRange.value, "/");
  skillTriggerRange.value = null;
}

function isFileDrag(event: DragEvent) {
  return (
    Array.from(event.dataTransfer?.types || []).includes("Files") ||
    Boolean(event.dataTransfer?.files?.length)
  );
}

function handleDragEnter(event: DragEvent) {
  if (!isFileDrag(event)) return;
  dragDepth.value += 1;
  isDraggingFiles.value = true;
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
}

function handleDragOver(event: DragEvent) {
  if (!isFileDrag(event)) return;
  isDraggingFiles.value = true;
  if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
}

function handleDragLeave(event: DragEvent) {
  // Chromium may omit `types` when the pointer leaves the window. Once a
  // file drag is active, still let the depth counter clear the highlight.
  if (!isDraggingFiles.value && !isFileDrag(event)) return;
  dragDepth.value = Math.max(0, dragDepth.value - 1);
  if (!dragDepth.value) isDraggingFiles.value = false;
}

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
      reject(reader.error || new Error(t("superpowerAgent.composer.imageReadFailed")));
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
    image.onerror = () => reject(new Error(t("superpowerAgent.composer.previewFailed")));
    image.src = dataUrl;
  });

const isImageFile = (file: File) =>
  file.type.startsWith("image/") || /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)$/i.test(file.name);

function uniqueAttachmentName(name: string, fallback: string) {
  const original = name || fallback;
  const usedNames = new Set(
    [...images.value, ...files.value].map((item) => item.name.toLocaleLowerCase())
  );
  if (!usedNames.has(original.toLocaleLowerCase())) return original;

  const extensionIndex = original.lastIndexOf(".");
  const stem = extensionIndex > 0 ? original.slice(0, extensionIndex) : original;
  const extension = extensionIndex > 0 ? original.slice(extensionIndex) : "";
  let index = 1;
  let candidate = `${stem}-${index}${extension}`;
  while (usedNames.has(candidate.toLocaleLowerCase())) {
    index += 1;
    candidate = `${stem}-${index}${extension}`;
  }
  return candidate;
}

async function handleDrop(event: DragEvent) {
  if (!isFileDrag(event)) return;
  dragDepth.value = 0;
  isDraggingFiles.value = false;
  store.error = "";

  const droppedFiles = Array.from(event.dataTransfer?.files || []);
  for (const file of droppedFiles) {
    if (isImageFile(file)) {
      if (images.value.length >= MAX_PASTED_IMAGES) {
        store.error = t("superpowerAgent.composer.maxImages", { count: MAX_PASTED_IMAGES });
        continue;
      }
      if (file.size > MAX_IMAGE_SIZE) {
        store.error = t("superpowerAgent.composer.imageTooLarge", { name: file.name });
        continue;
      }
      try {
        const dataUrl = await readAsDataUrl(file);
        const preview = await createImagePreview(dataUrl);
        const fallbackName = t("superpowerAgent.composer.clipboardImage");
        images.value.push({
          id: newId(),
          name: uniqueAttachmentName(file.name, fallbackName),
          type: file.type || "image/*",
          dataUrl,
          preview,
        });
      } catch (cause) {
        store.error = errorMessage(cause, t("superpowerAgent.composer.dropFileFailed"));
      }
      continue;
    }

    if (files.value.length >= MAX_ATTACHED_FILES) {
      store.error = t("superpowerAgent.composer.maxFiles", { count: MAX_ATTACHED_FILES });
      continue;
    }
    if (file.size >= MAX_ATTACHMENT_SIZE) {
      store.error = t("superpowerAgent.composer.fileTooLarge", { name: file.name });
      continue;
    }
    const path = superpowerGetPathForFile(file) || String((file as File & { path?: string }).path || "");
    if (!path) {
      store.error = t("superpowerAgent.composer.dropPathFailed", { name: file.name });
      continue;
    }
    const fallbackName = path.split(/[\\/]/).pop() || path;
    files.value.push({
      id: newId(),
      name: uniqueAttachmentName(file.name, fallbackName),
      path,
    });
  }
  focusPrompt();
}

async function handleImagePaste(event: ClipboardEvent) {
  const pasted = Array.from(event.clipboardData?.items || [])
    .filter((item) => item.kind === "file" && item.type.startsWith("image/"))
    .map((item) => item.getAsFile())
    .filter(Boolean) as File[];
  if (!pasted.length) return;
  event.preventDefault();
  store.error = "";
  const clipboardName = t("superpowerAgent.composer.clipboardImage");
  for (const file of pasted) {
    if (images.value.length >= MAX_PASTED_IMAGES) {
      store.error = t("superpowerAgent.composer.maxImages", { count: MAX_PASTED_IMAGES });
      break;
    }
    if (file.size > MAX_IMAGE_SIZE) {
      store.error = t("superpowerAgent.composer.imageTooLarge", { name: file.name || clipboardName });
      continue;
    }
    try {
      const dataUrl = await readAsDataUrl(file);
      const preview = await createImagePreview(dataUrl);
      images.value.push({
        id: newId(),
        name: uniqueAttachmentName(file.name, clipboardName),
        type: file.type,
        dataUrl,
        preview,
      });
    } catch (cause) {
      store.error = errorMessage(cause, t("superpowerAgent.composer.pasteFailed"));
    }
  }
}

function removeImage(id: string) {
  images.value = images.value.filter((item) => item.id !== id);
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
  position: relative;
  width: min(820px, 100%);
  min-height: 100px;
  padding: 0;
  margin: 0 auto;
  overflow: hidden;
  background: #fff;
  border: 1px solid #eceeef;
  border-radius: 12px;
  box-shadow: 0 6px 22px rgb(32 42 48 / 4.5%);

  &:focus-within {
    border-color: #d8dde0;
    box-shadow: 0 8px 26px rgb(32 42 48 / 7%);
  }
}

.composer.is-dragging {
  border-color: #3370ff;
  box-shadow: 0 8px 26px rgb(51 112 255 / 16%);
}

.drop-overlay {
  position: absolute;
  z-index: 5;
  inset: 0;
  display: grid;
  place-items: center;
  padding: 20px;
  pointer-events: none;
  background: rgb(247 250 255 / 94%);
  border: 2px dashed #3370ff;
  border-radius: 11px;
}

.drop-overlay-card {
  display: flex;
  flex-direction: column;
  gap: 5px;
  align-items: center;
  color: #3370ff;
  text-align: center;

  strong {
    font-size: 14px;
    font-weight: 600;
  }

  span {
    font-size: 12px;
    color: #6e88bd;
  }
}

.drop-overlay-icon {
  font-size: 28px;
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
    line-height: 1.25;
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

.image-chip {
  cursor: zoom-in;
  color: #4d6fa6;
  background: #f1f6ff;
  border-color: #d7e3f7;
}

.composer-hover-image {
  display: block;
  width: 228px;
  max-height: 180px;
  object-fit: contain;
  border-radius: 5px;
}

:global(.composer-image-popover.el-popper) {
  min-width: 0;
  padding: 6px;
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
