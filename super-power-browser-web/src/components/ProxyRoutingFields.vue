<script setup lang="ts">
import { computed } from 'vue';
import { type ProxyOptions } from '@/utils/proxyOptions.mjs';
import { createProxyConnection } from '@/utils/proxyRoutes.mjs';
import ProxyConnectionFields from './ProxyConnectionFields.vue';
import ProxyRoutesFields from './ProxyRoutesFields.vue';

defineProps<{excludeId?: string}>();
const options = defineModel<ProxyOptions>({required: true});
const emit = defineEmits<{loading: [value: number]}>();
function domainText(key: 'resourceDomains' | 'directDomains' | 'cdnDomains') {
  return computed({get: () => (options.value.routing?.[key] || []).join('\n'), set: (value: string) => {
    options.value.routing ||= {}; options.value.routing[key] = value.split(/\r?\n/).map(line => line.trim());
  }});
}
const resources = domainText('resourceDomains'), cdn = domainText('cdnDomains'), direct = domainText('directDomains');
function removeResource() {
  delete options.value.resourceProxy;
  if (options.value.routing) { options.value.routing.resourceDomains = []; options.value.routing.cdnDomains = []; }
}
</script>

<template>
  <el-collapse class="routing-fields">
    <el-collapse-item name="routing" title="网站分流（可选）">
      <p class="field-tip">未匹配的网站继续使用店铺主线路。每行一个域名，最多 100 行；example.com 精确匹配，*.example.com 匹配其子域名。</p>
      <template v-if="options.resourceProxy">
        <div class="routing-title">资源 / 翻译专用代理</div>
        <ProxyConnectionFields v-model="options.resourceProxy" :depth="1" :exclude-id="excludeId" @loading="emit('loading', $event ? 1 : -1)"/>
        <ProxyRoutesFields :model-value="options.resourceProxy.proxyOptions || {}" :protocol="options.resourceProxy.protocol" :depth="1" :exclude-id="excludeId" @update:model-value="options.resourceProxy.proxyOptions = $event" @loading="emit('loading', $event)"/>
        <el-button link type="danger" @click="removeResource">移除专用代理并清空资源 / CDN 分流域名</el-button>
      </template>
      <el-button v-else size="small" @click="options.resourceProxy = createProxyConnection()">添加资源 / 翻译专用代理</el-button>
      <el-form-item label="资源 / 翻译域名" class="domain-field"><el-input v-model="resources" :disabled="!options.resourceProxy" type="textarea" :rows="3" placeholder="static.example.com&#10;*.translate.example.com"/><div class="field-tip">这些域名使用上方专用代理。</div></el-form-item>
      <el-form-item label="CDN 域名"><el-input v-model="cdn" :disabled="!options.resourceProxy" type="textarea" :rows="3" placeholder="cdn.example.com"/><div class="field-tip">这些域名同样使用专用代理。</div></el-form-item>
      <el-form-item label="明确直连的域名"><el-input v-model="direct" type="textarea" :rows="3" placeholder="留空则不启用直连分流"/><div class="field-tip direct-tip">这里填写的网站将通过本机网络直接访问，会看到本机公网 IP，不经过店铺代理。仅填写你明确需要直连的网站。</div></el-form-item>
    </el-collapse-item>
  </el-collapse>
</template>

<style scoped>
.routing-fields{margin-top:16px}.field-tip{font-size:12px;line-height:1.7;color:var(--el-text-color-secondary);margin:6px 0 12px}.routing-title{font-size:13px;font-weight:600;margin:12px 0}.domain-field{margin-top:16px}.direct-tip{color:var(--el-color-warning-dark-2)}
</style>
