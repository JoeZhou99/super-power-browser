import {usePermissions} from '@/store/modules/permission.store';
export const hasPerm = (permission: string) => usePermissions().can(permission.startsWith('zfclaw.') ? 'ai.use' : permission);
