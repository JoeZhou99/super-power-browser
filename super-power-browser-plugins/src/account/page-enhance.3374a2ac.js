var e, t;
("function" == typeof (e = globalThis.define) && ((t = e), (e = null)),
  (function (t, o, r, n, l) {
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
      s = "function" == typeof i[n] && i[n],
      a = s.cache || {},
      c =
        "undefined" != typeof module &&
        "function" == typeof module.require &&
        module.require.bind(module);
    function u(e, o) {
      if (!a[e]) {
        if (!t[e]) {
          var r = "function" == typeof i[n] && i[n];
          if (!o && r) return r(e, !0);
          if (s) return s(e, !0);
          if (c && "string" == typeof e) return c(e);
          var l = Error("Cannot find module '" + e + "'");
          throw ((l.code = "MODULE_NOT_FOUND"), l);
        }
        ((f.resolve = function (o) {
          var r = t[e][1][o];
          return null != r ? r : o;
        }),
          (f.cache = {}));
        var p = (a[e] = new u.Module(e));
        t[e][0].call(p.exports, f, p, p.exports, this);
      }
      return a[e].exports;
      function f(e) {
        var t = f.resolve(e);
        return !1 === t ? {} : u(t);
      }
    }
    ((u.isParcelRequire = !0),
      (u.Module = function (e) {
        ((this.id = e), (this.bundle = u), (this.exports = {}));
      }),
      (u.modules = t),
      (u.cache = a),
      (u.parent = s),
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
          return i[n];
        },
      }),
      (i[n] = u));
    for (var p = 0; p < o.length; p++) u(o[p]);
    if (r) {
      var f = u(r);
      "object" == typeof exports && "undefined" != typeof module
        ? (module.exports = f)
        : "function" == typeof e && e.amd
          ? e(function () {
              return f;
            })
          : l && (this[l] = f);
    }
  })(
    {
      "6yrt3": [
        function (e, t, o) {
          var r = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (r.defineInteropFlag(o), r.export(o, "config", () => l));
          var n = e("~/utils/page-enhance");
          let l = { matches: ["<all_urls>"], all_frames: !0, run_at: "document_end" },
            i = "data-zf-revealed",
            s = ["class"],
            a = [],
            c = null,
            u = null;
          function p() {
            if (0 === a.length) return;
            let e = window.location.href;
            for (let t of a)
              if ((0, n.matchesUrlMatch)(e, t.match))
                for (let e of t.actions)
                  "revealPassword" === e.type &&
                    (function (e) {
                      let t =
                        e.fallbackSelectors && e.fallbackSelectors.length > 0
                          ? e.fallbackSelectors
                          : [e.selector || 'input[type="password"]'];
                      for (let e of t) {
                        let t = (function (e, t) {
                          let o = [];
                          return (
                            (function e(r) {
                              let n = r.querySelectorAll?.(t);
                              n && o.push(...Array.from(n));
                              let l = r instanceof Document ? r.body : r;
                              l &&
                                l instanceof Element &&
                                l.querySelectorAll("*").forEach((t) => {
                                  t.shadowRoot && e(t.shadowRoot);
                                });
                            })(e),
                            o
                          );
                        })(document, e);
                        for (let e of t)
                          e instanceof HTMLInputElement &&
                            (function (e) {
                              if (
                                "1" !== e.getAttribute(i) &&
                                "password" === (e.type || "").toLowerCase()
                              ) {
                                e.setAttribute("data-zf-original-type", e.type);
                                try {
                                  e.type = "text";
                                } catch {
                                  return;
                                }
                                e.setAttribute(i, "1");
                              }
                            })(e);
                      }
                    })(e);
          }
          function f() {
            chrome.runtime.sendMessage({ action: "GET_PAGE_ENHANCE_RULES" }, (e) => {
              !chrome.runtime.lastError &&
                Array.isArray(e?.rules) &&
                0 !== (a = e.rules).length &&
                (function () {
                  let e = window.location.href;
                  return a.some((t) => (0, n.matchesUrlMatch)(e, t.match));
                })() &&
                (p(),
                !c &&
                  document.body &&
                  (c = new MutationObserver((e) => {
                    let t = e.some((e) =>
                      "childList" === e.type
                        ? e.addedNodes.length > 0 || e.removedNodes.length > 0
                        : "attributes" === e.type,
                    );
                    t &&
                      (u && window.clearTimeout(u),
                      (u = window.setTimeout(() => {
                        p();
                      }, 200)));
                  })).observe(document.body, {
                    childList: !0,
                    subtree: !0,
                    attributes: !0,
                    attributeFilter: s,
                  }));
            });
          }
          "loading" === document.readyState
            ? document.addEventListener("DOMContentLoaded", f)
            : f();
        },
        {
          "~/utils/page-enhance": "d6qsl",
          "@parcel/transformer-js/src/esmodule-helpers.js": "hi5hY",
        },
      ],
      d6qsl: [
        function (e, t, o) {
          var r = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (r.defineInteropFlag(o),
            r.export(o, "mergePageEnhanceConfig", () => u),
            r.export(o, "matchesUrlMatch", () => p),
            r.export(o, "isRuleEnabledForUid", () => m));
          var n = e("~/config"),
            l = e("~/utils/config");
          function i(e) {
            if (!Array.isArray(e)) return;
            let t = [];
            for (let o of e)
              "number" == typeof o && Number.isFinite(o)
                ? t.push(o)
                : "string" == typeof o && o.trim() && t.push(o.trim());
            return t;
          }
          function s(e) {
            if (!Array.isArray(e)) return;
            let t = e
              .filter((e) => "string" == typeof e)
              .map((e) => e.trim())
              .filter(Boolean);
            return t;
          }
          function a(e) {
            if (!e || "object" != typeof e) return null;
            let t = e.type;
            if ("revealPassword" === t) {
              let t = e.selector,
                o = s(e.fallbackSelectors);
              return {
                type: "revealPassword",
                ...("string" == typeof t && t.trim() ? { selector: t.trim() } : {}),
                ...(o?.length ? { fallbackSelectors: o } : {}),
              };
            }
            return null;
          }
          function c(e) {
            if (!e || "object" != typeof e) return null;
            let t = "string" == typeof e.id && e.id.trim() ? e.id.trim() : null;
            if (!t) return null;
            let o = e.match && "object" == typeof e.match ? e.match : {},
              r = {},
              n = s(o.hints),
              l = s(o.urlPrefixes),
              c = s(o.hosts);
            if (
              (n?.length && (r.hints = n),
              l?.length && (r.urlPrefixes = l),
              c?.length && (r.hosts = c),
              !r.hints && !r.urlPrefixes && !r.hosts)
            )
              return null;
            let u = Array.isArray(e.actions) ? e.actions.map(a).filter((e) => !!e) : [];
            if (0 === u.length) return null;
            let p = i(e.uids),
              f = i(e.excludeUids);
            return {
              id: t,
              ...("string" == typeof e.remark ? { remark: e.remark } : {}),
              enabled: !1 !== e.enabled,
              match: r,
              ...(p ? { uids: p } : {}),
              ...(f ? { excludeUids: f } : {}),
              actions: u,
            };
          }
          function u(e) {
            let t = e?.rules;
            if (!Array.isArray(t))
              return { rules: (0, n.PAGE_ENHANCE_DEFAULTS).rules.map((e) => ({ ...e })) };
            let o = t.map(c).filter((e) => !!e);
            return { rules: o };
          }
          function p(e, t) {
            let o;
            try {
              o = new URL(e);
            } catch {
              return !1;
            }
            let r = o.hostname.toLowerCase(),
              n = `${o.pathname}${o.search}${o.hash}`.toLowerCase();
            if (t.hosts) {
              for (let e of t.hosts) if (r === e.trim().toLowerCase()) return !0;
            }
            if (t.hints)
              for (let e of t.hints) {
                let t = e.trim().toLowerCase();
                if (t && (r.startsWith(t) || (0, l.urlHaystackMatchesHint)(n, t))) return !0;
              }
            if (t.urlPrefixes) {
              let e = (0, l.normalizeOriginPathKey)(o);
              for (let o of t.urlPrefixes) {
                let t = (0, l.normalizeConfiguredUrlPrefix)(o);
                if (t && e.startsWith(t)) return !0;
              }
            }
            return !1;
          }
          function f(e) {
            return "number" == typeof e && Number.isFinite(e)
              ? String(e)
              : "string" == typeof e && e.trim()
                ? e.trim()
                : null;
          }
          function m(e, t) {
            if (!1 === e.enabled || !e.uids?.length) return !1;
            let o = f(t);
            if (!o) return !1;
            if (e.excludeUids?.length) {
              let t = e.excludeUids.map(f).filter((e) => !!e);
              if (t.includes(o)) return !1;
            }
            let r = e.uids.map(f).filter((e) => !!e);
            return r.includes(o);
          }
        },
        {
          "~/config": "b0Rih",
          "~/utils/config": "gwMqm",
          "@parcel/transformer-js/src/esmodule-helpers.js": "hi5hY",
        },
      ],
      b0Rih: [
        function (e, t, o) {
          var r = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (r.defineInteropFlag(o),
            r.export(o, "AUTO_FILL_INPUT_DEFAULTS", () => n),
            r.export(o, "PAGE_ENHANCE_DEFAULTS", () => l));
          let n = {
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
      gwMqm: [
        function (e, t, o) {
          var r = e("@parcel/transformer-js/src/esmodule-helpers.js");
          (r.defineInteropFlag(o),
            r.export(o, "normalizeOriginPathKey", () => l),
            r.export(o, "normalizeConfiguredUrlPrefix", () => i),
            r.export(o, "urlHaystackMatchesHint", () => s),
            r.export(o, "isAutoFillExcludedForUrl", () => a),
            r.export(o, "isInputIgnoredForAutoFill", () => c),
            r.export(o, "mergeAutoFillInputConfig", () => u));
          var n = e("~/config");
          function l(e) {
            let t = `${e.origin}${e.pathname}`.toLowerCase();
            return t.replace(/\/+$/, "") || e.origin.toLowerCase();
          }
          function i(e) {
            return e.trim().toLowerCase().replace(/\/+$/, "");
          }
          function s(e, t) {
            let o = t.trim().toLowerCase();
            if (!o) return !1;
            let r = e.toLowerCase();
            if (o.includes("/") || o.endsWith(".")) return r.includes(o);
            let n = o.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
            return RegExp(`(^|[^a-z0-9])${n}([^a-z0-9]|$)`, "i").test(r);
          }
          function a(e, t) {
            let o;
            try {
              o = new URL(e);
            } catch {
              return !1;
            }
            let r = o.hostname.toLowerCase(),
              n = `${o.pathname}${o.search}${o.hash}`.toLowerCase();
            for (let e of t.autoFillExcludeHints) {
              let t = e.trim().toLowerCase();
              if (t && (r.startsWith(t) || s(n, t))) return !0;
            }
            let a = l(o);
            for (let e of t.autoFillExcludeUrlPrefixes) {
              let t = i(e);
              if (t && a.startsWith(t)) return !0;
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
              o = n.AUTO_FILL_INPUT_DEFAULTS;
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
                for (let [t, r] of Object.entries(e)) {
                  if ("string" != typeof t || !t.trim() || !Array.isArray(r)) continue;
                  let e = r
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
    },
    ["6yrt3"],
    "6yrt3",
    "parcelRequire8d9e",
  ),
  (globalThis.define = t));
//# sourceMappingURL=page-enhance.3374a2ac.js.map
