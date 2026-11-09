import {defineStore} from 'pinia';
import {request} from '@/utils/request';
import {usePermissions} from './permission.store';
export const useAccount=defineStore('account',{
  state:()=>({profile:null as any,balance:null as number|null,shopCount:null as number|null,deviceCount:null as number|null,proxyCount:null as number|null}),
  actions:{
    async load(){
      const permissions=usePermissions();
      const [profile,wallet,shops,devices,proxies]=await Promise.all([
        request('/me/profile'),permissions.can('wallet.view')?request('/wallet'):null,
        permissions.can('shop.view')?request('/environments/statistics'):null,
        permissions.can('device.view')?Promise.all([1,20].map(type=>request(`/devices?type=${type}&size=1`))):null,
        permissions.can('device.view')?request('/proxies?size=1'):null
      ]);
      this.profile=profile;this.balance=wallet?.balanceCents??null;this.shopCount=shops?.all??null;
      this.deviceCount=devices?devices.reduce((n,d)=>n+d.total,0):null;
      this.proxyCount=proxies?.total??null;
    }
  }
});
