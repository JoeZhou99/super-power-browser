import { taskInWorkspace } from '../shared/task-workspace.js'
import { preflightShopModel } from './shop-model-preflight.js'
import { summarizeShopResults } from './shop-summary.js'
import { app, dialog, ipcMain, Notification, shell } from "electron"
import { ConversationStore } from './conversation-store.js'
import { basename, isAbsolute, extname } from "node:path"
import { stat, readFile, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { validateShopConnection } from './cdp-connection.js'
import { shopExecutionOutcome } from '../shared/tool-outcome.js'
import { isUserStopError, normalizeTaskShops, taskShopContext, executeTaskForShops } from '../shared/task-shops.js'
import { CHANNELS } from "../shared/channels.js"
import { AgentService, deviceLimitMessage } from "./agent-service.js"
import { SettingsStore, normalizeRequestHeaders } from "./settings-store.js"
import { saveSettingsAndSyncChannels } from './settings-channel-sync.js'
import { SkillService } from "./skill-service.js"
import { ScheduledTaskService } from "./scheduled-task-service.js"
import { collapseRepeatedText, mergeStreamText } from "../shared/stream-text.js"
import { ExecutionQueue } from '../shared/execution-queue.js'
import { ShopLifecycle } from './shop-lifecycle.js'
import { toolObject } from './direct-delivery.js'
import { ordinaryBrowsers } from './ordinary-browser.js'
import { previewResultImage } from './result-image.js'
import { exportDiagnostics } from './diagnostics.js'
import { inspectTaskSkills, taskDiagnosticSummary } from './task-preflight.js'

const artifactLines = state => (state.files || []).map(path => `\n\n文件已生成：\`${path}\``).join('')

export async function startTridentHost({
  getWebContents,
  getWindow,
  getBrowserConnection,
  closeShopBrowser,
  isShopBrowserOpen,
  dataDir = "",
  conversationDir = dataDir,
  authorize = async () => {},
  authorizeTask = async () => {},
  prepareModelSettings = settings => settings,
} = {}) {
  const settingsStore = new SettingsStore(dataDir, { prepareModelSettings })
  const conversationStore = new ConversationStore(conversationDir || app.getPath('userData'))
  const skillService = new SkillService(dataDir)
  const scheduledTaskService = new ScheduledTaskService(dataDir)
  let agentService
  let feishuService
  let dingTalkService
  let weComService
  let cancelChannelStartup = () => {}
  let wechatService
  let schedulerTimer
  let disposed = false
  const backgroundRunners = new Set()
  const handlers = new Set()
  const handle = (channel, fn) => {
    handlers.add(channel)
    ipcMain.handle(channel, async (event, ...args) => {
      if (disposed) throw new Error("AI 服务已停止")
      const authorized = await authorize(event, channel, args)
      if (disposed) throw new Error("登录账号已变化")
      return fn(event, ...(authorized || args))
    })
  }
  const pendingShopRequests = new Map()
  const chatShopRuns = new Map()
  const conversationJobs = new Map()
  const conversationQueue = new ExecutionQueue()
  const shopLifecycle = new ShopLifecycle({
    getConnection: isShopBrowserOpen ? async id => ({ isopen: await isShopBrowserOpen(id) }) : getBrowserConnection,
    closeBrowser: closeShopBrowser,
  })

  async function runChatShops(input, settings) {
    if (chatShopRuns.has(input.conversationId)) throw new Error('该会话已有店铺任务执行中')
    const shops = normalizeTaskShops(input.shops)
    const batch = { stopped: false, runners: new Set(), runId: input.runId, deviceLimitError: '' }
    const authorization = { session: agentService.conversationPermissionSet(input.conversationId), task: batch, services: new Set() }
    chatShopRuns.set(input.conversationId, batch)
    const states = shops.map(shop => ({ shop, output: '', status: '等待执行', files: [] }))
    const publish = () => {
      if (batch.stopped) return
      send(CHANNELS.agentEvent, {
        kind: 'shop-progress', conversationId: input.conversationId,
        shops: states.map(state => ({ id: state.shop.id, name: state.shop.name, status: state.status })),
        content: states.map(state => `## 店铺：${state.shop.name}（ID：${state.shop.id}）\n\n状态：${state.status}\n\n${state.output}${artifactLines(state)}`).join('\n\n'),
      })
    }
    try {
      const result = await executeTaskForShops(shops, async shop => {
        if (batch.stopped) throw new Error('任务已停止')
        if (batch.deviceLimitError) throw new Error(batch.deviceLimitError)
        const state = states.find(item => item.shop.id === shop.id)
        state.status = '正在连接'
        publish()
        let sessionId
        let executionError
        const toolEvents = []
        const runner = new AgentService((channel, payload) => {
          if (payload.sessionId) sessionId = payload.sessionId
          if (batch.stopped) return
          if (channel === CHANNELS.agentEvent) {
            if (payload.kind === 'approvals-cleared') {
              send(channel, { ...payload, conversationId: input.conversationId })
              return
            }
            if (payload.kind === 'waiting' || payload.kind === 'executing') {
              state.status = payload.kind === 'waiting' ? payload.message : '正在执行'
              publish()
            } else if (payload.kind === 'text-final') {
              state.output = payload.text
              publish()
            } else if (payload.kind === 'chunk' && payload.stream === 'agent') {
              state.output = mergeStreamText(state.output, payload.text)
              publish()
            } else if (payload.kind === 'error') {
              executionError = payload.message
              if (deviceLimitMessage(payload.message) && !batch.deviceLimitError) {
                batch.deviceLimitError = payload.message
                send(channel, { ...payload, conversationId: input.conversationId })
              }
            } else if (payload.kind === 'tool-start' || payload.kind === 'tool-end') {
              const file = payload.kind === 'tool-end' && payload.toolName === 'browser_export_excel' ? toolObject(payload.output) : null
              if (file?.ok && file.result?.verified && file.result.path) state.files.push(file.result.path)
              toolEvents.push(payload)
              state.status = '正在操作页面'
              send(channel, { ...payload, conversationId: input.conversationId, toolCallId: `${shop.id}:${payload.toolCallId}` })
              publish()
            }
          } else send(channel, { ...payload, conversationId: input.conversationId, shopName: shop.name })
        }, skillService, { authorization })
        const entry = { runner, getSessionId: () => sessionId }
        batch.runners.add(entry)
        try {
          const context = taskShopContext([shop], input.shopResults || [])
          const connection = input.shopResults.find(item => String(item.mallId) === shop.id)
          const check = await validateShopConnection(connection)
          if (!check.ok) throw new Error(`CDP 连接失效：${check.error}`)
          state.status = '正在执行'
          publish()
          const runResult = await runner.run({
            ...input, conversationId: `${input.conversationId}:shop:${shop.id}:${randomUUID()}`,
            shops: [shop], shopResults: [connection],
            prompt: `${context}\n\n本次仅执行当前店铺的完整任务，其他店铺由项目调度。跨店铺汇总由项目在全部店铺结束后统一生成，本任务只采集并导出当前店铺实际数据，不要求用户另行提供其他店铺文件，不声称已完成跨店铺汇总。当前店铺只导出必要的原始数据文件供项目合并，不另外生成“单店汇总表”。最终回复展示本店执行过程、实际数据和异常，不罗列中间 Excel 文件链接；项目统一交付所有店铺总表。各店铺临时文件使用独立名称，不覆盖其他店铺文件。\n\n${input.shopPrompt || input.prompt}`,
            settings,
          })
          if (runResult?.status === "cancelled" || batch.stopped || isUserStopError(executionError)) {
            state.status = "已停止"
            state.output = collapseRepeatedText(state.output) || "任务已停止。"
            return { status: "cancelled", output: state.output, error: "" }
          }
          if (runResult?.stopped) throw new Error(executionError || "任务已中断")
          if (executionError) throw new Error(executionError)
          state.output = collapseRepeatedText(state.output)
          const outcome = shopExecutionOutcome(toolEvents, shop.id)
          state.status = outcome.status === 'success' ? '已完成' : outcome.status === 'error' ? '失败' : '未确认'
          if (outcome.error) state.output += `\n\n${outcome.error}`
          const closeMessage = await shopLifecycle.finish(input.shopUsageTokens?.[shop.id], {
            success: outcome.status === 'success', autoClose: input.autoCloseShops === true, connection,
          })
          if (closeMessage) state.output += `\n\n${closeMessage}`
          return { ...outcome, output: state.output }
        } catch (cause) {
          if (isUserStopError(cause) || batch.stopped) {
            state.status = "已停止"
            state.output = collapseRepeatedText(state.output) || "任务已停止。"
            return { status: "cancelled", output: state.output, error: "" }
          }
          if (deviceLimitMessage(cause) && !batch.deviceLimitError) {
            batch.deviceLimitError = deviceLimitMessage(cause)
            send(CHANNELS.agentEvent, { kind: 'error', conversationId: input.conversationId, message: batch.deviceLimitError })
          }
          state.output = `执行失败：${cause.message || String(cause)}`
          state.status = '失败'
          throw cause
        } finally {
          await shopLifecycle.finish(input.shopUsageTokens?.[shop.id])
          batch.runners.delete(entry)
          publish()
          await runner.dispose()
          backgroundRunners.delete(runner)
        }
      }, settings.shopConcurrency)
      if (batch.deviceLimitError) {
        result.status = 'error'
        result.error = batch.deviceLimitError
      }
      if (!batch.stopped && !batch.deviceLimitError && result.status !== 'cancelled') {
        send(CHANNELS.agentEvent, { kind: 'waiting', conversationId: input.conversationId, message: '正在合并本轮所有店铺数据…' })
        try {
          const summary = await summarizeShopResults(input.workspace || settings.workspace, input.conversationId, states)
          if (!batch.stopped) {
            const toolCallId = 'shop-summary:' + randomUUID()
            send(CHANNELS.agentEvent, { kind: 'tool-start', conversationId: input.conversationId, toolCallId, toolName: 'export_shop_summary', input: { shopIds: shops.map(shop => shop.id) } })
            send(CHANNELS.agentEvent, { kind: 'tool-end', conversationId: input.conversationId, toolCallId, toolName: 'export_shop_summary', output: { ok: true, result: summary } })
            result.output += '\n\n## 所有店铺操作汇总\n\n已汇总本轮 ' + summary.shopCount + ' 家店铺，共 ' + summary.rowCount + ' 行，含店铺来源、执行状态和来源文件。' + (summary.warnings.length ? '\n\n' + summary.warnings.join('\n') : '')
            if (summary.warnings.length && result.status === 'success') result.status = 'partial'
          }
        } catch (cause) {
          if (!batch.stopped) {
            result.output = '跨店铺汇总失败：' + cause.message + '。各店铺原始结果和文件已保留。\n\n' + result.output
            if (result.status === 'success') result.status = 'partial'
          }
        }
      }
      if (!batch.stopped) send(CHANNELS.agentEvent, { kind: 'ended', status: result.status, conversationId: input.conversationId })
      return { ...result, stopped: batch.stopped }
    } finally {
      chatShopRuns.delete(input.conversationId)
    }
  }

  function openTaskShops(shops) {
    const contents = getWebContents?.()
    if (!contents || contents.isDestroyed()) throw new Error('此任务关联了店铺，请保持客户端页面运行，以调用页面的店铺打开方法。')
    return new Promise((resolve, reject) => {
      const requestId = randomUUID()
      const timer = setTimeout(() => {
        pendingShopRequests.delete(requestId)
        reject(new Error('等待店铺连接信息超时，请检查客户端和店铺打开接口。'))
      }, 130000)
      pendingShopRequests.set(requestId, { resolve, reject, timer, senderId: contents.id })
      contents.send(CHANNELS.openScheduledShops, { requestId, shops })
    })
  }

  const send = (channel, payload) => {
    if (disposed) return
    const batch = chatShopRuns.get(payload.conversationId)
    if (batch) payload = { ...payload, runId: batch.runId }
    const contents = getWebContents?.()
    if (contents && !contents.isDestroyed()) contents.send(channel, payload)
  }

  const parentWindow = () => {
    const win = getWindow?.()
    if (win && !win.isDestroyed()) return win
    return undefined
  }

  const activeScheduledRuns = new Set()

  async function runScheduledTask(id, force = false) {
    if (disposed || activeScheduledRuns.has(id)) return
    await authorizeTask()
    activeScheduledRuns.add(id)
    try {
    const repaired = await scheduledTaskService.recoverInterrupted().catch(() => [])
    for (const item of Array.isArray(repaired) ? repaired : []) send(CHANNELS.scheduledTaskUpdated, item)
    const task = await scheduledTaskService.get(id)
    if (!task || (!task.enabled && !force)) return
    if (!taskInWorkspace(task, (await settingsStore.getPrivate()).workspace)) return
    if (!force) {
      const due = await scheduledTaskService.dueTasks()
      if (!due.some((item) => item.id === id)) return
    }
    if (!await scheduledTaskService.markRunning(id)) return
    const runningTask = await scheduledTaskService.get(id)
    Object.assign(task, runningTask)
    send(CHANNELS.scheduledTaskUpdated, runningTask)
    let output = ""
    const diagnostics = { workspace: task.workspace, skillNames: task.skillNames || [], sessionIds: [], stage: 'preflight', artifacts: [] }
    try {
      const shops = normalizeTaskShops(task.shops)
      const { selectedSkills, ...preflight } = await inspectTaskSkills(task, skillService)
      diagnostics.preflight = preflight
      if (preflight.error) throw new Error(preflight.error)
      diagnostics.stage = 'execution'
      const skillMentions = selectedSkills.map(skill => `#${skill.name}`).join(' ')
      const skillInstructions = selectedSkills.length
        ? `\n\n已选择技能，请直接按以下路径使用，不要在工作区重新搜索同名脚本：\n${selectedSkills.map((skill) => `- ${skill.name}: 读取 ${skill.file || `${skill.path}\\SKILL.md`}；技能目录为 ${skill.path}`).join("\n")}`
        : ""
      const settings = await settingsStore.getPrivate()
      await preflightShopModel({ shops, settings, getConnection: getBrowserConnection, limitMessage: deviceLimitMessage })
      const states = shops.map(shop => ({ shop, status: '等待执行', output: '', files: [] }))
      const publish = () => send(CHANNELS.scheduledTaskUpdated, {
        ...task, lastStatus: 'running', lastRunAt: task.lastRunAt,
        progress: states.map(state => `## 店铺：${state.shop.name}（ID：${state.shop.id}）\n\n状态：${state.status}\n\n${state.output}${artifactLines(state)}`).join('\n\n'),
      })
      const execution = await executeTaskForShops(shops, async (shop) => {
        const usageToken = shop ? await shopLifecycle.begin(shop.id) : null
        let shopOutput = ''
        let executionError = ''
        const toolEvents = []
        const state = states.find(item => item.shop.id === shop?.id)
        if (state) { state.status = '正在连接'; publish() }
        const runner = new AgentService((channel, payload) => {
          if (payload.sessionId && !diagnostics.sessionIds.includes(payload.sessionId)) diagnostics.sessionIds.push(payload.sessionId)
          if (channel !== CHANNELS.agentEvent) return
          if (payload.kind === 'waiting' && state) state.status = payload.message
          if (payload.kind === 'executing' && state) state.status = '正在执行'
          if (payload.kind === 'error') executionError = payload.message
          if (payload.kind === 'tool-end') {
            toolEvents.push(payload)
            if (['browser_export_excel', 'browser_screenshot', 'browser_result'].includes(payload.toolName) && !payload.error) diagnostics.artifacts.push({ id: (shop?.id || 'general') + ':' + payload.toolCallId, name: payload.toolName, status: 'done', input: {}, output: payload.output })
          }
          if (state && payload.kind === 'tool-end' && payload.toolName === 'browser_export_excel') {
            const file = toolObject(payload.output)
            if (file?.ok && file.result?.verified && file.result.path) state.files.push(file.result.path)
          }
          if (payload.kind === 'tool-start' && state) state.status = '正在操作页面'
          if (payload.kind === "chunk" && payload.stream === "agent") {
            shopOutput = mergeStreamText(shopOutput, payload.text)
            if (state) state.output = shopOutput
          }
          if (payload.kind === 'text-final') {
            shopOutput = payload.text
            if (state) state.output = shopOutput
          }
          if (state) publish()
        }, skillService, { unattended: true })
        backgroundRunners.add(runner)
        try {
        if (disposed) throw new Error("任务已停止")
        await authorizeTask()
        if (!taskInWorkspace(task, (await settingsStore.getPrivate()).workspace)) throw new Error("当前工作区已切换，停止启动此工作区的后续任务")
        const shopResults = shop ? await openTaskShops([shop]) : []
        const shopContext = shop ? taskShopContext([shop], shopResults) : ''
        if (state) { state.status = '正在执行'; publish() }
        await runner.run({
          conversationId: `scheduled-${task.id}-${shop?.id || 'general'}-${randomUUID()}`,
          prompt: [skillMentions, shopContext, shop ? '本次只执行当前店铺的完整任务并返回实际结果，其他店铺由项目分别调度。只导出必要原始数据，不生成额外单店汇总表；各店铺结果和截图分别展示，项目在所有店铺结束后统一生成总表。' : '', task.prompt].filter(Boolean).join("\n\n") + skillInstructions,
          skillNames: selectedSkills.map(skill => skill.name),
          workspace: task.workspace,
          shops: shop ? [shop] : [], shopResults,
          mode: "yolo",
          settings,
        })
        if (executionError) throw new Error(executionError)
        const outcome = shop ? shopExecutionOutcome(toolEvents, shop.id) : { status: 'success', error: '' }
        if (state) {
          state.status = outcome.status === 'success' ? '已完成' : outcome.status === 'error' ? '失败' : '未确认'
          state.output = collapseRepeatedText(shopOutput) + (outcome.error ? `\n\n${outcome.error}` : '')
          publish()
        }
        const closeMessage = await shopLifecycle.finish(usageToken, {
          success: outcome.status === 'success', autoClose: task.autoCloseShops === true, connection: shopResults[0],
        })
        if (closeMessage) {
          shopOutput += `\n\n${closeMessage}`
          if (state) { state.output = collapseRepeatedText(shopOutput); publish() }
        }
        return shop ? { ...outcome, output: collapseRepeatedText(shopOutput) } : collapseRepeatedText(shopOutput)
        } catch (cause) {
          if (isUserStopError(cause)) {
            const stoppedOutput = collapseRepeatedText(shopOutput) || "任务已停止。"
            if (state) { state.status = '已停止'; state.output = stoppedOutput; publish() }
            return { status: 'cancelled', output: stoppedOutput, error: '' }
          }
          if (state) { state.status = '失败'; state.output = cause.message || String(cause); publish() }
          throw cause
        } finally {
          await shopLifecycle.finish(usageToken)
          for (const sessionId of runner.sessions?.values() || []) {
            if (!diagnostics.sessionIds.includes(sessionId)) diagnostics.sessionIds.push(sessionId)
          }
          await runner.dispose()
          backgroundRunners.delete(runner)
        }
      }, settings.shopConcurrency)
      output = execution.output
      if (shops.length > 1 && execution.status !== 'cancelled') {
        diagnostics.stage = 'aggregation'
        try {
          const summary = await summarizeShopResults(task.workspace, 'scheduled-' + task.id, states)
          diagnostics.artifacts.push({ id: 'summary:' + randomUUID(), name: 'export_shop_summary', status: 'done', input: {}, output: { ok: true, result: summary } })
          output += '\n\n## 所有店铺操作汇总\n\n已汇总本轮 ' + summary.shopCount + ' 家店铺，共 ' + summary.rowCount + ' 行，含店铺来源、执行状态和来源文件。'
          if (summary.warnings.length) {
            output += '\n\n' + summary.warnings.join('\n')
            if (execution.status === 'success') execution.status = 'partial'
          }
        } catch (error) {
          output += '\n\n跨店铺汇总失败：' + error.message + '。各店铺原始结果和文件已保留。'
          if (execution.status === 'success') execution.status = 'partial'
        }
      }
      diagnostics.stage = 'complete'
      await scheduledTaskService.finish(id, execution.status, output, states.map(state => ({ id: state.shop.id, name: state.shop.name, status: state.status })), diagnostics)
      const summary = output.replace(/\s+/g, " ").trim().slice(0, 100)
      const taskStatusLabel = execution.status === "success" ? "已完成" : execution.status === "partial" ? "部分失败" : execution.status === "unverified" ? "结果未确认" : execution.status === "cancelled" ? "已停止" : "执行失败"
      const notification = new Notification({ title: `${task.title} ${taskStatusLabel}`, body: summary || "任务已执行" })
      notification.on("click", () => {
        const win = parentWindow()
        if (!win) return
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
        send(CHANNELS.openScheduledTaskResult, { id: task.id })
      })
      notification.show()
    } catch (cause) {
      await scheduledTaskService.finish(id, "error", cause.message || String(cause), [], diagnostics)
      const notification = new Notification({ title: `${task.title} 执行失败`, body: cause.message || String(cause) })
      notification.on("click", () => {
        const win = parentWindow()
        if (!win) return
        if (win.isMinimized()) win.restore()
        win.show()
        win.focus()
        send(CHANNELS.openScheduledTaskResult, { id: task.id })
      })
      notification.show()
    } finally {
      send(CHANNELS.scheduledTaskUpdated, await scheduledTaskService.get(id))
    }
    } finally {
      activeScheduledRuns.delete(id)
    }
  }

  function registerIpc() {
    handle(CHANNELS.previewResultImage, async (_event, path) => previewResultImage(path, (await settingsStore.getPrivate()).workspace))
    handle(CHANNELS.ordinaryBrowserGet, () => ordinaryBrowsers.status())
    handle(CHANNELS.ordinaryBrowserSelect, (_event, preference) => ordinaryBrowsers.select(preference))
    handle(CHANNELS.closeConversationBrowser, (_event, input) => agentService.closeConversation(input.workspace, input.conversationId))
    handle(CHANNELS.openResultFile, async (_event, value) => {
      if (typeof value !== 'string' || !isAbsolute(value) || !['.xlsx', '.xls', '.csv', '.pdf', '.docx', '.txt', '.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(extname(value).toLowerCase())) throw new Error('不支持的结果文件')
      if (!(await stat(value)).isFile()) throw new Error('结果文件不存在')
      const error = await shell.openPath(value)
      if (error) throw new Error(error)
      return true
    })
    handle(CHANNELS.revealResultFile, async (_event, value) => {
      if (typeof value !== 'string' || !isAbsolute(value)) throw new Error('不支持的结果文件')
      if (!(await stat(value)).isFile()) throw new Error('结果文件不存在')
      shell.showItemInFolder(value)
      return true
    })
    handle(CHANNELS.openExternal, async (_event, value) => {
      const url = new URL(value)
      if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅支持打开网页链接')
      await shell.openExternal(url.href)
      return true
    })
    handle(CHANNELS.validateShopConnection, (_event, connection) => validateShopConnection(connection))
    handle(CHANNELS.getBrowserConnection, async (_event, browserId) => {
      if (typeof getBrowserConnection !== 'function') return null
      const id = String(browserId ?? '').trim()
      if (!id) return null
      const data = await getBrowserConnection(id)
      if (!data || String(data.browserId) !== id) return null
      // Forward only connection fields, never the host object or account data.
      return {
        browserId: id, isopen: data.isopen === true,
        browserInstanceId: data.browserInstanceId || '',
        WebDriverPort: data.WebDriverPort || 0,
        KernalNumber: data.KernalNumber || 0,
        cdpUrl: data.cdpUrl || '',
      }
    })
    handle(CHANNELS.scheduledShopsResult, (event, input) => {
      const pending = pendingShopRequests.get(input?.requestId)
      if (!pending || pending.senderId !== event.sender.id) return false
      clearTimeout(pending.timer)
      pendingShopRequests.delete(input.requestId)
      if (input.error) pending.reject(new Error(String(input.error)))
      else pending.resolve(Array.isArray(input.results) ? input.results : [])
      return true
    })
    handle(CHANNELS.exportDiagnostics, async (_event, input = {}) => {
      if (JSON.stringify(input).length > 2 * 1024 * 1024) throw new Error('会话内容过大，请缩小反馈范围后重试。')
      const result = await dialog.showSaveDialog(parentWindow(), {
        title: '保存问题诊断包',
        defaultPath: `SuperPower-AI-diagnostics-${Date.now()}.zip`,
        filters: [{ name: '诊断压缩包', extensions: ['zip'] }],
      })
      if (result.canceled || !result.filePath) return null
      const sessionId = agentService?.sessions.get(input.conversationId)
      try {
        const settings = await settingsStore.getPrivate()
        const task = input.scheduledTaskId ? await scheduledTaskService.get(String(input.scheduledTaskId)) : null
        let taskContext = { currentWorkspace: settings.workspace || '', task: null }
        if (task) {
          const { selectedSkills: _selected, ...preflight } = await inspectTaskSkills(task, skillService)
          taskContext.task = taskDiagnosticSummary(task, preflight)
        }
        const sessionIds = [...(sessionId ? [sessionId] : []), ...(task?.runs || []).slice(-3).flatMap(run => run.diagnostics?.sessionIds || [])]
        return await exportDiagnostics({ destination: result.filePath, input, taskContext, sessionIds, userData: app.getPath('userData'), version: app.getVersion() })
      } catch {
        throw new Error('无法保存诊断包，请检查保存位置的写入权限及磁盘空间后重试。')
      }
    })
    handle(CHANNELS.bootstrap, async () => ({
      settings: await settingsStore.getPublic(),
      platform: process.platform,
      imStatus: {
        feishu: feishuService?.getStatus(),
        dingtalk: dingTalkService?.getStatus(),
        wecom: weComService?.getStatus(),
        wechat: wechatService?.getStatus(),
      },
    }))
    handle(CHANNELS.selectWorkspace, async () => {
      const win = parentWindow()
      if (win) {
        win.show()
        win.focus()
        win.webContents.focus()
      }
      const result = await dialog.showOpenDialog(win, {
        title: "选择 Agent 工作区",
        properties: ["openDirectory", "createDirectory"],
      })
      if (win) win.focus()
      return result.canceled ? null : result.filePaths[0]
    })
    handle(CHANNELS.selectFiles, async () => {
      const result = await dialog.showOpenDialog(parentWindow(), {
        title: "添加文件到消息",
        properties: ["openFile", "multiSelections"],
      })
      if (result.canceled) return []
      const files = []
      for (const path of result.filePaths) {
        const info = await stat(path)
        files.push({ path, name: basename(path), size: info.size })
      }
      return files
    })
    handle(CHANNELS.saveSettings, async (_event, input) => {
      const previous = await settingsStore.getPrivate()
      if (input.workspace !== undefined && previous.workspace && previous.workspace !== input.workspace) await ordinaryBrowsers.closeAll()
      const saved = await saveSettingsAndSyncChannels(settingsStore, () => settingsStore.save(input), {
        feishu: feishuService, dingtalk: dingTalkService, wecom: weComService, wechat: wechatService,
      })
      return saved
    })
    handle(CHANNELS.setWorkspace, async (_event, workspace) => {
      const previous = await settingsStore.getPrivate()
      if (previous.workspace && previous.workspace !== workspace) await ordinaryBrowsers.closeAll()
      return settingsStore.setWorkspace(workspace)
    })
    handle(CHANNELS.testConnection, async (_event, input) => {
      const saved = await settingsStore.getPrivate()
      const settings = await prepareModelSettings({
        ...saved,
        ...input,
        apiKey: String(input.apiKey || saved.apiKey || "").trim(),
        baseUrl: String(input.baseUrl || saved.baseUrl || "").trim().replace(/\/$/, ""),
      })
      if (!settings.apiKey && !["ollama", "lmstudio"].includes(settings.providerId)) {
        return { ok: false, message: "尚未配置 API Key" }
      }

      let url
      let headers = { Accept: "application/json" }
      if (settings.providerId === "anthropic") {
        url = "https://api.anthropic.com/v1/models"
        headers = { ...headers, "x-api-key": settings.apiKey, "anthropic-version": "2023-06-01" }
      } else if (settings.providerId === "gemini") {
        url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(settings.apiKey)}`
      } else if (["ollama", "lmstudio"].includes(settings.providerId)) {
        const baseUrl = settings.baseUrl || (settings.providerId === "ollama" ? "http://127.0.0.1:11434" : "http://127.0.0.1:1234/v1")
        url = settings.providerId === "ollama" ? `${baseUrl}/api/tags` : `${baseUrl}/models`
      } else {
        const baseUrl = settings.baseUrl || (
          settings.providerId === "openrouter"
            ? "https://openrouter.ai/api/v1"
            : "https://api.openai.com/v1"
        )
        url = `${baseUrl}/models`
        headers = { ...headers, Authorization: `Bearer ${settings.apiKey}` }
      }

      // 测试连接同样带上设备头。鉴权头放在后面，避免被自定义头覆盖。
      headers = { ...normalizeRequestHeaders(settings.headers), ...headers }
      try {
        const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) })
        const body = await response.text()
        let data
        try { data = JSON.parse(body) } catch { data = null }
        if (!response.ok) {
          return {
            ok: false,
            status: response.status,
            message: data?.error?.message || data?.message || `连接失败（HTTP ${response.status}）`,
          }
        }
        const models = data?.data || data?.models || []
        const modelIds = models.map((item) => item.id || item.name || item.model).filter(Boolean)
        const modelAvailable = !settings.modelId || modelIds.length === 0 || modelIds.some((id) => id === settings.modelId || id.endsWith(`/${settings.modelId}`))
        return {
          ok: true,
          message: modelAvailable ? "连接成功，凭据有效" : "凭据有效，但模型列表中未找到当前模型",
          modelAvailable,
        }
      } catch (cause) {
        return { ok: false, message: cause.name === "TimeoutError" ? "连接超时" : cause.message }
      }
    })
    handle(CHANNELS.runAgent, async (_event, input) => {
      if (conversationJobs.has(input.conversationId)) throw new Error('该会话已有任务执行中')
      const job = { controller: new AbortController() }
      conversationJobs.set(input.conversationId, job)
      let release
      try {
      const settings = await settingsStore.getPrivate()
      release = await conversationQueue.acquire({ limit: settings.conversationConcurrency, signal: job.controller.signal,
        onWait: message => send(CHANNELS.agentEvent, { kind: 'waiting', conversationId: input.conversationId, runId: input.runId, message }) })
      if (job.controller.signal.aborted) return { stopped: true }
      if (input.mode === 'plan') return await agentService.run({ ...input, shopResults: [], settings })
      if (input.shops?.length > 1) return await runChatShops(input, settings)
      if (input.shops?.length === 1) {
        const shops = normalizeTaskShops(input.shops)
        const context = taskShopContext(shops, input.shopResults || [])
        const check = await validateShopConnection(input.shopResults[0])
        if (!check.ok) throw new Error(`CDP 连接失效：${check.error}`)
        input = { ...input, prompt: `${context}\n\n${input.shopPrompt || input.prompt}` }
      }
      if (job.controller.signal.aborted) return { stopped: true }
      const result = await agentService.run({ ...input, settings })
      if (input.shops?.length === 1) {
        const shop = input.shops[0]
        const message = await shopLifecycle.finish(input.shopUsageTokens?.[shop.id], {
          success: result.status === 'success' && !job.controller.signal.aborted,
          autoClose: input.autoCloseShops === true, connection: input.shopResults?.[0],
        })
        if (message) result.closeMessage = message
      }
      return result
      } finally {
        for (const token of Object.values(input.shopUsageTokens || {})) await shopLifecycle.finish(token)
        release?.()
        conversationJobs.delete(input.conversationId)
      }
    })
    handle(CHANNELS.beginShopUsage, async (_event, shops) => {
      const settings = await settingsStore.getPrivate()
      await preflightShopModel({ shops: normalizeTaskShops(shops), settings, getConnection: getBrowserConnection, limitMessage: deviceLimitMessage })
      const tokens = {}
      for (const shop of normalizeTaskShops(shops)) tokens[shop.id] = await shopLifecycle.begin(shop.id)
      return tokens
    })
    handle(CHANNELS.cancelShopUsage, async (_event, tokens) => {
      for (const token of Object.values(tokens || {})) await shopLifecycle.finish(token)
    })
    handle(CHANNELS.finishShopUsage, async (_event, input) => {
      const entry = shopLifecycle.tokens.get(input?.token)
      if (!entry) return ''
      const connection = input?.connection
      if (String(connection?.mallId) !== entry.id || String(connection?.browserId) !== entry.id || connection?.ok !== true) throw new Error('店铺连接信息不匹配，未关闭浏览器')
      return shopLifecycle.finish(input.token, { success: true, autoClose: true, connection })
    })
    handle(CHANNELS.stopAgent, async (_event, conversationId) => {
      const job = conversationJobs.get(conversationId)
      job?.controller.abort()
      const batch = chatShopRuns.get(conversationId)
      if (!batch) return (await agentService.stop(conversationId)) || Boolean(job)
      batch.stopped = true
      await Promise.all([...batch.runners].map(async entry => {
        await Promise.all([...entry.runner.activeRuns].map(run => entry.runner.stop(run.conversationId)))
      }))
      return true
    })
    handle(CHANNELS.approveTool, (_event, input) => {
      for (const batch of chatShopRuns.values()) for (const entry of batch.runners) {
        if (entry.runner.approvals.has(input.approvalId)) return entry.runner.resolveApproval(input)
      }
      return agentService.resolveApproval(input)
    })
    handle(CHANNELS.conversationStorageInfo, () => conversationStore.storageInfo())
    handle(CHANNELS.moveConversationStorage, async () => {
      const idle = () => !conversationJobs.size && !chatShopRuns.size && !activeScheduledRuns.size
      if (!idle()) throw Error('请等待所有任务结束后转移会话记录')
      const result = await dialog.showOpenDialog(parentWindow(), {title:'选择会话存储目录（转移本机所有账号记录）',properties:['openDirectory','createDirectory']})
      if(result.canceled || !result.filePaths?.[0]) return null
      if(!idle()) throw Error('有任务正在执行，请稍后重试')
      return conversationStore.migrate(result.filePaths[0])
    })
    handle(CHANNELS.loadConversations, (_event, input) => conversationStore.load(input))
    handle(CHANNELS.saveConversations, (_event, input) => ({...conversationStore.save(input),storage:conversationStore.storageInfo()}))
    handle(CHANNELS.exportConversations, async (_event, input) => {
      const text = conversationStore.exportData(input)
      const result = await dialog.showSaveDialog(parentWindow(), {defaultPath:'SuperPower-AI-conversations.json',filters:[{name:'会话备份',extensions:['json']}]})
      if (result.canceled || !result.filePath) return null
      await writeFile(result.filePath, text, 'utf8')
      return {path:result.filePath}
    })
    handle(CHANNELS.importConversations, async (_event, input) => {
      if (typeof input?.accountId !== 'string' || !input.accountId.trim()) throw Error('请先登录账号')
      const result = await dialog.showOpenDialog(parentWindow(), {properties:['openFile'],filters:[{name:'会话备份',extensions:['json']}]})
      if (result.canceled || !result.filePaths?.[0]) return null
      const file = result.filePaths[0]
      if ((await stat(file)).size > 128*1024*1024) throw Error('会话备份过大')
      const data = JSON.parse(await readFile(file,'utf8'))
      if (data.version !== 1 || !Array.isArray(data.conversations)) throw Error('不是有效的会话备份')
      return conversationStore.load({accountId:input.accountId, sourceId:'import:'+randomUUID(), legacy:data.conversations})
    })
    handle(CHANNELS.clearApprovals, (_event, input) => {
      return agentService.clearApprovals(input)
    })
    handle(CHANNELS.listSkills, (_event, input) => skillService.list(input))
    handle(CHANNELS.installSkill, (_event, input) => skillService.pickAndInstall(input))
    handle(CHANNELS.previewSkillFile, (_event, input) => skillService.previewFile(input))
    handle(CHANNELS.installBundledSkill, (_event, input) => skillService.installBundled(input))
    handle(CHANNELS.installRemoteSkill, (_event, input) => skillService.installRemote(input))
    handle(CHANNELS.createSkill, (_event, input) => skillService.create(input))
    handle(CHANNELS.getSkill, (_event, input) => skillService.get(input))
    handle(CHANNELS.updateSkill, (_event, input) => skillService.update(input))
    handle(CHANNELS.toggleSkill, (_event, input) => skillService.toggle(input))
    handle(CHANNELS.uninstallSkill, (_event, input) => skillService.uninstall(input))
    handle(CHANNELS.listScheduledTasks, () => scheduledTaskService.list())
    handle(CHANNELS.saveScheduledTask, (_event, input) => scheduledTaskService.save(input))
    handle(CHANNELS.toggleScheduledTask, (_event, input) => scheduledTaskService.toggle(input.id, input.enabled))
    handle(CHANNELS.deleteScheduledTask, (_event, id) => scheduledTaskService.remove(id))
    handle(CHANNELS.runScheduledTask, async (_event, id) => {
      const task = await scheduledTaskService.get(id)
      if (!taskInWorkspace(task, (await settingsStore.getPrivate()).workspace)) throw new Error("仅可执行当前工作区的定时任务")
      void runScheduledTask(id, true).catch(error => send(CHANNELS.agentEvent, {kind: "error", message: error.message}))
      return true
    })
    handle(CHANNELS.markScheduledTaskRead, (_event, id) => scheduledTaskService.markRead(id))
  }

  let disposal
  const dispose = () => disposal ||= (async () => {
    disposed = true
    for (const channel of handlers) ipcMain.removeHandler(channel)
    handlers.clear()
    app.removeListener?.('before-quit', dispose)
    if (schedulerTimer) clearInterval(schedulerTimer)
    for (const job of conversationJobs.values()) job.controller.abort()
    for (const pending of pendingShopRequests.values()) {
      clearTimeout(pending.timer)
      pending.reject(new Error('AI 服务已停止，任务已取消'))
    }
    pendingShopRequests.clear()
    const runners = new Set(backgroundRunners)
    if (agentService) runners.add(agentService)
    for (const batch of chatShopRuns.values()) {
      batch.stopped = true
      for (const entry of batch.runners) runners.add(entry.runner)
    }
    await Promise.allSettled([...runners].map(runner => runner.dispose()))
    await ordinaryBrowsers.dispose()
    conversationStore.close()
  })()

  app.once?.('before-quit', dispose)
  await ordinaryBrowsers.configure({
    dataDir: dataDir || app.getPath('userData'),
    publish: status => send(CHANNELS.ordinaryBrowserStatus, status),
  })
  agentService = new AgentService(send, skillService)
  registerIpc()
  await scheduledTaskService.recoverInterrupted()
  schedulerTimer = setInterval(async () => {
    const repaired = await scheduledTaskService.recoverInterrupted().catch(() => [])
    for (const task of Array.isArray(repaired) ? repaired : []) send(CHANNELS.scheduledTaskUpdated, task)
    const due = await scheduledTaskService.dueTasks().catch(() => [])
    const settings = await settingsStore.getPrivate().catch(() => null)
    if (!settings || disposed) return
    for (const task of due.filter(task => taskInWorkspace(task, settings.workspace))) void runScheduledTask(task.id).catch(() => {})
  }, 15000)
  schedulerTimer.unref?.()

  return { runScheduledTask, dispose, settingsStore }
}

export function tridentUserDataDir() {
  return app.getPath("userData")
}
