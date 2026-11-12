<script setup lang="ts">
import {computed,ref,watch} from 'vue';
import {useRouter} from 'vue-router';
import {ElMessage,ElMessageBox} from 'element-plus';
import {request,queryString} from '@/utils/request';
import {mallApi} from '@/api/mall/mall.api';
import {usePermissions} from '@/store/modules/permission.store';
import {date} from '@/utils/format';

const props=defineProps<{modelValue:boolean;shop?:{id:string;name:string;deviceId?:string}}>();
const emit=defineEmits<{(e:'update:modelValue',value:boolean):void;(e:'done'):void}>();
const permissions=usePermissions(),router=useRouter();
const source=ref<'device'|'proxy'>('proxy'),deviceType=ref(1),webType=ref(0);
const query=ref(''),page=ref(1),total=ref(0),items=ref<any[]>([]),selected=ref<any>();
const loading=ref(false),saving=ref(false),initializing=ref(false);
const networkNotice=ref('');
let requestId=0,openId=0;
const isProxy=computed(()=>source.value==='proxy');
const expired=(row:any)=>Boolean(row.expiresAt&&Date.parse(row.expiresAt)<=Date.now());
const address=(row:any)=>`${String(row.host).includes(':')?'['+row.host+']':row.host}:${row.port}`;
async function load(){
  if(!props.modelValue||initializing.value)return;
  if(!permissions.can(isProxy.value?'proxy.view':'device.view')){items.value=[];total.value=0;return;}
  const id=++requestId;loading.value=true;
  try{
    const params={query:query.value,page:page.value,size:50,...(isProxy.value?{webType:webType.value}:{type:deviceType.value})};
    const result=await request(`${isProxy.value?'/proxies':'/devices'}?${queryString(params)}`);
    if(id===requestId){items.value=result.items;total.value=result.total;}
  }catch(error){if(id===requestId){items.value=[];total.value=0;ElMessage.error(error instanceof Error?error.message:'网络列表加载失败');}}
  finally{if(id===requestId)loading.value=false;}
}
async function initialize(){
  const id=++openId;++requestId;initializing.value=true;loading.value=true;selected.value=undefined;items.value=[];query.value='';page.value=1;webType.value=0;networkNotice.value='';
  source.value=permissions.can('proxy.view')?'proxy':'device';
  try{
    const current=props.shop?.deviceId?await request(`/devices/${encodeURIComponent(props.shop.deviceId)}`):undefined;
    if(id!==openId)return;
    const currentSource=current?(current.ipType===2?'proxy':'device'):source.value;
    if(permissions.can(currentSource==='proxy'?'proxy.view':'device.view'))source.value=currentSource;
    deviceType.value=current?.ipType===20?20:1;selected.value=current;
  }catch(error){if(id===openId)networkNotice.value=`当前网络信息无法读取：${error instanceof Error?error.message:'请稍后重试'}。可从有权限的网络中重新选择。`;}
  finally{if(id===openId){initializing.value=false;loading.value=false;await load();}}
}
watch(()=>props.modelValue,visible=>{if(visible)void initialize();else{++openId;++requestId;loading.value=false;}},{immediate:true});
watch([source,deviceType,webType],()=>{if(!initializing.value){page.value=1;selected.value=undefined;void load();}},{flush:'sync'});
function choose(row:any){if(!expired(row))selected.value=row;}
async function save(unbind=false){
  if(!props.shop||(!unbind&&!selected.value)||saving.value)return;
  if(unbind){try{await ElMessageBox.confirm('解除当前店铺的网络绑定？重新配置网络前将无法打开店铺。','解除网络绑定',{type:'warning'});}catch{return;}}
  saving.value=true;
  try{
    const states=await window.api?.browserStates();
    if(states&&['running','starting','closing'].includes(states[props.shop.id]||'')){ElMessage.warning('请先关闭该店铺浏览器，再更改网络配置');return;}
    await mallApi.bind(props.shop.id,unbind?'':selected.value.id);ElMessage.success(unbind?'已解除网络绑定':'网络配置已保存');emit('done');emit('update:modelValue',false);
  }catch(error){ElMessage.error(error instanceof Error?error.message:'网络配置保存失败，请稍后重试');}finally{saving.value=false;}
}
function manage(){emit('update:modelValue',false);void router.push(isProxy.value?'/proxy/list?create=1':'/agentIp/aggregateBuy3');}
</script>

<template>
  <el-dialog :model-value="modelValue" title="网络配置" width="960px" :close-on-click-modal="false" @update:model-value="emit('update:modelValue',$event)">
    <p class="muted">当前店铺：{{shop?.name}}</p>
    <el-alert v-if="networkNotice" :title="networkNotice" type="warning" :closable="false"/>
    <el-tabs v-model="source"><el-tab-pane v-if="permissions.can('proxy.view')" label="已添加的代理" name="proxy"/><el-tab-pane v-if="permissions.can('device.view')" label="平台设备" name="device"/></el-tabs>
    <div class="toolbar">
      <el-select v-if="isProxy" v-model="webType" style="width:140px" aria-label="代理网络类型"><el-option label="全部代理" :value="0"/><el-option label="静态代理" :value="2"/><el-option label="动态代理" :value="1"/></el-select>
      <el-select v-else v-model="deviceType" style="width:160px" aria-label="平台设备类型"><el-option label="平台设备" :value="1"/><el-option label="专享平台设备" :value="20"/></el-select>
      <el-input v-model="query" class="search" :placeholder="isProxy?'代理名称 / 地址 / 地域 / 备注':'设备名称 / 地址 / 地域'" clearable @clear="page=1;load()" @keyup.enter="page=1;load()"/>
      <el-button @click="page=1;load()">搜索</el-button>
      <el-button v-if="isProxy?permissions.can('proxy.edit'):permissions.can('device.buy')" type="primary" plain @click="manage">{{isProxy?'添加代理':'购买设备'}}</el-button>
    </div>
    <el-table :data="items" v-loading="loading" row-key="id" height="320" @row-click="choose">
      <el-table-column width="48"><template #default="{row}"><el-radio :model-value="selected?.id" :value="row.id" :disabled="expired(row)" :aria-label="row.name" @change="choose(row)"><span/></el-radio></template></el-table-column>
      <el-table-column prop="name" :label="isProxy?'代理名称':'设备名称'" min-width="150"/>
      <el-table-column label="连接信息" min-width="200"><template #default="{row}">{{address(row)}}<div class="table-sub">{{row.protocol.toUpperCase()}}<span v-if="isProxy"> · {{row.webType===1?'动态':'静态'}}</span></div></template></el-table-column>
      <el-table-column prop="region" label="地域" min-width="100"/>
      <el-table-column v-if="isProxy" label="最近出口 IP" min-width="150"><template #default="{row}">{{row.checkIp||'未检测'}}</template></el-table-column>
      <el-table-column label="绑定店铺" width="95"><template #default="{row}">{{row.boundCount||0}} 个</template></el-table-column>
      <el-table-column label="到期时间" min-width="170"><template #default="{row}"><span :class="{'expired-network':expired(row)}">{{row.expiresAt?date(row.expiresAt):'未设置'}}{{expired(row)?'（已到期）':''}}</span></template></el-table-column>
      <template #empty><el-empty :description="isProxy?'暂无可选代理，请先添加代理':'暂无可选平台设备'" :image-size="70"/></template>
    </el-table>
    <div class="table-pagination"><span class="muted">{{selected?'已选择：'+selected.name:'请选择一个网络连接'}}</span><el-pagination v-model:current-page="page" :total="total" :page-size="50" layout="total,prev,pager,next" @current-change="load"/></div>
    <template #footer><el-button v-if="shop?.deviceId" type="danger" plain :disabled="saving" @click="save(true)">解除当前绑定</el-button><el-button :disabled="saving" @click="emit('update:modelValue',false)">取消</el-button><el-button type="primary" :loading="saving" :disabled="!selected||expired(selected)||loading" @click="save()">确认绑定</el-button></template>
  </el-dialog>
</template>
<style scoped>.expired-network{color:var(--el-color-danger);}</style>
