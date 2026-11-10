<script setup lang="ts">
import {onMounted,ref,watch} from 'vue';
import {request} from '@/utils/request';
import {loadBrowserConfig,type BrowserConfig} from '@/api/config/browser-config.api';
import {usePermissions} from '@/store/modules/permission.store';
import ShopInfoFields from './ShopInfoFields.vue';
import BrowserEnvironmentFields from './BrowserEnvironmentFields.vue';
const props=defineProps<{modelValue:boolean;form:any;saving:boolean}>();
const emit=defineEmits(['update:modelValue','save']);
const permissions=usePermissions(),members=ref<any[]>([]);
const kernels=ref<any[]>([]),kernelError=ref('');
const browserConfig=ref<BrowserConfig>(),configLoading=ref(false),configError=ref('');
let configRequest=0;
async function refreshConfig(reset=false){
  const current=++configRequest;
  browserConfig.value=undefined;configLoading.value=true;configError.value='';
  try{
    const config=await loadBrowserConfig();
    if(current!==configRequest||!props.modelValue)return;
    browserConfig.value=config;
    if(reset){
      Object.assign(props.form.fingerprint,{...config.defaults,webRtc:'disabled',speechVoices:'privacy',fonts:'privacy',canvas:'privacy',audio:'privacy',clientRects:'privacy',fontMetrics:'privacy',webglFingerprint:'privacy'});
    }else if(!props.form.id){
      // Only initialize a new form. Reopening an existing shop never replaces saved values.
      for(const key of ['language','timezone','resolution'] as const)if(!props.form.fingerprint[key])props.form.fingerprint[key]=config.defaults[key];
    }
  }catch(error){
    if(current===configRequest&&props.modelValue)configError.value=error instanceof Error?error.message:'浏览器配置加载失败';
  }finally{if(current===configRequest)configLoading.value=false;}
}
watch(()=>props.modelValue,open=>{
  if(open)void refreshConfig();
  else{configRequest++;configLoading.value=false;browserConfig.value=undefined;configError.value='';}
},{immediate:true});
watch([()=>props.modelValue,()=>kernels.value],()=>{
  if(!props.modelValue||props.form.id||kernels.value.some(k=>k.version===props.form.kernelVersion&&!k.disabled))return;
  const selected=kernels.value.find(k=>k.recommended&&!k.disabled)||kernels.value.find(k=>!k.disabled);
  if(selected){props.form.kernelVersion=selected.version;newUa();}
});
onMounted(async()=>{
  const loadKernels=async()=>{try{
    const [result,runtime]=await Promise.all([request('/runtime/kernels'),window.api?.runtimePlatform?.()]);
    const platform=runtime?.platform||(/Mac/.test(navigator.platform)?'darwin':/Win/.test(navigator.platform)?'win32':'');
    const available=(result.kernels||[]).filter((k:any)=>!k.disabled&&(!platform||k.platform===platform)&&(!runtime?.arch||k.arch===runtime.arch));
    kernels.value=Array.from(new Map(available.map((k:any)=>[String(k.version),{...k,version:String(k.version),recommended:available.some((v:any)=>v.version===k.version&&v.recommended)}])).values());
    kernelError.value=kernels.value.length?'':'当前电脑暂无可用内核，请联系管理员发布';
  }catch{kernelError.value='无法获取内核清单，请检查内核资源服务';}};
  await Promise.all([loadKernels(),permissions.can('shop.grant')?request('/members').then(value=>{members.value=value.filter((m:any)=>m.enabled);}):Promise.resolve()]);
});
function newUa(){const os=props.form.fingerprint.os==='Mac'?'Macintosh; Intel Mac OS X 10_15_7':props.form.fingerprint.os==='Android'?'Linux; Android 13':'Windows NT 10.0; Win64; x64';props.form.fingerprint.userAgent=`Mozilla/5.0 (${os}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/${props.form.kernelVersion.includes(".")?props.form.kernelVersion:props.form.kernelVersion+".0.0.0"} Safari/537.36`;}
</script>
<template>
  <el-dialog class="mall-dialog" :model-value="modelValue" :title="form.id?'编辑店铺':'新建店铺'" width="980px" top="5vh" :close-on-click-modal="false" @update:model-value="emit('update:modelValue',$event)">
    <el-alert v-if="configError" :title="'浏览器配置加载失败：'+configError" type="error" :closable="false" show-icon><span>{{form.id?'已保存的配置仍保留，可重试加载选项。':'加载成功后才能保存新店铺。'}}</span><el-button link type="primary" @click="refreshConfig()">重新加载配置</el-button></el-alert>
    <el-alert v-else-if="configLoading" title="正在读取最新浏览器配置…" type="info" :closable="false"/>
    <div v-if="form.fingerprint" class="mall-editor-content">
      <ShopInfoFields :form="form" :members="members" :active="modelValue"/>
      <BrowserEnvironmentFields :form="form" :kernels="kernels" :kernel-error="kernelError" :config="browserConfig" :config-loading="configLoading" @new-ua="newUa" @reset-defaults="refreshConfig(true)"/>
    </div>
    <template #footer><el-button v-if="permissions.can('device.view')&&permissions.can('shop.edit')" type="primary" :loading="saving" :disabled="configLoading||(!form.id&&!browserConfig)" @click="emit('save',true)">保存并配置网络</el-button><el-button @click="emit('update:modelValue',false)">取消</el-button><el-button :loading="saving" :disabled="configLoading||(!form.id&&!browserConfig)" @click="emit('save',false)">保存</el-button></template>
  </el-dialog>
</template>
