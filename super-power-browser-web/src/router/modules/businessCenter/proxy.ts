export default [
  {path:'/proxy/recommend',component:()=>import('@/views/proxyManage/recommend.vue'),meta:{title:'代理 IP 推荐'}},
  {path:'/proxy/list',component:()=>import('@/views/proxyManage/index.vue'),meta:{title:'代理列表'}},
  {path:'/proxy/dynamic',component:()=>import('@/views/proxyManage/index.vue'),meta:{title:'动态代理'}},
  {path:'/proxy/recycle',component:()=>import('@/views/proxyManage/index.vue'),meta:{title:'代理回收站',recycled:true}}
];
