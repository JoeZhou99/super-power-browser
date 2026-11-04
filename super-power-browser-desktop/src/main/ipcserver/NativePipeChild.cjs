/**
 * NamePipeChild.js
 * ------------------------------------------------------------
 * Windows 命名管道（IOCP + koffi）服务的 **独立子进程入口**。
 *
 * 历史背景：
 *  最初这个文件叫 NamePipeWorker.js，跑在 Node 的 `worker_threads` 里。worker 跟主进程
 *  共享同一个 OS 进程，节省切换成本。但在 Astrill VPN 等会向 chromium-based 浏览器进程
 *  注入 Winsock LSP（ASProxy64.dll）的环境下，主进程加载的 chromium 网络栈与 LSP 钩子
 *  会与本模块自建的 IOCP 端口产生交叉访问，最终在 Worker 线程的 GetQueuedCompletionStatus
 *  回包路径上触发 0xC0000005（Access Violation）—— 表现为 Electron 整进程退出 code=3221225477。
 *  详见 NamePipeWinMessagePipeCore.js 顶部的事故记录。
 *
 *  本文件是把"管道服务"从 worker_threads 搬到 `child_process.fork` 的子进程版本：
 *   1. 进程隔离：本进程崩溃不会带垮主 Electron 进程，PipeServer 能感知 exit 并止血/可选重启；
 *   2. 启动方式：父侧用 `fork(scriptPath, [], { env: { ELECTRON_RUN_AS_NODE: '1' } })` 让
 *      electron.exe 以纯 Node 模式跑本脚本——不加载 chromium 运行时，最大化绕开 ASProxy 对
 *      chromium 进程的挂钩；即使遇到 LSP，崩也只崩在子进程；
 *   3. 通信协议：与 worker_threads 时代保持一致（'start' / 'stop' / 'ready' / 'ciphertext' /
 *      'log' / 'stopped'），方便 NamePipeService 端做最小改动；
 *   4. 兜底处理：进程级 uncaughtException / unhandledRejection 全部转 'log' 上报，避免静默退出
 *      让父侧 ready 超时拉起重启风暴。
 */

const {MessagePipeCore}=require('./NativeMessagePipeCore.cjs');

/**
 * 当前持有的 IOCP 核心实例；stop 之后必须置空，
 * 以免在 IPC channel 关闭/第二次 start 时触发对已释放句柄的复用。
 * @type {MessagePipeCore | null}
 */
let core = null;

/**
 * 统一的父进程投递函数。
 * 子进程在父进程主动 disconnect、IPC channel 关闭等场景下 process.send 会同步抛 ERR_IPC_CHANNEL_CLOSED；
 * 包装一层 try/catch 后，任何投递失败都视为可丢弃（对端已经不关心该消息）。
 */
function post(op, payload = {}) {
  if (typeof process.send !== 'function') return;
  try {
    process.send({ op, ...payload });
  } catch (_) {
    /* IPC 已关闭等情况下安全忽略，避免向已关闭的 channel send 触发未捕获异常 */
  }
}

/**
 * 经由 post 回传日志到父进程 logger。
 * 任何内部错误都走这里，保证"出错即可观测"，不会被 Node 默认的 stderr 吞掉。
 */
function safeLog(level, message) {
  post('log', { level, message: String(message ?? '') });
}

/**
 * 进程级兜底：
 *  - koffi 调用栈里任何同步异常未被 try/catch 吃掉，最终都会落到这里；
 *  - setImmediate/Promise 链中未 catch 的拒绝，Node 默认会触发 unhandledRejection → 进程崩溃。
 * 转成日志继续跑，只有真正致命的情况（例如 V8 OOM / native AV）才会让子进程退出。
 */
process.on('uncaughtException', (e) => {
  safeLog('error', `Child uncaughtException: ${e?.stack || e?.message || e}`);
});
process.on('unhandledRejection', (e) => {
  safeLog('error', `Child unhandledRejection: ${e?.stack || e?.message || e}`);
});

/**
 * 安全停止当前 core。
 *  1. 先把模块级 core 指针置空，避免并发 stop/start 再次命中同一实例；
 *  2. 调 stop()（投递 IOCP 关停键 + 唤醒挂起的 ConnectNamedPipe）；
 *  3. await IO 主循环结束 (_ioLoopDone)，保证所有 native 句柄已关闭后再返回，
 *     否则下一次 start 可能与旧句柄冲突导致 CreateNamedPipeW 失败。
 */
async function stopCoreSafely() {
  if (!core) return;
  const c = core;
  core = null;
  try {
    c.stop();
  } catch (e) {
    safeLog('warn', `core.stop 异常: ${e?.message || e}`);
  }
  try {
    await c.waitForIoLoopEnd?.();
  } catch (e) {
    safeLog('warn', `waitForIoLoopEnd 异常: ${e?.message || e}`);
  }
}

if (typeof process.send !== 'function') {
  /**
   * 直接 node ./NamePipeChild.js 跑会落到这里——本脚本只做子进程角色，
   * 没有 IPC channel 时无法收 'start' 消息，立即退出避免占资源。
   */
  // eslint-disable-next-line no-console
  console.error('NamePipeChild 必须以 child_process.fork(..., { stdio: [..., "ipc"] }) 方式启动');
  process.exit(2);
} else {
  /**
   * 父进程 disconnect / 子进程 channel 关闭后触发。
   * 这里只做尽力而为的清理——不 await（IPC 已无法再收/发消息），并显式 exit(0)
   * 让进程及时回收资源，否则核心循环里的 IOCP 等待会让进程悬挂。
   */
  process.on('disconnect', () => {
    void stopCoreSafely().finally(() => {
      try {
        process.exit(0);
      } catch (_) {
        /* ignore */
      }
    });
  });

  /**
   * 消息分发的双层保护：
   *  - 外层是同步函数（process.on 的签名期望同步），防止 Node 把 async 回调抛出的
   *    拒绝视为 unhandledRejection；
   *  - 内层的 async IIFE 统一 .catch，把所有异步异常转成日志。
   */
  process.on('message', (msg) => {
    if (!msg || typeof msg !== 'object') return;

    (async () => {
      if (msg.op === 'start') {
        // 每次 start 前完全停止旧实例，避免"double-start"时新旧两份 core 并存
        // 抢同一个 pipeName，旧实例的 IOCP 回调会污染新实例的 slot 状态。
        await stopCoreSafely();

        const pipeName = String(msg.pipeName || '');
        if (!pipeName) {
          // pipeName 缺失会让 CreateNamedPipeW 得到 "\\.\pipe\"（末尾空名），失败且不会恢复；
          // 这里直接拒绝，避免后续所有 accept 槽都在白跑。
          safeLog('error', 'start 消息缺少 pipeName，忽略');
          return;
        }
        try {
          core = new MessagePipeCore({
            onReady: (name) => post('ready', { pipeName: name }),
            onCiphertext: (text) => post('ciphertext', { text }),
            onLog: (level, message) => post('log', { level, message })
          });
          // startEmbedded 内部是 fire-and-forget：它挂起 _ioLoopDone，
          // 不会抛 Promise，但构造 / 早期同步路径仍可能抛出。
          core.startEmbedded(pipeName);
        } catch (e) {
          safeLog('error', `MessagePipeCore 启动失败: ${e?.stack || e?.message || e}`);
          // 构造或启动异常后 core 不可用，置空防止后续 stop 对半成品做操作
          core = null;
        }
        return;
      }

      if (msg.op === 'stop') {
        await stopCoreSafely();
        // 无论是否存在 core，都回一个 'stopped'，父侧 stop() 据此结束等待
        post('stopped');
      }
    })().catch((e) => {
      // async IIFE 的最后一道防线——上面两个分支里的任何异常都落到这里
      safeLog('error', `message handler 异常: ${e?.stack || e?.message || e}`);
    });
  });
}
