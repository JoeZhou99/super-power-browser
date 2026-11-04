<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue';
import {useRouter} from 'vue-router';
import {Shop,Monitor,Wallet,User,Right,Plus,Check,Close} from '@element-plus/icons-vue';
import {useAccount} from '@/store/modules/account.store';
import {usePermissions} from '@/store/modules/permission.store';
import {request} from '@/utils/request';
import {date,yuan} from '@/utils/format';
const account=useAccount(),permissions=usePermissions(),router=useRouter();
const shops=ref<any>({}),devices=ref<any[]>([]),orders=ref<any>({}),recent=ref<any[]>([]),category=ref('recent_open');
const guide=ref(true),loaded=ref(false);
const expiring=computed(()=>devices.value.reduce((n,d)=>n+(d.willExpiredIp||0),0));
const noRenew=computed(()=>devices.value.reduce((n,d)=>n+(d.unAutoRenew||0),0));
async function loadRecent(){if(permissions.can('shop.view'))recent.value=(await request(`/environments?category=${category.value}&size=8`)).items;}
onMounted(async()=>{await account.load();guide.value=localStorage.getItem(`spb-guide-${account.profile.id}`)!=='hidden';await Promise.all([permissions.can('shop.view')?request('/environments/statistics').then(r=>shops.value=r):null,permissions.can('device.view')?Promise.all([1,20,2].map(type=>request(`/devices/statistics?type=${type}`))).then(r=>devices.value=r):null,permissions.can('order.view')?request('/orders?status=PENDING&size=1').then(r=>orders.value=r):null,loadRecent()]);loaded.value=true;});
watch(category,loadRecent);
function toggleGuide(){guide.value=!guide.value;localStorage.setItem(`spb-guide-${account.profile.id}`,guide.value?'visible':'hidden');}
async function open(row:any){if(!window.api)throw new Error('请在桌面客户端中打开店铺');await window.api.openBrowser(row.id);await loadRecent();}
const steps=computed(()=>[
  {title:'创建店铺',text:'选择店铺所属平台，填写登录信息，配置独立浏览器环境。',path:'/mall/mallManage?create=1',permission:'shop.create',done:shops.value.all>0,button:'去创建'},
  {title:'购买设备',text:'购买平台设备，或添加自有代理设备，为店铺配置网络环境。',path:permissions.can('device.buy')?'/agentIp/aggregateBuy3':'/agentIp/all?type=2&create=1',permission:permissions.can('device.buy')?'device.buy':'device.edit',done:(account.deviceCount||0)>0,button:permissions.can('device.buy')?'去购买':'添加设备'},

]);
const shortcuts=computed(()=>[
  {title:'创建店铺',icon:Shop,path:'/mall/mallManage?create=1',permission:'shop.create'},
  {title:'购买设备',icon:Monitor,path:'/agentIp/aggregateBuy3',permission:'device.buy'},
  {title:'账户充值',icon:Wallet,path:'/money/recharge',permission:'wallet.recharge'},
  {title:'添加成员',icon:User,path:'/companyManage/membersMamanger?create=1',permission:'member.manage'}
].filter(s=>permissions.can(s.permission)));
</script>
<template><div class="dashboard">
  <section class="panel novice-guide"><div class="section-toolbar"><h2 class="block-title">新手引导 <small>快速上手</small></h2><el-button link :icon="guide?Close:Plus" @click="toggleGuide">{{guide?'收起引导':'展开引导'}}</el-button></div><div v-if="guide" class="guide-grid"><article v-for="(step,index) in steps" :key="step.title"><div class="guide-heading"><span class="guide-step">操作{{['一','二'][index]}}</span><h3>{{step.title}}</h3></div><p>{{step.text}}</p><el-button v-if="loaded&&step.done" class="guide-completed" :icon="Check" @click="router.push(step.path)">已完成</el-button><el-button v-else type="primary" :disabled="!permissions.can(step.permission)" @click="router.push(step.path)">{{step.button}}<el-icon><Right/></el-icon></el-button><el-icon class="guide-art"><component :is="index===0?Shop:Monitor"/></el-icon></article></div></section>
  <div class="overview-grid"><section class="panel overview-main"><div class="overview-cards"><div v-if="permissions.can('shop.view')" class="overview-card"><h3><el-icon><Shop/></el-icon>店铺概况</h3><div><button @click="router.push('/mall/mallManage')"><span>店铺数</span><strong>{{shops.all||0}}</strong></button><button @click="router.push('/mall/mallManage?category=unbindIp')"><span>待绑定设备</span><strong>{{shops.unbindIp||0}}</strong></button></div></div><div v-if="permissions.can('device.view')" class="overview-card"><h3><el-icon><Monitor/></el-icon>设备概况</h3><div><button @click="router.push('/agentIp/all?category=willExpiredIp')"><span>即将到期</span><strong class="orange">{{expiring}}</strong></button><button @click="router.push('/agentIp/all?category=unAutoRenew')"><span>待开启自动续费</span><strong>{{noRenew}}</strong></button></div></div></div><h2 class="block-title shortcut-title">常用功能</h2><div class="quick-grid"><button v-for="item in shortcuts" :key="item.path" @click="router.push(item.path)"><el-icon><component :is="item.icon"/></el-icon><b>{{item.title}}</b><el-icon><Right/></el-icon></button></div></section>
    <section class="panel account-summary"><h2 class="block-title">账户信息</h2><div class="summary-balance"><span>账户余额（元）</span><el-button v-if="permissions.can('wallet.recharge')" link type="primary" @click="router.push('/money/recharge')">去充值</el-button><strong>¥ {{yuan(account.balance)}}</strong></div><dl class="account-details"><dt>企业名称</dt><dd>{{account.profile?.companyName}}</dd><dt>当前账号</dt><dd>{{account.profile?.username}}</dd><dt>角色</dt><dd>{{account.profile?.roles?.join('、')||'未分配'}}</dd></dl><div v-if="account.profile?.memberCount!=null" class="member-summary"><span>成员信息 <b>{{account.profile.memberCount}}</b></span><el-button link type="primary" @click="router.push('/companyManage/membersMamanger')">管理成员</el-button></div></section>
  </div>
  <section v-if="permissions.can('shop.view')" class="panel"><div class="recent-heading"><el-tabs v-model="category"><el-tab-pane :label="`最近打开 (${shops.recent_open||0})`" name="recent_open"/><el-tab-pane :label="`常用店铺 (${shops.often_use||0})`" name="often_use"/></el-tabs><el-button link type="primary" @click="router.push('/mall/mallManage')">全部店铺 <el-icon><Right/></el-icon></el-button></div><el-table :data="recent"><el-table-column label="店铺信息" min-width="180"><template #default="{row}"><b>{{row.name}}</b><div class="table-sub">{{row.accountName||'未设置账号'}}</div></template></el-table-column><el-table-column prop="platform" label="所属平台"/><el-table-column label="设备信息"><template #default="{row}">{{row.deviceId?'已绑定设备':'待绑定设备'}}</template></el-table-column><el-table-column label="最近打开" min-width="160"><template #default="{row}">{{date(row.lastOpenedAt)}}</template></el-table-column><el-table-column label="操作" width="130"><template #default="{row}"><el-button v-if="permissions.can('shop.open')" type="primary" plain size="small" @click="open(row)">打开店铺</el-button></template></el-table-column><template #empty><el-empty description="暂无店铺记录" :image-size="70"><el-button v-if="permissions.can('shop.create')" type="primary" :icon="Plus" @click="router.push('/mall/mallManage?create=1')">创建店铺</el-button></el-empty></template></el-table></section>
</div></template>
