export interface AuthSession {
  token: string;
  user: Record<string, unknown>;
}

export class PublicAuthError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = 'PublicAuthError';
  }
}

/** Public account forms must not inherit or clear an existing signed-in session. */
export async function publicAuth<T>(path: string, options: { body?: unknown; signal?: AbortSignal } = {}): Promise<T> {
  let response: Response;
  try {
    response = await fetch(`/api/auth${path}`, {
      method: options.body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: options.signal,
      cache: 'no-store',
      credentials: 'omit',
    });
  } catch (error) {
    if (options.signal?.aborted) throw error;
    throw new Error('无法连接服务，请检查网络后重试');
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    throw new PublicAuthError(typeof data?.message === 'string' ? data.message : `请求失败（${response.status}），请稍后重试`, response.status);
  }
  if (!data) throw new Error('服务返回异常，请稍后重试');
  return data as T;
}

export function usernameError(value: string): string {
  if (!value.trim()) return '请输入用户名';
  if (value.trim().length < 3 || value.trim().length > 80) return '用户名长度应为 3–80 个字符';
  if (/\s/.test(value.trim())) return '用户名不能包含空格';
  return '';
}

export function passwordError(value: string): string {
  if (!value) return '请输入密码';
  if (value.length < 12) return '密码至少需要 12 个字符';
  if (new TextEncoder().encode(value).length > 72) return '密码过长，请缩短密码（中文等字符会占用更多长度）';
  return '';
}
