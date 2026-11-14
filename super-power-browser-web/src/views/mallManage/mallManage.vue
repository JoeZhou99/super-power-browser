<script setup lang="ts">
import {computed,onMounted,onUnmounted,reactive,ref,watch} from 'vue';
import {useRoute} from 'vue-router';
import {Search,Refresh,Setting,ArrowDown,Star,StarFilled} from '@element-plus/icons-vue';
import MallEditor from './component/createMall.vue';
import CopyMall from './component/copyMall.vue';
import DetailMall from './component/detailMall.vue';
import ImportDialog from '@/components/ImportDialog.vue';
import NetworkBindingDialog from '@/components/NetworkBindingDialog.vue';
import {downloadWorkbook} from '@/utils/workbook';
import {date} from '@/utils/format';
import {ElMessage,ElMessageBox} from 'element-plus';
import {mallApi} from '@/api/mall/mall.api';
import {loadBrowserConfig,type BrowserConfig} from '@/api/config/browser-config.api';
import {request,post} from '@/utils/request';
import {usePermissions} from '@/store/modules/permission.store';
const props=withDefaults(defineProps<{recycled?:boolean}>(),{recycled:false});
const permissions=usePermissions(),route=useRoute();
const selected=ref<any[]>([]),size=ref(20),importing=ref(false),columnsDialog=ref(false);
const visibleColumns=ref(['platform','device','grants','updated','remark']);
const importColumns={name:'店铺名称',platform:'所属平台',startUrl:'平台站点地址',accountName:'店铺账号',accountPassword:'店铺密码',remark:'店铺备注'};
const exportColumns={name:'店铺名称',platform:'所属平台',startUrl:'平台站点地址',accountName:'店铺账号',deviceName:'网络名称',deviceHost:'网络信息',grantedNames:'授权人员',remark:'店铺备注',updatedAt:'更新时间'};
const items=ref<any[]>([]),stats=ref<Record<string,number>>({}),total=ref(0),page=ref(1),category=ref(String(route.query.category||'all')),query=ref(''),loading=ref(false);
const categories=[['all','全部'],['recent_open','最近打开'],['often_use','常用店铺'],['unbindIp','待配置网络'],['unauthorize','待授权'],['need_renew','急需续费']];
const states=ref<Record<string,string>>({});
const progress=ref<Record<string,{version:string;stage:string;percent:number|null;message:string}>>({});
const opening=reactive<Record<string,boolean>>({});
async function load(){loading.value=true;try{const result=await mallApi.list({category:category.value,query:query.value,page:page.value,size:size.value,recycled:props.recycled});items.value=result.items;total.value=result.total;stats.value=await mallApi.stats(props.recycled);}finally{loading.value=false;}}
watch([category,()=>props.recycled],()=>{page.value=1;load();});
async function refreshStates(){const [status,preparing]=await Promise.all([window.api?.browserStates(),window.api?.browserProgress?.()]);states.value=status||{};progress.value=preparing||{};}
let timer:ReturnType<typeof setInterval>;
onMounted(()=>{load();if(route.query.create)edit();refreshStates();timer=setInterval(refreshStates,3000);});onUnmounted(()=>clearInterval(timer));
const editing=ref(false),saving=ref(false),form=reactive<any>({});
const defaults=(config?:BrowserConfig)=>({name:'',platform:'',startUrl:'https://',accountName:'',accountPassword:'',remark:'',kernelVersion:'',fingerprint:{canvas:'privacy',audio:'privacy',clientRects:'privacy',fontMetrics:'privacy',webglFingerprint:'privacy',hardwareAcceleration:true,autoInjectPasskey:false,disabledPasskey:false,accountLock:true,webRtc:'disabled',webgl:true,languageMode:config?.defaults.language==='auto'?'ip':'custom',rememberPassword:true,notifications:true,speechVoices:'privacy',fonts:'privacy',os:'Windows',...config?.defaults}});
async function edit(row?:any){const value=row?await request(`/environments/${row.id}`):defaults();Object.keys(form).forEach(k=>delete form[k]);Object.assign(form,value);if(typeof form.fingerprint==='string')form.fingerprint=JSON.parse(form.fingerprint);form.fingerprint={...defaults().fingerprint,...form.fingerprint};delete form.fingerprint.iconColor;delete form.fingerprint.taskbarNumber;form.accountPassword='';editing.value=true;}
async function save(bindAfter=false){saving.value=true;try{const payload={...form,fingerprint:{...form.fingerprint}};if(payload.fingerprint.language==='auto'||payload.fingerprint.languageMode==='ip'){payload.fingerprint.language='auto';payload.fingerprint.languageMode='ip';}if(form.id&&!payload.accountPassword)delete payload.accountPassword;const result=await mallApi.save(payload);if(form.granteeIds?.length)await mallApi.grant(result.id,form.granteeIds);editing.value=false;await load();ElMessage.success('店铺已保存');if(bindAfter)await openBinding({...form,id:result.id});}finally{saving.value=false;}}
async function open(row:any){if(!window.api)throw new Error('请在桌面客户端中打开店铺');if(opening[row.id])return;opening[row.id]=true;try{await window.api.openBrowser(row.id);await load();}finally{delete opening[row.id];await refreshStates();}}
async function close(row:any){await window.api?.closeBrowser(row.id);await refreshStates();}
async function recycle(row:any){try{await ElMessageBox.confirm(props.recycled?'永久删除该店铺记录？本地数据需在关闭浏览器后单独处理。':'将该店铺移至回收站？','确认操作',{type:'warning'});}catch{return;}await window.api?.closeBrowser(row.id);await mallApi.recycle(row.id,props.recycled);await load();}
async function restore(row:any){await mallApi.restore(row.id);await load();}
const copying=ref<any>(),detail=ref<any>();
function copy(row:any){copying.value=row;}
async function favorite(row:any){await mallApi.favorite(row.id,!row.favorite);await load();}
const binding=ref(false),selectedShop=ref<any>();
function openBinding(row:any){selectedShop.value=row;binding.value=true;}
const granting=ref(false),members=ref<any[]>([]),granted=ref<any[]>([]),selectedMembers=ref<string[]>([]);
async function openGrants(row:any){selectedShop.value=row;members.value=await request('/members');granted.value=await mallApi.grants(row.id);selectedMembers.value=[];granting.value=true;}
const availableMembers=computed(()=>members.value.filter(m=>m.enabled&&!granted.value.some(g=>g.userId===m.id)));
async function grant(){await mallApi.grant(selectedShop.value.id,selectedMembers.value);await openGrants(selectedShop.value);await load();}
async function revoke(member:string){await mallApi.revoke(selectedShop.value.id,member);await openGrants(selectedShop.value);await load();}
async function exportAll(onlySelected=false){const all:any[]=[];if(!permissions.can('shop.export'))return;if(onlySelected)all.push(...await mallApi.exportSelected(selected.value.map(row=>row.id)));else for(let p=1;;p++){const r=await mallApi.export({category:category.value,query:query.value,page:p,recycled:props.recycled});all.push(...r.items);if(all.length>=r.total)break;}await downloadWorkbook('店铺列表.xlsx',all,exportColumns);}
async function importRows(rows:any[]){
  try{
    const config=await loadBrowserConfig();
    await post('/environments/import',rows.map(row=>({...defaults(config),...row})));
  }catch(error){ElMessage.error(error instanceof Error?error.message:'导入失败，请重试');throw error;}
}
async function batch(action:string){
  if(action==='recycle'||action==='delete'){try{await ElMessageBox.confirm(`确认处理所选 ${selected.value.length} 家店铺？`,'批量操作');}catch{return;}}
  let completed=0;try{for(const row of selected.value){if(action==='open')await open(row);if(action==='close')await close(row);if(action==='restore')await mallApi.restore(row.id);if(action==='recycle'||action==='delete'){await window.api?.closeBrowser(row.id);await mallApi.recycle(row.id,props.recycled);}if(action==='favorite')await mallApi.favorite(row.id,true);completed++;}ElMessage.success(`已完成 ${completed} 项操作`);}finally{await load();}
}
</script>
<template>
<section class="panel page-list"><h1 class="page-title">{{recycled?'店铺回收站':'店铺管理'}}</h1>
  <div v-if="!recycled" class="stat-grid"><button v-for="[key,label] in categories" :key="key" :class="{active:category===key}" @click="category=key!">{{label}}<b>{{stats[key!]||0}}</b></button></div>
  <div class="toolbar"><el-dropdown v-if="!recycled&&permissions.can('shop.create')" split-button type="primary" @click="edit()" @command="importing=true">创建店铺<template #dropdown><el-dropdown-menu><el-dropdown-item>批量导入店铺</el-dropdown-item></el-dropdown-menu></template></el-dropdown>
    <el-dropdown v-if="permissions.can('shop.export')" @command="exportAll($event==='selected')"><el-button>导出店铺<el-icon><ArrowDown/></el-icon></el-button><template #dropdown><el-dropdown-menu><el-dropdown-item command="all">导出当前筛选结果</el-dropdown-item><el-dropdown-item command="selected" :disabled="!selected.length">导出所选店铺</el-dropdown-item></el-dropdown-menu></template></el-dropdown>

    <el-input v-model="query" class="search" placeholder="店铺名称 / 平台 / 账号 / 备注" clearable @clear="page=1;load()" @keyup.enter="page=1;load()"/><el-button :icon="Search" @click="page=1;load()">查询</el-button><el-button :icon="Refresh" aria-label="刷新店铺" @click="load"/><el-button :icon="Setting" aria-label="设置表格字段" @click="columnsDialog=true"/>
  </div>
  <el-table v-loading="loading" :data="items" row-key="id" @selection-change="selected=$event"><el-table-column type="selection" width="42"/><el-table-column label="店铺信息" min-width="200"><template #default="{row}"><div class="table-name"><el-button v-if="permissions.can('shop.edit')" link :icon="row.favorite?StarFilled:Star" :type="row.favorite?'warning':'info'" aria-label="设置常用店铺" @click="favorite(row)"/><button class="table-link" @click="detail=row">{{row.name}}</button></div><div class="table-sub">{{row.accountName||'未设置账号'}}</div></template></el-table-column>
    <el-table-column v-if="visibleColumns.includes('platform')" label="所属平台" min-width="140"><template #default="{row}">{{row.platform||'其他平台'}}<div class="table-sub">{{row.platformSiteName||(row.platformSiteId?'未匹配站点':'自定义网站')}}</div></template></el-table-column>
    <el-table-column v-if="visibleColumns.includes('device')" label="网络信息" min-width="185"><template #default="{row}"><button v-if="permissions.can('shop.edit')&&(permissions.can('device.view')||permissions.can('proxy.view'))" class="table-link" @click="openBinding(row)">{{row.deviceName||'网络配置'}}</button><span v-else>{{row.deviceName||'待配置网络'}}</span><div class="table-sub">{{row.deviceHost||'—'}}</div><div class="table-sub">{{row.deviceRegion}}</div></template></el-table-column>
    <el-table-column v-if="visibleColumns.includes('grants')" label="授权人员" min-width="150"><template #default="{row}"><button v-if="permissions.can('shop.grant')" class="table-link" @click="openGrants(row)">{{row.grantedNames||'去授权'}}</button><span v-else>{{row.grantedNames||'—'}}</span></template></el-table-column>
    <el-table-column v-if="visibleColumns.includes('remark')" prop="remark" label="备注" min-width="130" show-overflow-tooltip/>
    <el-table-column v-if="visibleColumns.includes('updated')" label="更新时间" min-width="175"><template #default="{row}"><div class="table-sub">创建人：{{row.creatorName}}</div>{{date(row.updatedAt||row.createdAt)}}</template></el-table-column>
    <el-table-column label="操作" width="195" fixed="right">
      <template #default="{row}">
        <div v-if="!recycled" class="shop-actions">
          <div class="shop-row-actions">
            <el-button v-if="permissions.can('shop.open')" class="shop-open-button" type="primary" plain :loading="states[row.id]==='closing'" @click="states[row.id]==='running'||opening[row.id]||states[row.id]==='starting'?close(row):open(row)">{{states[row.id]==='running'?'关闭店铺':opening[row.id]||states[row.id]==='starting'?'取消打开':'打开店铺'}}</el-button>
            <el-dropdown trigger="click" popper-class="shop-actions-menu">
              <el-button class="shop-more-button" text aria-label="更多店铺操作"><span>更多</span><el-icon><ArrowDown/></el-icon></el-button>
              <template #dropdown><el-dropdown-menu>
                <el-dropdown-item v-if="states[row.id]==='running'&&permissions.can('shop.open')" @click="open(row)">显示浏览器窗口</el-dropdown-item>
                <el-dropdown-item v-if="permissions.can('shop.edit')" @click="edit(row)">编辑店铺</el-dropdown-item>
                <el-dropdown-item v-if="permissions.can('shop.edit')&&(permissions.can('device.view')||permissions.can('proxy.view'))" @click="openBinding(row)">配置 / 解绑网络</el-dropdown-item>
                <el-dropdown-item v-if="permissions.can('shop.grant')" @click="openGrants(row)">授权成员</el-dropdown-item>
                <el-dropdown-item v-if="permissions.can('shop.create')" @click="copy(row)">复制店铺</el-dropdown-item>
                <el-dropdown-item v-if="permissions.can('shop.edit')" @click="favorite(row)">{{row.favorite?'取消常用':'设为常用'}}</el-dropdown-item>
                <el-dropdown-item v-if="permissions.can('shop.delete')" divided @click="recycle(row)">删除店铺</el-dropdown-item>
              </el-dropdown-menu></template>
            </el-dropdown>
          </div>
          <div v-if="progress[row.id]" class="shop-action-progress" role="status">{{progress[row.id].message}}<span v-if="progress[row.id].percent!==null"> {{progress[row.id].percent}}%</span></div>
        </div>
        <div v-else class="shop-row-actions"><el-button v-if="permissions.can('shop.delete')" link type="primary" @click="restore(row)">恢复店铺</el-button><el-button v-if="permissions.can('shop.delete')" link type="danger" @click="recycle(row)">永久删除</el-button></div>
      </template>
    </el-table-column><template #empty><el-empty :description="recycled?'回收站暂无店铺':'暂无店铺数据'" :image-size="90"/></template>
  </el-table>
  <div class="table-pagination"><div class="batch-actions"><span class="muted">已选 {{selected.length}} 个</span><template v-if="!recycled"><el-button v-if="permissions.can('shop.open')" size="small" :disabled="!selected.length" @click="batch('open')">批量打开</el-button><el-button v-if="permissions.can('shop.open')" size="small" :disabled="!selected.length" @click="batch('close')">批量关闭</el-button><el-button v-if="permissions.can('shop.delete')" size="small" :disabled="!selected.length" @click="batch('recycle')">批量删除</el-button></template><template v-else><el-button size="small" :disabled="!selected.length" @click="batch('restore')">批量恢复</el-button><el-button size="small" :disabled="!selected.length" @click="batch('delete')">永久删除</el-button></template></div><el-pagination v-model:current-page="page" v-model:page-size="size" :page-sizes="[20,50,100]" :total="total" layout="total,sizes,prev,pager,next,jumper" @current-change="load" @size-change="page=1;load()"/></div>
</section>
<CopyMall v-if="copying" :shop="copying" @close="copying=undefined" @done="load"/>
<DetailMall v-if="detail" :shop="detail" @close="detail=undefined" @edit="edit(detail);detail=undefined" @bind="openBinding(detail);detail=undefined"/>
<MallEditor v-model="editing" :form="form" :saving="saving" @save="save"/>
<ImportDialog v-model="importing" title="批量导入店铺" :columns="importColumns" :submit="importRows" @done="load"/>
<el-dialog v-model="columnsDialog" title="表格字段设置" width="400px"><el-checkbox-group v-model="visibleColumns"><el-checkbox v-for="(label,key) in {platform:'所属平台',device:'网络信息',grants:'授权人员',updated:'更新时间',remark:'备注'}" :key="key" :value="key">{{label}}</el-checkbox></el-checkbox-group></el-dialog>
<NetworkBindingDialog v-model="binding" :shop="selectedShop" @done="load"/>
  <el-dialog v-model="granting" title="店铺授权" width="620px"><el-table :data="granted"><el-table-column prop="displayName" label="成员"/><el-table-column prop="username" label="账号"/><el-table-column label="操作"><template #default="{row}"><el-button link type="danger" @click="revoke(row.userId)">撤销</el-button></template></el-table-column></el-table><div class="toolbar"><el-select v-model="selectedMembers" multiple filterable placeholder="选择需要授权的成员"><el-option v-for="m in availableMembers" :key="m.id" :value="m.id" :label="`${m.displayName} (${m.username})`"/></el-select><el-button type="primary" :disabled="!selectedMembers.length" @click="grant">授权</el-button></div></el-dialog>
</template>
