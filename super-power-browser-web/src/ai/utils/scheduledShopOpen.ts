import { mallOpenFailure, MallOpenError, type MallOpenResult } from "../views/zhifuAgent/chat/utils/shop";
import { readableError } from "../views/zhifuAgent/utils/userError";

interface ScheduledShopRequest {
  requestId: string;
  shops: { id: string | number; name?: string }[];
}

interface ScheduledShopReply {
  requestId: string;
  results?: MallOpenResult[];
  error?: string;
}

interface ScheduledShopOptions {
  subscribe: (listener: (request: ScheduledShopRequest) => void) => () => void;
  complete: (reply: ScheduledShopReply) => Promise<unknown>;
  getSessionKey: () => string;
  openShop: (id: string | number, assertCurrent: () => void) => Promise<MallOpenResult>;
  onError: () => void;
}

/** The authenticated layout owns this listener, so AI page navigation cannot interrupt a task. */
export function listenForScheduledShopOpen(options: ScheduledShopOptions): () => void {
  let disposed = false;
  const pending = new Map<string, { session: string; promise: Promise<void> }>();
  const completed = new Map<string, string>();

  function receive(request: ScheduledShopRequest) {
    const session = options.getSessionKey();
    const requestId = typeof request?.requestId === "string" ? request.requestId.trim() : "";
    if (disposed || !session || !requestId) return;
    if (pending.get(requestId)?.session === session || completed.get(requestId) === session) return;
    const current = () => !disposed && options.getSessionKey() === session;
    const assertCurrent = () => {
      if (!current()) throw new Error("登录会话已变化，已停止打开定时任务店铺");
    };
    const job = Promise.resolve().then(async () => {
      assertCurrent();
      try {
        if (!Array.isArray(request.shops) || !request.shops.length ||
          request.shops.some((shop) => !String(shop?.id ?? "").trim())) {
          throw new Error("定时任务缺少有效店铺信息");
        }
        const results = await Promise.all(request.shops.map(async (shop) => {
          try {
            assertCurrent();
            return await options.openShop(shop.id, assertCurrent);
          } catch (cause) {
            return mallOpenFailure(shop, cause);
          }
        }));
        assertCurrent();
        if (results.some((result) => !result.ok)) throw new MallOpenError(results);
        await options.complete({ requestId, results });
      } catch (cause) {
        // Logout disposes the old host; never deliver its reply to the next account's host.
        if (!current()) return;
        await options.complete({
          requestId,
          error: readableError(cause instanceof Error ? cause.message : String(cause)),
        });
      }
    }).catch(() => {
      if (current()) options.onError();
    }).finally(() => {
      if (pending.get(requestId)?.promise === job) pending.delete(requestId);
      if (current()) {
        completed.set(requestId, session);
        if (completed.size > 256) completed.delete(completed.keys().next().value!);
      }
    });
    pending.set(requestId, { session, promise: job });
  }

  const unsubscribe = options.subscribe(receive);
  return () => {
    disposed = true;
    unsubscribe();
    completed.clear();
    pending.clear();
  };
}
