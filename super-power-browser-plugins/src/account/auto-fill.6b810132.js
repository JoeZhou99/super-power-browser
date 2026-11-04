var e, t;
("function" == typeof (e = globalThis.define) && ((t = e), (e = null)),
  (function (t, o, n, r, l) {
    var i =
        "undefined" != typeof globalThis
          ? globalThis
          : "undefined" != typeof self
            ? self
            : "undefined" != typeof window
              ? window
              : "undefined" != typeof global
                ? global
                : {},
      a = "function" == typeof i[r] && i[r],
      s = a.cache || {},
      c =
        "undefined" != typeof module &&
        "function" == typeof module.require &&
        module.require.bind(module);
    function u(e, o) {
      if (!s[e]) {
        if (!t[e]) {
          var n = "function" == typeof i[r] && i[r];
          if (!o && n) return n(e, !0);
          if (a) return a(e, !0);
          if (c && "string" == typeof e) return c(e);
          var l = Error("Cannot find module '" + e + "'");
          throw ((l.code = "MODULE_NOT_FOUND"), l);
        }
        ((p.resolve = function (o) {
          var n = t[e][1][o];
          return null != n ? n : o;
        }),
          (p.cache = {}));
        var d = (s[e] = new u.Module(e));
        t[e][0].call(d.exports, p, d, d.exports, this);
      }
      return s[e].exports;
      function p(e) {
        var t = p.resolve(e);
        return !1 === t ? {} : u(t);
      }
    }
    ((u.isParcelRequire = !0),
      (u.Module = function (e) {
        ((this.id = e), (this.bundle = u), (this.exports = {}));
      }),
      (u.modules = t),
      (u.cache = s),
      (u.parent = a),
      (u.register = function (e, o) {
        t[e] = [
          function (e, t) {
            t.exports = o;
          },
          {},
        ];
      }),
      Object.defineProperty(u, "root", {
        get: function () {
          return i[r];
        },
      }),
      (i[r] = u));
    for (var d = 0; d < o.length; d++) u(o[d]);
    if (n) {
      var p = u(n);
      "object" == typeof exports && "undefined" != typeof module
        ? (module.exports = p)
        : "function" == typeof e && e.amd
          ? e(function () {
              return p;
            })
          : l && (this[l] = p);
    }
  })(
    {
      "5JOkR": [
        function (e, t, o) {
          var n = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (n.defineInteropFlag(o), n.export(o, "config", () => i));
          var r = e("~/utils/config"),
            l = e("~/utils/password-lock");
          let i = { matches: ["<all_urls>"], all_frames: !0, run_at: "document_end" },
            a = (0, r.mergeAutoFillInputConfig)(null);
          function s() {
            chrome.runtime.sendMessage({ action: "GET_AUTO_FILL_INPUT_CONFIG" }, (e) => {
              !chrome.runtime.lastError && e?.config && (a = e.config);
            });
          }
          let c = !1,
            u = !1,
            d = !1,
            p = null,
            f = null,
            m = 0,
            g = null,
            h = null;
          function w() {
            (s(),
              x(),
              (p = new MutationObserver((e) => {
                e.some((e) => {
                  if ("childList" === e.type) {
                    let t = [...Array.from(e.addedNodes), ...Array.from(e.removedNodes)];
                    return t.some(
                      (e) =>
                        e instanceof HTMLInputElement ||
                        (e instanceof Element && !!e.querySelector("input")),
                    );
                  }
                  if ("attributes" === e.type) {
                    let t = e.target;
                    return (
                      t instanceof HTMLInputElement ||
                      (t instanceof Element && !!t.querySelector("input"))
                    );
                  }
                  return !1;
                }) && x();
              })).observe(document.body, {
                childList: !0,
                subtree: !0,
                attributes: !0,
                attributeFilter: ["class", "style", "type", "hidden", "aria-hidden"],
              }));
          }
          function y(e = !1, t) {
            (e && ((c = !1), (u = !1), (d = !1), (g = null)), s(), x(e, t));
          }
          function x(e = !1, t) {
            if (u && !e) return;
            if (e) {
              (f && (window.clearTimeout(f), (f = null)), b(!0, t));
              return;
            }
            let o = Date.now();
            if ((f || (m = o), o - m >= 2e3)) {
              (f && window.clearTimeout(f), (f = null), b(!1, t));
              return;
            }
            (f && window.clearTimeout(f),
              (f = window.setTimeout(() => {
                ((f = null), b(!1, t));
              }, 500)));
          }
          function b(e = !1, t) {
            let o = L(a.passwordSelector),
              n = L(a.textLikeSelector),
              l = o.length > 0,
              i = n.length > 0;
            if (
              (!c ||
                e ||
                (function (e, t) {
                  if (!g || (0 === e.length && 0 === t.length)) return !1;
                  let o = e.map(k).join("||"),
                    n = t.map(k).join("||"),
                    r = `p:${o}__t:${n}`;
                  if (r === g) return !1;
                  let l = e.some((e) => !e.value) || t.some((e) => !e.value.trim());
                  return !!l && ((c = !1), (u = !1), (d = !1), (g = null), !0);
                })(o, n)) &&
              (l || i)
            ) {
              if ((0, r.isAutoFillExcludedForUrl)(window.location.href, a)) return;
              (function (e = !1, t) {
                (!d || e) &&
                  ((d = !0),
                  chrome.runtime.sendMessage(
                    {
                      action: "CHECK_AUTO_FILL",
                      forcePickFirstAccount: t?.forcePickFirstAccount === !0,
                      preferMainAccount: t?.preferMainAccount === !0,
                      preferredAccountId: t?.preferredAccountId,
                    },
                    (t) => {
                      if (((d = !1), !c || e)) {
                        if (t?.reason === "multiple_accounts") {
                          ((u = !0), p && p.disconnect());
                          return;
                        }
                        if (t && t.canFill && t.data) {
                          let { username: e, password: o, is_lock: n } = t.data;
                          E(e, o, n) &&
                            ((c = !0),
                            (g = (function () {
                              let e = L(a.passwordSelector),
                                t = L(a.textLikeSelector);
                              if (0 === e.length && 0 === t.length) return null;
                              let o = e.map(k).join("||"),
                                n = t.map(k).join("||");
                              return `p:${o}__t:${n}`;
                            })()));
                        }
                      }
                    },
                  ));
              })(e, t);
            }
          }
          function k(e) {
            let t = e.tagName.toLowerCase(),
              o = (e.type || "").toLowerCase(),
              n = (e.name || "").toLowerCase(),
              r = (e.id || "").toLowerCase(),
              l = (e.placeholder || "").toLowerCase(),
              i = (e.autocomplete || "").toLowerCase(),
              a = (e.getAttribute("data-testid") || "").toLowerCase(),
              s = (e.getAttribute("aria-label") || "").toLowerCase();
            return `${t}|${o}|${n}|${r}|${l}|${i}|${a}|${s}`;
          }
          function L(e) {
            let t = (function (e, t) {
              let o = [];
              return (
                e instanceof Document || (e.ownerDocument ?? document),
                (function e(n) {
                  let r = n.querySelectorAll?.(t);
                  r && o.push(...Array.from(r));
                  let l = n instanceof Document ? n.body : n;
                  l &&
                    l instanceof Element &&
                    l.querySelectorAll("*").forEach((t) => {
                      t.shadowRoot && e(t.shadowRoot);
                    });
                })(e),
                o
              );
            })(document, e);
            return t.filter(
              (e) =>
                null !== e.offsetParent &&
                !e.hidden &&
                e.offsetWidth > 0 &&
                !(0, r.isInputIgnoredForAutoFill)(e, a),
            );
          }
          function v() {
            let e;
            let t = a;
            try {
              e = new URL(window.location.href);
            } catch {
              return !1;
            }
            let o = e.hostname.toLowerCase(),
              n = `${e.pathname}${e.search}${e.hash}`.toLowerCase();
            for (let e of t.textOnlyFillHints) {
              let t = e.trim().toLowerCase();
              if (t && (o.startsWith(t) || (0, r.urlHaystackMatchesHint)(n, t))) return !0;
            }
            let l = (0, r.normalizeOriginPathKey)(e);
            for (let e of t.textOnlyFillUrlPrefixes) {
              let t = (0, r.normalizeConfiguredUrlPrefix)(e);
              if (t && l.startsWith(t)) return !0;
            }
            return !1;
          }
          function A(e) {
            if (e.disabled || e.readOnly) return !1;
            let t = (e.type || "text").toLowerCase();
            return !(
              "password" === t ||
              "checkbox" === t ||
              "radio" === t ||
              "button" === t ||
              "submit" === t ||
              "hidden" === t ||
              "file" === t ||
              "image" === t ||
              "reset" === t ||
              e.closest(".el-select, .el-select__wrapper")
            );
          }
          function I(e, t) {
            let o = t.filter(
              (t) =>
                t !== e && (t.compareDocumentPosition(e) & Node.DOCUMENT_POSITION_FOLLOWING) != 0,
            );
            if (0 === o.length) return null;
            let n =
              e.closest("form, .login-form, .login-by-psw, .login-content, [class*='login']") ||
              e.parentElement;
            if (n) {
              let e = o.filter((e) => n.contains(e));
              if (e.length > 0) return e[e.length - 1];
            }
            return o[o.length - 1];
          }
          function E(e, t, o) {
            let n = L(a.passwordSelector),
              r = L(a.textLikeSelector),
              i = n.find((e) => e.classList.length > 0) ?? n[0] ?? null;
            if (i) {
              let n = (function (e, t) {
                let o = I(e, t.filter(A));
                if (o) return o;
                let n = new Set(a.allowedInputTypes.map((e) => e.toLowerCase())),
                  r = L("input").filter((e) => {
                    if (!A(e)) return !1;
                    let t = (e.type || "text").toLowerCase();
                    return n.has(t);
                  });
                return I(e, r);
              })(i, r);
              return (n && T(n, e), T(i, t), (0, l.applyPasswordLock)(i, o, a), !0);
            }
            let s = r.filter(A);
            if (0 === s.length || !v()) return !1;
            if (1 === s.length) return (T(s[0], e), !0);
            T(s[0], e);
            let c = s[1];
            return (
              (function (e) {
                if ("password" === (e.type || "").toLowerCase()) return !0;
                let t = a.textOnlySecondPasswordSelector?.trim();
                return (
                  !!t &&
                  (function (e, t) {
                    try {
                      return e.matches(t);
                    } catch {
                      return !1;
                    }
                  })(e, t)
                );
              })(c) && T(c, t),
              !0
            );
          }
          (chrome.runtime.onMessage.addListener((e, t, o) => {
            if ("FILL_FORM" === e.action) {
              let { username: t, password: n, is_lock: r } = e.data;
              (E(t, n, r), o({ status: "done" }));
              return;
            }
            if ("RETRIGGER_AUTO_FILL" === e.action) {
              let t = e?.preferredAccountId ?? e?.accountId;
              (y(!0, {
                forcePickFirstAccount: e?.forcePickFirstAccount === !0,
                preferMainAccount: e?.preferMainAccount !== !1,
                preferredAccountId: t,
              }),
                o({ status: "triggered" }));
            }
          }),
            window.addEventListener("message", (e) => {
              if (e.source && e.source !== window) return;
              let t = null,
                o = e.data;
              if (o && "object" == typeof o) t = o;
              else if ("string" == typeof o)
                try {
                  let e = JSON.parse(o);
                  e && "object" == typeof e && (t = e);
                } catch {
                  t = null;
                }
              if (!t) return;
              let n = t.type ?? t.action;
              if ("RX_ACCOUNT_RETRIGGER_AUTO_FILL" !== n) return;
              let r = t.preferredAccountId ?? t.accountId;
              (y(!0, {
                forcePickFirstAccount: !0 === t.forcePickFirstAccount,
                preferMainAccount: !1 !== t.preferMainAccount,
                preferredAccountId: r,
              }),
                window.postMessage({ type: "RX_ACCOUNT_RETRIGGER_AUTO_FILL_RESULT", ok: !0 }, "*"));
            }),
            "loading" === document.readyState
              ? document.addEventListener("DOMContentLoaded", w)
              : w());
          let S = !1;
          function T(e, t) {
            if (e.value !== t) {
              S = !0;
              try {
                try {
                  e.focus({ preventScroll: !0 });
                } catch {
                  e.focus();
                }
                let o = e.value;
                e.value = t;
                let n = e._valueTracker;
                (n && n.setValue(o),
                  e.dispatchEvent(new Event("input", { bubbles: !0 })),
                  e.dispatchEvent(new Event("change", { bubbles: !0 })),
                  e.blur());
              } finally {
                S = !1;
              }
            }
          }
          function F() {
            if (h) {
              let { inputElement: e, keydownHandler: t, host: o } = h;
              (e.removeEventListener("keydown", t), o.remove(), (h = null));
            }
          }
          (document.addEventListener("focusin", (e) => {
            if (S) return;
            let t = e.target;
            !(
              !(t instanceof HTMLInputElement) ||
              !(function (e) {
                if (e.disabled || e.readOnly || e.closest(".el-select, .el-select__wrapper"))
                  return !1;
                let t = (e.type || "text").toLowerCase();
                return a.allowedInputTypes.includes(t);
              })(t) ||
              (0, r.isAutoFillExcludedForUrl)(window.location.href, a)
            ) &&
              ((0, r.isInputIgnoredForAutoFill)(t, a) ||
                chrome.runtime.sendMessage({ action: "GET_ACCOUNTS" }, (e) => {
                  e &&
                    e.accounts &&
                    e.accounts.length > 0 &&
                    v() &&
                    (function (e, t, o) {
                      F();
                      let n = document.createElement("div");
                      Object.assign(n.style, {
                        position: "absolute",
                        zIndex: "2147483647",
                        left: "0",
                        top: "0",
                        width: "100%",
                        height: "0",
                      });
                      let r = n.attachShadow({ mode: "open" }),
                        l = e.getBoundingClientRect(),
                        i = l.bottom + window.scrollY + 6,
                        a = l.left + window.scrollX,
                        s = Math.max(l.width, 240),
                        c = chrome.runtime.getURL("/_favicon/"),
                        u = new URL(c),
                        d = o || window.location.href;
                      (u.searchParams.set("pageUrl", d), u.searchParams.set("size", "32"));
                      let p = u.toString(),
                        f = document.createElement("style");
                      f.textContent = `
    .dropdown {
      position: absolute;
      top: ${i}px;
      left: ${a}px;
      width: ${s}px;
      background: #ffffff;
      border: 1px solid #dcdcdc;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      font-size: 14px;
      overflow: hidden;
      z-index: 9999;
      animation: fadeIn 0.15s ease-out;
    }
    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(-5px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .header {
      padding: 8px 12px;
      background: #f8f9fa;
      color: #5f6368;
      font-size: 11px;
      font-weight: 500;
      border-bottom: 1px solid #ebebeb;
      letter-spacing: 0.5px;
    }
    .item {
      display: flex;
      align-items: center;
      padding: 10px 14px;
      cursor: pointer;
      border-bottom: 1px solid #f1f1f1;
      transition: background 0.1s;
    }
    .item:last-child { border-bottom: none; }
    .item:hover, .item.selected {
      background-color: #e8f0fe;
    }
    .icon-box {
      width: 24px;
      height: 24px;
      margin-right: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon-box img {
      width: 100%;
      height: 100%;
      border-radius: 4px;
    }
    .text-box {
      display: flex;
      flex-direction: column;
      flex: 1;
      overflow: hidden;
    }
    .username {
      color: #202124;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .password-hint {
      color: #5f6368;
      font-size: 12px;
      margin-top: 2px;
    }
  `;
                      let m = document.createElement("div");
                      m.className = "dropdown";
                      let g = document.createElement("div");
                      ((g.className = "header"),
                        (g.textContent = "\u53ef\u7528\u7684\u8d26\u53f7"),
                        m.appendChild(g));
                      let w = document.createElement("div");
                      (t.forEach((e, t) => {
                        var o;
                        let n = document.createElement("div");
                        ((n.className = "item"),
                          (n.dataset.index = String(t)),
                          (n.innerHTML = `
      <div class="icon-box">
        <img src="${p}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCI+PHBhdGggZmlsbD0iI2NjYyIgZD0iTTEyIDJDNi40OCAyIDIgNi40OCAyIDEyczQuNDggMTAgMTAgMTAgMTAtNC40OCAxMC0xMFMxNy41MiAyIDEyIDJ6bTAgMTQuMmMtMi41IDAtNC43MS0xLjI4LTYtMy4yMi4wMy0xLjk5IDQtMy4wOCA2LTMuMDggMS45OSAwIDUuOTcgMS4wOSA2IDMuMDgtMS4yOSAxLjk0LTMuNSAzLjIyLTYgMy4yMnoiLz48L3N2Zz4='"/>
      </div>
      <div class="text-box">
        <div class="username">${(o = e.username) ? o.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;") : o}</div>
        <div class="password-hint">\u2022\u2022\u2022\u2022\u2022\u2022</div>
      </div>
    `),
                          n.addEventListener("click", (t) => {
                            var o, n;
                            (t.stopPropagation(), E(e.username, e.password, e.is_lock), F());
                          }),
                          n.addEventListener("mouseenter", () => {
                            x(t);
                          }),
                          w.appendChild(n));
                      }),
                        m.appendChild(w),
                        r.appendChild(f),
                        r.appendChild(m),
                        document.body.appendChild(n));
                      let y = (e) => {
                        if (!h) return;
                        let o = w.querySelectorAll(".item"),
                          n = o.length - 1;
                        switch (e.key) {
                          case "ArrowDown": {
                            e.preventDefault();
                            let t = h.selectedIndex + 1;
                            (t > n && (t = 0), x(t));
                            break;
                          }
                          case "ArrowUp": {
                            e.preventDefault();
                            let t = h.selectedIndex - 1;
                            (t < 0 && (t = n), x(t));
                            break;
                          }
                          case "Enter":
                            if (h.selectedIndex >= 0) {
                              var r, l;
                              e.preventDefault();
                              let o = t[h.selectedIndex];
                              ((r = o.username), E(r, o.password, o.is_lock), F());
                            }
                            break;
                          case "Escape":
                            (e.preventDefault(), F());
                            break;
                          case "Tab":
                            F();
                        }
                      };
                      function x(e) {
                        if (!h) return;
                        h.selectedIndex = e;
                        let t = w.querySelectorAll(".item");
                        if (
                          (t.forEach((t, o) => {
                            o === e ? t.classList.add("selected") : t.classList.remove("selected");
                          }),
                          e >= 0)
                        ) {
                          let o = t[e];
                          o.scrollIntoView({ block: "nearest" });
                        }
                      }
                      (e.addEventListener("keydown", y),
                        (h = { host: n, inputElement: e, selectedIndex: 0, keydownHandler: y }),
                        x(0));
                    })(t, e.accounts, e.hostUrl);
                }));
          }),
            document.addEventListener(
              "click",
              (e) => {
                if (!h) return;
                let t = e.composedPath?.() ?? [],
                  o = t.includes(h.host);
                o || e.target === h.inputElement || F();
              },
              !0,
            ));
        },
        {
          "~/utils/config": "gwMqm",
          "~/utils/password-lock": "aTuDt",
          "@parcel/transformer-js/src/esmodule-helpers.js": "hi5hY",
        },
      ],
      gwMqm: [
        function (e, t, o) {
          var n = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (n.defineInteropFlag(o),
            n.export(o, "normalizeOriginPathKey", () => l),
            n.export(o, "normalizeConfiguredUrlPrefix", () => i),
            n.export(o, "urlHaystackMatchesHint", () => a),
            n.export(o, "isAutoFillExcludedForUrl", () => s),
            n.export(o, "isInputIgnoredForAutoFill", () => c),
            n.export(o, "mergeAutoFillInputConfig", () => u));
          var r = e("~/config");
          function l(e) {
            let t = `${e.origin}${e.pathname}`.toLowerCase();
            return t.replace(/\/+$/, "") || e.origin.toLowerCase();
          }
          function i(e) {
            return e.trim().toLowerCase().replace(/\/+$/, "");
          }
          function a(e, t) {
            let o = t.trim().toLowerCase();
            if (!o) return !1;
            let n = e.toLowerCase();
            if (o.includes("/") || o.endsWith(".")) return n.includes(o);
            let r = o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return RegExp(`(^|[^a-z0-9])${r}([^a-z0-9]|$)`, "i").test(n);
          }
          function s(e, t) {
            let o;
            try {
              o = new URL(e);
            } catch {
              return !1;
            }
            let n = o.hostname.toLowerCase(),
              r = `${o.pathname}${o.search}${o.hash}`.toLowerCase();
            for (let e of t.autoFillExcludeHints) {
              let t = e.trim().toLowerCase();
              if (t && (n.startsWith(t) || a(r, t))) return !0;
            }
            let s = l(o);
            for (let e of t.autoFillExcludeUrlPrefixes) {
              let t = i(e);
              if (t && s.startsWith(t)) return !0;
            }
            return !1;
          }
          function c(e, t) {
            for (let o of t.autoFillIgnoreInputSelectors) {
              let t = "string" == typeof o ? o.trim() : "";
              if (t)
                try {
                  if (e.matches(t)) return !0;
                } catch {}
            }
            return !1;
          }
          function u(e) {
            let t = e ?? {},
              o = r.AUTO_FILL_INPUT_DEFAULTS;
            return {
              passwordSelector:
                "string" == typeof t.passwordSelector && t.passwordSelector.trim()
                  ? t.passwordSelector.trim()
                  : o.passwordSelector,
              textLikeSelector:
                "string" == typeof t.textLikeSelector && t.textLikeSelector.trim()
                  ? t.textLikeSelector.trim()
                  : o.textLikeSelector,
              textOnlySecondPasswordSelector:
                "string" == typeof t.textOnlySecondPasswordSelector &&
                t.textOnlySecondPasswordSelector.trim()
                  ? t.textOnlySecondPasswordSelector.trim()
                  : o.textOnlySecondPasswordSelector,
              allowedInputTypes:
                Array.isArray(t.allowedInputTypes) && t.allowedInputTypes.length > 0
                  ? [...t.allowedInputTypes]
                  : [...o.allowedInputTypes],
              textOnlyFillHints: Array.isArray(t.textOnlyFillHints)
                ? [...t.textOnlyFillHints]
                : [...o.textOnlyFillHints],
              textOnlyFillUrlPrefixes: Array.isArray(t.textOnlyFillUrlPrefixes)
                ? [...t.textOnlyFillUrlPrefixes]
                : [...o.textOnlyFillUrlPrefixes],
              autoFillExcludeHints: Array.isArray(t.autoFillExcludeHints)
                ? [...t.autoFillExcludeHints]
                : [...o.autoFillExcludeHints],
              autoFillExcludeUrlPrefixes: Array.isArray(t.autoFillExcludeUrlPrefixes)
                ? [...t.autoFillExcludeUrlPrefixes]
                : [...o.autoFillExcludeUrlPrefixes],
              autoFillIgnoreInputSelectors: Array.isArray(t.autoFillIgnoreInputSelectors)
                ? [...t.autoFillIgnoreInputSelectors]
                : [...o.autoFillIgnoreInputSelectors],
              passwordLockTargetSelectors: Array.isArray(t.passwordLockTargetSelectors)
                ? [...t.passwordLockTargetSelectors]
                : [...o.passwordLockTargetSelectors],
              mainDomainToPopups: (function (e, t) {
                let o = {};
                for (let e of Object.keys(t)) o[e] = [...t[e]];
                if (!e || "object" != typeof e || Array.isArray(e)) return o;
                for (let [t, n] of Object.entries(e)) {
                  if ("string" != typeof t || !t.trim() || !Array.isArray(n)) continue;
                  let e = n
                    .filter((e) => "string" == typeof e)
                    .map((e) => e.trim())
                    .filter(Boolean);
                  o[t] = e;
                }
                return o;
              })(t.mainDomainToPopups, o.mainDomainToPopups),
            };
          }
        },
        { "~/config": "b0Rih", "@parcel/transformer-js/src/esmodule-helpers.js": "hi5hY" },
      ],
      b0Rih: [
        function (e, t, o) {
          var n = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (n.defineInteropFlag(o),
            n.export(o, "AUTO_FILL_INPUT_DEFAULTS", () => r),
            n.export(o, "PAGE_ENHANCE_DEFAULTS", () => l));
          let r = {
              passwordSelector: 'input[type="password"]',
              textLikeSelector:
                'input[type="text"], input[type="email"], input[type="number"], input[type="search"], input[type="tel"], input.soui-input-input, input[name="account"], input[name="loginId"], input[name="login-account-input"]',
              textOnlySecondPasswordSelector: 'input[type="password"]',
              allowedInputTypes: ["email", "password", "tel", "search", "text"],
              textOnlyFillHints: [
                "authorize",
                "signin",
                "sign-in",
                "signup",
                "sign-up",
                "/login",
                "log-in",
                "/auth",
                "oauth",
                "passport",
                "authenticate",
                "wp-login",
                "cas/login",
                "login.",
                "/seller-login",
                "signin.",
                "auth.",
                "accounts.",
                "id.",
                "passport.",
                "lookup",
                "SignIn",
              ],
              textOnlyFillUrlPrefixes: [],
              autoFillExcludeHints: [
                "/register",
                "/registration",
                "/signup",
                "/sign-up",
                "/sign_up",
                "/create-account",
                "/create_account",
                "/account/register",
                "/accounts/register",
                "/accounts/new",
                "/user/register",
                "/join/",
                "/enroll",
                "/enrollment",
                "register.",
                "signup.",
              ],
              autoFillExcludeUrlPrefixes: [
                "https://login.mirakl.net/u/mfa-email-challenge",
                "https://agentseller.temu.com/lgst/auth-warehouse/abnormal-order",
                "https://wing.coupang.com/tenants/vendor-signup/business-registration",
              ],
              autoFillIgnoreInputSelectors: ['input[id="proof-confirmation-email-input"]'],
              passwordLockTargetSelectors: ['div[data-safepwdbox="safepwdbox"]'],
              mainDomainToPopups: {
                "agentseller.temu.com": ["seller.kuajingmaihuo.com"],
                "signin.ebay.com.hk": ["www.ebay.cn"],
                "login.microsoftonline.com": ["login.live.com", "outlook.office.com"],
                "seller.shopee.co.th": ["accounts.shopee.co.th"],
                "seller.shopee.ph": ["accounts.shopee.ph"],
                "seller.shopee.com.my": ["accounts.shopee.com.my"],
                "seller.shopee.co.id": ["accounts.shopee.co.id"],
                "seller.shopee.tw": ["accounts.shopee.tw"],
                "seller.shopee.vn": ["accounts.shopee.vn", "banhang.shopee.vn"],
                "wing.coupang.com": ["xauth.coupang.com"],
                "loginmyseller.taobao.com": ["myseller.taobao.com"],
                "seller.walmart.com": ["login.account.wal-mart.com"],
                "www.ebay.com": [
                  "signin.ebay.com",
                  "signin.ebay.com.hk",
                  "signin.ebay.co.uk",
                  "signin.ebay.de",
                ],
                "www.tmall.com": ["login.taobao.com"],
                "outlook.live.com": ["login.microsoftonline.com", "login.live.com"],
                "toolbox.manomano.com": ["iam.manomano.com"],
                "marketplace.worten.pt": ["login.mirakl.net"],
                "sso.geiwohuo.com": ["sellerhub.shein.com"],
                "agentseller-eu.temu.com": ["seller.kuajingmaihuo.com"],
                "www.coupang.com": ["login.coupang.com", "xauth.coupang.com"],
                "sonaelink-portal.azurewebsites.net": ["sonaelink.b2clogin.com"],
                "csp.aliexpress.com": ["login.aliexpress.com", "www.aliexpress.com"],
                "shopee.com.br": ["seller.shopee.com.br"],
                "mc.coupang.com": ["login.coupang.com"],
                "adeo-marketplace.mirakl.net": ["login.mirakl.net"],
                "www.ebay.com.hk": ["signin.ebay.com.hk"],
                "www.payoneer.com": ["login.payoneer.com"],
                "seller-vn.tiktok.com": ["ads.tiktok.com"],
                "seller-my.tiktok.com": ["ads.tiktok.com"],
                "seller-ph.tiktok.com": ["ads.tiktok.com"],
                "seller-th.tiktok.com": ["ads.tiktok.com"],
                "seller-sg.tiktok.com": ["ads.tiktok.com"],
                "seller-us-accounts.tiktok.com": ["seller-us.tiktok.com"],
                "www.huaweicloud.com": ["auth.huaweicloud.com"],
                "global-selling.mercadolibre.com": ["www.mercadolibre.com"],
                "developer.huawei.com": ["id1.cloud.huawei.com"],
                "console.huaweicloud.com": ["auth.huaweicloud.com"],
                "www.alibaba.com": ["login.alibaba.com"],
              },
            },
            l = {
              rules: [
                {
                  id: "paypal-reveal-password",
                  remark:
                    "PayPal \u5f00\u6237\u9875\u663e\u793a\u5bc6\u7801\u660e\u6587\uff0c\u907f\u514d\u6ce8\u518c\u65f6\u590d\u5236\u9519\u5bc6\u7801",
                  enabled: !0,
                  match: {
                    urlPrefixes: ["https://www.paypal.cn/withdraw/onboard/frontbook/create"],
                  },
                  actions: [{ type: "revealPassword" }],
                },
              ],
            };
          o.default = {
            aes_key: "c4n0lFdTM39TTYjH",
            aes_iv: "sn7TwyGuU7kJWEAp",
            event_type: {
              login: "LOGIN",
              set_language: "SetLanguage",
              login_out: "LoginOut",
              open_mall: "openMall",
            },
            autoFillConfigInfoKeys: ["autoFillConfigs"],
            pageEnhanceConfigInfoKeys: ["pageEnhanceConfigs"],
          };
        },
        { "@parcel/transformer-js/src/esmodule-helpers.js": "hi5hY" },
      ],
      hi5hY: [
        function (e, t, o) {
          ((o.interopDefault = function (e) {
            return e && e.__esModule ? e : { default: e };
          }),
            (o.defineInteropFlag = function (e) {
              Object.defineProperty(e, "__esModule", { value: !0 });
            }),
            (o.exportAll = function (e, t) {
              return (
                Object.keys(e).forEach(function (o) {
                  "default" === o ||
                    "__esModule" === o ||
                    t.hasOwnProperty(o) ||
                    Object.defineProperty(t, o, {
                      enumerable: !0,
                      get: function () {
                        return e[o];
                      },
                    });
                }),
                t
              );
            }),
            (o.export = function (e, t, o) {
              Object.defineProperty(e, t, { enumerable: !0, get: o });
            }));
        },
        {},
      ],
      aTuDt: [
        function (e, t, o) {
          var n = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (n.defineInteropFlag(o), n.export(o, "applyPasswordLock", () => i));
          let r = "zf-password-lock-mask";
          function l(e, t) {
            let o = [];
            return (
              (function e(n) {
                let r = n.querySelectorAll?.(t);
                r && o.push(...Array.from(r));
                let l = n instanceof Document ? n.body : n;
                l &&
                  l instanceof Element &&
                  l.querySelectorAll("*").forEach((t) => {
                    t.shadowRoot && e(t.shadowRoot);
                  });
              })(e),
              o
            );
          }
          function i(e, t, o) {
            if (
              ((function () {
                for (let e of l(document, `.${r}`)) e.remove();
              })(),
              !t)
            )
              return;
            let n = (function (e) {
                let t = [],
                  o = new Set();
                for (let n of Array.isArray(e.passwordLockTargetSelectors)
                  ? e.passwordLockTargetSelectors
                      .filter((e) => "string" == typeof e)
                      .map((e) => e.trim())
                      .filter(Boolean)
                  : []) {
                  let e = [];
                  try {
                    e = l(document, n);
                  } catch {
                    continue;
                  }
                  for (let n of e) !(n instanceof HTMLElement) || o.has(n) || (o.add(n), t.push(n));
                }
                return t;
              })(o),
              i = n.length > 0 ? n : [e];
            for (let e of i)
              !(function (e) {
                let t = e.parentElement;
                if (!t) return;
                let o = window.getComputedStyle(t).position;
                "static" === o && (t.style.position = "relative");
                let n = t.getBoundingClientRect(),
                  l = e.getBoundingClientRect(),
                  i = document.createElement("div");
                ((i.className = r),
                  i.setAttribute("aria-hidden", "true"),
                  Object.assign(i.style, {
                    position: "absolute",
                    top: `${l.top - n.top + t.scrollTop}px`,
                    left: `${l.left - n.left + t.scrollLeft}px`,
                    width: `${Math.max(1, l.width)}px`,
                    height: `${Math.max(1, l.height)}px`,
                    backgroundColor: "rgba(188, 188, 188, 0.1)",
                    zIndex: "2147483647",
                    pointerEvents: "auto",
                    margin: "0",
                    padding: "0",
                    border: "none",
                    boxSizing: "border-box",
                  }));
                let a = (e) => {
                  (e.preventDefault(), e.stopPropagation());
                };
                (i.addEventListener("pointerdown", a, !0),
                  i.addEventListener("mousedown", a, !0),
                  i.addEventListener("click", a, !0),
                  t.appendChild(i));
              })(e);
          }
        },
        { "@parcel/transformer-js/src/esmodule-helpers.js": "hi5hY" },
      ],
    },
    ["5JOkR"],
    "5JOkR",
    "parcelRequire8d9e",
  ),
  (globalThis.define = t));
//# sourceMappingURL=auto-fill.6b810132.js.map
