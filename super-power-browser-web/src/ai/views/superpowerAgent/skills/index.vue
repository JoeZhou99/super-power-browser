<template>
  <div :class="['superpower-page', { 'is-creating': creating || updating }]">
    <SkillStartDialog
      v-if="creating"
      @close="closeCreator"
      @start="startSkillCreation"
    />
    <SkillUpdateStartDialog
      v-else-if="updating && updateDraft"
      :skill-name="updateDraft.skillName"
      :shops="updateDraft.shops"
      @close="closeUpdater"
      @start="startSkillUpdate"
    />
    <template v-else>
      <header class="page-header">
        <h2>{{ t("superpowerAgent.skills.title") }}</h2>
        <p>
          {{
            activeTab === "mine"
              ? t("superpowerAgent.skills.mineDesc")
              : t("superpowerAgent.skills.storeDesc")
          }}
        </p>
        <el-alert
          class="automation-notice"
          type="info"
          :title="t('superpowerAgent.skills.automationNotice')"
          :closable="false"
          show-icon
        />
        <div v-if="showCreateTip" class="create-tip">
          <button
            type="button"
            class="create-tip-close"
            :title="t('superpowerAgent.common.close')"
            @click="showCreateTip = false"
          >
            <el-icon><Close /></el-icon>
          </button>
          <div class="create-tip-copy">
            <h3>
              {{ t("superpowerAgent.skills.createTipBefore") }}
              <strong style="color: #3370ff">
                {{ t("superpowerAgent.skills.createTipHighlight") }}
              </strong>
              {{ t("superpowerAgent.skills.createTipAfter") }}
              <strong style="color: #3370ff">技能</strong>
            </h3>
            <p>{{ t("superpowerAgent.skills.createTipDesc") }}</p>
            <ol>
              <li v-for="(key, index) in createTipSteps" :key="key">
                <span>{{ index + 1 }}</span>
                {{ t(key) }}
              </li>
            </ol>
          </div>
          <el-button type="primary" class="create-tip-action" @click="openCreator">
            {{ t("superpowerAgent.skills.createTipAction") }}
            <el-icon><ArrowRight /></el-icon>
          </el-button>
        </div>
      </header>
      <div class="skills-tabs">
        <div v-if="activeTab === 'mine'" class="mine-toolbar">
          <el-input
            v-model="skillKeyword"
            class="skill-search"
            clearable
            :prefix-icon="Search"
            :placeholder="t('superpowerAgent.skills.storeSearch')"
          />
          <el-button :icon="MagicStick" @click="openCreator">
            {{ t("superpowerAgent.skills.create") }}
          </el-button>

          <el-dropdown trigger="click" :disabled="store.skillsBusy" @command="onImportCommand">
            <el-button :icon="Download" :disabled="store.skillsBusy">
              {{ t("superpowerAgent.skills.importMenu") }}
              <el-icon class="el-icon--right"><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item command="zip" :icon="Upload">
                  {{ t("superpowerAgent.skills.importZip") }}
                </el-dropdown-item>
                <el-dropdown-item command="folder" :icon="FolderOpened">
                  {{ t("superpowerAgent.skills.installFolder") }}
                </el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
          <el-button :icon="Upload" @click="mySkillsRef?.openUpload()">
            {{ t("superpowerAgent.skills.uploadSkill") }}
          </el-button>
        </div>
        <div v-else class="mine-toolbar">
          <el-input
            v-model="storeKeyword"
            class="skill-search"
            clearable
            :prefix-icon="Search"
            :placeholder="t('superpowerAgent.skills.storeSearch')"
            @keyup.enter="skillStoreRef?.load()"
          />
          <el-button :icon="MagicStick" @click="openCreator">
            {{ t("superpowerAgent.skills.create") }}
          </el-button>
        </div>
        <el-tabs v-model="activeTab" class="page-tabs">
          <el-tab-pane :label="t('superpowerAgent.skills.mine')" name="mine">
            <MySkills
              ref="mySkillsRef"
              v-model:keyword="skillKeyword"
              :show-create-tip="showCreateTip"
              @error="installError = $event"
              @edit="openSkillUpdate"
            />
          </el-tab-pane>
          <el-tab-pane :label="t('superpowerAgent.skills.store')" name="store" lazy>
            <SkillStore
              ref="skillStoreRef"
              v-model:keyword="storeKeyword"
              :show-create-tip="showCreateTip"
              @error="installError = $event"
            />
          </el-tab-pane>
        </el-tabs>
      </div>
    </template>
    <SkillInstallErrorDialog v-model="installError" />
  </div>
</template>

<script setup lang="ts">
import {
  ArrowDown,
  ArrowRight,
  Close,
  FolderOpened,
  MagicStick,
  Search,
  Upload,
  Download,
} from "@element-plus/icons-vue";
import { useSuperPowerAgentStore } from "@/ai/store/modules/superpower-agent.store";
import type { SelectedShop } from "../chat/components/ShopSelect.vue";
import type { DisplaySkill } from "../type";
import MySkills from "./components/MySkills.vue";
import SkillInstallErrorDialog from "./components/SkillInstallErrorDialog.vue";
import SkillStartDialog from "./components/SkillStartDialog.vue";
import SkillUpdateStartDialog from "./components/SkillUpdateStartDialog.vue";
import SkillStore from "./components/SkillStore.vue";

const store = useSuperPowerAgentStore();
const { t } = useI18n();

const activeTab = ref<"mine" | "store">("mine");
const skillKeyword = ref("");
const storeKeyword = ref("");
const creating = ref(false);
const updating = ref(false);
const updateDraft = ref<{
  skillName: string;
  skills?: { id: string | number; name: string; scope: "workspace" | "global" }[];
  shops: SelectedShop[];
} | null>(null);
const installError = ref("");
const mySkillsRef = ref<InstanceType<typeof MySkills>>();
const skillStoreRef = ref<InstanceType<typeof SkillStore>>();
const showCreateTip = ref(true);
const createTipSteps = [
  "superpowerAgent.skills.createTipStep1",
  "superpowerAgent.skills.createTipStep2",
  "superpowerAgent.skills.createTipStep3",
];

function onImportCommand(command: string | number | object) {
  if (command === "folder" || command === "zip") mySkillsRef.value?.installSkill(command);
}

function openCreator() {
  activeTab.value = "mine";
  creating.value = true;
}

/** Open the standalone update flow from a skill row's three-dot menu. */
function openSkillUpdate(skill: DisplaySkill) {
  activeTab.value = "mine";
  creating.value = false;
  updateDraft.value = {
    skillName: skill.name,
    skills: [{ id: skill.id, name: skill.name, scope: skill.scope }],
    shops: [],
  };
  updating.value = true;
}

function closeCreator() {
  creating.value = false;
}

function closeUpdater() {
  updating.value = false;
  updateDraft.value = null;
}

function startSkillCreation({ shops, url }: { shops: SelectedShop[]; url: string }) {
  const page = url.trim() || "当前页面";
  store.pendingSend = {
    text: t("superpowerAgent.chat.createSkillRequest", {
      requirement: "……",
      page,
    }),
    skills: [],
    shops,
    autoSend: false,
  };
  creating.value = false;
  store.openPage("chat");
}

function startSkillUpdate({
  skillName,
  shops,
  url,
}: {
  skillName: string;
  shops: SelectedShop[];
  url?: string;
}) {
  const draft = updateDraft.value;
  store.pendingSend = {
    text: t("superpowerAgent.chat.updateSkillRequest", {
      name: skillName,
      shops: shops.map((shop) => shop.name).join("、"),
      page: url?.trim() || "当前页面",
    }),
    skills: draft?.skills || [],
    shops,
    autoSend: false,
  };
  updating.value = false;
  updateDraft.value = null;
  store.openPage("chat");
}

watch(
  () => store.pendingSkillUpdate,
  (target) => {
    if (!target) return;
    store.pendingSkillUpdate = null;
    updateDraft.value = {
      skillName: target.skillName,
      skills: target.skills,
      shops: target.shops,
    };
    creating.value = false;
    updating.value = true;
  },
  { immediate: true }
);

watch(activeTab, (tab) => {
  if (tab === "mine") mySkillsRef.value?.reload();
});

onMounted(() => {
  store.init();
});
</script>

<style lang="scss" scoped>
@use "../styles/page.scss";

.skills-tabs {
  position: relative;
  display: flex;
  flex-direction: column;
}

.automation-notice {
  margin-top: 12px;
}

.mine-toolbar {
  z-index: 2;
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  align-items: center;
  justify-content: flex-end;
  margin-bottom: -34px;
  .skill-search {
    width: 240px;
  }
  > :not(.skill-search) {
    flex: none;
  }
  :deep(.el-button) {
    margin-left: 0;
    padding: 0 8px;
  }
}

.skill-search {
  // flex: 1 1 220px;
  // width: auto;
  // min-width: 180px;
  // max-width: 260px;

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

.superpower-page.is-creating {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.create-tip {
  position: relative;
  display: flex;
  gap: 24px;
  align-items: center;
  padding: 16px 44px 16px 18px;
  margin-top: 14px;
  background: #f4f6f8;
  border-radius: 10px;
}

.create-tip-close {
  position: absolute;
  top: 10px;
  right: 10px;
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  padding: 0;
  color: #98a1a8;
  cursor: pointer;
  background: transparent;
  border: 0;

  &:hover {
    color: #5d666d;
  }
}

.create-tip-copy {
  flex: 1;
  min-width: 0;

  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 650;
    line-height: 1.4;
    color: #262c30;

    strong {
      font-weight: 750;
    }
  }

  p {
    margin: 6px 0 12px;
    font-size: 13px;
    line-height: 1.5;
    color: #8b9499;
  }

  ol {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 22px;
    padding: 0;
    margin: 0;
    list-style: none;
  }

  li {
    display: flex;
    gap: 6px;
    align-items: center;
    font-size: 13px;
    color: #5f686e;
  }

  span {
    display: grid;
    flex: none;
    place-items: center;
    width: 20px;
    height: 20px;
    font-size: 12px;
    line-height: 17px;
    color: #667077;
    background: #fff;
    border-radius: 50%;
    border: 1px solid #e6e9eb;
  }
}

.create-tip-action {
  flex: none;
  height: 36px;
  padding: 0 14px;
  border-radius: 8px;

  .el-icon {
    margin-left: 4px;
  }
}
.page-tabs :deep(.el-tabs__content) {
  padding-top: 16px;
}
</style>
