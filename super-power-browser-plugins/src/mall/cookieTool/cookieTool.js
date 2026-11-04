import {
  d as B,
  r as u,
  f as V,
  w as X,
  g as U,
  h as t,
  c as f,
  o as n,
  a as s,
  b as k,
  i as g,
  j as c,
  t as r,
  u as l,
  k as _,
  F as P,
  l as j,
  m as A,
  _ as Y,
  e as Z,
} from "../js/vendor-vue.js";
import { c as ee } from "../js/vendor-pinia.js";
import { u as oe, c as le, E as ae, i as te } from "../js/vendor-elements.js";
import { u as se, i as ne } from "../js/locales.js";
import { s as ie, g as ce, p as re, i as ue } from "../js/cookies.js";
import "../js/vendor-commonjs.js";
import "../js/auth.js";
const pe = { class: "cookie-tool" },
  me = { class: "tool-header" },
  de = { key: 0, class: "result-summary" },
  _e = { class: "result-success" },
  ve = { class: "result-failed" },
  ke = { class: "result-skipped" },
  fe = { class: "format-row" },
  ye = { for: "export-format" },
  be = B({
    __name: "CookieImportExport",
    setup(z) {
      const { t: e } = se(),
        p = u("current"),
        h = u("import"),
        x = u("json"),
        y = u(""),
        v = u([]),
        b = u(!1),
        T = u(!1),
        m = u(null),
        d = u(""),
        J = V(() => [
          { label: e("cookieTool.currentSite"), value: "current" },
          { label: e("cookieTool.allCookies"), value: "all" },
        ]),
        M = [
          { label: "JSON", value: "json" },
          { label: "Netscape HTTP Cookie File", value: "netscape" },
          { label: "Semicolon name=value", value: "semicolonPairs" },
          { label: "Perl::LWP", value: "lpw" },
        ],
        E = V(() => ie(v.value, x.value)),
        S = V(() => [...(m.value?.failed ?? []), ...(m.value?.skipped ?? [])]);
      function C(a) {
        return a instanceof Error ? a.message : String(a);
      }
      async function w() {
        ((T.value = !0), (d.value = ""));
        try {
          v.value = await ce(p.value);
        } catch (a) {
          ((v.value = []), (d.value = e("cookieTool.loadFailed") + ": " + C(a)));
        } finally {
          T.value = !1;
        }
      }
      async function O() {
        ((b.value = !0), (d.value = ""), (m.value = null));
        try {
          const a = re(y.value);
          ((m.value = await ue(a, p.value)), await w());
        } catch (a) {
          d.value = e("cookieTool.invalidJson") + ": " + C(a);
        } finally {
          b.value = !1;
        }
      }
      async function D() {
        try {
          (await navigator.clipboard.writeText(E.value),
            ae.success(e("cookieTool.copied", { count: v.value.length })));
        } catch (a) {
          d.value = e("cookieTool.copyFailed") + ": " + C(a);
        }
      }
      return (
        X(p, w),
        U(w),
        (a, i) => {
          const L = t("el-segmented"),
            $ = t("el-alert"),
            F = t("el-input"),
            H = t("el-collapse-item"),
            R = t("el-collapse"),
            I = t("el-button"),
            N = t("el-tab-pane"),
            W = t("el-option"),
            q = t("el-select"),
            G = t("el-skeleton"),
            K = t("el-empty"),
            Q = t("el-tabs");
          return (
            n(),
            f("main", pe, [
              s("header", me, [
                s("div", null, [
                  s("h1", null, r(l(e)("cookieTool.title")), 1),
                  s("p", null, r(l(e)("cookieTool.cookieCount", { count: v.value.length })), 1),
                ]),
                c(
                  L,
                  {
                    modelValue: p.value,
                    "onUpdate:modelValue": i[0] || (i[0] = (o) => (p.value = o)),
                    options: J.value,
                    class: "scope-control",
                  },
                  null,
                  8,
                  ["modelValue", "options"],
                ),
              ]),
              d.value
                ? (n(),
                  k(
                    $,
                    {
                      key: 0,
                      title: d.value,
                      type: "error",
                      "show-icon": "",
                      closable: !0,
                      onClose: i[1] || (i[1] = (o) => (d.value = "")),
                    },
                    null,
                    8,
                    ["title"],
                  ))
                : g("", !0),
              c(
                Q,
                {
                  modelValue: h.value,
                  "onUpdate:modelValue": i[4] || (i[4] = (o) => (h.value = o)),
                  class: "tool-tabs",
                },
                {
                  default: _(() => [
                    c(
                      N,
                      { label: l(e)("cookieTool.importTab"), name: "import" },
                      {
                        default: _(() => [
                          c(
                            F,
                            {
                              modelValue: y.value,
                              "onUpdate:modelValue": i[2] || (i[2] = (o) => (y.value = o)),
                              type: "textarea",
                              rows: 12,
                              resize: "none",
                              spellcheck: "false",
                              placeholder: l(e)("cookieTool.jsonPlaceholder"),
                            },
                            null,
                            8,
                            ["modelValue", "placeholder"],
                          ),
                          m.value
                            ? (n(),
                              f("div", de, [
                                s(
                                  "span",
                                  _e,
                                  r(l(e)("cookieTool.imported", { count: m.value.imported })),
                                  1,
                                ),
                                s(
                                  "span",
                                  ve,
                                  r(l(e)("cookieTool.failed", { count: m.value.failed.length })),
                                  1,
                                ),
                                s(
                                  "span",
                                  ke,
                                  r(l(e)("cookieTool.skipped", { count: m.value.skipped.length })),
                                  1,
                                ),
                              ]))
                            : g("", !0),
                          S.value.length
                            ? (n(),
                              k(
                                R,
                                { key: 1, class: "issue-list" },
                                {
                                  default: _(() => [
                                    c(
                                      H,
                                      { title: l(e)("cookieTool.details"), name: "issues" },
                                      {
                                        default: _(() => [
                                          (n(!0),
                                          f(
                                            P,
                                            null,
                                            j(
                                              S.value,
                                              (o) => (
                                                n(),
                                                f(
                                                  "div",
                                                  {
                                                    key: o.index + "-" + o.reason,
                                                    class: "issue-row",
                                                  },
                                                  [
                                                    s(
                                                      "strong",
                                                      null,
                                                      r(
                                                        o.name ||
                                                          l(e)("cookieTool.item", {
                                                            index: o.index + 1,
                                                          }),
                                                      ),
                                                      1,
                                                    ),
                                                    s("span", null, r(o.reason), 1),
                                                  ],
                                                )
                                              ),
                                            ),
                                            128,
                                          )),
                                        ]),
                                        _: 1,
                                      },
                                      8,
                                      ["title"],
                                    ),
                                  ]),
                                  _: 1,
                                },
                              ))
                            : g("", !0),
                          c(
                            I,
                            {
                              type: "primary",
                              icon: l(oe),
                              loading: b.value,
                              disabled: !y.value.trim() || b.value,
                              class: "primary-action",
                              onClick: O,
                            },
                            { default: _(() => [A(r(l(e)("cookieTool.importAction")), 1)]), _: 1 },
                            8,
                            ["icon", "loading", "disabled"],
                          ),
                        ]),
                        _: 1,
                      },
                      8,
                      ["label"],
                    ),
                    c(
                      N,
                      { label: l(e)("cookieTool.exportTab"), name: "export" },
                      {
                        default: _(() => [
                          s("div", fe, [
                            s("label", ye, r(l(e)("cookieTool.format")), 1),
                            c(
                              q,
                              {
                                id: "export-format",
                                modelValue: x.value,
                                "onUpdate:modelValue": i[3] || (i[3] = (o) => (x.value = o)),
                              },
                              {
                                default: _(() => [
                                  (n(),
                                  f(
                                    P,
                                    null,
                                    j(M, (o) =>
                                      c(
                                        W,
                                        { key: o.value, label: o.label, value: o.value },
                                        null,
                                        8,
                                        ["label", "value"],
                                      ),
                                    ),
                                    64,
                                  )),
                                ]),
                                _: 1,
                              },
                              8,
                              ["modelValue"],
                            ),
                          ]),
                          T.value
                            ? (n(), k(G, { key: 0, rows: 7, animated: "" }))
                            : v.value.length === 0
                              ? (n(),
                                k(K, { key: 1, description: l(e)("cookieTool.empty") }, null, 8, [
                                  "description",
                                ]))
                              : (n(),
                                k(
                                  F,
                                  {
                                    key: 2,
                                    "model-value": E.value,
                                    type: "textarea",
                                    rows: 12,
                                    resize: "none",
                                    readonly: "",
                                    spellcheck: "false",
                                  },
                                  null,
                                  8,
                                  ["model-value"],
                                )),
                          c(
                            I,
                            {
                              type: "primary",
                              icon: l(le),
                              disabled: T.value || v.value.length === 0,
                              class: "primary-action",
                              onClick: D,
                            },
                            { default: _(() => [A(r(l(e)("cookieTool.copyAction")), 1)]), _: 1 },
                            8,
                            ["icon", "disabled"],
                          ),
                        ]),
                        _: 1,
                      },
                      8,
                      ["label"],
                    ),
                  ]),
                  _: 1,
                },
                8,
                ["modelValue"],
              ),
            ])
          );
        }
      );
    },
  }),
  Te = Y(be, [["__scopeId", "data-v-d054d03a"]]),
  ge = B({
    __name: "App",
    setup(z) {
      const e = u(!1);
      return (
        U(() => {
          chrome.runtime.sendMessage({ type: "getCookieToolDebugState" }, (p) => {
            if (chrome.runtime.lastError || !p?.enabled) {
              window.close();
              return;
            }
            e.value = !0;
          });
        }),
        (p, h) => (e.value ? (n(), k(Te, { key: 0 })) : g("", !0))
      );
    },
  }),
  he = ee();
Z(ge).use(he).use(ne).use(te).mount("#app");
