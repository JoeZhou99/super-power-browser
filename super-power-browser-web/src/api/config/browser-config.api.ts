import {request} from '@/utils/request';

export interface BrowserConfigOption {value:string;label:string}
export interface BrowserConfig {
  revision:number;
  timezones:BrowserConfigOption[];
  languages:BrowserConfigOption[];
  resolutions:BrowserConfigOption[];
  defaults:{timezone:string;language:string;resolution:string};
}

/** Fetch at each edit/import/reset boundary so operational changes take effect without restarting. */
export async function loadBrowserConfig():Promise<BrowserConfig> {
  const config=await request<BrowserConfig>('/browser-config',{cache:'no-store'});
  for(const [list,field] of [['timezones','timezone'],['languages','language'],['resolutions','resolution']] as const){
    const options=config?.[list];
    if(!Array.isArray(options)||!options.length||options.some(option=>!option||typeof option.value!=='string'||!option.value||typeof option.label!=='string'||!option.label)
      ||!options.some(option=>option.value===config.defaults?.[field]))throw new Error('浏览器配置不完整，请联系管理员检查配置后重试');
  }
  return config;
}
