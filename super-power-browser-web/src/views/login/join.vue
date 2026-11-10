<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { Check, Connection, Lock, Phone, Right, User } from '@element-plus/icons-vue';
import { passwordError, PublicAuthError, publicAuth, usernameError } from './public-auth';

interface Invitation { companyName: string; departmentName?: string }
const route = useRoute();
const router = useRouter();
const token = computed(() => typeof route.query.token === 'string' ? route.query.token.trim() : '');
const invitation = ref<Invitation>();
const loading = ref(false);
const loadError = ref('');
const invalidInvitation = ref(false);
const busy = ref(false);
const submitted = ref(false);
const formError = ref('');
const formRef = ref<FormInstance>();
const form = reactive({ username: '', displayName: '', password: '', confirmPassword: '', phone: '' });
let loadController: AbortController | undefined;
let submitController: AbortController | undefined;

const rules: FormRules = {
  username: [{ required: true, trigger: 'blur', validator: (_rule, value, callback) => {
    const error = usernameError(value || '');
    callback(error ? new Error(error) : undefined);
  } }],
  displayName: [
    { required: true, whitespace: true, message: '请输入姓名', trigger: 'blur' },
    { max: 120, message: '姓名不能超过 120 个字符', trigger: 'blur' },
  ],
  password: [{ required: true, trigger: 'blur', validator: (_rule, value, callback) => {
    const error = passwordError(value || '');
    callback(error ? new Error(error) : undefined);
  } }],
  confirmPassword: [{ required: true, trigger: 'blur', validator: (_rule, value, callback) => {
    const error = !value ? '请再次输入密码' : value !== form.password ? '两次输入的密码不一致' : '';
    callback(error ? new Error(error) : undefined);
  } }],
  phone: [{ max: 40, message: '联系电话不能超过 40 个字符', trigger: 'blur' }],
};

async function loadInvitation() {
  loadController?.abort();
  submitController?.abort();
  const controller = new AbortController();
  loadController = controller;
  invitation.value = undefined;
  submitted.value = false;
  busy.value = false;
  formError.value = '';
  loadError.value = '';
  invalidInvitation.value = false;
  form.password = '';
  form.confirmPassword = '';
  if (!token.value || token.value.length > 256) {
    invalidInvitation.value = true;
    loadError.value = '邀请链接无效，请联系管理员重新邀请。';
    loading.value = false;
    return;
  }
  loading.value = true;
  try {
    const data = await publicAuth<Invitation>(`/invitations/${encodeURIComponent(token.value)}`, { signal: controller.signal });
    if (controller.signal.aborted) return;
    if (typeof data.companyName !== 'string') throw new Error('无法读取团队信息，请稍后重试');
    invitation.value = data;
  } catch (error) {
    if (controller.signal.aborted) return;
    invalidInvitation.value = error instanceof PublicAuthError && [404, 410].includes(error.status);
    loadError.value = invalidInvitation.value ? '邀请链接已失效，请联系管理员重新邀请。' : error instanceof Error ? error.message : '读取邀请失败，请稍后重试';
  } finally {
    if (loadController === controller) loading.value = false;
  }
}

async function submit() {
  if (busy.value || loading.value || !invitation.value || !formRef.value) return;
  busy.value = true;
  formError.value = '';
  const controller = new AbortController();
  submitController = controller;
  try {
    if (!(await formRef.value.validate().catch(() => false))) return;
    if (controller.signal.aborted) return;
    const data = await publicAuth<{ id: string; status: string }>(`/invitations/${encodeURIComponent(token.value)}/applications`, {
      body: {
        username: form.username.trim(),
        displayName: form.displayName.trim(),
        password: form.password,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      },
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    if (data.status !== 'PENDING') throw new Error('未能确认申请状态，请联系管理员');
    submitted.value = true;
    form.password = '';
    form.confirmPassword = '';
  } catch (error) {
    if (controller.signal.aborted) return;
    if (error instanceof PublicAuthError && [404, 410].includes(error.status)) {
      invitation.value = undefined;
      invalidInvitation.value = true;
      loadError.value = '邀请链接已失效，请联系管理员重新邀请。';
      form.password = '';
      form.confirmPassword = '';
    } else {
      formError.value = error instanceof Error ? error.message : '提交失败，请稍后重试';
    }
  } finally {
    if (submitController === controller) busy.value = false;
  }
}

watch(token, () => {
  form.username = '';
  form.displayName = '';
  form.phone = '';
  void loadInvitation();
}, { immediate: true });
onBeforeUnmount(() => {
  loadController?.abort();
  submitController?.abort();
  form.password = '';
  form.confirmPassword = '';
});
</script>

<template>
  <main class="join-page">
    <div class="join-shell">
      <section class="join-showcase">
        <div class="join-brand">
          <img src="/brand-mark.svg" alt="" />
          <div><strong>SuperPower Browser</strong><span>多店铺浏览器工作台</span></div>
        </div>
        <div class="join-introduction">
          <span class="join-eyebrow"><el-icon><Connection /></el-icon> 团队协作</span>
          <h1>一起经营，<br><span>有序协作。</span></h1>
          <p>加入团队，与同事一起<br>管理店铺和日常工作。</p>
          <div class="join-steps">
            <div><span>1</span><p><b>填写成员信息</b><small>设置你的登录用户名与密码</small></p></div>
            <div><span>2</span><p><b>等待管理员审核</b><small>管理员确认后，即可登录团队</small></p></div>
          </div>
        </div>
      </section>

      <section class="join-panel" :aria-busy="loading || busy" aria-labelledby="join-title">
        <div v-if="loading" class="join-state" role="status">
          <h2 id="join-title">正在读取邀请…</h2>
          <p>请稍候。</p>
        </div>
        <div v-else-if="loadError" class="join-state">
          <h2 id="join-title">{{ invalidInvitation ? '邀请已失效' : '暂时无法读取邀请' }}</h2>
          <p role="alert">{{ loadError }}</p>
          <el-button v-if="!invalidInvitation" type="primary" @click="loadInvitation">重新加载</el-button>
          <el-button @click="router.push('/login')">返回登录</el-button>
        </div>
        <div v-else-if="submitted" class="join-state submitted-state">
          <span class="success-mark" aria-hidden="true"><el-icon><Check /></el-icon></span>
          <h2 id="join-title">申请已提交</h2>
          <p>你加入 <strong>{{ invitation?.companyName }}</strong> 的申请正在等待管理员审核。</p>
          <p>审核通过后，使用用户名 <strong>{{ form.username }}</strong> 和刚设置的密码登录。</p>
          <el-button type="primary" @click="router.push('/login')">前往登录</el-button>
        </div>
        <div v-else-if="invitation" class="join-form-container">
          <h2 id="join-title">加入 {{ invitation.companyName }}</h2>
          <p class="join-description">{{ invitation.departmentName ? `申请加入「${invitation.departmentName}」，提交后由管理员审核。` : '填写成员信息，提交后由管理员审核。' }}</p>
          <el-form ref="formRef" :model="form" :rules="rules" label-position="top" class="join-form" @submit.prevent="submit" @input="formError = ''">
            <el-form-item label="姓名" prop="displayName">
              <el-input v-model.trim="form.displayName" name="name" autocomplete="name" placeholder="请输入真实姓名" :maxlength="120" :disabled="busy" :prefix-icon="User" />
            </el-form-item>
            <el-form-item label="登录用户名" prop="username">
              <el-input v-model.trim="form.username" name="username" autocomplete="username" placeholder="设置登录用户名（3–80 个字符）" :maxlength="80" :disabled="busy" :prefix-icon="User" autocapitalize="none" :spellcheck="false" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" name="password" autocomplete="new-password" type="password" show-password placeholder="设置密码，至少 12 个字符" :disabled="busy" :prefix-icon="Lock" />
            </el-form-item>
            <el-form-item label="确认密码" prop="confirmPassword">
              <el-input v-model="form.confirmPassword" name="confirm-password" autocomplete="new-password" type="password" show-password placeholder="请再次输入密码" :disabled="busy" :prefix-icon="Lock" />
            </el-form-item>
            <el-form-item label="联系电话（选填）" prop="phone">
              <el-input v-model.trim="form.phone" name="tel" autocomplete="tel" type="tel" placeholder="便于管理员联系你" :maxlength="40" :disabled="busy" :prefix-icon="Phone" />
            </el-form-item>
            <div v-if="formError" class="join-error" role="alert">{{ formError }}</div>
            <el-button class="join-submit" native-type="submit" type="primary" :disabled="busy" :loading="busy">{{ busy ? '正在提交…' : '申请加入' }}<el-icon v-if="!busy"><Right /></el-icon></el-button>
          </el-form>
          <div class="join-login">已有团队账号？<el-button link type="primary" :disabled="busy" @click="router.push('/login')">前往登录</el-button></div>
        </div>
      </section>
    </div>
  </main>
</template>

<style scoped>
.join-page { height: calc(100dvh - var(--desktop-titlebar-height, 0px)); min-height: 0; padding: clamp(16px, 3vh, 28px); display: grid; place-items: center; overflow: hidden; background: #f3f6fb; color: #1c2c48; }
.join-shell { width: min(1384px, 100%); height: 100%; max-height: 820px; min-height: 0; display: grid; grid-template-columns: 1.08fr 1fr; border: 1px solid #e6ecf5; border-radius: 24px; overflow: hidden; background: #fff; box-shadow: 0 16px 70px #253f7210; }
.join-showcase { display: flex; flex-direction: column; padding: 36px 48px; background: radial-gradient(ellipse at 98% 100%, #cbdcff 0, transparent 55%), radial-gradient(ellipse at 0 0, #e7f0ff 0, transparent 65%), #f0f5ff; }
.join-brand { display: flex; align-items: center; gap: 12px; }
.join-brand img { width: 43px; height: 43px; border-radius: 12px; }
.join-brand strong { display: block; font-size: 16px; font-weight: 650; }
.join-brand div > span { display: block; margin-top: 5px; font-size: 11px; letter-spacing: 2px; color: #7587a5; }
.join-introduction { margin: auto 0; padding: 45px 0; }
.join-eyebrow { display: flex; align-items: center; gap: 8px; color: #5675a7; font-size: 12px; letter-spacing: 2px; }
.join-introduction h1 { font-size: clamp(32px, 3.3vw, 47px); font-weight: 650; letter-spacing: 1px; line-height: 1.48; margin: 20px 0 18px; }
.join-introduction h1 span { color: #386bff; }
.join-introduction > p { color: #7385a2; font-size: 14px; line-height: 1.9; }
.join-steps { display: grid; gap: 24px; margin-top: 42px; }
.join-steps > div { display: flex; align-items: center; gap: 14px; }
.join-steps > div > span { display: grid; place-items: center; width: 34px; height: 34px; flex: 0 0 auto; background: #fff9; color: #386bff; border: 1px solid #fff; border-radius: 10px; font-size: 14px; }
.join-steps p { margin: 0; }
.join-steps b { display: block; font-size: 13px; font-weight: 500; color: #405675; }
.join-steps small { display: block; margin-top: 6px; color: #8091ac; font-size: 11px; }
.join-panel { min-height: 0; overflow-y: auto; padding: 38px 42px; display: flex; flex-direction: column; }
.join-form-container, .join-state { width: 100%; max-width: 380px; flex: 0 0 auto; margin: auto; }
.join-panel h2 { margin: 0 0 10px; font-size: 26px; font-weight: 650; line-height: 1.45; overflow-wrap: anywhere; }
.join-description, .join-state p { margin: 0 0 25px; color: #748198; font-size: 13px; line-height: 1.8; overflow-wrap: anywhere; }
.join-form :deep(.el-form-item) { margin-bottom: 21px; }
.join-form :deep(.el-form-item__label) { padding: 0; margin-bottom: 7px; color: #374660; font-weight: 500; line-height: 20px; }
.join-form :deep(.el-input__wrapper) { min-height: 43px; padding: 0 14px; border-radius: 9px; background: #fcfdff; box-shadow: 0 0 0 1px #dfe5ef inset; }
.join-form :deep(.el-input__wrapper.is-focus) { background: #fff; box-shadow: 0 0 0 1px #386bff inset, 0 0 0 3px #386bff12; }
.join-form :deep(.is-error .el-input__wrapper) { box-shadow: 0 0 0 1px var(--el-color-danger) inset; }
.join-form :deep(.el-input__prefix) { color: #8e9db5; font-size: 17px; margin-right: 5px; }
.join-form :deep(.el-input__inner) { font-size: 13px; color: #1c2c48; }
.join-form :deep(.el-form-item__error) { font-size: 11px; padding-top: 4px; }
.join-submit { width: 100%; height: 46px; border-radius: 9px; background: #386bff; border-color: #386bff; box-shadow: 0 6px 16px #386bff20; }
.join-submit .el-icon { margin-left: 12px; }
.join-login { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 18px; color: #748198; font-size: 12px; }
.join-login .el-button { font-size: 12px; }
.join-error { padding: 10px 12px; margin-bottom: 16px; background: #fff3f2; border: 1px solid #f9dedb; border-radius: 8px; color: #b13e39; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.success-mark { display: grid; place-items: center; width: 52px; height: 52px; margin-bottom: 24px; color: #2d9b7d; background: #e8f7f1; border-radius: 15px; font-size: 28px; }
.join-state strong { color: #405675; }
@media (max-width: 1100px) { .join-showcase { padding: 30px; } .join-panel { padding: 30px 35px; } }
@media (max-width: 800px) {
  .join-page { padding: 20px; }
  .join-shell { grid-template-columns: 1fr; grid-template-rows: auto minmax(0, 1fr); max-width: 500px; border-radius: 20px; }
  .join-showcase { padding: 24px 30px; }
  .join-introduction { display: none; }
  .join-panel { padding: 28px 30px; }
}
@media (max-width: 420px) {
  .join-page { padding: 0; background: #fff; }
  .join-shell { border: 0; border-radius: 0; box-shadow: none; }
  .join-showcase { padding: 24px 26px; }
  .join-panel { padding: 26px; }
}
</style>
