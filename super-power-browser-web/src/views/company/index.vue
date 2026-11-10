<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { ArrowDown, MoreFilled, Plus, Refresh, Search } from '@element-plus/icons-vue';
import { mallApi } from '@/api/mall/mall.api';
import { request } from '@/utils/request';
import { passwordError, usernameError } from '@/views/login/public-auth';
import {
  companyApi,
  type ApplicationStatus,
  type CompanyActor,
  type CompanyMember,
  type CompanyRole,
  type Department,
  type MemberApplication,
  type MemberInvitation,
} from '@/api/company/company.api';

type PageTab = 'members' | 'roles' | 'applications';
type ShopGrant = { id: string; name: string; platform: string; accountName: string; granted: boolean };

const route = useRoute();
const router = useRouter();
const actor = ref<CompanyActor>();
const departments = ref<Department[]>([]);
const members = ref<CompanyMember[]>([]);
const roles = ref<CompanyRole[]>([]);
const nodes = ref<string[]>([]);
const invitations = ref<MemberInvitation[]>([]);
const applications = ref<MemberApplication[]>([]);
const loading = ref(false);
let loadGeneration = 0;
const busy = ref(false);
const error = ref('');
const departmentId = ref(typeof route.query.department === 'string' ? route.query.department : '');
const query = ref('');
const statusFilter = ref('');
const roleFilter = ref('');
const page = ref(1);
const pageSize = ref(20);
const selectedMembers = ref<CompanyMember[]>([]);
const applicationStatus = ref<ApplicationStatus>('PENDING');
const activeTab = ref<PageTab>(route.path.endsWith('/roles') ? 'roles' : route.query.tab === 'applications' ? 'applications' : 'members');

const memberTypes: Record<number, string> = { 1: '普通成员', 2: '管理员', 3: '超级管理员' };
const scopeDescriptions: Record<number, string> = {
  1: '访问本人创建或被授权的店铺与设备。',
  2: '管理本部门普通成员，以及本部门的店铺与设备。',
  3: '管理企业各部门及其成员，访问企业全部店铺与设备；超级管理员由企业所有者管理。',
};
const permissionLabels: Record<string, string> = {
  'ai.use': '使用 SuperPower AI', 'ai.purchase': '订购 AI 套餐',
  'shop.view': '查看店铺', 'shop.create': '创建／复制店铺', 'shop.edit': '编辑、绑定与常用',
  'shop.open': '打开店铺', 'shop.delete': '店铺回收与删除', 'shop.export': '导出店铺', 'shop.grant': '管理店铺授权',
  'device.view': '查看设备与代理', 'device.edit': '编辑、检测与回收设备', 'device.buy': '购买设备',
  'device.renew': '续费与加速', 'device.export': '导出设备',
  'wallet.view': '查看余额', 'wallet.recharge': '账户充值', 'order.view': '查看订单', 'order.export': '导出订单',
  'member.manage': '成员管理', 'role.manage': '角色管理',
};
const permissionSections = [
  { prefix: 'ai', label: 'AI' }, { prefix: 'shop', label: '店铺' },
  { prefix: 'device', label: '设备与代理' }, { prefix: 'wallet', label: '账户' },
  { prefix: 'order', label: '订单' }, { prefix: 'member', label: '成员' }, { prefix: 'role', label: '角色' },
];
const can = (permission: string) => Boolean(actor.value?.permissions.includes(permission));
const isCompanyManager = computed(() => Boolean(actor.value?.owner || (actor.value?.memberType ?? 1) >= 3));
const canManageDepartments = computed(() => can('member.manage') && isCompanyManager.value);
const canCreateMember = computed(() => can('member.manage') && Boolean(actor.value?.owner || (actor.value?.memberType ?? 1) >= 2));
const canCreateRole = computed(() => can('role.manage') && Boolean(actor.value?.owner || (actor.value?.memberType ?? 1) >= 2));
const availableDepartments = computed(() => departments.value.filter(department => isCompanyManager.value || department.id === actor.value?.departmentId));
const departmentName = (id?: string) => departments.value.find(department => department.id === id)?.name || '未分配部门';
const roleMembers = (id: string) => members.value.filter(member => member.roles.includes(id));
const memberRoleNames = (member: CompanyMember) => member.owner ? '企业所有者' : roles.value.filter(role => member.roles.includes(role.id)).map(role => role.name).join('、') || '未分配';
const typeName = (member: CompanyMember) => member.owner ? '企业所有者' : memberTypes[member.memberType] || '普通成员';

function canManageMember(member: CompanyMember, permission = 'member.manage') {
  if (!actor.value || !can(permission) || member.owner || member.id === actor.value.id) return false;
  if (actor.value.owner) return true;
  return actor.value.memberType > member.memberType
    && (actor.value.memberType >= 3 || actor.value.departmentId === member.departmentId);
}

function canManageRole(role: CompanyRole) {
  if (!actor.value || !can('role.manage')) return false;
  if (members.value.find(member => member.id === actor.value?.id)?.roles.includes(role.id)) return false;
  if (actor.value.owner) return true;
  return actor.value.memberType > role.memberType
    && role.permissions.every(permission => can(permission))
    && (actor.value.memberType >= 3 || actor.value.departmentId === role.departmentId)
    && roleMembers(role.id).every(member => canManageMember(member, 'role.manage'));
}

function assignableRoles(targetDepartmentId: string) {
  return roles.value.filter(role => role.departmentId === targetDepartmentId && role.enabled
    && role.permissions.every(permission => can(permission))
    && Boolean(actor.value?.owner || role.memberType < (actor.value?.memberType ?? 1)));
}

function defaultRoleIds(targetDepartmentId: string) {
  const role = assignableRoles(targetDepartmentId).find(item => item.builtin && item.memberType === 1);
  return role ? [role.id] : [];
}

function defaultDepartmentId() {
  return departmentId.value || actor.value?.departmentId || availableDepartments.value[0]?.id || '';
}

function messageOf(reason: unknown) {
  return reason instanceof Error ? reason.message : '操作失败，请稍后重试';
}

async function run(action: () => Promise<void>) {
  if (busy.value) return;
  busy.value = true;
  try {
    await action();
  } catch (reason) {
    ElMessage.error(messageOf(reason));
  } finally {
    busy.value = false;
  }
}

async function confirm(message: string, title = '确认操作') {
  try {
    await ElMessageBox.confirm(message, title, { type: 'warning', confirmButtonText: '确认', cancelButtonText: '取消' });
    return true;
  } catch {
    return false;
  }
}

async function load() {
  const generation = ++loadGeneration;
  const requestedStatus = applicationStatus.value;
  loading.value = true;
  error.value = '';
  try {
    const currentActor = await companyApi.actor();
    if (generation !== loadGeneration) return;
    actor.value = currentActor;
    const results = await Promise.all([
      companyApi.departments(), companyApi.members(), companyApi.roles(),
      can('role.manage') ? companyApi.permissionNodes() : Promise.resolve([]),
      canCreateMember.value ? companyApi.invitations() : Promise.resolve([]),
      canCreateMember.value ? companyApi.applications(requestedStatus) : Promise.resolve([]),
    ]);
    if (generation !== loadGeneration) return;
    [departments.value, members.value, roles.value, nodes.value, invitations.value, applications.value] = results;
    if (departmentId.value && !departments.value.some(department => department.id === departmentId.value)) departmentId.value = '';
    if (!isCompanyManager.value) departmentId.value = actor.value.departmentId;
    selectedMembers.value = [];
  } catch (reason) {
    if (generation === loadGeneration) error.value = messageOf(reason);
  } finally {
    if (generation === loadGeneration) loading.value = false;
  }
}

onMounted(async () => {
  await load();
  if (route.query.create && canCreateMember.value) editMember();
});
watch(() => [route.path, route.query.tab], () => {
  activeTab.value = route.path.endsWith('/roles') ? 'roles' : route.query.tab === 'applications' ? 'applications' : 'members';
});
watch([departmentId, query, statusFilter, roleFilter, activeTab], () => { page.value = 1; selectedMembers.value = []; });
watch(applicationStatus, () => { page.value = 1; void load(); });

function changeTab(tab: string | number) {
  void router.push({
    path: tab === 'roles' ? '/companyManage/roles' : '/companyManage/membersMamanger',
    query: { ...(departmentId.value ? { department: departmentId.value } : {}), ...(tab === 'applications' ? { tab: 'applications' } : {}) },
  });
}

const filteredMembers = computed(() => members.value.filter(member => {
  if (departmentId.value && member.departmentId !== departmentId.value) return false;
  if (statusFilter.value && String(member.enabled) !== statusFilter.value) return false;
  if (roleFilter.value && !member.roles.includes(roleFilter.value)) return false;
  return [member.username, member.displayName, member.phone].some(value => String(value || '').toLowerCase().includes(query.value.toLowerCase()));
}));
const displayedMembers = computed(() => filteredMembers.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const filteredRoles = computed(() => roles.value.filter(role => (!departmentId.value || role.departmentId === departmentId.value)
  && (!statusFilter.value || String(role.enabled) === statusFilter.value)
  && [role.name, role.description].some(value => String(value || '').toLowerCase().includes(query.value.toLowerCase()))));
const displayedRoles = computed(() => filteredRoles.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const filteredApplications = computed(() => applications.value.filter(application => (!departmentId.value || application.departmentId === departmentId.value)
  && [application.username, application.displayName, application.phone].some(value => String(value || '').toLowerCase().includes(query.value.toLowerCase()))));
const displayedApplications = computed(() => filteredApplications.value.slice((page.value - 1) * pageSize.value, page.value * pageSize.value));
const total = computed(() => activeTab.value === 'members' ? filteredMembers.value.length : activeTab.value === 'roles' ? filteredRoles.value.length : filteredApplications.value.length);

const departmentDialog = ref(false);
const departmentForm = reactive({ id: '', name: '' });
function editDepartment(department?: Department) {
  Object.assign(departmentForm, { id: department?.id || '', name: department?.name || '' });
  departmentDialog.value = true;
}
async function saveDepartment() {
  if (!departmentForm.name.trim()) return void ElMessage.warning('请输入部门名称');
  await run(async () => {
    if (departmentForm.id) await companyApi.renameDepartment(departmentForm.id, departmentForm.name.trim());
    else await companyApi.addDepartment(departmentForm.name.trim());
    departmentDialog.value = false;
    await load();
    ElMessage.success('部门已保存');
  });
}
async function deleteDepartment(department: Department) {
  if (department.isDefault || department.memberCount > 0) return;
  if (!await confirm(`删除空部门“${department.name}”？该部门的角色也将移除。`, '删除部门')) return;
  await run(async () => { await companyApi.deleteDepartment(department.id); await load(); ElMessage.success('部门已删除'); });
}
function departmentCommand(command: string, department: Department) {
  if (command === 'rename') editDepartment(department);
  else void deleteDepartment(department);
}

const memberDialog = ref(false);
const memberForm = reactive({ id: '', username: '', displayName: '', phone: '', password: '', departmentId: '', roleIds: [] as string[], enabled: true });
const memberRoleOptions = computed(() => {
  const allowed = new Set(assignableRoles(memberForm.departmentId).map(role => role.id));
  return roles.value.filter(role => role.departmentId === memberForm.departmentId
    && (allowed.has(role.id) || memberForm.roleIds.includes(role.id)));
});
const detail = ref<CompanyMember>();
function editMember(member?: CompanyMember) {
  const targetDepartment = member?.departmentId || defaultDepartmentId();
  Object.assign(memberForm, {
    id: member?.id || '', username: member?.username || '', displayName: member?.displayName || '', phone: member?.phone || '',
    password: '', departmentId: targetDepartment, roleIds: member ? [...member.roles] : defaultRoleIds(targetDepartment), enabled: member?.enabled ?? true,
  });
  memberDialog.value = true;
}
function changeMemberDepartment() { memberForm.roleIds = defaultRoleIds(memberForm.departmentId); }
async function saveMember() {
  if (!memberForm.username.trim() || !memberForm.displayName.trim() || !memberForm.departmentId) return void ElMessage.warning('请填写成员账号、姓名和所属部门');
  const accountError = !memberForm.id ? usernameError(memberForm.username) : '';
  if (accountError) return void ElMessage.warning(accountError);
  const credentialError = !memberForm.id || memberForm.password ? passwordError(memberForm.password) : '';
  if (credentialError) return void ElMessage.warning(credentialError);
  if (!memberForm.roleIds.length) return void ElMessage.warning('请至少选择一个角色');
  await run(async () => {
    const body = { ...memberForm, username: memberForm.username.trim(), displayName: memberForm.displayName.trim() };
    await companyApi.saveMember(memberForm.id, body);
    memberDialog.value = false;
    memberForm.password = '';
    await load();
    ElMessage.success('成员已保存');
  });
}
async function memberStatus(targets: CompanyMember[], enabled: boolean) {
  const selected = targets.filter(member => canManageMember(member) && member.enabled !== enabled);
  if (!selected.length) return void ElMessage.info('没有需要变更状态的成员');
  if (!await confirm(`${enabled ? '启用' : '停用'}所选 ${selected.length} 名成员？${enabled ? '' : '停用后成员将无法登录。'}`)) return;
  await run(async () => {
    try {
      for (const member of selected) await companyApi.saveMember(member.id, { displayName: member.displayName, enabled });
      ElMessage.success('成员状态已更新');
    } finally { await load(); }
  });
}

const passwordDialog = ref(false);
const passwordMember = ref<CompanyMember>();
const newPassword = ref('');
function resetPassword(member: CompanyMember) { passwordMember.value = member; newPassword.value = ''; passwordDialog.value = true; }
async function savePassword() {
  if (!passwordMember.value) return;
  const error = passwordError(newPassword.value);
  if (error) return void ElMessage.warning(error);
  await run(async () => {
    const member = passwordMember.value!;
    await companyApi.saveMember(member.id, { displayName: member.displayName, enabled: member.enabled, password: newPassword.value });
    passwordDialog.value = false;
    newPassword.value = '';
    ElMessage.success('密码已重置，该成员的已有登录已失效');
  });
}

const deleteDialog = ref(false);
const deletingMember = ref<CompanyMember>();
const departure = ref({ environmentCount: 0, deviceCount: 0 });
const transferTo = ref('');
const needsTransfer = computed(() => departure.value.environmentCount + departure.value.deviceCount > 0);
const transferCandidates = computed(() => members.value.filter(member => member.enabled && member.id !== deletingMember.value?.id
  && (isCompanyManager.value || member.departmentId === actor.value?.departmentId)));
async function prepareDelete(member: CompanyMember) {
  if (member.enabled) return void ElMessage.warning('请先停用成员，再删除');
  await run(async () => {
    departure.value = await companyApi.departure(member.id);
    deletingMember.value = member;
    transferTo.value = '';
    deleteDialog.value = true;
  });
}
async function deleteMember() {
  if (!deletingMember.value) return;
  if (needsTransfer.value && !transferTo.value) return void ElMessage.warning('请选择资源接收人');
  await run(async () => {
    await companyApi.deleteMember(deletingMember.value!.id, needsTransfer.value ? transferTo.value : undefined);
    deleteDialog.value = false;
    await load();
    ElMessage.success('成员已删除');
  });
}

const roleDialog = ref(false);
const roleForm = reactive({ id: '', name: '', description: '', departmentId: '', memberType: 1, enabled: true, permissions: [] as string[], builtin: false });
const allowedTypes = computed(() => [1, 2, 3].filter(type => actor.value?.owner || type < (actor.value?.memberType ?? 1)));
const roleSections = computed(() => permissionSections.map(section => ({ ...section, nodes: nodes.value.filter(node => node.startsWith(section.prefix + '.')) })));
function editRole(role?: CompanyRole, copy = false) {
  Object.assign(roleForm, {
    id: copy ? '' : role?.id || '', name: role ? role.name + (copy ? ' 副本' : '') : '', description: role?.description || '',
    departmentId: role?.departmentId || defaultDepartmentId(), memberType: role?.memberType || 1, enabled: role?.enabled ?? true,
    permissions: role ? [...role.permissions] : [], builtin: copy ? false : role?.builtin || false,
  });
  roleDialog.value = true;
}
function selectPermissions(values: string[], checked: boolean) {
  roleForm.permissions = checked ? [...new Set([...roleForm.permissions, ...values])] : roleForm.permissions.filter(value => !values.includes(value));
}
async function saveRole() {
  if (!roleForm.name.trim() || !roleForm.departmentId) return void ElMessage.warning('请填写角色名称和所属部门');
  await run(async () => {
    await companyApi.saveRole(roleForm.id, { ...roleForm, name: roleForm.name.trim() });
    roleDialog.value = false;
    await load();
    ElMessage.success('角色已保存');
  });
}
async function roleStatus(role: CompanyRole, enabled: boolean) {
  if (!enabled && !await confirm(`停用角色“${role.name}”？成员将失去该角色的权限和管理范围。`)) return;
  await run(async () => { await companyApi.saveRole(role.id, { ...role, enabled }); await load(); });
}
async function deleteRole(role: CompanyRole) {
  if (role.builtin || roleMembers(role.id).length) return;
  if (!await confirm(`删除未绑定成员的角色“${role.name}”？`, '删除角色')) return;
  await run(async () => { await companyApi.deleteRole(role.id); await load(); ElMessage.success('角色已删除'); });
}

const invitationDialog = ref(false);
const invitationDepartment = ref('');
const invitationUrl = ref('');
const invitationExpires = ref('');
const displayedInvitations = computed(() => invitations.value.filter(invitation => !departmentId.value || invitation.departmentId === departmentId.value));
function showInvitation() {
  invitationDepartment.value = defaultDepartmentId();
  invitationUrl.value = '';
  invitationExpires.value = '';
  invitationDialog.value = true;
}
function inviteUrl(token: string) {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL || '').trim();
  const base = (configured || window.location.origin).replace(/\/#.*$/, '').replace(/\/$/, '');
  return `${base}/#/join?token=${encodeURIComponent(token)}`;
}
function formatTime(value?: string) {
  if (!value) return '—';
  const time = new Date(value);
  return Number.isNaN(time.getTime()) ? value : time.toLocaleString('zh-CN', { hour12: false });
}
function invitationActive(invitation: MemberInvitation) {
  return !invitation.revoked && invitation.enabled !== false && new Date(invitation.expiresAt).getTime() > Date.now();
}
async function createInvitation() {
  if (!invitationDepartment.value) return void ElMessage.warning('请选择受邀成员所属部门');
  await run(async () => {
    const invitation = await companyApi.invite(invitationDepartment.value);
    if (!invitation.token) throw new Error('邀请已创建，但未返回邀请链接，请重新生成');
    invitationUrl.value = inviteUrl(invitation.token);
    invitationExpires.value = invitation.expiresAt;
    await load();
  });
}
async function copyInvitation() {
  try {
    await navigator.clipboard.writeText(invitationUrl.value);
    ElMessage.success('邀请链接已复制');
  } catch {
    ElMessage.warning('无法自动复制，请选中下方链接手动复制');
  }
}
async function revokeInvitation(invitation: MemberInvitation) {
  if (!await confirm('撤销后，此邀请链接将无法继续提交加入申请。')) return;
  await run(async () => { await companyApi.revokeInvitation(invitation.id); await load(); ElMessage.success('邀请已撤销'); });
}

const reviewDialog = ref(false);
const reviewApplication = ref<MemberApplication>();
const reviewForm = reactive({ approved: true, roleIds: [] as string[], reason: '' });
function showReview(application: MemberApplication, approved: boolean) {
  reviewApplication.value = application;
  Object.assign(reviewForm, { approved, roleIds: defaultRoleIds(application.departmentId), reason: '' });
  reviewDialog.value = true;
}
async function saveReview() {
  if (!reviewApplication.value) return;
  if (reviewForm.approved && !reviewForm.roleIds.length) return void ElMessage.warning('请选择申请通过后使用的角色');
  if (!reviewForm.approved && !reviewForm.reason.trim()) return void ElMessage.warning('请填写拒绝原因');
  await run(async () => {
    await companyApi.review(reviewApplication.value!.id, {
      approved: reviewForm.approved, roleIds: reviewForm.approved ? reviewForm.roleIds : undefined,
      reason: reviewForm.reason.trim(),
    });
    reviewDialog.value = false;
    await load();
    ElMessage.success(reviewForm.approved ? '申请已通过，成员可以登录' : '申请已拒绝');
  });
}

const grantsDialog = ref(false);
const grantMember = ref<CompanyMember>();
const shops = ref<ShopGrant[]>([]);
const shopQuery = ref('');
const selectedShops = ref<ShopGrant[]>([]);
const displayedShops = computed(() => shops.value.filter(shop => `${shop.name} ${shop.platform} ${shop.accountName}`.toLowerCase().includes(shopQuery.value.toLowerCase())));
async function showGrants(member: CompanyMember) {
  await run(async () => {
    grantMember.value = member;
    shopQuery.value = '';
    selectedShops.value = [];
    shops.value = await request<ShopGrant[]>(`/members/${member.id}/environments`);
    grantsDialog.value = true;
  });
}
async function grantShops(targets: ShopGrant[], revoke = false) {
  if (!grantMember.value) return;
  await run(async () => {
    try {
      for (const shop of targets) {
        if (revoke) await mallApi.revoke(shop.id, grantMember.value!.id);
        else await mallApi.grant(shop.id, [grantMember.value!.id]);
      }
      ElMessage.success(revoke ? '授权已撤销' : '授权已保存');
    } finally {
      shops.value = await request<ShopGrant[]>(`/members/${grantMember.value!.id}/environments`);
      selectedShops.value = [];
    }
  });
}
</script>

<template>
  <section class="company-page">
    <div class="page-heading">
      <div><h1>成员与部门</h1><p>按部门分配角色，管理成员与店铺访问权限。</p></div>
      <el-button :icon="Refresh" :loading="loading" :disabled="busy" @click="load">刷新</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="load-error">
      <el-button link type="primary" @click="load">重新加载</el-button>
    </el-alert>
    <div v-loading="loading" class="company-workspace">
      <aside class="department-panel">
        <div class="department-heading"><strong>部门</strong><el-button v-if="canManageDepartments" :icon="Plus" text :disabled="busy" aria-label="添加部门" @click="editDepartment()" /></div>
        <button v-if="isCompanyManager" class="department-item" :class="{ active: !departmentId }" @click="departmentId = ''"><span>全部部门</span><span class="department-count">{{ members.length }}</span></button>
        <div v-for="department in availableDepartments" :key="department.id" class="department-row" :class="{ active: departmentId === department.id }">
          <button class="department-item" @click="departmentId = department.id"><span class="department-name">{{ department.name }}<small v-if="department.isDefault">默认</small></span><span class="department-count">{{ department.memberCount }}</span></button>
          <el-dropdown v-if="canManageDepartments" trigger="click" @command="departmentCommand($event, department)">
            <el-button text :icon="MoreFilled" :disabled="busy" :aria-label="`${department.name}的部门操作`" />
            <template #dropdown><el-dropdown-menu><el-dropdown-item command="rename">修改名称</el-dropdown-item><el-dropdown-item command="delete" :disabled="department.isDefault || department.memberCount > 0">删除空部门</el-dropdown-item></el-dropdown-menu></template>
          </el-dropdown>
        </div>
        <p class="sidebar-note">各部门平级管理。默认部门保留；删除部门前需移出其中成员。</p>
      </aside>

      <main class="company-content">
        <el-tabs v-model="activeTab" @tab-change="changeTab">
          <el-tab-pane label="成员" name="members" />
          <el-tab-pane label="角色与权限" name="roles" />
          <el-tab-pane v-if="canCreateMember" label="加入申请" name="applications" />
        </el-tabs>
        <div class="content-toolbar">
          <template v-if="activeTab === 'members'">
            <el-button v-if="canCreateMember" type="primary" :icon="Plus" :disabled="busy" @click="editMember()">添加成员</el-button>
            <el-button v-if="canCreateMember" :disabled="busy" @click="showInvitation">邀请加入</el-button>
            <el-dropdown v-if="canCreateMember" @command="memberStatus(selectedMembers, $event === 'enable')">
              <el-button :disabled="busy || !selectedMembers.length">批量操作<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown><el-dropdown-menu><el-dropdown-item command="enable">启用成员</el-dropdown-item><el-dropdown-item command="disable">停用成员</el-dropdown-item></el-dropdown-menu></template>
            </el-dropdown>
          </template>
          <el-button v-if="activeTab === 'roles' && canCreateRole" type="primary" :icon="Plus" :disabled="busy" @click="editRole()">新增角色</el-button>
          <el-radio-group v-if="activeTab === 'applications'" v-model="applicationStatus" size="small"><el-radio-button value="PENDING">待审核</el-radio-button><el-radio-button value="APPROVED">已通过</el-radio-button><el-radio-button value="REJECTED">已拒绝</el-radio-button></el-radio-group>
          <div class="table-search">
            <el-select v-if="activeTab === 'members'" v-model="roleFilter" clearable placeholder="全部角色" class="role-filter"><el-option v-for="role in roles.filter(item => !departmentId || item.departmentId === departmentId)" :key="role.id" :value="role.id" :label="role.name" /></el-select>
            <el-select v-if="activeTab !== 'applications'" v-model="statusFilter" clearable placeholder="全部状态" class="status-filter"><el-option label="启用" value="true" /><el-option label="停用" value="false" /></el-select>
            <el-input v-model="query" :prefix-icon="Search" :placeholder="activeTab === 'roles' ? '搜索角色名称 / 描述' : '搜索账号 / 姓名 / 电话'" clearable class="query-input" />
          </div>
        </div>

        <el-table v-if="activeTab === 'members'" :data="displayedMembers" row-key="id" empty-text="暂无成员" @selection-change="selectedMembers = $event">
          <el-table-column type="selection" width="44" :selectable="(row: CompanyMember) => canManageMember(row)" />
          <el-table-column label="成员" min-width="170"><template #default="{ row }"><div class="cell-title">{{ row.displayName }}<el-tag v-if="row.id === actor?.id" size="small" type="info">我</el-tag></div><div class="cell-secondary">{{ row.username }}</div></template></el-table-column>
          <el-table-column label="部门" min-width="120"><template #default="{ row }">{{ departmentName(row.departmentId) }}</template></el-table-column>
          <el-table-column label="类型 / 角色" min-width="160"><template #default="{ row }"><div>{{ typeName(row) }}</div><div class="cell-secondary">{{ memberRoleNames(row) }}</div></template></el-table-column>
          <el-table-column prop="phone" label="联系电话" min-width="125" />
          <el-table-column label="状态" width="78"><template #default="{ row }"><el-tag :type="row.enabled ? 'success' : 'info'" size="small">{{ row.enabled ? '启用' : '停用' }}</el-tag></template></el-table-column>
          <el-table-column label="操作" width="235" fixed="right"><template #default="{ row }">
            <el-button v-if="canManageMember(row)" link type="primary" :disabled="busy" @click="editMember(row)">编辑</el-button>
            <el-button v-if="canManageMember(row, 'shop.grant')" link type="primary" :disabled="busy" @click="showGrants(row)">店铺授权</el-button>
            <el-dropdown trigger="click"><el-button link :disabled="busy">更多<el-icon><ArrowDown /></el-icon></el-button><template #dropdown><el-dropdown-menu>
              <el-dropdown-item @click="detail = row">查看详情</el-dropdown-item>
              <template v-if="canManageMember(row)"><el-dropdown-item @click="resetPassword(row)">重置密码</el-dropdown-item><el-dropdown-item @click="memberStatus([row], !row.enabled)">{{ row.enabled ? '停用成员' : '启用成员' }}</el-dropdown-item><el-dropdown-item divided :disabled="row.enabled" @click="prepareDelete(row)">删除成员{{ row.enabled ? '（需先停用）' : '' }}</el-dropdown-item></template>
            </el-dropdown-menu></template></el-dropdown>
          </template></el-table-column>
        </el-table>

        <template v-if="activeTab === 'roles'">
          <p class="scope-note">每个部门预置普通成员、管理员、超级管理员三类角色。类型决定管理范围，勾选权限决定可执行的操作。</p>
          <el-table :data="displayedRoles" row-key="id" empty-text="暂无角色">
            <el-table-column label="角色" min-width="170"><template #default="{ row }"><div class="cell-title">{{ row.name }}<el-tag v-if="row.builtin" size="small" type="info">预置</el-tag></div><div class="cell-secondary">{{ row.description || '—' }}</div></template></el-table-column>
            <el-table-column label="部门" min-width="120"><template #default="{ row }">{{ departmentName(row.departmentId) }}</template></el-table-column>
            <el-table-column label="成员类型" min-width="110"><template #default="{ row }">{{ memberTypes[row.memberType] }}</template></el-table-column>
            <el-table-column label="已绑定" width="80"><template #default="{ row }"><el-tooltip :content="roleMembers(row.id).map(member => member.displayName).join('、') || '暂无成员'"><span>{{ roleMembers(row.id).length }} 人</span></el-tooltip></template></el-table-column>
            <el-table-column label="功能权限" width="90"><template #default="{ row }"><el-tooltip :content="row.permissions.map((permission: string) => permissionLabels[permission] || permission).join('、') || '无功能权限'"><span>{{ row.permissions.length }} 项</span></el-tooltip></template></el-table-column>
            <el-table-column label="状态" width="80"><template #default="{ row }"><el-switch :model-value="row.enabled" :disabled="busy || !canManageRole(row)" @change="roleStatus(row, Boolean($event))" /></template></el-table-column>
            <el-table-column label="操作" width="155" fixed="right"><template #default="{ row }"><template v-if="canManageRole(row)"><el-button link type="primary" :disabled="busy" @click="editRole(row)">编辑</el-button><el-button link type="primary" :disabled="busy" @click="editRole(row, true)">复制</el-button><el-tooltip v-if="!row.builtin" content="请先调整该角色绑定成员的角色" :disabled="!roleMembers(row.id).length"><span><el-button link type="danger" :disabled="busy || roleMembers(row.id).length > 0" @click="deleteRole(row)">删除</el-button></span></el-tooltip></template><span v-else class="cell-secondary">无管理权限</span></template></el-table-column>
          </el-table>
        </template>

        <el-table v-if="activeTab === 'applications'" :data="displayedApplications" row-key="id" empty-text="暂无加入申请">
          <el-table-column label="申请人" min-width="170"><template #default="{ row }"><div>{{ row.displayName }}</div><div class="cell-secondary">{{ row.username }}</div></template></el-table-column>
          <el-table-column label="申请部门" min-width="120"><template #default="{ row }">{{ departmentName(row.departmentId) }}</template></el-table-column>
          <el-table-column prop="phone" label="联系电话" min-width="130" />
          <el-table-column label="申请时间" min-width="170"><template #default="{ row }">{{ formatTime(row.createdAt) }}</template></el-table-column>
          <el-table-column label="结果" min-width="160"><template #default="{ row }"><el-tag :type="row.status === 'APPROVED' ? 'success' : row.status === 'REJECTED' ? 'danger' : 'warning'">{{ row.status === 'APPROVED' ? '已通过' : row.status === 'REJECTED' ? '已拒绝' : '待审核' }}</el-tag><div v-if="row.reason" class="cell-secondary">{{ row.reason }}</div></template></el-table-column>
          <el-table-column label="操作" width="130" fixed="right"><template #default="{ row }"><template v-if="row.status === 'PENDING' && canCreateMember"><el-button link type="primary" :disabled="busy" @click="showReview(row, true)">通过</el-button><el-button link type="danger" :disabled="busy" @click="showReview(row, false)">拒绝</el-button></template></template></el-table-column>
        </el-table>
        <div class="table-pagination"><span class="cell-secondary">{{ activeTab === 'members' ? `已选 ${selectedMembers.length} 人` : '' }}</span><el-pagination v-model:current-page="page" v-model:page-size="pageSize" :page-sizes="[20, 50, 100]" :total="total" layout="total, sizes, prev, pager, next" /></div>
      </main>
    </div>
  </section>

  <el-dialog v-model="departmentDialog" :title="departmentForm.id ? '修改部门名称' : '添加部门'" width="440px" :close-on-click-modal="false">
    <el-form label-position="top" @submit.prevent="saveDepartment"><el-form-item label="部门名称" required><el-input v-model="departmentForm.name" maxlength="100" placeholder="例如：运营一部" :disabled="busy" /></el-form-item></el-form>
    <p v-if="!departmentForm.id" class="form-note">创建后自动生成普通成员、管理员和超级管理员三个预置角色。</p>
    <template #footer><el-button :disabled="busy" @click="departmentDialog = false">取消</el-button><el-button type="primary" :loading="busy" @click="saveDepartment">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="memberDialog" :title="memberForm.id ? '编辑成员' : '添加成员'" width="620px" :close-on-click-modal="false" @closed="memberForm.password = ''">
    <el-form label-width="100px" :disabled="busy">
      <el-form-item label="成员账号" required :error="!memberForm.id && memberForm.username ? usernameError(memberForm.username) : ''"><el-input v-model.trim="memberForm.username" :disabled="Boolean(memberForm.id)" maxlength="80" autocomplete="off" placeholder="3–80 位字母、数字或下划线" /></el-form-item>
      <el-form-item label="姓名" required><el-input v-model="memberForm.displayName" maxlength="120" /></el-form-item>
      <el-form-item label="联系电话"><el-input v-model="memberForm.phone" maxlength="40" /></el-form-item>
      <el-form-item label="所属部门" required><el-select v-model="memberForm.departmentId" :disabled="!isCompanyManager" @change="changeMemberDepartment"><el-option v-for="department in availableDepartments" :key="department.id" :value="department.id" :label="department.name" /></el-select></el-form-item>
      <el-form-item label="角色" required><el-select v-model="memberForm.roleIds" multiple placeholder="选择本部门角色"><el-option v-for="role in memberRoleOptions" :key="role.id" :value="role.id" :disabled="!role.enabled" :label="`${role.name} · ${memberTypes[role.memberType]}${role.enabled ? '' : '（已停用）'}`" /></el-select></el-form-item>
      <el-form-item v-if="!memberForm.id" label="初始密码" required><el-input v-model="memberForm.password" type="password" show-password autocomplete="new-password" placeholder="8–16 位，包含大写、小写字母和数字" /></el-form-item>
      <el-form-item v-if="memberForm.id" label="成员状态"><el-radio-group v-model="memberForm.enabled"><el-radio :value="true">启用</el-radio><el-radio :value="false">停用</el-radio></el-radio-group></el-form-item>
    </el-form>
    <p class="form-note">更换部门后需重新选择该部门角色。只有下级成员可被管理，自己的角色和权限不能在此修改。</p>
    <template #footer><el-button :disabled="busy" @click="memberDialog = false">取消</el-button><el-button type="primary" :loading="busy" @click="saveMember">保存</el-button></template>
  </el-dialog>

  <el-dialog v-model="passwordDialog" title="重置成员密码" width="480px" :close-on-click-modal="false" @closed="newPassword = ''">
    <p>为 {{ passwordMember?.displayName }}（{{ passwordMember?.username }}）设置新密码，保存后该成员的已有登录将失效。</p>
    <el-input v-model="newPassword" type="password" show-password autocomplete="new-password" :disabled="busy" placeholder="8–16 位，包含大写、小写字母和数字" />
    <template #footer><el-button :disabled="busy" @click="passwordDialog = false">取消</el-button><el-button type="primary" :loading="busy" @click="savePassword">重置密码</el-button></template>
  </el-dialog>

  <el-dialog v-model="deleteDialog" title="删除成员" width="520px" :close-on-click-modal="false">
    <el-alert :closable="false" type="warning" show-icon :title="`即将删除 ${deletingMember?.displayName || ''}，该成员将失去登录及授权。`" />
    <p>该成员名下有 {{ departure.environmentCount }} 个店铺、{{ departure.deviceCount }} 台设备或代理。</p>
    <el-form v-if="needsTransfer" label-position="top"><el-form-item label="资源接收人" required><el-select v-model="transferTo" filterable :disabled="busy" placeholder="选择启用中的成员"><el-option v-for="member in transferCandidates" :key="member.id" :value="member.id" :label="`${member.displayName}（${member.username}）`" /></el-select></el-form-item></el-form>
    <p class="form-note">{{ needsTransfer ? '删除前会将以上资源转移给接收人，保留业务数据。' : '没有需要转移的店铺或设备，可直接删除。' }}</p>
    <template #footer><el-button :disabled="busy" @click="deleteDialog = false">取消</el-button><el-button type="danger" :loading="busy" @click="deleteMember">确认删除</el-button></template>
  </el-dialog>

  <el-drawer v-model="roleDialog" :title="roleForm.id ? '编辑角色' : '新增角色'" size="780px" :close-on-click-modal="false">
    <el-form label-position="top" class="role-fields" :disabled="busy">
      <el-form-item label="角色名称" required><el-input v-model="roleForm.name" maxlength="100" /></el-form-item>
      <el-form-item label="所属部门" required><el-select v-model="roleForm.departmentId" :disabled="Boolean(roleForm.id) || !isCompanyManager"><el-option v-for="department in availableDepartments" :key="department.id" :value="department.id" :label="department.name" /></el-select></el-form-item>
      <el-form-item label="成员类型" required><el-select v-model="roleForm.memberType" :disabled="roleForm.builtin"><el-option v-for="type in allowedTypes" :key="type" :value="type" :label="memberTypes[type]" /></el-select></el-form-item>
      <el-form-item label="状态"><el-switch v-model="roleForm.enabled" active-text="启用" inactive-text="停用" /></el-form-item>
      <el-form-item label="角色描述" class="wide"><el-input v-model="roleForm.description" type="textarea" maxlength="200" :rows="2" show-word-limit /></el-form-item>
    </el-form>
    <el-alert :closable="false" type="info" :title="scopeDescriptions[roleForm.memberType]" />
    <div class="permission-heading"><h3>功能权限</h3><span>{{ roleForm.permissions.length }} 项已选</span><el-button link type="primary" :disabled="busy" @click="selectPermissions(nodes, true)">全选</el-button><el-button link :disabled="busy" @click="selectPermissions(nodes, false)">清空</el-button></div>
    <div class="permission-grid"><section v-for="section in roleSections" :key="section.prefix" class="permission-section">
      <el-checkbox :model-value="section.nodes.length > 0 && section.nodes.every(node => roleForm.permissions.includes(node))" :indeterminate="section.nodes.some(node => roleForm.permissions.includes(node)) && !section.nodes.every(node => roleForm.permissions.includes(node))" :disabled="busy || !section.nodes.length" @change="selectPermissions(section.nodes, Boolean($event))">{{ section.label }}</el-checkbox>
      <el-checkbox-group v-model="roleForm.permissions" :disabled="busy"><el-checkbox v-for="node in section.nodes" :key="node" :value="node">{{ permissionLabels[node] || node }}</el-checkbox></el-checkbox-group>
      <p v-if="!section.nodes.length" class="cell-secondary">无可分配权限</p>
    </section></div>
    <template #footer><el-button :disabled="busy" @click="roleDialog = false">取消</el-button><el-button type="primary" :loading="busy" @click="saveRole">保存</el-button></template>
  </el-drawer>

  <el-dialog v-model="invitationDialog" title="邀请成员加入" width="760px" :close-on-click-modal="false" @closed="invitationUrl = ''">
    <p class="form-note">将邀请链接发给成员。对方提交账号信息后，需要管理员审核通过才能登录。</p>
    <div class="invitation-create"><el-select v-model="invitationDepartment" :disabled="busy" placeholder="选择加入部门"><el-option v-for="department in availableDepartments" :key="department.id" :value="department.id" :label="department.name" /></el-select><el-button type="primary" :loading="busy" @click="createInvitation">生成邀请链接</el-button></div>
    <div v-if="invitationUrl" class="invitation-result"><el-input :model-value="invitationUrl" readonly aria-label="邀请链接"><template #append><el-button @click="copyInvitation">复制链接</el-button></template></el-input><p class="form-note">有效期至 {{ formatTime(invitationExpires) }}。请在关闭窗口前复制保存。</p></div>
    <h3>已创建的邀请</h3>
    <el-table :data="displayedInvitations" max-height="280" empty-text="暂无邀请"><el-table-column label="部门"><template #default="{ row }">{{ departmentName(row.departmentId) }}</template></el-table-column><el-table-column label="有效期至" min-width="170"><template #default="{ row }">{{ formatTime(row.expiresAt) }}</template></el-table-column><el-table-column label="状态" width="90"><template #default="{ row }"><el-tag :type="invitationActive(row) ? 'success' : 'info'">{{ invitationActive(row) ? '有效' : row.revoked || row.enabled === false ? '已撤销' : '已过期' }}</el-tag></template></el-table-column><el-table-column label="操作" width="75"><template #default="{ row }"><el-button v-if="invitationActive(row)" link type="danger" :disabled="busy" @click="revokeInvitation(row)">撤销</el-button></template></el-table-column></el-table>
    <template #footer><el-button :disabled="busy" @click="invitationDialog = false">关闭</el-button></template>
  </el-dialog>

  <el-dialog v-model="reviewDialog" :title="reviewForm.approved ? '审核通过' : '拒绝加入申请'" width="540px" :close-on-click-modal="false">
    <p>{{ reviewApplication?.displayName }}（{{ reviewApplication?.username }}）申请加入 {{ departmentName(reviewApplication?.departmentId) }}。</p>
    <el-form label-position="top" :disabled="busy"><el-form-item v-if="reviewForm.approved" label="分配角色" required><el-select v-model="reviewForm.roleIds" multiple placeholder="选择申请部门的角色"><el-option v-for="role in assignableRoles(reviewApplication?.departmentId || '')" :key="role.id" :value="role.id" :label="`${role.name} · ${memberTypes[role.memberType]}`" /></el-select></el-form-item><el-form-item :label="reviewForm.approved ? '审核备注' : '拒绝原因'" :required="!reviewForm.approved"><el-input v-model="reviewForm.reason" type="textarea" :rows="3" maxlength="200" show-word-limit /></el-form-item></el-form>
    <template #footer><el-button :disabled="busy" @click="reviewDialog = false">取消</el-button><el-button :type="reviewForm.approved ? 'primary' : 'danger'" :loading="busy" @click="saveReview">{{ reviewForm.approved ? '确认通过' : '确认拒绝' }}</el-button></template>
  </el-dialog>

  <el-drawer v-model="grantsDialog" :title="`店铺授权 · ${grantMember?.displayName || ''}`" size="800px">
    <div class="content-toolbar"><el-button type="primary" :disabled="busy || !selectedShops.length || !grantMember?.enabled" @click="grantShops(selectedShops)">批量授权</el-button><el-button :disabled="busy || !selectedShops.length" @click="grantShops(selectedShops, true)">撤销授权</el-button><el-input v-model="shopQuery" placeholder="搜索店铺 / 平台 / 账号" clearable /></div>
    <el-table :data="displayedShops" row-key="id" @selection-change="selectedShops = $event"><el-table-column type="selection" width="45" /><el-table-column prop="name" label="店铺名称" /><el-table-column prop="platform" label="平台" /><el-table-column prop="accountName" label="店铺账号" /><el-table-column label="授权状态" width="95"><template #default="{ row }"><el-tag :type="row.granted ? 'success' : 'info'">{{ row.granted ? '已授权' : '未授权' }}</el-tag></template></el-table-column><el-table-column label="操作" width="100"><template #default="{ row }"><el-button link type="primary" :disabled="busy || (!row.granted && !grantMember?.enabled)" @click="grantShops([row], row.granted)">{{ row.granted ? '撤销授权' : '授权' }}</el-button></template></el-table-column></el-table>
  </el-drawer>

  <el-dialog :model-value="Boolean(detail)" title="成员详情" width="560px" @close="detail = undefined">
    <el-descriptions v-if="detail" :column="1" border><el-descriptions-item label="成员账号">{{ detail.username }}</el-descriptions-item><el-descriptions-item label="姓名">{{ detail.displayName }}</el-descriptions-item><el-descriptions-item label="部门">{{ departmentName(detail.departmentId) }}</el-descriptions-item><el-descriptions-item label="成员类型">{{ typeName(detail) }}</el-descriptions-item><el-descriptions-item label="角色">{{ memberRoleNames(detail) }}</el-descriptions-item><el-descriptions-item label="联系电话">{{ detail.phone || '—' }}</el-descriptions-item><el-descriptions-item label="状态">{{ detail.enabled ? '启用' : '停用' }}</el-descriptions-item></el-descriptions>
  </el-dialog>
</template>

<style scoped>
.company-page { min-width: 0; }
.page-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.page-heading h1 { margin: 0 0 7px; font-size: 22px; }
.page-heading p, .form-note, .scope-note, .sidebar-note { color: #788399; font-size: 13px; line-height: 1.7; }
.page-heading p { margin: 0; }
.load-error { margin-bottom: 16px; }
.company-workspace { display: grid; grid-template-columns: 210px minmax(0, 1fr); background: #fff; border: 1px solid #e8edf5; border-radius: 10px; min-height: 560px; overflow: hidden; }
.department-panel { position: static; inset: auto; display: block; width: auto; min-width: 0; padding: 18px 10px; background: #f8faff; border-right: 1px solid #e8edf5; }
.department-heading { padding: 0 6px 14px 10px; display: flex; justify-content: space-between; align-items: center; }
.department-row { display: flex; align-items: center; border-radius: 6px; margin-bottom: 4px; }
.department-row > .el-dropdown { flex: 0 0 28px; }
.department-row > .el-dropdown :deep(.el-button) { padding: 6px; }
.department-item { width: 100%; min-width: 0; display: flex; justify-content: space-between; gap: 8px; align-items: center; padding: 12px 10px; border: 0; border-radius: 6px; background: transparent; text-align: left; color: #526078; cursor: pointer; }
.department-row.active, .department-item.active { background: #eaf0ff; color: #386bff; }
.department-row.active .department-item { color: #386bff; }
.department-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.department-name small { margin-left: 6px; color: #8b96aa; font-size: 10px; }
.department-count { font-size: 12px; color: #8b96aa; }
.sidebar-note { padding: 16px 10px 0; margin-top: 20px; border-top: 1px solid #e8edf5; }
.company-content { min-width: 0; padding: 10px 22px 20px; }
.content-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin: 8px 0 18px; }
.content-toolbar > .el-button + .el-button { margin-left: 0; }
.table-search { display: flex; flex-wrap: wrap; gap: 8px; margin-left: auto; }
.role-filter { width: 145px; }
.status-filter { width: 110px; }
.query-input { width: 230px; }
.cell-title { display: flex; gap: 7px; align-items: center; }
.cell-secondary { color: #8b96aa; font-size: 12px; line-height: 1.7; margin-top: 3px; overflow-wrap: anywhere; }
.scope-note { margin: 0 0 14px; }
.table-pagination { gap: 12px; flex-wrap: wrap; margin-top: 20px; }
.role-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 0 18px; }
.role-fields .wide { grid-column: 1 / -1; }
.permission-heading { display: flex; align-items: center; gap: 12px; margin: 22px 0 12px; }
.permission-heading h3 { margin: 0 auto 0 0; font-size: 16px; }
.permission-heading > span { color: #8b96aa; font-size: 12px; }
.permission-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.permission-section { border: 1px solid #e8edf5; border-radius: 7px; padding: 12px 16px; }
.permission-section > .el-checkbox { font-weight: 600; }
.permission-section :deep(.el-checkbox-group) { display: flex; flex-direction: column; align-items: flex-start; margin-left: 10px; }
.invitation-create { display: flex; gap: 12px; margin: 20px 0; }
.invitation-result { padding: 16px; border: 1px solid #dce7ff; border-radius: 7px; background: #f8faff; margin-bottom: 24px; }
.invitation-result p { margin-bottom: 0; }
@media (max-width: 1200px) {
  .company-workspace { grid-template-columns: 180px minmax(0, 1fr); }
  .company-content { padding: 10px 14px 18px; }
  .table-search { margin-left: 0; width: 100%; }
}
@media (max-width: 760px) {
  .company-workspace { grid-template-columns: minmax(0, 1fr); }
  .department-panel { border-right: 0; border-bottom: 1px solid #e8edf5; max-height: 220px; overflow-y: auto; }
  .sidebar-note { display: none; }
  .permission-grid, .role-fields { grid-template-columns: minmax(0, 1fr); }
}
</style>
