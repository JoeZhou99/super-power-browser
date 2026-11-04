// Native message-pipe transport adapted from rux-browser-master; protocol compatibility only.
const koffi = require('koffi');

/*
 * !!! 重要：本模块禁止 import 'net' / 'dns' / 'tls' / 'http' / 'https' 等任何会触发 Winsock 初始化的核心模块。!!!
 *
 * 背景（2026-04 实战故障）：
 *   带有 Astrill VPN 的机器上，ASProxy64.dll 作为 Winsock LSP 注入到所有进程。
 *   ASProxy 本应只 hook ws2_32 的 WSAxxx / socket / connect / accept 等函数；但实测它的 LSP 链
 *   会在某个调用上下文一旦触发 WSAStartup 后，往该线程的 IOCP 投递路径里插自己的钩子。
 *   我们的 Worker 这边正好同时在用 CreateIoCompletionPort + GetQueuedCompletionStatus
 *   做自建 IOCP，于是 ASProxy 的钩子在 Worker 线程拿到一个不属于自己的完成包，
 *   解引用 → 0xC0000005，整进程被 Worker 拽下来。
 *
 *   结论：Worker 线程必须保持"零 Winsock 触碰"。`net` 模块一旦在 Worker 中被实际使用
 *   （createConnection / createServer / Socket 构造）就会触发 WSAStartup，ASProxy 立即激活。
 *   因此本文件用 koffi 调 CreateFileW+CloseHandle 替代 net.createConnection，
 *   并连 import 也一起去掉，杜绝维护者无意中引入"似乎人畜无害"的 net 用法。
 *
 *   主进程这侧的 NamePipeService 仍可以使用 net（主进程已经是 Astrill 的稳态宿主）。
 */

const PIPE_ACCESS_DUPLEX = 0x00000003;
const FILE_FLAG_OVERLAPPED = 0x40000000;
const PIPE_TYPE_MESSAGE = 0x00000004;
const PIPE_READMODE_MESSAGE = 0x00000002;
const PIPE_WAIT = 0x00000000;
const PIPE_UNLIMITED_INSTANCES = 255;

const ERROR_IO_PENDING = 997;
const ERROR_BROKEN_PIPE = 109;
const ERROR_PIPE_CONNECTED = 535;
const ERROR_MORE_DATA = 234;
const ERROR_OPERATION_ABORTED = 995;
const ERROR_NO_DATA = 232;
const ERROR_INVALID_HANDLE = 6;
const WAIT_TIMEOUT = 258;

/** 同步完成的 ReadFile/WriteFile 不再向 IOCP 投递重复完成包（见 MSDN SetFileCompletionNotificationModes） */
const FILE_SKIP_COMPLETION_PORT_ON_SUCCESS = 1;

/** _wakePendingAccept 用 CreateFileW 打开管道做"短连唤醒"时使用的几个 Win32 常量（kernel32 / fileapi.h） */
const GENERIC_READ = 0x80000000 >>> 0;
const GENERIC_WRITE = 0x40000000;
const OPEN_EXISTING = 3;

const SDDL_REVISION_1 = 1;
const NAMED_PIPE_SDDL = 'D:(A;OICI;GRGW;;;WD)';

/** PostQueuedCompletionStatus 关机标记（与槽位索引 0..254 区分） */
const IOCP_SHUTDOWN_KEY = BigInt(0xffffffff);

/**
 * 平台相关的 INVALID_HANDLE_VALUE：
 *  Win32 定义为 (HANDLE)-1。对 koffi 而言，把 number `-1` 直接传给 `void *` 在 64 位平台
 *  容易触发"非有符号 BigInt 表达"歧义（不同 koffi 小版本行为不一致，曾观测到被零扩展为
 *  0x00000000FFFFFFFF —— 对内核来说是一个普通用户态地址，越权解引用即 0xC0000005）。
 *  因此显式给一个 BigInt 字面量，无歧义。
 */
const INVALID_HANDLE_VALUE = process.arch === 'ia32' || process.arch === 'x32'
  ? 0xffffffffn
  : 0xffffffffffffffffn;

let win32 = null;
/**
 * SECURITY_ATTRIBUTES 缓存。
 *  - undefined：尚未初始化
 *  - false：初始化失败，所有 CreateNamedPipeW 走默认 SA（lpSecurityAttributes = null）
 *  - { sa, pSD }：sa 是裸 Buffer（手写结构体），pSD 是 LocalAlloc 出来的 SD 指针（生命周期与进程同长）
 * @type {false | { sa: Buffer, pSD: number | bigint } | undefined}
 */
let cachedPipeSecurity = undefined;

function loadWin32() {
  const kernel32 = koffi.load('kernel32.dll');
  const advapi32 = koffi.load('advapi32.dll');
  return {
    CreateNamedPipeW: kernel32.func(
      'void * __stdcall CreateNamedPipeW(str16 lpName, uint32 dwOpenMode, uint32 dwPipeMode, uint32 nMaxInstances, uint32 nOutBufferSize, uint32 nInBufferSize, uint32 nDefaultTimeOut, void *lpSecurityAttributes)'
    ),
    ConnectNamedPipe: kernel32.func('int __stdcall ConnectNamedPipe(void *hNamedPipe, void *lpOverlapped)'),
    ReadFile: kernel32.func(
      'int __stdcall ReadFile(void *hFile, void *lpBuffer, uint32 nNumberOfBytesToRead, _Out_ uint32 *lpNumberOfBytesRead, void *lpOverlapped)'
    ),
    CloseHandle: kernel32.func('int __stdcall CloseHandle(void *hObject)'),
    GetLastError: kernel32.func('uint32 __stdcall GetLastError(void)'),
    CreateIoCompletionPort: kernel32.func(
      'void * __stdcall CreateIoCompletionPort(void *FileHandle, void *ExistingCompletionPort, uint64 CompletionKey, uint32 NumberOfConcurrentThreads)'
    ),
    GetQueuedCompletionStatus: kernel32.func(
      'int __stdcall GetQueuedCompletionStatus(void *CompletionPort, uint32 *lpNumberOfBytesTransferred, uint64 *lpCompletionKey, void **lpOverlapped, uint32 dwMilliseconds)'
    ),
    PostQueuedCompletionStatus: kernel32.func(
      'int __stdcall PostQueuedCompletionStatus(void *CompletionPort, uint32 dwNumberOfBytesTransferred, uint64 dwCompletionKey, void *lpOverlapped)'
    ),
    CancelIoEx: kernel32.func('int __stdcall CancelIoEx(void *hObject, void *lpOverlapped)'),
    SetFileCompletionNotificationModes: kernel32.func(
      'int __stdcall SetFileCompletionNotificationModes(void *FileHandle, uint8 Flags)'
    ),
    /**
     * CreateFileW 仅用于 _wakePendingAccept 做"短连唤醒"——纯 kernel32 文件路径，
     * 不会触发任何 Winsock 初始化（这是把 net.createConnection 从本模块清掉的关键替代）。
     * 失败返回 INVALID_HANDLE_VALUE，由 isInvalidHandle 统一识别。
     */
    CreateFileW: kernel32.func(
      'void * __stdcall CreateFileW(str16 lpFileName, uint32 dwDesiredAccess, uint32 dwShareMode, void *lpSecurityAttributes, uint32 dwCreationDisposition, uint32 dwFlagsAndAttributes, void *hTemplateFile)'
    ),
    ConvertStringSecurityDescriptorToSecurityDescriptorW: advapi32.func(
      'int __stdcall ConvertStringSecurityDescriptorToSecurityDescriptorW(str16 StringSecurityDescriptor, uint32 StringSDRevision, _Out_ void **SecurityDescriptor, void *SecurityDescriptorSize)'
    ),
    LocalFree: kernel32.func('void * __stdcall LocalFree(void *hMem)')
  };
}

function getWin32() {
  if (!win32) win32 = loadWin32();
  return win32;
}

/**
 * 判断从 koffi 拿回的 HANDLE 是否无效。
 *
 * 背景（这里是 0xC0000005 的主要诱因之一）：
 *  Windows 的 INVALID_HANDLE_VALUE 是 (HANDLE)-1：
 *    - x64：0xFFFFFFFFFFFFFFFF
 *    - x86：0xFFFFFFFF
 *  koffi 2.12 在 64 位平台对 `void *` 返回值倾向用「无符号 BigInt」表达，
 *  所以失败时拿回来的是 0xFFFFFFFFFFFFFFFFn 而**不是** -1n；
 *  Number 路径也可能给到 4294967295 / Infinity 等特殊值。
 *  旧版只判 -1 / -1n，会把假句柄当合法的传给 ReadFile/SetFileCompletionNotificationModes，
 *  内核解引用就直接 AV，表现为整进程 3221225477 退出。
 */
function isInvalidHandle(h) {
  if (h === null || h === undefined) return true;
  if (h === -1 || h === -1n) return true;
  if (h === 0 || h === 0n) return true;
  if (typeof h === 'bigint') {
    if (h < 0n) return true;
    if (h === 0xffffffffffffffffn) return true;
    return false;
  }
  if (typeof h === 'number') {
    if (!Number.isFinite(h)) return true;
    if (process.arch === 'ia32' || process.arch === 'x32') {
      if (h === 0xffffffff) return true;
    }
    return false;
  }
  return false;
}

function ptrSize() {
  return process.arch === 'ia32' || process.arch === 'x32' ? 4 : 8;
}

function readPtr(buf) {
  return buf.length === 8 ? buf.readBigUInt64LE(0) : buf.readUInt32LE(0);
}

function isNullPtr(p) {
  return p === 0 || p === 0n || p === null || p === undefined;
}

/**
 * 手写 SECURITY_ATTRIBUTES 结构体，不依赖 koffi.struct/alloc/encode。
 * 布局（C ABI）：
 *   x64：nLength@0(4) | pad@4(4) | lpSecurityDescriptor@8(8) | bInheritHandle@16(4) | pad@20(4) → 24
 *   x86：nLength@0(4) |              lpSecurityDescriptor@4(4) | bInheritHandle@8(4)         → 12
 * 把 pSD（BigInt 或 Number）按位写入指针字段，写入位置完全由我们控制，不会被 koffi 内部的
 * 结构体打包逻辑悄悄移位。
 */
function buildSecurityAttributesBuffer(pSD) {
  if (process.arch === 'ia32' || process.arch === 'x32') {
    const sa = Buffer.alloc(12);
    sa.writeUInt32LE(12, 0);
    sa.writeUInt32LE(typeof pSD === 'bigint' ? Number(pSD & 0xffffffffn) : Number(pSD) >>> 0, 4);
    sa.writeInt32LE(0, 8);
    return sa;
  }
  const sa = Buffer.alloc(24);
  sa.writeUInt32LE(24, 0);
  sa.writeBigUInt64LE(typeof pSD === 'bigint' ? pSD : BigInt(pSD), 8);
  sa.writeInt32LE(0, 16);
  return sa;
}

function getCreateNamedPipeSecurityAttributes(onLog) {
  if (cachedPipeSecurity === false) return null;
  if (cachedPipeSecurity) return cachedPipeSecurity.sa;

  const log = typeof onLog === 'function' ? onLog : () => { };

  const w = getWin32();
  try {
    const pp = Buffer.alloc(ptrSize());
    const ok = w.ConvertStringSecurityDescriptorToSecurityDescriptorW(NAMED_PIPE_SDDL, SDDL_REVISION_1, pp, null);
    if (!ok) {
      log('warn', `ConvertStringSecurityDescriptorToSecurityDescriptorW 失败: ${w.GetLastError()}，回退默认 SA`);
      cachedPipeSecurity = false;
      return null;
    }

    const pSD = readPtr(pp);
    if (isNullPtr(pSD)) {
      log('warn', '[SA] ConvertString... 返回空指针，回退默认 SA');
      cachedPipeSecurity = false;
      return null;
    }

    const sa = buildSecurityAttributesBuffer(pSD);
    cachedPipeSecurity = { sa, pSD };
    log('info', `[SA] SDDL 安全描述符就绪（pSD=${typeof pSD === 'bigint' ? '0x' + pSD.toString(16) : pSD}）`);
    return sa;
  } catch (e) {
    log('warn', `[SA] 构造异常，回退默认 SA: ${e?.message || e}`);
    cachedPipeSecurity = false;
    return null;
  }
}

function releaseNamedPipeSecurityDescriptor() {
  if (!cachedPipeSecurity || cachedPipeSecurity === false) return;
  const { pSD } = cachedPipeSecurity;
  try {
    getWin32().LocalFree(pSD);
  } catch (_) {
    /* ignore */
  }
  cachedPipeSecurity = undefined;
}

function parseNullTerminatedMessages(cache, chunk, onCiphertext) {
  const total = cache.length ? Buffer.concat([cache, chunk]) : chunk;
  let start = 0;
  while (true) {
    const end = total.indexOf(0x00, start);
    if (end === -1) break;
    const msg = total.subarray(start, end).toString('utf8').trim();
    if (msg && onCiphertext) onCiphertext(msg);
    start = end + 1;
  }
  return total.subarray(start);
}

/** 兼容旧导出：同步读循环（仅测试/降级） */
function runNamedPipeMessageReadLoop(pipeHandle, hooks = {}) {
  const { ReadFile, CloseHandle, GetLastError } = getWin32();
  const onCiphertext = typeof hooks.onCiphertext === 'function' ? hooks.onCiphertext : null;
  const onLog = typeof hooks.onLog === 'function' ? hooks.onLog : null;
  const shouldContinue = typeof hooks.shouldContinue === 'function' ? hooks.shouldContinue : () => true;
  const log = (level, msg) => onLog?.(level, String(msg));

  let cache = Buffer.alloc(0);
  try {
    while (shouldContinue()) {
      const readBuf = Buffer.alloc(4096);
      const bytesRead = new Uint32Array(1);
      const ok = ReadFile(pipeHandle, readBuf, readBuf.length, bytesRead, null);

      if (!ok) {
        const err = GetLastError();
        if (err !== ERROR_BROKEN_PIPE) log('warn', `[ReadFile] code=${err}`);
        break;
      }

      const n = bytesRead[0];
      if (n <= 0) break;

      cache = parseNullTerminatedMessages(cache, readBuf.subarray(0, n), onCiphertext);
    }

    if (cache.length > 0) {
      const tail = cache.toString('utf8').trim();
      if (tail && onCiphertext) onCiphertext(tail);
    }
  } catch (e) {
    log('error', `[读循环异常] ${e?.message || e}`);
  } finally {
    try {
      CloseHandle(pipeHandle);
    } catch (_) {
      /* ignore */
    }
  }
}

class PipeSlot {
  constructor(index) {
    this.index = index;
    /** @type {any} */
    this.hPipe = null;
    /**
     * OVERLAPPED 双缓冲：
     *  CancelIoEx + CloseHandle 后内核会异步把"取消完成包"投到 IOCP，且仍可能回写 OVERLAPPED.Internal。
     *  如果直接复用同一块 OV 立刻发起新的 ConnectNamedPipe / ReadFile，就会出现：
     *   - 旧 IO 的尾部回写 与 新 IO 的内核登记 同时改写同一块 OVERLAPPED；
     *   - IOCP 拉到一个携带"幽灵 ov 指针"的完成包，主循环按 slot.phase 又递归 recycle 新 handle。
     *  二选一轮换，旧 OV 即便内核还在写也跟新 IO 完全隔离。
     * @type {Buffer[]}
     */
    this.ovs = [Buffer.alloc(32), Buffer.alloc(32)];
    this.ovIdx = 0;
    this.readBuf = Buffer.alloc(65536);
    this.cache = Buffer.alloc(0);
    /** 'connect' | 'read' */
    this.phase = 'connect';
  }

  /** 当前对外暴露的 OVERLAPPED 缓冲（getter 兼容旧的 slot.ov / slot.ov.fill 用法） */
  get ov() {
    return this.ovs[this.ovIdx];
  }

  /**
   * 切换到另一块 OVERLAPPED 并清零，返回新的当前缓冲。
   * 调用时机：CancelIoEx + CloseHandle 之后、发起新 IO 之前。
   */
  rollOv() {
    this.ovIdx = 1 - this.ovIdx;
    const ov = this.ovs[this.ovIdx];
    ov.fill(0);
    return ov;
  }
}

/**
 * 单 Worker 线程内 IOCP 多路复用：PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE。
 *
 * 关于"客户端并发上限"：
 *  - 真正的硬上限是 Windows 内核：同名管道最多 255 个实例（PIPE_UNLIMITED_INSTANCES，
 *    传给 CreateNamedPipeW 的 nMaxInstances 已经是这个值）。
 *  - 初始预分配的 accept 槽位数由 NAMED_PIPE_ACCEPT_POOL 控制，默认 128，可调到 255。
 *  - 当并发客户端数超过当前池容量时，_ensureAcceptHeadroom 会在 connect→read 转换瞬间
 *    动态追加新槽位（直到 PIPE_UNLIMITED_INSTANCES），所以**实际可同时在线的客户端数等于
 *    Windows 内核上限 255**，而不是预分配池的大小。
 */
class MessagePipeCore {
  constructor(hooks = {}) {
    this.running = false;
    this.pipeName = '';
    this.onCiphertext = typeof hooks.onCiphertext === 'function' ? hooks.onCiphertext : null;
    this.onLog = typeof hooks.onLog === 'function' ? hooks.onLog : null;
    this.onReady = typeof hooks.onReady === 'function' ? hooks.onReady : null;
    this._readySent = false;
    /** @type {any} */
    this._iocp = null;
    /** @type {PipeSlot[]} */
    this._slots = [];
    this._acceptPool = 128;
    this._fullPipeName = '';
    /** @type {any} */
    this._saPtr = null;
    this._useSecurityFallback = false;
    this._ioLoopDone = null;
    /**
     * 是否成功开启了 `SetFileCompletionNotificationModes(FILE_SKIP_COMPLETION_PORT_ON_SUCCESS)`。
     *
     * 这个字段决定 _drainReads 的 ReadFile 同步成功（ok=true）路径如何处理：
     *  - true：内核保证 *不再* 投递 IOCP 完成包，必须由 _drainReads 自己 dispatch 数据并发起下一次读；
     *  - false：内核会投递一次完成包，**绝不能在 _drainReads 同步路径里 dispatch**——否则同一份 slot.readBuf
     *    会先被 _drainReads 解析一次，紧接着又被 _runIocpServer 主循环的 phase==='read' 分支再解析一次，
     *    且两次 ReadFile 在同一 slot 飞会让 OVERLAPPED 重叠，表现为"管道收消息高概率丢/串/重复"。
     *
     * 默认 false：装了 ASProxy/类似 LSP 的机器上 step3 是被强制跳过的（见 _beginAccept 注释），
     * 只有用户显式 `RUX_PIPE_USE_SFCNM=1` 且 step3 实际调用成功，才会被置 true。
     */
    this._iocpSkipOnSuccess = false;
  }

  _log(level, msg) {
    this.onLog?.(level, String(msg));
  }

  _computeAcceptPool() {
    const env = Number(process.env.NAMED_PIPE_ACCEPT_POOL);
    if (Number.isFinite(env) && env > 0) return Math.min(PIPE_UNLIMITED_INSTANCES, Math.floor(env));
    // 历史背景：曾经临时把默认压到 8 是为了在排查 0xC0000005（ASProxy64.dll 钩子）时减小
    // 启动期连续 native 调用的故障域；崩点已经定位 + 修复（step3 默认跳过 + 子进程隔离 +
    // _drainReads 路径分流），不再需要刻意压低初始池。
    //
    // 现在恢复 128 作为默认值：覆盖绝大多数业务场景；若出现并发超过 128 的瞬时峰值，
    // _ensureAcceptHeadroom 会在 connect→read 转换瞬间动态扩池，直到 Windows 内核硬上限 255。
    // 想直接顶到上限，可通过 `NAMED_PIPE_ACCEPT_POOL=255` 设置。
    return 128;
  }

  /**
   * 当前处于"等连接"状态、且句柄合法的 slot 数量。
   * 只统计 phase==='connect' 且已有 hPipe 的（即 _beginAccept 已经走完成功路径），
   * 那些 _beginAccept 进行到一半还没 set hPipe 的 slot 也按"在路上"算（凭借 phase==='connect'）。
   */
  _countIdleAcceptors() {
    let n = 0;
    for (const s of this._slots) {
      if (s && s.phase === 'connect' && s.hPipe && !isInvalidHandle(s.hPipe)) n++;
    }
    return n;
  }

  /**
   * 动态扩池：保证至少 headroom（默认 1）个空闲 acceptor 在等下一个客户端。
   *
   * 触发时机：每当一个 slot 从 connect 转 read（即客户端接进来了，accept 容量被消耗 1）。
   * 上限：_slots 总数不会超过 PIPE_UNLIMITED_INSTANCES (255)，这是 Windows 内核侧硬上限。
   *
   * 注意：本函数 fire-and-forget——_beginAccept 内部已经做了完整异常兜底，外部不需要 await，
   * 也不能 await：调用点是 IOCP 主循环，await 会卡住其它槽位的事件分发。
   */
  _ensureAcceptHeadroom(w, headroom = 1) {
    if (!this.running) return;
    if (!this._iocp || isInvalidHandle(this._iocp)) return;
    if (this._slots.length >= PIPE_UNLIMITED_INSTANCES) return;
    const idle = this._countIdleAcceptors();
    if (idle >= headroom) return;
    const need = Math.min(headroom - idle, PIPE_UNLIMITED_INSTANCES - this._slots.length);
    for (let i = 0; i < need; i++) {
      const slot = new PipeSlot(this._slots.length);
      this._slots.push(slot);
      // 不 await：单个 _beginAccept 不会抛到外面（内部已 try/catch），且我们不能在 IOCP
      // 主循环里阻塞等待 I/O 投递。
      this._beginAccept(slot, w, this._fullPipeName).catch((e) => {
        this._log('warn', `动态扩池 _beginAccept 异常 idx=${slot.index}: ${e?.message || e}`);
      });
    }
  }

  /**
   * 停止 IOCP 循环。
   * 不 await：真正的资源回收发生在 _runIocpServer 的 while 跳出后（_closeAllSlots + CloseHandle(iocp)）。
   * 组合三步确保无论阻塞在哪一步都能被唤醒：
   *  1. running=false：主循环下一轮会自然退出；
   *  2. _wakeIocpShutdown：投递 IOCP_SHUTDOWN_KEY 的完成包，让正在 GQCS 等待的线程立即返回；
   *  3. _wakePendingAccept：对本地管道短连一次，让阻塞在 ConnectNamedPipe 的槽位收到连接并回到 JS 调度。
   */
  stop() {
    this.running = false;
    this._wakeIocpShutdown();
    this._wakePendingAccept();
  }

  /**
   * setImmediate 里若写成 `setImmediate(() => void this._drainReads(...))`，
   * _drainReads 作为 async 函数一旦 reject，会直接变成 Node 的 unhandledRejection
   * —— 对没有全局 handler 的 Worker 而言等价于进程崩溃。
   * 统一走这里 + .catch 记录日志，是本次稳定性改造最关键的一处收敛。
   */
  _scheduleDrain(slot, w) {
    setImmediate(() => {
      this._drainReads(slot, w).catch((e) => {
        this._log('error', `_drainReads 异常: ${e?.stack || e?.message || e}`);
      });
    });
  }

  /**
   * 与 _scheduleDrain 成对的回收版本；
   * _runIocpServer 里少数分支会异步调用 _recycleSlot，同样不能让其拒绝未捕获。
   */
  _scheduleRecycle(slot, w) {
    setImmediate(() => {
      this._recycleSlot(slot, w).catch((e) => {
        this._log('error', `_recycleSlot 异常: ${e?.stack || e?.message || e}`);
      });
    });
  }

  _wakeIocpShutdown() {
    try {
      const w = getWin32();
      if (!this._iocp || isInvalidHandle(this._iocp)) return;
      w.PostQueuedCompletionStatus(this._iocp, 0, IOCP_SHUTDOWN_KEY, null);
    } catch (_) {
      /* ignore */
    }
  }

  /**
   * 退出期对本地管道做一次"短连接"，唤醒挂在 ConnectNamedPipe 上的 accept 槽位。
   *
   * 历史实现用的是 `net.createConnection(\\\\.\\pipe\\xxx, ...)`，简洁但代价是会触发
   * Worker 线程内的 Winsock 初始化（WSAStartup），从而把 ASProxy64.dll 这类 Winsock LSP
   * 的钩子激活到本 Worker 的 IOCP 投递路径上——对方一旦在 Worker 线程拿到一个我们自建
   * IOCP 端口的完成包，解引用即 0xC0000005。本模块顶部的注释里有详细的事故记录。
   *
   * 现在改为直接 koffi 调 CreateFileW + CloseHandle：
   *  - 全程在 kernel32 文件 API 上走，不进 ws2_32；
   *  - Worker 线程从此与 Winsock 子系统毫无瓜葛，ASProxy 在该上下文保持休眠；
   *  - 语义不变：只要句柄"开成功 → 立刻关掉"，对端 ConnectNamedPipe 就会收到一次"客户端连入"事件。
   *
   * 唤醒次数：取当前 _slots.length（包含动态扩池后追加的槽位）和 4 的较大值，
   * 上限 32——超过 32 个挂起槽全部唤醒一遍意义不大，每次 stop() 多发几个握手成本太高，
   * 真正没被 wake 到的少数槽位会在 _runIocpServer 退出时由 _closeAllSlots 走 CancelIoEx 兜底。
   */
  _wakePendingAccept() {
    if (!this.pipeName) return;
    let w;
    try {
      w = getWin32();
    } catch (e) {
      this._log('warn', `_wakePendingAccept getWin32 失败: ${e?.message || e}`);
      return;
    }
    const fullName = `\\\\.\\pipe\\${this.pipeName}`;
    const desiredAccess = (GENERIC_READ | GENERIC_WRITE) >>> 0;
    const slotCount = this._slots?.length || this._acceptPool || 8;
    const attempts = Math.min(Math.max(slotCount, 4), 32);
    for (let i = 0; i < attempts; i++) {
      let h;
      try {
        h = w.CreateFileW(fullName, desiredAccess, 0, null, OPEN_EXISTING, 0, null);
      } catch (_) {
        // 唤醒失败不致命：主循环还有 PostQueuedCompletionStatus 兜底
        continue;
      }
      if (isInvalidHandle(h)) continue;
      try {
        w.CloseHandle(h);
      } catch (_) {
        /* ignore */
      }
    }
  }

  /**
   * 启动 IOCP 主循环（fire-and-forget）。
   * 返回 void：外层不能 await 整个循环结束，只能 await waitForIoLoopEnd()。
   * 全部初始化路径都必须在这里做好异常兜底——一旦 Worker 里任何一步抛到顶层，
   * 都是"客户端启动时起不来管道"这条事故链的直接诱因。
   */
  startEmbedded(pipeName) {
    this.pipeName = String(pipeName || '');
    this._fullPipeName = `\\\\.\\pipe\\${this.pipeName}`;
    this.running = true;
    this._readySent = false;
    this._acceptPool = this._computeAcceptPool();
    // 每次 startEmbedded 都重置；_beginAccept 第一次 step3 成功才会置回 true
    this._iocpSkipOnSuccess = false;

    // 关键阶段日志：以前发生 0xC0000005 时 Worker 这边一行日志都来不及发就死了，
    // 加上 step 标签后下次崩溃可以直接从主进程日志里看到死在哪一步。
    this._log('info', `[boot] startEmbedded enter pipe=${this.pipeName} pool=${this._acceptPool} arch=${process.arch}`);

    // getCreateNamedPipeSecurityAttributes 内部已 try 过 koffi，但 koffi 首次加载 advapi32.dll
    // 在某些杀软/精简系统上会同步抛"加载失败"。这里再兜一层，缺失 SA 时回退默认权限（见 _beginAccept 的 fallback 分支）。
    try {
      this._saPtr = getCreateNamedPipeSecurityAttributes((level, msg) => this._log(level, msg));
    } catch (e) {
      this._log('warn', `初始化安全描述符异常，走默认权限: ${e?.message || e}`);
      this._saPtr = null;
    }
    this._useSecurityFallback = false;
    this._log('info', `[boot] SA prepared, hasCustomSA=${!!this._saPtr}`);

    // 用 Promise.resolve().then(...) 而不是直接调用 async 函数，目的是把 _runIocpServer
    // 的同步阶段（kernel32 加载、CreateIoCompletionPort 等）也纳入同一条 Promise 链，
    // 保证任何阶段的异常都能被下面的 .catch 捕获，绝不会冒泡成 Worker 的未捕获拒绝。
    this._ioLoopDone = Promise.resolve()
      .then(() => this._runIocpServer())
      .catch((e) => {
        // 主循环出错后必须 running=false，否则 stop() 的 PostQueuedCompletionStatus
        // 无处投递，waitForIoLoopEnd 也会误以为还在工作。
        this.running = false;
        this._log('error', `[IOCP] ${e?.stack || e?.message || e}`);
      });
  }

  /** Worker 退出前可 await，确保 native 句柄已关闭 */
  async waitForIoLoopEnd() {
    if (this._ioLoopDone) {
      try {
        await this._ioLoopDone;
      } catch (_) {
        /* ignore */
      }
    }
  }

  async _runIocpServer() {
    this._log('info', '[boot] _runIocpServer enter, loading win32...');
    const w = getWin32();
    const fullName = this._fullPipeName;
    this._log('info', '[boot] win32 loaded, calling CreateIoCompletionPort(NEW)...');

    // 注意：必须用平台相关的 BigInt INVALID_HANDLE_VALUE，不能用 number `-1`。
    // 见模块顶部 INVALID_HANDLE_VALUE 注释——number `-1` 在 koffi/Electron35 组合下曾观测到被
    // 零扩展为 0x00000000FFFFFFFF（即 4GB 用户态地址），CreateIoCompletionPort 内部解析该
    // "FileHandle" 时会触发越界 → 0xC0000005。
    let iocp;
    try {
      iocp = w.CreateIoCompletionPort(INVALID_HANDLE_VALUE, null, BigInt(0), 0);
    } catch (e) {
      this._log('error', `[boot] CreateIoCompletionPort(NEW) 调用异常: ${e?.message || e}`);
      return;
    }
    if (isInvalidHandle(iocp)) {
      this._log('error', `CreateIoCompletionPort 失败: ${w.GetLastError()}`);
      return;
    }
    this._iocp = iocp;
    this._log('info', `[boot] IOCP created, allocating ${this._acceptPool} slots...`);

    this._slots = [];
    for (let i = 0; i < this._acceptPool; i++) {
      this._slots.push(new PipeSlot(i));
    }

    const postAllAccepts = async () => {
      for (const slot of this._slots) {
        if (!this.running) return;
        if (slot.index === 0) this._log('info', '[boot] beginAccept slot#0 start...');
        await this._beginAccept(slot, w, fullName);
        if (slot.index === 0) {
          this._log(
            'info',
            `[boot] beginAccept slot#0 done, hPipe=${slot.hPipe ? 'set' : 'null'} phase=${slot.phase}`
          );
        }
      }
    };

    await postAllAccepts();

    if (!this._slots.some((s) => s.hPipe && !isInvalidHandle(s.hPipe))) {
      this._log('error', '未能创建任何命名管道实例，尝试回退默认安全描述符');
      this._useSecurityFallback = true;
      this._saPtr = null;
      this._slots.forEach((s) => {
        s.hPipe = null;
        s.phase = 'connect';
      });
      await postAllAccepts();
    }

    if (!this._readySent) {
      this._readySent = true;
      this.onReady?.(this.pipeName);
    }

    // GQCS 输出参数：
    // - bytesTransferred / completionKey 用 TypedArray，koffi 可以把 uint32*/uint64* 直接写进来；
    // - ovOut 是 void** 的出参，但我们实际只关心 key + bytes，所以不去读它。
    // 三个缓冲都在循环外 alloc、循环内 fill(0) 复用，避免每轮 GC 压力。
    const bytesTransferred = new Uint32Array(1);
    const completionKey = new BigUint64Array(1);
    const ovOut = Buffer.alloc(ptrSize());

    /**
     * 关于 dwMilliseconds 的选择：
     * - 不能用 INFINITE：会把 Worker 的 JS 线程占死，setImmediate 调度的"同步完成后续读"永远不会执行。
     * - 也不能一直 0ms 忙轮询：空闲时 Worker 会吃满 1 个核心，表现为"打开客户端后风扇狂转 + UI 卡顿"。
     * 采取折中：0ms 轮询 + 指数退避。有事件时立即响应，空闲时逐步放宽到 25ms/次。
     *
     * 历史教训：旧实现是"前 8 次 setImmediate + 然后才开始 2/4/8/16ms 退避"，
     * 看似只是加快了事件响应，实际上 idleTicks 会在每条真事件后重置为 0，
     * 于是在中低频负载（10~100 msg/s，比如多标签上报/指纹刷新）下几乎永远到不了第 8 次，
     * 表现为"每消息多 7 次 GQCS 内核态 syscall"——2 个 Worker 叠加起来 CPU 被放大成倍，
     * 是 issue 里"系统 CPU 暴涨"的主要诱因。现在把快轮询压缩到 1 次，靠稳态 25ms 封顶压低 idle 底噪。
     */
    let idleTicks = 0;
    const yieldTick = () => new Promise((r) => setImmediate(r));
    const yieldSleep = (ms) => new Promise((r) => setTimeout(r, ms));

    while (true) {
      // 双保险：外部 stop() 可能已经走了，但关停包还没到；这里先用 JS 标志短路跳出
      if (!this.running) {
        // stop() 已通过 PostQueuedCompletionStatus 投递关停键；兜底退出
        break;
      }

      bytesTransferred[0] = 0;
      completionKey[0] = BigInt(0);
      ovOut.fill(0);

      let gq = false;
      let err = 0;
      try {
        gq = !!w.GetQueuedCompletionStatus(iocp, bytesTransferred, completionKey, ovOut, 0);
        err = w.GetLastError();
      } catch (e) {
        // koffi 调用理论上不应抛，但如果 DLL 被替换/权限问题导致抛出，
        // 绝不能让它打破主循环——否则该 Worker 之后就不会再处理任何管道事件了。
        this._log('error', `GetQueuedCompletionStatus 异常: ${e?.message || e}`);
        await yieldSleep(10);
        continue;
      }

      if (!gq && err === WAIT_TIMEOUT) {
        // 空闲节拍：
        //  - 第 1 次 setImmediate 让刚刚 _scheduleDrain 投进来的 drain 回调优先被 flush，
        //    保证真有数据时"读同步完成 → 继续读下一轮"链条不被退避打断；
        //  - 从第 2 次开始进入 1/2/4/8/16/25ms 指数退避，稳态封顶 25ms（≈40 polls/s）。
        // 这比旧实现的 "7 次空 yield + 16ms 封顶" 对低频负载友好得多：
        // 每处理一条真事件只额外产生 1 次 GQCS 内核态 syscall，而不是 7 次。
        idleTicks++;
        if (idleTicks < 2) {
          await yieldTick();
        } else {
          const ms = Math.min(25, 1 << Math.min(5, idleTicks - 2));
          await yieldSleep(ms);
        }
        continue;
      }
      idleTicks = 0;

      const key = completionKey[0];
      if (key === IOCP_SHUTDOWN_KEY) {
        // stop() 投递的显式关停包
        break;
      }

      if (!gq) {
        if (err === WAIT_TIMEOUT) continue;
        // IOCP 句柄已失效（通常意味着外部提前 CloseHandle），无法恢复，直接退出
        if (err === ERROR_INVALID_HANDLE) break;
        // key=0 的 gq=false 一律视为伪唤醒：
        //  - err != 0：虚假唤醒或外部投递的空完成包；
        //  - err == 0：系统/外部 PostQueuedCompletionStatus(0, NULL, 0, NULL) 等 spurious wake。
        // 旧代码仅判 err!=0，漏了 err==0 的分支，会让 idx=0 的 slot 0 被误判为"失败完成"而触发回收，
        // 结果是 slot 0 被无端 CloseHandle + 重新 CreateNamedPipeW，CPU/日志双重抖动。
        if (key === BigInt(0)) {
          if (!this.running) break;
          continue;
        }
      }

      // key 实际存的是槽位索引（_beginAccept 关联时用 BigInt(slot.index)）
      const idx = Number(key);
      if (!Number.isFinite(idx) || idx < 0 || idx >= this._slots.length) {
        // 防御：越界 / 非法 key 不应该出现，出现也不能让循环崩
        continue;
      }
      const slot = this._slots[idx];
      if (!slot) continue;

      if (!gq) {
        // 失败完成：按 phase 分流
        //  - read 阶段的断开/取消是正常生命周期，回收重新 accept；
        //  - connect 阶段出错一律回收，换一个新的 NamedPipe 实例重挂。
        if (slot.phase === 'read' && (err === ERROR_BROKEN_PIPE || err === ERROR_NO_DATA || err === ERROR_OPERATION_ABORTED)) {
          await this._recycleSlot(slot, w).catch((e) => this._log('warn', `recycle(read-err): ${e?.message || e}`));
        } else if (slot.phase === 'connect') {
          await this._recycleSlot(slot, w).catch((e) => this._log('warn', `recycle(connect-err): ${e?.message || e}`));
        }
        continue;
      }

      if (slot.phase === 'connect') {
        // 连接完成：进入 read 阶段，通过 setImmediate 发起第一次 ReadFile。
        // 不能在这里同步调用 _drainReads——那样会把 IOCP 主循环锁死在一个 slot 上。
        slot.phase = 'read';
        this._scheduleDrain(slot, w);
        // 这个 slot 刚被消费，accept 容量减 1；如果池里没有空闲 acceptor 了就扩一个，
        // 直到 Windows 内核硬上限 PIPE_UNLIMITED_INSTANCES (255)。这样并发客户端数完全不被
        // 初始池大小限制。
        this._ensureAcceptHeadroom(w);
        continue;
      }

      if (slot.phase === 'read') {
        const n = bytesTransferred[0];
        if (n === 0) {
          // 0 字节完成意味着对端已有序关闭，回收重挂
          await this._recycleSlot(slot, w).catch((e) => this._log('warn', `recycle(n=0): ${e?.message || e}`));
          continue;
        }
        // 解析+派发放 try/catch：onCiphertext 是用户注入的回调，不可信，
        // 它抛出不能中断整个 IOCP 循环。
        try {
          this._appendAndDispatchMessages(slot, n);
        } catch (e) {
          this._log('error', `分发消息异常: ${e?.message || e}`);
        }
        this._scheduleDrain(slot, w);
      }
    }

    // ---- 走到这里说明主循环即将退出：统一回收资源 ----
    this.running = false;
    try {
      // _closeAllSlots 内部会 CancelIoEx + CloseHandle 每一个 slot.hPipe
      await this._closeAllSlots(w);
    } catch (e) {
      this._log('warn', `关闭槽位异常: ${e?.message || e}`);
    }
    try {
      w.CloseHandle(iocp);
    } catch (_) {
      /* ignore */
    }
    this._iocp = null;
  }

  _appendAndDispatchMessages(slot, n) {
    const chunk = slot.readBuf.subarray(0, n);
    slot.cache = parseNullTerminatedMessages(slot.cache, chunk, (m) => this.onCiphertext?.(m));
  }

  /**
   * 读循环（每次只发起一次 ReadFile）。
   *
   * 设计原则：
   *  - 不循环调用 ReadFile，而是"同步完成后用 setImmediate 递归"，
   *    否则 Worker 的 JS 线程会被单个 slot 的高频数据完全占据，其他 slot/消息都处理不到。
   *  - 所有 kernel32 调用都包在 try/catch 内——即便 koffi 抛出，也只让当前 slot 回收，不污染主循环。
   */
  async _drainReads(slot, w) {
    // 进入点的状态校验：stop()/recycle() 可能已经改变 phase 或释放句柄
    if (!this.running || !slot || slot.phase !== 'read' || !slot.hPipe || isInvalidHandle(slot.hPipe)) return;

    // 把 hPipe 取一份本地副本：本函数中所有 native 调用都用 h，不再二次访问 slot.hPipe。
    // 否则在 await/koffi 调用之间，_recycleSlot 把 slot.hPipe 置 null + CloseHandle 后，
    // 我们这里仍可能拿着新 slot.hPipe（已是另一个 pipe）误调，或对已关 handle 再 ReadFile，
    // 这两种情况都是 0xC0000005 的高发路径。
    const h = slot.hPipe;

    slot.ov.fill(0);
    const br = new Uint32Array(1);

    let ok = false;
    let err = 0;
    try {
      ok = !!w.ReadFile(h, slot.readBuf, slot.readBuf.length, br, slot.ov);
      if (!ok) err = w.GetLastError();
    } catch (e) {
      // koffi 路径异常：把当前 slot 视为损坏，回收后重新 accept。
      // 不向外抛：调用方是 _scheduleDrain，的确会 .catch，但那只是兜底；
      // 这里就地处理更精确，避免误把个别 slot 故障升级为"整体循环报警"。
      this._log('error', `ReadFile 调用异常: ${e?.message || e}`);
      await this._recycleSlot(slot, w);
      return;
    }

    if (ok) {
      // 同步完成（通常是消息已经在内核 buffer 里，零拷贝返回）
      //
      // **必须区分内核是否会再投递一次 IOCP 完成包**：
      //  - 开启了 SetFileCompletionNotificationModes(FILE_SKIP_COMPLETION_PORT_ON_SUCCESS)
      //    且调用成功 (this._iocpSkipOnSuccess === true)：内核 *不* 投完成包，本路径独家处理；
      //  - 未开启或调用失败 (this._iocpSkipOnSuccess === false)：内核 *会* 投一次完成包，
      //    `_runIocpServer` 主循环 phase==='read' 分支会把这同一份字节再处理一遍。
      //    这种情况下我们 **绝对不能** 在这里 dispatch 或递归 _scheduleDrain，否则：
      //      1) 同一份 slot.readBuf 会被 _appendAndDispatchMessages 解析两次（cache 重复 append、
      //         上层收到重复消息）；
      //      2) 我们抢先发起的下一次 ReadFile 与 IOCP 主循环再发起的下一次 ReadFile 在同一 slot
      //         上同时飞，OVERLAPPED / readBuf 全部重叠，表现为"管道收发高概率不行"。
      //    正确做法是：什么都不做地返回，把所有 dispatch 和后续 ReadFile 投递的责任全部交给
      //    IOCP 主循环——它会按 phase==='read' 分支拿同一组 (n, slot) 处理，结果一致。
      const n = br[0];
      if (n === 0) {
        // 0 字节同步完成 = 对端 graceful close。
        // - skip-on-success 开：完成包不会来，必须就地 recycle；
        // - skip-on-success 关：完成包会来一个 (gq=true, n=0) 由主循环 recycle，重复 recycle 会安全幂等
        //   （recycleSlot 内部对已 null 的 hPipe 直接返回），所以这里也可以提前 recycle，但保守起见
        //   只有 skip 开时才主动 recycle，避免与主循环并发回收同一个 slot。
        if (this._iocpSkipOnSuccess) {
          await this._recycleSlot(slot, w);
        }
        return;
      }
      if (this._iocpSkipOnSuccess) {
        try {
          this._appendAndDispatchMessages(slot, n);
        } catch (e) {
          // onCiphertext 抛出不能拖垮读循环
          this._log('error', `分发消息异常: ${e?.message || e}`);
        }
        // 让出事件循环，再读下一轮，保证其它 slot/IO 也能被调度到
        this._scheduleDrain(slot, w);
        return;
      }
      // 未开 skip-on-success：把 dispatch + 下一次 ReadFile 完全交给 IOCP 主循环
      return;
    }

    // 异步完成挂起：IOCP 会在数据到达后投递完成包，由 _runIocpServer 继续推进
    if (err === ERROR_IO_PENDING) return;

    if (err === ERROR_MORE_DATA) {
      // 当前消息比 readBuf 大（65536B），先把已读部分派发，再继续读余下部分
      const n2 = br[0];
      if (n2 > 0) {
        try {
          this._appendAndDispatchMessages(slot, n2);
        } catch (e) {
          this._log('error', `分发消息异常(MORE_DATA): ${e?.message || e}`);
        }
      }
      this._scheduleDrain(slot, w);
      return;
    }

    // 以下四种都属于"连接已无法继续使用"，统一回收槽位并重新 accept。
    // 新增 ERROR_INVALID_HANDLE：实战里发现外部 CancelIoEx 时偶发，不加会走到下面的 warn+recycle，
    // 日志里误报"ReadFile 失败"，不利于排查。
    if (err === ERROR_BROKEN_PIPE || err === ERROR_NO_DATA || err === ERROR_OPERATION_ABORTED || err === ERROR_INVALID_HANDLE) {
      await this._recycleSlot(slot, w);
      return;
    }

    this._log('warn', `ReadFile 失败: ${err}`);
    await this._recycleSlot(slot, w);
  }

  /**
   * 为单个 slot 创建一个新的 NamedPipe 实例并挂上 IOCP，然后发起 ConnectNamedPipe。
   * 成功路径有三种：
   *  1. ConnectNamedPipe 同步返回 TRUE（客户端已连上）→ 直接进入 read 阶段；
   *  2. 返回 FALSE + ERROR_IO_PENDING → 正常异步等待，由 IOCP 主循环驱动；
   *  3. 返回 FALSE + ERROR_PIPE_CONNECTED → 客户端在我们 Connect 之前已经连上，视同 1。
   * 其余都按失败处理，释放 pipe 句柄，等 _recycleSlot 后续再发起。
   */
  async _beginAccept(slot, w, fullName) {
    // 多重防御：stop() 之后的残余 setImmediate 仍可能调进来
    if (!this.running || !slot) return;
    if (!this._iocp || isInvalidHandle(this._iocp)) return;
    slot.ov.fill(0);

    // 仅 slot#0 的首次 accept 详细打 step 日志，避免高负载时日志被淹没。
    // 出现 0xC0000005 时这条日志能让我们直接定位死在哪一个 native 调用。
    const verbose = slot.index === 0 && !this._readySent;

    // ---- 1. 创建 NamedPipe 实例 ----
    let pipe = null;
    try {
      if (verbose) this._log('info', '[boot] step1 CreateNamedPipeW...');
      pipe = w.CreateNamedPipeW(
        fullName,
        PIPE_ACCESS_DUPLEX | FILE_FLAG_OVERLAPPED,
        PIPE_TYPE_MESSAGE | PIPE_READMODE_MESSAGE | PIPE_WAIT,
        PIPE_UNLIMITED_INSTANCES,
        65536, // outBuf 大小
        65536, // inBuf 大小
        0,
        this._useSecurityFallback ? null : this._saPtr
      );
      if (verbose) this._log('info', `[boot] step1 done, pipe=${typeof pipe}`);
    } catch (e) {
      // koffi 调用异常（极少见），当次 accept 失败，等下一次 _recycleSlot 再试
      this._log('error', `CreateNamedPipeW 调用异常: ${e?.message || e}`);
      return;
    }

    if (isInvalidHandle(pipe)) {
      // 常见原因：同名管道实例数达到上限（255）、权限不足、SA 无效
      const e = w.GetLastError();
      this._log('warn', `CreateNamedPipeW 失败: ${e}`);
      return;
    }

    // ---- 2. 将 pipe 关联到 IOCP ----
    // CompletionKey 使用 slot.index，这样完成包回来时 key=idx 就能直接路由到正确 slot。
    let assoc = null;
    try {
      if (verbose) this._log('info', '[boot] step2 CreateIoCompletionPort(assoc)...');
      assoc = w.CreateIoCompletionPort(pipe, this._iocp, BigInt(slot.index), 0);
      if (verbose) this._log('info', '[boot] step2 done');
    } catch (e) {
      this._log('error', `CreateIoCompletionPort(关联) 调用异常: ${e?.message || e}`);
      // 关联失败必须立刻关闭 pipe，否则句柄泄漏
      try { w.CloseHandle(pipe); } catch (_) { /* ignore */ }
      return;
    }
    if (isInvalidHandle(assoc)) {
      this._log('error', `CreateIoCompletionPort(关联) 失败: ${w.GetLastError()}`);
      try {
        w.CloseHandle(pipe);
      } catch (_) {
        /* ignore */
      }
      return;
    }

    // ---- 3. 优化：同步完成时跳过 IOCP 投递 ----
    //
    // 这是 *纯性能优化*：开了之后 ReadFile/WriteFile 同步成功就不再投 IOCP 完成包，
    // 高并发下能减少冗余唤醒；关掉只是 IOCP 队列里多走一遍，对功能正确性零影响。
    //
    // **2026-04 强制默认跳过**：在装了 Astrill VPN 的机器上，调用
    // `SetFileCompletionNotificationModes` 这一刻会触发 ASProxy64.dll 钩子，
    // 然后以 0xC0000005（STATUS_ACCESS_VIOLATION）把整个进程拉下——崩点已通过
    // [boot] step3 入口/出口日志精确定位到这一行，进程从未到达 step4。
    //
    // chromium 浏览器自身的命名管道实现不调用这个 API，因此 ASProxy 大概率把它当作
    // "非浏览器路径"特殊处理，hook 内部对我们自建的 IOCP 端口做了非法解引用。
    //
    // 保留 RUX_PIPE_USE_SFCNM=1 给环境干净的用户开启优化（CI / 没装 LSP 的机器）。
    if (process.env.RUX_PIPE_USE_SFCNM === '1') {
      try {
        if (verbose) this._log('info', '[boot] step3 SetFileCompletionNotificationModes (enabled by env)...');
        // 必须看返回值：API 返回 BOOL，FALSE 表示失败。失败时不能把 _iocpSkipOnSuccess 置 true，
        // 否则 _drainReads 会按"内核不会再投完成包"的语义跑，但实际上完成包还会来——
        // 结果就是双重 dispatch + 双 ReadFile 飞，正是用户报的"管道收发高概率不行"。
        const ret = w.SetFileCompletionNotificationModes(pipe, FILE_SKIP_COMPLETION_PORT_ON_SUCCESS);
        if (ret) {
          this._iocpSkipOnSuccess = true;
          if (verbose) this._log('info', '[boot] step3 done (skip-on-success enabled)');
        } else if (verbose) {
          this._log('warn', `[boot] step3 SetFileCompletionNotificationModes 返回 FALSE，err=${w.GetLastError()}；保持 IOCP 单路径`);
        }
      } catch (e) {
        // koffi 抛异常或 native AV 都按"未启用"处理，让 _drainReads 走 IOCP 单路径，绝对安全
        if (verbose) this._log('warn', `[boot] step3 调用异常: ${e?.message || e}；保持 IOCP 单路径`);
      }
    } else if (verbose) {
      this._log(
        'info',
        '[boot] step3 已跳过 SetFileCompletionNotificationModes（避开 ASProxy64 hook，set RUX_PIPE_USE_SFCNM=1 重新启用）'
      );
    }

    // ---- 4. 发起 ConnectNamedPipe ----
    // 关键：在 ConnectNamedPipe 真正"投出去"（同步成功 / 已连 / IO_PENDING）之前**不**写 slot.hPipe，
    // 否则一旦该步抛异常或返回不可恢复错误，外层 setImmediate 里的 _drainReads 拿到的 slot.hPipe
    // 会是一个我们紧接着就要 CloseHandle 的 pipe，从而对已关 handle 调 ReadFile / 双重 CloseHandle，
    // 直接命中 0xC0000005。
    let ok = false;
    let connErr = 0;
    try {
      if (verbose) this._log('info', '[boot] step4 ConnectNamedPipe...');
      ok = !!w.ConnectNamedPipe(pipe, slot.ov);
      if (!ok) connErr = w.GetLastError();
      if (verbose) this._log('info', `[boot] step4 done ok=${ok} err=${connErr}`);
    } catch (e) {
      this._log('error', `ConnectNamedPipe 调用异常: ${e?.message || e}`);
      try { w.CloseHandle(pipe); } catch (_) { /* ignore */ }
      return;
    }

    // 成功路径 1：同步完成；成功路径 3：客户端已抢先连上（合并处理）
    if (ok || connErr === ERROR_PIPE_CONNECTED) {
      slot.hPipe = pipe;
      slot.phase = 'read';
      this._scheduleDrain(slot, w);
      // 这条同步路径绕过了 IOCP 主循环的 connect→read 分支，需要在这里同样触发动态扩池，
      // 否则启动初期 N 个客户端瞬时全连上时，池子永远停在初始大小。
      this._ensureAcceptHeadroom(w);
      return;
    }

    // 成功路径 2：异步挂起，等 IOCP 完成包
    if (connErr === ERROR_IO_PENDING) {
      slot.hPipe = pipe;
      slot.phase = 'connect';
      return;
    }

    // 其它都按失败处理：还没把 pipe 暴露给 slot，关掉自己持有的 pipe 即可
    this._log('warn', `ConnectNamedPipe 失败: ${connErr}`);
    try {
      w.CloseHandle(pipe);
    } catch (_) {
      /* ignore */
    }
  }

  /**
   * 回收一个 slot：
   *  1. 取消挂起的 IO（CancelIoEx）；
   *  2. 关闭 pipe 句柄（CloseHandle）；
   *  3. 清空 slot 上的缓存与 OVERLAPPED；
   *  4. 若服务仍在运行，立刻用这个空 slot 发起一次新的 accept，保持总接入能力不变。
   */
  async _recycleSlot(slot, w) {
    if (!slot) return;
    // 关键顺序：先把 slot.hPipe 摘下来再做 native 调用，避免本函数还在 CancelIoEx/CloseHandle
    // 期间，setImmediate 投进来的 _drainReads 又拿到同一个旧 handle 去调 ReadFile。
    const h = slot.hPipe;
    slot.hPipe = null;
    if (h && !isInvalidHandle(h)) {
      try {
        // 重要：CloseHandle 前先 CancelIoEx，否则某些情况下内核会继续触发一次完成包，
        // 回来时 slot.hPipe 已经是新的，导致 phase 错乱。
        w.CancelIoEx(h, null);
      } catch (_) {
        /* ignore */
      }
      try {
        w.CloseHandle(h);
      } catch (_) {
        /* ignore */
      }
    }
    slot.phase = 'connect';
    slot.cache = Buffer.alloc(0);
    // OVERLAPPED 双缓冲切换：旧 OV 可能还在被内核回写"取消完成"信息，给新 IO 用另一块。
    slot.rollOv();

    // 二次确认：
    //  - stop() 可能在上面的 CloseHandle 过程中把 running 置为 false；
    //  - _runIocpServer 结尾也可能已经把 _iocp 关掉。
    // 任一条件成立都不能再发起 accept，否则 _beginAccept 里 CreateIoCompletionPort
    // 会把一个野 pipe 关联到已关闭的 IOCP，得到一个永远不会有完成包的"幽灵 slot"。
    if (this.running && this._iocp && !isInvalidHandle(this._iocp)) {
      await this._beginAccept(slot, w, this._fullPipeName);
    }
  }

  async _closeAllSlots(w) {
    for (const slot of this._slots) {
      // 同 _recycleSlot：先摘 handle 再关，避免与 setImmediate 里残留的 _drainReads 抢 slot.hPipe
      const h = slot.hPipe;
      slot.hPipe = null;
      if (h && !isInvalidHandle(h)) {
        try {
          w.CancelIoEx(h, null);
        } catch (_) {
          /* ignore */
        }
        try {
          w.CloseHandle(h);
        } catch (_) {
          /* ignore */
        }
      }
      slot.phase = 'connect';
    }
    this._slots = [];
  }
}

module.exports = {MessagePipeCore};
