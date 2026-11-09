<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Search, Refresh, Plus, Download, Delete, ArrowLeft } from '@element-plus/icons-vue';
import { usePermissions } from '@/store/modules/permission.store';
import { proxyApi, type ProxyRecord, type ProxyQuery } from '@/api/proxy/proxy.api';
import { PROXY_PROTOCOLS } from '@/utils/proxyImport';
import { downloadWorkbook } from '@/utils/workbook';
import ProxyEditorDialog from '@/components/ProxyEditorDialog.vue';
import ProxyBindingsDrawer from '@/components/ProxyBindingsDrawer.vue';

type BatchAction = 'check' | 'delete' | 'restore';
type Failure = {proxy: ProxyRecord; message: string};
type CheckResult = {connected: boolean; message: string; ip?: string; countryName?: string; latencyMs?: number; saved?: boolean; rotationRequested?: boolean};
const route = useRoute(), router = useRouter(), permissions = usePermissions();
const recycled = computed(() => route.path === '/proxy/recycle' || Boolean(route.meta.recycled));
const dynamic = computed(() => route.path === '/proxy/dynamic');
const title = computed(() => recycled.value ? '代理回收站' : dynamic.value ? '动态代理' : '代理列表');
const items = ref<ProxyRecord[]>([]), selected = ref<ProxyRecord[]>([]), total = ref(0), page = ref(1), size = ref(20);
const query = ref(''), protocol = ref(''), webType = ref(0), loading = ref(false), loadError = ref('');
const editing = ref(false), editRow = ref<ProxyRecord>(), binding = ref(false), bindingRow = ref<ProxyRecord>();
const busy = ref(false), exporting = ref(false), activeId = ref(''), progress = ref('');
const failures = ref<Failure[]>([]), lastAction = ref<BatchAction>('check'), resultSummary = ref('');
let loadVersion = 0, contextVersion = 0, disposed = false;
const canCheck = computed(() => typeof window.api?.checkProxy === 'function');
const desktop = () => window.api as (typeof window.api & {rotateProxy?: (id: string) => Promise<CheckResult>});
const canRotate = computed(() => typeof desktop()?.rotateProxy === 'function');
const errorText = (failure: unknown) => failure instanceof Error ? failure.message : '请求失败，请稍后重试';
const date = (value?: string | null) => value ? new Date(value).toLocaleString('zh-CN', {hour12: false}) : '—';
const endpoint = (row: ProxyRecord) => `${row.host.includes(':') && !row.host.startsWith('[') ? `[${row.host}]` : row.host}:${row.port}`;
function snapshotQuery(): ProxyQuery { return {webType: dynamic.value ? 1 : webType.value, protocol: protocol.value, query: query.value.trim(), recycled: recycled.value}; }
async function load() {
  const version = ++loadVersion;
  loading.value = true; loadError.value = '';
  try {
    const result = await proxyApi.list({...snapshotQuery(), page: page.value, size: size.value});
    if (version !== loadVersion || disposed) return;
    const lastPage = Math.max(1, Math.ceil(result.total / size.value));
    if (page.value > lastPage) { page.value = lastPage; await load(); return; }
    items.value = result.items; total.value = result.total; selected.value = [];
  } catch (failure) { if (version === loadVersion && !disposed) loadError.value = errorText(failure); }
  finally { if (version === loadVersion && !disposed) loading.value = false; }
}
function search() { page.value = 1; void load(); }
watch([recycled, dynamic], () => {
  contextVersion++; page.value = 1; webType.value = 0; protocol.value = ''; query.value = '';
  items.value = []; selected.value = []; total.value = 0; failures.value = []; resultSummary.value = '';
  editing.value = false; binding.value = false; void load();
}, {immediate: true});
onBeforeUnmount(() => { disposed = true; loadVersion++; contextVersion++; });
function edit(row?: ProxyRecord) { if (!permissions.can('device.edit') || recycled.value || busy.value) return; editRow.value = row; editing.value = true; }
watch([() => route.query.create, () => permissions.can('device.edit'), recycled], ([create, canEdit, isRecycled]) => {
  if (create !== '1' || !canEdit || isRecycled) return;
  edit();
}, {immediate: true});
watch(editing, (open, wasOpen) => {
  if (open || !wasOpen || route.query.create !== '1') return;
  const nextQuery = {...route.query}; delete nextQuery.create;
  void router.replace({path: route.path, query: nextQuery, hash: route.hash});
});
function showBindings(row: ProxyRecord) { if (!permissions.can('shop.view')) return; bindingRow.value = row; binding.value = true; }

async function runBatch(action: BatchAction, rows: ProxyRecord[], confirm = true) {
  if (busy.value || !rows.length || !permissions.can('device.edit')) return;
  if (action === 'check' && !canCheck.value) return;
  const targets = [...rows], permanent = recycled.value, scope = contextVersion;
  if (confirm && action !== 'check') {
    const message = action === 'restore' ? `确认恢复所选 ${targets.length} 条代理？恢复后可重新绑定店铺。`
      : permanent ? `确认永久删除所选 ${targets.length} 条代理？删除后无法恢复。`
      : `确认将所选 ${targets.length} 条代理移入回收站？已绑定店铺的代理需要先解绑。`;
    try { await ElMessageBox.confirm(message, action === 'restore' ? '恢复代理' : permanent ? '永久删除代理' : '删除代理', {type: action === 'restore' ? 'info' : 'warning', confirmButtonText: action === 'restore' ? '确认恢复' : '确认删除', cancelButtonText: '取消'}); }
    catch { return; }
  }
  if (scope !== contextVersion || disposed) return;
  busy.value = true; failures.value = []; resultSummary.value = ''; lastAction.value = action;
  const collected: Failure[] = []; let succeeded = 0;
  const verb = action === 'check' ? '检测' : action === 'restore' ? '恢复' : '删除';
  try {
    for (let index = 0; index < targets.length; index++) {
      if (disposed || scope !== contextVersion) break;
      const row = targets[index]!; activeId.value = row.id; progress.value = `正在${verb} ${index + 1} / ${targets.length}`;
      try {
        if (action === 'check') {
          const result = await window.api!.checkProxy(row.id) as CheckResult;
          if (!result.connected) throw new Error(result.message || '代理连接失败，请检查地址、账号和本机网络');
          if (result.saved === false) throw new Error(result.message || '代理连接成功，但检测结果未能保存，请重试检测');
        } else if (action === 'restore') await proxyApi.restore(row.id);
        else await proxyApi.remove(row.id, permanent);
        succeeded++;
      } catch (failure) { collected.push({proxy: row, message: errorText(failure)}); }
    }
    if (!disposed && scope === contextVersion) {
      failures.value = collected; resultSummary.value = `${verb}完成：${succeeded} 条${action === 'check' ? '连接成功' : '成功'}${collected.length ? `，${collected.length} 条失败` : ''}`;
      if (!collected.length) ElMessage.success(resultSummary.value);
      await load();
    }
  } finally { busy.value = false; activeId.value = ''; progress.value = ''; }
}
async function rotate(row: ProxyRecord) {
  const api = desktop();
  if (!api?.rotateProxy || !permissions.can('device.edit') || busy.value) return;
  try { await ElMessageBox.confirm(`确认向供应商请求更换“${row.name}”的出口 IP？此操作会影响绑定该代理的全部 ${row.boundCount || 0} 个店铺，可能中断登录或正在进行的操作。供应商可能延迟生效，请以重新检测结果为准。`, '更换出口 IP', {type: 'warning', confirmButtonText: '请求换 IP', cancelButtonText: '取消'}); }
  catch { return; }
  busy.value = true; activeId.value = row.id; progress.value = '正在请求换 IP 并检测出口';
  try {
    const result = await api.rotateProxy(row.id);
    ElMessage({type: result.connected && result.saved !== false ? 'success' : 'warning', message: result.message || `已提交换 IP 请求${result.ip ? `，当前检测出口 ${result.ip}` : '，请稍后重新检测出口 IP'}`, duration: 6000});
    await load();
  } catch (failure) { ElMessage.error(errorText(failure)); }
  finally { busy.value = false; activeId.value = ''; progress.value = ''; }
}
async function exportAll() {
  if (exporting.value || !permissions.can('device.export')) return;
  exporting.value = true;
  const params = snapshotQuery(), exportName = title.value;
  try {
    const rows: ProxyRecord[] = [], seen = new Set<string>();
    for (let current = 1; ; current++) {
      const result = await proxyApi.list({...params, page: current, size: 200});
      for (const row of result.items) if (!seen.has(row.id)) { rows.push(row); seen.add(row.id); }
      if (!result.items.length || current * 200 >= result.total) break;
    }
    await downloadWorkbook(`${exportName}.xlsx`, rows.map(row => ({...row, webTypeLabel: row.webType === 1 ? '动态' : '静态',
      connectionLabel: row.checkedAt ? row.checkConnected ? '连接成功' : '连接失败' : '未检测', checkedAt: date(row.checkedAt), expiresAt: date(row.expiresAt)})),
    {id: '代理 ID', name: '代理名称', protocol: '协议', host: '代理地址', port: '端口', webTypeLabel: '网络类型', region: '国家 / 地区', provider: '供应商',
      boundCount: '绑定店铺数', connectionLabel: '最近检测状态', checkIp: '最近出口 IP', checkCountryName: '出口国家 / 地区', checkedAt: '最近检测时间', expiresAt: '到期时间', remark: '备注'});
    ElMessage.success(`已导出 ${rows.length} 条代理`);
  } catch (failure) { ElMessage.error(errorText(failure)); }
  finally { exporting.value = false; }
}
</script>

<template>
  <section class="panel page-list proxy-page">
    <div class="proxy-heading"><h1 class="page-title">{{title}}</h1><el-button v-if="recycled" :icon="ArrowLeft" :disabled="busy" @click="router.push('/proxy/list')">返回代理列表</el-button><el-button v-else :icon="Delete" :disabled="busy" @click="router.push('/proxy/recycle')">代理回收站</el-button></div>
    <p class="proxy-description">{{recycled ? '静态和动态代理共用回收站，恢复后可重新绑定店铺。' : dynamic ? '管理供应商提供的动态网关和会话账号，检测实际出口 IP，并按需请求换 IP。' : '集中管理自行购买的代理服务，检测连接并为店铺配置网络。'}}</p>
    <el-alert v-if="!recycled && !canCheck" title="请在桌面客户端检测代理和请求换 IP，以确认当前电脑能连接到代理服务。" type="info" :closable="false"/>
    <div class="toolbar proxy-toolbar">
      <el-button v-if="!recycled && permissions.can('device.edit')" type="primary" :icon="Plus" :disabled="busy" @click="edit()">{{dynamic ? '添加动态代理' : '添加代理'}}</el-button>
      <el-tooltip content="导出当前筛选结果，不包含认证密码和换 IP 链接" placement="top"><el-button v-if="permissions.can('device.export')" :icon="Download" :loading="exporting" @click="exportAll">导出代理</el-button></el-tooltip>
      <el-input v-model="query" class="search" clearable placeholder="名称 / 地址 / 供应商 / 地区 / 备注" :disabled="busy" @keyup.enter="search" @clear="search"/>
      <el-button :icon="Search" :disabled="busy" @click="search">查询</el-button><el-button :icon="Refresh" :disabled="busy" :loading="loading" aria-label="刷新代理列表" @click="load"/>
    </div>
    <div class="proxy-filters">
      <span>代理协议</span><el-select v-model="protocol" :disabled="busy" aria-label="筛选代理协议" @change="search"><el-option label="全部协议" value=""/><el-option v-for="value in PROXY_PROTOCOLS" :key="value" :value="value" :label="value.toUpperCase()"/></el-select>
      <template v-if="!dynamic"><span>网络类型</span><el-select v-model="webType" :disabled="busy" aria-label="筛选网络类型" @change="search"><el-option label="全部类型" :value="0"/><el-option label="静态代理" :value="2"/><el-option label="动态代理" :value="1"/></el-select></template>
      <span class="muted">共 {{total}} 条代理</span><span v-if="progress" class="progress" aria-live="polite">{{progress}}</span>
    </div>
    <el-alert v-if="loadError" :title="`加载失败：${loadError}`" type="error" :closable="false"><el-button link type="primary" @click="load">重新加载</el-button></el-alert>
    <div v-if="failures.length" class="batch-result" role="status">
      <div class="batch-result-heading"><b>{{resultSummary}}</b><el-button size="small" :disabled="busy" @click="runBatch(lastAction, failures.map(failure => failure.proxy))">仅重试失败项</el-button><el-button link :disabled="busy" @click="failures=[];resultSummary=''">收起</el-button></div>
      <ul><li v-for="failure in failures" :key="failure.proxy.id">{{failure.proxy.name}}：{{failure.message}}</li></ul>
    </div>
    <el-table :data="items" v-loading="loading" row-key="id" @selection-change="selected=$event">
      <el-table-column v-if="permissions.can('device.edit')" type="selection" width="42" :selectable="() => !busy"/>
      <el-table-column label="代理名称" min-width="170"><template #default="{row}"><button v-if="!recycled && permissions.can('device.edit')" class="table-link table-name" :disabled="busy" @click="edit(row)">{{row.name}}</button><span v-else class="table-name">{{row.name}}</span><div class="table-sub">{{row.webType === 1 ? '动态代理' : '静态代理'}} · {{row.id.slice(0, 8)}}</div><div v-if="row.remark" class="table-sub remark" :title="row.remark">{{row.remark}}</div></template></el-table-column>
      <el-table-column label="代理地址" min-width="200"><template #default="{row}"><span class="endpoint">{{endpoint(row)}}</span><div class="table-sub">{{row.protocol.toUpperCase()}}<span v-if="row.username"> · {{row.username}}</span></div></template></el-table-column>
      <el-table-column label="供应商 / 地区" min-width="145"><template #default="{row}">{{row.provider || '未填写'}}<div class="table-sub">{{row.region || '未填写地区'}}</div></template></el-table-column>
      <el-table-column label="最近检测" min-width="150"><template #default="{row}"><el-tooltip :content="row.checkMessage || '尚未检测此代理'" placement="top"><el-tag :type="!row.checkedAt ? 'info' : row.checkConnected ? 'success' : 'danger'">{{!row.checkedAt ? '未检测' : row.checkConnected ? '连接成功' : '连接失败'}}</el-tag></el-tooltip><div class="table-sub">{{row.checkConnected && row.checkLatencyMs != null ? `检测耗时 ${row.checkLatencyMs} ms` : ''}}</div><div class="table-sub">{{date(row.checkedAt)}}</div></template></el-table-column>
      <el-table-column label="最近出口 IP" min-width="165"><template #default="{row}">{{row.checkIp || '—'}}<div class="table-sub">{{row.checkCountryName || '—'}}</div><div v-if="row.webType === 1" class="table-sub">以检测时的出口为准</div></template></el-table-column>
      <el-table-column label="绑定店铺" width="95"><template #default="{row}"><button v-if="!recycled && permissions.can('shop.view')" class="table-link" :disabled="busy" @click="showBindings(row)">{{row.boundCount || 0}} 个店铺</button><span v-else>{{row.boundCount || 0}} 个</span></template></el-table-column>
      <el-table-column label="到期时间" min-width="160"><template #default="{row}">{{date(row.expiresAt)}}<div v-if="row.expiresAt && new Date(row.expiresAt).getTime() < Date.now()" class="expired">已到填写的到期时间</div></template></el-table-column>
      <el-table-column label="操作" :width="recycled ? 160 : 205" fixed="right"><template #default="{row}">
        <template v-if="recycled"><el-button v-if="permissions.can('device.edit')" link type="primary" :disabled="busy" @click="runBatch('restore',[row])">恢复</el-button><el-button v-if="permissions.can('device.edit')" link type="danger" :disabled="busy" @click="runBatch('delete',[row])">永久删除</el-button></template>
        <template v-else>
          <div class="row-actions"><el-button v-if="permissions.can('device.edit')" link type="primary" :disabled="busy" @click="edit(row)">编辑</el-button><el-tooltip content="检测当前电脑到代理的连接和出口 IP" placement="top"><span><el-button v-if="permissions.can('device.edit')" link type="primary" :loading="busy && activeId === row.id && lastAction === 'check'" :disabled="busy || !canCheck" @click="runBatch('check',[row])">检测</el-button></span></el-tooltip><el-button v-if="permissions.can('shop.view')" link type="primary" :disabled="busy" @click="showBindings(row)">绑定店铺</el-button></div>
          <div class="row-actions"><el-button v-if="row.hasChangeIpUrl && permissions.can('device.edit')" link type="primary" :disabled="busy || !canRotate" @click="rotate(row)">换 IP</el-button><el-button v-if="permissions.can('device.edit')" link type="danger" :disabled="busy" @click="runBatch('delete',[row])">删除</el-button></div>
        </template>
      </template></el-table-column>
      <template #empty><el-empty :description="loadError ? '代理列表加载失败，请重试' : recycled ? '代理回收站为空' : dynamic ? '暂无动态代理，可添加供应商提供的动态网关' : '暂无代理，可添加单个代理或批量导入'" :image-size="90"/></template>
    </el-table>
    <div class="table-pagination">
      <div v-if="permissions.can('device.edit')" class="batch-actions"><span class="muted">已选 {{selected.length}} 条</span><el-button v-if="!recycled" size="small" :disabled="!selected.length || busy || !canCheck" @click="runBatch('check', selected)">批量检测</el-button><el-button v-if="recycled" size="small" :disabled="!selected.length || busy" @click="runBatch('restore', selected)">批量恢复</el-button><el-button size="small" :disabled="!selected.length || busy" @click="runBatch('delete', selected)">{{recycled ? '永久删除' : '批量删除'}}</el-button></div>
      <el-pagination v-model:current-page="page" v-model:page-size="size" :page-sizes="[20,50,100]" :total="total" :disabled="busy" layout="total,sizes,prev,pager,next,jumper" @current-change="load" @size-change="search"/>
    </div>
  </section>
  <ProxyEditorDialog v-model="editing" :proxy="editRow" :default-web-type="dynamic ? 1 : 2" @done="load"/>
  <ProxyBindingsDrawer v-model="binding" :proxy="bindingRow" @done="load"/>
</template>

<style scoped>
.proxy-heading{display:flex;align-items:flex-start;gap:20px;border-bottom:1px solid #edf1f7;margin-bottom:16px}.proxy-heading .page-title{flex:1;border:0;margin:0!important}.proxy-description{font-size:13px;line-height:1.8;color:var(--el-text-color-secondary);margin-bottom:4px}.proxy-toolbar .search{min-width:230px}.proxy-filters{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-bottom:18px;font-size:13px}.proxy-filters .el-select{width:145px}.proxy-filters>.muted{margin-left:auto}.progress{color:var(--el-color-primary)}.endpoint{overflow-wrap:anywhere}.remark{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.expired{font-size:11px;color:var(--el-color-warning)}.row-actions{display:flex;align-items:center;gap:12px;min-height:25px}.row-actions .el-button+.el-button{margin-left:0}.batch-result{padding:12px 16px;margin-bottom:16px;border:1px solid var(--el-color-warning-light-5);background:var(--el-color-warning-light-9);border-radius:6px;font-size:13px}.batch-result-heading{display:flex;align-items:center;gap:12px}.batch-result-heading b{margin-right:auto}.batch-result ul{max-height:150px;overflow:auto;margin:10px 0 0;padding-left:20px;line-height:1.8}.table-link:disabled{cursor:default}.batch-actions{flex-wrap:wrap}
</style>
