<template>
  <div class="skill-store" :class="{ 'has-create-tip': showCreateTip }">
    <!-- <div class="store-head">
      <el-radio-group v-model="activeTab" class="store-tabs">
        <el-radio-button value="system">
          {{ t("zhifuAgent.skills.systemSkills") }}
        </el-radio-button>
        <el-radio-button value="uploaded">
          {{ t("zhifuAgent.skills.uploadedSkills") }}
        </el-radio-button>
      </el-radio-group>
      <el-button
        :loading="syncing"
        :disabled="loading"
        @click="syncInstalledToWorkspace"
      >
        {{ syncing ? t("zhifuAgent.skills.syncing") : t("zhifuAgent.skills.syncToWorkspace") }}
      </el-button>
    </div> -->

    <div class="toolbar">
      <!-- <span class="count">
        {{ t("zhifuAgent.skills.storeCount", { count: skills.length }) }}
      </span> -->
      <!-- <el-button class="toolbar-refresh" :icon="Refresh" :loading="loading" @click="load">
        {{ t("zhifuAgent.common.refresh") }}
      </el-button> -->

      <div class="filter-rows">
        <div v-for="row in filterRows" :key="row.kind" class="filter-row">
          <span>{{ t(row.label) }}</span>
          <button
            v-for="item in row.options"
            :key="item.id"
            :class="{ active: row.selected === item.id }"
            @click="selectFilter(row.kind, item.id)"
          >
            {{ item.name }}
          </button>
        </div>
      </div>
    </div>

    <div ref="listRef" v-loading="loading" class="store-list" @scroll="onListScroll">
      <el-empty
        v-if="!loading && !skills.length"
        :description="t('zhifuAgent.skills.storeEmpty')"
      />
      <div v-for="skill in skills" :key="skill.id" class="store-item">
        <div class="skill-icon">
          <el-icon><Box /></el-icon>
        </div>
        <div class="skill-copy">
          <div class="skill-name">
            <strong>{{ skill.name }}</strong>
            <el-tag v-if="skill.category_name" size="small">
              {{ skill.category_name }}
            </el-tag>
            <el-tag v-if="skill.sub_category_name" size="small">
              {{ skill.sub_category_name }}
            </el-tag>
          </div>
          <p :title="skill.explain">{{ skill.explain }}</p>
          <small>
            {{
              t("zhifuAgent.skills.version", {
                version: skill.version || "v1.0.0",
              })
            }}
            <span style="margin-left: 10px">
              {{
                t("zhifuAgent.skills.downloadCount", {
                  count: Number(skill.download_count) || 0,
                })
              }}
            </span>
          </small>
        </div>

        <el-button
          type="primary"
          size="small"
          plain
          style="margin-right: -10px"
          :icon="Share"
          :loading="sharingId === skill.id"
          @click="openShare(skill)"
        >
          {{ t("zhifuAgent.skills.share") }}
        </el-button>
        <el-button
          v-if="!isInstalled(skill)"
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
        <template v-else>
          <el-button
            v-if="needsUpdate(skill)"
            type="primary"
            size="small"
            :icon="Download"
            style="margin-right: -10px"
            plain
            :loading="updatingId === skill.id"
            @click="updateInstalled(skill)"
          >
            {{
              updatingId === skill.id
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
      </div>
      <p v-if="loadingMore" class="list-more">{{ t("zhifuAgent.composer.shopLoading") }}</p>
    </div>

    <SkillShareDialog ref="shareDialogRef" />
  </div>
</template>

<script setup lang="ts">
import { Box, Download, Share } from "@element-plus/icons-vue";
import { useDebounceFn } from "@vueuse/core";
import {
  getSkillStoreList,
  getUploadedSkillStoreList,
  reportSkillDownload,
  type SkillStoreClassifyItem,
  type SkillStoreItem,
  type SkillStoreListParams,
} from "@/ai/api/zhifuAgent";
import { errorMessage, skillIdentity, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import { zhifuInstallRemoteSkill } from "@/ai/utils/electronApi";
import SkillShareDialog from "./SkillShareDialog.vue";
import {
  findInstalledSkill,
  installListedSkill,
  skillNeedsUpdate,
  useInstalledSkillInChat,
  loadSkillClassifyOptions,
  openSkillShare,
  pickList,
  readSkillPage,
  skillPackageUrl,
} from "../skillListShared";

const emit = defineEmits<{ error: [message: string] }>();

defineProps<{
  showCreateTip?: boolean;
}>();

const store = useZhifuAgentStore();
const { t } = useI18n();

const keyword = defineModel("keyword", { default: "" });
const categoryId = ref(0);
const subCategoryId = ref(0);
const categories = ref<SkillStoreClassifyItem[]>([]);
const platforms = ref<SkillStoreClassifyItem[]>([]);
const loading = ref(false);
const installingId = ref<number | null>(null);
const updatingId = ref<number | null>(null);
const sharingId = ref<number | null>(null);
const shareDialogRef = ref<InstanceType<typeof SkillShareDialog>>();
const syncing = ref(false);

const skills = ref<SkillStoreItem[]>([]);
const listRef = ref<HTMLElement>();
const page = ref(1);
const hasMore = ref(false);
const loadingMore = ref(false);
const PAGE_SIZE = 20;

const filterRows = computed(() => [
  {
    kind: "category" as const,
    label: "zhifuAgent.skills.filterScene",
    selected: categoryId.value,
    options: [{ id: 0, name: t("zhifuAgent.skills.filterAll") }, ...categories.value],
  },
  {
    kind: "platform" as const,
    label: "zhifuAgent.skills.filterPlatform",
    selected: subCategoryId.value,
    options: [{ id: 0, name: t("zhifuAgent.skills.filterAll") }, ...platforms.value],
  },
]);

function selectFilter(kind: "category" | "platform", id: number) {
  const current = kind === "category" ? categoryId : subCategoryId;
  const next = current.value === id && id !== 0 ? 0 : id;
  if (current.value === next) return;
  current.value = next;
  load();
}

function optionalId(value: number | undefined) {
  const id = Number(value);
  return Number.isFinite(id) && id > 0 ? id : undefined;
}

function listQuery(pageNo = 1): SkillStoreListParams {
  const text = keyword.value.trim();
  return {
    page: pageNo,
    limit: PAGE_SIZE,
    name: text || undefined,
    category_id: optionalId(categoryId.value),
    sub_category_id: optionalId(subCategoryId.value),
  };
}

/** 已安装只看当前工作区里的本地技能，按名称对齐 */
const isInstalled = (skill: SkillStoreItem) =>
  Boolean(store.workspace && findInstalledSkill(store.localSkills, skill.name));

/** 商店版本高于本地 _meta.json 里的版本时，才显示更新 */
const needsUpdate = (skill: SkillStoreItem) =>
  skillNeedsUpdate(skill.version, findInstalledSkill(store.localSkills, skill.name)?.version);

async function fetchSkills(params: SkillStoreListParams = listQuery()) {
  const pageNo = params.page || 1;
  params.source = 0;
  return readSkillPage(await getSkillStoreList(params), pageNo);
}

/** 签名地址快过期时，只按名称补查这一条，不刷新当前列表 */
async function freshPackageUrl(skill: SkillStoreItem) {
  const res = await getSkillStoreList({ page: 1, limit: 20, name: skill.name, source: 0 });
  return skillPackageUrl(
    pickList<SkillStoreItem>(res).find((item) => Number(item.id) === Number(skill.id))
  );
}

async function loadCategories() {
  const result = await loadSkillClassifyOptions();
  categories.value = result.categories;
  platforms.value = result.platforms;
}

let loadSeq = 0;

async function load() {
  const seq = ++loadSeq;
  loading.value = true;
  loadingMore.value = false;
  try {
    const result = await fetchSkills(listQuery(1));
    if (seq !== loadSeq) return;
    page.value = 1;
    skills.value = result.list;
    hasMore.value = result.hasNext;
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
    const result = await fetchSkills(listQuery(nextPage));
    if (seq !== loadSeq) return;
    const seen = new Set(skills.value.map((item) => Number(item.id)));
    const appended = result.list.filter((item) => !seen.has(Number(item.id)));
    if (!appended.length) {
      hasMore.value = false;
      return;
    }
    page.value = nextPage;
    skills.value = skills.value.concat(appended);
    hasMore.value = result.hasNext;
    void fillList(seq);
  } catch {
    // 接口异常已由 request 统一提示，保留已加载的列表
  } finally {
    if (seq === loadSeq) loadingMore.value = false;
  }
}

/** 首屏不够高时继续拉取，直到出现滚动条或没有下一页 */
async function fillList(seq: number) {
  await nextTick();
  const el = listRef.value;
  if (!el || seq !== loadSeq || !hasMore.value || loading.value || loadingMore.value) return;
  if (el.scrollHeight <= el.clientHeight + 8) await loadMore();
}

const debouncedSearch = useDebounceFn(() => load(), 400);

watch(keyword, () => {
  debouncedSearch();
});

function openShare(skill: SkillStoreItem) {
  return openSkillShare(shareDialogRef.value, skill, sharingId);
}

/** 把线上已绑定、工作区里还没有的技能下载到当前工作区 */
async function syncInstalledToWorkspace() {
  if (!store.workspace) {
    await store.selectWorkspace().catch((cause) => {
      emit("error", errorMessage(cause));
    });
    if (!store.workspace) return;
  }
  syncing.value = true;
  try {
    const [, uploaded] = await Promise.all([
      store.loadSkillStore(),
      getUploadedSkillStoreList({ page: 1, limit: 100 }).then((res) =>
        pickList<SkillStoreItem>(res)
      ),
      store.loadSkills(),
    ]);
    const bound = new Map<number, SkillStoreItem>();
    for (const skill of [...store.skillStoreCatalog, ...uploaded]) {
      if (skill.is_bound) bound.set(skill.id, skill);
    }
    const localNames = new Set(
      store.localSkills
        .filter((item) => item.scope === "workspace")
        .map((item) => skillIdentity(item.name))
    );
    const pending = [...bound.values()].filter(
      (skill) => !localNames.has(skillIdentity(skill.name))
    );
    if (!pending.length) {
      ElMessage.success(t("zhifuAgent.skills.syncNothing"));
      return;
    }
    const failed: string[] = [];
    for (const skill of pending) {
      const url = skillPackageUrl(skill);
      if (!url) {
        failed.push(skill.name);
        continue;
      }
      try {
        await zhifuInstallRemoteSkill({
          url,
          id: skill.id,
          fileMd5: skill.file_md5,
          scope: "workspace",
          workspace: store.workspace,
        });
        await reportSkillDownload(skill.id).catch(() => {});
      } catch {
        failed.push(skill.name);
      }
    }
    await store.loadSkills();
    if (failed.length) {
      emit("error", t("zhifuAgent.skills.syncPartial", { names: failed.join("、") }));
      return;
    }
    ElMessage.success(t("zhifuAgent.skills.syncSuccess", { count: pending.length }));
  } catch (cause) {
    emit("error", errorMessage(cause));
  } finally {
    await load().catch(() => {});
    syncing.value = false;
  }
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

/** 用商店里的新版本覆盖当前工作区已安装的技能 */
async function updateInstalled(skill: SkillStoreItem) {
  updatingId.value = skill.id;
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
    updatingId.value = null;
  }
}

onMounted(() => {
  loadCategories();
  if (store.workspace) store.loadSkills().catch(() => {});
  load();
});

defineExpose({ load, loading, syncInstalledToWorkspace });
</script>

<style lang="scss" scoped>
.store-head {
  display: flex;
  gap: 12px;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.store-tabs {
  margin-bottom: 0;

  :deep(.el-radio-button:first-child .el-radio-button__inner) {
    border-left: 1px solid var(--el-border-color);
  }
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  margin-bottom: 14px;

  .count {
    flex: 1;
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }
  .el-button + .el-button {
    margin-left: 0;
  }

  .toolbar-refresh {
    margin-left: auto;
    margin-right: 8px;
  }
}

.skill-search {
  width: 260px;

  :deep(.el-input__wrapper) {
    height: 32px;
    background: #f3f4f6;
    border-radius: 16px;
    box-shadow: none;
  }

  :deep(.el-input__prefix) {
    color: #98a2a8;
  }
}

.filter-rows {
  display: flex;
  flex: 1 0 100%;
  flex-direction: column;
  gap: 10px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;

  span {
    flex: none;
    font-size: 13px;
    color: #8b9499;
  }

  button {
    height: 28px;
    padding: 0 8px;
    font-size: 13px;
    line-height: 26px;
    color: #8b9499;
    cursor: pointer;
    background: #fff;
    border: 1px solid #e6eaed;
    border-radius: 6px;

    &.active {
      color: #3370ff;
      background: #fff;
      border-color: #3370ff;
    }
  }
}

.store-list {
  min-height: 160px;
  max-height: calc(100vh - 296px);
  overflow-y: auto;
  scrollbar-width: none;

  &::-webkit-scrollbar {
    display: none;
  }
}

.list-more {
  margin: 4px 0 12px;
  font-size: 12px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.has-create-tip .store-list {
  max-height: calc(100vh - 426px);
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
</style>
