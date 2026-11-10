import { readableError } from "../../utils/userError";

const OPEN_TIMEOUT_MS = 60000;
const CDP_READY_TIMEOUT_MS = 15000;

export interface MallOpenResult {
  ok: boolean;
  mallId: string;
  status: "opened" | "failed";
  message: string;
  isopen?: boolean;
  browserId?: string;
  browserInstanceId?: string;
  cdpUrl?: string;
  WebDriverPort?: number;
  KernalNumber?: number;
  reused?: boolean;
}

export function mallOpenFailure(
  shop: { id: string | number; name?: string },
  cause: unknown
): MallOpenResult {
  const reason = readableError(String((cause as { message?: unknown })?.message || cause || "未知错误"));
  return {
    ok: false,
    mallId: String(shop.id),
    status: "failed",
    message: `店铺「${shop.name || shop.id}」（ID：${shop.id}）打开失败：${reason}`,
  };
}

/** Already contains shop context; generic error translation would discard the affected shops. */
export class MallOpenError extends Error {
  constructor(results: MallOpenResult[]) {
    super(results.filter((result) => !result.ok).map((result) => result.message).join("\n"));
    this.name = "MallOpenError";
  }
}

interface WebDriverStatus {
  browserInstanceId?: string;
  isopen?: boolean;
  browserId?: string | number;
  WebDriverPort?: number;
  KernalNumber?: number;
  cdpUrl?: string;
  error?: string;
}

interface ShopPageWindow {
  ruxOpen?: (_params: { browserId: number | string }) => Promise<unknown> | unknown;
  api?: {
    getWebDriverOpenStatus?: (_callback: (_err: unknown, _data: WebDriverStatus) => void) => void;
  };
  localflow?: {
    validateShopConnection?: (
      _result: MallOpenResult
    ) => Promise<{ ok?: boolean; error?: string } | undefined>;
    getBrowserConnection?: (_mallId: string) => Promise<WebDriverStatus | null | undefined>;
  };
}

const pendingOpens = new Map<
  string,
  { timer: number; resolve: (_data: WebDriverStatus) => void; reject: (_error: Error) => void }
>();
const openedMalls = new Map<string, MallOpenResult>();
const openingMalls = new Map<string, {
  promise: Promise<MallOpenResult>;
  assertCurrent?: () => void;
}>();
let activeWindow: ShopPageWindow | null = null;
let listeningWindow: ShopPageWindow | null = null;

/** 仅选择店铺、且没有额外操作要求时，由页面打开店铺，不再交给 Agent */
export function isMallOpenOnlyRequest({
  text = "",
  hasSkills = false,
  hasAttachments = false,
  hasFiles = false,
}: {
  text?: string;
  hasSkills?: boolean;
  hasAttachments?: boolean;
  hasFiles?: boolean;
} = {}) {
  if (hasSkills || hasAttachments || hasFiles) return false;
  const normalized = text.trim().replace(/[\s。！!，,？?]/g, "");
  if (!normalized) return true;
  return /^(?:请|麻烦)?(?:帮我)?(?:打开|开启)(?:当前|这些|以上|已选择的?|选中的?|选择的?)?店铺$/.test(
    normalized
  );
}

function usePageWindow(pageWindow: ShopPageWindow) {
  if (activeWindow === pageWindow) return;
  pendingOpens.clear();
  openedMalls.clear();
  openingMalls.clear();
  activeWindow = pageWindow;
}

function connectionResult(id: string, data: WebDriverStatus): MallOpenResult {
  return {
    ok: true,
    mallId: id,
    status: "opened",
    message: "店铺已打开",
    isopen: true,
    WebDriverPort: data.WebDriverPort ?? 0,
    browserId: String(data.browserId ?? id),
    browserInstanceId: data.browserInstanceId,
    KernalNumber: data.KernalNumber ?? 0,
    cdpUrl: data.cdpUrl || (data.WebDriverPort ? `http://127.0.0.1:${data.WebDriverPort}` : ""),
  };
}

function subscribeWebDriverStatus(pageWindow: ShopPageWindow) {
  const listen = pageWindow.api?.getWebDriverOpenStatus;
  if (typeof listen !== "function") {
    throw new Error("当前页面未提供 window.api.getWebDriverOpenStatus");
  }
  if (listeningWindow === pageWindow) return;
  listeningWindow = pageWindow;
  listen((_err, data) => {
    const browserId = String(data?.browserId ?? "").trim();
    if (data?.isopen === false) openedMalls.delete(browserId);
    if (data?.isopen === true && openedMalls.has(browserId)) {
      openedMalls.set(browserId, connectionResult(browserId, data));
    }
    const waiter = pendingOpens.get(browserId);
    if (!waiter) return;
    pendingOpens.delete(browserId);
    window.clearTimeout(waiter.timer);
    if (data?.isopen === true) waiter.resolve(data);
    else waiter.reject(new Error(data?.error || `店铺 ${browserId} 打开失败`));
  });
}

async function verifyConnection(pageWindow: ShopPageWindow, result: MallOpenResult) {
  if (typeof pageWindow.localflow?.validateShopConnection !== "function") {
    throw new Error("连接验证接口未加载，请重启客户端");
  }
  const check = await pageWindow.localflow.validateShopConnection(result);
  if (!check?.ok) {
    throw new Error(
      `店铺 ${result.mallId}，CDP ${result.cdpUrl || "(未提供地址)"} 连接验证失败：${check?.error || "未知错误"}`
    );
  }
}

async function waitForReadyConnection(pageWindow: ShopPageWindow, initial: MallOpenResult, assertCurrent?: () => void) {
  const deadline = Date.now() + CDP_READY_TIMEOUT_MS;
  let result = initial;
  let lastError: Error | undefined;
  do {
    assertCurrent?.();
    try {
      const live = await pageWindow.localflow?.getBrowserConnection?.(initial.mallId);
      assertCurrent?.();
      if (
        live?.isopen &&
        String(live.browserId) === initial.mallId &&
        (live.cdpUrl || live.WebDriverPort)
      ) {
        result = connectionResult(initial.mallId, live);
      }
      await verifyConnection(pageWindow, result);
      assertCurrent?.();
      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
    assertCurrent?.();
    if (!lastError.message.includes("CDP") || Date.now() >= deadline) throw lastError;
    await new Promise((resolve) =>
      window.setTimeout(resolve, Math.min(500, deadline - Date.now()))
    );
  } while (Date.now() <= deadline);
  throw lastError;
}

function waitForWebDriverOpen(pageWindow: ShopPageWindow, mallId: string) {
  subscribeWebDriverStatus(pageWindow);
  let settle!: {
    resolve: (_data: WebDriverStatus) => void;
    reject: (_error: Error) => void;
  };
  const promise = new Promise<WebDriverStatus>((resolve, reject) => {
    settle = { resolve, reject };
  });
  let pollTimer = 0;
  let finished = false;
  const cleanup = () => {
    finished = true;
    window.clearTimeout(pollTimer);
  };
  const timer = window.setTimeout(() => {
    if (pendingOpens.get(mallId)?.timer !== timer) return;
    pendingOpens.delete(mallId);
    cleanup();
    settle.reject(new Error(`店铺 ${mallId} 打开超时`));
  }, OPEN_TIMEOUT_MS);
  const previous = pendingOpens.get(mallId);
  if (previous) window.clearTimeout(previous.timer);
  pendingOpens.set(mallId, {
    timer,
    resolve: (data) => {
      cleanup();
      settle.resolve(data);
    },
    reject: (error) => {
      cleanup();
      settle.reject(error);
    },
  });
  const poll = async () => {
    if (finished) return;
    try {
      const data = await pageWindow.localflow?.getBrowserConnection?.(mallId);
      if (
        !finished &&
        data?.isopen &&
        String(data.browserId) === mallId &&
        (data.cdpUrl || data.WebDriverPort)
      ) {
        cleanup();
        window.clearTimeout(timer);
        pendingOpens.delete(mallId);
        settle.resolve(data);
        return;
      }
    } catch {
      /* 轮询失败时继续等待状态事件 */
    }
    if (!finished) pollTimer = window.setTimeout(poll, 1000);
  };
  if (pageWindow.localflow?.getBrowserConnection) pollTimer = window.setTimeout(poll, 1000);
  return {
    promise,
    cancel(error?: Error) {
      if (pendingOpens.get(mallId)?.timer !== timer) return;
      window.clearTimeout(timer);
      cleanup();
      pendingOpens.delete(mallId);
      if (error) settle.reject(error);
    },
  };
}

/** 通过页面 ruxOpen 打开店铺，并等待可复用的 CDP 连接 */
export async function openMallFromPage(
  mallId: number | string,
  pageWindow: ShopPageWindow = window as ShopPageWindow,
  assertCurrent?: () => void
): Promise<MallOpenResult> {
  assertCurrent?.();
  const id = String(mallId ?? "").trim();
  if (!id) throw new Error("缺少店铺 ID");
  if (typeof pageWindow.ruxOpen !== "function") {
    throw new Error("当前页面未提供 window.ruxOpen(mallId) 方法");
  }

  usePageWindow(pageWindow);
  const pending = openingMalls.get(id);
  if (pending) {
    let current = true;
    try { pending.assertCurrent?.(); } catch { current = false; }
    if (current) {
      const result = await pending.promise;
      assertCurrent?.();
      return result;
    }
  }

  const operation = (async () => {
    try {
      const live = await pageWindow.localflow?.getBrowserConnection?.(id);
      assertCurrent?.();
      if (live?.isopen && String(live.browserId) === id) {
        const result = connectionResult(id, live);
        await verifyConnection(pageWindow, result);
        assertCurrent?.();
        openedMalls.set(id, result);
        return { ...result, reused: true, message: "店铺已打开，已复用现有浏览器" };
      }
    } catch {
      /* 现有连接不可用时重新打开 */
    }
    assertCurrent?.();
    const opened = openedMalls.get(id);
    if (opened) {
      try {
        await verifyConnection(pageWindow, opened);
        assertCurrent?.();
        return { ...opened, reused: true, message: "店铺已打开，已复用现有浏览器" };
      } catch {
        openedMalls.delete(id);
      }
    }
    assertCurrent?.();
    const status = waitForWebDriverOpen(pageWindow, id);
    status.promise.catch(() => {});
    let launchTimer = 0;
    try {
      // A failed status event can precede the IPC rejection carrying its actual cause.
      // Await that request first, while retaining the same bounded opening timeout.
      await Promise.race([
        Promise.resolve().then(() => {
          assertCurrent?.();
          return pageWindow.ruxOpen?.({ browserId: id });
        }),
        new Promise<never>((_resolve, reject) => {
          launchTimer = window.setTimeout(() => reject(new Error(`店铺 ${id} 打开超时`)), OPEN_TIMEOUT_MS);
        }),
      ]);
      assertCurrent?.();
      const data = await status.promise;
      assertCurrent?.();
      const result = await waitForReadyConnection(pageWindow, connectionResult(id, data), assertCurrent);
      openedMalls.set(id, result);
      return { ...result, reused: false };
    } catch (error) {
      status.cancel();
      throw error;
    } finally {
      window.clearTimeout(launchTimer);
    }
  })().finally(() => {
    if (openingMalls.get(id)?.promise === operation) openingMalls.delete(id);
  });

  openingMalls.set(id, { promise: operation, assertCurrent });
  return operation;
}
