<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { FormInstance, FormRules } from 'element-plus';
import { Check, Connection, Lock, Monitor, Right, User } from '@element-plus/icons-vue';
import { passwordError, publicAuth, usernameError, type AuthSession } from './public-auth';

const route = useRoute();
const router = useRouter();
const formRef = ref<FormInstance>();
const form = reactive({ username: '', password: '', confirmPassword: '' });
const isRegister = computed(() => route.path === '/register');
const busy = ref(false);
const capsLock = ref(false);
const formError = ref('');
let submission: AbortController | undefined;
const rules = computed<FormRules>(() => ({
  username: [{ required: true, trigger: 'blur', validator: (_rule, value, callback) => {
    const error = isRegister.value ? usernameError(value || '') : (!value?.trim() ? '请输入用户名' : '');
    callback(error ? new Error(error) : undefined);
  } }],
  password: [{ required: true, trigger: 'blur', validator: (_rule, value, callback) => {
    const error = isRegister.value ? passwordError(value || '') : (!value ? '请输入密码' : '');
    callback(error ? new Error(error) : undefined);
  } }],
  confirmPassword: [{ required: true, trigger: 'blur', validator: (_rule, value, callback) => {
    const error = !value ? '请再次输入密码' : value !== form.password ? '两次输入的密码不一致' : '';
    callback(error ? new Error(error) : undefined);
  } }],
}));

watch(isRegister, () => {
  submission?.abort();
  busy.value = false;
  form.password = '';
  form.confirmPassword = '';
  capsLock.value = false;
  formError.value = '';
  formRef.value?.clearValidate();
});
onBeforeUnmount(() => { submission?.abort(); form.password = ''; form.confirmPassword = ''; });

function checkCapsLock(event: Event | KeyboardEvent) {
  if (!(event instanceof KeyboardEvent)) return;
  capsLock.value = event.getModifierState('CapsLock');
}

async function submit() {
  if (busy.value || !formRef.value) return;
  busy.value = true;
  formError.value = '';
  const controller = new AbortController();
  submission = controller;
  const registering = isRegister.value;
  try {
    if (!(await formRef.value.validate().catch(() => false))) return;
    if (controller.signal.aborted) return;
    const data = await publicAuth<AuthSession>(registering ? '/register' : '/login', {
      body: { username: form.username.trim(), password: form.password, ...(registering ? { displayName: form.username.trim() } : {}) },
      signal: controller.signal,
    });
    if (controller.signal.aborted) return;
    if (!data.token) throw new Error('登录信息不完整，请稍后重试');
    sessionStorage.setItem('spb-token', data.token);
    form.password = '';
    form.confirmPassword = '';
    await router.replace('/dashboard');
  } catch (error) {
    if (!controller.signal.aborted) formError.value = error instanceof Error ? error.message : `${registering ? '注册' : '登录'}失败，请稍后重试`;
  } finally {
    if (submission === controller) busy.value = false;
  }
}
</script>

<template>
  <div class="auth-page">
    <div class="auth-shell">
      <section class="auth-showcase" aria-labelledby="showcase-title">
        <div class="auth-brand">
          <img class="auth-logo" src="/brand-mark.svg" alt=""/>
          <div><strong>SuperPower Browser</strong><span>多店铺浏览器工作台</span></div>
        </div>

        <div class="showcase-content">
          <div class="showcase-eyebrow"><span></span> 专注经营，从容管理</div>
          <h1 id="showcase-title">每个店铺，<br>都有<span>独立空间。</span></h1>
          <p class="showcase-description">连接店铺、设备与团队，<br>让日常管理更有条理。</p>

          <div class="environment-art" aria-hidden="true">
            <div class="art-orbit"></div>
            <div class="art-window">
              <div class="art-titlebar">
                <div class="window-dots"><i></i><i></i><i></i></div>
                <span>店铺环境</span>
                <el-icon><Lock /></el-icon>
              </div>
              <div class="art-body">
                <div class="art-sidebar">
                  <span class="art-nav active"><el-icon><Monitor /></el-icon></span>
                  <span class="art-nav"><el-icon><Connection /></el-icon></span>
                  <span class="art-nav"><el-icon><User /></el-icon></span>
                </div>
                <div class="art-environments">
                  <div class="art-list-title">独立环境，清晰管理<span>•••</span></div>
                  <div v-for="(name, index) in ['店铺环境 A', '店铺环境 B', '店铺环境 C']" :key="name" class="art-environment">
                    <span class="environment-icon" :class="`environment-icon-${index}`"><el-icon><Monitor /></el-icon></span>
                    <div><b>{{ name }}</b><span class="environment-line"></span></div>
                    <span class="environment-check"><el-icon><Check /></el-icon></span>
                  </div>
                </div>
              </div>
            </div>
            <div class="art-badge badge-profile"><span><el-icon><Lock /></el-icon></span><div><b>独立浏览环境</b><small>各自配置 · 有序管理</small></div></div>
            <div class="art-badge badge-team"><span><el-icon><Connection /></el-icon></span><div><b>团队协作</b><small>按角色分配权限</small></div></div>
          </div>
        </div>

        <div class="showcase-features">
          <span><el-icon><Monitor /></el-icon> 环境独立</span>
          <span><el-icon><Connection /></el-icon> 集中管理</span>
          <span><el-icon><User /></el-icon> 协作有序</span>
        </div>
      </section>

      <section class="auth-panel" aria-labelledby="login-title">
        <div class="auth-form-container">
          <span class="form-symbol" aria-hidden="true"><el-icon><Right /></el-icon></span>
          <h2 id="login-title">{{ isRegister ? '创建账号' : '欢迎回来' }}</h2>
          <p class="form-description">{{ isRegister ? '注册后即可开始管理店铺与团队。' : '登录工作台，开始今天的工作。' }}</p>

          <el-form :key="isRegister ? 'register' : 'login'" ref="formRef" :model="form" :rules="rules" label-position="top" class="auth-form" :aria-busy="busy" @submit.prevent="submit" @input="formError = ''">
            <el-form-item label="用户名" prop="username">
              <el-input v-model.trim="form.username" name="username" :placeholder="isRegister ? '3–80 位字母、数字或下划线' : '请输入用户名'" autocomplete="username" :maxlength="isRegister ? 80 : undefined" :prefix-icon="User" :disabled="busy" autocapitalize="none" :spellcheck="false" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
              <el-input v-model="form.password" name="password" :placeholder="isRegister ? '8–16 位，包含大写、小写字母和数字' : '请输入密码'" type="password" show-password :autocomplete="isRegister ? 'new-password' : 'current-password'" :prefix-icon="Lock" :disabled="busy" @keydown="checkCapsLock" @keyup="checkCapsLock" @blur="capsLock = false" />
            </el-form-item>
            <el-form-item v-if="isRegister" label="确认密码" prop="confirmPassword">
              <el-input v-model="form.confirmPassword" name="confirm-password" placeholder="请再次输入密码" type="password" show-password autocomplete="new-password" :prefix-icon="Lock" :disabled="busy" @keydown="checkCapsLock" @keyup="checkCapsLock" @blur="capsLock = false" />
            </el-form-item>
            <div class="form-status" aria-live="polite">
              <span v-if="capsLock" class="caps-warning">大写锁定已开启</span>
              <span v-else>{{ isRegister ? '请使用不易猜测的密码，并妥善保存。' : '使用注册账号或管理员分配的账号登录' }}</span>
            </div>
            <div v-if="formError" class="login-error" role="alert">{{ formError }}</div>
            <el-button class="login-submit" type="primary" native-type="submit" :loading="busy" :disabled="busy">
              <span>{{ busy ? (isRegister ? '正在注册…' : '正在登录…') : (isRegister ? '注册并进入工作台' : '登录工作台') }}</span><el-icon v-if="!busy"><Right /></el-icon>
            </el-button>
          </el-form>

          <div class="account-switch">
            <span>{{ isRegister ? '已有账号？' : '还没有账号？' }}</span>
            <el-button link type="primary" :disabled="busy" @click="router.push(isRegister ? '/login' : '/register')">{{ isRegister ? '返回登录' : '立即注册' }}</el-button>
          </div>
          <div v-if="!isRegister" class="account-help"><span>需要帮助？</span>请联系管理员重置密码。</div>
        </div>
        <div class="auth-footer"><el-icon><Lock /></el-icon><span>独立环境 · 专注每一份业务</span></div>
      </section>
    </div>
  </div>
</template>

<style scoped>
.auth-page {
  --auth-ink: #1c2c48;
  --auth-muted: #748198;
  height: calc(100dvh - var(--desktop-titlebar-height, 0px));
  min-height: 0;
  display: grid;
  place-items: center;
  padding: clamp(16px, 3vh, 28px);
  overflow: hidden;
  background: #f3f6fb;
  color: var(--auth-ink);
}
.auth-shell {
  width: min(1384px, 100%);
  height: 100%;
  max-height: 820px;
  min-height: 0;
  display: grid;
  grid-template-columns: 1.08fr 1fr;
  background: #fff;
  border: 1px solid #e6ecf5;
  border-radius: 24px;
  overflow: hidden;
  box-shadow: 0 16px 70px #253f7210;
}
.auth-showcase {
  position: relative;
  display: flex;
  flex-direction: column;
  padding: 36px 48px 30px;
  overflow: hidden;
  background: radial-gradient(ellipse at 98% 100%, #cbdcff 0, transparent 55%), radial-gradient(ellipse at 0 0, #e7f0ff 0, transparent 65%), #f0f5ff;
}
.auth-showcase::before {
  content: '';
  position: absolute;
  inset: 0;
  background-image: linear-gradient(#7496cf0c 1px, transparent 1px), linear-gradient(90deg, #7496cf0c 1px, transparent 1px);
  background-size: 36px 36px;
  mask-image: linear-gradient(transparent 8%, #000 100%);
  pointer-events: none;
}
.auth-brand { display: flex; align-items: center; gap: 12px; position: relative; }
.auth-logo { position: relative; display: grid; place-items: center; width: 43px; height: 43px; background: #386bff; color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -1.5px; border-radius: 12px; box-shadow: 0 6px 15px #386bff20; }
.auth-logo > span { position: absolute; top: 9px; right: 7px; width: 4px; height: 4px; border-radius: 50%; background: #a6d8ff; }
.auth-brand strong { display: block; font-size: 16px; font-weight: 650; letter-spacing: -.25px; }
.auth-brand div > span { display: block; margin-top: 5px; font-size: 11px; letter-spacing: 2px; color: #7587a5; }
.showcase-content { position: relative; display: flex; flex-direction: column; flex: 1; min-height: 0; margin: 0; padding-top: 32px; }
.showcase-eyebrow { display: flex; align-items: center; gap: 8px; color: #5675a7; font-size: 12px; letter-spacing: 2px; margin-bottom: 19px; }
.showcase-eyebrow > span { width: 6px; height: 6px; border-radius: 50%; background: #386bff; box-shadow: 0 0 0 4px #386bff0d; }
.auth-showcase h1 { font-size: clamp(32px, 3.3vw, 47px); font-weight: 650; letter-spacing: 1px; line-height: 1.48; margin: 0 0 18px; }
.auth-showcase h1 span { color: #386bff; }
.showcase-description { color: #7385a2; line-height: 1.9; font-size: 14px; margin-bottom: 0; }
.environment-art { position: relative; flex: 1; min-height: 180px; max-height: 260px; width: 100%; max-width: 460px; margin: 14px auto 4px; }
.art-orbit { position: absolute; width: 310px; height: 245px; border: 1px solid #b7ccee75; border-radius: 50%; transform: rotate(-22deg); top: 18px; left: 18%; }
.art-orbit::after { content: ''; position: absolute; width: 8px; height: 8px; background: #94b4f8; border: 3px solid #edf4ff; box-sizing: content-box; border-radius: 50%; top: 39px; right: 18px; }
.art-window { position: absolute; width: 84%; top: 32px; left: 6%; border-radius: 13px; background: #ffffffeb; border: 1px solid #fff; box-shadow: 0 22px 48px #4976cc1c, 0 3px 6px #4976cc08; transform: rotate(-3deg); overflow: hidden; }
.art-titlebar { height: 35px; display: flex; align-items: center; justify-content: space-between; padding: 0 14px; border-bottom: 1px solid #eaf0fa; color: #8493ad; font-size: 10px; }
.window-dots { display: flex; gap: 4px; }
.window-dots i { width: 5px; height: 5px; border-radius: 50%; background: #d5e0f3; }
.window-dots i:first-child { background: #91b1f3; }
.art-body { display: flex; min-height: 174px; }
.art-sidebar { width: 43px; padding: 13px 8px; background: #f7f9ff; display: flex; flex-direction: column; gap: 11px; border-right: 1px solid #edf1f9; }
.art-nav { display: grid; place-items: center; width: 27px; height: 27px; border-radius: 6px; color: #a4b2c9; }
.art-nav.active { color: #386bff; background: #e7efff; }
.art-environments { flex: 1; min-width: 0; padding: 13px 17px; }
.art-list-title { display: flex; justify-content: space-between; color: #536785; font-size: 10px; margin-bottom: 10px; }
.art-list-title > span { color: #b0bcd1; }
.art-environment { display: flex; align-items: center; gap: 9px; padding: 7px 0; border-top: 1px solid #eef2f9; }
.environment-icon { display: grid; place-items: center; width: 28px; height: 28px; background: #edf2ff; color: #7294ed; border-radius: 7px; }
.environment-icon-1 { background: #e8f7f4; color: #60b7a5; }
.environment-icon-2 { background: #f2edff; color: #a68adc; }
.art-environment b { color: #6a7b95; font-size: 10px; font-weight: 500; display: block; }
.environment-line { width: 66px; height: 3px; display: block; background: #edf1f8; border-radius: 2px; margin-top: 5px; }
.environment-check { margin-left: auto; color: #6db8a1; background: #edf8f4; border-radius: 50%; width: 16px; height: 16px; display: grid; place-items: center; font-size: 10px; }
.art-badge { position: absolute; display: flex; align-items: center; gap: 9px; background: #ffffffed; border: 1px solid #fff; padding: 12px 14px; border-radius: 11px; box-shadow: 0 12px 28px #5379b818; }
.art-badge > span { display: grid; place-items: center; width: 32px; height: 32px; color: #386bff; background: #edf3ff; border-radius: 9px; font-size: 17px; }
.art-badge b { font-size: 11px; font-weight: 600; display: block; color: #405675; }
.art-badge small { font-size: 9px; color: #95a3b8; display: block; margin-top: 4px; }
.badge-profile { top: 8px; right: -3px; transform: rotate(3deg); }
.badge-team { bottom: 14px; left: -8px; transform: rotate(2deg); }
.badge-team > span { color: #53aa9a; background: #edf8f5; }
.showcase-features { position: relative; display: flex; align-items: center; gap: 22px; padding-top: 22px; color: #6b81a4; font-size: 11px; }
.showcase-features > span { display: flex; align-items: center; gap: 6px; white-space: nowrap; }
.showcase-features .el-icon { font-size: 14px; color: #7998cc; }
.auth-panel { position: relative; display: flex; flex-direction: column; align-items: center; padding: 64px 42px 96px; min-height: 0; overflow-y: auto; }
.auth-form-container { width: 100%; max-width: 352px; flex: 0 0 auto; margin: auto; }
.form-symbol { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid #e8edf6; border-radius: 12px; color: #386bff; background: #f7f9fe; font-size: 23px; margin-bottom: 25px; }
.auth-panel h2 { font-size: 30px; letter-spacing: 1px; font-weight: 650; margin: 0 0 12px; line-height: 1.4; }
.form-description { font-size: 13px; color: var(--auth-muted); margin: 0 0 35px; line-height: 1.7; }
.auth-form :deep(.el-form-item) { margin-bottom: 25px; }
.auth-form :deep(.el-form-item__label) { padding: 0; margin-bottom: 10px; font-weight: 500; color: #374660; line-height: 20px; }
.auth-form :deep(.el-input__wrapper) { min-height: 49px; padding: 0 14px; background: #fcfdff; border-radius: 9px; box-shadow: 0 0 0 1px #dfe5ef inset; transition: box-shadow .2s, background .2s; }
.auth-form :deep(.el-input__wrapper:hover) { box-shadow: 0 0 0 1px #aabbdb inset; }
.auth-form :deep(.el-input__wrapper.is-focus) { background: #fff; box-shadow: 0 0 0 1px #386bff inset, 0 0 0 3px #386bff12; }
.auth-form :deep(.is-error .el-input__wrapper) { box-shadow: 0 0 0 1px var(--el-color-danger) inset; }
.auth-form :deep(.el-input__prefix) { color: #8e9db5; font-size: 17px; margin-right: 5px; }
.auth-form :deep(.el-input__inner) { font-size: 13px; color: var(--auth-ink); }
.auth-form :deep(.el-input__inner::placeholder) { color: #99a4b6; }
.auth-form :deep(.el-form-item__error) { padding-top: 5px; font-size: 11px; }
.auth-form :deep(.el-input__password:focus-visible) { outline: 2px solid #386bff; outline-offset: 3px; border-radius: 3px; }
.form-status { min-height: 20px; margin: -4px 0 22px; font-size: 11px; color: #7e8ba1; line-height: 20px; }
.caps-warning { color: #a96714; }
.login-error { background: #fff3f2; border: 1px solid #f9dedb; border-radius: 8px; padding: 10px 12px; margin: -5px 0 16px; color: #b13e39; font-size: 12px; line-height: 1.6; overflow-wrap: anywhere; }
.login-submit { width: 100%; height: 49px; border-radius: 9px; background: #386bff; border-color: #386bff; box-shadow: 0 6px 16px #386bff20; font-size: 14px; font-weight: 500; transition: background .2s, box-shadow .2s; }
.login-submit:hover:not(:disabled) { background: #285aee; border-color: #285aee; box-shadow: 0 8px 20px #386bff30; }
.login-submit:focus-visible { outline: 3px solid #a3baff; outline-offset: 3px; }
.login-submit .el-icon { margin-left: 13px; font-size: 17px; }
.account-help { border-top: 1px solid #edf0f5; margin-top: 29px; padding-top: 22px; font-size: 11px; color: #8692a6; line-height: 1.9; }
.account-help > span { color: #5e6e86; }
.account-switch { display: flex; align-items: center; justify-content: center; gap: 5px; margin-top: 20px; font-size: 12px; color: #748198; }
.account-switch .el-button { font-size: 12px; }
.auth-footer { position: absolute; bottom: 29px; left: 20px; right: 20px; display: flex; justify-content: center; align-items: center; gap: 6px; color: #98a3b5; font-size: 10px; letter-spacing: .6px; }
@media (min-width: 1100px) and (min-height: 850px) {
  .showcase-content { padding-top: 36px; }
  .environment-art { margin-top: 20px; margin-bottom: 10px; }
}
@media (max-width: 1100px) {
  .auth-showcase { padding: 30px 30px 26px; }
  .auth-panel { padding-left: 35px; padding-right: 35px; }
  .showcase-features { gap: 14px; }
  .environment-art { max-height: 240px; }
  .badge-profile { right: -12px; }
}
@media (min-width: 801px) and (max-height: 820px) {
  .auth-showcase { padding-top: 28px; padding-bottom: 24px; }
  .showcase-content { padding-top: 24px; }
  .showcase-eyebrow { margin-bottom: 14px; }
  .auth-showcase h1 { font-size: 38px; line-height: 1.4; margin-bottom: 12px; }
  .showcase-description { font-size: 13px; }
  .environment-art { max-height: 220px; min-height: 160px; margin-top: 10px; }
  .art-window { top: 24px; }
  .art-orbit { height: 220px; }
  .badge-team { bottom: 0; }
  .showcase-features { padding-top: 12px; }
  .auth-panel { padding-top: 24px; padding-bottom: 46px; }
  .form-symbol { width: 36px; height: 36px; margin-bottom: 16px; }
  .auth-panel h2 { font-size: 26px; }
  .form-description { margin-bottom: 22px; }
  .auth-form :deep(.el-form-item) { margin-bottom: 20px; }
  .auth-form :deep(.el-input__wrapper) { min-height: 44px; }
  .account-help { margin-top: 18px; padding-top: 14px; }
  .auth-footer { bottom: 16px; }
}
@media (max-height: 760px) {
  .form-symbol { display: none; }
}
@media (max-width: 800px) {
  .auth-page { padding: 20px; }
  .auth-shell { grid-template-columns: 1fr; grid-template-rows: auto minmax(0,1fr); max-width: 500px; min-height: 0; border-radius: 20px; }
  .auth-showcase { padding: 26px 32px; }
  .showcase-content, .showcase-features { display: none; }
  .auth-panel { padding: 38px 36px 78px; }
  .form-symbol { display: none; }
  .auth-panel h2 { font-size: 27px; }
  .form-description { margin-bottom: 30px; }
  .auth-footer { bottom: 26px; }
}
@media (max-width: 420px) {
  .auth-page { padding: 0; background: #fff; }
  .auth-shell { border: 0; border-radius: 0; min-height: 0; grid-template-rows: auto minmax(0,1fr); box-shadow: none; }
  .auth-showcase { padding: 27px 26px; }
  .auth-panel { padding: 34px 26px 76px; }
}
@media (prefers-reduced-motion: reduce) {
  .auth-form :deep(.el-input__wrapper), .login-submit { transition: none; }
}
@media (max-height: 660px) {
  .auth-panel { display: block; padding-top: 24px; padding-bottom: 28px; }
  .auth-form-container { margin: 0 auto; }
  .auth-footer { display: none; }
}
</style>
