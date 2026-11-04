(function () {
  "use strict";
  function f(e) {
    if (!e || !e.includes("@")) return e || "";
    const [t, n] = e.split("@");
    return t.length <= 2
      ? `${t[0]}***@${n}`
      : `${t.slice(0, 2)}${"*".repeat(Math.min(6, t.length - 2))}${t.slice(-1)}@${n}`;
  }
  function c(e, t = "success", n = !0) {
    const a = document.getElementById("zf-passkey-toast-host");
    a && a.remove();
    const s = document.createElement("div");
    ((s.id = "zf-passkey-toast-host"),
      (s.style.cssText = [
        "position:fixed",
        "left:50%",
        "bottom:18px",
        "transform:translateX(-50%)",
        "z-index:2147483647",
        "pointer-events:none",
      ].join(";")));
    const o = document.createElement("div");
    if (
      ((o.textContent = e),
      (o.style.cssText = [
        "display:flex",
        "align-items:center",
        "gap:10px",
        "padding:10px 14px",
        "border-radius:999px",
        "color:#fff",
        "font-size:13px",
        `background:${t === "success" ? "#16a34a" : "#dc2626"}`,
        "box-shadow:0 10px 24px rgba(0,0,0,0.18)",
        "pointer-events:auto",
      ].join(";")),
      !n)
    ) {
      const i = document.createElement("button");
      ((i.type = "button"),
        i.setAttribute("aria-label", "关闭"),
        (i.textContent = "×"),
        (i.style.cssText = [
          "border:0",
          "background:transparent",
          "color:#fff",
          "font-size:16px",
          "line-height:1",
          "cursor:pointer",
          "padding:0",
        ].join(";")),
        i.addEventListener("click", () => s.remove()),
        o.appendChild(i));
    }
    (s.appendChild(o),
      document.documentElement.appendChild(s),
      n && window.setTimeout(() => s.remove(), 3e3));
  }
  function u({ email: e, rpId: t }) {
    var l;
    const n = document.getElementById("zf-passkey-bind-host");
    n && n.remove();
    const a = document.createElement("div");
    a.id = "zf-passkey-bind-host";
    const s = document.createElement("div");
    s.style.cssText = [
      "position:fixed",
      "inset:0",
      "background:rgba(0,0,0,.35)",
      "z-index:2147483646",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "padding:16px",
    ].join(";");
    const o = document.createElement("div");
    ((o.style.cssText = [
      "width:min(92vw,440px)",
      "background:#fff",
      "border-radius:12px",
      "box-shadow:0 12px 40px rgba(0,0,0,.18)",
      'font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","PingFang SC",sans-serif',
      "color:#111827",
      "padding:18px",
    ].join(";")),
      (o.innerHTML = `
    <div style="display:flex;align-items:center;justify-content:space-between;gap:12px;">
      <div style="font-size:17px;font-weight:700;">Passkey 托管提示</div>
      <button id="zf-passkey-bind-close" type="button" aria-label="关闭" style="border:0;background:transparent;font-size:20px;line-height:1;cursor:pointer;color:#6b7280;padding:0 4px;">&times;</button>
    </div>
    <div style="margin-top:10px;font-size:14px;line-height:1.6;color:#374151;">
      检测到当前账号已完成 Passkey 注册，可将该 Passkey 绑定到店铺，便于有权限的成员登录当前网站。
    </div>
    <div style="margin-top:12px;padding:12px 14px;background:#f0f7ff;border:1px solid #cfe8ff;border-radius:8px;">
      <div style="font-size:14px;font-weight:600;">${f(e)}</div>
      <div style="font-size:12px;color:#6b7280;margin-top:4px;">${t || location.hostname}</div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:16px;">
      <button id="zf-passkey-bind-confirm" type="button" style="padding:8px 16px;border-radius:8px;border:0;background:#1677ff;color:#fff;font-size:14px;cursor:pointer;font-weight:500;">绑定到店铺</button>
    </div>
  `),
      s.appendChild(o),
      a.appendChild(s),
      document.documentElement.appendChild(a));
    const i = () => a.remove();
    (l = o.querySelector("#zf-passkey-bind-close")) == null || l.addEventListener("click", i);
    const r = o.querySelector("#zf-passkey-bind-confirm");
    r == null ||
      r.addEventListener("click", () => {
        ((r.disabled = !0),
          (r.textContent = "绑定中…"),
          chrome.runtime.sendMessage({ action: "bind-passkey", email: e }, {}, (d) => {
            const p = chrome.runtime.lastError;
            if (p) {
              (c("绑定失败: " + p.message, "error"),
                (r.disabled = !1),
                (r.textContent = "绑定到店铺"));
              return;
            }
            d && d.ok
              ? (c("已提交绑定到店铺", "success"), i())
              : (c("绑定失败: " + ((d == null ? void 0 : d.error) || "未知错误"), "error"),
                (r.disabled = !1),
                (r.textContent = "绑定到店铺"));
          }));
      });
  }
  (window.addEventListener("message", (e) => {
    var t;
    e.source === window &&
      ((t = e.data) == null ? void 0 : t.type) === "PASSKEY_CREATE_OPTIONS" &&
      chrome.runtime.sendMessage({
        action: "credential-create-detected",
        email: e.data.email || "",
        rpId: e.data.rpId || "",
      });
  }),
    chrome.runtime.onMessage.addListener(
      (e, t, n) => (
        (e == null ? void 0 : e.action) === "passkey-captured-show-bind"
          ? (u({ email: e.email || "", rpId: e.rpId || "" }), n())
          : (e == null ? void 0 : e.action) === "passkey-upload-success" &&
            (c("Passkey上报托管成功，可前往店铺编辑查看上报的 Passkey.", "success", !1), n()),
        !0
      ),
    ),
    chrome.runtime.sendMessage({ action: "register-page-ready", url: location.href }, {}, (e) => {
      const t = chrome.runtime.lastError;
      if (t) {
        console.warn("[ZF Passkey] register-page-ready 发送失败", t.message);
        return;
      }
      e != null && e.ready
        ? console.log("[ZF Passkey] 注册虚拟认证器已就绪，请在页面完成 Passkey 注册")
        : console.log("[ZF Passkey] 注册流程未就绪", e);
    }));
})();
