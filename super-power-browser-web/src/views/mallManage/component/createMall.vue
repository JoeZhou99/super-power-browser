<script setup lang="ts">
import {onMounted,ref,watch} from 'vue';
import {request} from '@/utils/request';
import {usePermissions} from '@/store/modules/permission.store';
import ShopInfoFields from './ShopInfoFields.vue';
import BrowserEnvironmentFields from './BrowserEnvironmentFields.vue';
const props=defineProps<{modelValue:boolean;form:any;saving:boolean}>();
const emit=defineEmits(['update:modelValue','save']);
const permissions=usePermissions(),members=ref<any[]>([]);
const kernels=ref<any[]>([]),kernelError=ref('');
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
    <div v-if="form.fingerprint" class="mall-editor-content">
      <ShopInfoFields :form="form" :members="members" :active="modelValue"/>
      <BrowserEnvironmentFields :form="form" :kernels="kernels" :kernel-error="kernelError" @new-ua="newUa"/>
    </div>
    <template #footer><el-button v-if="permissions.can('device.view')&&permissions.can('shop.edit')" type="primary" :loading="saving" @click="emit('save',true)">保存并配置网络</el-button><el-button @click="emit('update:modelValue',false)">取消</el-button><el-button :loading="saving" @click="emit('save',false)">保存</el-button></template>
  </el-dialog>
</template>
