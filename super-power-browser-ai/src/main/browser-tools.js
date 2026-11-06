import { chromium } from 'playwright-core'
import { existsSync } from 'node:fs'
import { randomUUID } from 'node:crypto'
import { mkdir, realpath } from 'node:fs/promises'
import { dirname, isAbsolute, join, relative } from 'node:path'
import { shopOutputDirectory, outputFile, captureDownloads } from './shop-output.js'
import { execFile } from 'node:child_process'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { validateShopConnection } from './cdp-connection.js'
import { readPageContent, compactSnapshotElement } from './page-content.js'
import { exportExcel } from './excel-export.js'
import { ordinaryBrowsers, conversationDirectory } from './ordinary-browser.js'

const shopLocks = new Map()
const ACTION_TIMEOUT = 30000

function checkSignal(signal) {
  if (signal?.aborted) throw new Error('任务已停止')
}

export async function acquireShopLock(id, signal) {
  const previous = shopLocks.get(id) || Promise.resolve()
  let release
  const tail = new Promise(resolve => { release = resolve })
  const queued = previous.catch(() => {}).then(() => tail)
  shopLocks.set(id, queued)
  const cancel = () => release()
  signal?.addEventListener('abort', cancel, { once: true })
  let rejectOnAbort
  try {
    await Promise.race([previous, new Promise((_resolve, reject) => {
      if (signal?.aborted) reject(new Error('任务已停止'))
      else {
        rejectOnAbort = () => reject(new Error('任务已停止'))
        signal?.addEventListener('abort', rejectOnAbort, { once: true })
      }
    })])
    checkSignal(signal)
  } catch (error) {
    release()
    queued.then(() => { if (shopLocks.get(id) === queued) shopLocks.delete(id) })
    throw error
  } finally {
    signal?.removeEventListener('abort', cancel)
    if (rejectOnAbort) signal?.removeEventListener('abort', rejectOnAbort)
  }
  return () => {
    release()
    queued.then(() => { if (shopLocks.get(id) === queued) shopLocks.delete(id) })
  }
}

const common = {
  mallId: { type: 'string', description: '当前任务关联的店铺 ID，不能自行指定其他店铺。' },
  pageId: { type: 'string', description: 'snapshot 返回的页面 ID；多页面时必须提供。' },
  matchIndex: { type: 'integer', minimum: 0, maximum: 99, description: 'selector 匹配多个元素时，使用工具返回的候选编号。' },
}
const definitions = [
  ['browser_snapshot', '查看店铺页面、文字和可操作元素的 ref；操作前先调用。可用 selector 聚焦正文或结果区域，避免导航占满快照。', { selector: { type: 'string', maxLength: 500 } }],
  ['browser_navigate', '在当前店铺的指定页面打开 HTTP/HTTPS 地址。', { url: { type: 'string' } }, ['url']],
  ['browser_click', '点击当前快照中的元素；不可自动重试提交动作。', { ref: { type: 'string' } }, ['ref']],
  ['browser_fill', '填写当前快照中的输入框。明确要输入后回车搜索时可传 submitKey: Enter，在同一次调用中填写并提交；否则填写后获取新快照再操作。', { ref: { type: 'string' }, text: { type: 'string' }, submitKey: { type: 'string', enum: ['Enter'] } }, ['ref', 'text']],
  ['browser_press', '在指定元素上按键，如 Enter、Tab。', { ref: { type: 'string' }, key: { type: 'string' } }, ['ref', 'key']],
  ['browser_read', '读取指定页面或元素的文字、链接及表格数据；标题链接优先。可用 selector 聚焦结果区域。链接已有标题和地址时无需为了获取链接再次 snapshot。', { ref: { type: 'string' }, selector: { type: 'string', maxLength: 500 } }],
  ['browser_screenshot', '保存当前页面截图，返回本地文件路径。', {}],
  ['browser_export_excel', '把当前 browser_read 的实际数据导出为真正的 xlsx，并自动回读验证。必须提供 readId。默认导出链接；可选 linkIndices、tableIndex，或 headers 和 rows 指定从页面提取的字段。文件自动放在工作区店铺目录，无需检查环境、写脚本或启动 Excel COM。', {
    readId: { type: 'string' }, filename: { type: 'string', maxLength: 120 },
    linkIndices: { type: 'array', items: { type: 'integer', minimum: 0, maximum: 39 }, minItems: 1, maxItems: 40 },
    tableIndex: { type: 'integer', minimum: 0, maximum: 2 },
    headers: { type: 'array', items: { type: 'string' }, minItems: 1, maxItems: 50 },
    rows: { type: 'array', minItems: 1, maxItems: 2000, items: { type: 'array', maxItems: 50, items: { type: ['string', 'number', 'boolean', 'null'] } } },
  }, ['readId']],
  ['browser_result', '任务完成后使用 browser_read 返回的 readId 和可选 linkIndex 提交实际结果。不要重新拼接 expectedUrl/expectedText，工具自动引用原始数据并附上生成文件。expectedUrl 仅校验当前页面地址，不是结果链接。', { readId: { type: 'string' }, linkIndex: { type: 'integer', minimum: 0, maximum: 99 }, expectedUrl: { type: 'string' }, expectedText: { type: 'string' } }],
  ['browser_run_skill_script', '兼容执行已选择技能目录中的既有 Node.js 脚本，注入当前店铺连接环境变量。不能运行临时生成脚本。', { script: { type: 'string' }, args: { type: 'array', items: { type: 'string' }, maxItems: 30 } }, ['script']],
]

export const BROWSER_TOOL_NAMES = definitions.map(([name]) => name)
export const BROWSER_READ_TOOLS = new Set(['browser_snapshot', 'browser_read', 'browser_screenshot', 'browser_result'])
export const BROWSER_TOOL_PROMPT = `项目内置 browser_snapshot、browser_navigate、browser_click、browser_fill、browser_press、browser_read、browser_screenshot、browser_result。页面操作优先直接调用这些固定工具，不要临时编写 Node.js/Python/PowerShell 浏览器脚本。先 snapshot 获取 pageId 与 ref，随后按技能的业务步骤操作；每次填写、点击、导航或按键后重新 snapshot，不能复用旧 ref。只操作当前任务提供的 mallId。工具的 ok 只表示该步骤结果，完整任务是否达成必须核对实际页面内容；最终调用 browser_read，再用 browser_result 提交实际页面数据（如第一条搜索结果在 links 数组中的 linkIndex）。成功后给用户自然语言摘要，不输出内部结果协议 JSON。既有技能 Node.js 脚本可用 browser_run_skill_script 执行，脚本需在已选技能目录内；不要改写现有脚本来伪造结果。截图路径可作为图片结果展示。`

export function createBrowserTools(getRun, approve) {
  const tools = [
    ['browser_prepare', '仅在用户要求打开网页、截图、点击、填写、登录等网页交互时准备普通浏览器；公开信息查询优先 fetch_web_content，不调用本工具。直接请求失败时不自动打开浏览器。仅使用本机已安装的 Microsoft Edge 或 Google Chrome。', {}],
    ['browser_wait_user', '需要用户在浏览器中完成登录、验证码等操作时调用，等待用户确认后继续。', { message: { type: 'string' } }],
    ['browser_upload', '向页面上传工作区内文件或本条消息明确附带的文件。提供文件输入框 ref，隐藏的文件输入框可提供 selector。', { ref: { type: 'string' }, selector: { type: 'string', maxLength: 500 }, path: { type: 'string' } }, ['path']],
    ...definitions,
  ]
  return tools.map(([name, description, properties, required = []]) => ({
    name, description,
    inputSchema: { type: 'object', properties: { ...common, ...properties }, required, additionalProperties: false },
    timeoutMs: ['browser_prepare', 'browser_wait_user'].includes(name) ? 600000 : name === 'browser_run_skill_script' ? 120000 : 40000,
    retryable: false, maxRetries: 0,
    async execute(input, context) {
      const run = getRun()
      if (!run) throw new Error('当前没有可操作的浏览器任务')
      if (name === 'browser_prepare' && !(run instanceof OrdinaryBrowserRun)) throw new Error('店铺任务使用已绑定的店铺连接，不启动普通浏览器')
      if (name === 'browser_wait_user') {
        const permission = await approve({ sessionId: context.sessionId, toolName: name, toolCallId: context.toolCallId, input, force: true })
        return { ok: Boolean(permission.approved), message: permission.approved ? '用户已确认，请重新查看页面后继续。' : permission.reason || '用户取消了本次人工操作，请停止任务。' }
      }
      if (name === 'browser_prepare') {
        const permission = await approve({ sessionId: context.sessionId, toolName: name, toolCallId: context.toolCallId, input })
        if (!permission.approved) return { ok: false, error: permission.reason || '操作未获批准' }
        return run.prepare(context.signal)
      }
      if (!BROWSER_READ_TOOLS.has(name)) {
        const permission = await approve({ sessionId: context.sessionId, toolName: name, toolCallId: context.toolCallId, input })
        if (!permission.approved) throw new Error(permission.reason || '操作未获批准')
      }
      let timer
      try {
        return await Promise.race([
          run.execute(name, input, context.signal),
          new Promise(resolve => {
            timer = setTimeout(() => {
              run.abort()
              resolve({ ok: false, mallId: String(input.mallId), code: 'TIMEOUT', error: '浏览器工具执行超时，已请求停止；不会自动重试页面操作' })
            }, name === 'browser_run_skill_script' ? 95000 : 35000)
          }),
        ])
      } finally { clearTimeout(timer) }
    },
  }))
}

export class BrowserToolRun {
  constructor({ connections = [], shops = [], workspace, skillDirectories = [], connect = (...args) => chromium.connectOverCDP(...args), validate = validateShopConnection } = {}) {
    this.connections = new Map(connections.filter(item => item?.ok && item.isopen && String(item.mallId) === String(item.browserId)).map(item => [String(item.mallId), item]))
    this.workspace = workspace
    this.shops = shops
    this.skillDirectories = skillDirectories
    this.connect = connect
    this.validate = validate
    this.controller = new AbortController()
    this.states = new Map()
    this.releases = []
    this.tail = Promise.resolve()
  }

  async start() {
    for (const id of [...this.connections.keys()].sort()) this.releases.push(await acquireShopLock(id, this.controller.signal))
  }

  outputDirectory(id) { return shopOutputDirectory(this.workspace, this.shops.find(shop => String(shop.id) === id)?.name, id) }

  async state(id) {
    checkSignal(this.controller.signal)
    const connection = this.connections.get(id)
    if (!connection) throw new Error('当前任务未绑定该店铺，禁止跨店铺操作')
    if (this.states.has(id)) return this.states.get(id)
    const check = await this.validate(connection)
    if (!check.ok) throw new Error(`CDP 连接失效：${check.error}`)
    const browser = await this.connect(connection.cdpUrl, { timeout: 3000, noDefaults: true })
    if (this.controller.signal.aborted) { await browser.close(); throw new Error('任务已停止') }
    const state = { browser, pages: new Map(), refs: new Map() }
    state.downloads = []
    state.files = []
    state.cleanup = []
    if (this.workspace) {
      const directory = this.outputDirectory(id)
      const attach = page => state.cleanup.push(captureDownloads(page, directory, state.downloads, state.files))
      for (const context of browser.contexts()) {
        context.pages().forEach(attach)
        context.on('page', attach)
        state.cleanup.push(() => context.off('page', attach))
      }
    }
    this.states.set(id, state)
    return state
  }

  pages(state) {
    const pages = state.browser.contexts().flatMap(context => context.pages()).filter(page => !page.isClosed())
    for (const [id, page] of state.pages) if (!pages.includes(page)) state.pages.delete(id)
    for (const page of pages) if (![...state.pages.values()].includes(page)) state.pages.set(`p-${randomUUID()}`, page)
    return [...state.pages].map(([pageId, page]) => ({ pageId, url: page.url() }))
  }

  async clearRefs(state) {
    const refs = [...state.refs.values()]
    state.refs.clear()
    await Promise.all(refs.map(ref => ref.handle.dispose().catch(() => {})))
  }

  async execute(name, input, signal) {
    const operation = this.tail.catch(() => {}).then(async () => {
      checkSignal(signal)
      checkSignal(this.controller.signal)
      const id = String(input.mallId)
      if (!this.connections.has(id)) throw new Error('当前任务未绑定该店铺，禁止跨店铺操作')
      const cancel = () => this.abort()
      signal?.addEventListener('abort', cancel, { once: true })
      try {
        if (name === 'browser_run_skill_script') return await this.runScript(id, input)
        const state = await this.state(id)
        const pages = this.pages(state)
        if (name === 'browser_snapshot' && !input.pageId && pages.length !== 1) {
          return { ok: true, mallId: id, pages, message: pages.length ? '请指定需要操作的 pageId' : '浏览器中没有可用页面' }
        }
        const pageId = input.pageId || pages[0]?.pageId
        const page = state.pages.get(pageId)
        if (!page) throw new Error('页面不存在，请重新获取 snapshot')
        const timeout = ACTION_TIMEOUT
        const ref = input.ref && state.refs.get(input.ref)
        if (input.ref && (!ref || ref.pageId !== pageId || ref.url !== page.url())) {
          const error = new Error('页面元素引用已更新，本次操作尚未执行。请重新获取快照，使用新的元素引用继续；不要重复已经完成的填写或提交。')
          error.code = 'REF_EXPIRED'; error.actionPerformed = false
          throw error
        }
        if (['browser_navigate', 'browser_click', 'browser_press', 'browser_fill'].includes(name)) state.readResult = null
        let result
        if (name === 'browser_snapshot') {
          const scope = page.locator(input.selector || 'body')
          const selection = await this.selectScope(scope, input.matchIndex)
          if (selection.choices) return { ok: true, mallId: id, pageId, result: selection, message: '匹配多个区域，请用 matchIndex 选择；不要重新猜 selector' }
          await this.clearRefs(state)
          const elements = []
          const locator = selection.target.locator(':is(a,button,input,textarea,select,[role="button"],[role="link"],[contenteditable="true"]):visible')
          const handles = await locator.elementHandles()
          const own = await selection.target.elementHandle()
          if (own) {
            const interactive = await own.evaluate(element => element.matches('a,button,input,textarea,select,[role="button"],[role="link"],[contenteditable="true"]') && element.getClientRects().length > 0)
            if (interactive) handles.unshift(own)
            else await own.dispose()
          }
          for (const handle of handles.slice(0, 60)) {
            if (!(await handle.isVisible())) { await handle.dispose(); continue }
            const data = await handle.evaluate(compactSnapshotElement)
            const refId = `e-${randomUUID()}`
            state.refs.set(refId, { pageId, url: page.url(), handle })
            elements.push({ ref: refId, ...data })
          }
          for (const handle of handles.slice(60)) await handle.dispose()
          const content = await selection.target.evaluate(readPageContent)
          result = { pages, title: (await page.title()).slice(0, 200), text: content.text.slice(0, 4000), elements, truncated: handles.length > 60 || content.text.length > 4000 }
        } else if (name === 'browser_navigate') {
          const url = new URL(input.url)
          if (!['http:', 'https:'].includes(url.protocol)) throw new Error('仅支持 HTTP/HTTPS 页面地址')
          const response = await page.goto(url.href, { waitUntil: 'domcontentloaded', timeout })
          if (response && response.status() >= 400) throw new Error(`页面返回 HTTP ${response.status()}`)
          result = { title: await page.title() }
        } else if (name === 'browser_click') {
          if (!ref) throw new Error('缺少元素引用')
          await ref.handle.click({ timeout }); result = { message: '点击已执行，请获取快照确认页面结果' }
        } else if (name === 'browser_fill') {
          if (!ref) throw new Error('缺少元素引用')
          if (input.submitKey !== undefined && input.submitKey !== 'Enter') throw new Error('仅支持填写后按 Enter 提交')
          await ref.handle.fill(input.text, { timeout })
          if (input.submitKey === 'Enter') {
            await ref.handle.press('Enter', { timeout })
            result = { message: '已填写并执行一次回车，请获取新快照或读取页面确认是否提交成功。不要自动重复提交。', submitted: true }
          } else result = { message: '已填写，旧元素引用已失效。下一步若需按键或点击，请先 browser_snapshot 获取新的 ref；也可在首次填写时指定 submitKey: Enter。', nextStep: 'browser_snapshot' }
        } else if (name === 'browser_press') {
          if (!ref) throw new Error('缺少元素引用')
          await ref.handle.press(input.key, { timeout }); result = { message: '按键已执行，请获取快照确认页面结果' }
        } else if (name === 'browser_read') {
          const selection = ref ? { target: ref.handle } : await this.selectScope(page.locator(input.selector || 'body'), input.matchIndex)
          if (selection.choices) return { ok: true, mallId: id, pageId, result: selection, message: '匹配多个元素，请用 matchIndex 选择；原读取凭据仍可使用' }
          const target = selection.target
          result = await target.evaluate(readPageContent)
          result.readId = `read-${randomUUID()}`
          state.readResult = { pageId, url: page.url(), data: result }
        } else if (name === 'browser_export_excel') {
          const read = state.readResult
          if (!read || !input.readId || read.data.readId !== input.readId || read.pageId !== pageId || read.url !== page.url()) throw new Error('读取凭据已失效，请先 browser_read 当前页面')
          let headers = input.headers, rows = input.rows
          if (headers || rows) {
            if (!headers || !rows || input.tableIndex !== undefined || input.linkIndices) throw new Error('自定义表格必须同时提供 headers 和 rows，不能混用链接或表格索引')
          } else if (input.tableIndex !== undefined) {
            if (input.linkIndices) throw new Error('不能同时选择链接和表格')
            const table = read.data.tables[input.tableIndex]
            if (!table?.length) throw new Error('页面中不存在所选表格')
            headers = table[0]
            rows = table.slice(1).map(row => headers.map((_cell, index) => row[index] ?? ''))
          } else {
            const indices = input.linkIndices || read.data.links.map((_link, index) => index)
            if (!indices.length || indices.some(index => !Number.isInteger(index) || !read.data.links[index])) throw new Error('页面中不存在所选链接')
            headers = ['标题', '链接', '来源页面']
            rows = indices.map(index => [read.data.links[index].title, read.data.links[index].url, read.url])
          }
          const directory = this.outputDirectory(id)
          result = await exportExcel(directory, { filename: input.filename, headers, rows })
          result.readId = read.data.readId
          state.files.push(result.path)
        } else if (name === 'browser_result') {
          await Promise.all(state.downloads)
          const read = state.readResult
          if (!read || read.pageId !== pageId || read.url !== page.url()) throw new Error('请先 browser_read 读取当前页面的实际结果')
          if (input.readId && input.readId !== read.data.readId) throw new Error('读取凭据已失效，请使用最近一次 browser_read 的 readId')
          if (input.expectedUrl && !read.url.includes(input.expectedUrl)) throw new Error('实际页面地址不符合预期')
          if (input.expectedText && !read.data.text.includes(input.expectedText)) throw new Error('实际页面文字不符合预期')
          const link = input.linkIndex !== undefined ? read.data.links[input.linkIndex] : null
          if (input.linkIndex !== undefined && !link) throw new Error('所选结果链接不存在')
          const text = link ? `${link.title} | ${link.url}` : read.data.text.slice(0, 8000)
          if (!text.trim()) throw new Error('页面未返回可确认的结果内容')
          return { ok: true, mallId: id, pageId, readId: read.data.readId, url: read.url, files: [...state.files], shopExecutionResult: { mallId: id, ok: true, result: `${text}；验证：页面URL=${read.url}${state.files.length ? `；文件：${state.files.join('、')}` : ''}`, error: '' } }
        } else if (name === 'browser_screenshot') {
          const directory = this.outputDirectory(id)
          const path = await outputFile(directory, 'screenshot.png')
          await mkdir(dirname(path), { recursive: true })
          await page.screenshot({ path, timeout, fullPage: false })
          result = { path, message: '截图已保存' }
          state.files.push(path)
        } else if (name === 'browser_upload') {
          let target = ref?.handle
          if (!target && input.selector) {
            const selection = await this.selectScope(page.locator(input.selector), input.matchIndex)
            if (selection.choices) return { ok: true, pageId, result: selection, message: '请选择文件输入框的 matchIndex。' }
            target = selection.target
          }
          if (!target) throw new Error('请提供文件输入框的 ref 或 selector')
          await target.setInputFiles(input.path, { timeout })
          await this.clearRefs(state); state.readResult = null
          result = { message: '文件已选择，请检查页面后继续。' }
        } else throw new Error('不支持的浏览器工具')
        if (['browser_navigate', 'browser_click', 'browser_press', 'browser_fill'].includes(name)) { await this.clearRefs(state); state.readResult = null }
        checkSignal(this.controller.signal)
        await Promise.all(state.downloads)
        return { ok: true, mallId: id, browserId: id, pageId, url: page.url(), result, files: [...state.files] }
      } catch (error) {
        return { ok: false, mallId: id, browserId: id, error: error.message || String(error), code: this.controller.signal.aborted ? 'STOPPED' : error.code || (/timeout/i.test(error.message) ? 'TIMEOUT' : 'BROWSER_ERROR'), ...(error.actionPerformed === false ? { actionPerformed: false, nextStep: 'browser_snapshot' } : {}) }
      } finally { signal?.removeEventListener('abort', cancel) }
    })
    this.tail = operation
    return operation
  }

  async selectScope(locator, index) {
    const count = await locator.count()
    if (!count) throw new Error('selector 未匹配任何元素，请使用已获取的 ref 或重新选择区域')
    if (index !== undefined) {
      if (!Number.isInteger(index) || index < 0 || index >= count) throw new Error('matchIndex 超出候选范围')
      return { target: locator.nth(index) }
    }
    if (count === 1) return { target: locator.first() }
    const choices = await locator.evaluateAll(elements => elements.slice(0, 100).map((element, index) => ({ index, tag: element.tagName.toLowerCase(), text: (element.innerText || element.getAttribute('aria-label') || '').slice(0, 160) })))
    return { count, choices }
  }

  async runScript(id, input) {
    const script = await realpath(input.script)
    const roots = await Promise.all(this.skillDirectories.map(path => realpath(path)))
    if (!roots.some(root => { const path = relative(root, script); return path && !path.startsWith('..') && !isAbsolute(path) }) || !/\.(cjs|mjs|js)$/i.test(script)) throw new Error('只允许运行已选择技能目录内的 Node.js 脚本')
    const connection = this.connections.get(id)
    const outputDirectory = shopOutputDirectory(this.workspace, this.shops.find(shop => String(shop.id) === id)?.name, id)
    await mkdir(outputDirectory, { recursive: true })
    const check = await this.validate(connection)
    if (!check.ok) throw new Error(`CDP 连接失效：${check.error}`)
    const adjacent = fileURLToPath(new URL('./browser-skill-runtime.js', import.meta.url))
    const runtimeFile = existsSync(adjacent) ? adjacent : fileURLToPath(new URL('../browser-skill-runtime.js', import.meta.url))
    return await new Promise(resolve => {
      execFile(process.execPath, [script, ...(input.args || [])], {
        cwd: outputDirectory, windowsHide: true, timeout: 90000, maxBuffer: 1024 * 1024,
        signal: this.controller.signal,
        env: { ...process.env, ELECTRON_RUN_AS_NODE: '1', TRIDENT_WORKSPACE: this.workspace, TRIDENT_OUTPUT_DIR: outputDirectory, TRIDENT_MALL_ID: id, TRIDENT_CDP_URL: connection.cdpUrl, TRIDENT_BROWSER_RUNTIME: pathToFileURL(runtimeFile).href },
      }, (error, stdout, stderr) => resolve({ ok: !error, mallId: id, browserId: id, stdout, stderr, error: error?.message || '', exitCode: error?.code || 0 }))
    })
  }

  abort() {
    this.controller.abort()
    for (const state of this.states.values()) state.browser.close().catch(() => {})
  }

  async dispose() {
    for (const state of this.states.values()) for (const cleanup of state.cleanup || []) cleanup()
    this.abort()
    let timer
    try {
      await Promise.race([Promise.all([...this.states.values()].map(state => state.browser.close().catch(() => {}))), new Promise(resolve => { timer = setTimeout(resolve, 2000); timer.unref?.() })])
    } finally { clearTimeout(timer) }
    this.states.clear()
    for (const release of this.releases.splice(0)) release()
  }
}

/** Reuse page operations without exposing CDP or shop identifiers to ordinary tasks. */
export class OrdinaryBrowserRun extends BrowserToolRun {
  constructor({ workspace, conversationId, files = [], manager = ordinaryBrowsers } = {}) {
    super({ workspace })
    this.conversationId = conversationId; this.manager = manager
    this.epoch = manager.epoch
    this.authorizedFiles = files
    this.connections.set('ordinary', {})
  }
  async start() {}
  outputDirectory() { return conversationDirectory(this.workspace, this.conversationId) }
  async prepare(signal) {
    if (this.epoch !== this.manager.epoch) return { ok: false, error: '工作区已切换，请重新发送任务。' }
    if (this.prepareResult?.ok) return this.prepareResult
    if (this.prepareAttempted) return { ok: false, error: '浏览器准备未完成，请在应用设置中检查后重试。' }
    this.prepareAttempted = true
    const cancel = () => this.controller.abort()
    signal?.addEventListener('abort', cancel, { once: true })
    try { this.prepareResult = { ok: true, ...await this.manager.prepare(this.workspace, this.conversationId, this.controller.signal) }; return this.prepareResult }
    catch (error) { return { ok: false, error: error.message } }
    finally { signal?.removeEventListener('abort', cancel) }
  }
  async state(id) {
    if (this.epoch !== this.manager.epoch) throw new Error('工作区已切换，请重新发送任务。')
    checkSignal(this.controller.signal)
    if (this.states.has(id)) return this.states.get(id)
    this.session = await this.manager.acquire(this.workspace, this.conversationId, this.controller.signal)
    this.session.pending = this.tail.catch(() => {})
    const { context } = this.session
    if (!context.pages().length) await context.newPage()
    checkSignal(this.controller.signal)
    const state = { browser: { contexts: () => [context] }, pages: new Map(), refs: new Map(), files: [], downloads: [], cleanup: [] }
    const attach = page => state.cleanup.push(captureDownloads(page, this.outputDirectory(), state.downloads, state.files))
    context.pages().forEach(attach); context.on('page', attach)
    state.cleanup.push(() => context.off('page', attach))
    this.states.set(id, state)
    return state
  }
  async execute(name, input, signal) {
    if (input.mallId) return Promise.resolve({ ok: false, error: '普通浏览器不能指定店铺。' })
    if (name === 'browser_run_skill_script') return Promise.resolve({ ok: false, error: '普通浏览器请直接使用页面工具。' })
    if (name === 'browser_upload') {
      try {
        const path = await realpath(input.path)
        const workspace = await realpath(this.workspace)
        const rel = relative(workspace, path)
        const attached = await Promise.all(this.authorizedFiles.map(file => realpath(file).catch(() => '')))
        if ((!rel || rel.startsWith('..') || isAbsolute(rel)) && !attached.includes(path)) throw new Error('只能上传当前工作区内的文件或本条消息明确选择的附件。')
        input = { ...input, path }
      } catch (error) { return { ok: false, error: error.message } }
    }
    return super.execute(name, { ...input, mallId: 'ordinary' }, signal)
  }
  abort() {
    this.controller.abort()
    // Keep the window for inspection while stopping loads and subsequent actions.
    for (const page of this.session?.context.pages() || []) page.evaluate(() => window.stop()).catch(() => {})
  }
  async dispose() {
    this.abort()
    const cleanup = async () => {
      for (const state of this.states.values()) {
        for (const off of state.cleanup) off()
        await this.clearRefs(state)
      }
      this.states.clear()
    }
    const pending = this.tail.catch(() => {}).then(cleanup)
    if (this.session) this.session.pending = pending
    // Do not delay cancellation UI while a Playwright operation is unwinding.
    pending.catch(() => {})
  }
}
