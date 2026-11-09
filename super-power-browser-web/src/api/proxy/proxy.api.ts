import { request, post, patch, remove, queryString } from '@/utils/request';
import type { ProxyProtocol } from '@/utils/proxyImport';

export interface ProxyRecord {
  id: string; name: string; host: string; port: number; protocol: ProxyProtocol;
  username: string; webType: number; region: string; remark: string; provider: string;
  expiresAt?: string | null; mapIp?: string; boundCount: number; hasChangeIpUrl?: boolean;
  checkConnected?: boolean | null; checkIp?: string; checkCountryName?: string;
  checkLatencyMs?: number | null; checkMessage?: string; checkedAt?: string | null;
}
export interface ProxyInput {
  name: string; host: string; port: number; protocol: ProxyProtocol; username: string;
  password?: string; webType: number; region: string; remark: string; provider: string;
  expiresAt?: string | null; mapIp?: string; changeIpUrl?: string;
}
export interface ProxyCredentials {
  username: string; password: string;
}
export interface ProxyQuery {
  webType?: number; protocol?: string; query?: string; page?: number; size?: number; recycled?: boolean;
}
export const proxyApi = {
  list: (query: ProxyQuery) => request<{items: ProxyRecord[]; total: number}>('/proxies?' + queryString(query as Record<string, unknown>)),
  get: (id: string) => request<ProxyRecord>(`/proxies/${encodeURIComponent(id)}`),
  credentials: (id: string, signal?: AbortSignal) => request<ProxyCredentials>(`/proxies/${encodeURIComponent(id)}/credentials`, {cache: 'no-store', signal}),
  create: (data: ProxyInput) => post('/proxies', data) as Promise<{id: string}>,
  update: (id: string, data: ProxyInput) => patch(`/proxies/${encodeURIComponent(id)}`, data) as Promise<{id: string}>,
  import: (data: ProxyInput[]) => post('/proxies/import', data) as Promise<string[]>,
  remove: (id: string, permanent = false) => remove(`/proxies/${encodeURIComponent(id)}?permanent=${permanent}`),
  restore: (id: string) => post(`/proxies/${encodeURIComponent(id)}/restore`),
  environments: (id: string) => request<any[]>(`/proxies/${encodeURIComponent(id)}/environments`),
};
