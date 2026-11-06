<template>
  <div class="uploaded-skills" :class="{ 'has-create-tip': showCreateTip }">
    <div ref="listRef" v-loading="loading" class="store-list" @scroll="onListScroll">
      <el-empty
        v-if="!loading && !skills.length"
        :description="t('zhifuAgent.skills.uploadedEmpty')"
      />
      <div v-for="skill in skills" :key="skill.id" class="store-item">
        <div class="skill-icon">
          <el-icon><Box /></el-icon>
        </div>
        <div class="skill-copy">
          <div class="skill-name">
            <strong>{{ skill.name }}</strong>
            <el-tag v-if="skill.category_name" size="small">{{ skill.category_name }}</el-tag>
            <el-tag v-if="skill.sub_category_name" size="small">
              {{ skill.sub_category_name }}
            </el-tag>
            <span class="visibility-hint">{{ visibilityLabel(skill.scope) }}</span>
          </div>
          <p :title="skill.explain">{{ skill.explain }}</p>
          <small class="review-line">
            <span>
              {{
                t("zhifuAgent.skills.version", {
                  version: skill.version?.trim() || "v1.0.0",
                })
              }}
            </span>
            <span :class="reviewClass(skill.review_status)">
              {{ reviewLabel(skill.review_status) }}
            </span>
            <span
              v-if="Number(skill.review_status) === 2 && skill.review_reason"
              class="review-reason"
              :title="skill.review_reason"
            >
              {{ t("zhifuAgent.skills.reviewReason", { reason: skill.review_reason }) }}
            </span>
          </small>
        </div>
        <div class="skill-actions">
          <el-button
            v-if="!isReviewLocked(skill)"
            type="primary"
            size="small"
            plain
            :icon="Share"
            :loading="sharingId === skill.id"
            @click="openShare(skill)"
          >
            {{ t("zhifuAgent.skills.share") }}
          </el-button>
          <el-button
            v-if="canReupload(skill)"
            type="primary"
            size="small"
            plain
            @click="openReupload(skill)"
          >
            {{ t("zhifuAgent.skills.reupload") }}
          </el-button>
          <el-button
            v-if="!isInstalled(skill) && !isReviewLocked(skill)"
            type="primary"
            size="small"
            plain
            :icon="Download"
            :loading="installingId === skill.id"
            @click="install(skill)"
          >
            {{
              installingId === skill.id
                ? t("zhifuAgent.skills.installing")
                : t("zhifuAgent.skills.install")
            }}
          </el-button>
          <template v-else-if="isInstalled(skill)">
            <el-button
              v-if="needsUpdate(skill) && !isReviewLocked(skill)"
              type="primary"
              size="small"
              :icon="Download"
              plain
              :loading="updatingSkillId === skill.id"
              @click="updateInstalled(skill)"
            >
              {{
                updatingSkillId === skill.id
                  ? t("zhifuAgent.skills.updating")
                  : t("zhifuAgent.skills.update")
              }}
            </el-button>
            <el-button
              type="primary"
              size="small"
              @click="useInstalledSkillInChat(store, skill.name)"
            >
              {{ t("zhifuAgent.skills.goUse") }}
            </el-button>
          </template>
          <el-dropdown
            trigger="click"
            popper-class="skill-more-menu"
            @command="(command: string) => handleMoreCommand(command, skill)"
          >
            <el-button
              class="skill-more-button"
              type="text"
              :icon="More"
              :loading="deletingId === skill.id || revokingId === skill.id"
            />
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item
                  v-if="skill.share_id"
                  :icon="TurnOff"
                  command="revoke"
                  :disabled="revokingId === skill.id"
                >
                  {{ t("zhifuAgent.skills.cancelShare") }}
                </el-dropdown-item>
                <el-dropdown-item
                  :icon="Delete"
                  command="delete"
                  class="danger-item"
                  :disabled="deletingId === skill.id"
                >
                  {{ t("zhifuAgent.common.delete") }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>
      <p v-if="loadingMore" class="list-more">{{ t("zhifuAgent.composer.shopLoading") }}</p>
    </div>

    <el-dialog
      v-model="uploadVisible"
      class="upload-dialog"
      :title="reuploadId ? t('zhifuAgent.skills.reupload') : t('zhifuAgent.skills.uploadSkill')"
      width="560px"
      top="5vh"
      append-to-body
      @closed="resetUpload"
    >
      <el-upload
        class="upload-drop"
        drag
        accept=".zip,application/zip"
        :auto-upload="false"
        :show-file-list="false"
        :on-change="onUploadFileChange"
      >
        <p class="upload-drop-title">
          <el-icon :size="16"><Upload /></el-icon>
          {{ t("zhifuAgent.skills.uploadDropHint") }}
        </p>
        <p class="upload-drop-tip">{{ t("zhifuAgent.skills.uploadDropTypes") }}</p>
        <span class="choose-file">
          <el-icon><Folder /></el-icon>
          {{ uploadFile?.name || t("zhifuAgent.skills.chooseFile") }}
        </span>
      </el-upload>
      <el-form v-loading="uploadPreviewing" class="upload-form" label-position="top">
        <el-form-item :label="t('zhifuAgent.skills.skillName')">
          <el-input
            :model-value="uploadSkillName"
            disabled
            :placeholder="t('zhifuAgent.skills.uploadSkillNameEmpty')"
          />
        </el-form-item>
        <el-form-item :label="t('zhifuAgent.skills.skillDescription')">
          <el-input
            :model-value="uploadSkillDescription"
            type="textarea"
            :rows="3"
            resize="none"
            disabled
            :placeholder="t('zhifuAgent.skills.uploadSkillDescEmpty')"
          />
        </el-form-item>
        <el-form-item :label="t('zhifuAgent.skills.uploadVersion')">
          <el-input :model-value="uploadVersion" disabled :placeholder="DEFAULT_SKILL_VERSION" />
        </el-form-item>
        <el-form-item :label="t('zhifuAgent.skills.sceneCategory')">
          <el-select
            v-model="uploadCategoryId"
            class="upload-category"
            :placeholder="t('zhifuAgent.skills.selectCategory')"
          >
            <el-option
              v-for="item in categories"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item :label="t('zhifuAgent.skills.platformApplicable')">
          <el-select
            v-model="uploadSubCategoryId"
            class="upload-category"
            clearable
            :placeholder="t('zhifuAgent.skills.selectPlatform')"
          >
            <el-option
              v-for="item in platforms"
              :key="item.id"
              :label="item.name"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item
          v-if="!reuploadId"
          :label="t('zhifuAgent.skills.viewRange')"
          style="margin-bottom: 0"
        >
          <el-radio-group v-model="uploadScope" class="scope-group">
            <el-radio :value="2">
              <span class="scope-title">{{ t("zhifuAgent.skills.scopePrivateTitle") }}</span>
              <span class="scope-desc">{{ t("zhifuAgent.skills.scopePrivateDesc") }}</span>
            </el-radio>
            <el-radio :value="1">
              <span class="scope-title">{{ t("zhifuAgent.skills.scopePublicTitle") }}</span>
              <span class="scope-desc">{{ t("zhifuAgent.skills.scopePublicDesc") }}</span>
            </el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="uploadVisible = false">{{ t("zhifuAgent.common.cancel") }}</el-button>
        <el-button type="primary" :loading="uploading" @click="submitUpload">
          {{
            uploadScope === 1
              ? t("zhifuAgent.skills.submitReview")
              : t("zhifuAgent.skills.confirmUpload")
          }}
        </el-button>
      </template>
    </el-dialog>
    <SkillShareDialog ref="shareDialogRef" />
  </div>
</template>

<script setup lang="ts">
import {
  Box,
  TurnOff,
  Delete,
  Download,
  Folder,
  More,
  Share,
  Upload,
} from "@element-plus/icons-vue";
import type { UploadFile } from "element-plus";
import { useDebounceFn } from "@vueuse/core";
import {
  deleteSkillStore,
  getUploadedSkillStoreList,
  resubmitSkillStore,
  revokeSkillShare,
  unbindSkillStore,
  uploadSkillStore,
  type SkillStoreClassifyItem,
  type SkillStoreItem,
  type SkillStoreListParams,
} from "@/ai/api/zhifuAgent";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuGetPathForFile, zhifuPreviewSkillFile } from "@/ai/utils/electronApi";
import SkillShareDialog from "./SkillShareDialog.vue";
import {
  fileToBase64,
  findInstalledSkill,
  installListedSkill,
  loadSkillClassifyOptions,
  openSkillShare,
  pickList,
  readSkillPage,
  skillPackageUrl,
  skillNeedsUpdate,
  useInstalledSkillInChat,
} from "../skillListShared";

const emit = defineEmits<{ error: [message: string] }>();
const props = defineProps<{ showCreateTip?: boolean; reviewStatus?: number }>();

const store = useZhifuAgentStore();
const { t } = useI18n();
const keyword = defineModel("keyword", { default: "" });

const categories = ref<SkillStoreClassifyItem[]>([]);
const platforms = ref<SkillStoreClassifyItem[]>([]);
const skills = ref<SkillStoreItem[]>([]);
const loading = ref(false);
const loadingMore = ref(false);
const uploading = ref(false);
const uploadVisible = ref(false);
const uploadCategoryId = ref<number>();
const uploadSubCategoryId = ref<number>();
const uploadScope = ref<1 | 2>(2);
const uploadFile = ref<File | null>(null);
const uploadSkillName = ref("");
const uploadSkillDescription = ref("");
/** 上传技能的版本号。优先读技能包 _meta.json，没有则用默认值 */
const DEFAULT_SKILL_VERSION = "1.0.0";
const uploadVersion = ref(DEFAULT_SKILL_VERSION);
const uploadPreviewing = ref(false);
const reuploadId = ref<number | null>(null);
const installingId = ref<number | null>(null);
const updatingSkillId = ref<number | null>(null);
const deletingId = ref<number | null>(null);
const revokingId = ref<number | null>(null);
const sharingId = ref<number | null>(null);
const shareDialogRef = ref<InstanceType<typeof SkillShareDialog>>();
const listRef = ref<HTMLElement>();
const page = ref(1);
const hasMore = ref(false);
const PAGE_SIZE = 20;

function listQuery(pageNo = 1): SkillStoreListParams {
  const text = keyword.value.trim();
  return {
    page: pageNo,
    limit: PAGE_SIZE,
    keyword: text || undefined,
    review_status: props.reviewStatus || undefined,
  };
}

function findInstalled(skill: SkillStoreItem) {
  return findInstalledSkill(store.localSkills, skill.name);
}

const isInstalled = (skill: SkillStoreItem) => Boolean(store.workspace && findInstalled(skill));

/** 上传列表里的版本高于本地已安装版本时，才显示更新 */
const needsUpdate = (skill: SkillStoreItem) =>
  skillNeedsUpdate(skill.version, findInstalled(skill)?.version);

function visibilityLabel(scope: number | undefined) {
  return Number(scope) === 1
    ? t("zhifuAgent.skills.storeVisible")
    : t("zhifuAgent.skills.scopePrivate");
}

function reviewClass(status: number | undefined) {
  if (status === 1) return "is-passed";
  if (status === 2) return "is-rejected";
  if (status === 3) return "is-pending";
  return "";
}

function reviewLabel(status: number | undefined) {
  if (status === 1) return t("zhifuAgent.skills.reviewPassed");
  if (status === 2) return t("zhifuAgent.skills.reviewRejected");
  if (status === 3) return t("zhifuAgent.skills.reviewPending");
  return "";
}

function isReviewLocked(skill: SkillStoreItem) {
  const status = Number(skill.review_status);
  return status === 2 || status === 3;
}

function canReupload(skill: SkillStoreItem) {
  return Number(skill.review_status) === 2;
}

let loadSeq = 0;

async function load() {
  const seq = ++loadSeq;
  loading.value = true;
  loadingMore.value = false;
  try {
    const { list, hasNext } = readSkillPage(await getUploadedSkillStoreList(listQuery(1)), 1);
    if (seq !== loadSeq) return;
    page.value = 1;
    skills.value = list;
    hasMore.value = hasNext;
    await nextTick();
    if (listRef.value) listRef.value.scrollTop = 0;
    void fillList(seq);
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    if (seq === loadSeq) loading.value = false;
  }
}

function onListScroll(event: Event) {
  const el = event.target as HTMLElement;
  if (loading.value || loadingMore.value || !hasMore.value) return;
  if (el.scrollHeight - el.scrollTop - el.clientHeight <= 80) void loadMore();
}

async function loadMore() {
  if (!hasMore.value || loading.value || loadingMore.value) return;
  const seq = loadSeq;
  const nextPage = page.value + 1;
  loadingMore.value = true;
  try {
    const { list, hasNext } = readSkillPage(
      await getUploadedSkillStoreList(listQuery(nextPage)),
      nextPage
    );
    if (seq !== loadSeq) return;
    const seen = new Set(skills.value.map((item) => Number(item.id)));
    const appended = list.filter((item) => !seen.has(Number(item.id)));
    if (!appended.length) {
      hasMore.value = false;
      return;
    }
    page.value = nextPage;
    skills.value = skills.value.concat(appended);
    hasMore.value = hasNext;
    void fillList(seq);
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    if (seq === loadSeq) loadingMore.value = false;
  }
}

async function fillList(seq: number) {
  await nextTick();
  const el = listRef.value;
  if (!el || seq !== loadSeq || !hasMore.value || loading.value || loadingMore.value) return;
  if (el.scrollHeight <= el.clientHeight + 8) await loadMore();
}

watch(
  keyword,
  useDebounceFn(() => load(), 400)
);

watch(
  () => props.reviewStatus,
  () => load()
);

async function openUpload() {
  resetUpload();
  uploadVisible.value = true;
  void ensureCategories();
}

function openReupload(skill: SkillStoreItem) {
  resetUpload();
  reuploadId.value = skill.id;
  uploadCategoryId.value = skill.category_id || undefined;
  uploadSubCategoryId.value = skill.sub_category_id || undefined;
  uploadScope.value = skill.review_status > 0 ? 1 : 2;
  uploadSkillName.value = skill.name || "";
  uploadSkillDescription.value = skill.explain || "";
  uploadVersion.value = skill.version?.trim() || DEFAULT_SKILL_VERSION;
  uploadVisible.value = true;
  void ensureCategories();
}

function openShare(skill: SkillStoreItem) {
  return openSkillShare(shareDialogRef.value, skill, sharingId).then(() => load());
}

function handleMoreCommand(command: string, skill: SkillStoreItem) {
  if (command === "revoke") void revokeShare(skill);
  if (command === "delete") void deleteSkill(skill);
}

function resetUpload() {
  uploadCategoryId.value = undefined;
  uploadSubCategoryId.value = undefined;
  uploadScope.value = 2;
  uploadFile.value = null;
  uploadSkillName.value = "";
  uploadSkillDescription.value = "";
  uploadVersion.value = DEFAULT_SKILL_VERSION;
  uploadPreviewing.value = false;
  reuploadId.value = null;
}

async function onUploadFileChange(file: UploadFile) {
  const raw = file.raw;
  if (!raw) return;
  const filename = raw.name.toLocaleLowerCase();
  if (!filename.endsWith(".zip") && !filename.endsWith(".md")) {
    ElMessage.error(t("zhifuAgent.skills.uploadFileInvalid"));
    return;
  }
  if (raw.size > 20 * 1024 * 1024) {
    ElMessage.error(t("zhifuAgent.skills.zipTooLarge"));
    return;
  }
  const filePath = zhifuGetPathForFile(raw) || (raw as File & { path?: string }).path || "";
  uploadPreviewing.value = true;
  try {
    const preview = filePath
      ? await zhifuPreviewSkillFile({ filePath })
      : await zhifuPreviewSkillFile({
          filename: raw.name,
          contentBase64: await fileToBase64(raw),
        });
    uploadFile.value = raw;
    uploadSkillName.value = preview?.name || "";
    uploadSkillDescription.value = preview?.description || "";
    uploadVersion.value = (await readPackageVersion(raw)) || DEFAULT_SKILL_VERSION;
  } catch (cause) {
    uploadFile.value = null;
    uploadSkillName.value = "";
    uploadSkillDescription.value = "";
    uploadVersion.value = DEFAULT_SKILL_VERSION;
    ElMessage.error(errorMessage(cause, t("zhifuAgent.skills.uploadPreviewFailed")));
  } finally {
    uploadPreviewing.value = false;
  }
}

/** 从技能包里的 _meta.json 读取 version。包内有多份时用最外层那份 */
async function readPackageVersion(file: File) {
  if (!file.name.toLocaleLowerCase().endsWith(".zip")) return "";
  try {
    const JSZip = (await import("jszip")).default;
    const zip = await JSZip.loadAsync(await file.arrayBuffer());
    const entry = Object.values(zip.files)
      .filter((item) => !item.dir && /(?:^|[/\\])_meta\.json$/i.test(item.name))
      .sort((left, right) => left.name.split(/[/\\]/).length - right.name.split(/[/\\]/).length)[0];
    if (!entry) return "";
    const meta = JSON.parse(await entry.async("string"));
    const version = meta?.version;
    return typeof version === "string" || typeof version === "number" ? String(version).trim() : "";
  } catch {
    return "";
  }
}

async function submitUpload() {
  if (!uploadFile.value) {
    ElMessage.warning(t("zhifuAgent.skills.chooseFile"));
    return;
  }
  uploading.value = true;
  const updatingId = reuploadId.value;
  try {
    const data = new FormData();
    data.append("file", uploadFile.value);
    data.append("version", uploadVersion.value.trim() || DEFAULT_SKILL_VERSION);
    data.append("category_id", String(uploadCategoryId.value || 0));
    data.append("sub_category_id", String(uploadSubCategoryId.value || 0));
    data.append("scope", String(uploadScope.value));
    if (updatingId) {
      data.append("skill_store_id", String(updatingId));
      await resubmitSkillStore(data);
    } else {
      const result: any = await uploadSkillStore(data);
      const skillId = Number(result?.data?.id ?? result?.data?.skill_store_id);
      if (skillId > 0) await unbindSkillStore(skillId);
    }
    uploadVisible.value = false;
    await load();
    ElMessage.success(
      updatingId ? t("zhifuAgent.skills.reuploadSuccess") : t("zhifuAgent.skills.uploadSuccess")
    );
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    uploading.value = false;
  }
}

async function freshPackageUrl(skill: SkillStoreItem) {
  const res = await getUploadedSkillStoreList({ page: 1, limit: 20, keyword: skill.name });
  return skillPackageUrl(
    pickList<SkillStoreItem>(res).find((item) => Number(item.id) === Number(skill.id))
  );
}

async function install(skill: SkillStoreItem) {
  installingId.value = skill.id;
  try {
    const installed = await installListedSkill({
      skill,
      getWorkspace: () => store.workspace,
      selectWorkspace: () => store.selectWorkspace(),
      onSelectError: (cause) => emit("error", errorMessage(cause)),
      freshPackageUrl,
      loadSkills: () => store.loadSkills(),
      reload: () => load(),
      onError: (message) => emit("error", message),
      missingUrlMessage: t("zhifuAgent.skills.missingPackageUrl"),
    });
    if (installed) ElMessage.success(t("zhifuAgent.skills.installedToWorkspace"));
  } catch (cause) {
    emit("error", errorMessage(cause));
  } finally {
    installingId.value = null;
  }
}

/** 用新上传的版本覆盖当前工作区已安装的技能 */
async function updateInstalled(skill: SkillStoreItem) {
  updatingSkillId.value = skill.id;
  try {
    const updated = await installListedSkill({
      skill,
      replace: true,
      getWorkspace: () => store.workspace,
      selectWorkspace: () => store.selectWorkspace(),
      onSelectError: (cause) => emit("error", errorMessage(cause)),
      freshPackageUrl,
      loadSkills: () => store.loadSkills(),
      reload: () => load(),
      onError: (message) => emit("error", message),
      missingUrlMessage: t("zhifuAgent.skills.missingPackageUrl"),
    });
    if (updated) ElMessage.success(t("zhifuAgent.skills.updatedToWorkspace"));
  } catch (cause) {
    emit("error", errorMessage(cause));
  } finally {
    updatingSkillId.value = null;
  }
}

async function revokeShare(skill: SkillStoreItem) {
  const id = skill.share_id;
  if (!id || revokingId.value) return;
  try {
    await ElMessageBox.confirm(
      t("zhifuAgent.skills.cancelShareConfirm", { name: skill.name }),
      t("zhifuAgent.common.tip"),
      {
        type: "warning",
        confirmButtonText: t("zhifuAgent.skills.cancelShare"),
        cancelButtonText: t("zhifuAgent.common.cancel"),
      }
    );
  } catch {
    return;
  }
  revokingId.value = skill.id;
  try {
    await revokeSkillShare(id);
    await load();
    ElMessage.success(t("zhifuAgent.skills.cancelShareSuccess"));
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    revokingId.value = null;
  }
}

async function deleteSkill(skill: SkillStoreItem) {
  if (deletingId.value) return;
  try {
    await ElMessageBox.confirm(
      t("zhifuAgent.skills.deleteConfirm", { name: skill.name }),
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
  deletingId.value = skill.id;
  try {
    await unbindSkillStore(skill.id).catch(() => {});
    await deleteSkillStore(skill.id);
    await store.loadBoundSkillStore().catch(() => {});
    await load();
    ElMessage.success(t("zhifuAgent.skills.deleteSuccess"));
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    deletingId.value = null;
  }
}

let classifyReady = false;

function ensureCategories() {
  if (classifyReady) return;
  classifyReady = true;
  void loadSkillClassifyOptions().then((result) => {
    categories.value = result.categories;
    platforms.value = result.platforms;
  });
}

defineExpose({ openUpload, uploading, reload: load });

onMounted(() => {
  if (store.workspace) store.loadSkills().catch(() => {});
  load();
});
</script>

<style lang="scss" scoped>
.store-list {
  min-height: 160px;
  max-height: calc(100vh - 256px);
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.has-create-tip .store-list {
  max-height: calc(100vh - 372px);
}

.list-more {
  margin: 4px 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.store-item {
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

  .el-button {
    margin-left: 0;
  }

  .skill-more-button {
    padding: 4px !important;
  }
  .skill-actions {
    display: flex;
    gap: 4px;
    align-items: center;
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
}

.skill-copy {
  flex: 1;
  min-width: 0;

  p {
    margin: 4px 0;
    overflow: hidden;
    font-size: 12px;
    color: var(--el-text-color-regular);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  small {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
}

.review-line {
  display: flex;
  gap: 10px;
  align-items: center;
  min-width: 0;
}

.review-reason {
  overflow: hidden;
  color: var(--el-color-danger);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-passed {
  color: var(--el-color-success);
}

.is-rejected {
  color: var(--el-color-danger);
}

.is-pending {
  color: var(--el-color-warning);
}

.visibility-hint {
  font-size: 12px;
  line-height: 20px;
  color: var(--el-text-color-secondary);
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

.upload-drop {
  width: 100%;
  margin-bottom: 16px;

  :deep(.el-upload),
  :deep(.el-upload-dragger) {
    width: 100%;
  }

  :deep(.el-upload-dragger) {
    padding: 18px 16px;
    background: #fafbfc;
    border: 1px dashed #d7dee3;
    border-radius: 8px;
  }
}

.upload-drop-title {
  display: flex;
  gap: 6px;
  align-items: center;
  justify-content: center;
  margin: 0;
  font-size: 14px;
  color: #262c30;

  .el-icon {
    color: #3370ff;
  }
}

.upload-drop-tip {
  margin: 6px 0 0;
  font-size: 12px;
  color: #98a2a8;
}

.choose-file {
  display: inline-flex;
  gap: 6px;
  align-items: center;
  max-width: 240px;
  height: 32px;
  padding: 0 14px;
  margin-top: 12px;
  overflow: hidden;
  font-size: 13px;
  color: #5f686e;
  text-overflow: ellipsis;
  white-space: nowrap;
  background: #f3f4f6;
  border-radius: 16px;
}

.upload-form :deep(.el-form-item__label) {
  font-weight: 500;
  color: #262c30;
}

.upload-category {
  width: 100%;
}

.scope-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: flex-start;

  :deep(.el-radio) {
    height: auto;
    align-items: flex-start;
    margin-right: 0;
    white-space: normal;
  }

  :deep(.el-radio__input) {
    margin-top: 3px;
  }

  :deep(.el-radio__label) {
    display: flex;
    flex-direction: column;
    gap: 2px;
    line-height: 1.4;
  }
}

.scope-title {
  font-size: 14px;
  color: #262c30;
}

.scope-desc {
  font-size: 12px;
  color: #8b9499;
}
</style>
