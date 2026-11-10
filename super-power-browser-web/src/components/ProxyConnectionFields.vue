<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { proxyApi, type ProxyRecord } from '@/api/proxy/proxy.api';
import { PROXY_PROTOCOLS } from '@/utils/proxyImport';
import { prepareProxyOptions, type ProxyConnection, type ProxyOptions } from '@/utils/proxyOptions.mjs';
import { copyProxyConnection, RELAY_PROTOCOLS } from '@/utils/proxyRoutes.mjs';
import ProxyAdvancedFields from './ProxyAdvancedFields.vue';

const props = withDefaults(defineProps<{depth: number; transit?: boolean; excludeId?: string}>(), {transit: false});
const emit = defineEmits<{loading: [value: boolean]}>();
const connection = defineModel<ProxyConnection>({required: true});
watch(() => connection.value, value => { value.proxyOptions = prepareProxyOptions(value.protocol, value.proxyOptions); }, {immediate: true});
const choices = computed(() => props.transit ? RELAY_PROTOCOLS : PROXY_PROTOCOLS);
const usesAccount = computed(() => ['http','https','socks5','socks4','socks4a','ssh'].includes(connection.value.protocol));
const usesPassword = computed(() => !['vmess','vless','socks4','socks4a'].includes(connection.value.protocol));
const advanced = computed<ProxyOptions>({get: () => connection.value.proxyOptions || {}, set: value => { connection.value.proxyOptions = value; }});
const sources = ref<ProxyRecord[]>([]), selected = ref<string>(), searching = ref(false), copying = ref(false), error = ref('');
let searchRequest: AbortController | undefined, copyRequest: AbortController | undefined;
function changedProtocol() {
  connection.value.proxyOptions = prepareProxyOptions(connection.value.protocol, connection.value.proxyOptions, true);
  if (['socks4','socks4a'].includes(connection.value.protocol)) connection.value.password = '';
}
async function search(query = '') {
  searchRequest?.abort(); const request = new AbortController(); searchRequest = request; searching.value = true; error.value = '';
  try {
    const result = await proxyApi.list({query, page: 1, size: 50, recycled: false}, request.signal);
    if (!request.signal.aborted) sources.value = result.items.filter(item => item.id !== props.excludeId && choices.value.includes(item.protocol));
  } catch (failure) { if (!request.signal.aborted) error.value = failure instanceof Error ? failure.message : '代理列表读取失败'; }
  finally { if (searchRequest === request) searching.value = false; }
}
async function copy(id?: string) {
  if (!id) return;
  copyRequest?.abort(); const request = new AbortController(); copyRequest = request; copying.value = true; error.value = ''; emit('loading', true);
  try {
    const [record, credentials] = await Promise.all([proxyApi.get(id, request.signal), proxyApi.credentials(id, request.signal)]);
    if (!request.signal.aborted) connection.value = copyProxyConnection(record, credentials, props.depth, props.transit);
  } catch (failure) { if (!request.signal.aborted) error.value = failure instanceof Error ? failure.message : '代理连接信息读取失败'; }
  finally { if (copyRequest === request) { copying.value = false; selected.value = undefined; emit('loading', false); } }
}
onBeforeUnmount(() => {
  searchRequest?.abort(); copyRequest?.abort(); copyRequest = undefined;
  if (copying.value) { copying.value = false; emit('loading', false); }
  sources.value = [];
});
</script>

<template>
  <div class="connection-fields">
    <div class="copy-connection wide">
      <el-select v-model="selected" filterable remote clearable :remote-method="search" :loading="searching || copying" :disabled="copying" placeholder="从已添加的代理复制，也可直接填写下方信息" @visible-change="value => value && search()" @change="copy">
        <el-option v-for="item in sources" :key="item.id" :value="item.id" :label="`${item.name} · ${item.protocol.toUpperCase()} · ${item.host}:${item.port}`"/>
      </el-select>
      <div class="field-tip">仅复制主线路及其中转。复制后独立保存，来源代理的后续修改不会自动同步。</div>
      <el-alert v-if="error" :title="error" type="error" :closable="false"/>
    </div>
    <el-form-item label="协议" required><el-select v-model="connection.protocol" :disabled="copying" @change="changedProtocol"><el-option v-for="protocol in choices" :key="protocol" :value="protocol" :label="protocol.toUpperCase()"/></el-select></el-form-item>
    <el-form-item label="端口" required><el-input-number v-model="connection.port" :disabled="copying" :min="1" :max="65535" :precision="0" controls-position="right"/></el-form-item>
    <el-form-item label="代理地址" required class="wide"><el-input v-model="connection.host" :disabled="copying" autocomplete="off" placeholder="IP 或主机名，不含协议前缀"/></el-form-item>
    <el-form-item v-if="usesAccount" label="代理账号" :required="connection.protocol === 'ssh'"><el-input v-model="connection.username" :disabled="copying" autocomplete="off" placeholder="无认证时留空"/></el-form-item>
    <el-form-item v-if="usesPassword" label="代理密码" :required="['ss','ssr'].includes(connection.protocol)" :class="{'wide': !usesAccount}"><el-input v-model="connection.password" :disabled="copying" type="password" show-password autocomplete="new-password" placeholder="无认证时留空"/></el-form-item>
    <div v-if="usesAccount" class="wide credential-action"><el-button link type="danger" :disabled="copying" @click="connection.username = ''; connection.password = ''">清除该节点账号和密码</el-button></div>
    <ProxyAdvancedFields v-model="advanced" :protocol="connection.protocol"/>
  </div>
</template>

<style scoped>
.connection-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 16px}.wide{grid-column:1/-1}.copy-connection{margin-bottom:16px}.field-tip{margin-top:6px;color:var(--el-text-color-secondary);font-size:12px;line-height:1.6}.credential-action{margin-bottom:16px}.connection-fields :deep(.el-select),.connection-fields :deep(.el-input-number){width:100%}@media(max-width:650px){.connection-fields{grid-template-columns:1fr}}
</style>
