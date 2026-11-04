(function () {
  "use strict";
  function c(e) {
    if (!e || typeof e != "string") return "";
    const r = e.trim().toLowerCase();
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r) ? r : "";
  }
  function i() {
    const e = [
      'input[type="email"]',
      'input[name="email"]',
      "input#ap_email",
      'input[name="username"]',
      'input[id*="email"]',
    ];
    for (const r of e) {
      const t = document.querySelector(r),
        n = c(t == null ? void 0 : t.value);
      if (n) return n;
    }
    return "";
  }
  function s(e) {
    var o;
    const r = e == null ? void 0 : e.publicKey;
    if (!r) return;
    const t = r.user,
      a = {
        type: "PASSKEY_CREATE_OPTIONS",
        email: c(t == null ? void 0 : t.name) || c(t == null ? void 0 : t.displayName) || i(),
        rpId: ((o = r.rp) == null ? void 0 : o.id) || location.hostname,
        url: location.href,
        capturedAt: new Date().toISOString(),
      };
    (console.log("[ZF Passkey] 捕获 Passkey 创建参数", a), window.postMessage(a, "*"));
  }
  try {
    const e = navigator.credentials;
    if (e && typeof e.create == "function") {
      const r = e.create.bind(e),
        t = function (n) {
          try {
            s(n);
          } catch (a) {
            console.log("[ZF Passkey] 捕获创建参数异常", a);
          }
          return r(n);
        };
      try {
        Object.defineProperty(e, "create", { value: t, writable: !0, configurable: !0 });
      } catch {
        e.create = t;
      }
    }
  } catch (e) {
    console.log("[ZF Passkey] 包装 navigator.credentials.create 失败", e);
  }
  console.log("[ZF Passkey] create 参数捕获已注入（放行虚拟认证器）");
})();
