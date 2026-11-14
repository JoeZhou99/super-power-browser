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
<template><section class="panel recharge-page">
  <div class="recharge-heading">
      <div class="recharge-heading-copy">
      <div class="recharge-title"><h1 class="page-title">账户充值</h1></div>
      <p class="muted">充值到账后可用于设备购买、续费和加速服务。</p>
    </div>
    <div class="recharge-balance-card"><span>当前余额</span><strong>¥ {{yuan(account.balance)}}</strong></div>
  </div>
  <el-alert title="账户余额使用人民币计价，充值按实际支付金额等额到账。" type="info" :closable="false" show-icon/>
  <div class="recharge-layout">
    <div class="recharge-form">
      <section class="recharge-section"><h2 class="block-title"><span class="recharge-step">01</span>选择充值金额</h2>
        <div class="choice-row"><span class="choice-label">充值金额：</span><div class="choice-options"><button v-for="n in [100,1000,5000,10000,50000,100000]" :key="n" class="choice-chip recharge-choice" :class="{selected:!custom&&amount===n}" @click="custom=false;amount=n"><b>¥ {{n.toLocaleString()}}</b><small>到账 {{n.toLocaleString()}} 元</small></button><div class="custom-recharge" :class="{selected:custom}" @click="custom=true"><span>自定义金额</span><el-input-number v-model="amount" :min="0.01" :max="1000000" :precision="2" :controls="false" placeholder="请输入充值金额" @focus="custom=true"/></div></div></div>
      </section>
      <section class="recharge-section"><h2 class="block-title"><span class="recharge-step">02</span>选择支付方式</h2>
        <div class="choice-row"><span class="choice-label">支付方式：</span><div class="choice-options"><button v-for="c in ['ali','wx','cmb']" :key="c" class="choice-chip payment-chip" :class="{selected:channel===c}" :disabled="!channels.includes(c)" @click="channel=c"><span class="pay-icon" :class="c">{{c==='ali'?'支':c==='wx'?'微':'银'}}</span><span>{{channelNames[c]}}<small>{{channels.includes(c)?c==='ali'?'Alipay':c==='wx'?'Wechat pay':'扫码支付':'暂未开通'}}</small></span></button></div></div>
      </section>
      <div class="recharge-submit"><el-alert v-if="!channels.length" title="线上支付暂未开通，请联系管理员配置支付通道。" type="info" :closable="false"/><div class="toolbar"><el-button type="primary" :loading="loading" :disabled="!channel||!agreed||payable<0.01||!permissions.can('wallet.recharge')" @click="recharge">立即充值 ¥ {{payable.toFixed(2)}}</el-button><el-checkbox v-model="agreed">我已确认充值金额与支付方式</el-checkbox></div><p class="muted">实际到账金额：{{payable.toFixed(2)}} 元。支付完成后可在订单管理查看充值记录。</p></div>
    </div>
    <aside class="recharge-notes"><h2 class="block-title">充值说明</h2><ul><li>充值金额按实际支付金额等额到账。</li><li>支付完成后，可在订单管理查看记录。</li><li>支付通道不可用时，请联系管理员处理。</li></ul><div class="recharge-preview"><span>本次充值</span><strong>¥ {{payable.toFixed(2)}}</strong><small>{{channel?channelNames[channel]:'尚未选择支付方式'}}</small></div></aside>
  </div>
</section><PaymentDialog :order="order" @close="order=undefined" @paid="load"/></template>

<style scoped>
.recharge-heading{display:flex;align-items:center;justify-content:space-between;gap:24px;margin-bottom:18px}.recharge-heading-copy{min-width:0}.recharge-title .page-title{border:0;padding:0;margin:0}.recharge-heading-copy>.muted{margin:9px 0 0}.recharge-balance-card{flex:0 0 190px;padding:14px 16px;border:1px solid #e6ebf5;border-radius:8px;background:#f8faff}.recharge-balance-card span,.recharge-balance-card strong{display:block}.recharge-balance-card span{font-size:12px;color:#8995a8}.recharge-balance-card strong{margin-top:7px;font-size:22px;color:#2d4261}.recharge-layout{display:grid;grid-template-columns:minmax(0,1fr) 230px;gap:24px;align-items:start;margin-top:24px}.recharge-form{min-width:0}.recharge-section{padding:0 0 22px;border-bottom:1px solid #edf0f5}.recharge-section+.recharge-section{padding-top:22px}.recharge-step{display:inline-grid;place-items:center;width:25px;height:20px;border-radius:5px;background:#edf2ff;color:#386bff;font-size:11px;font-weight:600}.recharge-section .block-title{margin-bottom:16px}.custom-recharge{transition:border-color .15s,background .15s}.custom-recharge.selected{border-color:#386bff;background:#f9fbff}.recharge-submit{padding-top:22px}.recharge-submit .toolbar{margin:14px 0 10px}.recharge-notes{padding:18px;background:#f8faff;border:1px solid #e8edf7;border-radius:8px}.recharge-notes .block-title{margin-bottom:14px}.recharge-notes ul{padding:0 0 0 18px;margin:0;color:#7d8ba1;font-size:12px;line-height:1.9}.recharge-preview{margin-top:22px;padding-top:15px;border-top:1px solid #e7edf6}.recharge-preview span,.recharge-preview small{display:block;color:#8a97aa;font-size:12px}.recharge-preview strong{display:block;margin:7px 0;font-size:22px;color:#2d4261}@media(max-width:900px){.recharge-layout{grid-template-columns:minmax(0,1fr)}.recharge-notes{display:none}}@media(max-width:600px){.recharge-heading{align-items:flex-start;flex-direction:column}.recharge-balance-card{width:100%;flex-basis:auto}.recharge-heading-copy>.muted{margin-left:0}.recharge-layout{margin-top:18px}}
</style>
