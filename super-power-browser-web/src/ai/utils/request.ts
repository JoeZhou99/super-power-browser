import { token } from '@/utils/request';
import { ElMessage } from 'element-plus';

type Options = {url: string; method?: string; params?: object; data?: unknown; headers?: Record<string, string>; silentError?: boolean; signal?: AbortSignal; [key: string]: unknown};
/** Use the SuperPower Browser server with the AI response contract. */
export default async function request<T = any, R = any>(options: Options): Promise<R> {
  const relative = options.url.replace(/^\/?api\/v1\//, '');
  if (!/^(zhifu|model|ai-support)\//.test(relative)) throw new Error('AI 接口不在允许范围内');
  const url = new URL('/api/ai/' + relative, location.origin);
  for (const [key, value] of Object.entries(options.params || {})) {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) value.forEach(item => url.searchParams.append(key, String(item)));
      else url.searchParams.set(key, String(value));
    }
  }
  const multipart = options.data instanceof FormData;
  const headers: Record<string, string> = {Authorization: `Bearer ${token()}`};
  if (!multipart) headers['Content-Type'] = 'application/json';
  try {
    const response = await fetch(url, {method: (options.method || 'GET').toUpperCase(), headers,
      body: options.data === undefined ? undefined : multipart ? options.data as FormData : JSON.stringify(options.data), signal: options.signal});
    const raw = await response.text();
    const result = raw ? JSON.parse(raw) : {errorCode: 0, data: null};
    if (response.status === 401) { sessionStorage.removeItem('spb-token'); location.hash = '/login'; }
    if (!response.ok || result.errorCode) throw new Error(result.message || `请求失败（${response.status}）`);
    return result;
  } catch (error) {
    if (!options.silentError && !(error instanceof DOMException && error.name === 'AbortError')) ElMessage.error(error instanceof Error ? error.message : '请求失败');
    throw error;
  }
}
