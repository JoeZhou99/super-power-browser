<script setup lang="ts">
import { ref, watch } from 'vue';
import { ElMessage, ElMessageBox } from 'element-plus';
import { usePermissions } from '@/store/modules/permission.store';
import { proxyApi, type ProxyRecord } from '@/api/proxy/proxy.api';
import { mallApi } from '@/api/mall/mall.api';
import { request, queryString } from '@/utils/request';

const props = defineProps<{modelValue: boolean; proxy?: ProxyRecord}>();
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>();
const permissions = usePermissions(), boundShops = ref<any[]>([]), choices = ref<any[]>([]);
const search = ref(''), shopId = ref(''), error = ref(''), loading = ref(false), searching = ref(false), busy = ref(false);
let loadVersion = 0, searchVersion = 0;
const errorText = (failure: unknown) => failure instanceof Error ? failure.message : '请求失败，请稍后重试';

async function loadBound() {
  const id = props.proxy?.id, version = ++loadVersion;
  if (!id || !props.modelValue) return;
  loading.value = true;
  try { const rows = await proxyApi.environments(id); if (version === loadVersion) boundShops.value = rows; }
  catch (failure) { if (version === loadVersion) error.value = errorText(failure); }
  finally { if (version === loadVersion) loading.value = false; }
}
async function searchShops() {
  const version = ++searchVersion;
  if (!permissions.can('shop.edit') || !props.modelValue) return;
  searching.value = true;
  try {
    const result = await request<{items: any[]}>('/environments?' + queryString({query: search.value, recycled: false, page: 1, size: 100}));
    if (version === searchVersion) choices.value = result.items.filter(row => row.deviceId !== props.proxy?.id);
  } catch (failure) { if (version === searchVersion) error.value = errorText(failure); }
  finally { if (version === searchVersion) searching.value = false; }
}
watch(() => [props.modelValue, props.proxy?.id], () => {
  loadVersion++; searchVersion++; boundShops.value = []; choices.value = []; shopId.value = ''; search.value = ''; error.value = '';
  if (props.modelValue) { void loadBound(); void searchShops(); }
}, {immediate: true});

async function requireStopped(id: string) {
  const states = await window.api?.browserStates();
  if (states?.[id]) throw new Error('店铺浏览器正在运行、启动或关闭中，请完全关闭后再修改网络绑定');
}

async function bind() {
  if (!props.proxy || !shopId.value || busy.value || !permissions.can('shop.edit')) return;
  const chosen = choices.value.find(row => row.id === shopId.value), proxyId = props.proxy.id, selectedId = shopId.value;
  if (chosen?.deviceId) {
    try { await ElMessageBox.confirm(`“${chosen.name}”已经绑定网络资源，确认更换为“${props.proxy.name}”？`, '更换店铺网络', {confirmButtonText: '确认更换', cancelButtonText: '取消'}); }
    catch { return; }
  }
  busy.value = true; error.value = '';
  try {
    await requireStopped(selectedId);
    await mallApi.bind(selectedId, proxyId); ElMessage.success('店铺已绑定代理'); shopId.value = ''; emit('done');
    await Promise.all([loadBound(), searchShops()]);
  } catch (failure) { error.value = errorText(failure); }
  finally { busy.value = false; }
}
async function unbind(shop: any) {
  if (busy.value || !permissions.can('shop.edit')) return;
  try { await ElMessageBox.confirm(`确认解除“${shop.name}”与此代理的绑定？`, '解绑店铺', {confirmButtonText: '确认解绑', cancelButtonText: '取消'}); }
  catch { return; }
  busy.value = true; error.value = '';
  try {
    await requireStopped(shop.id);
    await mallApi.bind(shop.id, ''); ElMessage.success('店铺已解绑'); emit('done');
    await Promise.all([loadBound(), searchShops()]);
  } catch (failure) { error.value = errorText(failure); }
  finally { busy.value = false; }
}
</script>

<template>
  <el-drawer :model-value="modelValue" title="绑定店铺" size="640px" :close-on-click-modal="!busy" :close-on-press-escape="!busy" :show-close="!busy" @update:model-value="emit('update:modelValue',$event)">
    <template v-if="proxy">
      <h3>{{proxy.name}}</h3><p class="muted">{{proxy.host}}:{{proxy.port}} · {{proxy.protocol.toUpperCase()}}</p>
      <el-alert v-if="error" :title="error" type="error" :closable="false" class="binding-error"/>
      <el-table :data="boundShops" v-loading="loading" max-height="360" row-key="id">
        <el-table-column prop="name" label="店铺名称" min-width="150"/><el-table-column prop="platform" label="平台" min-width="120"/>
        <el-table-column v-if="permissions.can('shop.edit')" label="操作" width="80"><template #default="{row}"><el-button link type="danger" :disabled="busy" @click="unbind(row)">解绑</el-button></template></el-table-column>
        <template #empty><el-empty description="暂无绑定店铺" :image-size="70"/></template>
      </el-table>
      <template v-if="permissions.can('shop.edit')">
        <h3 class="section-title">绑定已有店铺</h3>
        <div class="binding-search"><el-input v-model="search" clearable placeholder="搜索店铺名称" :disabled="busy" @keyup.enter="searchShops" @clear="searchShops"/><el-button :loading="searching" :disabled="busy" @click="searchShops">搜索</el-button></div>
        <el-select v-model="shopId" filterable placeholder="选择店铺" :disabled="busy" :loading="searching" class="binding-select"><el-option v-for="shop in choices" :key="shop.id" :value="shop.id" :label="`${shop.name}${shop.deviceId ? '（已绑定，选择后将更换）' : ''}`"/></el-select>
        <p class="muted binding-help">最多展示 100 个匹配店铺，可搜索缩小范围。正在运行的店铺请先关闭浏览器，再更换网络配置。</p>
        <el-button type="primary" :loading="busy" :disabled="!shopId" @click="bind">确认绑定</el-button>
      </template>
    </template>
  </el-drawer>
</template>

<style scoped>
.binding-error{margin-bottom:16px}.binding-search{display:flex;gap:10px;margin-bottom:12px}.binding-select{width:100%}.binding-help{font-size:12px;line-height:1.7}
</style>
