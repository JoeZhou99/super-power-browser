<script setup lang="ts">
import {computed,onMounted,ref} from 'vue';
import {request,post} from '@/utils/request';
import {usePermissions} from '@/store/modules/permission.store';
import {useAccount} from '@/store/modules/account.store';
import {yuan,channelNames} from '@/utils/format';
import PaymentDialog from '@/components/PaymentDialog.vue';
const permissions=usePermissions(),account=useAccount(),amount=ref<number|undefined>(100),channel=ref(''),channels=ref<string[]>([]),order=ref<any>(),loading=ref(false),agreed=ref(false),custom=ref(false);
const payable=computed(()=>Number(amount.value)||0);
async function load(){const c=await request('/billing/capabilities');channels.value=c.channels;channel.value=c.channels[0]||'';await account.load();}
onMounted(load);
async function recharge(){loading.value=true;try{order.value=await post('/recharges',{requestId:crypto.randomUUID(),amountCents:Math.round(payable.value*100),channel:channel.value});}finally{loading.value=false;}}
</script>
<template><section class="panel recharge-page"><h1 class="page-title">账户充值</h1><el-alert title="账户余额使用人民币计价，充值按实际支付金额等额到账，可用于设备购买、续费和加速服务。" type="info" :closable="false" show-icon/>
<h2 class="block-title">账户概况</h2><div class="recharge-balance"><p>账户余额（元）</p><strong>{{yuan(account.balance)}}</strong></div>
<h2 class="block-title">快捷充值</h2><div class="choice-row"><span class="choice-label">充值金额：</span><div class="choice-options"><button v-for="n in [100,1000,5000,10000,50000,100000]" :key="n" class="choice-chip recharge-choice" :class="{selected:!custom&&amount===n}" @click="custom=false;amount=n"><b>¥ {{n.toLocaleString()}}</b><small>到账 {{n.toLocaleString()}} 元</small></button><div class="custom-recharge" @click="custom=true"><span>自定义金额</span><el-input-number v-model="amount" :min="0.01" :max="1000000" :precision="2" :controls="false" placeholder="请输入充值金额" @focus="custom=true"/></div></div></div>
<div class="choice-row"><span class="choice-label">支付方式：</span><div class="choice-options"><button v-for="c in ['ali','wx','cmb']" :key="c" class="choice-chip payment-chip" :class="{selected:channel===c}" :disabled="!channels.includes(c)" @click="channel=c"><span class="pay-icon" :class="c">{{c==='ali'?'支':c==='wx'?'微':'银'}}</span><span>{{channelNames[c]}}<small>{{channels.includes(c)?c==='ali'?'Alipay':c==='wx'?'Wechat pay':'扫码支付':'暂未开通'}}</small></span></button></div></div>
<div class="choice-row"><span></span><div><el-alert v-if="!channels.length" title="线上支付暂未开通，请联系管理员配置支付通道。" type="info" :closable="false"/><div class="toolbar"><el-button type="primary" :loading="loading" :disabled="!channel||!agreed||payable<0.01||!permissions.can('wallet.recharge')" @click="recharge">立即充值 ¥ {{payable.toFixed(2)}}</el-button><el-checkbox v-model="agreed">我已确认充值金额与支付方式</el-checkbox></div><p class="muted">实际到账金额：{{payable.toFixed(2)}} 元。支付完成后可在订单管理查看充值记录。</p></div></div>
</section><PaymentDialog :order="order" @close="order=undefined" @paid="load"/></template>
