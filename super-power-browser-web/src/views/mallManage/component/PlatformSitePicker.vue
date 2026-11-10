<script setup lang="ts">
import {computed,nextTick,onMounted,ref} from 'vue';
import {Search,Shop,ArrowDown,ArrowRight,Check,Link} from '@element-plus/icons-vue';
import {request} from '@/utils/request';

interface Site {id:string;name:string;url:string}
interface Platform {name:string;sites:Site[]}
interface Category {name:string;platforms:Platform[]}
const props=defineProps<{form:{platform:string;startUrl:string;platformSiteId?:string|null}}>();
const categories=ref<Category[]>([]),category=ref(''),loading=ref(false),error=ref('');
const visible=ref(false),query=ref(''),activePlatform=ref(''),trigger=ref<HTMLButtonElement>();
const customName=ref(''),customUrl=ref(''),customError=ref('');
const allPlatforms=computed(()=>categories.value.flatMap(item=>item.platforms));
const entries=computed(()=>allPlatforms.value.flatMap(platform=>platform.sites.map(site=>({platform,site}))));
const current=computed(()=>{
  if(props.form.platformSiteId)return entries.value.find(item=>item.site.id===props.form.platformSiteId);
  const matches=entries.value.filter(item=>item.platform.name===props.form.platform&&item.site.url===props.form.startUrl);
  return matches.length===1?matches[0]:undefined;
});
const hasSelection=computed(()=>Boolean(props.form.platform&&(props.form.platformSiteId||/^https?:\/\//i.test(props.form.startUrl)&&props.form.startUrl!=='https://')));
const filtered=computed(()=>{
  const term=query.value.trim().toLocaleLowerCase();
  return categories.value.filter(item=>!category.value||item.name===category.value).flatMap(item=>item.platforms).map(platform=>({
    ...platform,sites:platform.sites.filter(site=>!term||platform.name.toLocaleLowerCase().includes(term)||site.name.toLocaleLowerCase().includes(term))
  })).filter(platform=>platform.sites.length);
});
const active=computed(()=>filtered.value.find(platform=>platform.name===activePlatform.value)||filtered.value[0]);
let loadVersion=0;
async function load(){
  const version=++loadVersion;
  loading.value=true;error.value='';
  try{const result=await request('/platform-sites',{cache:'no-store'});if(version===loadVersion)categories.value=result.categories;}
  catch{if(version===loadVersion)error.value='平台列表暂时无法加载，请重试。';}
  finally{if(version===loadVersion)loading.value=false;}
}
function openPicker(){
  query.value='';customError.value='';activePlatform.value=current.value?.platform.name||'';
  const customExisting=hasSelection.value&&!props.form.platformSiteId&&!current.value;
  category.value=customExisting?'__custom__':'';
  customName.value=customExisting?props.form.platform:'';customUrl.value=customExisting?props.form.startUrl:'';
  void load();
}
async function finish(){visible.value=false;await nextTick();trigger.value?.focus();}
function choose(site:Site,platform:Platform){
  props.form.platformSiteId=site.id;props.form.platform=platform.name;props.form.startUrl=site.url;void finish();
}
function confirmCustom(){
  customError.value='';const name=customName.value.trim()||'自定义平台',url=customUrl.value.trim();
  try{const parsed=new URL(url);if(!['http:','https:'].includes(parsed.protocol)||!parsed.hostname)throw new Error();}
  catch{customError.value='请输入完整的网站地址，例如 https://example.com';return;}
  props.form.platformSiteId='';props.form.platform=name;props.form.startUrl=url;void finish();
}
onMounted(load);
</script>

<template>
  <el-form-item label="所属平台" required>
    <el-popover v-model:visible="visible" trigger="click" placement="bottom-start" :width="700" :persistent="false" :show-arrow="false" popper-class="platform-picker-popper" @before-enter="openPicker">
      <template #reference>
        <button ref="trigger" type="button" class="platform-trigger" :class="{selected:hasSelection,expanded:visible}" :aria-expanded="visible" aria-haspopup="dialog" aria-label="选择所属平台和站点" @keydown.esc.stop="visible=false">
          <span class="platform-trigger-icon"><el-icon><Shop/></el-icon></span>
          <span class="platform-trigger-copy"><strong>{{current?.platform.name||(hasSelection?form.platform:'请选择平台和站点')}}</strong><small v-if="hasSelection">{{current?.site.name||(form.platformSiteId?'已保存的站点':'自定义网站')}}</small><small v-else>选择后自动配置打开地址</small></span>
          <el-icon class="platform-trigger-arrow"><ArrowDown/></el-icon>
        </button>
      </template>
      <div class="platform-picker" role="dialog" aria-label="选择平台站点" @keydown.esc.stop="visible=false">
        <div class="picker-heading"><strong>选择平台与站点</strong><span>{{allPlatforms.length}} 个平台</span></div>
        <el-input v-if="category!=='__custom__'" v-model="query" :prefix-icon="Search" clearable placeholder="搜索平台或国家 / 地区" aria-label="搜索平台或站点" class="picker-search"/>
        <div class="picker-categories" aria-label="平台分类">
          <button type="button" :class="{active:category===''}" :aria-pressed="category===''" @click="category=''">全部</button>
          <button v-for="item in categories" :key="item.name" type="button" :class="{active:category===item.name}" :aria-pressed="category===item.name" @click="category=item.name">{{item.name}}</button>
          <button type="button" :class="{active:category==='__custom__'}" :aria-pressed="category==='__custom__'" @click="category='__custom__'">自定义平台</button>
        </div>
        <div v-if="category==='__custom__'" class="picker-custom">
          <div class="custom-intro"><span><el-icon><Link/></el-icon></span><div><strong>添加自定义网站</strong><p>适用于独立站或目录中未收录的平台。</p></div></div>
          <label for="custom-platform-name">平台名称</label><el-input id="custom-platform-name" v-model="customName" maxlength="100" placeholder="例如：我的独立站（选填）"/>
          <label for="custom-platform-url">网站地址</label><el-input id="custom-platform-url" v-model="customUrl" maxlength="2000" placeholder="https://example.com" @keyup.enter="confirmCustom"/>
          <p v-if="customError" class="custom-error" role="alert">{{customError}}</p>
          <div class="custom-footer"><el-button @click="visible=false">取消</el-button><el-button type="primary" @click="confirmCustom">使用此网站</el-button></div>
        </div>
        <div v-else-if="loading" class="picker-empty" role="status">正在加载平台站点…</div>
        <div v-else-if="error" class="picker-empty" role="alert"><span>{{error}}</span><el-button type="primary" plain @click="load">重新加载</el-button></div>
        <div v-else-if="!filtered.length" class="picker-empty"><el-icon><Search/></el-icon><strong>没有找到相关平台或站点</strong><span>换个关键词，或添加自定义网站。</span><el-button link type="primary" @click="category='__custom__'">添加自定义网站</el-button></div>
        <div v-else class="picker-columns">
          <div class="picker-platforms" aria-label="平台列表"><button v-for="platform in filtered" :key="platform.name" type="button" class="platform-option" :class="{active:active?.name===platform.name}" :aria-pressed="active?.name===platform.name" @click="activePlatform=platform.name"><span class="platform-monogram">{{platform.name.slice(0,1).toUpperCase()}}</span><span class="platform-option-name">{{platform.name}}</span><el-icon><ArrowRight/></el-icon></button></div>
          <div v-if="active" class="picker-sites"><div class="site-heading"><strong>{{active.name}}</strong><span>选择国家 / 站点</span></div><div class="site-grid"><button v-for="site in active.sites" :key="site.id" type="button" class="site-option" :class="{selected:current?.site.id===site.id}" :aria-pressed="current?.site.id===site.id" @click="choose(site,active!)"><span>{{site.name}}</span><el-icon v-if="current?.site.id===site.id"><Check/></el-icon><el-icon v-else class="site-arrow"><ArrowRight/></el-icon></button></div></div>
        </div>
        <div v-if="category!=='__custom__'" class="picker-footer"><span>选定站点后，自动配置对应入口</span><span v-if="current">当前：{{current.platform.name}} / {{current.site.name}}</span></div>
      </div>
    </el-popover>
  </el-form-item>
</template>

<style scoped>
.platform-trigger{display:flex;align-items:center;gap:12px;width:100%;min-height:62px;padding:10px 14px;text-align:left;border:1px solid #dce4f0;border-radius:9px;background:#fff;color:#8190a6;transition:border-color .15s,box-shadow .15s}
.platform-trigger:hover,.platform-trigger.expanded{border-color:#8daaf2;box-shadow:0 0 0 3px #386bff09}.platform-trigger:focus-visible{outline:2px solid #386bff;outline-offset:3px}
.platform-trigger-icon{display:grid;place-items:center;flex-shrink:0;width:36px;height:36px;border-radius:9px;background:#f0f4fd;color:#718cbd;font-size:19px}.platform-trigger.selected .platform-trigger-icon{background:#eaf0ff;color:#386bff}
.platform-trigger-copy{display:flex;flex-direction:column;gap:4px;min-width:0;flex:1}.platform-trigger-copy strong{font-size:14px;line-height:20px;font-weight:500;color:#62738e}.platform-trigger.selected strong{color:#30435e;font-weight:600}.platform-trigger-copy small{font-size:12px;line-height:17px;color:#91a0b5}.platform-trigger-arrow{font-size:14px;transition:transform .15s}.platform-trigger.expanded .platform-trigger-arrow{transform:rotate(180deg)}
:global(.platform-picker-popper.el-popper){padding:0!important;max-width:calc(100vw - 40px);border:1px solid #e3e9f3!important;border-radius:13px!important;box-shadow:0 14px 48px #203a632b!important;overflow:hidden}
.platform-picker{color:#334863;line-height:1.5}.picker-heading{display:flex;align-items:center;justify-content:space-between;padding:20px 20px 14px}.picker-heading strong{font-size:16px;font-weight:600}.picker-heading>span{font-size:12px;color:#95a1b3}.picker-search{display:flex;width:calc(100% - 40px);margin:0 20px 14px}.picker-search :deep(.el-input__wrapper){height:38px;background:#f6f8fc;box-shadow:none;border:1px solid #edf1f7;border-radius:8px}.picker-search :deep(.el-input__wrapper.is-focus){border-color:#b6cafa;box-shadow:0 0 0 2px #386bff0a}
.picker-categories{display:flex;gap:4px;padding:0 16px 14px;overflow-x:auto;white-space:nowrap}.picker-categories button{flex-shrink:0;border:0;border-radius:7px;background:transparent;color:#8390a4;padding:7px 10px;font-size:12px;line-height:19px}.picker-categories button:hover{background:#f2f5fb;color:#526b97}.picker-categories button.active{background:#eaf0ff;color:#386bff;font-weight:600}
.picker-columns{display:grid;grid-template-columns:214px minmax(0,1fr);height:280px;border-top:1px solid #edf1f7}.picker-platforms{overflow-y:auto;padding:10px 8px;background:#f8faff;border-right:1px solid #edf1f7}.platform-option{width:100%;display:flex;align-items:center;gap:9px;padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#687b96;text-align:left;font-size:13px;line-height:21px;margin-bottom:3px}.platform-option:hover{background:#edf2fc}.platform-option.active{background:#e7efff;color:#386bff;font-weight:600}.platform-monogram{display:grid;place-items:center;width:25px;height:25px;flex-shrink:0;background:white;border:1px solid #e6ecf7;border-radius:7px;font-size:12px;color:#8195b7}.platform-option.active .platform-monogram{color:#386bff;border-color:#d4e1ff}.platform-option-name{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.platform-option>.el-icon{font-size:11px;flex-shrink:0;color:#9bacc6}
.picker-sites{padding:18px;overflow-y:auto}.site-heading{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:16px}.site-heading strong{font-size:14px;font-weight:600}.site-heading>span{font-size:11px;color:#9aa7b9;white-space:nowrap}.site-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.site-option{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:40px;text-align:left;background:white;border:1px solid #e6ecf5;border-radius:8px;color:#6d7f99;padding:10px 12px;font-size:12px;line-height:19px}.site-option:hover{background:#f7faff;border-color:#c0d3fd;color:#386bff}.site-option.selected{border-color:#b4caff;background:#f0f5ff;color:#386bff}.site-option>.el-icon{flex-shrink:0}.site-arrow{color:#bdc8d9;font-size:11px}
.picker-footer{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 20px;border-top:1px solid #edf1f7;background:#fbfcff;font-size:11px;line-height:18px;color:#9aa7bc}.picker-footer>span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.picker-empty{min-height:280px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:12px;font-size:13px;color:#91a0b7;border-top:1px solid #edf1f7}.picker-empty>.el-icon{font-size:26px;color:#bccbe4}.picker-empty>strong{color:#627997;font-size:14px;font-weight:500}
.picker-custom{border-top:1px solid #edf1f7;padding:22px 24px 20px}.custom-intro{display:flex;align-items:center;gap:12px;margin-bottom:22px}.custom-intro>span{display:grid;place-items:center;width:40px;height:40px;border-radius:10px;background:#edf3ff;color:#386bff;font-size:20px}.custom-intro strong{font-size:14px;font-weight:600}.custom-intro p{font-size:12px;color:#91a0b6;margin:4px 0 0}.picker-custom label{display:block;font-size:12px;color:#70839f;margin:14px 0 8px}.picker-custom :deep(.el-input__wrapper){height:38px;border-radius:7px}.custom-error{color:#d35d62;font-size:12px;margin:10px 0 0}.custom-footer{display:flex;justify-content:flex-end;gap:8px;margin-top:20px}.custom-footer .el-button+.el-button{margin-left:0}
.picker-categories button:focus-visible,.platform-option:focus-visible,.site-option:focus-visible{outline:2px solid #386bff;outline-offset:-2px}
@media(max-height:760px){.picker-columns{height:220px}.picker-heading{padding-top:14px}.picker-empty{min-height:220px}}
</style>
