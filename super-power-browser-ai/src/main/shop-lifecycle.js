import { randomUUID } from 'node:crypto'

// Register before opening browsers, including tasks still waiting for execution.
export class ShopLifecycle {
  constructor({ getConnection, closeBrowser }) {
    this.getConnection = getConnection
    this.closeBrowser = closeBrowser
    this.shops = new Map()
    this.tokens = new Map()
  }

  async begin(id) {
    id = String(id)
    let entry = this.shops.get(id)
    if (entry?.closing) { await entry.closing; return this.begin(id) }
    if (!entry) {
      entry = { id, leases: new Set(), protected: !this.getConnection, blocked: false }
      this.shops.set(id, entry)
      entry.ready = Promise.resolve().then(() => this.getConnection?.(id)).then(connection => {
        // Only a confirmed closed shop can belong to this task. Missing or
        // unknown state must not grant permission to close a user's browser.
        entry.protected ||= connection?.isopen !== false
      }, () => { entry.protected = true })
    }
    const token = randomUUID()
    entry.leases.add(token)
    this.tokens.set(token, entry)
    await entry.ready
    return token
  }

  async finish(token, { success = false, autoClose = false, connection } = {}) {
    const entry = this.tokens.get(token)
    if (!entry) return ''
    this.tokens.delete(token)
    entry.leases.delete(token)
    if (!success) entry.blocked = true
    if (!entry.protected && connection?.ok && connection.reused === false) entry.connection ||= connection
    entry.requested ||= success && autoClose
    if (entry.leases.size) return entry.requested ? '浏览器待其他任务结束后关闭' : ''
    if (!entry.requested || entry.blocked || entry.protected || !entry.connection) {
      this.shops.delete(entry.id)
      return autoClose && success ? '浏览器已保留（原本已打开、连接来源未确认或其他任务未成功）' : ''
    }
    entry.closing = Promise.resolve().then(async () => {
      try {
        if (!this.closeBrowser) throw new Error('客户端尚未提供关闭店铺接口')
        const result = await this.closeBrowser(entry.id, entry.connection)
        if (!result?.closed) throw new Error(result?.reason || '未确认浏览器已关闭')
        return '店铺浏览器已关闭'
      } catch (cause) {
        return `任务已完成，但关闭浏览器失败：${cause.message || String(cause)}`
      } finally {
        this.shops.delete(entry.id)
      }
    })
    return entry.closing
  }
}
