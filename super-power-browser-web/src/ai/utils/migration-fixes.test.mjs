import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { createRenderer, isReactive, nextTick, reactive } from 'vue';
import { compileScript, parse } from '@vue/compiler-sfc';

const require = createRequire(import.meta.url);
const aiRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');

// Run the actual TypeScript modules with a synthetic desktop bridge, without a browser or real shops.
function modules(pageWindow, mocks = {}) {
  const cache = new Map();
  function load(file) {
    if (cache.has(file)) return cache.get(file).exports;
    const module = { exports: {} };
    cache.set(file, module);
    const source = ts.transpileModule(readFileSync(file, 'utf8'), {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
    }).outputText;
    const localRequire = (id) => {
      if (Object.hasOwn(mocks, id)) return mocks[id];
      if (id.startsWith('.')) return load(resolve(dirname(file), `${id}.ts`));
      return require(id);
    };
    new Function('require', 'module', 'exports', 'window', 'useI18n', source)(
      localRequire, module, module.exports, pageWindow,
      () => ({ t: (key, params) => params?.message || key }),
    );
    return module.exports;
  }
  return (relative) => load(resolve(aiRoot, relative));
}

function shopBridge(open) {
  let listener;
  let launches = 0;
  const page = {
    setTimeout, clearTimeout,
    api: { getWebDriverOpenStatus(callback) { listener = callback; } },
    localflow: {
      getBrowserConnection: async () => null,
      validateShopConnection: async () => ({ ok: true }),
    },
    ruxOpen: (input) => {
      launches++;
      return open(input, (data) => listener(null, data));
    },
  };
  return { page, launches: () => launches };
}

test('diagnostic IPC receives cloneable plain data from nested Vue state, errors, bigint and cycles', async () => {
  let received;
  const page = { localflow: { exportDiagnostics: async (input) => {
    received = structuredClone(input);
    assert.equal(isReactive(input.conversation.tools[0].input), false);
    return { issueId: 'synthetic', path: 'synthetic.zip', collected: 1, skipped: 0 };
  } } };
  const load = modules(page);
  const { zhifuExportDiagnostics } = load('utils/electronApi/index.ts');
  const input = reactive({ description: 'synthetic', conversation: { tools: [{
    input: { filter: { shops: ['e3813-synthetic'] }, count: 123n },
    output: { items: [1, 2] }, error: new Error('Synthetic failure'),
  }] } });
  input.conversation.tools[0].output.parent = input.conversation;
  const shared = reactive({ nested: { value: 'same source, both fields retained' } });
  input.conversation.tools[0].input.shared = shared;
  input.conversation.tools[0].output.shared = shared;
  assert.throws(() => structuredClone(input), { name: 'DataCloneError' });
  const result = await zhifuExportDiagnostics(input);
  assert.equal(result.issueId, 'synthetic');
  assert.deepEqual(received.conversation.tools[0].input, {
    filter: { shops: ['e3813-synthetic'] }, count: '123', shared: { nested: { value: 'same source, both fields retained' } },
  });
  assert.equal(received.conversation.tools[0].error, 'Synthetic failure');
  assert.equal(received.conversation.tools[0].output.parent, '[Circular]');
  assert.deepEqual(received.conversation.tools[0].output.shared, received.conversation.tools[0].input.shared);
  assert.equal(input.conversation.tools[0].input.count, 123n);
  assert.equal(input.conversation.tools[0].output.parent, input.conversation);
});

const flush = () => new Promise((done) => setImmediate(done));
const deferred = () => {
  let resolve;
  const promise = new Promise((done) => { resolve = done; });
  return { promise, resolve };
};
const opened = (id) => ({ ok: true, mallId: id, browserId: id, status: 'opened', message: 'opened' });

test('scheduled listener completes once per request and aggregates every failed shop', async () => {
  let receive;
  let opens = 0;
  const replies = [];
  const { listenForScheduledShopOpen } = modules({})('utils/scheduledShopOpen.ts');
  const stop = listenForScheduledShopOpen({
    subscribe: (listener) => { receive = listener; return () => {}; },
    complete: async (reply) => { replies.push(reply); },
    getSessionKey: () => 'synthetic-session',
    openShop: async (id, guard) => { guard(); opens++; throw new Error(`${id} refused`); },
    onError: () => assert.fail('reply must succeed'),
  });
  const request = { requestId: 'task-1', shops: [{ id: 'e3813-synthetic', name: '甲' }, { id: 'b3813-synthetic', name: '乙' }] };
  receive(request); receive(request);
  await flush();
  receive(request);
  await flush();
  assert.equal(opens, 2);
  assert.equal(replies.length, 1);
  assert.match(replies[0].error, /店铺「甲」（ID：e3813-synthetic）打开失败：e3813-synthetic refused/);
  assert.match(replies[0].error, /店铺「乙」（ID：b3813-synthetic）打开失败：b3813-synthetic refused/);
  assert.equal(replies[0].requestId, 'task-1');
  stop();
});

test('scheduled connection verification rejection returns an error instead of leaving host waiting', async () => {
  let receive;
  const replies = [];
  const { listenForScheduledShopOpen } = modules({})('utils/scheduledShopOpen.ts');
  const stop = listenForScheduledShopOpen({
    subscribe: (listener) => { receive = listener; return () => {}; },
    complete: async (reply) => {
      replies.push(reply);
      if (reply.results) throw new Error('店铺浏览器实例已变化，请重新连接');
    },
    getSessionKey: () => 'synthetic-session',
    openShop: async (id) => opened(id),
    onError: () => assert.fail('error reply must succeed'),
  });
  receive({ requestId: 'task-2', shops: [{ id: 'e3813-synthetic' }] });
  await flush();
  assert.equal(replies.length, 2);
  assert.equal(replies[1].error, '店铺浏览器实例已变化，请重新连接');
  stop();
});

test('a new session never reuses an old pending same-shop open or starts its stale request', async () => {
  const oldConnection = deferred();
  let session = 'A';
  let reads = 0;
  const bridge = shopBridge(async ({ browserId }, emit) => {
    emit({ browserId, isopen: true, WebDriverPort: 43210, browserInstanceId: 'new-session' });
  });
  bridge.page.localflow.getBrowserConnection = async () => ++reads === 1 ? oldConnection.promise : null;
  const { openMallFromPage } = modules(bridge.page)('views/zhifuAgent/chat/utils/shop.ts');
  const guard = (expected) => () => { if (session !== expected) throw new Error('session changed'); };
  const first = openMallFromPage('e3813-synthetic', bridge.page, guard('A'));
  const firstRejection = assert.rejects(first, /session changed/);
  session = 'B';
  const second = await openMallFromPage('e3813-synthetic', bridge.page, guard('B'));
  oldConnection.resolve(null);
  await firstRejection;
  assert.equal(second.browserInstanceId, 'new-session');
  assert.equal(bridge.launches(), 1);
});

test('authenticated layout keeps listener across routes and permission refresh, cancels on account changes and unmount', async () => {
  let receive;
  let subscriptions = 0;
  let unsubscriptions = 0;
  let opens = 0;
  let opening;
  const replies = [];
  const route = reactive({ fullPath: '/zhifuAgent', path: '/zhifuAgent', meta: { title: 'AI' } });
  const user = { id: 'synthetic-user', tenantId: 'synthetic-tenant', permissions: ['ai.use'] };
  const permissions = reactive({ user: { ...user }, can(key) { return this.user?.permissions.includes(key) || false; } });
  const load = modules({});
  const mocks = {
    vue: require('vue'),
    'vue-router': { useRoute: () => route, useRouter: () => ({ push() {} }) },
    'element-plus': { ElMessage: { error: () => assert.fail('completion should not fail') } },
    '@element-plus/icons-vue': {},
    './components/Sidebar/components/CompanyInfo.vue': {},
    '@/components/WindowControls.vue': {},
    '@/store/modules/permission.store': { usePermissions: () => permissions },
    '@/store/modules/account.store': { useAccount: () => ({ load: async () => {} }) },
    '@/utils/request': { token: () => 'synthetic-token' },
    '@/ai/utils/electronApi': {
      zhifuOnOpenScheduledShops: (listener) => { receive = listener; subscriptions++; return () => { unsubscriptions++; }; },
      zhifuCompleteScheduledShops: async (reply) => { replies.push(reply); },
    },
    '@/ai/views/zhifuAgent/chat/utils/shop': {
      openMallFromPage: async (id, _page, guard) => {
        opens++;
        guard();
        await opening?.promise;
        guard();
        return opened(id);
      },
    },
    '@/ai/utils/scheduledShopOpen': load('utils/scheduledShopOpen.ts'),
  };
  const layoutPath = resolve(aiRoot, '../layout/index.vue');
  const { descriptor } = parse(readFileSync(layoutPath, 'utf8'));
  const script = compileScript(descriptor, { id: 'scheduled-layout-test' }).content;
  const compiled = ts.transpileModule(script, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'window', compiled)((id) => {
    assert.ok(Object.hasOwn(mocks, id), `unexpected layout dependency ${id}`);
    return mocks[id];
  }, module, module.exports, {});
  const component = module.exports.default;
  component.render = () => null;
  const renderer = createRenderer({
    createElement: () => ({}), createText: () => ({}), createComment: () => ({}),
    insert() {}, remove() {}, setText() {}, setElementText() {}, patchProp() {},
    parentNode: () => null, nextSibling: () => null,
  });
  const app = renderer.createApp(component);
  app.mount({});
  assert.equal(subscriptions, 1);

  opening = deferred();
  receive({ requestId: 'route-task', shops: [{ id: 'e3813-synthetic' }] });
  await flush();
  permissions.user = { ...user };
  route.fullPath = route.path = '/set-center';
  await nextTick();
  opening.resolve();
  await flush();
  assert.equal(replies.length, 1);
  assert.equal(replies[0].requestId, 'route-task');
  assert.equal(replies[0].results[0].ok, true);
  assert.equal(subscriptions, 1);

  opening = deferred();
  receive({ requestId: 'old-account-task', shops: [{ id: 'e3813-synthetic' }] });
  await flush();
  permissions.user = null;
  permissions.user = { ...user };
  opening.resolve();
  await flush();
  assert.equal(replies.length, 1, 'logout/login, even to the same account, must discard the old reply');

  opening = deferred();
  receive({ requestId: 'unmount-task', shops: [{ id: 'e3813-synthetic' }] });
  await flush();
  app.unmount();
  opening.resolve();
  await flush();
  receive({ requestId: 'after-unmount-task', shops: [{ id: 'e3813-synthetic' }] });
  await flush();
  assert.equal(unsubscriptions, 1);
  assert.equal(replies.length, 1);
  assert.equal(opens, 3);
});

test('failed status arriving before launch IPC rejection retains the original opening error', async () => {
  const bridge = shopBridge(async ({ browserId }, emit) => {
    emit({ browserId, isopen: false });
    await new Promise((done) => setImmediate(done));
    throw new Error('Synthetic proxy: ECONNREFUSED');
  });
  const { openMallFromPage } = modules(bridge.page)('views/zhifuAgent/chat/utils/shop.ts');
  const first = openMallFromPage('e3813-synthetic', bridge.page);
  const second = openMallFromPage('e3813-synthetic', bridge.page);
  const results = await Promise.allSettled([first, second]);
  for (const result of results) {
    assert.equal(result.status, 'rejected');
    assert.equal(result.reason.message, 'Synthetic proxy: ECONNREFUSED');
  }
  assert.equal(bridge.launches(), 1);
});

test('failure supplied by status survives a fulfilled launch request', async () => {
  const bridge = shopBridge(async ({ browserId }, emit) => {
    emit({ browserId, isopen: false, error: 'Synthetic device expired' });
  });
  const { openMallFromPage } = modules(bridge.page)('views/zhifuAgent/chat/utils/shop.ts');
  await assert.rejects(openMallFromPage('e3813-synthetic', bridge.page), /Synthetic device expired/);
});

test('a success status does not hide a later launch rejection; successful launch still verifies and reuses', async () => {
  let shouldFail = true;
  const bridge = shopBridge(async ({ browserId }, emit) => {
    emit({ browserId, isopen: true, WebDriverPort: 43210, browserInstanceId: 'synthetic-instance' });
    if (shouldFail) throw new Error('Synthetic launch finalization failed');
  });
  const { openMallFromPage } = modules(bridge.page)('views/zhifuAgent/chat/utils/shop.ts');
  await assert.rejects(openMallFromPage('e3813-synthetic', bridge.page), /finalization failed/);
  shouldFail = false;
  const result = await openMallFromPage('e3813-synthetic', bridge.page);
  assert.equal(result.ok, true);
  assert.equal(result.browserInstanceId, 'synthetic-instance');
  assert.equal(result.reused, false);
  const reused = await openMallFromPage('e3813-synthetic', bridge.page);
  assert.equal(reused.reused, true);
  assert.equal(bridge.launches(), 2);
});

test('unsettled launch is bounded even if its status event already settled', async () => {
  const bridge = shopBridge((_input, emit) => {
    emit({ browserId: 'e3813-synthetic', isopen: false });
    return new Promise(() => {});
  });
  bridge.page.setTimeout = (callback, delay) => setTimeout(callback, delay === 60000 ? 15 : delay);
  const { openMallFromPage } = modules(bridge.page)('views/zhifuAgent/chat/utils/shop.ts');
  await assert.rejects(openMallFromPage('e3813-synthetic', bridge.page), /打开超时/);
});

test('actual chat flow reports every failed shop with name, UUID and unmasked cause', { timeout: 3000 }, async () => {
  const bridge = shopBridge(async ({ browserId }, emit) => {
    emit({ browserId, isopen: false });
    throw new Error(`Error invoking remote method 'spb:openBrowser': Error: ${browserId === 'e3813-synthetic' ? 'ECONNREFUSED' : 'ETIMEDOUT'} synthetic`);
  });
  let finished;
  const completion = new Promise((resolve) => { finished = resolve; });
  const conversation = { id: 'test-chat', messages: [], tools: [] };
  let nextId = 0;
  let cancellations = 0;
  const store = {
    conversationStorageReady: true, workspace: 'synthetic', effectiveMode: 'act',
    settings: { modelId: 'synthetic', hasApiKey: true, conversationConcurrency: 1 },
    activeConversation: conversation, activeId: conversation.id, conversationRuns: {},
    conversationQueue: { acquire: async () => () => {} },
    ensureModelKeySaved: async () => {}, persist() {}, scrollToBottom() {},
    clearConversationApprovals() {}, notifyConversation() {}, isNearBottom: () => false,
    flushConversations: async () => { if (conversation.executionState === 'failed') finished(); },
    currentAssistant: () => {
      const assistant = { role: 'assistant', content: '' };
      conversation.messages.push(assistant);
      return assistant;
    },
  };
  const load = modules(bridge.page, {
    '@/ai/store/modules/zhifu-agent.store': {
      useZhifuAgentStore: () => store, newId: () => String(++nextId), skillIdentity: (value) => value,
      errorMessage: (cause) => load('views/zhifuAgent/utils/userError.ts').userError(cause),
    },
    '@/ai/utils/electronApi': {
      zhifuBeginShopUsage: async () => ({ 'e3813-synthetic': 'synthetic-token' }),
      zhifuCancelShopUsage: async () => { cancellations++; },
      zhifuRunAgent: async () => { assert.fail('opening-only failure must not invoke the model'); },
    },
    '@/ai/views/modelManage/composables/useModelPlanAccess': {
      useModelPlanAccess: () => ({ showTrial: { value: false }, refresh: async () => {} }),
    },
  });
  const { sendPrompt } = load('views/zhifuAgent/chat/composables/useAgentRun.ts').useAgentRun();
  assert.equal(await sendPrompt({ text: '打开店铺', images: [], files: [], skills: [], shops: [
    { id: 'e3813-synthetic', name: '店铺甲' }, { id: 'b3813-synthetic', name: '店铺乙' },
  ] }), true);
  await completion;
  assert.equal(store.error, '店铺「店铺甲」（ID：e3813-synthetic）打开失败：ECONNREFUSED synthetic\n店铺「店铺乙」（ID：b3813-synthetic）打开失败：ETIMEDOUT synthetic');
  assert.equal(conversation.messages.at(-1).content, store.error);
  assert.equal(conversation.messages.at(-1).executionStatus, 'failed');
  assert.equal(cancellations, 1);
});
