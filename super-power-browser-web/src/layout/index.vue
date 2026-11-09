<script setup lang="ts">
import {computed,nextTick,onMounted,ref,watch} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {House,Shop,Monitor,Connection,Wallet,User,Setting,Fold,Expand,Refresh,Close,ChatDotRound} from '@element-plus/icons-vue';
import CompanyInfo from './components/Sidebar/components/CompanyInfo.vue';
import WindowControls from '@/components/WindowControls.vue';
import {usePermissions} from '@/store/modules/permission.store';
import {useAccount} from '@/store/modules/account.store';
const route=useRoute(),router=useRouter(),permissions=usePermissions(),account=useAccount();
const windowControls=Boolean(window.api?.windowControl);
const MAX_OPEN_TABS=6;
let tabVisit=0;
const collapsed=ref(false),viewKey=ref(0),tabs=ref([{path:'/dashboard',title:'首页',lastVisited:0}]);
const tabsElement=ref<HTMLElement>();
function tabIcon(path:string){return path.startsWith('/mall')?Shop:path.startsWith('/agentIp')?Monitor:path.startsWith('/proxy')?Connection:path.startsWith('/money')?Wallet:path.startsWith('/companyManage')?User:path.startsWith('/zhifuAgent')?ChatDotRound:path.startsWith('/dashboard')?House:Setting;}
const groups=computed(()=>[
  {name:'shop',title:'店铺管理',icon:Shop,children:[['店铺管理','/mall/mallManage','shop.view'],['回收站','/mall/recycle','shop.view']]},
  {name:'device',title:'设备管理',icon:Monitor,children:[['设备列表','/agentIp/all','device.view'],['购买设备','/agentIp/aggregateBuy3','device.buy'],['设备回收站','/agentIp/recycle','device.view']]},
  {name:'proxy',title:'代理管理',icon:Connection,children:[['代理列表','/proxy/list','device.view'],['动态代理','/proxy/dynamic','device.view']]},
  {name:'money',title:'费用管理',icon:Wallet,children:[['账户充值','/money/recharge','wallet.recharge|wallet.view'],['订单管理','/money/order','order.view']]},
  {name:'company',title:'成员管理',icon:User,children:[['成员管理','/companyManage/membersMamanger','member.manage|role.manage'],['角色权限','/companyManage/roles','role.manage|member.manage']]}
].map(g=>({...g,children:g.children.filter(c=>c[2]!.split('|').some(p=>permissions.can(p)))})).filter(g=>g.children.length));
watch(()=>route.fullPath,async()=>{
  const path=route.fullPath,current=tabs.value.find(tab=>tab.path===path);
  if(current)current.lastVisited=++tabVisit;
  else{
    if(tabs.value.length>=MAX_OPEN_TABS){
      const oldest=tabs.value.filter(tab=>tab.path!=='/dashboard').reduce((previous,tab)=>tab.lastVisited<previous.lastVisited?tab:previous);
      tabs.value.splice(tabs.value.indexOf(oldest),1);
    }
    tabs.value.push({path,title:String(route.meta.title||'工作台'),lastVisited:++tabVisit});
  }
  await nextTick();
  tabsElement.value?.querySelector('.workspace-tab.active')?.scrollIntoView({block:'nearest',inline:'nearest'});
},{immediate:true});
function closeTab(path:string){const index=tabs.value.findIndex(t=>t.path===path);if(index<0||path==='/dashboard')return;tabs.value.splice(index,1);if(route.fullPath===path)router.push(tabs.value[Math.max(0,index-1)]?.path||'/dashboard');}
onMounted(()=>account.load());
</script>
<template>
  <div class="shell" :class="{collapsed}"><aside class="sidebar"><CompanyInfo/>
    <el-menu router :default-active="route.path==='/proxy/recycle'?'/proxy/list':route.path" :default-openeds="['shop','device','proxy','money','company']" :collapse="collapsed" class="navigation">
      <el-menu-item index="/dashboard"><el-icon><House/></el-icon><template #title>首页</template></el-menu-item>
      <el-sub-menu v-for="group in groups" :key="group.name" :index="group.name"><template #title><el-icon><component :is="group.icon"/></el-icon><span>{{group.title}}</span></template><el-menu-item v-for="child in group.children" :key="child[1]" :index="child[1]">{{child[0]}}</el-menu-item></el-sub-menu>
      <el-menu-item v-if="permissions.can('ai.use')" index="/zhifuAgent"><el-icon><ChatDotRound/></el-icon><template #title>SuperPower AI</template></el-menu-item>
    </el-menu>
    <div class="sidebar-bottom"><router-link to="/set-center"><el-icon><Setting/></el-icon><span v-if="!collapsed">设置中心</span></router-link><small v-if="!collapsed">SuperPower Browser · 0.1.0</small></div>
  </aside>
  <div class="workspace"><header class="workspace-header">
    <el-button class="collapse-toggle" text :icon="collapsed?Expand:Fold" :aria-label="collapsed?'展开菜单':'折叠菜单'" :title="collapsed?'展开菜单':'折叠菜单'" @click="collapsed=!collapsed"/>
    <div ref="tabsElement" class="workspace-tabs" aria-label="已打开的页面"><div v-for="tab in tabs" :key="tab.path" class="workspace-tab" :class="{active:route.fullPath===tab.path}"><router-link :to="tab.path" :title="tab.title"><el-icon><component :is="tabIcon(tab.path)"/></el-icon><span>{{tab.title}}</span></router-link><button v-if="tab.path!=='/dashboard'" :aria-label="`关闭${tab.title}页签`" :title="`关闭${tab.title}`" @click="closeTab(tab.path)"><el-icon><Close/></el-icon></button></div></div>
    <div class="workspace-actions"><el-button text :icon="Refresh" aria-label="刷新当前页面" title="刷新当前页面" @click="viewKey++;account.load()"/><el-button text :icon="Setting" aria-label="设置中心" title="设置中心" @click="router.push('/set-center')"/><span v-if="windowControls" class="window-actions-divider"/><WindowControls/></div>
  </header>
    <main class="workspace-main" :class="{'ai-host':route.path==='/zhifuAgent'}"><router-view :key="route.fullPath+viewKey"/></main>
  </div></div>
</template>
