import {defineStore} from 'pinia';
import {request,post,token} from '@/utils/request';
export const usePermissions=defineStore('permissions',{
  state:()=>({user:null as null|{id:string;username:string;owner:boolean;permissions:string[]}}),
  actions:{
    async load(){this.user=await request('/me/permissions');},
    can(permission:string){return this.user?.permissions.includes(permission)||false;},
    async logout(){try{await window.api?.closeAll();await post('/auth/logout');}finally{this.user=null;sessionStorage.removeItem('spb-token');await window.api?.setSession('');window.location.hash='/login';}},
    async syncDesktop(){await window.api?.setSession(token());}
  }
});
