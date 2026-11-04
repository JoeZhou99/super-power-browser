export default [
  {path:'/agentIp/all',component:()=>import('@/views/agentIp/index.vue'),meta:{title:'设备管理'}},
  {path:'/agentIp/recycle',component:()=>import('@/views/agentIp/index.vue'),meta:{title:'设备回收站',recycled:true}},
  {path:'/agentIp/aggregateBuy3',component:()=>import('@/views/agentIp/aggregateBuy.vue'),meta:{title:'购买设备服务'}},
  {path:'/agentIp/renew3',component:()=>import('@/views/agentIp/renew.vue'),meta:{title:'设备续费'}},
  {path:'/agentIp/buySpeed',component:()=>import('@/views/agentIp/compoents/buySpeed.vue'),meta:{title:'加速服务'}}
];
