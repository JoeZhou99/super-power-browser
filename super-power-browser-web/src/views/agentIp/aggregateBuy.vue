<script setup lang="ts">
import {computed,onMounted,ref,watch} from 'vue';
import {useRoute,useRouter} from 'vue-router';
import {ArrowLeft,Monitor} from '@element-plus/icons-vue';
import {ElMessage} from 'element-plus';
import {request,post} from '@/utils/request';
import {useAccount} from '@/store/modules/account.store';
import {usePermissions} from '@/store/modules/permission.store';
import {yuan,channelNames} from '@/utils/format';
import PaymentDialog from '@/components/PaymentDialog.vue';
const props=withDefaults(defineProps<{kind?:string}>(),{kind:'PURCHASE'}),route=useRoute(),router=useRouter(),account=useAccount(),permissions=usePermissions();
const products=ref<any[]>([]),channels=ref<string[]>([]),supply=ref(false),loading=ref(true),busy=ref(false);
const zone=ref(Number(route.query.type)===20?20:1),productType=ref(''),region=ref(''),area=ref(''),remoteType=ref(''),specification=ref(''),configuration=ref(''),packageName=ref(''),months=ref(1),quantity=ref(1),channel=ref('balance'),autoRenew=ref(false),agreed=ref(false),quote=ref<any>(),order=ref<any>(),requestId=ref(crypto.randomUUID()),quoteError=ref('');
const deviceId=String(route.query.deviceId||''),device=ref<any>();
const title=computed(()=>props.kind==='PURCHASE'?'购买设备服务':props.kind==='RENEW'?'续费设备服务':'购买专线加速服务');
const unique=(values:string[])=>[...new Set(values)];
const typeOf=(p:any)=>p.attributes?.productType||p.platform||'通用';
const zoneProducts=computed(()=>products.value.filter(p=>p.ipType===zone.value));
const types=computed(()=>unique(zoneProducts.value.map(typeOf)));
const typed=computed(()=>zoneProducts.value.filter(p=>typeOf(p)===productType.value));
const regions=computed(()=>unique(typed.value.map(p=>p.region)));
const regional=computed(()=>typed.value.filter(p=>p.region===region.value));
const areas=computed(()=>unique(regional.value.map(p=>p.area)));
const located=computed(()=>regional.value.filter(p=>p.area===area.value));
const remoteTypes=computed(()=>unique(located.value.map(p=>p.attributes?.remoteType||'')));
const remoteProducts=computed(()=>located.value.filter(p=>(p.attributes?.remoteType||'')===remoteType.value));
const specifications=computed(()=>unique(remoteProducts.value.map(p=>p.specification)));
const specified=computed(()=>remoteProducts.value.filter(p=>p.specification===specification.value));
const configurations=computed(()=>unique(specified.value.map(p=>p.attributes?.configuration||'')));
const configured=computed(()=>specified.value.filter(p=>(p.attributes?.configuration||'')===configuration.value));
const packages=computed(()=>configured.value.filter((p,index,all)=>all.findIndex(x=>x.name===p.name)===index));
const durations=computed(()=>configured.value.filter(p=>p.name===packageName.value).sort((a,b)=>a.months-b.months));
const selected=computed(()=>durations.value.find(p=>p.months===months.value));
const maxQuantity=computed(()=>Math.min(20,Number(selected.value?.attributes?.stock??20)));
const renewSupported=computed(()=>props.kind==='PURCHASE'&&Boolean(selected.value?.attributes?.autoRenewSupported)&&permissions.can('device.renew'));
watch(zoneProducts,()=>productType.value=types.value[0]||'');
watch(typed,()=>region.value=regions.value[0]||'');
watch(regional,()=>area.value=areas.value[0]||'');
watch(located,()=>remoteType.value=remoteTypes.value[0]||'');
watch(remoteProducts,()=>specification.value=specifications.value[0]||'');
watch(specified,()=>configuration.value=configurations.value[0]||'');
watch(configured,()=>packageName.value='');
watch(durations,()=>months.value=durations.value[0]?.months||1);
let revision=0;
const input=()=>({kind:props.kind,productId:selected.value?.id,quantity:props.kind==='PURCHASE'?quantity.value:1,deviceId,channel:channel.value,autoRenew:autoRenew.value,requestId:requestId.value});
watch([selected,quantity,channel,autoRenew],async()=>{const current=++revision;quote.value=undefined;quoteError.value='';requestId.value=crypto.randomUUID();if(!renewSupported.value)autoRenew.value=false;if(!selected.value||!quantity.value||!supply.value)return;try{const result=await post('/quotes',input());if(current===revision)quote.value=result;}catch(error){if(current===revision)quoteError.value=(error as Error).message;}});
onMounted(async()=>{try{const c=await request('/billing/capabilities');channels.value=c.channels;supply.value=c.deviceSupply;products.value=(await request('/catalog')).filter((p:any)=>Boolean(p.acceleration)===(props.kind==='ACCELERATION'));if(deviceId){device.value=await request(`/devices/${deviceId}`);if(props.kind==='RENEW'){zone.value=device.value.ipType;products.value=products.value.filter(p=>p.ipType===device.value.ipType);}}productType.value=types.value[0]||'';await account.load();}finally{loading.value=false;}});
async function buy(){busy.value=true;try{const result=await post('/orders',input());if(result.paymentStatus==='PAID'){ElMessage.success('支付成功，设备正在交付');requestId.value=crypto.randomUUID();quote.value=undefined;await account.load();if(permissions.can('order.view'))await router.push('/money/order');}else order.value=result;}finally{busy.value=false;}}
</script>
<template><section class="panel purchase-page" v-loading="loading"><h1 class="page-title"><el-button link :icon="ArrowLeft" aria-label="返回设备管理" @click="router.push('/agentIp/all')"/>{{title}}</h1><el-alert v-if="!supply" title="设备服务暂未开通，当前暂无在售套餐。" type="info" :closable="false"/>
<div class="purchase-layout"><div class="purchase-options"><section class="purchase-section"><h2 class="block-title">设备类型</h2>
  <div class="choice-row"><span class="choice-label">适用专区</span><div class="choice-options"><button v-for="z in [{id:1,name:'通用平台'},{id:20,name:'专用平台'}]" :key="z.id" class="choice-chip" :class="{selected:zone===z.id}" :disabled="Boolean(deviceId)&&kind==='RENEW'" @click="zone=z.id">{{z.name}}</button></div></div>
  <div class="choice-row"><span class="choice-label">{{zone===20?'平台':'设备类型'}}</span><div class="choice-options"><button v-for="t in types" :key="t" class="choice-chip" :class="{selected:productType===t}" @click="productType=t">{{t}}</button><span v-if="!types.length" class="choice-empty">{{zone===20?'暂无可用的专用平台':'暂无可用的设备类型'}}</span></div></div>
  <div class="choice-row"><span class="choice-label">设备地域</span><div class="choice-options"><button v-for="r in regions" :key="r" class="choice-chip" :class="{selected:region===r}" @click="region=r">{{r}}</button><span v-if="!regions.length" class="choice-empty">请先选择设备类型</span></div></div>
  <div class="choice-row"><span class="choice-label">设备地区</span><div class="choice-options"><button v-for="a in areas" :key="a" class="choice-chip" :class="{selected:area===a}" @click="area=a">{{a}}</button><span v-if="!areas.length" class="choice-empty">请先选择设备地域</span></div></div>
</section><section class="purchase-section"><h2 class="block-title">设备信息</h2>
  <div v-if="remoteTypes.some(Boolean)" class="choice-row"><span class="choice-label">远程类型</span><div class="choice-options"><button v-for="r in remoteTypes" :key="r" class="choice-chip" :class="{selected:remoteType===r}" @click="remoteType=r">{{r||'默认'}}</button></div></div>
  <div class="choice-row"><span class="choice-label">设备信息</span><div class="choice-options"><button v-for="s in specifications" :key="s" class="choice-chip specification-chip" :class="{selected:specification===s}" @click="specification=s"><el-icon><Monitor/></el-icon> {{s}}<small>专业电商设备环境</small></button><span v-if="!specifications.length" class="choice-empty">选择地域后展示可用设备规格</span></div></div>
  <div class="choice-row"><span class="choice-label">计费模式</span><div class="choice-options"><button class="choice-chip selected">按期限购买</button></div></div>
  <div v-if="configurations.some(Boolean)" class="choice-row"><span class="choice-label">配置</span><div class="choice-options"><button v-for="c in configurations" :key="c" class="choice-chip" :class="{selected:configuration===c}" @click="configuration=c">{{c||'默认'}}</button></div></div>
  <div class="choice-row"><span class="choice-label">设备套餐</span><div class="choice-options"><button v-for="p in packages" :key="p.id" class="choice-chip package-chip" :class="{selected:packageName===p.name}" :disabled="p.attributes?.stock===0" @click="packageName=p.name"><b>{{p.name}}</b><span class="price">¥ {{yuan(p.priceCents)}}</span><small>{{p.months}} 个月 {{p.attributes?.stock===0?' · 缺货':''}}</small></button><span v-if="!packages.length" class="choice-empty">当前暂无在售套餐</span></div></div>
  <div v-if="selected?.attributes?.description" class="choice-row"><span class="choice-label">温馨提示</span><p class="muted">{{selected.attributes.description}}</p></div>
  <div class="choice-row"><span class="choice-label">购买时长</span><div class="choice-options"><button v-for="p in durations" :key="p.id" class="choice-chip" :class="{selected:months===p.months}" @click="months=p.months">{{p.months}} 个月 <span class="orange">(¥ {{yuan(p.priceCents)}})</span></button><button v-if="!durations.length" v-for="n in [1,3,6,12]" :key="n" class="choice-chip" disabled>{{n}} 个月</button></div></div>
  <div class="choice-row"><span class="choice-label">{{kind==='PURCHASE'?'购买数量':'所选设备'}}</span><div v-if="kind==='PURCHASE'"><el-input-number :key="selected?.id||'empty'" v-model="quantity" :min="1" :max="maxQuantity" :disabled="!selected"/><span class="muted" style="margin-left:14px">单次最多购买 20 台设备</span></div><div v-else class="muted">{{device?.name||'请从设备列表选择设备'}}<br>{{device?.host}}</div></div>
</section><section class="purchase-section"><h2 class="block-title">支付信息</h2><div class="choice-row"><span class="choice-label">支付方式</span><div class="choice-options"><button v-for="c in ['balance','wx','ali','cmb']" :key="c" class="choice-chip payment-chip" :class="{selected:channel===c}" :disabled="c!=='balance'&&!channels.includes(c)" @click="channel=c"><span class="pay-icon" :class="c">{{c==='balance'?'¥':c==='wx'?'微':c==='ali'?'支':'银'}}</span><span>{{channelNames[c]}}<small>{{c==='balance'?`可用 ¥ ${yuan(account.balance)}`:channels.includes(c)?'扫码支付':'暂未开通'}}</small></span></button><el-button v-if="permissions.can('wallet.recharge')" link type="primary" @click="router.push('/money/recharge')">充值</el-button></div></div>
  <div v-if="kind==='PURCHASE'" class="choice-row"><span class="choice-label">自动续费</span><div><el-checkbox v-model="autoRenew" :disabled="!renewSupported">到期自动续费</el-checkbox><p class="muted">从账户余额扣款，请确保余额充足。{{selected&&!renewSupported?'当前套餐不支持自动续费。':''}}</p></div></div>
</section></div><article class="order-summary"><h2 class="block-title">订单信息</h2><dl><dt>设备-套餐</dt><dd :class="{'orange':!selected}">{{selected?.name||'未选择套餐'}}</dd><dt>地域-地区</dt><dd>{{region||'—'}}{{area?`-${area}`:''}}</dd><dt>设备机型</dt><dd>{{specification||'—'}}</dd><dt>购买时长</dt><dd>{{selected?months+'个月':'—'}}</dd><dt>购买数量</dt><dd>{{kind==='PURCHASE'?quantity:1}} 台</dd><dt>自动续费</dt><dd>{{autoRenew?'是':'否'}}</dd></dl><div class="summary-total"><span>订单总额</span><span class="orange">{{quote?'¥ '+yuan(quote.amountCents):'—'}}</span></div><div class="summary-total"><span>合计应付金额</span><strong>{{quote?'¥ '+yuan(quote.amountCents):'—'}}</strong></div><p v-if="quoteError" class="orange">{{quoteError}}</p><p v-if="quote&&channel==='balance'&&account.balance!=null&&account.balance<quote.amountCents" class="orange">账户余额不足，请先充值或选择其他支付方式。</p><el-checkbox v-model="agreed">我已确认设备套餐、地域、使用时长和购买数量。</el-checkbox><el-button type="primary" :disabled="!quote||!agreed||!supply||(channel==='balance'&&account.balance!=null&&account.balance<quote.amountCents)" :loading="busy" @click="buy">{{selected?'提交订单':'请选择套餐再提交订单'}}</el-button></article></div>
</section><PaymentDialog :order="order" @close="order=undefined" @paid="account.load()"/></template>
