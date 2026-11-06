export function gatewayBase(url?: string) {
  return String(url || '').trim().replace(/\/+$/, '');
}

export function normalizeModelSource(value: unknown, baseUrl?: string): 'official' | 'own' {
  if (value === 'official' || value === 'own') return value;
  try {
    return new URL(String(baseUrl || '')).pathname.replace(/\/+$/, '') === '/api/ai/gateway/v1' ? 'official' : 'own';
  } catch { return 'own'; }
}
