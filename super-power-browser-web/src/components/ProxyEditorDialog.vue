<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { ElMessage } from 'element-plus';
import { proxyApi, type ProxyInput, type ProxyRecord } from '@/api/proxy/proxy.api';
import { parseProxyImport, PROXY_PROTOCOLS, validateChangeIpUrl, validateProxyAddress, type ProxyProtocol } from '@/utils/proxyImport';
import ProxyAdvancedFields from './ProxyAdvancedFields.vue';
import ProxyRoutesFields from './ProxyRoutesFields.vue';
import { prepareProxyOptions, validateProxyOptions, type ProxyOptions } from '@/utils/proxyOptions.mjs';
import { validateProxyRoutes } from '@/utils/proxyRoutes.mjs';

const props = defineProps<{modelValue: boolean; proxy?: ProxyRecord; defaultWebType?: number}>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>();
const mode = ref('single'), busy = ref(false), text = ref(''), error = ref(''), uncertain = ref(false);
const clearCredentials = ref(false), clearChangeIp = ref(false);
const routeLoads = ref(0);
const credentialsLoading = ref(false), credentialsError = ref(''), credentialsReady = ref(false), editorSession = ref(0);
const credentialsBlocked = computed(() => Boolean(props.proxy) && !credentialsReady.value);
const usesAccount = computed(() => ['http','https','socks5','socks4','socks4a','ssh'].includes(form.protocol));
const usesPassword = computed(() => !['vmess','vless','socks4','socks4a'].includes(form.protocol));
const protocolChoices = computed(() => mode.value === 'batch' ? PROXY_PROTOCOLS.filter(value => !['ss','ssr','vmess','vless'].includes(value)) : PROXY_PROTOCOLS);
let credentialsRequest: AbortController | undefined, credentialsVersion = 0, savedPasswordExists = false;
const form = reactive({name: '', protocol: 'http' as ProxyProtocol, host: '', port: 8080 as number | undefined, username: '', password: '', webType: 2,
  region: '', remark: '', provider: '', mapIp: '', changeIpUrl: '', expiresAt: undefined as Date | undefined, proxyOptions: {} as ProxyOptions});
const preview = computed(() => parseProxyImport(text.value, form.protocol));
const invalidCount = computed(() => preview.value.rows.filter(row => row.error).length);
const canImport = computed(() => preview.value.total > 0 && !preview.value.error && !invalidCount.value);

function clearSensitiveFields() {
  form.username = ''; form.password = ''; form.changeIpUrl = ''; form.proxyOptions = {}; text.value = ''; savedPasswordExists = false;
}
function stopCredentialsRequest() {
  credentialsVersion++; credentialsRequest?.abort(); credentialsRequest = undefined;
  credentialsLoading.value = false; credentialsReady.value = false;
}
async function loadCredentials() {
  const id = props.proxy?.id;
  if (!props.modelValue || !id) return;
  stopCredentialsRequest();
  const version = credentialsVersion, controller = new AbortController();
  credentialsRequest = controller; credentialsLoading.value = true; credentialsError.value = '';
  form.username = ''; form.password = ''; savedPasswordExists = false;
  const current = () => version === credentialsVersion && props.modelValue && props.proxy?.id === id;
  try {
    const credentials = await proxyApi.credentials(id, controller.signal);
    if (!current()) return;
    if (typeof credentials?.username !== 'string' || typeof credentials?.password !== 'string') throw new Error('账号密码读取结果不完整');
    form.username = credentials.username; form.password = credentials.password;
    if (['ss','ssr','vmess','vless'].includes(form.protocol) && !credentials.proxyOptions) throw new Error('代理连接参数读取结果不完整');
    form.proxyOptions = prepareProxyOptions(form.protocol, credentials.proxyOptions);
    savedPasswordExists = Boolean(credentials.password); credentialsReady.value = true;
  } catch (failure) {
    if (current()) credentialsError.value = `读取已保存的账号密码失败：${failure instanceof Error ? failure.message : '请稍后重试'}`;
  } finally {
    if (current()) { credentialsLoading.value = false; credentialsRequest = undefined; }
  }
}
watch([() => props.modelValue, () => props.proxy?.id], ([open]) => {
  stopCredentialsRequest(); clearSensitiveFields(); credentialsError.value = '';
  if (!open) return;
  editorSession.value++;
  const row = props.proxy;
  mode.value = 'single'; text.value = ''; error.value = ''; uncertain.value = false;
  clearCredentials.value = false; clearChangeIp.value = false;
  Object.assign(form, {name: row?.name || '', protocol: row?.protocol || 'http', host: row?.host || '', port: row?.port || 8080,
    username: row?.username || '', password: '', webType: row?.webType || props.defaultWebType || 2, region: row?.region || '',
    remark: row?.remark || '', provider: row?.provider || '', mapIp: row?.mapIp || '', changeIpUrl: '',
    expiresAt: row?.expiresAt ? new Date(row.expiresAt) : undefined, proxyOptions: prepareProxyOptions(row?.protocol || 'http')});
  if (row) void loadCredentials();
}, {immediate: true});
onBeforeUnmount(() => { stopCredentialsRequest(); clearSensitiveFields(); });
watch(() => form.protocol, (protocol, previous) => {
  form.proxyOptions = prepareProxyOptions(protocol, form.proxyOptions, protocol !== previous);
  clearCredentials.value = false;
}, {flush: 'sync'});
watch(mode, value => { if (value === 'batch' && ['ss','ssr','vmess','vless'].includes(form.protocol)) form.protocol = 'http'; });

function close() {
  if (busy.value) return;
  stopCredentialsRequest(); clearSensitiveFields(); emit('update:modelValue', false);
}
function singlePayload(): ProxyInput {
  const address = validateProxyAddress(form.host, form.port);
  if (usesAccount.value && !clearCredentials.value && (form.password || savedPasswordExists) && !form.username) throw new Error('使用密码时必须填写代理账号；不再使用认证请勾选清除账号和密码');
  if (form.protocol === 'ssh' && (!form.username || clearCredentials.value)) throw new Error('SSH 代理需要填写账号');
  const options = validateProxyRoutes(form.protocol, validateProxyOptions(form.protocol, form.proxyOptions, clearCredentials.value ? '' : form.password || (savedPasswordExists ? 'saved' : '')));
  const payload: ProxyInput = {name: form.name.trim() || `${address.host}:${address.port}`, ...address, protocol: form.protocol,
    username: clearCredentials.value ? '' : form.username, webType: form.webType, region: form.region.trim(), remark: form.remark.trim(),
    provider: form.provider.trim(), mapIp: form.mapIp.trim(), expiresAt: form.expiresAt ? form.expiresAt.toISOString() : null, proxyOptions: options};
  if (['socks4','socks4a'].includes(form.protocol)) payload.password = '';
  else if (clearCredentials.value) payload.password = '';
  else if (!props.proxy || form.password) payload.password = form.password;
  if (clearChangeIp.value) payload.changeIpUrl = '';
  else if (!props.proxy || form.changeIpUrl.trim()) payload.changeIpUrl = validateChangeIpUrl(form.changeIpUrl.trim());
  return payload;
}
async function save() {
  if (busy.value || uncertain.value || credentialsBlocked.value || routeLoads.value > 0) return;
  error.value = '';
  let payload: ProxyInput | ProxyInput[];
  try {
    if (mode.value === 'batch' && !props.proxy) {
      if (!canImport.value) throw new Error(preview.value.error || '请先修正所有错误行后再添加');
      payload = preview.value.rows.map(row => ({...row.proxy!, webType: form.webType, provider: form.provider.trim(), region: form.region.trim(), expiresAt: null}));
    } else payload = singlePayload();
  } catch (failure) { error.value = failure instanceof Error ? failure.message : '请检查代理信息'; return; }
  busy.value = true;
  try {
    if (Array.isArray(payload)) await proxyApi.import(payload);
    else if (props.proxy) await proxyApi.update(props.proxy.id, payload);
    else await proxyApi.create(payload);
    ElMessage.success(Array.isArray(payload) ? `已添加 ${payload.length} 条代理` : props.proxy ? '代理已保存' : '代理已添加');
    clearSensitiveFields();
    emit('done'); emit('update:modelValue', false);
  } catch (failure) {
    const message = failure instanceof Error ? failure.message : '保存失败';
    if (failure instanceof TypeError || failure instanceof SyntaxError || /fetch|network|网络|timeout/i.test(message)) {
      uncertain.value = true;
      error.value = '网络连接中断，保存结果尚未确认。请关闭窗口并刷新代理列表核对，避免重复添加。';
      emit('done');
    } else error.value = message;
  } finally { busy.value = false; }
}
</script>

<template>
  <el-dialog :model-value="modelValue" :title="proxy ? '编辑代理' : '添加代理'" width="860px" top="5vh" class="proxy-editor" :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy" @update:model-value="close">
    <el-tabs v-if="!proxy" v-model="mode"><el-tab-pane label="单个添加" name="single"/><el-tab-pane label="批量添加" name="batch"/></el-tabs>
    <el-alert v-if="credentialsLoading" title="正在读取已保存的代理账号和密码…" type="info" :closable="false"/>
    <el-alert v-else-if="credentialsError" :title="credentialsError" type="error" :closable="false"><el-button link type="primary" @click="loadCredentials">重新读取</el-button></el-alert>
    <el-form label-position="top" class="proxy-fields" :disabled="busy || uncertain || credentialsBlocked">
      <el-form-item label="网络类型"><el-radio-group v-model="form.webType"><el-radio :value="2">静态代理</el-radio><el-radio :value="1">动态代理</el-radio></el-radio-group></el-form-item>
      <el-form-item :label="mode === 'batch' ? '默认代理协议' : '代理协议'" required><el-select v-model="form.protocol"><el-option v-for="protocol in protocolChoices" :key="protocol" :value="protocol" :label="protocol.toUpperCase()"/></el-select></el-form-item>
      <el-form-item label="供应商（可选）"><el-input v-model="form.provider" maxlength="100" placeholder="例如：供应商名称"/></el-form-item>
      <el-form-item label="国家 / 地区（可选）"><el-input v-model="form.region" maxlength="100" placeholder="填写供应商提供的出口地区"/></el-form-item>
      <template v-if="mode === 'single' || proxy">
        <el-form-item label="代理名称（可选）" class="wide"><el-input v-model="form.name" maxlength="100" placeholder="留空使用代理地址和端口"/></el-form-item>
        <el-form-item label="代理地址" required><el-input v-model="form.host" autocomplete="off" placeholder="IP 或主机名，不含协议前缀"/></el-form-item>
        <el-form-item label="代理端口" required><el-input-number v-model="form.port" :min="1" :max="65535" :precision="0" controls-position="right"/></el-form-item>
        <el-form-item v-if="usesAccount" label="代理账号" :required="form.protocol === 'ssh'"><el-input v-model="form.username" :disabled="clearCredentials" autocomplete="off" placeholder="无认证时留空"/></el-form-item>
        <el-form-item v-if="usesPassword" label="代理密码" :required="['ss','ssr'].includes(form.protocol)" :class="{'wide': !usesAccount}"><el-input :key="editorSession" v-model="form.password" :disabled="clearCredentials" type="password" show-password autocomplete="new-password" :placeholder="proxy ? '留空保留原密码' : ['ss','ssr'].includes(form.protocol) ? '供应商提供的代理密码' : '无认证时留空'"/><div v-if="proxy && credentialsReady" class="field-tip">已读取保存的账号密码，点击眼睛可查看密码。留空保留原密码。</div></el-form-item>
        <div v-if="proxy && usesAccount" class="wide"><el-checkbox v-model="clearCredentials">清除已保存的代理账号和密码</el-checkbox></div>
        <ProxyAdvancedFields v-model="form.proxyOptions" :protocol="form.protocol"/>
        <ProxyRoutesFields v-model="form.proxyOptions" :protocol="form.protocol" :exclude-id="proxy?.id" @loading="routeLoads = Math.max(0, routeLoads + $event)"/>
        <div v-if="proxy" class="wide field-tip">连接参数和线路配置的修改将在店铺下次打开时生效；已打开店铺继续使用当前连接。</div>
        <el-form-item label="到期时间（可选）"><el-date-picker v-model="form.expiresAt" type="datetime" placeholder="按供应商提供的时间填写" clearable/></el-form-item>
        <el-form-item label="预期出口 IP（可选）"><el-input v-model="form.mapIp" placeholder="用于记录供应商提供的出口 IP"/></el-form-item>
        <el-form-item label="换 IP 链接（可选）" class="wide">
          <el-input v-model="form.changeIpUrl" :disabled="clearChangeIp" type="password" show-password autocomplete="new-password" :placeholder="proxy?.hasChangeIpUrl ? '已保存链接，留空保留；填写新链接将替换' : '供应商提供的 HTTP / HTTPS 换 IP 链接'"/>
          <div class="field-tip">仅在供应商支持时填写。主动换 IP 会影响使用该代理的所有店铺。</div>
          <el-checkbox v-if="proxy?.hasChangeIpUrl" v-model="clearChangeIp">清除已保存的换 IP 链接</el-checkbox>
        </el-form-item>
        <el-form-item label="备注（可选）" class="wide"><el-input v-model="form.remark" type="textarea" :rows="2" maxlength="500" show-word-limit/></el-form-item>
      </template>
      <template v-else>
        <el-form-item label="代理信息" class="wide" required>
          <el-input v-model="text" type="textarea" :rows="7" :spellcheck="false" autocomplete="off" placeholder="每行一条，最多 500 条。示例：&#10;proxy.example.com:8080&#10;proxy.example.com:8080:账号:密码&#10;socks5://账号:密码@proxy.example.com:1080{店铺备注}[https://供应商地址/换IP]"/>
          <div class="field-tip">支持 地址:端口、地址:端口:账号:密码、账号:密码@地址:端口，以及 SS / SSR / VMess / VLESS 完整分享链接。IPv6 地址使用 [地址]:端口；行末可添加 {备注} 和 [换 IP 链接]。带协议的行优先使用该行协议。</div>
        </el-form-item>
      </template>
    </el-form>
    <template v-if="mode === 'batch' && !proxy">
      <el-alert v-if="preview.error" :title="preview.error" type="error" :closable="false"/>
      <template v-else-if="preview.total">
        <p class="preview-summary">共 {{preview.total}} 条，{{preview.total - invalidCount}} 条格式正确<span v-if="invalidCount" class="text-danger">，{{invalidCount}} 条需要修改</span>。每行新增一条代理，相同网关的不同账号会分别保存。</p>
        <el-table :data="preview.rows" max-height="270" size="small" row-key="line">
          <el-table-column prop="line" label="行" width="45"/>
          <el-table-column label="代理地址" min-width="180"><template #default="{row}">{{row.proxy ? `${row.proxy.host}:${row.proxy.port}` : '—'}}</template></el-table-column>
          <el-table-column label="协议" width="80"><template #default="{row}">{{row.proxy?.protocol.toUpperCase() || '—'}}</template></el-table-column>
          <el-table-column label="账号 / 密码" min-width="130"><template #default="{row}"><span>{{row.proxy?.username || '—'}}</span><div class="field-tip">{{row.proxy?.password ? '••••••••' : '未填写密码'}}</div></template></el-table-column>
          <el-table-column label="备注 / 换 IP" min-width="120"><template #default="{row}">{{row.proxy?.remark || '—'}}<div v-if="row.proxy?.changeIpUrl" class="field-tip">已填写换 IP 链接</div></template></el-table-column>
          <el-table-column label="校验" min-width="190"><template #default="{row}"><span :class="row.error ? 'text-danger' : 'text-success'">{{row.error || '格式正确'}}</span></template></el-table-column>
        </el-table>
      </template>
    </template>
    <el-alert v-if="form.webType === 1" class="editor-notice" title="动态代理的实际出口 IP 和保持时长由供应商决定。请填写供应商提供的网关与会话账号，再检测实际出口。" type="info" :closable="false"/>
    <el-alert v-if="error" class="editor-notice" :title="error" type="error" :closable="false"/>
    <template #footer><el-button :disabled="busy" @click="close">取消</el-button><el-button type="primary" :loading="busy" :disabled="uncertain || credentialsBlocked || routeLoads > 0 || (mode === 'batch' && !canImport)" @click="save">{{proxy ? '保存' : mode === 'batch' ? `添加${canImport ? ` ${preview.total} 条代理` : ''}` : '添加代理'}}</el-button></template>
  </el-dialog>
</template>

<style scoped>
:global(.el-dialog.proxy-editor){display:flex;flex-direction:column;max-height:90vh}:global(.proxy-editor .el-dialog__body){overflow-y:auto;min-height:0}:global(.proxy-editor .el-dialog__header),:global(.proxy-editor .el-dialog__footer){flex-shrink:0}
.proxy-fields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 24px}.wide{grid-column:1/-1}.proxy-fields :deep(.el-select),.proxy-fields :deep(.el-input-number),.proxy-fields :deep(.el-date-editor){width:100%}.field-tip{font-size:12px;line-height:1.6;color:var(--el-text-color-secondary);margin-top:5px}.preview-summary{font-size:13px;line-height:1.7}.text-danger{color:var(--el-color-danger)}.text-success{color:var(--el-color-success)}.editor-notice{margin-top:16px}@media(max-width:650px){.proxy-fields{grid-template-columns:1fr}}
</style>
