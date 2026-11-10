import { c as h, d as pe, v as de, w as M, b as fe, e as W } from "../js/common.js";
import { m as d } from "../js/api.js";
import { a as w, G as ge, s as ke, b as ye } from "../js/auth.js";
import { L as _e, a as u, W as g, P as k, R as we, i as Ie } from "../js/desktop-bridge.js";
import { p as be, i as Pe } from "../js/cookies.js";
import "../js/vendor-commonjs.js";
import {switchAuthorizedProxy, queryAuthorizedProxyRoutes, measureAuthorizedTransfer} from "../runtime/proxy-switch.mjs";
const ve = {
  adsBookmark: [],
  addAdsBookmarkList: [],
  removeAdsBookmarkList: [],
  listenLoadBookmark: !1,
  commonBookmarkIds: [],
  async init(e, t) {
    ((this.mallId = t), await this.getAdsBookmark(), await this.getBookmark(e), this.initEvent());
  },
  initEvent() {
    (chrome.bookmarks.onChanged.addListener((e, t) => {
      (console.log("书签-onChanged", t),
        !(!w() || !this.listenLoadBookmark) && this.saveBookmark());
    }),
      chrome.bookmarks.onCreated.addListener((e, t) => {
        (console.log("书签-onCreated", t),
          !(!w() || !this.listenLoadBookmark) && this.saveBookmark());
      }),
      chrome.bookmarks.onMoved.addListener((e, t) => {
        (console.log("书签-onMoved", t),
          !(!w() || !this.listenLoadBookmark) && this.saveBookmark());
      }),
      chrome.bookmarks.onRemoved.addListener((e, t) => {
        (console.log("书签-onRemoved", t),
          !(!w() || !this.listenLoadBookmark) && this.saveBookmark());
      }),
      chrome.bookmarks.onChildrenReordered.addListener((e, t) => {
        (console.log("书签-onChildrenReordered", t),
          !(!w() || !this.listenLoadBookmark) && this.saveBookmark());
      }),
      chrome.bookmarks.onImportEnded.addListener(() => {
        (console.log("书签-onImportEnded"),
          !(!w() || !this.listenLoadBookmark) && this.saveBookmark());
      }));
  },
  async getBookmark(e) {
    this.listenLoadBookmark = !1;
    try {
      const t = await d.getBookmark({ mallId: this.mallId });
      (console.log("getBookmark:", 3), await xe(), console.log("获取书签栏：showBookmark", t));
      const o = t.data.bookmarkTree || "[]",
        n = JSON.parse(o) || [];
      let r = [];
      (n[0]?.children[0]?.children && (r = n[0].children[0].children),
        console.log("bookmarkTreeList", r));
      const s = t.data.bookmarkInitTree || [];
      if (e.code && e.auth_storage_url) {
        const p = e.auth_storage_url.split(",")[0],
          m = { title: e.brand_name, url: p };
        s.unshift(m);
      }
      (this.mallId && this.addAdsBookmarkList.length && r.unshift(...this.addAdsBookmarkList),
        this.mallId &&
          this.removeAdsBookmarkList.length &&
          (r = r.filter((l) => !this.removeAdsBookmarkList.some((p) => p.title === l.title))),
        X(s));
      let i = s.concat(r);
      i.length && ((i = Se(i)), console.log("newBookmarkTree 去重", i));
      const a = i.filter((l) => String(l.parentId) !== "2"),
        c = i.filter((l) => String(l.parentId) === "2");
      (console.log("添加书签栏", a),
        console.log("添加其他书签", c),
        await Promise.all([
          this.createNestedBookmarks(a, () => {}, "1"),
          this.createNestedBookmarks(c, () => {}, "2"),
        ]),
        this.saveBookmark(),
        setTimeout(() => {
          this.listenLoadBookmark = !0;
        }, 10));
    } catch (t) {
      console.log("getBookmark-error", t);
    }
  },
  async getAdsBookmark() {
    console.log("getAdsBookmark:", 1);
    const e = { key: "adsFolderBookmark" },
      t = await d.getInfoByKey(e);
    ((this.adsBookmark = (t.data && t.data.contents) || []), await this.filterPromotionFolder());
  },
  filterPromotionFolder() {
    return new Promise((e, t) => {
      try {
        chrome.storage.local.get("adsBookmarkStr", (o) => {
          let n = o.adsBookmarkStr || "SuperPower 推荐";
          (console.log("🚀 ~ createPromotionFolder ~ adsBookmarkStr:", o),
            this.adsBookmark.forEach((r) => {
              (n.includes(r.title) || (this.addAdsBookmarkList.push(r), (n = n + "," + r.title)),
                r.isRemove && this.removeAdsBookmarkList.push(r));
            }),
            chrome.storage.local.set({ adsBookmarkStr: n }, function () {
              e();
            }));
        });
      } catch (o) {
        console.error("错误:", o);
      }
    });
  },
  async createNestedBookmarks(e, t, o = "1") {
    let n = 0;
    const r = Q(e).length,
      s = async (i, a) => {
        try {
          const c = { title: i.title, parentId: a };
          i.url && (c.url = i.url);
          const l = await chrome.bookmarks.create(c);
          if ((n++, t({ current: i.title, progress: `${n}/${r}` }), i.children))
            for (const p of i.children) await s(p, l.id);
        } catch (c) {
          console.error(`[${i.title}] 创建失败:`, c);
        }
      };
    return (await Promise.all(e.map((i) => s(i, o))), n);
  },
  addBookmarks(e, t) {
    this.createNestedBookmarks(t.children || [], ({ current: o, progress: n }) => {}, e).then(
      (o) => {
        (console.log(`创建完成，成功${o}个节点`),
          this.saveBookmark(),
          setTimeout(() => {
            this.listenLoadBookmark = !0;
          }, 10));
      },
    );
  },
  async saveBookmark() {
    (console.log("saveBookmark----------------------"),
      (await w()) &&
        chrome.bookmarks.getSubTree("1", (t) => {
          const o = t[0].children || [];
          chrome.bookmarks.getSubTree("2", (n) => {
            const r = n[0].children || [],
              s = o.concat(r);
            let i = s;
            if (this.commonBookmarkIds && this.commonBookmarkIds.length > 0) {
              this.removeCommonBookmarkUrl(s);
              const p = [];
              (this.changeCommonBookmarkUrl(s, p), (i = s.concat(p)));
            }
            (this.deleteNoChildren(i), console.log("newAllBookmarkList", i));
            const a = [
              {
                title: "",
                id: "0",
                children: [{ title: "书签栏", parentId: "0", index: 0, id: "1", children: i }],
              },
            ];
            if ((console.log("sendBookmarkArr", a), a.length < 1)) return;
            const c = JSON.stringify(a),
              l = { mall_id: Number(this.mallId), bookmark: c };
            try {
              (console.log("param =============", l), d.saveBookmark(l));
            } catch (p) {
              console.log(p);
            }
          });
        }));
  },
  removeCommonBookmarkUrl(e) {
    for (var t = 0; t < e.length; t++) {
      const o = e[t],
        n = o.id,
        r = o.children;
      r && r.length > 0
        ? this.removeCommonBookmarkUrl(r)
        : this.commonBookmarkIds.indexOf(n) > -1 && o.url && (e.splice(t, 1), t--);
    }
  },
  changeCommonBookmarkUrl(e, t) {
    for (var o = 0; o < e.length; o++) {
      const n = e[o],
        r = n.parentId,
        s = n.children;
      s && s.length > 0
        ? this.changeCommonBookmarkUrl(s, t)
        : this.commonBookmarkIds.indexOf(r) > -1 && n.url && (t.push(n), e.splice(o, 1), o--);
    }
  },
  deleteNoChildren(e) {
    function t(o) {
      for (var n = 0; n < o.length; n++) {
        const r = o[n];
        r.children &&
          (r.children.length > 0 && t(r.children),
          r.children.length === 0 && (o.splice(n, 1), n--));
      }
    }
    t(e);
  },
};
function xe() {
  return new Promise((e, t) => {
    chrome.bookmarks.getTree(async (o) => {
      const n = (r) => {
        r.children
          ? (r.children.forEach(n), r.id !== "0" && chrome.bookmarks.removeTree(r.id))
          : r.url && chrome.bookmarks.remove(r.id);
      };
      (o[0].children.forEach(n), console.log(" 所有非根目录书签及文件夹已删除"), e());
    });
  });
}
function X(e) {
  for (var t = 0; t < e.length; t++) {
    const o = e[t];
    ((o.isCommon = !0), o.children && o.children.length > 0 && X(o.children));
  }
}
function Se(e = []) {
  const t = [],
    o = new Set();
  return (
    e.forEach((n) => {
      const r = `${n.url}-${n.title}`;
      !o.has(r) && n.title !== "SuperPower 推荐" && (t.push(n), o.add(r));
    }),
    console.log(t),
    t
  );
}
function Q(e) {
  return e.reduce((t, o) => t.concat(o, o.children ? Q(o.children) : []), []);
}
function Ce(e) {
  !e ||
    e.length === 0 ||
    (console.log("取消拦截resetRequestIntercept:", e),
    chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: e, addRules: [] }));
}
function Ae(e, t) {
  if (!Array.isArray(e) || !t) return;
  const o = e
      .map((r, s) => {
        try {
          const i = new URL(r),
            a = i.host + i.pathname,
            c = `^https://${i.host.replace(/\./g, "\\.")}${i.pathname.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(.*)$`;
          return {
            id: 2e4 + s,
            priority: 1,
            action: { type: "redirect", redirect: { regexSubstitution: `https://${t}/${a}\\1` } },
            condition: {
              regexFilter: c,
              resourceTypes: [
                "script",
                "stylesheet",
                "image",
                "font",
                "xmlhttprequest",
                "media",
                "object",
              ],
            },
          };
        } catch (i) {
          return (console.error("URL解析失败:", r, i), null);
        }
      })
      .filter(Boolean),
    n = o.map((r) => r.id);
  chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: n, addRules: o }, () => {
    chrome.runtime.lastError
      ? console.error("批量CDN重定向规则设置失败:", chrome.runtime.lastError)
      : console.log("批量CDN重定向规则已设置:", o);
  });
}
const Te = "upsert_chrome_cookie_with_max_expiry";
function Le(e) {
  const t = e.replace(/^\./, "");
  return new Promise((o) => {
    chrome.cookies.getAll({ domain: t }, (n) => {
      Array.isArray(n) ? o(n) : o([]);
    });
  });
}
function Ue(e, t) {
  return new Promise((o) => {
    chrome.cookies.get({ url: e, name: t }, (n) => {
      o(n ?? null);
    });
  });
}
function Ee(e) {
  return new Promise((t) => {
    chrome.cookies.set(e, (o) => {
      t(!!o);
    });
  });
}
function Me(e) {
  let t = 0;
  for (const o of e) {
    const n = o.expirationDate;
    typeof n == "number" && Number.isFinite(n) && n > t && (t = n);
  }
  return t > 0 ? t : Math.floor(Date.now() / 1e3) + 30 * 24 * 60 * 60;
}
async function Be(e) {
  const t = e.domain ?? "",
    [o, n] = await Promise.all([t ? Le(t) : Promise.resolve([]), Ue(e.url, e.name)]),
    r = Me(o);
  return {
    ok: await Ee({ ...e, value: n?.value ?? e.value ?? "", expirationDate: r }),
    expirationDate: r,
  };
}
const T = "zf_opened_tab_urls_v1",
  ee = "openedTabUrlReport",
  N = 3,
  ze = 1e3;
function P(e) {
  return typeof e == "string" && /^https?:\/\//i.test(e);
}
class Re {
  api;
  pendingCreatedTabIds = new Set();
  persistQueue = Promise.resolve();
  constructor(t) {
    this.api = t;
  }
  enqueue(t) {
    return (
      (this.persistQueue = this.persistQueue.then(t).catch((o) => {
        console.log("openedTabUrlReporter enqueue error", o);
      })),
      this.persistQueue
    );
  }
  async getUrlMap() {
    return new Promise((t) => {
      chrome.storage.local.get([T], (o) => {
        const n = o?.[T],
          r = new Map();
        (Array.isArray(n)
          ? n.forEach((s) => {
              P(s) && r.set(s, !0);
            })
          : n &&
            typeof n == "object" &&
            Object.keys(n).forEach((s) => {
              P(s) && r.set(s, !0);
            }),
          t(r));
      });
    });
  }
  async setUrlMap(t) {
    const o = Array.from(t.keys());
    return new Promise((n) => {
      chrome.storage.local.set({ [T]: o }, () => {
        n();
      });
    });
  }
  async clearUrls() {
    return new Promise((t) => {
      chrome.storage.local.remove([T], () => t());
    });
  }
  async reportWithRetry(t, o) {
    for (let n = 1; n <= N; n++)
      try {
        return (
          await this.api.batchSaveUrl({ urls: t }),
          console.log(`batchSaveUrl done(${o}), count:`, t.length, "attempt:", n),
          !0
        );
      } catch (r) {
        (console.log(`batchSaveUrl fail(${o}) attempt ${n}`, r),
          n < N && (await new Promise((s) => setTimeout(s, ze))));
      }
    return !1;
  }
  recordOpenedTabUrl(t) {
    if (typeof t != "string" || !P(t)) return;
    const o = t;
    this.enqueue(async () => {
      const n = await this.getUrlMap();
      n.has(o) || (n.set(o, !0), await this.setUrlMap(n));
    });
  }
  handleTabCreated(t) {
    typeof t.id == "number" && this.pendingCreatedTabIds.add(t.id);
    const o = t.pendingUrl || t.url;
    P(o) &&
      (this.recordOpenedTabUrl(o),
      typeof t.id == "number" && this.pendingCreatedTabIds.delete(t.id));
  }
  handleTabUpdated(t, o, n) {
    if (!this.pendingCreatedTabIds.has(t)) return;
    const r = o.url || n?.pendingUrl || n?.url;
    P(r) && (this.recordOpenedTabUrl(r), this.pendingCreatedTabIds.delete(t));
  }
  handleTabRemoved(t) {
    this.pendingCreatedTabIds.delete(t);
  }
  reportOpenedTabUrls(t = "unknown") {
    this.enqueue(async () => {
      const o = await this.getUrlMap(),
        n = Array.from(o.keys());
      if (!n.length) {
        console.log(`batchSaveUrl skip(${t}), no urls`);
        return;
      }
      (await this.reportWithRetry(n, t)) && (await this.clearUrls());
    });
  }
  createPeriodicReportAlarm(t = 60) {
    chrome.alarms.create(ee, { periodInMinutes: t });
  }
}
function De(e) {
  return new Re(e);
}
const f = new Map();
function _(e, t, o = {}) {
  return new Promise((n, r) => {
    chrome.debugger.sendCommand({ tabId: e }, t, o, (s) => {
      chrome.runtime.lastError
        ? r(new Error(`CDP ${t} 失败: ${chrome.runtime.lastError.message}`))
        : n(s);
    });
  });
}
async function te(e) {
  const t = f.get(e);
  (t && t.attached) ||
    (await new Promise((o, n) => {
      chrome.debugger.attach({ tabId: e }, "1.3", () => {
        chrome.runtime.lastError
          ? chrome.runtime.lastError.message.includes("already")
            ? o()
            : n(new Error(`attach 失败: ${chrome.runtime.lastError.message}`))
          : o();
      });
    }),
    f.set(e, { ...(f.get(e) || {}), attached: !0, authenticatorId: null }),
    console.log("[ZF Passkey] Debugger attached, tabId:", e));
}
async function F(e) {
  const t = f.get(e);
  if (!(!t || !t.authenticatorId)) {
    try {
      (await _(e, "WebAuthn.removeVirtualAuthenticator", { authenticatorId: t.authenticatorId }),
        console.log("[ZF Passkey] 旧认证器已移除"));
    } catch {}
    ((t.authenticatorId = null), f.set(e, t));
  }
}
async function Oe(e) {
  const t = f.get(e);
  if (t) {
    if (t.attached && t.authenticatorId)
      try {
        await _(e, "WebAuthn.removeVirtualAuthenticator", { authenticatorId: t.authenticatorId });
      } catch {}
    if (t.attached)
      try {
        await _(e, "WebAuthn.disable");
      } catch {}
    f.delete(e);
  }
}
const R = "passkey_credentials";
function I() {
  return new Promise((e, t) => {
    chrome.storage.local.get([R], (o) => {
      if (chrome.runtime.lastError) {
        t(new Error(chrome.runtime.lastError.message));
        return;
      }
      e(o[R] || {});
    });
  });
}
function L(e) {
  return new Promise((t, o) => {
    chrome.storage.local.set({ [R]: e }, () => {
      if (chrome.runtime.lastError) {
        o(new Error(chrome.runtime.lastError.message));
        return;
      }
      t();
    });
  });
}
let E = null;
function $e(e) {
  E = e;
}
function oe() {
  const e = E?.getStoreId?.();
  if (e == null || e === "") return null;
  const t = Number(e);
  return Number.isFinite(t) ? t : null;
}
function j() {
  return E?.getAutoInjectPasskey?.() === !0;
}
function ne() {
  return !!E?.getDisabledPasskey?.();
}
const Fe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
function re(e, t) {
  if (!t) return !0;
  try {
    const o = new URL(t).hostname.toLowerCase(),
      n = (e || "").replace(/^\./, "").toLowerCase(),
      r = (a) => a.split(".").includes("amazon"),
      s = ["login.microsoft.com", "login.microsoftonline.com", "login.live.com"],
      i = (a) => s.includes(a);
    return (r(o) && r(n)) || (i(o) && i(n)) ? !0 : !!n && (o === n || o.endsWith(`.${n}`));
  } catch {
    return !0;
  }
}
function Je(e) {
  if (e)
    try {
      const o = new URL(e).hostname.toLowerCase();
      if (o === "login.microsoft.com") return o;
    } catch {}
  const t = [
    "co.jp",
    "co.uk",
    "com.mx",
    "com.au",
    "com.br",
    "com.tr",
    "de",
    "fr",
    "it",
    "es",
    "nl",
    "se",
    "pl",
    "ca",
    "in",
    "sg",
    "ae",
    "sa",
  ];
  for (const o of t) if (e && e.includes(`amazon.${o}`)) return `amazon.${o}`;
  return "amazon.com";
}
function D(e) {
  if (!e || typeof e != "string") return "";
  const t = e.trim().toLowerCase();
  return Fe.test(t) ? t : "";
}
function We(e) {
  if (!e || typeof e != "string") return "";
  try {
    let t = e.replace(/-/g, "+").replace(/_/g, "/");
    const o = t.length % 4;
    return (o && (t += "=".repeat(4 - o)), decodeURIComponent(escape(atob(t))));
  } catch {
    return "";
  }
}
function C(e) {
  return btoa(unescape(encodeURIComponent(e || "")));
}
function Ne(e, t) {
  const o = D(e?.email || "");
  if (o) return o;
  const n = D(We(t?.userHandle || ""));
  return n || `unknown_${Date.now()}`;
}
function je(e) {
  return !e || typeof e != "string" ? "amazon.com" : e.replace(/^\./, "").trim() || "amazon.com";
}
function Ke(e) {
  return JSON.stringify({
    credentialId: e.credentialId,
    privateKey: e.privateKey,
    userHandle: e.userHandle,
    rpId: e.rpId,
    signCount: e.signCount ?? 0,
    createdAt: e.createdAt,
  });
}
function He(e) {
  if (!e || typeof e != "string") return null;
  try {
    const t = JSON.parse(e);
    if (t && t.credentialId && t.privateKey) return t;
  } catch {}
  return null;
}
function Ze(e, t) {
  const o = e?.account && String(e.account).trim();
  if (o) return o.toLowerCase();
  try {
    const n = t?.userHandle;
    if (n) {
      const s = atob(String(n).replace(/-/g, "+").replace(/_/g, "/")).trim().toLowerCase();
      if (s.includes("@")) return s;
    }
  } catch {}
  return e?.id != null ? `_store_passkey_${e.id}` : "";
}
function Ve(e, t) {
  if (!Array.isArray(e)) return null;
  const o = {};
  for (const n of e) {
    const r = He(n.passkey);
    if (!r) continue;
    const s = r.rpId || n.host;
    if (!re(s, t)) continue;
    const i = Ze(n, r);
    if (!i) continue;
    const a = r.createdAt || n.created_at || "",
      c = o[i];
    (c && (Date.parse(a) || 0) <= (Date.parse(c.createdAt) || 0)) ||
      (o[i] = {
        credentialId: r.credentialId,
        privateKey: r.privateKey,
        userHandle: r.userHandle || C(i),
        rpId: s,
        signCount: r.signCount || 0,
        createdAt: a,
        source: "backend",
      });
  }
  return Object.keys(o).length ? o : null;
}
async function qe() {
  const e = oe();
  if (e == null) return (console.log("[ZF Passkey] 未配置 storeId，跳过云端拉取"), null);
  try {
    const t = await d.listPasskey({ storeId: e });
    return !t || t.errorCode !== 0
      ? (console.warn("[ZF Passkey] listPasskey 业务失败:", t?.msg || t?.message), null)
      : Array.isArray(t.data.list)
        ? t.data.list
        : null;
  } catch (t) {
    return (console.warn("[ZF Passkey] listPasskey 异常:", t.message), null);
  }
}
async function O(e) {
  const t = await qe();
  if (!t) return null;
  const o = Ve(t, e);
  return o || (console.log("[ZF Passkey] 无可用已绑定凭证"), null);
}
async function se(e) {
  const t = oe();
  if (t == null) return { ok: !1, error: "未配置店铺上下文（storeId）" };
  try {
    const o = e.email || "",
      n = await d.savePasskey({
        storeId: t,
        host: je(e.rpId),
        passkey: Ke(e),
        account: o || void 0,
        name: `${o}_${Math.floor(Math.random() * 1e6)}`,
        bindStatus: 1,
      });
    return !n || n.errorCode !== 0
      ? { ok: !1, error: n?.msg || n?.message || "上报失败" }
      : { ok: !0 };
  } catch (o) {
    return { ok: !1, error: o.message || String(o) };
  }
}
function Ge(e, t) {
  if (!t || typeof t != "object") return e;
  const o = { ...e };
  for (const [n, r] of Object.entries(t)) {
    if (!n || !r?.credentialId || !r?.privateKey) continue;
    const s = o[n];
    (s && (Date.parse(s.createdAt) || 0) > (Date.parse(r.createdAt) || 0)) ||
      (o[n] = {
        credentialId: r.credentialId,
        privateKey: r.privateKey,
        userHandle: r.userHandle || C(n),
        rpId: r.rpId || "amazon.com",
        signCount: r.signCount || 0,
        createdAt: r.createdAt || new Date().toISOString(),
        source: r.source || "backend",
      });
  }
  return o;
}
const ie = {
  protocol: "ctap2",
  transport: "internal",
  hasResidentKey: !0,
  hasUserVerification: !0,
  isUserVerified: !0,
  automaticPresenceSimulation: !0,
  isBackupEligible: !1,
  isBackupState: !1,
};
async function ae(e) {
  if (ne()) return !1;
  try {
    await te(e);
    const t = f.get(e);
    if (t?.authenticatorId && !t.registering) return !0;
    (t?.authenticatorId && (await F(e)),
      await _(e, "WebAuthn.enable", { enableUI: !1 }),
      console.log("[ZF Passkey] WebAuthn.enable 完成"));
    const n = (await _(e, "WebAuthn.addVirtualAuthenticator", { options: ie })).authenticatorId,
      r = f.get(e) || {};
    return (
      f.set(e, { ...r, attached: !0, authenticatorId: n, registering: !1 }),
      console.log("[ZF Passkey] 登录页空虚拟认证器已创建, id:", n),
      !0
    );
  } catch (t) {
    return (console.error("[ZF Passkey] 创建登录页空虚拟认证器失败:", t.message), !1);
  }
}
async function Ye(e, t) {
  const o = await O(t),
    n = o && Object.keys(o).length > 0,
    r = n ? o : await I(),
    s = Object.fromEntries(Object.entries(r).filter(([, i]) => re(i.rpId, t)));
  if (
    (console.log(n ? "[ZF Passkey] 使用云端托管凭证" : "[ZF Passkey] 云端无可用凭证，使用本地缓存"),
    Object.keys(s).length === 0)
  )
    return (console.log(`[ZF Passkey] 当前站点无可用凭证，跳过凭证注入: ${t || "unknown"}`), !1);
  try {
    if (!(await ae(e))) return !1;
    const i = f.get(e)?.authenticatorId;
    if (!i) return !1;
    console.log(
      "[ZF Passkey] 候选凭证:",
      Object.entries(s).map(([p, m]) => ({ email: p, createdAt: m.createdAt, source: m.source })),
    );
    const [a, c] = Object.entries(s).reduce((p, m) =>
      (Date.parse(m[1].createdAt || "") || 0) > (Date.parse(p[1].createdAt || "") || 0) ? m : p,
    );
    console.log(`[ZF Passkey] 选中最近一条: ${a} createdAt=${c.createdAt}`);
    let l = 0;
    try {
      const p = Math.max(c.signCount || 0, Math.floor(Date.now() / 1e3));
      (await _(e, "WebAuthn.addCredential", {
        authenticatorId: i,
        credential: {
          credentialId: c.credentialId,
          privateKey: c.privateKey,
          rpId: c.rpId || "amazon.com",
          userHandle: c.userHandle || C(a),
          signCount: p,
          isResidentCredential: !0,
          backupEligibility: !1,
          backupState: !1,
        },
      }),
        l++,
        console.log(`[ZF Passkey] 凭证已注入(最近一条): ${a}`));
    } catch (p) {
      console.error(`[ZF Passkey] 注入凭证失败 (${a}):`, p.message);
    }
    return (console.log(`[ZF Passkey] 虚拟认证器就绪，共注入 ${l} 个凭证`), l > 0);
  } catch (i) {
    return (console.error("[ZF Passkey] 注入虚拟认证器凭证失败:", i.message), !1);
  }
}
async function ce(e, t) {
  if (ne()) return { ready: !1 };
  const o = Je(t),
    n = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  console.log(`[ZF Passkey] 准备注册拦截，tabId=${e} rpId=${o}`);
  try {
    (await te(e), await F(e), await _(e, "WebAuthn.enable", { enableUI: !1 }));
    const { authenticatorId: r } = await _(e, "WebAuthn.addVirtualAuthenticator", { options: ie });
    return (
      f.set(e, {
        attached: !0,
        authenticatorId: r,
        registering: !0,
        email: "",
        rpId: o,
        registrationSessionId: n,
      }),
      console.log("[ZF Passkey] 注册虚拟认证器就绪，等待 credentials.create() 调用"),
      Xe(e, r, n),
      { ready: !0 }
    );
  } catch (r) {
    return (console.error("[ZF Passkey] 注册认证器设置失败:", r.message), { ready: !1 });
  }
}
async function Xe(e, t, o) {
  const s = Date.now() + 3e5;
  for (console.log(`[ZF Passkey] 开始轮询新凭证，tabId=${e}`); Date.now() < s;) {
    await new Promise((c) => setTimeout(c, 2e3));
    const a = f.get(e);
    if (!a || !a.registering || a.registrationSessionId !== o) {
      console.log("[ZF Passkey] 注册流程已中止（tab 关闭或重新导航）");
      return;
    }
    try {
      const { credentials: c } = await _(e, "WebAuthn.getCredentials", { authenticatorId: t });
      if (c && c.length > 0) {
        const l = c[0];
        console.log(`[ZF Passkey] 捕获到新凭证: credentialId=${l.credentialId}`);
        const p = f.get(e) || {},
          m = Ne(p, l),
          b = p.rpId || "amazon.com",
          y = await I(),
          A = {
            credentialId: l.credentialId,
            privateKey: l.privateKey,
            userHandle: l.userHandle || C(m),
            rpId: b,
            signCount: l.signCount || 0,
            createdAt: new Date().toISOString(),
          };
        ((y[m] = A),
          await L(y),
          console.log(`[ZF Passkey] 凭证已保存到本地: ${m}`),
          f.set(e, { ...p, registering: !1 }));
        const J = await se({ email: m, ...A });
        if (J.ok) {
          console.log(`[ZF Passkey]  凭证已自动上报: ${m}`);
          try {
            await chrome.tabs.sendMessage(e, { action: "passkey-upload-success", email: m });
          } catch (me) {
            console.warn("[ZF Passkey] 上报成功提示消息发送失败:", me.message);
          }
        } else console.warn(`[ZF Passkey] 凭证自动上报失败: ${J.error}`);
        return;
      }
    } catch (c) {
      const l = c.message;
      if (l.includes("No tab with id") || l.includes("Debugger is not attached")) {
        console.log("[ZF Passkey] Tab 已关闭，停止轮询");
        return;
      }
      console.warn("[ZF Passkey] getCredentials 轮询出错:", l);
    }
  }
  console.warn(`[ZF Passkey] 等待注册超时，tabId=${e}`);
  const i = f.get(e);
  i && i.registrationSessionId === o && f.set(e, { ...i, registering: !1 });
}
const le = [
    "https://*.amazon.com/ap/signin*",
    "https://*.amazon.co.jp/ap/signin*",
    "https://*.amazon.co.uk/ap/signin*",
    "https://*.amazon.de/ap/signin*",
    "https://*.amazon.fr/ap/signin*",
    "https://*.amazon.it/ap/signin*",
    "https://*.amazon.es/ap/signin*",
    "https://*.amazon.ca/ap/signin*",
    "https://*.amazon.com.mx/ap/signin*",
    "https://*.amazon.com.au/ap/signin*",
    "https://*.amazon.com.br/ap/signin*",
    "https://*.amazon.in/ap/signin*",
    "https://*.amazon.sg/ap/signin*",
    "https://*.amazon.ae/ap/signin*",
    "https://*.amazon.sa/ap/signin*",
    "https://*.amazon.com.tr/ap/signin*",
    "https://*.amazon.nl/ap/signin*",
    "https://*.amazon.se/ap/signin*",
    "https://*.amazon.pl/ap/signin*",
    "https://*.amazon.com/amazonsell/payments*",
    "https://login.microsoftonline.com/common/oauth2/*",
    "https://login.live.com/oauth20_authorize.srf*",
    "https://login.microsoft.com/consumers/fido/get*",
  ],
  ue = [
    "https://*.amazon.com/ax/claim/webauthn*",
    "https://*.amazon.co.jp/ax/claim/webauthn*",
    "https://*.amazon.co.uk/ax/claim/webauthn*",
    "https://*.amazon.de/ax/claim/webauthn*",
    "https://*.amazon.fr/ax/claim/webauthn*",
    "https://*.amazon.it/ax/claim/webauthn*",
    "https://*.amazon.es/ax/claim/webauthn*",
    "https://*.amazon.ca/ax/claim/webauthn*",
    "https://*.amazon.com.mx/ax/claim/webauthn*",
    "https://*.amazon.com.au/ax/claim/webauthn*",
    "https://*.amazon.com.br/ax/claim/webauthn*",
    "https://*.amazon.in/ax/claim/webauthn*",
    "https://*.amazon.sg/ax/claim/webauthn*",
    "https://*.amazon.ae/ax/claim/webauthn*",
    "https://*.amazon.sa/ax/claim/webauthn*",
    "https://*.amazon.com.tr/ax/claim/webauthn*",
    "https://*.amazon.nl/ax/claim/webauthn*",
    "https://*.amazon.se/ax/claim/webauthn*",
    "https://*.amazon.pl/ax/claim/webauthn*",
    "https://login.microsoft.com/consumers/fido/create*",
  ],
  Qe = ["https://sellercentral.amazon.com/amazonsell/payments"],
  S = {
    login: {
      configKey: "passkey_urls",
      fallbackMatches: le,
      scripts: [
        {
          id: "zf-passkey-login",
          js: ["content/amazon_signin.js"],
          runAt: "document_start",
          persistAcrossSessions: !0,
        },
      ],
    },
    register: {
      configKey: "passkey_register_urls",
      fallbackMatches: ue,
      scripts: [
        {
          id: "zf-passkey-register-intercept",
          js: ["content/amazon_intercept.js"],
          runAt: "document_start",
          persistAcrossSessions: !0,
        },
        {
          id: "zf-passkey-register-page",
          js: ["content/amazon_passkey_page.js"],
          runAt: "document_start",
          world: "MAIN",
          persistAcrossSessions: !0,
        },
      ],
    },
  },
  he = { login: le, register: ue };
let K = Promise.resolve();
function $(e, t) {
  const o = S[e],
    n = K.catch(() => {}).then(async () => {
      const r = o.scripts.map((l) => ({ ...l, matches: [...t] })),
        s = await chrome.scripting.getRegisteredContentScripts({ ids: r.map((l) => l.id) }),
        i = new Set(s.map((l) => l.id)),
        a = r.filter((l) => i.has(l.id)),
        c = r.filter((l) => !i.has(l.id));
      (a.length && (await chrome.scripting.updateContentScripts(a)),
        c.length && (await chrome.scripting.registerContentScripts(c)),
        (he[e] = [...t]));
    });
  return ((K = n.catch(() => {})), n);
}
function et(e, t) {
  try {
    const o = new URL(t);
    return he[e].some((n) => {
      if (n === "<all_urls>") return ["http:", "https:", "file:", "ftp:"].includes(o.protocol);
      const r = /^(\*|http|https|file|ftp):\/\/([^/]*)(\/.*)$/.exec(n);
      if (!r) return !1;
      const [, s, i, a] = r,
        c = s === "*" ? o.protocol === "http:" || o.protocol === "https:" : o.protocol === `${s}:`,
        l = i.startsWith("*.") ? i.slice(2) : i,
        p = i === "*" || o.hostname === l || (i.startsWith("*.") && o.hostname.endsWith(`.${l}`)),
        m = a.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
      return c && p && new RegExp(`^${m}$`).test(`${o.pathname}${o.search}${o.hash}`);
    });
  } catch {
    return !1;
  }
}
async function tt() {
  await Promise.all(Object.keys(S).map((e) => $(e, S[e].fallbackMatches)));
}
async function ot() {
  await Promise.all(
    Object.keys(S).map(async (e) => {
      const t = S[e];
      try {
        const n = (await d.getInfoByKey({ key: t.configKey }))?.data?.contents;
        if (!Array.isArray(n) || !n.length || !n.every((r) => typeof r == "string"))
          throw new Error("配置为空或格式无效");
        await $(e, [...new Set(n)]);
      } catch (o) {
        (console.warn(`[ZF Passkey] ${t.configKey} 获取或注册失败，使用内置注入地址`, o),
          await $(e, t.fallbackMatches));
      }
    }),
  );
}
function H(e, t) {
  return et(e, t);
}
function nt(e) {
  try {
    const t = new URL(e);
    return Qe.some((o) => {
      const n = new URL(o);
      return (
        t.origin === n.origin && t.pathname.replace(/\/$/, "") === n.pathname.replace(/\/$/, "")
      );
    });
  } catch {
    return !1;
  }
}
function rt(e, t, o) {
  const n = e?.action;
  if (n === "sync-passkeys-from-backend")
    return (
      (async () => {
        const r = await O();
        if (!r) {
          o({ ok: !1, error: "拉取失败或未配置" });
          return;
        }
        const s = await I();
        (await L(Ge(s, r)), o({ ok: !0 }));
      })(),
      !0
    );
  if (n === "prepare-empty-login-authenticator") {
    const r = e.tabId || t?.tab?.id;
    if (!r) return (o({ ok: !1, error: "unknown tabId" }), !0);
    const s = e.url || t?.url;
    return (
      (async () => {
        const i = await O(s);
        if (!i || Object.keys(i).length === 0) {
          o({ ok: !0, ready: !1, list: [], autoInjectPasskey: j() });
          return;
        }
        const a = await ae(r),
          c = Object.entries(i).map(([l, p]) => ({
            account: l,
            rpId: p.rpId,
            createdAt: p.createdAt,
          }));
        o({ ok: !0, ready: a, list: c, autoInjectPasskey: j() });
      })().catch((i) => o({ ok: !1, error: i.message })),
      !0
    );
  }
  if (n === "ensure-virtual-authenticator") {
    const r = e.tabId || t?.tab?.id;
    return r
      ? (Ye(r, e.url || t?.url)
          .then((s) => o({ ok: !0, ready: s }))
          .catch((s) => o({ ok: !1, error: s.message })),
        !0)
      : (o({ ok: !1, error: "unknown tabId" }), !0);
  }
  if (n === "bind-passkey") {
    const { email: r } = e;
    return r
      ? (I()
          .then((s) => {
            const i = s[r];
            return i
              ? se({
                  email: r,
                  credentialId: i.credentialId,
                  privateKey: i.privateKey,
                  userHandle: i.userHandle,
                  rpId: i.rpId,
                  signCount: i.signCount,
                  createdAt: i.createdAt,
                })
              : Promise.reject(new Error("本地无该邮箱凭证"));
          })
          .then((s) => o(s))
          .catch((s) => o({ ok: !1, error: s.message })),
        !0)
      : (o({ ok: !1, error: "missing email" }), !0);
  }
  if (n === "inject-credential") {
    const { email: r, credential: s } = e;
    return !r || !s || !s.credentialId || !s.privateKey
      ? (o({
          ok: !1,
          error: "missing_required_fields: email, credential.credentialId, credential.privateKey",
        }),
        !0)
      : (I()
          .then(
            (i) => (
              (i[r] = {
                credentialId: s.credentialId,
                privateKey: s.privateKey,
                userHandle: s.userHandle || C(r),
                rpId: s.rpId || "amazon.com",
                signCount: s.signCount || 0,
                createdAt: s.createdAt || new Date().toISOString(),
              }),
              L(i)
            ),
          )
          .then(() => o({ ok: !0, email: r }))
          .catch((i) => o({ ok: !1, error: i.message })),
        !0);
  }
  if (n === "remove-credential") {
    const { email: r } = e;
    return r
      ? (I()
          .then((s) => (s[r] ? (delete s[r], L(s)) : Promise.reject(new Error(`凭证不存在: ${r}`))))
          .then(() => o({ ok: !0, email: r }))
          .catch((s) => o({ ok: !1, error: s.message })),
        !0)
      : (o({ ok: !1, error: "missing email" }), !0);
  }
  if (n === "list-credentials")
    return (
      I()
        .then((r) => {
          const s = Object.entries(r).map(([i, a]) => ({
            email: i,
            rpId: a.rpId,
            createdAt: a.createdAt,
            source: a.source,
          }));
          o({ ok: !0, credentials: s });
        })
        .catch((r) => o({ ok: !1, error: r.message })),
      !0
    );
  if (n === "credential-create-detected") {
    const r = t?.tab?.id;
    if (r) {
      const s = f.get(r);
      s &&
        s.registering &&
        ((s.email = D(e.email) || s.email),
        (s.rpId = e.rpId || s.rpId),
        f.set(r, s),
        console.log(`[ZF Passkey] credential-create-detected email=${s.email} rpId=${s.rpId}`));
    }
    return (o({ ok: !0 }), !0);
  }
  if (n === "register-page-ready") {
    const r = t?.tab?.id;
    if (!r) return (o({ ok: !1, error: "unknown tabId" }), !0);
    const s = f.get(r);
    return s && s.registering
      ? (o({ ok: !0, ready: !0 }), !0)
      : (ce(r, e.url, t.frameId)
          .then((i) => o({ ok: !0, ready: i.ready }))
          .catch((i) => {
            (console.error("[ZF Passkey] setupRegistrationAuthenticator 失败:", i.message),
              o({ ok: !1, error: i.message }));
          }),
        !0);
  }
  if (n === "get-tab-status") {
    const r = e.tabId || t?.tab?.id,
      s = r ? f.get(r) : null;
    let i = "idle";
    return (
      s &&
        (s.registering
          ? (i = "registering")
          : s.authenticatorId
            ? (i = "ready")
            : (i = "attached")),
      o({ ok: !0, status: i, email: s?.email || "", rpId: s?.rpId || "" }),
      !0
    );
  }
  return !1;
}
function st() {
  (chrome.tabs.onRemoved.addListener((e) => {
    Oe(e);
  }),
    chrome.debugger.onDetach.addListener((e) => {
      e.tabId &&
        (f.delete(e.tabId), console.log("[ZF Passkey] Debugger detached, tabId:", e.tabId));
    }),
    chrome.webNavigation.onHistoryStateUpdated.addListener(({ tabId: e, frameId: t, url: o }) => {
      t !== 0 ||
        !nt(o) ||
        chrome.scripting
          .executeScript({ target: { tabId: e }, files: ["content/amazon_signin.js"] })
          .catch((n) => {
            console.error("[ZF Passkey] SPA 登录页补注入失败:", n.message);
          });
    }),
    chrome.tabs.onUpdated.addListener((e, t) => {
      if (t.status !== "loading" || !t.url) return;
      const o = t.url,
        n = H("login", o),
        r = H("register", o);
      if (n) {
        const s = f.get(e);
        s && (F(e), (s.registering = !1), (s.authenticatorId = null), f.set(e, s));
      } else
        r &&
          (console.log(`[ZF Passkey] 检测到注册页（URL 变化）: ${o}, tabId: ${e}`),
          ce(e, o).catch((s) => {
            console.error("[ZF Passkey] 自动触发注册拦截失败:", s.message);
          }));
    }));
}
const B = [50, 100, 200, 400, 800];
async function Z(e, t) {
  let o;
  const n = B.length + 1;
  for (let s = 0; s < n; s++)
    try {
      await chrome.tabs.sendMessage(e, t);
      return;
    } catch (i) {
      ((o = i), s < B.length && (await new Promise((a) => setTimeout(a, B[s]))));
    }
  const r = o instanceof Error ? o.message : String(o);
  console.warn("startObserve sendMessage failed after retries", r);
}
const it = 1e4,
  V = new Map(),
  at = "getCookieToolDebugState";
function q(e) {
  return e === !0 || e === 1 || e === "1";
}
function ct(e) {
  return typeof e.tab?.id == "number" ? e.tab.id : -1;
}
function lt(e) {
  const t = Date.now(),
    o = V.get(e) ?? 0;
  return t - o < it ? !1 : (V.set(e, t), !0);
}
let U = !1,
  v = null;
const ut = chrome?.superbrowser;
gt();
const x = De(d),
  z = new _e(),
  ht = {
    decryptKey: "",
    wsDecryptKey: "",
    initJson: {},
    two_step_verification_contents_request: null,
    fisrtCheckIp: !0,
    isDebug: !1,
    platformSpecificList: [],
    firewallWhiteList: [],
    firewallList: [],
    retryStartProxyCount: 0,
    isResquestFirewallWhiteList: !1,
    updateCookieToolPopup() {
      const e = q(this.initJson?.isdebug) ? "cookieTool/index.html" : "";
      chrome.action.setPopup({ popup: e }).catch((t) => {
        u.error(`【zf-mall-helper】updateCookieToolPopup-error:${t}`);
      });
    },
    setupContextMenus() {
      const e = this.userInfo?.level === 1 || this.userInfo?.level === 2;
      chrome.contextMenus.removeAll(() => {
        (chrome.contextMenus.create({
          id: "mall-helper-menu",
          title: "店铺助手",
          contexts: ["all"],
        }),
          chrome.contextMenus.create({
            id: "sync-cookie",
            parentId: "mall-helper-menu",
            title: "同步Cookie",
            contexts: ["all"],
          }),
          chrome.contextMenus.create({
            id: "restore-network",
            parentId: "mall-helper-menu",
            title: "修复网络",
            contexts: ["all"],
          }),
          e &&
            chrome.contextMenus.create({
              id: "add-access-control",
              parentId: "mall-helper-menu",
              title: "添加访问控制",
              contexts: ["all"],
            }));
      });
    },
    init() {
      (Ie({
        getContext: () => ({
          browserId: this.initJson?.browserId,
          mallId: this.initJson?.sysMallId,
        }),
        onClientMessage: (e) => {
          console.log("[superbrowser onClientMessage]", e);
        },
      }),
        u.info("zf-mall-helper-init======>"),
        $e({
          getStoreId: () => this.initJson?.sysMallId,
          getAutoInjectPasskey: () => {
            const e = this.mallInfo?.front_addendum_info;
            if (typeof e != "string") return e?.autoInjectPasskey;
            try {
              return JSON.parse(e)?.autoInjectPasskey;
            } catch {
              return !1;
            }
          },
          getDisabledPasskey: () => {
            const e = this.mallInfo?.front_addendum_info;
            if (typeof e != "string") return e?.disabledPasskey;
            try {
              return JSON.parse(e)?.disabledPasskey;
            } catch {
              return !1;
            }
          },
        }),
        st(),
        tt().catch((e) => {
          console.error("[ZF Passkey] 注册内置注入地址失败:", e);
        }),
        this.setProxyDirect(),
        this.getInitJson(),
        this.initEvent());
    },
    setProxyDirect() {
      u.info("【zf-mall-helper】setProxyDirect");
      const t = {
        value: {
          mode: "pac_script",
          pacScript: {
            data: `function FindProxyForURL(url, host) {
  return "DIRECT" 
}`,
          },
        },
        scope: "regular",
      };
      chrome.proxy.settings.set(t, function () {
        u.info("【zf-mall-helper】setProxyDirect-end");
      });
    },
    getInitJson() {
      u.info("【zf-mall-helper】getInitJson");
      const e = chrome.runtime.getURL("config.dat");
      fetch(e)
        .then((t) => t.text())
        .then((t) => {
          const n = t.split("|");
          if (n.length < 3) throw new Error("Invalid config format");
          const r = W(n[1]),
            s = W(n[2]),
            i = n[0];
          ((this.decryptKey = i.substr(r, 32)),
            (this.wsDecryptKey = i.substr(s, 32)),
            console.log("getInitJson---", this.wsDecryptKey),
            u.info("【zf-mall-helper】getInitJson-end"),
            this.initInitJson());
        });
    },
    initInitJson() {
      u.info("【zf-mall-helper】initInitJson");
      const e = chrome.runtime.getURL("init.json");
      fetch(e)
        .then((t) => t.text())
        .then((t) => {
          const n = JSON.parse(atob(t)),
            r = (this.iv = n.iv);
          this.mac = n.mac;
          const s = n.value,
            i = fe(s, r, this.decryptKey);
          ((this.initJson = JSON.parse(i)),
            this.updateCookieToolPopup(),
            (U = this.initJson.isdebug || !1),
            console.log("initInitJson-initJson", this.initJson),
            u.info("【zf-mall-helper】initInitJson-end"),
            this.initHelperData());
          const a = this.initJson?.appVersion || "1.0.0";
          k.compareVersion(a, "5.2.3") <= 0 &&
            (console.log("5.2.3及之前版本，走黑名单模式  js拦截模式"),
            d
              .getWhiteList()
              .then((c) => {
                v = c;
              })
              .catch((c) => {}));
        })
        .catch((t) => {
          u.error(`【zf-mall-helper】initHelperData-error:${t}`);
        });
    },
    async initHelperData() {
      const e = this.initJson;
      if (
        (await z
          .initialize(String(e.sysMallId || e.browserId || ""))
          .catch((n) => u.error("lastSessionTabs initialize failed", n)),
        e.accessToken && (await ke(e.accessToken)),
        ot().catch((n) => {
          console.error("[ZF Passkey] 刷新注入地址失败:", n);
        }),
        console.log("IPproxy: ", e?.proxyInfo?.proxyAuthUrl || e?.proxyInfo?.proxyUrl),
        console.log("TransProxy: ", e?.staticProxy),
        e.language_setPlugin)
      ) {
        const n = e.language_setPlugin.indexOf("en") > -1 ? "en" : "zh";
        ye(n);
        const r = { language: n, event_type: h.event_type.set_language };
        (console.log("更新set_language通知其他插件：" + r.event_type, r),
          this.syncOtherExtension(r));
      }
      const t = {
        token: this.initJson.accessToken,
        cookie: this.initJson.cookie,
        event_type: h.event_type.login,
        mall_id: this.initJson.sysMallId,
      };
      (console.log("更新token通知其他插件：" + t.event_type, t),
        this.syncOtherExtension(t),
        await this.getUserInfoFun(),
        this.initWebSocket());
      const o = e.logoInfo;
      (o && o.brand_name
        ? chrome.storage.local.set({ systemConfig: o }, function () {
            console.log("设置系统配置：", o);
          })
        : chrome.storage.local.remove("systemConfig"),
        await kt(),
        this.delRules(),
        this.openHelperIndex(),
        this.initPlugins(),
        ut && (console.log("ZF is ready to start-----------"), this.initBookmark(o, e.sysMallId)),
        this.setRefreshToken(),
        x.createPeriodicReportAlarm(60));
    },
    initWebSocket() {
      const e = this.initJson,
        t = e.browserId;
      g.init(
        {
          websocketPort: e.websocketPort,
          iv: this.iv,
          wsDecryptKey: this.wsDecryptKey,
          mac: this.mac,
          browserId: t,
        },
        {
          async onMessageHandle(o) {
            if (
              (o.action !== "HeartBeat" &&
                o.action !== "WriteLog" &&
                console.log("onMessageHandle：", o),
              o.action === h.event_type.install_plugin)
            ) {
              if (o.ret === 200) {
                const n = o.returnObj;
                (console.log("installPlugin：" + n.pluginName),
                  ["1", "3", "4"].includes(n.source)
                    ? !(await k.isExistSameVersionPlugin(n.pluginName, n.version_id)) &&
                      k.install(n)
                    : n.source === "2" &&
                      G({
                        iconUrl: "/icons/update.png",
                        title: n.pluginName + "插件更新成功",
                        message: n.pluginName + "插件更新成功，需要重启后生效！",
                      }));
              }
            } else if (o.event_type === h.event_type.push_delete_plugin) {
              if ((console.log("删除插件--", o), o.plugin_id)) {
                k.unistall(o.plugin_id);
                return;
              }
              const n = o.name;
              chrome.management.getAll(function (r) {
                console.log("本地插件--", r);
                const s = r.filter((i) => i.name === n);
                s &&
                  s.length > 0 &&
                  s.forEach((i) => {
                    (console.log("插件卸载：", i), k.unistall(i.id));
                  });
              });
            }
          },
        },
      );
    },
    openHelperIndex() {
      const e = this.initJson;
      let t = chrome.runtime.getURL("/contentPage/check.html") + "?mallId=" + e?.sysMallId;
      if (globalThis.__SP_BUILD__?.mode === "superpower") {
        if (this.spOpeningCheckPage) return this.spOpeningCheckPage;
        const opening = (async () => {
          const check = new URL(t), mallId = check.searchParams.get("mallId");
          const ownHosts = new Set([check.host, chrome.runtime.id]);
          const destination = tab => tab.pendingUrl || tab.url || "";
          const ownCheck = tab => {
            try {
              const url = new URL(destination(tab));
              return url.protocol === "chrome-extension:" && ownHosts.has(url.host) &&
                url.pathname === check.pathname && url.searchParams.get("mallId") === mallId;
            } catch { return false; }
          };
          const blank = tab => ["about:blank", "chrome://newtab/", "chrome://newtab"].includes(destination(tab));
          const windows = (await chrome.windows.getAll({populate:true})).filter(window => window.type === "normal");
          const tabs = windows.flatMap(window => window.tabs || []), existing = tabs.filter(ownCheck);
          // Remember the tab we created even if Chrome has not exposed its URL
          // yet. Concurrent initialization must share this entire operation.
          const reserved = tabs.find(tab => tab.id === this.spCheckTabId && this.spCheckMallId === mallId &&
            (!destination(tab) || ownCheck(tab) || blank(tab)));
          let target = existing.find(tab => tab.id === this.spCheckTabId) || existing[0] || reserved || tabs.find(blank);
          if (target) {
            const current = await chrome.tabs.get(target.id).catch(() => null);
            target = current && (ownCheck(current) || blank(current) ||
              (current.id === reserved?.id && !destination(current))) ? current : null;
          }
          const opened = target
            ? this.check_completed && ownCheck(target) ? target : await chrome.tabs.update(target.id, {url:t})
            : await chrome.tabs.create({url:t,...(windows[0]?.id ? {windowId:windows[0].id} : {})});
          this.spCheckTabId = opened.id; this.spCheckMallId = mallId;
          // Only remove confirmed duplicates for this shop. A tab may have
          // begun navigating elsewhere since the window snapshot was read.
          for (const duplicate of existing) {
            if (duplicate.id === opened.id) continue;
            const current = await chrome.tabs.get(duplicate.id).catch(() => null);
            if (current && ownCheck(current)) await chrome.tabs.remove(current.id).catch(() => {});
          }
          return opened;
        })().catch(() => {
          u.error("【zf-mall-helper】openCheckPage failed");
        }).finally(() => {
          if (this.spOpeningCheckPage === opening) this.spOpeningCheckPage = null;
        });
        this.spOpeningCheckPage = opening;
        return opening;
      }
      (console.log("打开check页面: " + t),
        u.info(`【zf-mall-helper】openCheckPage:${t}`),
        chrome.windows.getAll({ populate: !0 }, (o) => {
          const n = o.find((r) => r.type == "normal");
          (console.log(`====== Window ID: ${n?.id}`),
            n?.id
              ? (chrome.tabs.update(n?.tabs[0].id, { url: t }),
                u.info(`【zf-mall-helper】openCheckPage:${t} success`))
              : (chrome.tabs.create({ url: t }),
                u.info(`【zf-mall-helper】openCheckPage:${t} create success`)));
        }));
    },
    async initPlugins() {
      u.info("【zf-mall-helper】initPlugins");
      const e = this.initJson;
      if (!e.accessToken) return;
      const o = e.browserId;
      (k.initMallPlugins([o], e, this.userInfo), u.info("【zf-mall-helper】initPlugins-end"));
    },
    async setProxyFun(e) {
      u.info("【zf-mall-helper】setProxyFun");
      const t = this.getProxyInfo();
      console.log("IP代理 ipProxyInfo", t);
      const o = this.getProxyInfo("TransProxy");
      if ((console.log("翻译代理 staticProxyInfo", o), !t || !o)) {
        console.error("ipProxyInfo,staticProxyInfo= ", t, o);
        return;
      }
      const n = await this.getPacScript(t, o);
      (console.log("proxyConfig", n),
        chrome.proxy.settings.set(
          { scope: "regular", value: { mode: "pac_script", pacScript: { data: n, mandatory: globalThis.__SP_BUILD__?.mode === "superpower" } } },
          () => {
            (console.log("代理设置完成"),
              (this.proxy_complete = !0),
              u.info(`【zf-mall-helper】setProxyFun-end:success:${this.proxy_complete}`),
              console.log("proxy_complete", this.proxy_complete),
              e?.skipNotify ||
                setTimeout(() => {
                  chrome.runtime.sendMessage({ type: h.event_type.init_proxy_complete });
                }, 500));
          },
        ));
    },
    async getPacScript(e, t) {
      const o = this.mallInfo?.site_info_id || "",
        n = await mt(this.initJson?.proxyInfo?.proxyIp ?? "", o);
      let r = [];
      if (
        (n.staticResource.length &&
          (r = n.staticResource.map((i) => {
            const a = /^(?:.*?:\/\/)?(?:[^@\n]+@)?([^:\/\n?]+)/i,
              c = i.match(a);
            return c ? c[1] : null;
          })),
        this.initJson.appVersion)
      ) {
        const i = await d.getInfoByKey({ key: "switch_cdn" });
        (console.log("方式开启cdn switch_cdn", i),
          i?.data?.contents === "1" &&
            this.initJson.appVersion &&
            (Ae(n.cdnAcceleratedDomain, "gxyzashy.zhanfubrowser.com"),
            console.log("cdn加速:cdnList----staticList", n.cdnAcceleratedDomain, r)));
      } else {
        if ((this.delRules(), n.cdnAcceleratedDomain.length)) {
          const i = n.cdnAcceleratedDomain.map((a) => {
            const c = /^(?:.*?:\/\/)?(?:[^@\n]+@)?([^:\/\n?]+)/i,
              l = a.match(c);
            return l ? l[1] : null;
          });
          ((r = r.concat(i)), (r = [...new Set(r)]));
        }
        console.log("翻译加速:cdnList----staticArr", n.cdnAcceleratedDomain, r);
      }
      const s = n.directResource;
      return `
    function FindProxyForURL(url, host) {
      const transList = ${JSON.stringify(r)}; 
      const directList = ${JSON.stringify(s)};
      
      const isMatch = (patterns, target) => 
        patterns.some(p  => shExpMatch(target, p) || target.indexOf(p) > -1);
      
      if (isMatch(transList, host) || isMatch(transList, url)) 
        return "SOCKS5 ${t}";
      if (isMatch(directList, host) || isMatch(directList, url)) 
        return "DIRECT";
      return "SOCKS5 ${e}";
    }`;
    },
    getProxyInfo(e = "IpProxy") {
      const t = this.initJson;
      let o = t?.proxyInfo?.proxyAuthUrl || t?.proxyInfo?.proxyUrl;
      e === "TransProxy" && (o = t?.staticProxy?.exchange);
      let n = "";
      if (o) {
        const r = o.match(/:\/\/(.*?)@/);
        n = r ? r[1] : null;
      }
      return n;
    },
    async getUserInfoFun() {
      const e = await d.getUserInfo();
      console.log("getUserInfoFun", e);
      const t = (this.userInfo = e.data);
      ((this.msMid = t.id),
        this.setupContextMenus(),
        t.level !== 1 && this.getUserWebPageListFun());
    },
    getUserWebPageListFun() {
      (console.log("获取员工页面访问限制【经理或老板设置的】"),
        d
          .getUserWebPageList()
          .then((e) => {
            (console.log("getUserWebPageList", e), (this.userPageRule = e.data || []));
          })
          .catch((e) => {
            console.log("getUserWebPageList异常", e);
          }));
    },
    syncOtherExtension(e) {
      const t = this.initJson.pluginIdMap;
      console.log("需要通知的插件ID：", t);
      for (const r in t)
        if (r !== "RXMallHelper") {
          let s = t[r];
          n(s, e);
        }
      let o = 1;
      function n(r, s) {
        chrome.runtime.sendMessage(r, s, function (i) {
          (i?.message ?? "") ||
            (o++,
            setTimeout(() => {
              chrome.runtime.sendMessage(r, s, function (c) {
                !(c?.message ?? "") && o < 10 && n(r, s);
              });
            }, 2e3));
        });
      }
    },
    attachTwoStepAccount(e) {
      if (!e || typeof e != "object") return e;
      const t = this.mallInfo || {};
      return {
        ...e,
        account:
          t.account_name ||
          t.seller_email ||
          t.email ||
          t.shop_account ||
          t.mall_account ||
          t.mall_name ||
          "",
      };
    },
    guardUncheckedTab(tab) {
      this.spPendingDetectionTabs ||= new Set();
      if (this.isDebug || (this.cookie_complete && this.proxy_complete && this.check_completed)) {
        this.spPendingDetectionTabs.delete(tab.id);
        return false;
      }
      const url = tab.pendingUrl || tab.url || "";
      if (!url || ["about:blank", "chrome://newtab/", "chrome://newtab"].includes(url)) {
        // onCreated can precede the destination. Wait for this new tab's
        // onUpdated event instead of closing an extension or restored page.
        this.spPendingDetectionTabs.add(tab.id);
        return false;
      }
      this.spPendingDetectionTabs.delete(tab.id);
      if (!/^https?:\/\//i.test(url)) return false;
      chrome.runtime.sendMessage({type:h.event_type.no_other_action}, {}, () => {});
      chrome.tabs.remove(tab.id).catch(() => {});
      return true;
    },
    initEvent() {
      (u.info("【zf-mall-helper】initEvent"),
        chrome.runtime.onMessage.addListener((e, t, o) => {
          if (['sp:proxy-routes','sp:transfer-speed'].includes(e?.type) && globalThis.__SP_BUILD__?.mode === 'superpower') {
            const options={extensionId:chrome.runtime.id, extensionRoot:chrome.runtime.getURL(''), rpc:(action,args)=>globalThis.__SP_EVENT__(action,args)};
            const operation=e.type==='sp:proxy-routes' ? queryAuthorizedProxyRoutes(t,options) : measureAuthorizedTransfer(e,t,options);
            operation.then(o,()=>o({available:false,message:'无法读取线路状态，请重试'}));
            return true;
          }
          if (e?.type === 'sp:proxy-switch' && globalThis.__SP_BUILD__?.mode === 'superpower') {
            switchAuthorizedProxy(e, t, {
              extensionId: chrome.runtime.id,
              extensionRoot: chrome.runtime.getURL(''),
              rpc: (action, args) => globalThis.__SP_EVENT__(action, args),
              notify: message => chrome.runtime.sendMessage(message),
              readyType: h.event_type.init_proxy_complete,
            }).then(o, error => {
              const failure={isSuccess:false, message:'线路切换失败，请重试或选择其他线路'};
              if(Number.isInteger(error?.candidateIndex)&&error.candidateIndex>=0&&error.candidateIndex<=8)failure.candidateIndex=error.candidateIndex;
              o(failure);
            });
            return true;
          }
          if (
            (console.log(
              "收到来自content-script的消息：" + (e.event_type || e.type || e.action),
              e,
            ),
            console.log("消息来源：" + t.url, t),
            e && typeof e.action == "string" && rt(e, t, o))
          )
            return !0;
          if (e.type === h.event_type.set_proxy)
            (console.log("设置代理[等待ws状态]：", g.getWsConnect()),
              M(
                () => g.getWsConnect(),
                () => {
                  (console.log("开始设置代理：", e), this.proxyHandle(e));
                },
              ));
          else if (e.type === h.event_type.get_init_data) o(this.initJson);
          else if (e.type === at) o({ enabled: q(this.initJson?.isdebug) });
          else {
            if (e.type === h.event_type.get_dynamic_ip_warning_data)
              return (
                M(
                  () => this.mallInfo && this.initJson,
                  () => {
                    const n = this.mallInfo?.has_one_agent_ip || {},
                      r =
                        (Number(n.web_type) === 1 || Number(n.ip_type) === 5) &&
                        !n.area_name.includes("动态2"),
                      s =
                        this.mallInfo?.id ||
                        this.initJson?.sysMallId ||
                        this.initJson?.browserId ||
                        "";
                    o({ show: r, mallid: s });
                  },
                  100,
                  50,
                ),
                !0
              );
            if (e.type === "can_show_access_control")
              o({ allowed: this.userInfo?.level === 1 || this.userInfo?.level === 2 });
            else if (e.type === ge) {
              const n = e.url,
                r = e.name;
              if (!n || !r) {
                o({ value: null });
                return;
              }
              return (
                chrome.cookies.get({ url: n, name: r }, (s) => {
                  o({ value: s?.value ?? null });
                }),
                !0
              );
            } else if (e.type === Te) {
              const n = e.cookie,
                r = n?.url,
                s = n?.name;
              if (!n || !r || !s) {
                o({ ok: !1 });
                return;
              }
              return (
                (async () => {
                  const a = await Be(n);
                  o(a);
                })().catch(() => o({ ok: !1 })),
                !0
              );
            } else if (e.type === h.event_type.check_completed)
              ((this.check_completed = !0),
                console.log("check_completed", this.check_completed),
                this.reportAccessStatus(!0));
            else if (e.type === h.event_type.report_opened_tab_urls)
              (z.start().catch((n) => u.error("lastSessionTabs start failed", n)),
                x.reportOpenedTabUrls("check-page-completed"),
                u.info(`【zf-mall-helper】check_completed:${this.check_completed}`));
            else if (e.type === we) {
              let n = !1;
              try {
                const s = new URL(t.url || "");
                n =
                  t.id === chrome.runtime.id &&
                  s.protocol === "chrome-extension:" &&
                  s.hostname === t.id &&
                  s.pathname === "/contentPage/check.html";
              } catch {}
              if (!n) {
                (u.warn("lastSessionTabs request rejected: invalid source", {
                  senderId: t.id,
                  extensionId: chrome.runtime.id,
                  senderUrl: t.url,
                  expectedUrl: chrome.runtime.getURL("/contentPage/check.html"),
                }),
                  o({ ok: !1, reason: "invalid_source" }));
                return;
              }
              if (!this.cookie_complete || !this.proxy_complete || !this.check_completed) {
                o({ ok: !1, pending: !0 });
                return;
              }
              return (
                (async () => {
                  const s = t.tab?.id ?? e.tabId;
                  if (!Number.isInteger(s)) {
                    (u.warn("lastSessionTabs request rejected: missing tab"),
                      o({ ok: !1, reason: "missing_tab" }));
                    return;
                  }
                  const i = await chrome.tabs.get(s);
                  if (i.url !== t.url || (i.pendingUrl && i.pendingUrl !== t.url)) {
                    (u.warn("lastSessionTabs request rejected: tab URL mismatch"),
                      o({ ok: !1, reason: "tab_url_mismatch" }));
                    return;
                  }
                  this.mallInfo?.sync_cookie + "" == "1" &&
                    !this.isInitCookieListener &&
                    this.initCookieListener();
                  const a = await z.restore(i.windowId);
                  o({ ok: !0, ...a });
                })().catch((s) => {
                  (u.error("lastSessionTabs restore failed", s),
                    o({ ok: !1, reason: "restore_error" }));
                }),
                !0
              );
            } else {
              if (e.type === h.event_type.open_mall)
                return (this.handleMallDataBeforeOpen(e, o), !0);
              if (e.type === h.event_type.enable_debug_mode) {
                ((this.isDebug = !0),
                  (this.initJson.isdebug = !0),
                  this.updateCookieToolPopup(),
                  (U = !0),
                  console.log("启动调试消息 debug:", !0));
                const n = {
                  from: this.initJson.browserId,
                  action: "ClientInvoke",
                  fun_name: h.event_type.enable_debug_mode,
                  profile: "Default",
                };
                g.sendWsData(h.event_type.deal_ipc_data, n);
              } else if (e.type === h.event_type.disable_debug_mode) {
                ((this.isDebug = !1),
                  (this.initJson.isdebug = !1),
                  this.updateCookieToolPopup(),
                  (U = !1),
                  console.log("关闭调试消息 debug:"));
                const n = {
                  from: this.initJson.browserId,
                  action: "ClientInvoke",
                  fun_name: h.event_type.disable_debug_mode,
                  profile: "Default",
                };
                g.sendWsData(h.event_type.deal_ipc_data, n);
              } else if (e.type === "get_two_step_verification_info")
                if (this.two_step_verification_contents)
                  (console.log(
                    "获取两步验证平台信息===缓存获取",
                    this.two_step_verification_contents,
                  ),
                    o(this.attachTwoStepAccount(this.two_step_verification_contents)));
                else
                  return (
                    this.two_step_verification_contents_request ||
                      (this.two_step_verification_contents_request = d
                        .getInfoByKey({ key: "two_step_verification" })
                        .then((n) => {
                          const r = this.mallInfo;
                          console.log("获取所有两步验证平台信息---", n);
                          const s = r?.has_one_platform?.platform_id;
                          if (!s) return null;
                          const i = n.data.contents[s];
                          return (
                            console.log("获取两步验证平台信息:", i, "平台id:", s),
                            (this.two_step_verification_contents = i),
                            i
                          );
                        })
                        .finally(() => {
                          this.two_step_verification_contents_request = null;
                        })),
                    this.two_step_verification_contents_request
                      .then((n) => o(this.attachTwoStepAccount(n)))
                      .catch((n) => {
                        (console.error("获取两步验证平台信息失败:", n), o(null));
                      }),
                    !0
                  );
              else {
                if (e.type === "getTwoStepSecret")
                  return (
                    console.log("getTwoStepSecret data", e),
                    d.getAuthenticationCode({ id: this.initJson.sysMallId }).then((n) => {
                      (console.log("getTwoStepSecret", n), n?.data && o(n.data.code));
                    }),
                    !0
                  );
                if (e.type === "setTwoStepAuthenticationCode") {
                  console.log("setTwoStepAuthenticationCode data", e);
                  const n = this.mallInfo || {},
                    r = {
                      id: Number(this.initJson?.sysMallId || n.id || 0),
                      code: e.code,
                      qr_code: e.qr_code || "",
                      name:
                        n.account_name ||
                        n.seller_email ||
                        n.email ||
                        n.shop_account ||
                        n.mall_account ||
                        n.mall_name ||
                        e.name ||
                        "",
                      is_verify: e.is_verify ?? 1,
                    };
                  return (
                    d
                      .setAuthenticationCode(r)
                      .then((s) => {
                        (console.log("setTwoStepAuthenticationCode", s), o(s));
                      })
                      .catch((s) => {
                        (console.log("setTwoStepAuthenticationCode error", s),
                          o({ error: s?.message || String(s) }));
                      }),
                    !0
                  );
                } else {
                  if (e.type === "get_not_translate_doms")
                    return (
                      d.getInfoByKey({ key: "not_translate_doms" }).then((n) => {
                        let r = n.data.contents;
                        (console.log("not_translate_doms===", r), o(r));
                      }),
                      !0
                    );
                  if (e.event_type === h.event_type.flash_window) {
                    const n = ct(t);
                    if (!lt(n)) {
                      o({ message: "收到高亮请求(已节流，未下发 WS)" });
                      return;
                    }
                    (console.log("店铺任务栏高亮 flash_window"),
                      g.sendWsData(h.event_type.flash_window),
                      o({ message: "收到高亮请求" }));
                  } else if (e.event_type === h.event_type.play_video_mp3)
                    (console.log("店铺铃声 remind"),
                      g.sendWsData(h.event_type.play_video_mp3),
                      o({ message: "收到店铺铃声 remind" }));
                  else {
                    if (e.event_type === h.event_type.message_tip)
                      return (
                        console.log("店铺消息提示 messageTip"),
                        M(
                          () => this.mallInfo,
                          () => {
                            let n = !0;
                            (this.mallInfo?.sms_remind && this.mallInfo?.sms_remind === 1
                              ? (n = !0)
                              : (n = !1),
                              console.log("店铺消息提示 messageTip showMessage", n),
                              o({ showMessage: n }));
                          },
                        ),
                        !0
                      );
                    if (e.type === h.event_type.add_block_list) {
                      console.log("实时添加特例名单 AddBlockList", e.list);
                      const n = {
                        from: this.initJson.browserId,
                        action: "AddBlockList",
                        list: e.list,
                      };
                      return (
                        g.sendWsData(h.event_type.deal_ipc_data, n),
                        setTimeout(() => {
                          chrome.tabs.query({ active: !0, currentWindow: !0 }, (r) => {
                            if (r.length > 0) {
                              const s = r[0];
                              (chrome.tabs.update(s.id, { url: e.rediectUrl }),
                                o("AddBlockList 处理完成"));
                            }
                          });
                        }, 500),
                        !0
                      );
                    } else if (e.type === h.event_type.upload_cookies)
                      (console.log("upload_cookies 上传cookie"), this.cookieUpload());
                    else if (e.type === h.event_type.close_browser)
                      (console.log("close_browser 关闭浏览器"),
                        g.sendWsData(h.event_type.close_browser));
                    else if (e.type === h.event_type.swith_transit) {
                      if (globalThis.__SP_BUILD__?.mode === 'superpower') {
                        o({isSuccess:false, message:'请使用已配置的线路编号切换'});
                        return false;
                      }
                      (console.log("切换中继", e),
                        u.info("【zf-mall-helper=>initEvent】swith_transit"));
                      const n = { proxyInfo: e.proxyInfo };
                      (g.sendWsData(h.event_type.swith_transit, n),
                        setTimeout(() => {
                          chrome.runtime.sendMessage({ type: h.event_type.init_proxy_complete });
                        }, 1e3),
                        o({ message: "切换中继完成" }));
                    }
                  }
                }
              }
            }
          }
        }),
        chrome.tabs.onCreated.addListener((e) => {
          if (globalThis.__SP_BUILD__?.mode === "superpower") {
            x.handleTabCreated(e);
            this.guardUncheckedTab(e);
            return;
          }
          if (
            (x.handleTabCreated(e),
            console.log(
              "cookie_complete,proxy_complete,check_completed :",
              this.cookie_complete,
              this.proxy_complete,
              this.check_completed,
            ),
            u.info(
              `【zf-mall-helper=>initEvent】onCreated:cookie_complete,proxy_complete,check_completed:${this.cookie_complete},${this.proxy_complete},${this.check_completed}`,
            ),
            console.log("isDebug", this.isDebug, e.pendingUrl),
            !this.isDebug &&
              (!this.cookie_complete || !this.proxy_complete || !this.check_completed))
          ) {
            if ((e.pendingUrl || e.url || "").indexOf("chrome://extensions") === 0) return;
            const t = { type: h.event_type.no_other_action };
            chrome.runtime.sendMessage(t, {}, (n) => {
              console.log("收到来自content-script的回复：" + n);
            });
            const o = e.id || 0;
            o && chrome.tabs.remove(o);
          }
        }),
        chrome.tabs.onUpdated.addListener((e, t, o) => {
          x.handleTabUpdated(e, t, o);
          if (globalThis.__SP_BUILD__?.mode === "superpower") {
            if (this.spPendingDetectionTabs?.has(e) &&
                this.guardUncheckedTab({...o,id:e,pendingUrl:o.pendingUrl || t.url})) return;
            // Browser and extension pages do not belong to merchant URL rules.
            if (!/^https?:\/\//i.test(o.url || t.url || "")) return;
            if (!o.url && t.url) o = {...o,url:t.url};
          }
          (t.pinned === !0 || t.pinned === !1) &&
            (console.log("info.pinned", t, o), this.savePinnedPage());
          if (o.status === "loading") {
            if (
              (h.forceCloseTab &&
                h.forceCloseTab.length > 0 &&
                h.forceCloseTab.some((r) => o.url.includes(r)) &&
                e &&
                chrome.tabs.remove(e),
              o.url.includes("/stop.html?specialurl"))
            ) {
              const n = o.url.split("?")[1],
                r = new URLSearchParams(n).get("specialurl") + "",
                s =
                  chrome.runtime.getURL("") +
                  "warning/warning.html?rediectUrl=" +
                  encodeURIComponent(r);
              chrome.tabs.update(o.id, { url: s });
            } else if (o.url.indexOf("http") === 0 && o.url.indexOf("zhanfubrowser.com") < 0) {
              const n = this.initJson?.appVersion || "1.0.0";
              (k.compareVersion(n, "5.2.3") <= 0 && this.newFirewallCheck(o),
                this.checkVisitUrl(o));
            }
          }
          t.status === "complete" &&
            o.url.startsWith("http") &&
            chrome.scripting
              .executeScript({
                target: { tabId: e },
                world: "MAIN",
                func: () => {
                  window.RuxBrowser = {};
                },
              })
              .catch((n) => {
                console.log(" 扩展脚本执行失败:", n);
              });
        }),
        chrome.tabs.onRemoved.addListener(id => this.spPendingDetectionTabs?.delete(id)),
        chrome.alarms.onAlarm.addListener((e) => {
          e.name === "refreshToken"
            ? (console.log("刷新token -----"), d.refreshToken())
            : e.name === "checkIpSame"
              ? this.cookie_complete &&
                this.proxy_complete &&
                this.check_completed &&
                this.checkIPSame(this.mallInfo)
              : e.name === "checkVerification"
                ? this.checkVerification(this.mallInfo)
                : e.name === "checkForcedOffline"
                  ? this.checkForcedOffline(this.mallInfo)
                  : e.name === "cookieUpload"
                    ? this.cookieUpload()
                    : e.name === ee && x.reportOpenedTabUrls("hourly-alarm");
        }),
        chrome.runtime.onSuspend.addListener(() => {}),
        this.setupContextMenus(),
        chrome.contextMenus.onClicked.addListener((e, t) => {
          switch (e.menuItemId) {
            case "sync-cookie":
              (u.info("【zf-mall-helper】contextMenus.onClicked:sync-cookie"),
                this.cookieUpload(!0));
              break;
            case "restore-network":
              (u.info("【zf-mall-helper】contextMenus.onClicked:restore-network"),
                this.setProxyDirect(),
                this.getInitJson());
              break;
            case "add-access-control":
              (u.info("【zf-mall-helper】contextMenus.onClicked:add-access-control"),
                (this.userInfo?.level === 1 || this.userInfo?.level === 2) &&
                  t?.id != null &&
                  Z(t.id, { type: "open-collection-panel" }).catch((o) => {
                    console.warn("open-collection-panel send failed", o);
                  }));
              break;
          }
        }));
    },
    setRules(e) {
      e = e.map((o) => (o.includes("://") || (o = "https://" + o), o));
      const t = this.getRules(e);
      chrome.declarativeNetRequest.getDynamicRules({}, (o) => {
        if (
          (console.log("Current active rules:", o),
          console.log("rules:", t),
          chrome.runtime.lastError)
        ) {
          console.error("getDynamicRules error:", chrome.runtime.lastError);
          return;
        }
        const n = o.map((r) => r.id);
        chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: n, addRules: t }, () => {
          if (chrome.runtime.lastError) {
            console.error("updateDynamicRules error:", chrome.runtime.lastError);
            return;
          }
        });
      });
    },
    getRules(e) {
      const t = "https://gxyzashy.zhanfubrowser.com/";
      let o = [];
      const n = (r) => {
        let s = r.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/^https?:\/\//, "");
        return ((s = `^https?://${s}`.slice(0, 110) + "(.*)$"), s);
      };
      return (
        e.forEach((r, s) => {
          console.log("path", r);
          const i = new URL(r);
          (i.hostname + i.pathname, i.pathname.split("/").slice(0, 4).join("/"));
          const a = n(r);
          console.log(a);
          const c = ft(a) || "";
          (console.log("提前的新path", c), r.slice(0, 110));
          const l = {
            id: s + 1,
            priority: 1,
            action: {
              type: "redirect",
              redirect: { regexSubstitution: `${t + i.hostname + c}\\1` },
            },
            condition: {
              regexFilter: a,
              resourceTypes: [
                "stylesheet",
                "script",
                "font",
                "xmlhttprequest",
                "image",
                "object",
                "media",
              ],
            },
          };
          o.push(l);
        }),
        o
      );
    },
    delRules() {
      chrome.declarativeNetRequest.getDynamicRules({}, (e) => {
        const t = e.map((o) => o.id);
        chrome.declarativeNetRequest.updateDynamicRules({ removeRuleIds: t }, () => {
          chrome.runtime.lastError &&
            console.error("updateDynamicRules error:", chrome.runtime.lastError);
        });
      });
    },
    proxyHandle(e) {
      (console.log("收到设置代理消息setProxy", e),
        console.log(
          "cookie_complete：proxy_complete==",
          this.cookie_complete,
          this.proxy_complete,
        ));
      const t = (this.mallInfo = e.mallInfo);
      ((this.initJson.ip_scene = t.ip_scene),
        console.log("mallInfo", t),
        t.is_report == 1 &&
          (this.checkVerification(t),
          chrome.alarms.create("checkVerification", { periodInMinutes: 0.3 })),
        t.online_count > 0 &&
          !this.initJson?.privateMode?.isPrivateMode &&
          (this.checkForcedOffline(t),
          chrome.alarms.create("checkForcedOffline", { periodInMinutes: 0.1 })));
      const o = t.check_env,
        n = t.site_info_id,
        r = t.has_one_agent_ip && t.has_one_agent_ip.ip_type;
      (o + "" == "1"
        ? ((this.cookie_complete = this.proxy_complete = this.check_completed = !1),
          console.log("初始化重置：cookie_complete，proxy_complete，check_completed"),
          this.fisrtCheckIp
            ? [1, 4].includes(r) &&
              (console.log("开启IP定时检测-----" + r, this.fisrtCheckIp),
              chrome.alarms.create("checkIpSame", { periodInMinutes: 0.5 }))
            : console.log("检测过ip fisrtCheckIp", this.fisrtCheckIp))
        : o + "" == "2" && (this.cookie_complete = this.proxy_complete = this.check_completed = !0),
        dt(n.toString(), this.initJson.installPlugins || []),
        r !== 3
          ? this.setProxyFun()
          : ((this.proxy_complete = !0),
            chrome.runtime.sendMessage({ type: h.event_type.init_proxy_complete })),
        console.log("是否非持久化", t.lasting),
        (t.sync_cookie + "" == "1" && this?.initJson?.commonParams?.is_plugin_sync_cookie === 1) ||
        t.lasting == 2
          ? this.initCookie(t)
          : t.sync_cookie + "" == "1"
            ? ((this.cookie_complete = !0),
              u.info(`【zf-mall-helper】initCookie:${this.cookie_complete}`))
            : ((this.cookie_complete = !0),
              setTimeout(() => {
                chrome.runtime.sendMessage({ type: h.event_type.init_proxy_complete });
              }, 500)));
    },
    initCookie(e) {
      ((this.cookie_complete = !1),
        u.info(`【zf-mall-helper】initCookie.:${this.cookie_complete}`));
      const t = {};
      if (((t.cipherText = e.cookie_key || ""), !t.cipherText)) {
        ((this.cookie_complete = !0), u.info("【zf-mall-helper】initCookie:empty cipher text"));
        return;
      }
      d.decryptData(t)
        .then(async (o) => {
          const n = o.data && o.data.plainText;
          if (!n) {
            u.warn("【zf-mall-helper】initCookie:empty decrypted cookie");
            return;
          }
          const r = be(n),
            s = await Pe(r, "all");
          u.info(
            `【zf-mall-helper】initCookie:imported=${s.imported},failed=${s.failed.length},skipped=${s.skipped.length}`,
          );
        })
        .catch((o) => {
          u.error(
            `【zf-mall-helper】initCookie:error:${o instanceof Error ? o.message : String(o)}`,
          );
        })
        .finally(() => {
          ((this.cookie_complete = !0),
            u.info(`【zf-mall-helper】initCookie:complete:${this.cookie_complete}`));
        });
    },
    checkIPSame(e) {
      e.has_one_agent_ip && e.has_one_agent_ip.protocol_family;
      const t = e.has_one_agent_ip.map_ip || e.has_one_agent_ip.ip || "";
      (e.has_one_agent_ip.web_type || 2) !== 1 &&
        de({ targetIP: t }).then(({ successCount: n, totalCount: r }) => {
          (n > 0
            ? (this.setRequestInterceptIds && Ce(this.setRequestInterceptIds),
              (this.setRequestInterceptIds = []))
            : r > 0 &&
              (console.error("环境异常：IP不一致拦截，尝试重新设置代理"),
              u.error("【zf-mall-helper】checkIPSame:IP dissimilarity，try again"),
              this.setProxyFun({ skipNotify: !0 }),
              u.error("【zf-mall-helper】checkIPSame:again setProxyFun")),
            (this.fisrtCheckIp = !1));
        });
    },
    async handleMallDataBeforeOpen(e, t) {
      (this.mallInfo.sync_cookie + "" == "1" &&
        !this.isInitCookieListener &&
        this.initCookieListener(),
        (e.password_k = ""));
      const o = this.initJson;
      if (e.password) {
        const r = await d.decryptData({ cipherText: e.password });
        ((e.password_k = (r.data && r.data.plainText) || ""), console.log("密码解密后", r, e));
      }
      var n = o.pluginIdMap.RXAccountManage;
      chrome.runtime.sendMessage(n, e, (r) => {
        console.log("数据已传输到账号密码扩展，并收到来自账号密码扩展的响应：", r);
      });
    },
    savePinnedPage() {
      chrome.tabs.query({ pinned: !0 }, (e) => {
        if (
          (console.log("chrome.tabs.query", e), u.info(`【zf-mall-helper】savePinnedPage:${e}`), e)
        ) {
          const t = new Set();
          (e.length &&
            e.map((n) => {
              t.add(n.url);
            }),
            console.log("urlList", Array.from(t)));
          const o = { tag_pages: Array.from(t), mall_id: parseInt(this.initJson.sysMallId) };
          d.addTagPages(o)
            .then((n) => {
              console.log("addTagPages", n);
            })
            .catch((n) => {
              console.log("err", n);
            });
        }
      });
    },
    async newFirewallCheck(e) {
      const t = e.url.split("?")[0];
      if (!this.isResquestFirewallWhiteList)
        try {
          let r = this.initJson?.proxyInfo?.proxyIp ?? "";
          const s = this.mallInfo.has_one_agent_ip && this.mallInfo.has_one_agent_ip.ip_type;
          ((s == 5 || s == 3 || s == 2) && (r = ""),
            v || (v = await d.getWhiteList()),
            console.log("防火墙白名单 getWhiteList", v));
          const i = await d.getFirewallNew({ ip: r, ip_scene: this.mallInfo.ip_scene });
          ((this.platformSpecificList = i.data.dedicatedList || []),
            (this.firewallList = i.data.firewallBlack || []),
            (this.firewallWhiteList = (i.data.firewallWhite || []).concat(v?.firewallWhite || [])),
            (this.exceptionsBlacklist = i.data.exceptionsBlacklist || []),
            console.log("防火墙数据 getFirewallNew", i, this.firewallWhiteList),
            (this.isResquestFirewallWhiteList = !0));
        } catch (r) {
          console.error(r);
        }
      if (this.platformSpecificList.length > 0) {
        const r = this.platformSpecificList.some((i) => Y(t, i));
        let s = !1;
        if (
          (r ||
            (s = this.exceptionsBlacklist.some((i) => {
              const a = t.includes(i);
              return (a && console.log(`${t} 属于专用特例名单`, i), a);
            })),
          !r && !s)
        ) {
          console.error(`${t} 不属于平台专用白名单--`);
          const i =
            chrome.runtime.getURL("") + "/warning/warning.html?rediectUrl=" + encodeURIComponent(t);
          chrome.tabs.update(e.id, { url: i });
        }
        return;
      }
      const o = this.firewallWhiteList.some((r) => {
        const s = Y(t, r);
        return (s && console.log(`${t} 属于白名单`, r), s);
      });
      let n = !1;
      if (
        (o ||
          (n = this.exceptionsBlacklist.some((r) => {
            const s = t.includes(r);
            return (s && console.log(`${t} 属于特例名单`, r), s);
          })),
        !o && !n)
      ) {
        console.error(`---STOP--- ${t}`);
        const r =
          chrome.runtime.getURL("") + "/warning/warning.html?rediectUrl=" + encodeURIComponent(t);
        chrome.tabs.update(e.id, { url: r });
      }
    },
    checkVisitUrl(e) {
      const t = this.userPageRule || [],
        o = e.url;
      if (t.length < 1) return;
      console.log("检测员工是否访问限制", o);
      let n = {},
        r = [],
        s = "",
        i = [];
      for (const p in t) {
        const m = t[p],
          b = m.web_url;
        if (typeof m.element == "string")
          try {
            const y = JSON.parse(m.element);
            m.element = Array.isArray(y) ? y : [];
          } catch {
            m.element = [];
          }
        else Array.isArray(m.element) || (m.element = []);
        if (o.indexOf(b) === 0)
          (console.log("完整网站匹配", m),
            (s = m?.web_name || ""),
            (n = m.rule_list[0]),
            (i = n.mall_ids || []),
            (r = [...r, ...m.element]));
        else if (b.includes("*") && pt(o, b))
          (console.log("通配符匹配", m),
            (s = m?.web_name || ""),
            (n = m.rule_list[0]),
            (i = n.mall_ids || []),
            (r = [...r, ...m.element]));
        else
          try {
            const y = new URL(o).hostname,
              A = new URL(b).hostname;
            y === A &&
              (console.log("域名匹配成功", m),
              (i = m.rule_list[0].mall_ids || []),
              (r = [...r, ...m.element]));
          } catch {}
      }
      (console.log("urlRule", n),
        console.log("web_name========>", s),
        console.log("elementRule========>", r));
      const a = n.is_intercept === 1 || !1;
      n.rule_name;
      const c = this.mallInfo.id || 0;
      let l = !1;
      if ((Array.isArray(i) && i.length > 0 ? (l = i.includes(c)) : (l = !0), l))
        if (a) {
          const p = o.replace(/(?!.*\/)$/, "/"),
            m =
              chrome.runtime.getURL("/visitRules/warning.html") +
              "?rediectUrl=" +
              encodeURIComponent(p) +
              "&ruleName=" +
              s;
          (console.log("warnUrl", m), chrome.tabs.update(e.id, { url: m }));
        } else
          r &&
            r.length > 0 &&
            (console.log("按钮功能禁用", r),
            r.forEach((p) => {
              this.startObserve(e, p);
            }));
      else {
        console.log("有限制店铺列表，当前店铺不在限制店铺中，不拦截", l);
        return;
      }
    },
    startObserve(e, t) {
      const o = e?.id;
      o != null &&
        (console.log("发送禁用按钮消息", o, t),
        Z(o, { event_type: h.event_type.observe_disabled_element, element: t }));
    },
    temuIntercept(e) {
      const t = e.url.split("?")[0],
        o = this.mallInfo.ip_white_list || [];
      if (!(o.length < 1) && !o.some((n) => t.indexOf(n) > -1)) {
        console.log("temu-白名单", o);
        const n = t.replace(/(?!.*\/)$/, "/"),
          r =
            chrome.runtime.getURL("/visitRules/warning.html") +
            "?rediectUrl=" +
            encodeURIComponent(JSON.stringify(n)) +
            "&ruleName=temu";
        (console.log("warnUrl", r), chrome.tabs.update(e.id, { url: r }));
      }
    },
    initBookmark(e, t) {
      try {
        ve.init(e, t);
      } catch {}
    },
    initCookieListener() {
      (console.log("========初始化监听cookie========"), (this.isInitCookieListener = !0));
      const e = pe((o) => {
        (console.log("handleOnChanged", this.initJson),
          console.log("监听 Cookie changed:", o.cookie),
          chrome.cookies.getAll({}, (n) => {
            const r = [];
            for (var s = 0; s < n.length; s++) {
              const c = n[s];
              c.domain.indexOf("zhanfubrowser") < 0 && r.push(c);
            }
            const i = r.length ? JSON.stringify(r) : "",
              a = { mallId: this.initJson.browserId, cookie: i };
            (g.sendWsData(h.event_type.update_mall_cookie, a),
              chrome.storage.local.set({ mallCookie: a }));
          }));
      }, 2e3);
      chrome.cookies.onChanged.addListener(e);
      const t = this.initJson?.appVersion || "1.0.0";
      k.compareVersion(t, "5.2.3") === 1 &&
        (console.log("====客户端闹钟上传===="),
        chrome.alarms.create("cookieUpload", { periodInMinutes: 4 }));
    },
    handleOnChanged(e) {
      (console.log("handleOnChanged", this.initJson),
        console.log("监听 Cookie changed:", e.cookie),
        chrome.cookies.getAll({}, (t) => {
          const o = [];
          for (var n = 0; n < t.length; n++) {
            const i = t[n];
            i.domain.indexOf("zhanfubrowser") < 0 && o.push(i);
          }
          const r = o.length ? JSON.stringify(o) : "",
            s = { mallId: this.initJson.browserId, cookie: r };
          g.sendWsData(h.event_type.update_mall_cookie, s);
        }));
    },
    cookieUpload(e) {
      if (
        (chrome.storage.local.get(["mallCookie"], (t) => {
          if (t && t.mallCookie) {
            const o = { ...t.mallCookie, reportingType: e ? 1 : 0 };
            d.setCookie(o).then((n) => {
              (console.log("---setCookie----", n.message),
                e &&
                  G({
                    iconUrl: "/icons/update.png",
                    title: "",
                    message: `同步Cookie成功，请通知需访问【${this.mallInfo.mall_name}】店铺的其他子账号重启该店铺！`,
                  }));
            });
          }
        }),
        e)
      ) {
        const t = {};
        (g.sendWsData(h.event_type.upload_cache, t),
          setTimeout(() => {
            (console.log("5-秒后执行任务-同步缓存文件"),
              g.sendWsData(h.event_type.upload_cache, t));
          }, 5e3));
      }
    },
    setRefreshToken() {
      const e = this.initJson,
        t = new Date(e.tokenExpiredTime).getTime(),
        o = new Date().getTime(),
        n = Math.floor((t - o) / 1e3 / 60 - 60);
      chrome.alarms.create("refreshToken", { delayInMinutes: n });
    },
    checkVerification(e) {
      d.reportVerification({ mall_id: e.id, mallId: e.id }).then((t) => {
        t.data === 1 &&
          (u.info("【zf-mall-helper】checkVerification:close_browser"),
          g.sendWsData(h.event_type.close_browser));
      });
    },
    checkForcedOffline(e) {
      d.reportCheckForcedOffline({
        mallId: e.id,
        mac: this.initJson.MacAdress === "00:00:00:00:00:00" ? "" : this.initJson.MacAdress,
        mall_id: e.id,
      }).then((t) => {
        t.data === 1 &&
          (u.info("【zf-mall-helper】checkForcedOffline:close_browser"),
          g.sendWsData(h.event_type.close_browser));
      });
    },
    reportAccessStatus(e) {
      const t = this.mallInfo?.id || this.initJson?.sysMallId;
      if (!t) {
        u.warn("【zf-mall-helper】setAccessStatus:skip empty mall_id");
        return;
      }
      const o = this.initJson?.MacAdress || "",
        n = o === "00:00:00:00:00:00" ? "" : o,
        r = { mall_id: Number(t), mac: n, is_accessing: e };
      d.setAccessStatus(r)
        .then((s) => {
          u.info("【zf-mall-helper】setAccessStatus:success", s, r);
        })
        .catch((s) => {
          u.error("【zf-mall-helper】setAccessStatus:error", s, r);
        });
    },
    resetProxy() {
      this.retryStartProxyCount < 1 &&
        (console.log("尝试重新设置代理，次数:", this.retryStartProxyCount + 1),
        this.getInitJson(),
        (this.retryStartProxyCount += 1));
    },
  };
ht.init();
async function mt(e, t) {
  let o = [],
    n = [],
    r = [];
  try {
    if (e) {
      const s = { ip: e };
      t && (s.id = t);
      let i = await d.getStaticByIp(s);
      (i.errorCode === 0 &&
        ((o = i.data.acceleratedDomain || []),
        (n = i.data.blackList || []),
        (o = o.map((a) => a.replace(/^https?:\/\//, ""))),
        (n = n.map((a) => a.replace(/^https?:\/\//, ""))),
        (r = i.data.cdnAcceleratedDomain || [])),
        console.log(`获取${e}静态代理资源：`, i));
    }
  } catch (s) {
    console.log("获取配置代理资源异常", s);
  } finally {
    return (
      console.log("最终静态代理资源：", o),
      { staticResource: o, directResource: n, cdnAcceleratedDomain: r }
    );
  }
}
function pt(e, t) {
  console.warn("🚀🚀🚀 ~ isValidWildcardPattern ~ url, pattern:", e, t);
  const o = t.replace(/\*/g, "([^.]+)");
  return new RegExp(`^${o}(\\/.*)?(\\?.*)?$`).test(e);
}
function dt(e, t) {
  switch ((console.log("安装平台扩展", e), e)) {
    case "12":
      k.sendPluginInfo("bhghoamapcdpbohphigoooaddinpkbai");
      break;
    case "30":
      k.sendPluginInfo("mllgpgplbnpdhaogciofgbjjnjlijgoo");
      break;
  }
  t.forEach(({ plugin_name: o, chrome_id: n }) => {
    (console.log("安装外部插件----", o, n), k.sendPluginInstall(o, "0.0.0"));
  });
}
function G(e) {
  chrome.notifications.create("", {
    type: "basic",
    iconUrl: e.iconUrl,
    title: e.title,
    message: e.message,
  });
}
function ft(e) {
  const t = e.indexOf("://") + 3,
    o = e.indexOf("/", t);
  if (o === -1) return null;
  const n = e.indexOf("(", o);
  return e.substring(o, n !== -1 ? n : void 0).replace(/\\./g, ".");
}
function gt() {
  ["log", "warn", "error", "info", "debug"].forEach((e) => {
    const t = console[e];
    console[e] = function () {
      U && t.apply(console, [...arguments]);
    };
  });
}
async function kt() {
  (await chrome.alarms.clearAll()) && console.log("所有闹钟均已清理完毕");
}
function Y(e, t) {
  try {
    const o = new URL(e).hostname,
      n = t.startsWith("http") ? new URL(t).hostname : t;
    return o === n || o.endsWith("." + n);
  } catch {
    return !1;
  }
}
