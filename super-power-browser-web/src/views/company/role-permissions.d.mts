import type { PermissionGroup } from '@/api/company/company.api';
export function permissionGroupsForType(groups: PermissionGroup[], memberType: number): PermissionGroup[];
export function normalizePermissions(groups: PermissionGroup[], memberType: number, selected: string[]): string[];
export function changePermissions(groups: PermissionGroup[], memberType: number, current: string[], codes: string[], checked: boolean): string[];
