<script setup lang="ts">
import {ref,watch,onUnmounted} from 'vue';
import QRCode from 'qrcode';
import {post} from '@/utils/request';
import {channelNames,yuan} from '@/utils/format';
const props=defineProps<{order:any}>();const emit=defineEmits<{paid:[];close:[]}>();
const qr=ref(''),current=ref<any>(),checking=ref(false),message=ref('');
let timer:ReturnType<typeof setInterval>|undefined;
function stop(){if(timer)clearInterval(timer);timer=undefined;}
watch(()=>props.order,async value=>{stop();message.value='';qr.value='';current.value=value;if(value?.paymentUrl)qr.value=await QRCode.toDataURL(value.paymentUrl);if(value?.paymentStatus==='PENDING')timer=setInterval(()=>check().catch(e=>{message.value=e.message;stop();}),5000);},{immediate:true});
onUnmounted(stop);
async function check(){if(checking.value||!current.value)return;checking.value=true;try{current.value=await post(`/orders/${current.value.id}/refresh`);if(current.value.paymentStatus==='PAID'){stop();emit('paid');}}finally{checking.value=false;}}
</script>
<template>
  <el-dialog :model-value="Boolean(order)" width="500px" class="payment-dialog" :show-close="false" :close-on-click-modal="false" @close="stop();emit('close')">
    <template v-if="current">
      <div class="payment-head"><div><h2>在线充值</h2><p>订单 {{ current.id }}</p></div><button type="button" aria-label="关闭支付窗口" @click="stop();emit('close')">×</button></div>
      <div v-if="current.paymentStatus==='PAID'" class="payment-success"><el-result icon="success" title="支付成功" sub-title="充值金额已到账" /></div>
      <template v-else>
        <div class="payment-amount">支付金额 <strong>¥ {{ yuan(current.amountCents) }}</strong></div>
        <div class="payment-qr-wrap"><img v-if="qr" class="payment-qr" :src="qr" alt="支付二维码"><div v-else class="payment-qr empty">二维码生成中…</div><p>请使用{{ channelNames[current.channel] || '支付方式' }}扫码支付</p></div>
        <div class="payment-method"><span class="method-dot" :class="current.channel"></span><span>{{ channelNames[current.channel] || current.channel }}</span></div>
        <el-alert v-if="message" :title="message" type="warning" :closable="false" />
        <div class="payment-actions"><el-button @click="stop();emit('close')">上一步</el-button><el-button type="primary" :loading="checking" @click="check">已完成支付</el-button></div>
      </template>
    </template>
  </el-dialog>
</template>

<style scoped>
.payment-dialog :deep(.el-dialog__header){display:none}.payment-dialog :deep(.el-dialog__body){padding:0}.payment-head{display:flex;justify-content:space-between;align-items:flex-start;padding:25px 28px 14px;background:#f7f9fe}.payment-head h2{margin:0;color:#273b5c;font-size:18px}.payment-head p{margin:6px 0 0;color:#96a1b2;font-size:12px}.payment-head button{border:0;background:transparent;color:#7a8799;font-size:25px;line-height:1;cursor:pointer}.payment-amount{text-align:center;padding:16px 20px 4px;color:#718098;font-size:15px}.payment-amount strong{margin-left:6px;color:#356cff;font-size:22px}.payment-qr-wrap{text-align:center;padding:8px 0 0}.payment-qr{display:block;width:218px;height:218px;margin:0 auto;padding:8px;background:#fff;border:1px solid #edf0f5}.payment-qr.empty{display:grid;place-items:center;color:#99a5b7}.payment-qr-wrap p{margin:9px 0 12px;color:#738198;font-size:12px}.payment-method{display:flex;align-items:center;justify-content:center;gap:8px;color:#5e6d84;font-size:13px}.method-dot{width:18px;height:18px;border-radius:50%;background:#21c66d;box-shadow:0 0 0 4px #21c66d18}.method-dot.ali{background:#149bff}.method-dot.cmb{background:#d69b28}.payment-actions{display:flex;justify-content:flex-end;gap:10px;padding:23px 28px 25px;margin-top:15px;border-top:1px solid #edf1f6}.payment-success{padding:28px 10px}.payment-dialog :deep(.el-alert){margin:13px 28px 0}
</style>
