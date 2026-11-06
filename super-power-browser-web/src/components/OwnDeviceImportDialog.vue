<script setup lang="ts">
import {ref,watch} from 'vue';
import {ElMessage,ElMessageBox} from 'element-plus';
import {UploadFilled,Download} from '@element-plus/icons-vue';
import {post} from '@/utils/request';
import {downloadOwnDeviceTemplate,readOwnDevices} from '@/utils/ownDeviceWorkbook';
const props=defineProps<{modelValue:boolean}>();const emit=defineEmits(['update:modelValue','done']);
const busy=ref(false),filename=ref(''),total=ref(0),processed=ref(0),success=ref(0),failed=ref(0),errors=ref<string[]>([]);
watch(()=>props.modelValue,open=>{if(open){filename.value='';total.value=processed.value=success.value=failed.value=0;errors.value=[];}});
async function choose(file:any){
  if(busy.value)return;
  let rows:any[];busy.value=true;
  try{rows=await readOwnDevices(file.raw);}catch(error:any){ElMessage.error(error.message);busy.value=false;return;}
  try{await ElMessageBox.confirm(`确认导入编辑 ${rows.length} 台自有设备？相同地址和端口会更新已有设备。`,'导入确认',{confirmButtonText:'确认导入',cancelButtonText:'取消'});}catch{busy.value=false;return;}
  filename.value=file.name;total.value=rows.length;processed.value=success.value=failed.value=0;errors.value=[];
  try{
    for(let offset=0;offset<rows.length;offset+=30){
      const batch=rows.slice(offset,offset+30),result=await post('/devices/import-own',batch);
      success.value+=result.successCount;failed.value+=result.errorCount;processed.value+=batch.length;
      for(const error of result.errorMsgData||[])errors.value.push(`第 ${batch[error.index-1]?.rowNumber??offset+error.index+2} 行：${error.message}`);
    }
  }catch{errors.value.push('导入中断，本批处理结果未确认。请刷新设备列表后核对，可重新上传同一文件。');}
  finally{busy.value=false;emit('done');}
}
</script>
<template>
  <el-dialog :model-value="modelValue" title="导入编辑自有设备" width="600px" :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy" @update:model-value="emit('update:modelValue',$event)">
    <p>注意：</p><p>1、下载模板：如未下载模板，请先下载 <el-button link type="primary" :icon="Download" @click="downloadOwnDeviceTemplate">下载模板（.xlsx）</el-button></p>
    <p class="muted">2、按模板填写设备信息，红色字段必填，每次最多 300 台。支持首行表头或首行说明、第二行表头的模板。</p>
    <p class="muted">3、相同地址和端口更新已有自有设备；新地址新增设备。编辑时密码留空保留原密码。</p>
    <el-upload drag :disabled="busy" :auto-upload="false" :show-file-list="false" accept=".xlsx" :on-change="choose"><el-icon class="el-icon--upload"><UploadFilled/></el-icon><div>将文件拖到此处，或 <em>点击上传</em></div></el-upload>
    <div v-if="total" aria-live="polite"><p>{{filename}}</p><el-progress :percentage="Math.round(processed/total*100)"/><p>共 {{total}} 台，成功 {{success}} 台，失败 {{failed}} 台<span v-if="busy">，正在处理…</span></p><div class="import-errors"><p v-for="(error,index) in errors" :key="index">{{error}}</p></div></div>
    <template #footer><el-button :disabled="busy" @click="emit('update:modelValue',false)">关闭</el-button></template>
  </el-dialog>
</template>
<style scoped>.import-errors{max-height:220px;overflow:auto;color:var(--el-color-danger);}.import-errors p{margin:6px 0;}</style>
