<script setup lang="ts">
import {useAccount} from '@/store/modules/account.store';
import {usePermissions} from '@/store/modules/permission.store';
import {useRouter} from 'vue-router';
import {ElMessage} from 'element-plus';
import {ArrowDown,User,Lock,SwitchButton,CopyDocument} from '@element-plus/icons-vue';
import {yuan} from '@/utils/format';
const account=useAccount(),permissions=usePermissions(),router=useRouter();
async function copy(){await navigator.clipboard.writeText(account.profile.id);ElMessage.success('账号 ID 已复制');}
</script>
<template>
  <el-popover trigger="hover" placement="bottom-start" :width="350" :show-after="100" :hide-after="200" popper-class="account-popover" @show="account.load()">
    <template #reference><button class="account-trigger" aria-label="账户信息"><span class="app-mark"><img src="/brand-mark.svg" alt="SuperPower"/></span><span class="account-trigger-text"><b>{{account.profile?.companyName||'SuperPower Browser'}}</b><small>{{account.profile?.displayName||permissions.user?.username}} · 0.1.0</small></span><el-icon><ArrowDown/></el-icon></button></template>
    <div class="account-pop-title"><el-icon><User/></el-icon><b>{{account.profile?.companyName}}</b></div>
    <div class="account-metrics"><div><strong>{{account.deviceCount??'—'}}</strong><span>设备数量</span></div><div><strong>{{account.profile?.memberCount??'—'}}</strong><span>成员数量</span></div><div><strong>¥ {{yuan(account.balance)}}</strong><span>账户余额 <el-button v-if="permissions.can('wallet.recharge')" link type="primary" @click="router.push('/money/recharge')">充值</el-button></span></div></div>
    <dl class="account-details"><dt>用户名</dt><dd>{{account.profile?.username}} <el-tag size="small">{{account.profile?.owner?'企业所有者':'成员'}}</el-tag></dd><dt>姓名</dt><dd>{{account.profile?.displayName}}</dd><dt>企业名称</dt><dd>{{account.profile?.companyName}}</dd><dt>账号 ID</dt><dd class="copy-id" :title="account.profile?.id"><span>{{account.profile?.id}}</span><el-button link :icon="CopyDocument" aria-label="复制账号 ID" @click="copy"/></dd><dt>当前角色</dt><dd>{{account.profile?.roles?.join('、')||'未分配角色'}}</dd></dl>
    <div class="account-menu"><button @click="router.push('/noticeSetting?activeName=acountSecurity')"><el-icon><Lock/></el-icon>账号安全设置</button><button @click="permissions.logout()"><el-icon><SwitchButton/></el-icon>退出登录</button></div>
  </el-popover>
</template>
