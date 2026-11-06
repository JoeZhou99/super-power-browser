import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve, isAbsolute } from 'node:path'
import { randomUUID, createHash } from 'node:crypto'

export const browserLabels = { auto: '自动选择', msedge: 'Microsoft Edge', chrome: 'Google Chrome' }
const assertSignal = signal => { if (signal?.aborted) throw new Error('任务已停止') }
export function conversationDirectory(workspace, id) {
  if (!workspace || !isAbsolute(workspace)) throw new Error('请先选择工作区')
  if (!id) throw new Error('会话标识无效')
  const text = String(id)
  const safe = /^[\p{L}\p{N}_-][\p{L}\p{N}_.-]{0,120}$/u.test(text) && !/[. ]$/.test(text)
    ? text : `${text.replace(/[^\p{L}\p{N}_-]/gu, '_').slice(0, 70) || 'conversation'}-${createHash('sha256').update(text).digest('hex').slice(0, 12)}`
  return join(workspace, '会话文件', safe)
}

export class OrdinaryBrowserManager {
  constructor({ launch = options => chromium.launch(options), exists = existsSync, env = process.env, platform = process.platform } = {}) {
    this.launch = launch; this.exists = exists; this.env = env; this.platform = platform
    this.sessions = new Map(); this.preference = 'auto'; this.epoch = 0
    this.launching = new Map(); this.versions = new Map()
  }
  async configure({ dataDir, publish } = {}) {
    this.dataDir = dataDir; this.publish = publish
    if (dataDir) {
      try {
        const saved = JSON.parse(await readFile(join(dataDir, 'ordinary-browser.json'), 'utf8'))
        if (Object.hasOwn(browserLabels, saved.preference)) this.preference = saved.preference
        else await this.select('auto')
      } catch {}
    }
  }
  detect() {
    const candidates = []
    const roots = [this.env['PROGRAMFILES(X86)'], this.env.PROGRAMFILES, this.env.LOCALAPPDATA].filter(Boolean)
    const paths = this.platform === 'win32' ? {
      msedge: roots.map(root => join(root, 'Microsoft', 'Edge', 'Application', 'msedge.exe')),
      chrome: roots.map(root => join(root, 'Google', 'Chrome', 'Application', 'chrome.exe')),
    } : this.platform === 'darwin' ? {
      msedge: ['/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge'],
      chrome: ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'],
    } : { msedge: ['/opt/microsoft/msedge/msedge', '/usr/bin/microsoft-edge'], chrome: ['/opt/google/chrome/chrome', '/usr/bin/google-chrome'] }
    for (const [id, choices] of Object.entries(paths)) {
      const executablePath = choices.find(path => this.exists(path))
      if (executablePath) candidates.push({ id, label: browserLabels[id], executablePath })
    }
    return candidates
  }
  status() {
    const available = this.detect()
    const selected = this.preference === 'auto' ? available[0] : available.find(item => item.id === this.preference)
    return { preference: this.preference, available: available.map(({ id, label }) => ({ id, label })), selected: selected?.label || '未找到可用浏览器', state: selected ? 'ready' : 'error', message: selected ? '' : this.missingBrowserMessage() }
  }
  missingBrowserMessage() { return this.preference === 'auto' ? '未检测到 Microsoft Edge 或 Google Chrome，请先安装其中一种浏览器后重新检测。' : '所选浏览器未安装，请先安装，或在应用设置中选择已安装的 Edge 或 Chrome。' }
  async select(preference) {
    if (!Object.hasOwn(browserLabels, preference)) throw new Error('请选择支持的浏览器')
    // Existing sessions deliberately keep their current browser and pages.
    this.preference = preference
    if (this.dataDir) {
      await mkdir(this.dataDir, { recursive: true })
      await writeFile(join(this.dataDir, 'ordinary-browser.json'), JSON.stringify({ preference }))
    }
    return this.status()
  }
  key(workspace, id) { const path = resolve(workspace); return JSON.stringify([this.platform === 'win32' ? path.toLowerCase() : path, String(id)]) }
  async prepare(workspace, id, signal) {
    const key = this.key(workspace, id)
    if (this.sessions.has(key)) return { ready: true, browser: this.sessions.get(key).label }
    const selected = this.preference === 'auto' ? this.detect()[0] : this.detect().find(item => item.id === this.preference)
    if (!selected) throw new Error(this.missingBrowserMessage())
    assertSignal(signal)
    return { ready: true, browser: selected.label }
  }
  async acquire(workspace, id, signal) {
    assertSignal(signal)
    const key = this.key(workspace, id)
    let session = this.sessions.get(key)
    if (session) { await session.pending; assertSignal(signal); return session }
    if (this.launching.has(key)) { await this.launching.get(key); return this.acquire(workspace, id, signal) }
    const operation = this.launchSession(workspace, id, signal)
    this.launching.set(key, operation)
    try { return await operation } finally { if (this.launching.get(key) === operation) this.launching.delete(key) }
  }
  async launchSession(workspace, id, signal) {
    const key = this.key(workspace, id), version = this.versions.get(key)
    const selected = this.preference === 'auto' ? this.detect()[0] : this.detect().find(item => item.id === this.preference)
    if (!selected) throw new Error(this.missingBrowserMessage())
    const epoch = this.epoch
    let browser
    try {
      browser = await this.launch({ executablePath: selected.executablePath, headless: false, timeout: 20000 })
      if (signal?.aborted || epoch !== this.epoch || version !== this.versions.get(key)) throw new Error('任务已停止')
      const context = await browser.newContext({ acceptDownloads: true })
      await context.newPage()
      if (signal?.aborted || epoch !== this.epoch || version !== this.versions.get(key)) throw new Error('任务已停止')
      const session = { browser, context, label: selected.label, token: randomUUID() }
      this.sessions.set(key, session)
      browser.on('disconnected', () => { if (this.sessions.get(key) === session) this.sessions.delete(key) })
      return session
    } catch (error) {
      await browser?.close().catch(() => {})
      if (signal?.aborted || epoch !== this.epoch || version !== this.versions.get(key)) throw new Error('任务已停止')
      throw new Error('普通浏览器启动失败，请检查浏览器或在应用设置中切换。不会自动更换浏览器重复执行。')
    }
  }
  async close(workspace, id) {
    const key = this.key(workspace, id), session = this.sessions.get(key)
    this.versions.set(key, (this.versions.get(key) || 0) + 1)
    this.sessions.delete(key)
    await session?.browser.close().catch(() => {})
  }
  async closeAll() {
    this.epoch++
    const sessions = [...this.sessions.values()]; this.sessions.clear()
    await Promise.all(sessions.map(session => session.browser.close().catch(() => {})))
  }
  dispose() { return this.closeAll() }
}

export const ordinaryBrowsers = new OrdinaryBrowserManager()
