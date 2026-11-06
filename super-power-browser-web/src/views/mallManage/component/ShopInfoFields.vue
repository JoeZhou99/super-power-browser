<script setup lang="ts">
import {usePermissions} from '@/store/modules/permission.store';
import PlatformSitePicker from './PlatformSitePicker.vue';
defineProps<{form:any;members:any[];active:boolean}>();
const permissions=usePermissions();
</script>
<template>
  <section class="mall-editor-section" aria-labelledby="shop-info-heading">
    <div class="mall-section-heading"><h3 id="shop-info-heading">店铺信息</h3><p>平台、账号与访问偏好</p></div>
    <el-form label-position="top" class="mall-section-form">
  <PlatformSitePicker v-if="active" :form="form"/>
  <el-form-item label="店铺名称" required><el-input v-model="form.name" maxlength="100" show-word-limit placeholder="用于展示、区分不同账号，可自定义名称"/></el-form-item>
  <el-form-item label="店铺账号"><el-input v-model="form.accountName" placeholder="请输入平台登录账号"/></el-form-item>
  <el-form-item label="店铺密码"><el-input v-model="form.accountPassword" type="password" show-password :placeholder="form.id?'不修改请留空；密码不会返回页面':'请输入平台登录密码'"/><el-checkbox v-model="form.fingerprint.accountLock">锁定输入框</el-checkbox></el-form-item>
  <el-form-item label="店铺备注"><el-input v-model="form.remark" maxlength="50" show-word-limit placeholder="请输入店铺备注"/></el-form-item>
  <el-form-item v-if="permissions.can('shop.grant')&&!form.id" label="授权成员"><el-select v-model="form.granteeIds" multiple filterable placeholder="请选择授权人员"><el-option v-for="m in members" :key="m.id" :value="m.id" :label="`${m.displayName} (${m.username})`"/></el-select></el-form-item>
  <el-form-item label="Passkey 配置"><el-checkbox v-model="form.fingerprint.autoInjectPasskey" :disabled="form.fingerprint.disabledPasskey">自动注入 Passkey</el-checkbox><el-tooltip content="开启后使用系统认证器，停止助手的虚拟认证器注入"><el-checkbox v-model="form.fingerprint.disabledPasskey">使用本地 Passkey</el-checkbox></el-tooltip></el-form-item>
  <el-form-item label="记住登录密码"><el-radio-group v-model="form.fingerprint.rememberPassword"><el-radio :value="true">开启</el-radio><el-radio :value="false">关闭</el-radio></el-radio-group></el-form-item>
  <el-form-item label="店铺共同访问限制"><el-radio-group :model-value="'unlimited'"><el-radio value="unlimited">不限</el-radio><el-tooltip content="跨客户端占用控制尚未接通"><el-radio value="single" disabled>限定 1 人</el-radio></el-tooltip></el-radio-group></el-form-item>
  <el-form-item label="消息提示"><el-radio-group v-model="form.fingerprint.notifications"><el-radio :value="true">开启</el-radio><el-radio :value="false">关闭</el-radio></el-radio-group></el-form-item>
    </el-form>
  </section>
</template>
