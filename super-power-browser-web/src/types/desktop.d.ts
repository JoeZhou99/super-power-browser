interface Window {
  api?:{
    setSession(token:string):Promise<void>;
    openBrowser(id:string):Promise<{status:string}>;
    closeBrowser(id:string):Promise<void>;
    closeAll():Promise<void>;
    browserStates():Promise<Record<string,string>>;
    settings():Promise<{version:string;userData:string;corePath:string;downloads:string;cacheBytes:number}>;
    clearCache():Promise<{removed:number;skipped:string[]}>;
    checkUpdate():Promise<{version:string;available:boolean}>;
    checkProxy(id:string):Promise<{connected:boolean;message:string}>;
  }
}
declare module 'qrcode';
