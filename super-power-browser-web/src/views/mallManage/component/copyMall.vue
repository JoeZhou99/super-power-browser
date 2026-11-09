<script setup lang="ts">
import {ref} from 'vue';
import {ElMessage} from 'element-plus';
import {mallApi} from '@/api/mall/mall.api';
import {usePermissions} from '@/store/modules/permission.store';
const props=defineProps<{shop:any}>(),emit=defineEmits(['close','done']),permissions=usePermissions();
const name=ref(''),fields=ref(['account','remark','fingerprint']),busy=ref(false);
async function save(){if(!name.value.trim()){ElMessage.warning('请输入店铺名称');return;}busy.value=true;try{await mallApi.copy(props.shop.id,{name:name.value,fields:fields.value});ElMessage.success('店铺复制成功');emit('done');emit('close');}finally{busy.value=false;}}
</script>
<template><el-dialog :model-value="true" :title="`复制店铺 #${shop.name}#`" width="600px" :close-on-click-modal="false" @close="emit('close')"><p>当前店铺：{{shop.platform}} <el-divider direction="vertical"/>{{shop.name}}</p><el-form label-position="top"><el-form-item label="店铺名称" required><el-input v-model="name" maxlength="100" placeholder="请输入新店铺名称"/></el-form-item><el-form-item label="选择需要复制的信息"><el-checkbox-group v-model="fields"><el-checkbox value="account">店铺账号及密码</el-checkbox><el-checkbox value="remark">店铺备注</el-checkbox><el-checkbox value="fingerprint">浏览器环境配置</el-checkbox><el-checkbox v-if="permissions.can('shop.edit')&&permissions.can('device.view')" value="device">网络配置</el-checkbox><el-checkbox v-if="permissions.can('shop.grant')" value="grants">授权成员</el-checkbox></el-checkbox-group></el-form-item></el-form><template #footer><el-button @click="emit('close')">取消</el-button><el-button type="primary" :loading="busy" @click="save">确定</el-button></template></el-dialog></template>
