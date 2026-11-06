interface Window {
  api?:{
    runtimePlatform?():Promise<{platform:string;arch:string}>;
    setSession(token:string):Promise<void>;
    onLoggedOut?(callback:()=>void):()=>void;
    openBrowser(id:string):Promise<{status:string}>;
    closeBrowser(id:string):Promise<void>;
    closeAll():Promise<void>;
    browserStates():Promise<Record<string,string>>;
    browserProgress?():Promise<Record<string,{version:string;stage:string;percent:number|null;message:string}>>;
    settings():Promise<{version:string;userData:string;corePath:string;downloads:string;cacheBytes:number}>;
    clearCache():Promise<{removed:number;skipped:string[]}>;
    checkUpdate():Promise<{version:string;available:boolean}>;
    checkProxy(id:string):Promise<{connected:boolean;message:string}>;
  }
}
declare module 'qrcode';
