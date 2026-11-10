import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import vm from 'node:vm'
import { ShopLifecycle } from '../src/main/shop-lifecycle.js'

const shopId = '11111111-2222-3333-4444-555555555555'
const cdpUrl = 'ws://127.0.0.1:12345/devtools/browser/fixture'
const hostFile = new URL('../../super-power-browser-desktop/src/main/services/AiHost.js', import.meta.url)
const hostSource = readFileSync(hostFile, 'utf8')
const hostRequire = createRequire(hostFile)
const embedSource = readFileSync(new URL('../src/main/embed-host.js', import.meta.url), 'utf8')
const lifecycleInitialization = embedSource.match(/const shopLifecycle = new ShopLifecycle\(\{[\s\S]*?\n  \}\)/)?.[0]
assert.ok(lifecycleInitialization, 'exercise the actual embedded host lifecycle adapter')

function deferred() {
  let resolve
  const promise = new Promise(done => { resolve = done })
  return { promise, resolve }
}

// Run the real desktop adapter with Electron IPC stubbed. No app, browser,
// profile directory, account credentials, or network connection is used.
async function fixture() {
  const require = name => name === 'electron' ? { ipcMain: { handle() {} } } : hostRequire(name)
  require.resolve = name => name === '@super-power-browser/ai'
    ? fileURLToPath(new URL('../out/main/embed.js', import.meta.url))
    : hostRequire.resolve(name)
  const context = { module: { exports: {} }, require, process: { env: {} }, URL }
  vm.runInNewContext(hostSource, context, { filename: fileURLToPath(hostFile) })
  const { AiHost } = context.module.exports
  const calls = []
  const api = {
    token: 'fixture-token',
    denyAccess: false,
    async request(route) {
      calls.push(route)
      if (route === '/me/permissions') return { id: 'fixture-user', tenantId: 'fixture-tenant', permissions: ['ai.use'] }
      assert.equal(route, `/environments/${shopId}/access`)
      if (this.denyAccess) throw Object.assign(new Error('fixture access denied'), { status: 403 })
      return {}
    },
  }
  const closed = []
  const browsers = {
    pending: new Map(), starting: new Map(), preparing: new Map(), running: new Map(),
    async close(id) {
      closed.push(id)
      for (const states of [this.pending, this.starting, this.preparing, this.running]) states.delete(id)
    },
  }
  let options
  const host = new AiHost({
    api, browsers, config: { dataPath: 'fixture-only-never-written' }, window: { webContents: {} },
    loadRuntime: async () => ({ startTridentHost: async input => { options = input; return { async dispose() {} } } }),
  })
  await host.ready()
  const lifecycle = vm.runInNewContext(`${lifecycleInitialization}; shopLifecycle`, {
    ShopLifecycle,
    isShopBrowserOpen: options.isShopBrowserOpen,
    getBrowserConnection: options.getBrowserConnection,
    closeShopBrowser: options.closeShopBrowser,
  })
  function makeReady(url = cdpUrl) {
    for (const states of [browsers.pending, browsers.starting, browsers.preparing]) states.delete(shopId)
    browsers.running.set(shopId, { status: 'running', debuggerUrl: url, port: 12345, kernelVersion: '140.0.0' })
  }
  async function connection(reused = false) {
    return { ...await options.getBrowserConnection(shopId), mallId: shopId, ok: true, reused }
  }
  return { host, options, api, calls, browsers, closed, lifecycle, makeReady, connection }
}

test('manual preparation, startup and existing windows never become owned by an AI task', async t => {
  const states = {
    'pending launch': f => f.browsers.pending.set(shopId, Promise.resolve()),
    'startup controller': f => f.browsers.starting.set(shopId, {}),
    'kernel preparation': f => f.browsers.preparing.set(shopId, { stage: 'download' }),
    'browser starting without CDP': f => f.browsers.running.set(shopId, { status: 'starting', debuggerUrl: '' }),
    'existing ready browser': f => f.makeReady(),
    'window closing but not yet cleaned': f => f.browsers.running.set(shopId, { status: 'closing', debuggerUrl: cdpUrl }),
  }
  for (const [name, prepare] of Object.entries(states)) await t.test(name, async () => {
    const f = await fixture()
    prepare(f)
    assert.equal(await f.options.isShopBrowserOpen(shopId), true)
    assert.equal((await f.options.getBrowserConnection(shopId)).isopen, name === 'existing ready browser')
    const token = await f.lifecycle.begin(shopId)
    f.makeReady()
    // The UI may report reused:false when it waited for an existing manual launch.
    await f.lifecycle.finish(token, { success: true, autoClose: true, connection: await f.connection(false) })
    assert.deepEqual(f.closed, [])
    assert.equal(f.browsers.running.has(shopId), true)
  })
})

test('a confirmed closed shop opened by AI still closes after successful completion', async () => {
  const f = await fixture()
  assert.equal(await f.options.isShopBrowserOpen(shopId), false)
  assert.equal((await f.options.getBrowserConnection(shopId)).isopen, false)
  const token = await f.lifecycle.begin(shopId)
  f.makeReady()
  await f.lifecycle.finish(token, { success: true, autoClose: true, connection: await f.connection() })
  assert.deepEqual(f.closed, [shopId])
  assert.equal(f.browsers.running.size, 0)
})

test('existence checks retain ID validation and shop access authorization', async () => {
  const f = await fixture()
  f.browsers.pending.set(shopId, Promise.resolve())
  const before = f.calls.length
  await assert.rejects(f.host.isShopBrowserOpen('invalid-shop'), /店铺 ID 不合法/)
  assert.equal(f.calls.length, before)
  f.api.denyAccess = true
  await assert.rejects(f.options.isShopBrowserOpen(shopId), /access denied/)
  // Lifecycle treats lookup failure conservatively; it does not grant ownership.
  const token = await f.lifecycle.begin(shopId)
  f.api.denyAccess = false
  f.makeReady()
  await f.lifecycle.finish(token, { success: true, autoClose: true, connection: await f.connection() })
  assert.deepEqual(f.closed, [])
})

test('missing or ambiguous state cannot grant permission to auto-close', async t => {
  for (const [name, state] of [
    ['missing response', undefined], ['null response', null], ['empty response', {}],
    ['missing flag', { isopen: undefined }], ['null flag', { isopen: null }], ['numeric flag', { isopen: 0 }],
  ]) await t.test(name, async () => {
    let closes = 0
    const lifecycle = new ShopLifecycle({ getConnection: async () => state, closeBrowser: async () => { closes++; return { closed: true } } })
    const token = await lifecycle.begin(shopId)
    await lifecycle.finish(token, { success: true, autoClose: true, connection: { ok: true, reused: false, browserInstanceId: cdpUrl } })
    assert.equal(closes, 0)
  })
})

test('reused or unconfirmed connections and disabled auto-close retain the shop', async t => {
  for (const mode of ['reused', 'unconfirmed', 'auto-close disabled']) await t.test(mode, async () => {
    const f = await fixture()
    const token = await f.lifecycle.begin(shopId)
    f.makeReady()
    const connection = await f.connection(mode === 'reused')
    if (mode === 'unconfirmed') delete connection.reused
    await f.lifecycle.finish(token, { success: true, autoClose: mode !== 'auto-close disabled', connection })
    assert.deepEqual(f.closed, [])
    assert.equal(f.browsers.running.has(shopId), true)
  })
})

test('concurrent tasks wait for the last lease and close an AI-owned instance once', async () => {
  const f = await fixture()
  const [first, second] = await Promise.all([f.lifecycle.begin(shopId), f.lifecycle.begin(shopId)])
  f.makeReady()
  await f.lifecycle.finish(first, { success: true, autoClose: true, connection: await f.connection() })
  assert.deepEqual(f.closed, [])
  await f.lifecycle.finish(second, { success: true, autoClose: true, connection: await f.connection(true) })
  assert.deepEqual(f.closed, [shopId])
  await f.lifecycle.finish(first, { success: true, autoClose: true })
  await f.lifecycle.finish(second, { success: true, autoClose: true })
  assert.deepEqual(f.closed, [shopId])
})

test('a failed or cancelled task blocks auto-close regardless of completion order', async t => {
  for (const outcome of ['failure', 'cancellation']) for (const failsFirst of [true, false]) await t.test(`${outcome}, ends ${failsFirst ? 'first' : 'last'}`, async () => {
    const f = await fixture()
    const [successful, unsuccessful] = await Promise.all([f.lifecycle.begin(shopId), f.lifecycle.begin(shopId)])
    f.makeReady()
    const connection = await f.connection()
    const success = () => f.lifecycle.finish(successful, { success: true, autoClose: true, connection })
    const failure = () => outcome === 'failure'
      ? f.lifecycle.finish(unsuccessful, { success: false, autoClose: true, connection })
      : f.lifecycle.finish(unsuccessful)
    if (failsFirst) { await failure(); await success() } else { await success(); await failure() }
    assert.deepEqual(f.closed, [])
    assert.equal(f.browsers.running.has(shopId), true)
  })
})

test('a replacement instance is retained even when the original AI task succeeds', async () => {
  const f = await fixture()
  const token = await f.lifecycle.begin(shopId)
  f.makeReady()
  const original = await f.connection()
  const replacement = `${cdpUrl}-replacement`
  f.makeReady(replacement)
  const message = await f.lifecycle.finish(token, { success: true, autoClose: true, connection: original })
  assert.deepEqual(f.closed, [])
  assert.equal(f.browsers.running.get(shopId).debuggerUrl, replacement)
  assert.match(message, /店铺实例已变化/)
})

test('a new task waits for an ongoing close before determining its ownership', async () => {
  const f = await fixture()
  const token = await f.lifecycle.begin(shopId)
  f.makeReady()
  const entered = deferred(), release = deferred()
  const close = f.browsers.close.bind(f.browsers)
  f.browsers.close = async id => { entered.resolve(); await release.promise; return close(id) }
  const finishing = f.lifecycle.finish(token, { success: true, autoClose: true, connection: await f.connection() })
  await entered.promise
  let began = false
  const next = f.lifecycle.begin(shopId).then(value => { began = true; return value })
  await new Promise(resolve => setImmediate(resolve))
  assert.equal(began, false)
  release.resolve()
  await finishing
  const nextToken = await next
  f.makeReady(`${cdpUrl}-new-task`)
  await f.lifecycle.finish(nextToken, { success: true, autoClose: true, connection: await f.connection() })
  assert.deepEqual(f.closed, [shopId, shopId])
})
