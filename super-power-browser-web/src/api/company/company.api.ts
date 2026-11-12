import { patch, post, remove, request } from '@/utils/request';

export interface CompanyActor {
  id: string;
  owner: boolean;
  memberType: number;
  departmentId: string;
  permissions: string[];
}

export interface Department {
  id: string;
  name: string;
  memberCount: number;
  isDefault: boolean;
}

export interface CompanyMember {
  id: string;
  username: string;
  displayName: string;
  phone?: string;
  departmentId: string;
  memberType: number;
  owner: boolean;
  enabled: boolean;
  roles: string[];
  createdAt?: string;
}

export interface CompanyRole {
  id: string;
  name: string;
  description?: string;
  departmentId: string;
  memberType: number;
  enabled: boolean;
  permissions: string[];
  builtin: boolean;
}

export interface PermissionNode {
  code: string;
  label: string;
  minMemberType: number;
  dependencies: string[];
}

export interface PermissionGroup {
  code: string;
  label: string;
  menuPath: string;
  children: PermissionNode[];
}

export interface MemberInvitation {
  id: string;
  departmentId: string;
  expiresAt: string;
  createdAt?: string;
  revoked?: boolean;
  enabled?: boolean;
  token?: string;
}

export type ApplicationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface MemberApplication {
  id: string;
  username: string;
  displayName: string;
  phone?: string;
  departmentId: string;
  status: ApplicationStatus;
  createdAt: string;
  reason?: string;
}

export const companyApi = {
  actor: () => request<CompanyActor>('/me/permissions'),
  departments: () => request<Department[]>('/departments'),
  addDepartment: (name: string) => post('/departments', { name }),
  renameDepartment: (id: string, name: string) => patch(`/departments/${id}`, { name }),
  deleteDepartment: (id: string) => remove(`/departments/${id}`),
  members: () => request<CompanyMember[]>('/members'),
  saveMember: (id: string, body: unknown) => id ? patch(`/members/${id}`, body) : post('/members', body),
  departure: (id: string) => request<{ environmentCount: number; deviceCount: number }>(`/members/${id}/departure`),
  deleteMember: (id: string, transferTo?: string) => request(`/members/${id}`, {
    method: 'DELETE',
    body: JSON.stringify(transferTo ? { transferTo } : {}),
  }),
  roles: () => request<CompanyRole[]>('/roles'),
  permissionNodes: () => request<PermissionGroup[]>('/permission-nodes'),
  saveRole: (id: string, body: unknown) => id ? patch(`/roles/${id}`, body) : post('/roles', body),
  deleteRole: (id: string) => remove(`/roles/${id}`),
  invitations: () => request<MemberInvitation[]>('/member-invitations'),
  invite: (departmentId: string) => post('/member-invitations', { departmentId }) as Promise<MemberInvitation>,
  revokeInvitation: (id: string) => remove(`/member-invitations/${id}`),
  applications: (status: ApplicationStatus) => request<MemberApplication[]>(`/member-applications?status=${status}`),
  review: (id: string, body: { approved: boolean; roleIds?: string[]; reason?: string }) =>
    post(`/member-applications/${id}/review`, body),
};
