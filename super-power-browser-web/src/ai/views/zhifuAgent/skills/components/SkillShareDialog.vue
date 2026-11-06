<template>
  <el-dialog
    v-model="uploadVisible"
    class="skill-share-dialog"
    :title="t('zhifuAgent.skills.shareUploadTitle')"
    width="520px"
    append-to-body
    :close-on-click-modal="!uploading"
    :close-on-press-escape="!uploading"
    :show-close="!uploading"
  >
    <p class="share-desc">
      {{ t("zhifuAgent.skills.shareUploadDesc", { name: pendingSkill?.name || "" }) }}
    </p>
    <div class="share-note">
      <strong>{{ t("zhifuAgent.skills.shareUploadNote") }}</strong>
      <ul>
        <li>{{ t("zhifuAgent.skills.shareUploadNoteSync") }}</li>
        <li>{{ t("zhifuAgent.skills.shareUploadNoteLink") }}</li>
      </ul>
    </div>
    <template #footer>
      <el-button :disabled="uploading" @click="uploadVisible = false">
        {{ t("zhifuAgent.skills.shareLater") }}
      </el-button>
      <el-button type="primary" :loading="uploading" @click="confirmUpload">
        {{ t("zhifuAgent.skills.shareUploadAction") }}
      </el-button>
    </template>
  </el-dialog>

  <el-dialog
    v-model="codeVisible"
    class="skill-share-dialog"
    :title="t('zhifuAgent.skills.shareCodeTitle')"
    width="480px"
    append-to-body
    :close-on-click-modal="!resetting"
    :close-on-press-escape="!resetting"
    :show-close="!resetting"
  >
    <pre class="share-text">{{ shareText }}</pre>
    <template #footer>
      <el-button :loading="resetting" :disabled="resetting" @click="resetCode">
        {{ t("zhifuAgent.skills.resetShareCode") }}
      </el-button>
      <el-button type="primary" :disabled="resetting" @click="copyCode">
        {{ t("zhifuAgent.skills.shareCodeCopy") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  createSkillShare,
  getUploadedSkillStoreList,
  revokeSkillShare,
  uploadSkillStore,
  type SkillStoreItem,
} from "@/ai/api/zhifuAgent";
import { skillIdentity, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuGetSkill } from "@/ai/utils/electronApi";
import type { DisplaySkill } from "../../type";

const store = useZhifuAgentStore();
const { t } = useI18n();

const uploadVisible = ref(false);
const codeVisible = ref(false);
const uploading = ref(false);
const resetting = ref(false);
const pendingSkill = ref<DisplaySkill | null>(null);
const shareCode = ref("");
const shareName = ref("");
const uploadedId = ref(0);
/** 当前口令对应的分享记录，重置时要先用它取消分享 */
const shareRecordId = ref(0);
/** 生成新口令用的技能版本 ID */
const skillStoreId = ref(0);

const shareText = computed(() =>
  t("zhifuAgent.skills.shareCodeText", {
    name: shareName.value,
    code: shareCode.value,
  })
);

/** 用技能自己的版本号。写成 v1.0.0 时去掉 v，没有版本时再用 1.0.0 */
function uploadVersion(skill: DisplaySkill) {
  const version = String(skill.version || "")
    .trim()
    .replace(/^v(?=\d)/i, "");
  return version || "1.0.0";
}

function pickList<T>(res: any): T[] {
  const data = res?.data;
  if (Array.isArray(data)) return data;
  if (Array.isArray(data?.list)) return data.list;
  return [];
}

/** 只认还在「我上传的」里的记录。删除后留下的绑定不能再用来分享，也不能拦住重新上传 */
async function resolveStoreId(skill: DisplaySkill) {
  const identity = skillIdentity(skill.name);
  const uploadedRes = await getUploadedSkillStoreList({
    page: 1,
    limit: 100,
    keyword: skill.name,
  });
  const found = pickList<SkillStoreItem>(uploadedRes).find(
    (item) => skillIdentity(item.name) === identity
  );
  const id = Number(found?.id);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

async function buildSkillZip(skill: DisplaySkill) {
  const details = await zhifuGetSkill({
    id: String(skill.id),
    scope: skill.scope,
    workspace: store.workspace,
    includeFiles: true,
  });
  const content = String(details?.content || "");
  const files = (details?.files || []).filter((item) => {
    const path = String(item?.path || "")
      .replace(/\\/g, "/")
      .replace(/^\/+/, "");
    return path && path !== ".." && !path.startsWith("../") && !path.split("/").includes("..");
  });
  if (!content.trim() && !files.length) throw new Error(t("zhifuAgent.skills.shareContentEmpty"));
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  let hasSkillFile = false;
  for (const item of files) {
    const path = String(item.path).replace(/\\/g, "/").replace(/^\/+/, "");
    if (/(^|\/)skill\.md$/i.test(path)) hasSkillFile = true;
    zip.file(path, item.data, { base64: true });
  }
  if (!hasSkillFile) zip.file("SKILL.md", content);
  const blob = await zip.generateAsync({ type: "blob" });
  const base = skill.name.replace(/[\\/:*?"<>|]+/g, "-").trim() || "skill";
  return new File([blob], `${base}.zip`, { type: "application/zip" });
}

async function showCode(storeId: number, fallbackName = "") {
  const result: any = await createSkillShare(storeId);
  const data = result?.data || {};
  const code = String(data.code || "").trim();
  const name = String(data.name || data.skill_name || fallbackName || "").trim();
  const recordId = Number(data.id);
  const savedStoreId = Number(data.skill_store_id || storeId);
  if (!code) {
    ElMessage.error(t("zhifuAgent.skills.shareFailed"));
    return;
  }
  shareCode.value = code;
  shareName.value = name;
  shareRecordId.value = Number.isFinite(recordId) && recordId > 0 ? recordId : 0;
  if (savedStoreId > 0) skillStoreId.value = savedStoreId;
  uploadVisible.value = false;
  codeVisible.value = true;
}

async function open(skill: DisplaySkill) {
  pendingSkill.value = skill;
  shareCode.value = "";
  shareName.value = "";
  shareRecordId.value = 0;
  skillStoreId.value = 0;
  uploadedId.value = 0;
  try {
    const storeId = await resolveStoreId(skill);
    if (!storeId) {
      uploadVisible.value = true;
      return;
    }
    await showCode(storeId, skill.name);
  } catch {
    // 接口异常已由 request 统一提示
  }
}

async function confirmUpload() {
  const skill = pendingSkill.value;
  if (!skill || uploading.value) return;
  if (!store.workspace) {
    ElMessage.warning(t("zhifuAgent.chat.noWorkspace"));
    return;
  }
  uploading.value = true;
  let file: File;
  try {
    file = await buildSkillZip(skill);
  } catch (cause) {
    uploading.value = false;
    ElMessage.error(
      cause instanceof Error && cause.message
        ? cause.message
        : t("zhifuAgent.skills.shareContentEmpty")
    );
    return;
  }
  try {
    let skillId = uploadedId.value;
    if (!(skillId > 0)) {
      const data = new FormData();
      data.append("file", file);
      data.append("version", uploadVersion(skill));
      data.append("category_id", String(skill.category_id || 0));
      data.append("sub_category_id", String(skill.sub_category_id || 0));
      data.append("scope", "2");
      const result: any = await uploadSkillStore(data);
      skillId = Number(result?.data?.id ?? result?.data?.skill_store_id);
      if (!(skillId > 0)) {
        ElMessage.error(t("zhifuAgent.skills.shareUploadFailed"));
        return;
      }
      uploadedId.value = skillId;
      await store.loadBoundSkillStore().catch(() => {});
    }
    await showCode(skillId, skill.name);
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    uploading.value = false;
  }
}

async function copyCode() {
  if (!shareText.value) return;
  try {
    await navigator.clipboard.writeText(shareText.value);
    ElMessage.success(t("zhifuAgent.skills.shareCodeCopied"));
  } catch {
    ElMessage.error(t("zhifuAgent.chat.copyFailed"));
  }
}

/** 生成接口没带回分享记录时，从上传列表里取 share_id */
async function resolveShareRecordId() {
  if (shareRecordId.value > 0) return shareRecordId.value;
  if (!(skillStoreId.value > 0)) return 0;
  const uploadedRes = await getUploadedSkillStoreList({
    page: 1,
    limit: 100,
    keyword: shareName.value || undefined,
  });
  const found = pickList<SkillStoreItem>(uploadedRes).find(
    (item) => Number(item.id) === skillStoreId.value
  );
  const id = Number(found?.share_id);
  return Number.isFinite(id) && id > 0 ? id : 0;
}

async function resetCode() {
  if (resetting.value) return;
  try {
    await ElMessageBox.confirm(
      t("zhifuAgent.skills.resetShareCodeConfirm", { name: shareName.value }),
      t("zhifuAgent.common.tip"),
      {
        type: "warning",
        confirmButtonText: t("zhifuAgent.skills.resetShareCode"),
        cancelButtonText: t("zhifuAgent.common.cancel"),
      }
    );
  } catch {
    return;
  }
  resetting.value = true;
  try {
    const recordId = await resolveShareRecordId();
    const storeId = skillStoreId.value;
    if (!(recordId > 0) || !(storeId > 0)) {
      ElMessage.error(t("zhifuAgent.skills.resetShareCodeFailed"));
      return;
    }
    await revokeSkillShare(recordId);
    shareCode.value = "";
    shareRecordId.value = 0;
    await showCode(storeId, shareName.value);
    if (shareCode.value) ElMessage.success(t("zhifuAgent.skills.resetShareCodeSuccess"));
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    resetting.value = false;
  }
}

async function openByStoreId(skillStoreIdToOpen: number, fallbackName = "") {
  const id = Number(skillStoreIdToOpen);
  shareCode.value = "";
  shareName.value = "";
  shareRecordId.value = 0;
  skillStoreId.value = 0;
  if (!(id > 0)) {
    ElMessage.error(t("zhifuAgent.skills.shareFailed"));
    return;
  }
  try {
    await showCode(id, fallbackName);
  } catch {
    // 接口异常已由 request 统一提示
  }
}

/** 只把本地技能上传到云端，不生成分享口令 */
async function uploadToCloud(skill: DisplaySkill) {
  if (uploading.value) return;
  if (!store.workspace) {
    ElMessage.warning(t("zhifuAgent.chat.noWorkspace"));
    return;
  }
  const existingId = await resolveStoreId(skill);
  if (existingId > 0) {
    ElMessage.warning(t("zhifuAgent.skills.uploadCloudExists"));
    return;
  }
  pendingSkill.value = skill;
  let file: File;
  try {
    file = await buildSkillZip(skill);
  } catch (cause) {
    ElMessage.error(
      cause instanceof Error && cause.message
        ? cause.message
        : t("zhifuAgent.skills.shareContentEmpty")
    );
    return;
  }
  uploading.value = true;
  try {
    const data = new FormData();
    data.append("file", file);
    data.append("version", uploadVersion(skill));
    data.append("category_id", String(skill.category_id || 0));
    data.append("sub_category_id", String(skill.sub_category_id || 0));
    data.append("scope", "2");
    const result: any = await uploadSkillStore(data);
    const skillId = Number(result?.data?.id ?? result?.data?.skill_store_id);
    if (!(skillId > 0)) {
      ElMessage.error(t("zhifuAgent.skills.shareUploadFailed"));
      return;
    }
    await store.loadBoundSkillStore().catch(() => {});
    ElMessage.success(t("zhifuAgent.skills.uploadCloudSuccess"));
    return true;
  } catch {
    // 接口异常已由 request 统一提示
  } finally {
    uploading.value = false;
  }
}

defineExpose({ open, openByStoreId, uploadToCloud });
</script>

<style lang="scss" scoped>
.share-desc {
  margin: 0 0 14px;
  font-size: 13px;
  line-height: 1.6;
  color: #8b9499;
}

.share-note {
  padding: 14px 16px;
  background: #f4f7ff;
  border-radius: 8px;

  strong {
    display: block;
    margin-bottom: 8px;
    font-size: 14px;
    font-weight: 650;
    color: #262c30;
  }

  ul {
    padding-left: 18px;
    margin: 0;
  }

  li {
    font-size: 13px;
    line-height: 1.7;
    color: #5f686e;
  }

  li + li {
    margin-top: 6px;
  }
}

.share-text {
  margin: 0;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.8;
  color: #262c30;
  white-space: pre-wrap;
}
</style>
