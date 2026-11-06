import {defineStore} from 'pinia';
export const useAppStore = defineStore('ai-app-adapter', {
  state: () => ({language: 'zh-cn', orderTimer: 0}),
  actions: {
    clearOrderInterval() {window.clearInterval(this.orderTimer); this.orderTimer = 0;},
    setOrderInterval(callback: () => void, delay = 3000) {this.clearOrderInterval(); this.orderTimer = window.setInterval(callback, delay);},
  },
});
export const useAppStoreHook = useAppStore;
