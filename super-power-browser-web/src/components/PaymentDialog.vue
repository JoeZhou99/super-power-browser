<script setup lang="ts">
import {ref,watch,onUnmounted} from 'vue';
import QRCode from 'qrcode';
import {post} from '@/utils/request';
const props=defineProps<{order:any}>();const emit=defineEmits<{paid:[];close:[]}>();
const qr=ref(''),current=ref<any>(),checking=ref(false),message=ref('');
let timer:ReturnType<typeof setInterval>|undefined;
function stop(){if(timer)clearInterval(timer);timer=undefined;}
watch(()=>props.order,async value=>{stop();message.value='';qr.value='';current.value=value;if(value?.paymentUrl)qr.value=await QRCode.toDataURL(value.paymentUrl);if(value?.paymentStatus==='PENDING')timer=setInterval(()=>check().catch(e=>{message.value=e.message;stop();}),5000);},{immediate:true});
onUnmounted(stop);
async function check(){if(checking.value||!current.value)return;checking.value=true;try{current.value=await post(`/orders/${current.value.id}/refresh`);if(current.value.paymentStatus==='PAID'){stop();emit('paid');}}finally{checking.value=false;}}
</script>
<template><el-dialog :model-value="Boolean(order)" title="订单支付" width="480px" @close="stop();emit('close')"><template v-if="current"><p class="muted">订单 {{current.id}}</p><p class="money">¥ {{(current.amountCents/100).toFixed(2)}}</p><el-result v-if="current.paymentStatus==='PAID'" icon="success" title="支付成功"/><template v-else><img v-if="qr" :src="qr" width="240" height="240" alt="支付二维码"><p>请使用所选支付方式扫码付款。</p><el-alert v-if="message" :title="message" type="warning" :closable="false"/><el-button :loading="checking" @click="check">我已支付，刷新状态</el-button></template></template></el-dialog></template>
