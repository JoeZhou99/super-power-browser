export function normalizeModelSource(value, baseUrl = '') {
  if (value === 'official' || value === 'own') return value
  try {
    return new URL(baseUrl).pathname.replace(/\/+$/, '') === '/api/ai/gateway/v1' ? 'official' : 'own'
  } catch { return 'own' }
}

export function needsDeviceHeader(settings) {
  return !['ollama', 'lmstudio'].includes(settings?.providerId) &&
    normalizeModelSource(settings?.modelSource, settings?.baseUrl) === 'official' &&
    Boolean(String(settings?.baseUrl || '').trim())
}

// Keep device identity out of unrelated model requests and public settings.
export function normalizeRequestHeaders(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const headers = {}
  for (const [name, raw] of Object.entries(value)) {
    const canonical = ['X-AI-Device-Id', 'X-AI-Device-Info'].find(key => key.toLowerCase() === name.toLowerCase())
    if (!canonical || typeof raw !== 'string') continue
    const text = raw.trim()
    if (!text || text.length > (canonical === 'X-AI-Device-Id' ? 128 : 4000) || /[^\x20-\x7e]/.test(text)) continue
    headers[canonical] = text
  }
  return headers
}

export function connectionHeaders(settings) {
  return needsDeviceHeader(settings) ? normalizeRequestHeaders(settings.headers) : {}
}
