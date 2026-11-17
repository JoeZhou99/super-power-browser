<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { Link, Refresh, CircleCheck, Lightning } from '@element-plus/icons-vue';
import { request } from '@/utils/request';
import { useRouter } from 'vue-router';

type Recommendation = { id: string; name: string; type: 'domestic' | 'overseas'; description: string; highlights: string[]; url: string; tone?: string };
const router = useRouter();
const tab = ref<'domestic' | 'overseas'>('domestic');
const loading = ref(false);
const items = ref<Recommendation[]>([]);
const fallback: Recommendation[] = [
  { id: '91http', name: '91http代理', type: 'domestic', description: '高匿纯净的动态短效与长效静态 IP，适合店铺日常运营。', highlights: ['5000万日活 IP 池', '380+ 城市线路', '注册 0 元试用'], url: 'https://www.91http.com', tone: 'blue' },
  { id: 'juliang', name: '巨量HTTP', type: 'domestic', description: '高质量动态、静态住宅 IP，提供稳定的 API 接入与并发提取。', highlights: ['7000万高品质 IP', '不限 IP 提取', 'API / SDK 完整'], url: 'https://www.julianghttp.com', tone: 'green' },
  { id: 'huasheng', name: '花生HTTP', type: 'overseas', description: '支持 Socks5、HTTP、HTTPS 的全球线路，自动去重并按需切换。', highlights: ['全球省市自选', '支持多协议', '无并发限制'], url: 'https://www.hsp168.com', tone: 'orange' },
];
const visible = computed(() => items.value.filter(item => item.type === tab.value));
async function load() {
  loading.value = true;
  try {
    const result = await request('/proxy-recommendations');
    items.value = Array.isArray(result) ? result : result.items || fallback;
  } catch {
    items.value = fallback;
  } finally { loading.value = false; }
}
function openExternal(url: string) { window.open(url, '_blank', 'noopener,noreferrer'); }
onMounted(load);
</script>

<template>
  <section class="panel recommendation-page">
    <div class="recommendation-heading">
      <div><h1 class="page-title">代理 IP 推荐</h1><p class="muted">按业务区域选择线路供应商，官方链接会在新窗口打开。</p></div>
      <el-button :icon="Refresh" :loading="loading" @click="load">刷新推荐</el-button>
    </div>
    <el-tabs v-model="tab" class="recommendation-tabs">
      <el-tab-pane label="国内代理 IP 推荐" name="domestic" />
      <el-tab-pane label="海外代理 IP 推荐" name="overseas" />
    </el-tabs>
    <div v-loading="loading" class="recommendation-list">
      <article v-for="item in visible" :key="item.id" class="recommendation-card" :class="`tone-${item.tone || 'blue'}`">
        <div class="recommendation-banner"><span class="recommendation-mark"><CircleCheck /></span><div><strong>{{ item.name }}</strong><p>{{ item.description }}</p></div></div>
        <div class="recommendation-footer"><div class="recommendation-highlights"><span v-for="highlight in item.highlights" :key="highlight"><Lightning />{{ highlight }}</span></div><el-button type="primary" :icon="Link" @click="openExternal(item.url)">进入官网</el-button></div>
      </article>
      <el-empty v-if="!loading && !visible.length" description="当前暂无推荐" />
    </div>
    <div class="recommendation-note">推荐内容仅供业务选型参考，服务质量、价格和可用性以供应商官方说明为准。</div>
  </section>
</template>

<style scoped>
.recommendation-heading{display:flex;align-items:flex-start;justify-content:space-between;gap:16px}.recommendation-heading .page-title{margin:0;border:0;padding:0}.recommendation-heading .muted{margin:8px 0 0}.recommendation-tabs{margin-top:22px}.recommendation-list{display:grid;gap:16px;min-height:220px}.recommendation-card{overflow:hidden;border:1px solid #e5ebf5;border-radius:10px;background:#fff;box-shadow:0 4px 16px #2e4f9510}.recommendation-banner{display:flex;align-items:center;gap:15px;min-height:118px;padding:22px 25px;color:#fff;background:linear-gradient(110deg,#2c2bc7,#224dca 53%,#1b9db0)}.tone-green .recommendation-banner{background:linear-gradient(110deg,#168a7d,#176fc7 60%,#2aa6b4)}.tone-orange .recommendation-banner{background:linear-gradient(110deg,#4331bf,#1446bd 55%,#159caf)}.recommendation-mark{display:grid;place-items:center;flex:0 0 auto;width:47px;height:47px;border:1px solid #ffffff55;border-radius:13px;background:#ffffff1e}.recommendation-mark svg{width:24px}.recommendation-banner strong{font-size:22px}.recommendation-banner p{margin:8px 0 0;color:#e3ebff;font-size:13px}.recommendation-footer{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:14px 24px;background:#fff}.recommendation-highlights{display:flex;gap:18px;flex-wrap:wrap;color:#71819b;font-size:12px}.recommendation-highlights span{display:flex;align-items:center;gap:5px}.recommendation-highlights svg{width:13px;color:#4d7bf0}.recommendation-note{margin-top:18px;color:#9aa6b8;font-size:12px}@media(max-width:700px){.recommendation-heading{flex-direction:column}.recommendation-footer{align-items:flex-start;flex-direction:column}.recommendation-banner{padding:19px}.recommendation-banner strong{font-size:19px}.recommendation-highlights{gap:9px 15px}}
</style>
