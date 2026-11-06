<template>
  <el-dialog
    v-model="visible"
    :title="t('zhifuAgent.skills.redeem')"
    width="560px"
    append-to-body
    @closed="reset"
  >
    <el-form label-width="128px" @submit.prevent>
      <el-form-item :label="t('zhifuAgent.skills.redeemCode')" required>
        <div class="code-row">
          <el-input
            v-model="code"
            :placeholder="t('zhifuAgent.skills.redeemCodePlaceholder')"
            @keyup.enter="lookup"
          />
          <el-button type="primary" :loading="looking" @click="lookup">
            {{ t("zhifuAgent.skills.redeemLookup") }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item :label="t('zhifuAgent.skills.redeemName')">
        <el-input :model-value="skill?.name || ''" disabled />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="visible = false">{{ t("zhifuAgent.common.cancel") }}</el-button>
      <el-button type="primary" :loading="adding" @click="add">
        {{ t("zhifuAgent.skills.redeemAdd") }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  bindSkillByShare,
  getSkillShareInfo,
  reportSkillDownload,
  unbindSkillStore,
  type SkillShareInfo,
} from "@/ai/api/zhifuAgent";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuInstallRemoteSkill } from "@/ai/utils/electronApi";

const visible = defineModel<boolean>({ default: false });
const emit = defineEmits<{ added: []; error: [message: string] }>();

const store = useZhifuAgentStore();
const { t } = useI18n();

const code = ref("");
const lookedUpCode = ref("");
const skill = ref<SkillShareInfo | null>(null);
const looking = ref(false);
const adding = ref(false);

/** 从输入内容中匹配口令：16 个十六进制字符，每 4 位用 - 分隔 */
const SHARE_CODE_PATTERN = /[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}/i;

function matchedCode(raw: string) {
  return raw.match(SHARE_CODE_PATTERN)?.[0].toLowerCase() || "";
}

watch(code, () => {
  if (matchedCode(code.value) !== lookedUpCode.value) skill.value = null;
});

function reset() {
  code.value = "";
  lookedUpCode.value = "";
  skill.value = null;
  looking.value = false;
  adding.value = false;
}

function packageUrl(source: Record<string, unknown> | null | undefined) {
  for (const key of ["skillsUrl", "skills_url", "file_url", "fileUrl", "download_url", "url"]) {
    const url = String(source?.[key] || "").trim();
    if (/^https:\/\//i.test(url)) return url;
  }
  return "";
}

async function lookup() {
  const raw = code.value.trim();
  if (!raw) {
    ElMessage.warning(t("zhifuAgent.skills.redeemCodeRequired"));
    return;
  }
  const value = matchedCode(raw);
  if (!value) {
    ElMessage.warning(t("zhifuAgent.skills.redeemCodeInvalid"));
    return;
  }
  looking.value = true;
  try {
    const result: any = await getSkillShareInfo(value);
    const data = result?.data as SkillShareInfo | undefined;
    if (!data?.name) {
      skill.value = null;
      lookedUpCode.value = "";
      return;
    }
    skill.value = data;
    lookedUpCode.value = value;
    ElMessage.success(t("zhifuAgent.skills.redeemLookupSuccess"));
  } catch {
    skill.value = null;
    lookedUpCode.value = "";
  } finally {
    looking.value = false;
  }
}

async function add() {
  const current = skill.value;
  const value = lookedUpCode.value;
  if (!current || !value) {
    ElMessage.warning(t("zhifuAgent.skills.redeemLookupFirst"));
    return;
  }
  if (!store.workspace) {
    await store.selectWorkspace().catch((cause) => {
      emit("error", errorMessage(cause));
    });
    if (!store.workspace) return;
  }
  adding.value = true;
  const alreadyBound = current.is_bound;
  let skillStoreId = 0;
  try {
    const result: any = await bindSkillByShare(value);
    const data = result?.data || {};
    skillStoreId = Number(data.skill_store_id || current.id);
    const url = packageUrl(data);
    if (!url || !(skillStoreId > 0)) {
      if (!alreadyBound && skillStoreId > 0) await unbindSkillStore(skillStoreId).catch(() => {});
      emit("error", t("zhifuAgent.skills.missingPackageUrl"));
      return;
    }
    try {
      await zhifuInstallRemoteSkill({
        url,
        id: skillStoreId,
        fileMd5: current.file_md5 || data.file_md5,
        scope: "workspace",
        workspace: store.workspace,
      });
    } catch (cause) {
      if (!alreadyBound) await unbindSkillStore(skillStoreId).catch(() => {});
      throw cause;
    }
    await reportSkillDownload(skillStoreId).catch(() => {});
    await Promise.all([store.loadSkills(), store.loadBoundSkillStore().catch(() => {})]);
    ElMessage.success(t("zhifuAgent.skills.redeemSuccess"));
    visible.value = false;
    emit("added");
  } catch (cause) {
    emit("error", errorMessage(cause));
  } finally {
    adding.value = false;
  }
}
</script>

<style lang="scss" scoped>
.code-row {
  display: flex;
  gap: 8px;
  width: 100%;

  .el-input {
    flex: 1;
  }
}
</style>
