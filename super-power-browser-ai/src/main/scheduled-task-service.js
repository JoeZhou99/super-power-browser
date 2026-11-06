import { app } from "electron"
import { randomUUID } from "node:crypto"
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises"
import { dirname, join } from "node:path"
import { normalizeTaskShops } from '../shared/task-shops.js'



export const scheduleChanged = (previous, next) => Boolean(previous) && (
  previous.frequency !== next.frequency ||
  previous.date !== next.date ||
  previous.time !== next.time ||
  JSON.stringify(previous.weekdays || []) !== JSON.stringify(next.weekdays || [])
)

const clockParts = (value) => {
  const match = /^(\d{1,2}):(\d{2})$/.exec(String(value || ""))
  if (!match) return null
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) return null
  return { hours, minutes }
}

const isProcessAlive = (pid) => {
  const value = Number(pid)
  if (!Number.isInteger(value) || value <= 0) return false
  try {
    process.kill(value, 0)
    return true
  } catch (cause) {
    return cause.code === "EPERM"
  }
}

const onceInstant = (task) => {
  const clock = clockParts(task.time || "")
  if (!clock || !task.date) return null
  const at = new Date(`${task.date}T${String(clock.hours).padStart(2, "0")}:${String(clock.minutes).padStart(2, "0")}:00`)
  return Number.isNaN(at.getTime()) ? null : at
}

const assertOnceIsFuture = (task, now) => {
  if (task.frequency !== "once" || task.enabled === false) return
  const at = onceInstant(task)
  if (!at) throw new Error("无效的任务日期")
  if (at.getTime() <= now) throw new Error("仅一次任务的开始时间已过，请选择将来的时间")
}

/** 真实执行时间和保存时写下的锚点，都会挡住不晚于该时刻的时间点。 */
const consumedUntil = (task) => Math.max(Number(task.lastRunAt) || 0, Number(task.scheduleAnchorAt) || 0)

export class ScheduledTaskService {
  constructor(dataDir = "") {
    this.filePath = join(dataDir || app.getPath("userData"), "scheduled-tasks.json")
    this.mutation = Promise.resolve()
  }

  /** 任务文件是整份读写。多个任务同时改状态时必须排队，否则后写入会把先标记为执行中的任务盖回待执行。 */
  enqueue(work) {
    const run = this.mutation.then(() => work(), () => work())
    this.mutation = run.then(() => undefined, () => undefined)
    return run
  }

  /** 同一进程用 enqueue 排队。多开客户端可能共用同一份文件，所以真正改文件时还要抢锁。 */
  async locked(work) {
    return this.withFileLock(work)
  }

  async withFileLock(work) {
    const lockPath = `${this.filePath}.lock`
    await mkdir(dirname(lockPath), { recursive: true })
    const deadline = Date.now() + 10000
    for (;;) {
      try {
        await writeFile(lockPath, String(process.pid), { flag: "wx" })
      } catch (cause) {
        if (cause.code !== "EEXIST") throw cause
        const owner = Number(await readFile(lockPath, "utf8").catch(() => ""))
        if (!isProcessAlive(owner)) {
          await unlink(lockPath).catch(() => {})
          continue
        }
        if (Date.now() > deadline) throw new Error("定时任务文件正在被占用")
        await new Promise((resolve) => setTimeout(resolve, 25))
        continue
      }
      try {
        return await work()
      } finally {
        await unlink(lockPath).catch(() => {})
      }
    }
  }

  async list() {
    try { return JSON.parse(await readFile(this.filePath, "utf8")) } catch { return [] }
  }

  async write(tasks) {
    await mkdir(dirname(this.filePath), { recursive: true })
    const temporary = `${this.filePath}.${process.pid}.tmp`
    await writeFile(temporary, JSON.stringify(tasks, null, 2), "utf8")
    try {
      await rename(temporary, this.filePath)
    } catch (cause) {
      if (!["EEXIST", "EPERM"].includes(cause.code)) throw cause
      await unlink(this.filePath).catch(() => {})
      await rename(temporary, this.filePath)
    }
  }

  async save(input) {
    return this.enqueue(() => this.saveUnlocked(input))
  }

  async saveUnlocked(input) {
    const tasks = await this.list()
    const now = Date.now()
    const existing = tasks.find((item) => item.id === input.id)
    const resetRunState = scheduleChanged(existing, input)
    // 锚点只参与到期判断。不能写入 lastRunAt，否则界面会把尚未执行的任务显示成已失败。
    const anchorRun = !existing || resetRunState
    const task = {
      id: input.id || randomUUID(),
      title: String(input.title || "定时任务").trim(),
      prompt: String(input.prompt || "").trim(),
      workspace: String(input.workspace || "").trim(),
      skillNames: Array.isArray(input.skillNames) ? [...new Set(input.skillNames.map((name) => String(name).trim()).filter(Boolean))] : [],
      shops: normalizeTaskShops(input.shops),
      autoCloseShops: input.autoCloseShops === true,
      pushPlatforms: Array.isArray(input.pushPlatforms) ? [...new Set(input.pushPlatforms.filter((id) => ["feishu", "dingtalk", "wecom", "wechat"].includes(id)))] : [],
      frequency: ["once", "daily", "weekly"].includes(input.frequency) ? input.frequency : "daily",
      date: input.date || new Date().toISOString().slice(0, 10),
      time: input.time || "09:00",
      weekdays: Array.isArray(input.weekdays) ? input.weekdays : [1],
      enabled: input.enabled !== false,
      // 页面靠这两个字段区分任务属于哪个登录账号。丢掉后，换账号再保存就会从列表消失
      accountId: String(input.accountId || existing?.accountId || ""),
      ownerEnabled:
        input.ownerEnabled === undefined
          ? existing?.ownerEnabled
          : Boolean(input.ownerEnabled),
      createdAt: existing?.createdAt || input.createdAt || now,
      updatedAt: now,
      scheduleAnchorAt: anchorRun ? now : existing?.scheduleAnchorAt ?? null,
      lastRunAt: existing?.lastRunAt ?? null,
      lastStatus: existing?.lastStatus || "pending",
      lastResult: existing?.lastResult || "",
      unread: existing?.unread === true,
      runs: Array.isArray(existing?.runs) ? existing.runs.slice(-20) : [],
      runPid: existing?.runPid ?? null,
      runStartedAt: existing?.runStartedAt ?? null,
    }
    if (!task.prompt) throw new Error("请输入任务指令")
    if (!task.workspace) throw new Error("请选择任务工作区")
    // Metadata/history updates do not schedule another execution.
    if (!existing || resetRunState || (!existing.enabled && task.enabled)) assertOnceIsFuture(task, now)
    return this.locked(async () => {
      const latest = await this.list()
      const current = latest.find((item) => item.id === task.id)
      if (current) {
        task.lastRunAt = current.lastRunAt ?? null
        task.lastStatus = current.lastStatus || task.lastStatus
        task.lastResult = current.lastResult || ""
        task.unread = current.unread === true
        task.runs = Array.isArray(current.runs) ? current.runs.slice(-20) : []
        task.runPid = current.runPid ?? null
        task.runStartedAt = current.runStartedAt ?? null
        if (!anchorRun) task.scheduleAnchorAt = current.scheduleAnchorAt ?? null
      }
      const index = latest.findIndex((item) => item.id === task.id)
      if (index >= 0) latest[index] = task
      else latest.unshift(task)
      await this.write(latest)
      return task
    })
  }

  async toggle(id, enabled) {
    return this.enqueue(() => this.toggleUnlocked(id, enabled))
  }

  async toggleUnlocked(id, enabled) {
    const tasks = await this.list()
    const current = tasks.find((item) => item.id === id)
    if (!current) throw new Error("定时任务不存在")
    const now = Date.now()
    const task = { ...current, enabled: Boolean(enabled), updatedAt: now }
    if (task.enabled) {
      assertOnceIsFuture(task, now)
      task.scheduleAnchorAt = now
    }
    return this.locked(async () => {
      const latest = await this.list()
      const index = latest.findIndex((item) => item.id === id)
      if (index < 0) throw new Error("定时任务不存在")
      latest[index] = {
        ...latest[index],
        enabled: task.enabled,
        updatedAt: task.updatedAt,
        scheduleAnchorAt: task.enabled ? task.scheduleAnchorAt : latest[index].scheduleAnchorAt ?? null,
      }
      await this.write(latest)
      return latest[index]
    })
  }

  async remove(id) {
    return this.enqueue(() => this.removeUnlocked(id))
  }

  async removeUnlocked(id) {
    return this.locked(async () => {
      const tasks = await this.list()
      await this.write(tasks.filter((item) => item.id !== id))
      return true
    })
  }

  async get(id) { return (await this.list()).find((item) => item.id === id) }

  async recoverInterrupted() {
    return this.enqueue(() => this.locked(async () => {
      const tasks = await this.list()
      const changed = []
      for (const task of tasks) {
        if (task.lastStatus === "pending" && task.lastRunAt && !task.scheduleAnchorAt) {
          task.scheduleAnchorAt = task.lastRunAt
          const lastReal = [...(task.runs || [])].reverse().find((run) => run?.runAt && run.status && !["pending", "running"].includes(run.status))
          if (lastReal) {
            task.lastRunAt = lastReal.runAt
            task.lastStatus = lastReal.status
            if (lastReal.result) task.lastResult = lastReal.result
          } else {
            task.lastRunAt = null
          }
          changed.push(task)
        }
        if (task.lastStatus !== "running" || isProcessAlive(task.runPid)) continue
        task.lastStatus = "error"
        task.runPid = null
        task.unread = true
        task.lastResult = "任务进程已退出，本次执行中断。"
        task.runs = [...(task.runs || []), {
          runAt: task.lastRunAt || Date.now(),
          startedAt: task.runStartedAt || task.lastRunAt,
          completedAt: Date.now(),
          status: "error",
          result: task.lastResult,
          shops: [],
        }].slice(-20)
        task.runStartedAt = null
        changed.push(task)
      }
      if (changed.length) await this.write(tasks)
      return changed
    }))
  }

  async dueTasks(now = new Date()) {
    const tasks = await this.list()
    return tasks.filter((task) => {
      if (!task.enabled || (task.lastStatus === "running" && isProcessAlive(task.runPid))) return false
      const [hours, minutes] = String(task.time || "").split(":").map(Number)
      if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return false
      const scheduledToday = new Date(now)
      scheduledToday.setHours(hours, minutes, 0, 0)
      const covered = consumedUntil(task)
      if (task.frequency === "once") {
        const at = onceInstant(task)
        if (!at) return false
        return now >= at && covered < at.getTime()
      }
      const days = (Array.isArray(task.weekdays) && task.weekdays.length ? task.weekdays : [1]).map(Number)
      if (task.frequency === "weekly" && !days.includes(now.getDay())) return false
      return now >= scheduledToday && covered < scheduledToday.getTime()
    })
  }

  async markRunning(id) {
    return this.enqueue(() => this.locked(async () => {
      const tasks = await this.list()
      const task = tasks.find((item) => item.id === id)
      if (!task) return false
      if (task.lastStatus === "running" && isProcessAlive(task.runPid)) return false
      task.lastStatus = "running"
      task.lastRunAt = Date.now()
      task.runStartedAt = task.lastRunAt
      task.runPid = process.pid
      await this.write(tasks)
      return true
    }))
  }

  async finish(id, status, result, shops = [], diagnostics = undefined) {
    return this.enqueue(() => this.finishUnlocked(id, status, result, shops, diagnostics))
  }

  async finishUnlocked(id, status, result, shops = [], diagnostics = undefined) {
    return this.locked(async () => {
      const tasks = await this.list()
      const task = tasks.find((item) => item.id === id)
      if (!task) return
      const startedAt = task.runStartedAt || (task.lastStatus === 'running' ? task.lastRunAt : null)
      task.lastRunAt = Date.now()
      task.lastStatus = status
      task.lastResult = String(result || "")
      task.runPid = null
      task.runs = [...(task.runs || []), { runAt: task.lastRunAt, startedAt, completedAt: task.lastRunAt, status, result: task.lastResult, shops, ...(diagnostics ? { diagnostics } : {}) }].slice(-20)
      task.runStartedAt = null
      task.unread = true
      if (task.frequency === "once") task.enabled = false
      await this.write(tasks)
    })
  }

  async markRead(id) {
    return this.enqueue(() => this.markReadUnlocked(id))
  }

  async markReadUnlocked(id) {
    return this.locked(async () => {
      const tasks = await this.list()
      const task = tasks.find((item) => item.id === id)
      if (!task) return false
      task.unread = false
      await this.write(tasks)
      return true
    })
  }
}
