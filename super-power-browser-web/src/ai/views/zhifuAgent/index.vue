<template>
  <div class="zhifu-shell">
    <section v-if="landingVisible" class="zhifu-landing-page">
      <div class="zhifu-landing-body">
        <div class="zhifu-landing-stage">
          <div class="zhifu-landing-main">
            <header class="zhifu-landing-head">
              <p class="zhifu-landing-kicker">{{ t("zhifuAgent.landing.kicker") }}</p>
              <h1>{{ t("zhifuAgent.landing.title") }}</h1>
              <p class="zhifu-landing-desc">{{ t("zhifuAgent.landing.desc") }}</p>
            </header>
            <div class="zhifu-landing-content-wrap">
              <img
                class="zhifu-landing-content"
                :src="landingContent"
                :alt="t('zhifuAgent.landing.contentAlt')"
              />
              <div class="zhifu-landing-features">
                <div class="zhifu-landing-feature">
                  <p>选择店铺，直接运营</p>
                  <p>支持指定店铺查询数据、导出订单、查看健康情况等操作</p>
                </div>
                <div class="zhifu-landing-feature">
                  <p>不懂代码，也能打造自己的AI技能</p>
                  <p>说出你的需求，生成专属技能，还能分享给大家使用。</p>
                </div>
                <div class="zhifu-landing-feature">
                  <p>定时任务自动执行，告别重复劳动</p>
                  <p>一次设定，按时执行，把时间留给更重要的生意。</p>
                </div>
                <div class="zhifu-landing-feature">
                  <p>自有模型自由接入 · 技能中心，共享运营经验</p>
                  <p>店铺运营、日常办公，好用直接上手。</p>
                </div>
              </div>
            </div>
          </div>
          <div class="zhifu-landing-upgrade">
            <img :src="landingUpgrade" :alt="t('zhifuAgent.landing.upgradeAlt')" />
            <div class="zhifu-landing-upgrade-copy">
              <p class="zhifu-landing-upgrade-lead">
                <span>即可体验</span>
                <strong>SuperPower AI</strong>
              </p>
              <div class="zhifu-landing-perk">
                <p>包月Token不限量</p>
                <p>不再为额度担忧，任务持续稳定运行</p>
              </div>
              <div class="zhifu-landing-perk">
                <p>更多AI能力</p>
                <p>更智能、更高效，满足更多场景需求</p>
              </div>
              <div class="zhifu-landing-perk">
                <p>更流畅的使用体验</p>
                <p>性能升级，响应更快，工作更省心</p>
              </div>
            </div>
          </div>
        </div>
        <p class="zhifu-landing-tip">
          {{ t("zhifuAgent.landing.unsupported") }}
        </p>
        <button type="button" class="zhifu-landing-cta" @click="onLandingAction">
          {{ t("zhifuAgent.landing.tryNow1") }}
          <span style="color: rgb(255 249 87); margin-left: 10px">
            {{ t("zhifuAgent.landing.tryNow2") }}
          </span>
        </button>
      </div>
    </section>

    <template v-else-if="versionChecked">
      <AgentSidebar />
      <main class="zhifu-workspace">
        <KeepAlive>
          <component :is="activePageComponent" :key="store.activePage" v-bind="pageProps" />
        </KeepAlive>
      </main>
      <el-dialog
        :model-value="store.workspaceSetupOpen"
        class="workspace-setup-dialog"
        width="430px"
        append-to-body
        :show-close="false"
        :close-on-click-modal="false"
        :close-on-press-escape="false"
      >
        <div class="workspace-setup-card">
          <div class="workspace-setup-icon">
            <el-icon :size="28"><FolderOpened /></el-icon>
          </div>
          <h2>{{ t("zhifuAgent.settings.workspaceSetupTitle") }}</h2>
          <p>{{ t("zhifuAgent.settings.workspaceSetupDesc") }}</p>
          <p v-if="store.workspaceSetupError" class="workspace-setup-error">
            {{ store.workspaceSetupError }}
          </p>
          <el-button
            type="primary"
            :loading="store.workspaceSetupBusy"
            @click="store.setupInitialWorkspace()"
          >
            {{
              store.workspaceSetupBusy
                ? t("zhifuAgent.settings.workspaceSetupChoosing")
                : t("zhifuAgent.settings.workspaceSetupChoose")
            }}
          </el-button>
        </div>
      </el-dialog>
    </template>
  </div>
</template>

<script setup lang="ts">
import { FolderOpened } from "@element-plus/icons-vue";
/** 落地页左侧能力介绍图 */
import landingContent from "@/ai/assets/images/ai-features.svg";
/** 落地页右侧升级说明图，箭头高出标题 */
import landingUpgrade from "@/ai/assets/images/zhifu-landing-upgrade.png";
import { useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";


import ModelManagePage from "@/ai/views/modelManage/modelNew.vue";
import ModelUsagePage from "@/ai/views/modelManage/modelUsageNew.vue";
import ChatPage from "./chat/index.vue";
import AgentSidebar from "./components/AgentSidebar.vue";
import ScheduledPage from "./scheduled/index.vue";
import SettingsPage from "./settings/index.vue";
import SkillsPage from "./skills/index.vue";




const store = useZhifuAgentStore();
const { t } = useI18n();

/** 确认桌面 AI 桥接后再显示工作区，避免初始化闪烁 */
const versionChecked = ref(false);
/** 浏览器页面未连接桌面 AI 服务 */
const needsUpgrade = ref(false);
const landingVisible = computed(() => versionChecked.value && needsUpgrade.value);

const checkLandingVersion = async () => {
  needsUpgrade.value = !(window as any).localflow;
  versionChecked.value = true;
  if (!needsUpgrade.value) void enterWorkspace();
};

const onLandingAction = () => {
  ElMessage.info("请从 SuperPower Browser 客户端打开SuperPower AI");
};

const pages = {
  chat: ChatPage,
  skills: SkillsPage,
  scheduled: ScheduledPage,
  settings: SettingsPage,
  model: ModelManagePage,
  modelUsage: ModelUsagePage,
};
const activePageComponent = computed(() => pages[store.activePage]);
const pageProps = computed(() => (store.activePage === "modelUsage" ? { detail: true } : {}));

// The store survives route changes; every new entry starts at the main chat.
let enteringWorkspace: Promise<void> | undefined;
function enterWorkspace() {
  if (!enteringWorkspace) {
    enteringWorkspace = store.enterMainConversation().finally(() => {
      enteringWorkspace = undefined;
    });
  }
  return enteringWorkspace;
}

onActivated(() => {
  if (versionChecked.value && !needsUpgrade.value) void enterWorkspace();
});

onMounted(() => {
  void checkLandingVersion();
});
</script>

<style lang="scss" scoped>
.zhifu-shell {
  display: flex;
  height: 100%;
  min-height: 520px;
  overflow: hidden;
  background: var(--el-bg-color);
  border-radius: 8px;
}

.zhifu-workspace {
  flex: 1;
  min-width: 0;
  min-height: 0;
  overflow: auto;
}

.zhifu-landing-page {
  display: flex;
  flex: 1;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 28px 32px 36px;
  overflow: auto;
  background: #fff;
}

.zhifu-landing-body {
  width: min(1080px, 100%);
}

.zhifu-landing-stage {
  display: flex;
  align-items: flex-end;
  gap: 14px;
}

.zhifu-landing-main {
  flex: 780 1 0;
  min-width: 0;
}

.zhifu-landing-head {
  margin: 0 0 16px;
  text-align: left;

  h1 {
    margin: 6px 0 0;
    font-size: 30px;
    font-weight: 700;
    line-height: 1.25;
    color: #1a1a1a;
  }
}

.zhifu-landing-kicker {
  margin: 0;
  font-size: 26px;
  font-weight: 600;
  line-height: 1.2;
  color: #2f6bff;
}

.zhifu-landing-desc {
  margin: 10px 0 0;
  font-size: 13px;
  line-height: 1.6;
  color: #8b95a6;
}

.zhifu-landing-content-wrap,
.zhifu-landing-upgrade {
  position: relative;
  container-type: inline-size;
}

.zhifu-landing-content,
.zhifu-landing-upgrade img {
  display: block;
  width: 100%;
  height: auto;
}

.zhifu-landing-features,
.zhifu-landing-upgrade-copy {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.zhifu-landing-feature,
.zhifu-landing-perk,
.zhifu-landing-upgrade-lead {
  position: absolute;
  margin: 0;

  p,
  span,
  strong {
    margin: 0;
  }
}

.zhifu-landing-feature {
  left: 13%;
  right: 40%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  height: 15.3%;

  p:first-child {
    font-size: 1.95cqw;
    font-weight: 700;
    line-height: 1.25;
    color: #1c2b4a;
    white-space: nowrap;
  }

  p:last-child {
    margin-top: 0.35cqw;
    font-size: 1.5cqw;
    line-height: 1.3;
    color: #8b95a6;
    white-space: nowrap;
  }

  &:nth-child(1) {
    top: 13.5%;
  }

  &:nth-child(2) {
    top: 33.7%;
  }

  &:nth-child(3) {
    top: 54%;
  }

  &:nth-child(4) {
    top: 74.2%;
  }
}

.zhifu-landing-upgrade {
  flex: 337 1 0;
  min-width: 0;
}

.zhifu-landing-upgrade-lead {
  top: 42.5%;
  left: 7.5%;
  right: 8%;

  span,
  strong {
    display: block;
    line-height: 1.35;
    white-space: nowrap;
  }

  span {
    font-size: 4.6cqw;
    font-weight: 600;
    color: #1a1a1a;
  }

  strong {
    font-size: 5.3cqw;
    font-weight: 700;
    color: #2f6bff;
  }
}

.zhifu-landing-perk {
  left: 23%;
  right: 5%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  transform: translateY(-50%);

  p:first-child {
    font-size: 4.15cqw;
    font-weight: 700;
    line-height: 1.25;
    color: #1c2b4a;
    white-space: nowrap;
  }

  p:last-child {
    margin-top: 0.6cqw;
    font-size: 3.15cqw;
    line-height: 1.3;
    color: #8b95a6;
    white-space: nowrap;
  }

  &:nth-child(2) {
    top: 61.8%;
  }

  &:nth-child(3) {
    top: 74.7%;
  }

  &:nth-child(4) {
    top: 88.9%;
  }
}

.zhifu-landing-tip {
  margin: 20px 0 0;
  font-size: 14px;
  line-height: 1.6;
  color: #ef4444;
  text-align: center;
}

.zhifu-landing-cta {
  border-radius: 28px;

  background: linear-gradient(270deg, #2858f5 0%, #459efb 100%);

  display: flex;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  width: 388px;
  max-width: 100%;
  height: 56px;
  margin: 44px auto 0;
  padding: 0 28px;
  font-size: 22px;
  font-weight: 600;
  line-height: 1;
  color: #fff;
  letter-spacing: 0.5px;
  cursor: pointer;
  border: 0;
  &:hover {
    background: linear-gradient(90deg, #3d7ef5 0%, #245fe8 100%);
  }
}

.zhifu-landing-tip + .zhifu-landing-cta {
  margin-top: 16px;
}
</style>

<style lang="scss">
.workspace-setup-dialog.el-dialog {
  border-radius: 14px;

  .el-dialog__header {
    display: none;
  }

  .el-dialog__body {
    padding: 30px;
  }

  .workspace-setup-card {
    text-align: center;
  }

  .workspace-setup-icon {
    display: grid;
    place-items: center;
    width: 56px;
    height: 56px;
    margin: 0 auto 16px;
    color: #3370ff;
    background: #eef4ff;
    border-radius: 8px;
  }

  h2 {
    margin: 0 0 10px;
    font-size: 19px;
    font-weight: 600;
    color: #111827;
  }

  p {
    margin: 0 0 22px;
    font-size: 13px;
    line-height: 1.7;
    color: #64748b;
  }

  .workspace-setup-error {
    color: #ef4444;
  }
}
</style>
