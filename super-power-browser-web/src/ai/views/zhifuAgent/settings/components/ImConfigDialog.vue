<template>
  <el-dialog
    :model-value="!!provider"
    :title="t('zhifuAgent.settings.messagingScanTitle', { name: providerLabel })"
    width="560px"
    append-to-body
    destroy-on-close
    :close-on-click-modal="false"
    @open="startScan"
    @closed="stopScan"
  >
    <div class="scan-body">
      <p class="desc">
        {{ t("zhifuAgent.settings.messagingScanDesc", { name: providerLabel }) }}
      </p>
      <div v-if="!qrUrl" class="scan-loading">
        <el-icon class="is-loading" :size="30"><Loading /></el-icon>
        <span>{{ t("zhifuAgent.settings.messagingScanLoading") }}</span>
      </div>
      <template v-else>
        <div class="scan-steps">
          <span>1. {{ t("zhifuAgent.settings.messagingScanStep1", { name: providerLabel }) }}</span>
          <span>2. {{ t("zhifuAgent.settings.messagingScanStep2") }}</span>
          <span>3. {{ t("zhifuAgent.settings.messagingScanStep3") }}</span>
        </div>
        <div class="qr-wrap">
          <div class="qr-box">
            <qrcode-vue :value="qrUrl" :size="220" level="H" />
            <el-button
              class="refresh-button"
              circle
              :icon="Refresh"
              :loading="refreshing"
              :aria-label="t('zhifuAgent.settings.messagingRefreshQr')"
              @click="startScan"
            />
          </div>
          <span v-if="polling">{{ t("zhifuAgent.settings.messagingScanWaiting") }}</span>
        </div>
      </template>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import QrcodeVue from "@chenfengyuan/vue-qrcode";
import { Loading, Refresh } from "@element-plus/icons-vue";
import type { MessageChannelCategoryId, MessageChannelConfig } from "@/ai/api/zhifuAgent";
import { errorMessage, useZhifuAgentStore } from "@/ai/store/modules/zhifu-agent.store";
import type { ZhifuImProvider } from "@/ai/utils/electronApi";
import {
  feishuRegistrationBegin,
  feishuRegistrationInit,
  feishuRegistrationPoll,
} from "@/ai/utils/feishuAppRegistration";
import { weixinLoginQrPoll, weixinLoginQrStart } from "@/ai/utils/weixinAppRegistration";
import { wecomQcGenerate, wecomQcQuery } from "@/ai/utils/wecomAppRegistration";

const provider = defineModel<ZhifuImProvider | "">({ default: "" });
const emit = defineEmits<{ configured: [provider: ZhifuImProvider] }>();

const store = useZhifuAgentStore();
const { t } = useI18n();

const categoryIds: Record<ZhifuImProvider, MessageChannelCategoryId> = {
  feishu: 1,
  wechat: 4,
  wecom: 5,
};

const qrUrl = ref("");
const polling = ref(false);
const refreshing = ref(false);
const providerLabel = computed(() => (provider.value ? t(`zhifuAgent.im.${provider.value}`) : ""));
let activeFlowId = 0;

const sleep = (duration: number) => new Promise((resolve) => window.setTimeout(resolve, duration));

function stopScan() {
  activeFlowId += 1;
  qrUrl.value = "";
  polling.value = false;
  refreshing.value = false;
  provider.value = "";
}

async function saveScannedChannel(
  flowId: number,
  appId: string,
  appSecret: string,
  extra: Partial<MessageChannelConfig> = {}
) {
  if (!provider.value || flowId !== activeFlowId) return;
  const categoryId = categoryIds[provider.value];
  await store.saveMessageChannel({
    ...store.findMessageChannel(categoryId),
    ...extra,
    categoryId,
    appId,
    appSecret,
    enabled: true,
  });
  if (flowId !== activeFlowId) return;
  const configured = provider.value;
  ElMessage.success(t("zhifuAgent.settings.messagingScanSuccess", { name: providerLabel.value }));
  emit("configured", configured);
  provider.value = "";
}

async function scanFeishu(flowId: number) {
  const init = await feishuRegistrationInit();
  if (flowId !== activeFlowId) return;
  if (!init.supported_auth_methods?.includes("client_secret")) {
    throw new Error(t("zhifuAgent.settings.messagingScanUnsupported"));
  }
  const begin = await feishuRegistrationBegin();
  if (flowId !== activeFlowId) return;
  qrUrl.value = begin.verification_uri_complete;
  polling.value = true;
  let interval = (begin.interval ?? 5) * 1000;
  const deadline = Date.now() + (begin.expire_in ?? 600) * 1000;

  while (Date.now() < deadline && flowId === activeFlowId) {
    const result = await feishuRegistrationPoll(begin.device_code);
    if (flowId !== activeFlowId) return;
    if (result.client_id && result.client_secret) {
      await saveScannedChannel(flowId, String(result.client_id), String(result.client_secret));
      return;
    }
    if (result.error === "slow_down") interval += 5000;
    else if (result.error === "access_denied")
      throw new Error(t("zhifuAgent.settings.messagingScanDenied"));
    else if (result.error === "expired_token") break;
    else if (result.error && result.error !== "authorization_pending") {
      throw new Error(String(result.error_description || result.error));
    }
    await sleep(interval);
  }
  if (flowId === activeFlowId) throw new Error(t("zhifuAgent.settings.messagingScanExpired"));
}

async function scanWechat(flowId: number) {
  const result = await weixinLoginQrStart();
  if (flowId !== activeFlowId) return;
  if (!result.qrcode || !result.qrcode_img_content) {
    throw new Error(t("zhifuAgent.settings.messagingScanFailed"));
  }
  qrUrl.value = result.qrcode_img_content;
  polling.value = true;
  const deadline = Date.now() + 8 * 60 * 1000;

  while (Date.now() < deadline && flowId === activeFlowId) {
    try {
      const status = await weixinLoginQrPoll(result.qrcode);
      if (flowId !== activeFlowId) return;
      if (status.status === "confirmed" && status.ilink_bot_id && status.bot_token) {
        await saveScannedChannel(flowId, status.ilink_bot_id, status.bot_token, {
          baseurl: status.baseurl,
          ilink_user_id: status.ilink_user_id,
        });
        return;
      }
      if (status.status === "expired") break;
    } catch {
      if (flowId !== activeFlowId) return;
    }
    await sleep(1000);
  }
  if (flowId === activeFlowId) throw new Error(t("zhifuAgent.settings.messagingScanExpired"));
}

async function scanWecom(flowId: number) {
  const result = await wecomQcGenerate();
  if (flowId !== activeFlowId) return;
  qrUrl.value = result.auth_url;
  polling.value = true;
  const deadline = Date.now() + 5 * 60 * 1000;

  while (Date.now() < deadline && flowId === activeFlowId) {
    try {
      const status = await wecomQcQuery(result.scode);
      if (flowId !== activeFlowId) return;
      if (status.status === "success" && status.botid && status.secret) {
        await saveScannedChannel(flowId, status.botid, status.secret);
        return;
      }
    } catch {
      if (flowId !== activeFlowId) return;
    }
    await sleep(3000);
  }
  if (flowId === activeFlowId) throw new Error(t("zhifuAgent.settings.messagingScanExpired"));
}

async function startScan() {
  if (!provider.value) return;
  const flowId = (activeFlowId += 1);
  const currentProvider = provider.value;
  qrUrl.value = "";
  polling.value = false;
  refreshing.value = true;
  try {
    if (currentProvider === "feishu") await scanFeishu(flowId);
    else if (currentProvider === "wechat") await scanWechat(flowId);
    else await scanWecom(flowId);
  } catch (cause) {
    if (flowId === activeFlowId) {
      ElMessage.error(errorMessage(cause, t("zhifuAgent.settings.messagingScanFailed")));
    }
  } finally {
    if (flowId === activeFlowId) {
      polling.value = false;
      refreshing.value = false;
    }
  }
}

onBeforeUnmount(() => {
  activeFlowId += 1;
});
</script>

<style lang="scss" scoped>
.scan-body {
  min-height: 360px;
}

.desc {
  margin: 0 0 16px;
  color: var(--el-text-color-secondary);
  text-align: center;
}

.scan-loading {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  justify-content: center;
  min-height: 280px;
  color: var(--el-text-color-secondary);
}

.scan-steps {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 12px 16px;
  margin-bottom: 18px;
  font-size: 13px;
  color: var(--el-text-color-regular);
  background: var(--el-fill-color-light);
  border-radius: 8px;
}

.qr-wrap {
  display: flex;
  flex-direction: column;
  gap: 12px;
  align-items: center;
  color: var(--el-text-color-secondary);
}

.qr-box {
  position: relative;
  padding: 12px;
  background: #fff;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
}

.refresh-button {
  position: absolute;
  right: -14px;
  bottom: -14px;
}
</style>
