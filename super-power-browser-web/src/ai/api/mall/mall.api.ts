import {request, queryString} from '@/utils/request';
export async function getNewMallList(params: any = {}) {
  const data = await request('/ai/shops?' + queryString({page: params.page || 1, size: params.limit || 20,
    query: params.mall_name || '', platforms: (params.site_info_ids || []).join(',')}));
  return {data: {list: data.items.map((row: any) => ({...row, mall_name: row.name, mall_account: row.accountName, platform_name: row.platform})), total: data.total}};
}
export async function getSiteInfoList(_params?: any) {return {data: {siteList: await request('/ai/shops/platforms')}};}
