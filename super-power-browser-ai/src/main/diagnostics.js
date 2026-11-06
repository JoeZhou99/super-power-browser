import { open, readdir, stat, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { homedir, release } from 'node:os'
import { randomUUID } from 'node:crypto'
import { zipSync, strToU8 } from 'fflate'

const LIMIT = 2 * 1024 * 1024
const secretKey = /^(?:.*(?:password|passwd|secret|token|cookie|authorization|api[-_]?key|credential|private[-_]?key).*)$/i

export function redactDiagnostics(value) {
  if (Array.isArray(value)) return value.map(redactDiagnostics)
  if (value && ['image', 'document', 'file'].includes(value.type)) return { type: value.type, note: '附件内容未收集' }
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, secretKey.test(key) ? '[已隐藏]' : redactDiagnostics(item)]))
  if (typeof value !== 'string') return value
  if (/^\s*[\[{]/.test(value)) {
    try { return JSON.stringify(redactDiagnostics(JSON.parse(value))) } catch { /* Plain log text. */ }
  }
  if (value.length > 1000 && /^[A-Za-z0-9+/=\r\n]+$/.test(value)) return '[二进制内容已省略]'
  return value
    .replace(/data:[^\s"')]+/gi, '[内嵌文件已省略]')
    .replace(/^((?:set-cookie|cookie|authorization)\s*:)\s*.*$/gim, '$1 [已隐藏]')
    .replace(/-----BEGIN [^-]*PRIVATE KEY-----[\s\S]*?-----END [^-]*PRIVATE KEY-----/g, '[私钥已隐藏]')
    .replace(/\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b/g, '[令牌已隐藏]')
    .replace(/((?:api[-_]?key|(?:access|refresh)[-_]?token|token|password|secret|authorization|cookie)["']?\s*[:=]\s*)(["'])(.*?)\2/gi, '$1"[已隐藏]"')
    .replace(/\bBearer\s+[^\s"'<>]+/gi, 'Bearer [已隐藏]')
    .replace(/\bsk-[a-z\d_-]{8,}/gi, '[已隐藏]')
    .replace(/((?:api[-_]?key|access[-_]?token|refresh[-_]?token|token|password|secret|authorization|cookie)["']?\s*[:=]\s*["']?)[^\s"',;}&]+/gi, '$1[已隐藏]')
    .replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[已隐藏]@')
    .replace(/[A-Z\d._%+-]+@[A-Z\d.-]+\.[A-Z]{2,}/gi, '[邮箱已隐藏]')
    .replace(/\b1[3-9]\d{9}\b/g, '[手机号已隐藏]')
    .split(homedir()).join('[用户目录]')
    .split(homedir().replaceAll('\\', '/')).join('[用户目录]')
}

async function boundedText(path, tail = false) {
  const handle = await open(path, 'r')
  try {
    const info = await handle.stat()
    if (!info.isFile()) throw new Error('非普通文件')
    const length = Math.min(info.size, LIMIT)
    const buffer = Buffer.alloc(length)
    await handle.read(buffer, 0, length, tail ? info.size - length : 0)
    return { text: buffer.toString('utf8'), truncated: info.size > LIMIT }
  } finally { await handle.close() }
}

function sanitizedText(text) {
  return text.split('\n').map(line => {
    try { return JSON.stringify(redactDiagnostics(JSON.parse(line))) }
    catch { return redactDiagnostics(line) }
  }).join('\n')
}

export async function exportDiagnostics({ destination, input = {}, taskContext = null, sessionIds = [], userData, sdkData = join(homedir(), '.cline', 'data'), version, now = Date.now() }) {
  const hours = [1, 24, 72].includes(Number(input.hours)) ? Number(input.hours) : 24
  const issueId = `ZF-${new Date(now).toISOString().slice(0, 10).replaceAll('-', '')}-${randomUUID().slice(0, 8)}`
  const files = {}
  const collected = []
  const skipped = []
  const add = (name, value) => { files[name] = strToU8(typeof value === 'string' ? sanitizedText(value) : JSON.stringify(redactDiagnostics(value), null, 2)) }
  const collect = async (path, name, tail = false) => {
    try {
      const result = await boundedText(path, tail)
      if (!tail && result.truncated) { skipped.push({ name, reason: '超过单文件上限，未收集不完整会话' }); return }
      add(name, result.text)
      collected.push({ name, truncated: result.truncated })
    } catch { skipped.push({ name, reason: '文件不存在或不可读取' }) }
  }
  const conversation = input.conversation && {
    title: String(input.conversation.title || '').slice(0, 300),
    messages: (Array.isArray(input.conversation.messages) ? input.conversation.messages : []).slice(-200).map(message => ({ role: message.role, content: String(message.content || '').slice(0, 20000), createdAt: message.createdAt, completedAt: message.completedAt })),
    tools: (Array.isArray(input.conversation.tools) ? input.conversation.tools : []).slice(-100).map(tool => ({ name: tool.name, status: tool.status, messageId: tool.messageId, input: redactDiagnostics(tool.input), output: redactDiagnostics(tool.output), error: redactDiagnostics(tool.error) })),
  }
  add('feedback.json', { description: String(input.description || '').slice(0, 4000), conversationId: String(input.conversationId || '').slice(0, 100), conversation })
  if (taskContext) add('scheduled-task.json', taskContext)
  for (const id of [...new Set(sessionIds)].filter(id => /^[\da-f-]{36}$/i.test(id)).slice(0, 10)) {
    // Only messages: session configuration can contain model credentials.
    await collect(join(sdkData, 'sessions', id, `${id}.messages.json`), `sessions/${id}.messages.json`)
  }
  const since = now - hours * 3600000
  for (const [directory, prefix] of [[join(sdkData, 'logs'), 'agent-logs'], [join(userData, 'logs'), 'client-logs']]) {
    let entries = []
    try { entries = await readdir(directory, { withFileTypes: true }) } catch { skipped.push({ name: prefix, reason: '日志目录不存在或不可读取' }) }
    const candidates = []
    for (const entry of entries) {
      if (!entry.isFile() || !/\.(log|jsonl)$/i.test(entry.name)) continue
      const path = join(directory, entry.name)
      const info = await stat(path).catch(() => null)
      if (info && info.mtimeMs >= since) candidates.push({ path, name: entry.name, time: info.mtimeMs })
    }
    for (const file of candidates.sort((a, b) => b.time - a.time).slice(0, 8)) await collect(file.path, `${prefix}/${file.name}`, true)
  }
  if (input.conversationId && !sessionIds.length) skipped.push({ name: 'sessions', reason: '没有当前运行的 SDK 会话映射，已改用界面保存的所选会话和操作记录' })
  add('manifest.json', { issueId, createdAt: new Date(now).toISOString(), version, platform: process.platform, osRelease: release(), architecture: process.arch, runtime: process.versions, hours, conversationLimit: { messages: 200, messageCharacters: 20000, tools: 100 }, collected, skipped })
  add('说明.txt', `问题编号：${issueId}\n包含：反馈说明、所选会话（如有）、近期修改的日志文件末尾及版本信息。\n范围按日志文件修改时间筛选，并非精确逐行时间过滤；每个日志最多2MB。缺失或过大的记录见 manifest.json。\n不收集配置、工作区文件、附件或浏览器个人资料。不自动上传。\n已自动隐藏常见密钥、令牌、邮箱和手机号；自由文本与业务内容无法保证完全脱敏，发送前请解压检查。\n将本压缩包连同问题截图发送给技术支持。`)
  await writeFile(destination, zipSync(files))
  return { issueId, path: destination, collected: collected.length, skipped: skipped.length }
}
