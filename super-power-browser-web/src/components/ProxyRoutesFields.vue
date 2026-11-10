<script setup lang="ts">
import { computed, ref } from 'vue';
import { type ProxyOptions } from '@/utils/proxyOptions.mjs';
import { createProxyConnection, RELAY_PROTOCOLS, MAX_PROXY_ALTERNATIVES, MAX_PROXY_DEPTH } from '@/utils/proxyRoutes.mjs';
import ProxyConnectionFields from './ProxyConnectionFields.vue';
import ProxyRoutingFields from './ProxyRoutingFields.vue';

const props = withDefaults(defineProps<{protocol: string; depth?: number; excludeId?: string}>(), {depth: 0});
const options = defineModel<ProxyOptions>({required: true});
const emit = defineEmits<{loading: [value: number]}>();
const expanded = ref<string[]>([]);
const nodeKeys = new WeakMap<object, number>(); let nextKey = 0;
function nodeKey(node: object) { if (!nodeKeys.has(node)) nodeKeys.set(node, ++nextKey); return nodeKeys.get(node)!; }
const canRelay = computed(() => props.depth < MAX_PROXY_DEPTH && RELAY_PROTOCOLS.includes(props.protocol));
function addRelay() { options.value.transit = createProxyConnection(); expanded.value = [...expanded.value, 'relay']; }
function addAlternative() {
  const items = options.value.alternatives ||= [];
  if (items.length >= MAX_PROXY_ALTERNATIVES) return;
  items.push(createProxyConnection()); expanded.value = [...expanded.value, `alternative-${items.length - 1}`];
}
</script>

<template>
  <div class="proxy-routes wide" :class="{'nested-routes': depth > 0}">
    <div v-if="depth === 0" class="routes-title">中转与备用线路（可选）</div>
    <div v-if="depth === 0" class="routes-description">中转用于连接当前代理；备用线路在当前线路不可用时提供其他出口。请确认各线路的出口适合此店铺。</div>
    <el-collapse v-model="expanded">
      <el-collapse-item v-if="options.transit" name="relay" title="中转节点">
        <ProxyConnectionFields v-model="options.transit" :depth="depth + 1" transit :exclude-id="excludeId" @loading="emit('loading', $event ? 1 : -1)"/>
        <ProxyRoutesFields :model-value="options.transit.proxyOptions || {}" :protocol="options.transit.protocol" :depth="depth + 1" :exclude-id="excludeId" @update:model-value="options.transit.proxyOptions = $event" @loading="emit('loading', $event)"/>
        <el-button link type="danger" @click="delete options.transit">移除中转节点</el-button>
      </el-collapse-item>
      <el-collapse-item v-for="(item, index) in options.alternatives || []" :key="nodeKey(item)" :name="`alternative-${index}`" :title="`备用线路 ${index + 1} · ${item.protocol.toUpperCase()}${item.host ? ` · ${item.host}:${item.port}` : ''}`">
        <ProxyConnectionFields v-model="options.alternatives![index]" :depth="depth + 1" :exclude-id="excludeId" @loading="emit('loading', $event ? 1 : -1)"/>
        <ProxyRoutesFields :model-value="item.proxyOptions || {}" :protocol="item.protocol" :depth="depth + 1" :exclude-id="excludeId" @update:model-value="item.proxyOptions = $event" @loading="emit('loading', $event)"/>
        <el-button link type="danger" @click="options.alternatives!.splice(index, 1)">移除备用线路 {{index + 1}}</el-button>
      </el-collapse-item>
    </el-collapse>
    <div class="route-actions">
      <el-button v-if="!options.transit && canRelay" size="small" @click="addRelay">添加中转节点</el-button>
      <el-button v-if="depth === 0" size="small" :disabled="(options.alternatives?.length || 0) >= MAX_PROXY_ALTERNATIVES" @click="addAlternative">添加备用线路（{{options.alternatives?.length || 0}} / {{MAX_PROXY_ALTERNATIVES}}）</el-button>
    </div>
    <div v-if="depth < MAX_PROXY_DEPTH && !RELAY_PROTOCOLS.includes(protocol)" class="routes-description">该协议暂不支持再叠加中转，可直接使用或添加其他备用线路。</div>
    <ProxyRoutingFields v-if="depth === 0" v-model="options" :exclude-id="excludeId" @loading="emit('loading', $event)"/>
  </div>
</template>

<style scoped>
.proxy-routes{grid-column:1/-1;padding:16px;border:1px solid var(--el-border-color-light);border-radius:8px;margin-bottom:20px;min-width:0}.routes-title{font-size:13px;font-weight:600;margin-bottom:8px}.routes-description{color:var(--el-text-color-secondary);font-size:12px;line-height:1.7;margin-bottom:10px}.route-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}.route-actions .el-button{margin-left:0}.nested-routes{padding:10px;margin-bottom:12px}.proxy-routes :deep(.el-collapse-item__header){line-height:1.5;min-height:44px;height:auto;overflow-wrap:anywhere}.proxy-routes :deep(.el-collapse-item__content){padding:12px 0}.proxy-routes :deep(.el-collapse){border-top:0}
</style>
