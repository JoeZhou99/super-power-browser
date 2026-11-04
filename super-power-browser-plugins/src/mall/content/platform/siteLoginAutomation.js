(function () {
  "use strict";
  const b = {
    sites: [
      {
        site_key: "sellercentral.amazon.com",
        note: "亚马逊卖家中心：登录/MFA 页自动勾选「记住」类选项",
        rules: [
          {
            path_prefix: "/ap/mfa",
            enabled: !0,
            note: "MFA 页：记住设备",
            steps: [
              {
                id: "auth-mfa-remember-device",
                type: "check",
                optional: !0,
                note: "勾选 rememberDevice",
                selectors: ["input[name='rememberDevice']"],
                target_checked: !0,
                retry: { max: 3, interval_ms: 400 },
              },
            ],
          },
          {
            path_prefix: "/ap/signin",
            enabled: !0,
            note: "登录页：记住我",
            steps: [
              {
                id: "rememberMe",
                type: "check",
                optional: !0,
                note: "勾选 rememberMe",
                selectors: ["input[name='rememberMe']"],
                target_checked: !0,
                retry: { max: 3, interval_ms: 400 },
              },
            ],
          },
          {
            path_prefix: "/ap/register",
            enabled: !0,
            note: "注册页：确保 i18n-prefs 存在并续期到当前站点最长过期时间",
            steps: [
              {
                id: "ensure-i18n-prefs-cookie",
                type: "ensure_cookie",
                optional: !0,
                note: "不存在则创建；存在则续期（通过 background 的 chrome.cookies.set）",
                cookie: {
                  url: "https://www.amazon.com/",
                  name: "i18n-prefs",
                  value: "",
                  domain: ".amazon.com",
                  path: "/",
                  secure: !0,
                  sameSite: "no_restriction",
                },
              },
            ],
          },
        ],
      },
    ],
  };
  function w(e, t, n) {
    var s;
    const o = t.trim().toLowerCase(),
      a = n.startsWith("/") ? n : `/${n}`,
      r = e.sites.find((d) => d.site_key === o);
    if (!((s = r == null ? void 0 : r.rules) != null && s.length)) return null;
    let u = null,
      c = -1;
    for (const d of r.rules) {
      if (!d.enabled) continue;
      const m = d.path_prefix;
      !m || !a.startsWith(m) || (m.length > c && ((c = m.length), (u = d)));
    }
    return u;
  }
  const g = "upsert_chrome_cookie_with_max_expiry";
  function v(e) {
    var t;
    return typeof chrome > "u" || !((t = chrome.runtime) != null && t.sendMessage)
      ? Promise.resolve(!1)
      : chrome.runtime
          .sendMessage({ type: g, cookie: e.cookie })
          .then((n) => !!(n != null && n.ok))
          .catch(() => !1);
  }
  let k = null,
    f = null,
    p = "",
    y = null;
  function E() {
    try {
      return window.localStorage.getItem("isDebugger") === "1";
    } catch {
      return !1;
    }
  }
  function i(...e) {
    E() && console.log("[ZF SiteLoginAutomation]", ...e);
  }
  function M(e) {
    if (!(e instanceof HTMLElement) || e.hidden) return !1;
    if (e.offsetParent === null && e.tagName !== "BODY") {
      const t = e.getBoundingClientRect();
      if (t.width === 0 && t.height === 0) return !1;
    }
    return e.offsetWidth > 0 || e.offsetHeight > 0 || e.tagName === "INPUT";
  }
  function x(e, t) {
    const n = [];
    function o(a) {
      var c;
      const r = (c = a.querySelectorAll) == null ? void 0 : c.call(a, t);
      r && n.push(...Array.from(r));
      const u = a instanceof Document ? a.body : a;
      !u ||
        !(u instanceof Element) ||
        u.querySelectorAll("*").forEach((s) => {
          s.shadowRoot && o(s.shadowRoot);
        });
    }
    return (o(e), n);
  }
  function A(e) {
    for (const t of e) {
      if (!t.trim()) continue;
      const n = x(document, t);
      for (const o of n)
        if (M(o) && !o.disabled) return (i("matched selector", { selector: t, tag: o.tagName }), o);
    }
    return null;
  }
  function l(e) {
    return new Promise((t) => window.setTimeout(t, e));
  }
  async function S(e) {
    const t = e.cookie;
    if (!(t != null && t.url) || !t.name)
      return (i("ensure_cookie missing cookie config", { id: e.id }), !1);
    const n = await v({
      cookie: {
        url: t.url,
        name: t.name,
        value: t.value ?? "",
        domain: t.domain,
        path: t.path ?? "/",
        secure: t.secure ?? !0,
        sameSite: t.sameSite ?? "no_restriction",
      },
    });
    return (i("ensure_cookie result", { id: e.id, ok: n }), n);
  }
  async function T(e, t) {
    const n = e;
    if (n.tagName !== "INPUT") return (n.click(), !0);
    const o = n.type;
    return o !== "checkbox" && o !== "radio"
      ? (n.click(), !0)
      : typeof t == "boolean"
        ? (n.checked === t ||
            ((n.checked = t),
            n.dispatchEvent(new Event("input", { bubbles: !0 })),
            n.dispatchEvent(new Event("change", { bubbles: !0 }))),
          !0)
        : (n.click(), !0);
  }
  async function L(e, t) {
    if (
      (e.dispatchEvent(new MouseEvent("click", { bubbles: !0, cancelable: !0 })),
      typeof t == "boolean")
    ) {
      await l(0);
      const n = e.getAttribute("aria-checked");
      return t === !0 ? n === "true" : t === !1 ? n === "false" : !0;
    }
    return !0;
  }
  async function O(e) {
    var a;
    i("run step", {
      id: e.id,
      type: e.type,
      optional: e.optional,
      delay_ms: e.delay_ms ?? 0,
      retry: e.retry ?? null,
    });
    const t = e.delay_ms ?? 0;
    t > 0 && (await l(t));
    const n = e.retry ? e.retry.max + 1 : 1,
      o = ((a = e.retry) == null ? void 0 : a.interval_ms) ?? 0;
    for (let r = 0; r < n; r++) {
      i("step attempt", { id: e.id, attempt: r + 1, maxAttempts: n });
      try {
        if (e.type === "ensure_cookie") {
          const s = await S(e);
          if (!s && r < n - 1 && o > 0) {
            await l(o);
            continue;
          }
          return s;
        }
        const u = e.selectors ?? [],
          c = A(u);
        if (!c) {
          (i("no element matched", { id: e.id }), r < n - 1 && o > 0 && (await l(o)));
          continue;
        }
        if (e.type === "check") await T(c, e.target_checked);
        else if (!(await L(c, e.target_aria_checked)) && r < n - 1 && o > 0) {
          (i("click aria state not matched, retrying", { id: e.id, target: e.target_aria_checked }),
            await l(o));
          continue;
        }
        return (i("step success", { id: e.id }), !0);
      } catch {
        (i("step error", { id: e.id }), r < n - 1 && o > 0 && (await l(o)));
      }
    }
    return (i("step failed", { id: e.id }), !1);
  }
  async function I(e) {
    for (const t of e.steps)
      if (!(await O(t)))
        return (
          t.optional ||
            console.warn("[ZF SiteLoginAutomation] required step failed:", t.id, t.selectors),
          !1
        );
    return !0;
  }
  function P() {
    return `${location.pathname}${location.search}`;
  }
  function h() {
    (f != null && window.clearTimeout(f),
      (f = window.setTimeout(() => {
        ((f = null), N());
      }, 400)));
  }
  async function N() {
    const e = P();
    e !== p && ((p = e), (y = null), i("path changed", { watchedPath: p }));
    const t = w(b, location.hostname, location.pathname);
    if (!t || !t.steps.length) {
      i("no rule matched", { hostname: location.hostname, pathname: location.pathname });
      return;
    }
    const n = `${location.hostname}|${e}|${t.path_prefix}`;
    if (y === n) {
      i("chain already completed, skip", { chainKey: n });
      return;
    }
    (i("rule matched", {
      hostname: location.hostname,
      path_prefix: t.path_prefix,
      steps: t.steps.map((a) => a.id),
    }),
      (await I(t))
        ? ((y = n), i("chain completed", { chainKey: n }))
        : i("chain not completed yet (will retry on DOM changes)", { chainKey: n }));
  }
  function R() {
    (h(),
      (k = new MutationObserver((e) => {
        e.some((t) => t.addedNodes.length > 0) && h();
      })),
      k.observe(document.body, { childList: !0, subtree: !0 }),
      window.addEventListener("popstate", h),
      window.addEventListener("hashchange", h));
  }
  function _() {
    if (document.body) {
      R();
      return;
    }
    document.addEventListener("DOMContentLoaded", _, { once: !0 });
  }
  _();
})();
