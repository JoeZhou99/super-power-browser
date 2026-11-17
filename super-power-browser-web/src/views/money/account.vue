<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { Refresh, Wallet, Plus, ArrowRight } from '@element-plus/icons-vue';
import { request, queryString } from '@/utils/request';
import { useAccount } from '@/store/modules/account.store';
import { yuan, date, channelNames } from '@/utils/format';

const router = useRouter();
const account = useAccount();
const loading = ref(false);
const orders = ref<any[]>([]);
const total = ref(0);
const page = ref(1);
const size = ref(10);
const stats = computed(() => {
  const paid = orders.value.filter(row => row.paymentStatus === 'PAID');
  return {
    paid: paid.reduce((sum, row) => sum + Number(row.amountCents || 0), 0),
    pending: orders.value.filter(row => row.paymentStatus === 'PENDING').length,
  };
});

async function load() {
  loading.value = true;
  try {
    await account.load();
    const result = await request(`/orders?${queryString({ kind: 'RECHARGE', page: page.value, size: size.value })}`);
    orders.value = result.items || [];
    total.value = result.total || 0;
  } finally {
    loading.value = false;
  }
}

onMounted(load);
const statusLabel = (value: string) => ({ PAID: '已到账', PENDING: '待支付', CANCELLED: '已取消' }[value] || value);
const statusType = (value: string) => value === 'PAID' ? 'success' : value === 'PENDING' ? 'warning' : 'info';
</script>

<template>
  <section class="panel account-page">
    <div class="account-heading">
      <div>
        <h1 class="page-title">账户余额</h1>
        <p class="muted">查看余额、充值记录和账户资金状态。</p>
      </div>
      <div class="account-actions">
        <el-button :icon="Refresh" :loading="loading" @click="load">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="router.push('/money/recharge')">立即充值</el-button>
      </div>
    </div>

    <div class="balance-grid">
      <article class="balance-card balance-card-primary">
        <div class="balance-card-label"><el-icon><Wallet /></el-icon><span>可用余额</span></div>
        <strong>¥ {{ yuan(account.balance) }}</strong>
        <small>可用于购买设备、续费和加速服务</small>
      </article>
      <article class="balance-card">
        <span class="balance-card-label">本页已到账</span>
        <strong>¥ {{ yuan(stats.paid) }}</strong>
        <small>充值订单合计</small>
      </article>
      <article class="balance-card">
        <span class="balance-card-label">待支付订单</span>
        <strong>{{ stats.pending }}</strong>
        <small>可前往订单管理继续支付</small>
      </article>
    </div>

    <div class="account-section-heading">
      <div><h2 class="block-title">充值记录</h2><span class="muted">共 {{ total }} 条记录</span></div>
      <el-button link type="primary" @click="router.push('/money/order')">查看全部订单 <el-icon><ArrowRight /></el-icon></el-button>
    </div>
    <el-table :data="orders" v-loading="loading" class="account-table">
      <el-table-column label="订单号" prop="id" min-width="190" show-overflow-tooltip />
      <el-table-column label="充值金额" width="130"><template #default="{ row }"><b class="amount">¥ {{ yuan(row.amountCents) }}</b></template></el-table-column>
      <el-table-column label="支付方式" width="125"><template #default="{ row }">{{ channelNames[row.channel] || row.channel }}</template></el-table-column>
      <el-table-column label="状态" width="105"><template #default="{ row }"><el-tag :type="statusType(row.paymentStatus)">{{ statusLabel(row.paymentStatus) }}</el-tag></template></el-table-column>
      <el-table-column label="创建时间" min-width="175"><template #default="{ row }">{{ date(row.createdAt) }}</template></el-table-column>
      <template #empty><el-empty description="暂无充值记录" :image-size="76"><el-button type="primary" @click="router.push('/money/recharge')">去充值</el-button></el-empty></template>
    </el-table>
    <el-pagination v-model:current-page="page" v-model:page-size="size" :page-sizes="[10, 20, 50]" :total="total" layout="total,sizes,prev,pager,next,jumper" @current-change="load" @size-change="page=1;load()" />
  </section>
</template>

<style scoped>
.account-heading,.account-section-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:18px}.account-heading .page-title{margin:0;border:0;padding:0}.account-heading .muted{margin:8px 0 0}.account-actions{display:flex;gap:10px}.balance-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr;gap:14px;margin:26px 0 30px}.balance-card{min-height:136px;padding:20px;border:1px solid #e7edf7;border-radius:10px;background:#fbfcff}.balance-card-primary{color:#fff;border-color:#2f63e6;background:linear-gradient(135deg,#2757d8,#4e80f4);box-shadow:0 9px 24px #386bff24}.balance-card-label{display:flex;align-items:center;gap:7px;color:#72819a;font-size:13px}.balance-card-primary .balance-card-label{color:#dce7ff}.balance-card strong{display:block;margin:17px 0 7px;color:#22395f;font-size:28px;letter-spacing:.2px}.balance-card-primary strong{color:#fff}.balance-card small{color:#97a3b6;font-size:12px}.balance-card-primary small{color:#d1defc}.account-section-heading{align-items:center;padding:0 0 13px;border-bottom:1px solid #edf1f6}.account-section-heading>div{display:flex;align-items:baseline;gap:12px}.account-section-heading .block-title{margin:0}.account-section-heading .muted{font-size:12px}.amount{color:#2d5ed7}.account-table{margin-top:8px}.el-pagination{justify-content:flex-end;margin-top:20px}@media(max-width:800px){.balance-grid{grid-template-columns:1fr}.balance-card{min-height:112px}.account-heading{flex-direction:column}.account-actions{width:100%}.account-actions .el-button{flex:1}.account-section-heading{align-items:flex-start;flex-direction:column;gap:8px}}
</style>
