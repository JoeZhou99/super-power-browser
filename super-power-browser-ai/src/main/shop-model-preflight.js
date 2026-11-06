import { needsDeviceHeader, connectionHeaders } from '../shared/model-connection.js'
/** Only probe the official gateway when a shop must be opened before inference. */
export async function preflightShopModel({ shops, settings, getConnection, fetchImpl = globalThis.fetch, limitMessage = () => '' }) {
  if (!shops.length || !needsDeviceHeader(settings) || !['openai-compatible', 'openai-native'].includes(settings.providerId)) return false
  const connections = await Promise.all(shops.map(shop => getConnection?.(String(shop.id))))
  if (connections.every((connection, index) => connection?.isopen === true && String(connection.browserId) === String(shops[index].id))) return false
  if (!settings.modelId || !settings.apiKey || !settings.baseUrl) throw new Error('请先完成模型配置，再打开店铺。')
  if (!settings.headers?.['X-AI-Device-Id']) throw new Error('AI 设备信息尚未就绪，请重新启动客户端后重试。')
  const responses = settings.apiProtocol === 'responses' || settings.providerId === 'openai-native'
  const body = responses
    ? { model: settings.modelId, input: '仅回复 OK', max_output_tokens: 16, stream: false }
    : { model: settings.modelId, messages: [{ role: 'user', content: '仅回复 OK' }], max_completion_tokens: 16, stream: false }
  const response = await fetchImpl(`${settings.baseUrl.replace(/\/$/, '')}/${responses ? 'responses' : 'chat/completions'}`, {
    method: 'POST', headers: { ...connectionHeaders(settings), 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
    body: JSON.stringify(body), signal: AbortSignal.timeout(20000),
  })
  const text = await response.text()
  const quotaError = limitMessage(text)
  if (quotaError) throw new Error(quotaError)
  let data
  try { data = JSON.parse(text) } catch { throw new Error('模型检查返回异常，未打开店铺，请重试。') }
  if (!response.ok || data.error || !(responses ? data.id && data.object === 'response' : Array.isArray(data.choices))) {
    throw new Error(data.error?.message || `模型检查失败（${response.status}），未打开店铺。`)
  }
  return true
}
