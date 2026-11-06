import {defineStore} from 'pinia';
import {usePermissions} from '@/store/modules/permission.store';
import {useAccount} from '@/store/modules/account.store';
export const useUserStore = defineStore('ai-user-adapter', {
  getters: {
    userInfo(): any {
      const auth = usePermissions().user;
      const account = useAccount();
      return auth ? {...account.profile, ...auth, uid: auth.id, level: auth.owner ? 1 : 3} : null;
    },
    customInfo(): any { return {code: 'superpower'}; },
  },
  actions: {async getUserInfo() {await useAccount().load(); return this.userInfo;}},
});
export const useUserStoreHook = useUserStore;
