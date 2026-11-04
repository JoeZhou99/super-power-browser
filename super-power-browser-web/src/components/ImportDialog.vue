<script setup lang="ts">
import {ref} from 'vue';
import {ElMessage} from 'element-plus';
import {UploadFilled,Download} from '@element-plus/icons-vue';
import {readWorkbook,downloadWorkbook} from '@/utils/workbook';
const props=defineProps<{modelValue:boolean;title:string;columns:Record<string,string>;submit:(rows:any[])=>Promise<unknown>}>();
const emit=defineEmits(['update:modelValue','done']);
const busy=ref(false),filename=ref(''),rows=ref<any[]>([]);
async function choose(file:any){rows.value=await readWorkbook(file.raw,props.columns);filename.value=file.name;}
async function save(){busy.value=true;try{await props.submit(rows.value);ElMessage.success(`已导入 ${rows.value.length} 条记录`);emit('done');emit('update:modelValue',false);rows.value=[];filename.value='';}finally{busy.value=false;}}
</script>
<template><el-dialog :model-value="modelValue" :title="title" width="620px" :close-on-click-modal="false" @update:model-value="emit('update:modelValue',$event)"><p>注意：</p><p class="muted">1、请先下载模板，按模板列填写数据。单次最多导入 200 条。</p><el-button link type="primary" :icon="Download" @click="downloadWorkbook('导入模板.xlsx',[],columns)">下载模板（.xlsx）</el-button><p class="muted">2、密码仅用于本次导入保存，导出文件不会包含密码。</p><el-upload drag :auto-upload="false" :show-file-list="false" accept=".xlsx,.json" :on-change="choose"><el-icon class="el-icon--upload"><UploadFilled/></el-icon><div>将文件拖到此处，或 <em>点击上传</em></div><template #tip><div class="muted">支持 .xlsx 和 .json</div></template></el-upload><p v-if="filename">{{filename}} · 已识别 {{rows.length}} 条</p><template #footer><el-button @click="emit('update:modelValue',false)">取消</el-button><el-button type="primary" :disabled="!rows.length" :loading="busy" @click="save">确认导入</el-button></template></el-dialog></template>
