<script setup lang="ts">
import {onMounted,ref} from 'vue';
import {ElMessage,ElMessageBox} from 'element-plus';
const settings=ref<any>(),busy=ref(false);
async function load(){settings.value=await window.api?.settings();}onMounted(load);
async function clear(){try{await ElMessageBox.confirm('清理已关闭店铺的临时缓存？Cookie、站点数据和下载文件会保留。','清理缓存');}catch{return;}busy.value=true;try{const result=await window.api!.clearCache();ElMessage.success(`已清理 ${(result.removed/1024/1024).toFixed(1)} MB，跳过 ${result.skipped.length} 个运行中或无法清理的目录`);await load();}finally{busy.value=false;}}
async function update(){const result=await window.api!.checkUpdate();ElMessage.info(result.available?`发现新版本 ${result.version}，请联系管理员获取安装包`:'当前已是最新版本');}
</script>
<template><section class="panel"><h1 class="page-title">设置中心</h1><el-empty v-if="!settings" description="请在桌面客户端中查看版本与本地存储设置"/><template v-else><el-descriptions :column="1" border><el-descriptions-item label="客户端版本">{{settings.version}} <el-button link type="primary" @click="update">检查更新</el-button></el-descriptions-item><el-descriptions-item label="店铺数据目录">{{settings.userData}}</el-descriptions-item><el-descriptions-item label="浏览器内核目录">{{settings.corePath}}</el-descriptions-item><el-descriptions-item label="下载目录">{{settings.downloads}}</el-descriptions-item><el-descriptions-item label="临时缓存占用">{{(settings.cacheBytes/1024/1024).toFixed(1)}} MB</el-descriptions-item></el-descriptions><div class="toolbar"><el-button :loading="busy" @click="clear">清理临时缓存</el-button></div></template></section></template>
