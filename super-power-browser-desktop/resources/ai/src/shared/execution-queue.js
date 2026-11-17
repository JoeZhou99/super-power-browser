// Shared by the renderer conversation queue and the host-wide shop queue.
// Reserve capacity and resource keys together so a busy shop cannot block unrelated work.
export class ExecutionQueue {
  constructor() { this.active = new Set(); this.pending = []; this.limit = 2 }
  acquire({ limit = 2, keys = [], signal, onWait = () => {} } = {}) {
    this.limit = Number.isInteger(Number(limit)) && Number(limit) >= 1 && Number(limit) <= 8 ? Number(limit) : 2
    return new Promise((resolve, reject) => {
      const entry = { keys: [...new Set(keys.map(String))], resolve, reject, signal, onWait }
      entry.cancel = () => {
        this.pending = this.pending.filter(item => item !== entry)
        signal?.removeEventListener('abort', entry.cancel)
        reject(new Error('任务已停止'))
        this.drain()
      }
      if (signal?.aborted) return entry.cancel()
      signal?.addEventListener('abort', entry.cancel, { once: true })
      this.pending.push(entry)
      this.drain()
    })
  }
  drain() {
    for (const entry of [...this.pending]) {
      const busy = [...this.active].some(item => item.keys.some(key => entry.keys.includes(key)))
      if (busy || this.active.size >= this.limit) {
        entry.onWait(busy ? '等待其他任务释放店铺' : '等待执行名额')
        continue
      }
      this.pending.splice(this.pending.indexOf(entry), 1)
      entry.signal?.removeEventListener('abort', entry.cancel)
      this.active.add(entry)
      let released = false
      entry.resolve(() => {
        if (released) return
        released = true
        this.active.delete(entry)
        this.drain()
      })
    }
  }
}
