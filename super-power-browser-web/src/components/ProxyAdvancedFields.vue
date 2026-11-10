<script setup lang="ts">
import { computed, watch } from 'vue';
import { SS_METHODS, SSR_METHODS, SSR_PROTOCOLS, SSR_OBFS, TRANSPORTS, type ProxyOptions } from '@/utils/proxyOptions.mjs';

const props = defineProps<{protocol: string}>();
const options = defineModel<ProxyOptions>({required: true});
const user = computed(() => props.protocol === 'vmess' ? options.value.vmessUser : props.protocol === 'vless' ? options.value.vlessUser : undefined);
const usesTls = computed(() => props.protocol === 'https' || (props.protocol === 'vmess' && options.value.vmessUser?.securityTls === 'tls') || (props.protocol === 'vless' && options.value.vlessUser?.security === 'tls'));
const methodOptions = computed(() => [...new Set([...(props.protocol === 'ss' ? SS_METHODS : SSR_METHODS), ...(options.value.encryption ? [options.value.encryption] : [])])]);
watch(() => [options.value.vlessUser?.network, options.value.vlessUser?.security], () => {
  const item = options.value.vlessUser;
  if (item?.flow && (item.network !== 'tcp' || !['tls', 'reality'].includes(item.security))) item.flow = '';
});
</script>

<template>
  <div v-if="['ss','ssr','vmess','vless','https'].includes(protocol)" class="advanced-fields wide">
    <div class="advanced-title">{{protocol === 'https' ? 'TLS 设置' : '连接参数'}}</div>
    <div class="advanced-grid">
      <template v-if="protocol === 'ss' || protocol === 'ssr'">
        <el-form-item label="加密方式" required><el-select v-model="options.encryption" filterable><el-option v-for="value in methodOptions" :key="value" :label="value" :value="value"/></el-select></el-form-item>
      </template>
      <template v-if="protocol === 'ssr'">
        <el-form-item label="SSR 协议" required><el-select v-model="options.transportProtocol" filterable><el-option v-for="value in SSR_PROTOCOLS" :key="value" :label="value" :value="value"/></el-select></el-form-item>
        <el-form-item label="协议参数"><el-input v-model="options.protocolParameter" autocomplete="off" placeholder="按供应商提供的信息填写"/></el-form-item>
        <el-form-item label="混淆方式"><el-select v-model="options.obfs" filterable><el-option v-for="value in SSR_OBFS" :key="value" :label="value" :value="value"/></el-select></el-form-item>
        <el-form-item label="混淆参数"><el-input v-model="options.obfsParameter" autocomplete="off" placeholder="按供应商提供的信息填写"/></el-form-item>
      </template>
      <template v-if="user">
        <el-form-item label="用户 UUID" required class="wide"><el-input v-model="user.id" autocomplete="off" placeholder="供应商提供的用户 UUID"/></el-form-item>
        <el-form-item label="传输协议" required><el-select v-model="user.network"><el-option v-for="value in TRANSPORTS" :key="value" :label="value === 'http' ? 'HTTP/2' : value.toUpperCase()" :value="value"/></el-select></el-form-item>
        <template v-if="protocol === 'vmess' && options.vmessUser">
          <el-form-item label="传输安全"><el-select v-model="options.vmessUser.securityTls"><el-option label="TLS" value="tls"/><el-option label="不使用 TLS" value="none"/></el-select></el-form-item>
          <el-form-item label="加密方式"><el-select v-model="options.vmessUser.security"><el-option v-for="value in ['auto','aes-128-gcm','chacha20-poly1305','none','zero']" :key="value" :label="value" :value="value"/></el-select></el-form-item>
          <el-form-item label="alterId"><el-input-number v-model="options.vmessUser.alterId" :min="0" :max="65535" :precision="0" controls-position="right"/></el-form-item>
        </template>
        <template v-if="protocol === 'vless' && options.vlessUser">
          <el-form-item label="传输安全"><el-select v-model="options.vlessUser.security"><el-option label="Reality" value="reality"/><el-option label="TLS" value="tls"/><el-option label="不使用 TLS" value="none"/></el-select></el-form-item>
          <el-form-item label="流控"><el-select v-model="options.vlessUser.flow"><el-option label="无" value=""/><el-option v-for="value in ['xtls-rprx-vision','xtls-rprx-vision-udp443']" :key="value" :label="value" :value="value" :disabled="user.network !== 'tcp' || options.vlessUser.security === 'none'"/></el-select></el-form-item>
          <el-form-item v-if="options.vlessUser.security === 'reality'" label="TLS 指纹"><el-select v-model="options.vlessUser.fingerprint"><el-option v-for="value in ['chrome','firefox','safari','ios','android','edge','360','qq','random','randomized']" :key="value" :label="value" :value="value"/></el-select></el-form-item>
        </template>
        <el-form-item v-if="usesTls || (protocol === 'vless' && options.vlessUser?.security === 'reality')" label="服务器名称（SNI）" :required="options.vlessUser?.security === 'reality'"><el-input v-model="user.serverName" placeholder="例如：www.example.com" autocomplete="off"/></el-form-item>
        <template v-if="protocol === 'vless' && options.vlessUser?.security === 'reality'">
          <el-form-item label="Reality 公钥" required><el-input v-model="options.vlessUser.publicKey" autocomplete="off" placeholder="供应商提供的 publicKey"/></el-form-item>
          <el-form-item label="shortId"><el-input v-model="options.vlessUser.shortId" maxlength="16" autocomplete="off" placeholder="最多 16 位十六进制字符"/></el-form-item>
          <el-form-item label="spiderX（可选）"><el-input v-model="options.vlessUser.spiderX" autocomplete="off" placeholder="按供应商提供的信息填写"/></el-form-item>
        </template>
        <template v-if="['ws','http','httpupgrade','splithttp'].includes(user.network)">
          <el-form-item label="传输路径"><el-input v-model="user.path" placeholder="/" autocomplete="off"/></el-form-item>
          <el-form-item label="传输主机（Host）"><el-input v-model="user.host" placeholder="按供应商提供的信息填写" autocomplete="off"/></el-form-item>
        </template>
        <el-form-item v-if="user.network === 'grpc'" label="gRPC 服务名"><el-input v-model="user.serviceName" autocomplete="off" placeholder="serviceName"/></el-form-item>
      </template>
      <el-form-item v-if="protocol === 'https' && options.tls" label="服务器名称（SNI，可选）"><el-input v-model="options.tls.serverName" placeholder="留空使用代理地址" autocomplete="off"/></el-form-item>
      <el-form-item v-if="usesTls && options.tls" label="证书校验"><el-checkbox v-model="options.tls.allowInsecure">跳过证书校验</el-checkbox><div class="field-tip">默认校验证书，仅在供应商明确要求时勾选。</div></el-form-item>
    </div>
  </div>
</template>

<style scoped>
.advanced-fields{padding:18px 20px 0;border:1px solid var(--el-border-color-light);border-radius:8px;background:var(--el-fill-color-lighter);margin-bottom:20px}.advanced-title{font-size:13px;font-weight:600;margin-bottom:18px}.advanced-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:0 20px}.wide{grid-column:1/-1}.field-tip{font-size:12px;color:var(--el-text-color-secondary);line-height:1.6}.advanced-grid :deep(.el-select),.advanced-grid :deep(.el-input-number){width:100%}@media(max-width:650px){.advanced-grid{grid-template-columns:1fr}.advanced-fields{padding:14px 14px 0}}
</style>
