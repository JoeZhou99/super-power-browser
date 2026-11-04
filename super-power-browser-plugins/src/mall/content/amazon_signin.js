(function () {
  "use strict";
  function g(e, t) {
    if (!t) return !0;
    try {
      const n = new URL(t).hostname.toLowerCase(),
        o = (e || "").replace(/^\./, "").toLowerCase(),
        s = (r) => r.split(".").includes("amazon"),
        a = ["login.microsoft.com", "login.microsoftonline.com", "login.live.com"],
        i = (r) => a.includes(r);
      return (s(n) && s(o)) || (i(n) && i(o)) ? !0 : !!o && (n === o || n.endsWith(`.${o}`));
    } catch {
      return !0;
    }
  }
  function m(e, t = "success") {
    const n = document.getElementById("zf-passkey-toast-host");
    n && n.remove();
    const o = document.createElement("div");
    ((o.id = "zf-passkey-toast-host"),
      (o.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:18px",
        "transform:translateX(-50%)",
        "z-index:2147483647",
        "pointer-events:none",
        "display:flex",
        "justify-content:center",
        "width:auto",
        "max-width:calc(100% - 24px)",
      ].join(";")));
    const s = document.createElement("div");
    ((s.textContent = e),
      (s.style.cssText = [
        "display:inline-block",
        "padding:10px 14px",
        "border-radius:999px",
        "color:#fff",
        "font-size:13px",
        "line-height:1.4",
        `background:${t === "success" ? "#16a34a" : "#dc2626"}`,
        "box-shadow:0 10px 24px rgba(0,0,0,0.18)",
        "opacity:0",
        "transition:opacity 0.2s ease",
        "pointer-events:auto",
      ].join(";")),
      o.appendChild(s),
      document.documentElement.appendChild(o),
      requestAnimationFrame(() => {
        s.style.opacity = "1";
      }),
      window.setTimeout(() => {
        ((s.style.opacity = "0"), window.setTimeout(() => o.remove(), 220));
      }, 5e3));
  }
  function h(e) {
    if (!e) return "";
    const t = e.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : "";
  }
  function k(e) {
    if (!e) return "";
    try {
      return new Date(e).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: !1,
      });
    } catch {
      return e;
    }
  }
  function w() {
    const e =
      document.querySelector("#ap_email") ||
      document.querySelector('input[type="email"]') ||
      document.querySelector('input[name="email"]') ||
      document.querySelector("#bannerText") ||
      document.querySelector("#auth-email-claim");
    return h((e == null ? void 0 : e.value) || (e == null ? void 0 : e.textContent));
  }
  function b(e) {
    if (!Array.isArray(e) || e.length === 0) return null;
    const t = e.filter((o) => g(o.rpId, location.href));
    if (t.length === 0) return null;
    const n = w();
    if ((console.log(t, n), n)) {
      const o = t.find((s) => s.account.toLowerCase() === n);
      if (o) return o;
    }
    return null;
  }
  function u() {
    const e = Array.from(
        document.querySelectorAll(
          'button, a, input[type="button"], input[type="submit"], span[role="button"]',
        ),
      ),
      t = [
        "passkey",
        "use passkey",
        "sign in with a passkey",
        "sign in with passkey",
        "使用 Passkey",
        "使用密钥登录",
        "使用通行密钥登录",
        "使用通行密钥",
        "安全密钥",
      ];
    for (const n of e) {
      const o = (n.innerText || n.value || "").toLowerCase().trim();
      if (o && t.some((s) => o.includes(s.toLowerCase()))) return n;
    }
    return null;
  }
  function v() {
    const e = u();
    return e
      ? Promise.resolve(e)
      : new Promise((t) => {
          let n = 0;
          const o = new MutationObserver(() => {
            const s = u();
            s && (o.disconnect(), window.clearTimeout(n), t(s));
          });
          (o.observe(document, { childList: !0, subtree: !0, attributes: !0, characterData: !0 }),
            (n = window.setTimeout(() => {
              (o.disconnect(), t(null));
            }, 12e4)));
        });
  }
  function y(e) {
    return new Promise((t) => {
      try {
        chrome.runtime.sendMessage(e, {}, (n) => {
          const o = chrome.runtime.lastError;
          if (o) {
            (console.log("[ZF Passkey] 消息发送失败", o.message), t(null));
            return;
          }
          t(n);
        });
      } catch (n) {
        (console.log("[ZF Passkey] 消息发送异常", n), t(null));
      }
    });
  }
  async function P() {
    const e = await y({ action: "prepare-empty-login-authenticator", url: location.href });
    return !e || !e.ok || !Array.isArray(e.list)
      ? (console.log("[ZF Passkey] 未获取到可用 Passkey 列表", e),
        { list: [], ready: !1, autoInjectPasskey: !1 })
      : {
          ready: e.ready,
          autoInjectPasskey: e.autoInjectPasskey === !0,
          list: e.list.map((t) => ({ account: t.account, rpId: t.rpId, createdAt: t.createdAt })),
        };
  }
  function C(e) {
    var n;
    const t = u();
    if (t) {
      (t.click(), e && (e.textContent = "已触发登录"));
      return;
    }
    (m("Passkey登录密匙以注入，请手动点击使用页面上的Passkey密匙登录", "success"),
      (n = document.getElementById("zf-passkey-login-prompt")) == null || n.remove());
  }
  async function x(e) {
    e && ((e.disabled = !0), (e.textContent = "正在创建虚拟认证器..."));
    const t = await y({ action: "ensure-virtual-authenticator", url: location.href });
    if (!t || !t.ok || !t.ready) {
      (m("准备失败：虚拟认证器未就绪或无可用 Passkey", "error"),
        e && ((e.disabled = !1), (e.textContent = "使用该 Passkey 登录")));
      return;
    }
    C(e);
  }
  function T({ account: e, rpId: t, createdAt: n }) {
    const o = document.getElementById("zf-passkey-login-prompt");
    o && o.remove();
    const s = document.createElement("div");
    ((s.id = "zf-passkey-login-prompt"),
      (s.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:16px",
        "transform:translateX(-50%)",
        "z-index:2147483646",
        "width:min(400px,92vw)",
      ].join(";")));
    const a = document.createElement("div");
    a.style.cssText = [
      "background:#fff",
      "border-radius:12px",
      "box-shadow:0 12px 36px rgba(0,0,0,.18)",
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif',
      "overflow:hidden",
    ].join(";");
    const i = document.createElement("div");
    ((i.style.cssText =
      "display:flex;align-items:center;justify-content:space-between;padding:10px 16px;border-bottom:1px solid #f0f0f0;"),
      (i.innerHTML =
        '<div style="font-size:15px;font-weight:700;color:#111827;">已托管账号 Passkey</div>'));
    const r = document.createElement("button");
    ((r.type = "button"),
      (r.textContent = "x"),
      (r.style.cssText =
        "border:0;background:transparent;font-size:20px;cursor:pointer;color:#6b7280;line-height:1;padding:0 4px;min-width:20px"),
      i.appendChild(r));
    const d = document.createElement("div");
    d.style.cssText = "padding:12px 16px;";
    const l = document.createElement("div");
    l.style.cssText = [
      "display:flex",
      "gap:12px",
      "align-items:flex-start",
      "background:#f0f7ff",
      "border:1px solid #cfe8ff",
      "border-radius:10px",
      "padding:12px 12px",
    ].join(";");
    const p = document.createElement("div");
    ((p.textContent = t.trim().charAt(0)),
      (p.style.cssText = [
        "width:38px",
        "height:38px",
        "border-radius:10px",
        "background:#232f3e",
        "color:#ff9900",
        "font-weight:800",
        "font-size:18px",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "flex-shrink:0",
      ].join(";")));
    const f = document.createElement("div");
    ((f.style.cssText = "min-width:0;flex:1;"),
      (f.innerHTML = `
    <div style="font-size:14px;font-weight:700;color:#111827;">${t}</div>
    <div style="margin-top:2px;font-size:13px;color:#111827;">${e}</div>
    <div style="margin-top:2px;font-size:12px;color:#6b7280;">${k(n)}</div>
  `),
      l.appendChild(p),
      l.appendChild(f));
    const c = document.createElement("button");
    ((c.type = "button"),
      (c.textContent = "使用该 Passkey 登录"),
      (c.style.cssText = [
        "width:100%",
        "margin-top:12px",
        "border:0",
        "border-radius:10px",
        "background:#2f6fed",
        "color:#fff",
        "padding:10px 12px",
        "font-size:14px",
        "cursor:pointer",
        "font-weight:600",
      ].join(";")),
      d.appendChild(l),
      d.appendChild(c),
      a.appendChild(i),
      a.appendChild(d),
      s.appendChild(a),
      document.documentElement.appendChild(s));
    const z = () => {
      s.remove();
    };
    (r.addEventListener("click", z),
      c.addEventListener("click", () => {
        x(c);
      }));
  }
  async function E() {
    const e = await P(),
      t = e.autoInjectPasskey;
    if (!e.ready) {
      console.log("[ZF Passkey] 登录页空虚拟认证器准备失败");
      return;
    }
    if (t) {
      x();
      return;
    }
    if (!(await v())) {
      console.log("[ZF Passkey] 未匹配到 Passkey 登录入口，跳过登录弹窗");
      return;
    }
    const n = b(e.list);
    n && T(n);
  }
  (console.log("[ZF Passkey] Amazon 登录页脚本已加载", location.href), E());
})();
