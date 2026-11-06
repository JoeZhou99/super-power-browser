import {createRouter,createWebHashHistory} from 'vue-router';
import {token} from '@/utils/request';
import {usePermissions} from '@/store/modules/permission.store';
import mall from './modules/businessCenter/mall';
import devices from './modules/businessCenter/agentIp';
import money from './modules/businessCenter/money';
const router=createRouter({history:createWebHashHistory(),routes:[
  {path:'/',redirect:'/dashboard'},
  {path:'/dashboard',component:()=>import('@/views/dashboard/index.vue'),meta:{title:'首页'}},
  {path:'/noticeSetting',component:()=>import('@/views/noticeSetting/index.vue'),meta:{title:'账号安全设置'}},
  {path:'/login',component:()=>import('@/views/login/index.vue')},
  ...mall,...devices,...money,
  {path:'/zhifuAgent',component:()=>import('@/ai/views/zhifuAgent/index.vue'),meta:{title:'SuperPower AI'}},
  {path:'/companyManage/membersMamanger',component:()=>import('@/views/company/index.vue'),meta:{title:'成员与授权'}},
  {path:'/companyManage/roles',component:()=>import('@/views/company/index.vue'),meta:{title:'角色权限'}},
  {path:'/set-center',component:()=>import('@/views/system/setCenter/index.vue'),meta:{title:'设置中心'}}
]});
router.beforeEach(async to=>{
  if(to.path==='/login')return true;
  if(!token())return '/login';
  const permissions=usePermissions();
  await permissions.load();await permissions.syncDesktop();
  const path=to.path;
  const required=path==='/zhifuAgent'?['ai.use']:path.startsWith('/mall/')?['shop.view']:path==='/agentIp/aggregateBuy3'?['device.buy']:path==='/agentIp/renew3'||path==='/agentIp/buySpeed'?['device.renew']:path.startsWith('/agentIp/')?['device.view']:path==='/money/recharge'?['wallet.view','wallet.recharge']:path==='/money/order'?['order.view']:path.startsWith('/companyManage/')?['member.manage','role.manage']:[];
  return required.length&&!required.some(p=>permissions.can(p))?'/set-center':true;
});
export default router;
