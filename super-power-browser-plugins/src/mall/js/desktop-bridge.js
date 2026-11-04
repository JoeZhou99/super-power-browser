import { c as h, u as m, a as _, f as W, b as O, h as J, i as N } from "./common.js";
import { m as y } from "./api.js";
function E(s, e) {
  const t = e?.mallId;
  return t == null || t === "" ? s : `【${String(t)}】${s}`;
}
const x = {
  debug: console.debug.bind(console),
  info: console.info.bind(console),
  warn: console.warn.bind(console),
  error: console.error.bind(console),
  log: console.log.bind(console),
};
class R {
  transport = null;
  contextProvider = null;
  inTransport = !1;
  setTransport(e) {
    this.transport = e;
  }
  setContextProvider(e) {
    this.contextProvider = e;
  }
  debug(...e) {
    this.write("debug", e);
  }
  info(...e) {
    this.write("info", e);
  }
  warn(...e) {
    this.write("warn", e);
  }
  error(...e) {
    this.write("error", e);
  }
  log(...e) {
    this.write("log", e);
  }
  write(e, t) {
    if (((console[e] ?? x[e])(...t), !this.transport || this.inTransport)) return;
    const n = this.contextProvider?.(),
      o = { level: e, time: new Date().toISOString(), message: E(q(t), n), args: j(t), context: n };
    try {
      ((this.inTransport = !0), this.transport.send(o));
    } catch (r) {
      x.warn("[logger] transport send failed", r);
    } finally {
      this.inTransport = !1;
    }
  }
}
function j(s) {
  return s.map((e) =>
    e instanceof Error ? { name: e.name, message: e.message, stack: e.stack } : e,
  );
}
function q(s) {
  return s
    .map((e) => {
      if (typeof e == "string") return e;
      if (e instanceof Error) return `${e.name}: ${e.message}`;
      try {
        return JSON.stringify(e);
      } catch {
        return String(e);
      }
    })
    .join(" ");
}
function D(s) {
  const { send: e, action: t = h.event_type.writeLog } = s;
  return {
    send(i) {
      const n = i.context?.mallId ?? "",
        o = {
          action: t,
          level: i.level,
          time: i.time,
          message: i.message,
          args: i.args,
          mallId: n,
          context: i.context ?? {},
        },
        r = {
          requestId: m(),
          action: t,
          tag: "WriteLog",
          module: h.ipcModule[t],
          browserId: i.context?.browserId ?? "",
          mallId: n,
          args: JSON.stringify(o),
          is_reply: 0,
        },
        a = _(JSON.stringify(r));
      e(a);
    },
  };
}
const f = new R(),
  S = {
    timeout: 16e3,
    timeoutObj: null,
    serverTimeoutObj: null,
    reset: function () {
      return (clearTimeout(this.timeoutObj), clearTimeout(this.serverTimeoutObj), this);
    },
    start: function () {
      var s = this;
      this.timeoutObj = setTimeout(function () {
        (P.sendWsData("HeartBeat"),
          (s.serverTimeoutObj = setTimeout(function () {
            P.close();
          }, s.timeout)));
      }, this.timeout);
    },
  },
  P = {
    init(s, e) {
      return (
        (this.handleCallbackFuns = e),
        (this.iv = s.iv),
        (this.wsDecryptKey = s.wsDecryptKey),
        (this.mac = s.mac),
        (this.browserId = s.browserId),
        (this.websocketPort = s.websocketPort),
        this.createWebSocket(),
        this.ws
      );
    },
    createWebSocket() {
      try {
        f.info("【zf-mall-helper】createWebSocket");
        const e = U(this.browserId, this.iv, this.wsDecryptKey, this.mac);
        var s =
          "ws://127.0.0.1:" + this.websocketPort + "/?browserId=" + this.browserId + "&sign=" + e;
        (console.log("wsUrl", s), (this.ws = new WebSocket(s)), this.initEventHandle());
      } catch (e) {
        (this.reconnect(), console.log(e));
      }
    },
    initEventHandle() {
      ((this.ws.onclose = (s) => {
        (console.log("ws.onclose", s),
          (this.wsConnect = !1),
          this.reconnect(),
          console.log("llws连接关闭!"),
          f.warn("【zf-mall-helper】ws.onclose"));
      }),
        (this.ws.onerror = (s) => {
          (console.log("ws.onerror", s),
            (this.wsConnect = !1),
            this.reconnect(),
            console.log("llws连接错误!"),
            f.error("【zf-mall-helper】ws.onerror"));
        }),
        (this.ws.onopen = () => {
          (console.log("ws.onopen"),
            (this.wsConnect = !0),
            S.reset().start(),
            console.log("llws连接成功!"),
            f.info("【zf-mall-helper】ws:connection successful"));
        }),
        (this.ws.onmessage = (s) => {
          S.reset().start();
          const e = JSON.parse(atob(s.data)),
            t = e.value,
            i = e.iv,
            n = O(t, i, this.wsDecryptKey),
            o = JSON.parse(n);
          this.handleCallbackFuns.onMessageHandle(o);
        }));
    },
    reconnect() {
      this.lockReconnect ||
        ((this.lockReconnect = !0),
        setTimeout(() => {
          (this.createWebSocket(), (this.lockReconnect = !1));
        }, 8e3));
    },
    sendWsData(s, e) {
      const t = this.getParam(s, e || {}),
        i = JSON.stringify(t);
      s !== "HeartBeat" && s !== "UpdateMallCookie" && console.log("发送数据：", i);
      const n = this.iv,
        o = this.wsDecryptKey,
        r = this.mac,
        a = W(i, n, o),
        d = JSON.stringify({ iv: n, value: a, mac: r }),
        c = btoa(d);
      this.ws.send(c);
    },
    getParam(s, e = {}) {
      const t = {};
      return (
        (t.requestId = m()),
        (t.action = s),
        (t.tag = s === "WriteLog" ? "access" : "helper"),
        (t.module = h.module[s]),
        (t.browserId = this.browserId),
        (t.args = JSON.stringify(e)),
        s !== "HeartBeat" && s !== "WriteLog" && console.log("getParam:" + s, t),
        t
      );
    },
    getWsConnect() {
      return this.wsConnect;
    },
    getWs() {
      return this.ws;
    },
    close() {
      this.ws.close();
    },
  };
function U(s, e, t, i) {
  const n = new Date().getTime(),
    o = m(),
    r = V(n, o, t, s),
    l = JSON.stringify({ time: n, token: r, salt: o, browserId: s }),
    d = W(l, e, t),
    u = JSON.stringify({ iv: e, value: d, mac: i });
  return btoa(u);
}
function V(s, e, t, i) {
  const n = e + s + t + i + e + "";
  return J(n);
}
const C = {
  latestVersionMap: {},
  async initMallPlugins(s = [], e, t) {
    if (
      ((this.initJson = e),
      (this.userInfo = t),
      !e.installPlugins?.some((o) => o.plugin_name.includes("紫竹自动化")))
    ) {
      const o = { mallIds: s, added: !0, limit: 30 },
        r = await y.getPluginList(o);
      if ((console.log("获取店铺插件列表", r), r.errorCode === 0)) {
        const a = r.data?.list || [];
        this.handleMallPlugins(a);
      }
    }
    (this.checkPluginVersionUpdate(!0),
      setInterval(
        () => {
          this.checkPluginVersionUpdate();
        },
        60 * 60 * 1e3,
      ));
  },
  async handleMallPlugins(s) {
    chrome.management.getAll(function (e) {
      const t = e || [];
      console.log("本地所有插件", t);
      const i = [],
        n = [];
      for (let o = 0; o < t.length; o++) {
        const r = t[o],
          a = s.findIndex((l) => l.plugin_name === r.name);
        a === -1 ||
          (I(s[a].version_id) !== I(r.version) && ((t[o] = {}), n.push(r), C.unistall(r.id)));
      }
      for (let o = 0; o < s.length; o++) {
        const r = s[o];
        t.findIndex((l) => l.name === r.plugin_name) === -1 && (i.push(r), C.sendPluginInfo("", r));
      }
      (console.log("需要安装插件", i), console.log("需要移除的插件", n));
    });
  },
  async sendPluginInfo(s, e) {
    if (s) {
      console.log("installMailPlugin", s);
      const n = await y.getPluginInfoByChromeId({ chromeId: s });
      (console.log("pluginInfo", n), (e = n.data));
    }
    const t = {
        pluginId: e.id || "",
        pluginUrl: e.plugin_url || "",
        explain: e.explain || "",
        versionId: e.version_id || "",
        version: e.version || "",
        chromeId: e.chrome_id || "",
        pluginName: e.plugin_name || e.name || "",
        picUrl: e.pic_url || "",
        status: e.status || 0,
        filename: e.filename || "",
        source: e.source,
      },
      i = e?.filename?.split(".") ?? [];
    ((t.format = i[i.length - 1] || "crx"),
      (t.fileMd5 = e.file_md5 || ""),
      console.log("sendInstallPluginMessage", t),
      P.sendWsData(h.event_type.downLoad_plugin, t));
  },
  install(s) {
    (console.log("websocket installPlugin", s),
      "superbrowser" in chrome
        ? (s.path && chrome.superbrowser.installExtension(s.path),
          console.log("插件安装与更新" + s.pluginName, s))
        : console.error("安装插件失败：没有installExtension方法"));
  },
  unistall(s) {
    chrome.superbrowser.installExtension("", s);
  },
  async isExistSameVersionPlugin(s, e) {
    const t = await chrome.management.getAll();
    for (let i = 0; i < t.length; i++) {
      const n = t[i];
      if (n.name === s && this.compareVersion(n.version, e) === 0)
        return (console.log("本地存在相同版本的插件：" + s + "," + e + "不安装"), !0);
    }
    return !1;
  },
  compareVersion(s, e) {
    const t = s.split("."),
      i = e.split(".");
    for (let n = 0; n < Math.max(t.length, i.length); n++) {
      const o = parseInt(t[n] || "0", 10),
        r = parseInt(i[n] || "0", 10);
      if (o > r) return 1;
      if (o < r) return -1;
    }
    return 0;
  },
  checkPluginVersionUpdate(s = !1) {
    chrome.management.getAll((e) => {
      const t = e || [],
        i = t.length;
      if ((console.log("checkPluginVersionUpdate-本地所有插件", t), i === 0)) return;
      const n = this.initJson;
      for (var o = 0; o < i; o++) {
        const r = t[o],
          a = r.name,
          l = Object.values(n.pluginIdMap);
        if (s && !l.includes(r.id)) continue;
        const d = I(r.version);
        this.sendPluginInstall(a, d);
      }
    });
  },
  async sendPluginInstall(s, e) {
    const t = { name: s },
      i = this.initJson;
    (this.userInfo && this.userInfo.uid && (t.uid = this.userInfo.uid),
      i.browserId && (t.mallId = i.browserId));
    const n = i?.logoInfo?.code ?? "";
    (n &&
      h.defaultInstallPlugins &&
      h.defaultInstallPlugins[n] &&
      h.defaultInstallPlugins[n] == s &&
      (t.defaultInstallPlugin = 1),
      console.log("获取插件信息参数:" + s, t));
    const o = await y.getPluginInfo(t);
    if ((console.log("获取插件信息:" + s, o), o.data)) {
      const r = o.data,
        a = r.plugin_name || r.name || "";
      if (r.version_id) {
        const l = I(r.version_id),
          d = this.latestVersionMap[a];
        let c = !1;
        (d ? (c = l !== d) : (c = l !== e),
          c &&
            (console.log("本地版本：" + e, "线上版本：" + l),
            console.log("需要更新的插件:" + a, this.latestVersionMap),
            (this.latestVersionMap[a] = l),
            this.sendPluginInfo("", r)));
      } else console.error("插件信息获取异常：" + a);
    }
  },
};
function I(s) {
  return s
    .split(".")
    .map((i) => parseInt(i, 10))
    .join(".");
}
const se = "restoreLastSessionTabs",
  $ = 100,
  v = (s) => `last_session_tabs_${s}`,
  ne = (s) => `local_jump_method_${s}`;
function w(s) {
  return Array.isArray(s)
    ? s
        .filter((e) => {
          if (!e || typeof e.url != "string") return !1;
          try {
            const t = new URL(e.url);
            return ["http:", "https:"].includes(t.protocol) && !t.username && !t.password;
          } catch {
            return !1;
          }
        })
        .slice(0, $)
        .map((e, t) => ({
          url: e.url,
          index: Number.isInteger(e.index) ? e.index : t,
          windowId: Number.isInteger(e.windowId) ? e.windowId : 0,
          pinned: e.pinned === !0,
          active: e.active === !0,
        }))
        .sort((e, t) => e.windowId - t.windowId || e.index - t.index)
    : [];
}
class ie {
  mallId = "";
  previous = [];
  tabs = new Map();
  normalWindows = new Set();
  closingWindows = new Set();
  ready = !1;
  starting = null;
  writes = Promise.resolve();
  restoring = null;
  paused = !1;
  pendingTabs = new Map();
  constructor() {
    (chrome.windows.onCreated.addListener((e) => {
      e.type === "normal" && !e.incognito && e.id !== void 0 && this.normalWindows.add(e.id);
    }),
      chrome.tabs.onCreated.addListener((e) => {
        if (this.ready && !this.paused)
          for (const t of this.tabs.values())
            t.windowId === e.windowId && t.index >= e.index && t.index++;
        this.record(e);
      }),
      chrome.tabs.onUpdated.addListener((e, t, i) => {
        (t.url !== void 0 || t.pinned !== void 0) && this.record(i);
      }),
      chrome.tabs.onRemoved.addListener((e, t) => {
        if ((this.pendingTabs.delete(e), !this.ready || this.paused)) return;
        if (t.isWindowClosing) {
          this.closingWindows.add(t.windowId);
          return;
        }
        if (!this.tabs.has(e)) return;
        this.discardClosedWindows();
        const i = this.tabs.get(e);
        if ((this.tabs.delete(e), i))
          for (const n of this.tabs.values())
            n.windowId === i.windowId && n.index > i.index && n.index--;
        this.persist();
      }),
      chrome.tabs.onActivated.addListener((e) => {
        if (!(
          !this.ready ||
          this.paused ||
          this.closingWindows.has(e.windowId) ||
          !this.tabs.has(e.tabId)
        )) {
          for (const [t, i] of this.tabs) i.windowId === e.windowId && (i.active = t === e.tabId);
          this.persist();
        }
      }),
      chrome.tabs.onMoved.addListener((e, t) => {
        if (!(!this.ready || this.paused || this.closingWindows.has(t.windowId))) {
          this.discardClosedWindows();
          for (const [i, n] of this.tabs)
            n.windowId === t.windowId &&
              (i === e
                ? (n.index = t.toIndex)
                : t.fromIndex < t.toIndex && n.index > t.fromIndex && n.index <= t.toIndex
                  ? n.index--
                  : t.fromIndex > t.toIndex &&
                    n.index >= t.toIndex &&
                    n.index < t.fromIndex &&
                    n.index++);
          this.persist();
        }
      }),
      chrome.tabs.onAttached.addListener((e) => {
        chrome.tabs
          .get(e)
          .then((t) => this.record(t))
          .catch(() => {});
      }),
      chrome.tabs.onReplaced.addListener((e, t) => {
        (this.tabs.delete(t),
          chrome.tabs
            .get(e)
            .then((i) => this.record(i))
            .catch(() => {}));
      }));
  }
  async initialize(e) {
    if (!e || this.mallId === e) return;
    this.mallId = e;
    const t = v(e),
      i = `${t}_runtime`,
      n = (await chrome.storage.session.get(i))[i];
    if (n) this.previous = w(n.previous);
    else {
      const o = (await chrome.storage.local.get(t))[t];
      ((this.previous = w(o?.tabs)),
        await chrome.storage.session.set({ [i]: { previous: this.previous, restored: !1 } }));
    }
  }
  start() {
    return this.starting
      ? this.starting
      : this.mallId
        ? ((this.starting = (async () => {
            const e = await chrome.windows.getAll({ populate: !0, windowTypes: ["normal"] });
            for (const t of e)
              if (!(t.incognito || t.id === void 0)) {
                this.normalWindows.add(t.id);
                for (const i of t.tabs || []) this.put(i);
              }
            this.ready = !0;
            for (const t of this.pendingTabs.values()) this.record(t);
            this.pendingTabs.clear();
          })().catch((e) => {
            throw ((this.starting = null), e);
          })),
          this.starting)
        : Promise.resolve();
  }
  put(e) {
    if (e.id === void 0) return;
    const t = w([{ ...e, url: e.pendingUrl || e.url }])[0];
    t && !e.incognito && this.normalWindows.has(e.windowId)
      ? this.tabs.set(e.id, t)
      : this.tabs.delete(e.id);
  }
  record(e) {
    (this.starting && !this.ready && e.id !== void 0 && this.pendingTabs.set(e.id, e),
      !(!this.ready || this.paused || this.closingWindows.has(e.windowId)) &&
        ((!this.tabs.has(e.id) &&
          (!w([{ url: e.pendingUrl || e.url }]).length ||
            e.incognito ||
            !this.normalWindows.has(e.windowId))) ||
          (this.discardClosedWindows(), this.put(e), this.persist())));
  }
  discardClosedWindows() {
    for (const [e, t] of this.tabs) this.closingWindows.has(t.windowId) && this.tabs.delete(e);
    this.closingWindows.clear();
  }
  persist() {
    if (!this.mallId || !this.ready || this.paused) return;
    const e = v(this.mallId),
      t = { updatedAt: Date.now(), tabs: w([...this.tabs.values()]) };
    ((this.writes = this.writes.catch(() => {}).then(() => chrome.storage.local.set({ [e]: t }))),
      this.writes.catch((i) => console.error("lastSessionTabs save failed", i)));
  }
  restore(e) {
    return (
      this.restoring ||
        (this.restoring = this.restoreOnce(e).finally(() => {
          this.restoring = null;
        })),
      this.restoring
    );
  }
  async restoreOnce(e) {
    await this.start();
    const t = `${v(this.mallId)}_runtime`;
    if ((await chrome.storage.session.get(t))[t]?.restored) return { restored: !0, failed: 0 };
    if (!this.previous.length)
      return (
        await chrome.storage.session.set({ [t]: { previous: [], restored: !0 } }),
        { restored: !1, failed: 0 }
      );
    this.paused = !0;
    let n = 0,
      o = 0,
      r,
      a;
    try {
      const l = await chrome.tabs.query({ windowId: e }),
        d = [...this.previous].sort((c, u) => Number(u.pinned) - Number(c.pinned));
      for (const c of d)
        try {
          const u = l.findIndex((g) => (g.pendingUrl || g.url) === c.url);
          let b;
          if (u >= 0) {
            const g = l.splice(u, 1)[0];
            ((b =
              (await chrome.tabs.update(g.id, { pinned: c.pinned, active: !1 })) ||
              (await chrome.tabs.get(g.id))),
              await chrome.tabs.move(g.id, { index: n }));
          } else
            b = await chrome.tabs.create({
              windowId: e,
              url: c.url,
              pinned: c.pinned,
              active: !1,
              index: n,
            });
          (n++, (a ??= c.url), c.active && (r = b.id));
        } catch (u) {
          (o++, console.warn("lastSessionTabs restore tab failed", u));
        }
      return (
        r !== void 0 && (await chrome.tabs.update(r, { active: !0 })),
        n &&
          !o &&
          (await chrome.storage.session.set({ [t]: { previous: this.previous, restored: !0 } })),
        { restored: n > 0, failed: o, firstUrl: a }
      );
    } finally {
      const l = await chrome.tabs.query({ windowType: "normal" }).catch(() => null);
      if (l) {
        this.tabs.clear();
        for (const d of l) this.put(d);
      }
      ((this.paused = !1), n && !o && l && this.persist());
    }
  }
}
let M = () => ({});
const p = new Map();
function T(s) {
  return !s || typeof s != "object"
    ? !1
    : ("is_reply" in s || "requestId" in s) && !("browserId" in s) && !("mallId" in s);
}
function K(s) {
  return s ?? M();
}
function B(s) {
  if (typeof s != "string") return s;
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
function z(s) {
  if (!s || typeof s != "object") return;
  const e = s.requestId ?? s.request_id ?? s?.data?.requestId ?? s?.data?.request_id;
  if (!(e == null || e === "")) return String(e);
}
function H(s, e) {
  const t = B(s),
    i = z(t);
  if (!i) return !1;
  const n = p.get(i);
  return n
    ? (clearTimeout(n.timer),
      p.delete(i),
      n.resolve({ requestId: i, decryptedMessage: s, parsedMessage: t, rawMessage: e }),
      !0)
    : !1;
}
function k() {
  return chrome?.superbrowser ?? null;
}
function A(s) {
  k()?.sendMessageToClient?.(s);
}
function L(s, e = {}, t, i = {}) {
  const n = T(t) ? void 0 : t,
    o = T(t) ? t : i,
    r = o.is_reply ?? 0,
    a = K(n),
    l = o.requestId ?? m(),
    d = {
      requestId: l,
      action: s,
      tag: s === "WriteLog" ? "access" : "helper",
      module: h.ipcModule[s],
      browserId: a.browserId ?? "",
      mallId: a.mallId ?? "",
      args: typeof e == "string" ? e : JSON.stringify(e ?? {}),
      is_reply: r,
    },
    c = _(JSON.stringify(d));
  return (A(c), l);
}
async function Z(s, e = {}, t = {}) {
  const i = t.timeoutMs ?? 2e4,
    n = m(),
    o = new Promise((r, a) => {
      const l = setTimeout(() => {
        (p.delete(n), a(new Error(`[client-ipc] wait reply timeout, action=${s}, requestId=${n}`)));
      }, i);
      p.set(n, { resolve: r, reject: a, timer: l });
    });
  try {
    return (L(s, e, t.context, { is_reply: t.is_reply ?? 1, requestId: n }), await o);
  } catch (r) {
    const a = p.get(n);
    throw (a && (clearTimeout(a.timer), p.delete(n), a.reject(r)), r);
  }
}
function F(s) {
  k()?.onClientMessage?.addListener?.(s);
}
function X(s) {
  return N(s);
}
function G(s) {
  F((e) => {
    const t = X(e);
    if ((H(t, e), s)) {
      s(t, e);
      return;
    }
    console.log("[superbrowser onClientMessage]", t);
  });
}
function Q(s) {
  return s.getContext ?? s.getLoggerContext ?? (() => ({}));
}
function Y(s) {
  function e(t, i = {}, n = {}) {
    const o = n.context ?? s();
    return (n.is_reply ?? 0) === 1
      ? Z(t, i, { ...n, context: o })
      : (L(t, i, o, n), Promise.resolve());
  }
  return {
    getContext: s,
    sendAction(t, i = {}, n = {}) {
      return e(t, i, n);
    },
  };
}
function oe(s) {
  const { onClientMessage: e } = s,
    t = Q(s),
    i = Y(t);
  return (
    (M = t),
    f.setContextProvider(() => t()),
    f.setTransport(D({ send: (n) => A(n) })),
    G(e),
    i
  );
}
export { ie as L, C as P, se as R, P as W, f as a, oe as i, ne as l };
