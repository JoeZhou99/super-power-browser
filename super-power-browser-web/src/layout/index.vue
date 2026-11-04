<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {House,Shop,Monitor,Wallet,User,Setting,Fold,Expand,Refresh,Close} from '@element-plus/icons-vue';
import CompanyInfo from './components/Sidebar/components/CompanyInfo.vue';
import {usePermissions} from '@/store/modules/permission.store';
import {useAccount} from '@/store/modules/account.store';
const route=useRoute(),router=useRouter(),permissions=usePermissions(),account=useAccount();
const collapsed=ref(false),viewKey=ref(0),tabs=ref([{path:'/dashboard',title:'首页'}]);
const groups=computed(()=>[
  {name:'shop',title:'店铺管理',icon:Shop,children:[['店铺管理','/mall/mallManage','shop.view'],['回收站','/mall/recycle','shop.view']]},
  {name:'device',title:'设备管理',icon:Monitor,children:[['设备管理','/agentIp/all','device.view'],['购买设备','/agentIp/aggregateBuy3','device.buy'],['回收站','/agentIp/recycle','device.view']]},
  {name:'money',title:'费用管理',icon:Wallet,children:[['账户充值','/money/recharge','wallet.recharge|wallet.view'],['订单管理','/money/order','order.view']]},
  {name:'company',title:'成员管理',icon:User,children:[['成员管理','/companyManage/membersMamanger','member.manage|role.manage'],['角色权限','/companyManage/roles','role.manage|member.manage']]}
].map(g=>({...g,children:g.children.filter(c=>c[2]!.split('|').some(p=>permissions.can(p)))})).filter(g=>g.children.length));
watch(()=>route.fullPath,()=>{const path=route.fullPath;if(!tabs.value.some(t=>t.path===path))tabs.value.push({path,title:String(route.meta.title||'工作台')});},{immediate:true});
function closeTab(path:string){const index=tabs.value.findIndex(t=>t.path===path);tabs.value.splice(index,1);if(route.fullPath===path)router.push(tabs.value[Math.max(0,index-1)]?.path||'/dashboard');}
onMounted(()=>account.load());
</script>
<template>
  <div class="shell" :class="{collapsed}"><aside class="sidebar"><CompanyInfo/>
    <el-menu router :default-active="route.path" :default-openeds="['shop','device','money','company']" :collapse="collapsed" class="navigation">
      <el-menu-item index="/dashboard"><el-icon><House/></el-icon><template #title>首页</template></el-menu-item>
      <el-sub-menu v-for="group in groups" :key="group.name" :index="group.name"><template #title><el-icon><component :is="group.icon"/></el-icon><span>{{group.title}}</span></template><el-menu-item v-for="child in group.children" :key="child[1]" :index="child[1]">{{child[0]}}</el-menu-item></el-sub-menu>
    </el-menu>
    <div class="sidebar-bottom"><router-link to="/set-center"><el-icon><Setting/></el-icon><span v-if="!collapsed">设置中心</span></router-link><small v-if="!collapsed">SuperPower Browser · 0.1.0</small></div>
  </aside>
  <div class="workspace"><header class="workspace-header"><el-button text :icon="collapsed?Expand:Fold" aria-label="折叠菜单" @click="collapsed=!collapsed"/><div class="workspace-tabs"><div v-for="tab in tabs" :key="tab.path" class="workspace-tab" :class="{active:route.fullPath===tab.path}"><router-link :to="tab.path">{{tab.title}}</router-link><button v-if="tab.path!=='/dashboard'" :aria-label="`关闭${tab.title}页签`" @click="closeTab(tab.path)"><el-icon><Close/></el-icon></button></div></div><el-button text :icon="Refresh" aria-label="刷新当前页面" @click="viewKey++;account.load()"/><el-button text :icon="Setting" aria-label="设置中心" @click="router.push('/set-center')"/></header>
    <main class="workspace-main"><router-view :key="route.fullPath+viewKey"/></main>
  </div></div>
</template>
