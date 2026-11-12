import {requestProxySwitch, requestProxyRoutes, requestTransferSpeed, requestTransferDetails, requestProxyAutomatic} from "../runtime/proxy-switch.mjs";
import {
  d as te,
  _ as le,
  h as A,
  c as m,
  o as c,
  i as v,
  b as M,
  j as p,
  F as J,
  l as U,
  k as h,
  m as P,
  t as o,
  a as n,
  n as pe,
  p as T,
  q as D,
  s as ce,
  v as ge,
  x as me,
  e as fe,
} from "../js/vendor-vue.js";
import { c as _e } from "../js/vendor-pinia.js";
import { c as S, v as Ae, g as ye, a as Te } from "../js/common.js";
import { m as E } from "../js/api.js";
import { l as Y, a as _, R as ke, P as X, i as we } from "../js/desktop-bridge.js";
import { E as y, a as ve, i as Me } from "../js/vendor-elements.js";
import { i as Se } from "../js/locales.js";
import "../js/vendor-commonjs.js";
import "../js/auth.js";
const Q = 5,
  Pe = /^(?:(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)\.){3}(?:25[0-5]|2[0-4]\d|1\d{2}|[1-9]?\d)$/,
  Ee = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
function Ce(e) {
  const t = String(e || "")
    .trim()
    .match(/^https?:\/\/([^/?#]+)/i);
  if (!t) return "";
  let s = t[1];
  const i = s.lastIndexOf("@");
  if ((i >= 0 && (s = s.slice(i + 1)), s.startsWith("["))) {
    const d = s.indexOf("]");
    return d > 0 ? s.slice(1, d) : "";
  }
  const a = s.indexOf(":");
  return a >= 0 ? s.slice(0, a) : s;
}
function Le(e) {
  const t = String(e || "")
    .trim()
    .toLowerCase();
  return t ? (t === "localhost" ? !0 : /^\d+$/.test(t) ? !1 : Pe.test(t) ? !0 : Ee.test(t)) : !1;
}
function ne(e) {
  const t = String(e || "").trim();
  if (!t) return "";
  try {
    const s = new URL(t);
    let i = s.pathname;
    return (
      i.length > 1 && i.endsWith("/") && (i = i.slice(0, -1)),
      `${s.protocol}//${s.host}${i}${s.search}${s.hash}`.toLowerCase()
    );
  } catch {
    return t.replace(/\/+$/, "").toLowerCase();
  }
}
function he(e) {
  const t = String(e || "").trim();
  if (!t || t.length > 2048 || /\s/.test(t)) return !1;
  try {
    const s = new URL(t);
    if (s.protocol !== "http:" && s.protocol !== "https:") return !1;
  } catch {
    return !1;
  }
  return Le(Ce(t));
}
function Z(e) {
  const t = String(e || "").trim(),
    s = t.toLowerCase();
  return s.startsWith("https://")
    ? { protocol: "https://", hostPart: t.slice(8) }
    : s.startsWith("http://")
      ? { protocol: "http://", hostPart: t.slice(7) }
      : { protocol: "https://", hostPart: t };
}
function be(e, t) {
  const s = String(t || "").trim();
  if (!s) return "";
  const i = s.toLowerCase();
  if (i.startsWith("https://") || i.startsWith("http://")) {
    const a = Z(s);
    return `${a.protocol}${a.hostPart}`;
  }
  return `${e}${s}`;
}
function x(e) {
  return e.map((t, s) => ({ sort: s, link: t.link }));
}
function F(e) {
  if (!Array.isArray(e)) return [];
  const t = e
    .map((s) => {
      const i = String(s?.link ?? "").trim(),
        a = Number(s?.sort);
      return { sort: Number.isFinite(a) ? a : Number.MAX_SAFE_INTEGER, link: i };
    })
    .filter((s) => he(s.link))
    .sort((s, i) => s.sort - i.sort)
    .slice(0, Q);
  return x(t);
}
function ie(e) {
  return !e || typeof e != "object"
    ? []
    : e.jump_urls !== void 0 && e.jump_urls !== null
      ? F(e.jump_urls)
      : e.jumpUrls !== void 0 && e.jumpUrls !== null
        ? F(e.jumpUrls)
        : e.jump_pages !== void 0 && e.jump_pages !== null
          ? F(e.jump_pages)
          : e.jumpPages !== void 0 && e.jumpPages !== null
            ? F(e.jumpPages)
            : [];
}
const Ie = te({
    name: "OpenMethodJumpPages",
    props: {
      modelValue: { type: Array, default: () => [] },
      mallId: { type: [String, Number], required: !0 },
      active: { type: Boolean, default: !0 },
    },
    emits: ["update:modelValue", "saved"],
    data() {
      return {
        showJumpPageEditorDialog: !1,
        jumpPageEditorIndex: null,
        jumpPageEditorProtocol: "https://",
        jumpPageEditorHost: "",
        jumpPageEditorError: "",
        savingJumpUrls: !1,
        dragFromIndex: -1,
        dragOverIndex: -1,
      };
    },
    computed: {
      maxJumpPages() {
        return Q;
      },
    },
    watch: {
      active(e) {
        e || ((this.showJumpPageEditorDialog = !1), this.resetJumpPageEditor());
      },
    },
    methods: {
      emitPages(e) {
        const t = x(e);
        (this.$emit("update:modelValue", t), this.$emit("saved", t));
      },
      async persistJumpPages(e) {
        const t = x(e);
        this.savingJumpUrls = !0;
        try {
          return (await E.saveMallJumpUrls({ bind_mall_id: Number(this.mallId), jump_urls: t }))
            ?.errorCode === 0
            ? (this.emitPages(t), !0)
            : (y.error(this.$t("check.content.open_method_urls_save_failed")), !1);
        } catch {
          return (y.error(this.$t("check.content.open_method_urls_save_failed")), !1);
        } finally {
          this.savingJumpUrls = !1;
        }
      },
      openJumpPageEditor(e = null) {
        if (!this.savingJumpUrls && !(e === null && this.modelValue.length >= Q)) {
          if (((this.jumpPageEditorIndex = e), (this.jumpPageEditorError = ""), e === null))
            ((this.jumpPageEditorProtocol = "https://"), (this.jumpPageEditorHost = ""));
          else {
            const t = this.modelValue[e],
              s = Z(t?.link || "");
            ((this.jumpPageEditorProtocol = s.protocol), (this.jumpPageEditorHost = s.hostPart));
          }
          this.showJumpPageEditorDialog = !0;
        }
      },
      resetJumpPageEditor() {
        ((this.jumpPageEditorIndex = null),
          (this.jumpPageEditorProtocol = "https://"),
          (this.jumpPageEditorHost = ""),
          (this.jumpPageEditorError = ""));
      },
      onJumpPageHostInput(e) {
        const t = String(e || "").trim(),
          s = t.toLowerCase();
        if (s.startsWith("https://") || s.startsWith("http://")) {
          const i = Z(t);
          ((this.jumpPageEditorProtocol = i.protocol), (this.jumpPageEditorHost = i.hostPart));
        }
        this.jumpPageEditorError && (this.jumpPageEditorError = "");
      },
      async saveJumpPageEditor() {
        if (this.savingJumpUrls) return;
        const e = String(this.jumpPageEditorHost || "").trim();
        if (!e) {
          this.jumpPageEditorError = String(this.$t("check.content.open_method_url_required"));
          return;
        }
        const t = be(this.jumpPageEditorProtocol, e);
        if (!he(t)) {
          this.jumpPageEditorError = String(this.$t("check.content.open_method_url_invalid"));
          return;
        }
        const s = ne(t);
        if (
          this.modelValue.some((l, r) =>
            this.jumpPageEditorIndex !== null && r === this.jumpPageEditorIndex
              ? !1
              : ne(l.link) === s,
          )
        ) {
          this.jumpPageEditorError = String(this.$t("check.content.open_method_url_duplicate"));
          return;
        }
        let a;
        if (this.jumpPageEditorIndex === null) {
          if (this.modelValue.length >= Q) return;
          a = [...this.modelValue, { sort: this.modelValue.length, link: t }];
        } else
          a = this.modelValue.map((l, r) =>
            r === this.jumpPageEditorIndex ? { ...l, link: t } : l,
          );
        (await this.persistJumpPages(a)) && (this.showJumpPageEditorDialog = !1);
      },
      async handleJumpPageCommand(e, t) {
        if (!this.savingJumpUrls) {
          if (e === "edit") {
            this.openJumpPageEditor(t);
            return;
          }
          e === "delete" &&
            (await this.persistJumpPages(this.modelValue.filter((s, i) => i !== t)));
        }
      },
      onDragStart(e, t) {
        if (this.savingJumpUrls || this.modelValue.length < 2) {
          t.preventDefault();
          return;
        }
        ((this.dragFromIndex = e),
          (this.dragOverIndex = e),
          t.dataTransfer &&
            ((t.dataTransfer.effectAllowed = "move"),
            t.dataTransfer.setData("text/plain", String(e))));
      },
      onDragOver(e) {
        this.dragFromIndex < 0 || this.savingJumpUrls || (this.dragOverIndex = e);
      },
      onDragEnd() {
        ((this.dragFromIndex = -1), (this.dragOverIndex = -1));
      },
      async onDrop(e) {
        const t = this.dragFromIndex;
        if (
          ((this.dragFromIndex = -1),
          (this.dragOverIndex = -1),
          t < 0 || e < 0 || t === e || this.savingJumpUrls)
        )
          return;
        const s = [...this.modelValue],
          [i] = s.splice(t, 1);
        (s.splice(e, 0, i), await this.persistJumpPages(s));
      },
    },
  }),
  Be = { key: 0, class: "openMethodJumpPageList" },
  Re = ["onDragover", "onDrop"],
  Je = ["draggable", "title", "onDragstart"],
  Ue = ["title"],
  De = { key: 2, class: "openMethodJumpPageMaxTip" },
  Oe = { class: "jumpPageEditorBody" },
  Ne = { class: "jumpPageEditorLabel" },
  Ve = { class: "jumpPageEditorField" },
  Fe = { class: "jumpPageEditorInputGroup" },
  $e = { key: 0, class: "jumpPageEditorError" };
function je(e, t, s, i, a, d) {
  const l = A("Rank"),
    r = A("el-icon"),
    u = A("Link"),
    V = A("MoreFilled"),
    C = A("el-dropdown-item"),
    I = A("el-dropdown-menu"),
    B = A("el-dropdown"),
    O = A("Plus"),
    R = A("el-button"),
    q = A("el-option"),
    $ = A("el-select"),
    W = A("el-input"),
    H = A("el-dialog");
  return (
    c(),
    m("div", { class: "openMethodJumpPages", onClick: t[8] || (t[8] = D(() => {}, ["stop"])) }, [
      e.modelValue.length
        ? (c(),
          m("div", Be, [
            (c(!0),
            m(
              J,
              null,
              U(
                e.modelValue,
                (w, L) => (
                  c(),
                  m(
                    "div",
                    {
                      key: w.link,
                      class: T([
                        "openMethodJumpPageItem",
                        {
                          "is-dragging": e.dragFromIndex === L,
                          "is-drag-over": e.dragOverIndex === L && e.dragFromIndex !== L,
                        },
                      ]),
                      onDragover: D((b) => e.onDragOver(L), ["prevent"]),
                      onDrop: D((b) => e.onDrop(L), ["prevent"]),
                    },
                    [
                      n(
                        "span",
                        {
                          class: T([
                            "openMethodJumpPageDrag",
                            { "is-disabled": e.savingJumpUrls || e.modelValue.length < 2 },
                          ]),
                          draggable: !e.savingJumpUrls && e.modelValue.length > 1,
                          title: e.$t("check.content.open_method_drag_tip"),
                          onDragstart: D((b) => e.onDragStart(L, b), ["stop"]),
                          onDragend: t[0] || (t[0] = (...b) => e.onDragEnd && e.onDragEnd(...b)),
                          onClick: t[1] || (t[1] = D(() => {}, ["stop"])),
                        },
                        [p(r, null, { default: h(() => [p(l)]), _: 1 })],
                        42,
                        Je,
                      ),
                      p(r, { class: "openMethodJumpPageIcon" }, { default: h(() => [p(u)]), _: 1 }),
                      n(
                        "span",
                        { class: "openMethodJumpPageLink", title: w.link },
                        o(w.link),
                        9,
                        Ue,
                      ),
                      p(
                        B,
                        { trigger: "click", onCommand: (b) => e.handleJumpPageCommand(b, L) },
                        {
                          dropdown: h(() => [
                            p(I, null, {
                              default: h(() => [
                                p(
                                  C,
                                  { command: "edit" },
                                  {
                                    default: h(() => [
                                      P(o(e.$t("check.content.open_method_edit")), 1),
                                    ]),
                                    _: 1,
                                  },
                                ),
                                p(
                                  C,
                                  { command: "delete", class: "openMethodJumpPageDelete" },
                                  {
                                    default: h(() => [
                                      P(o(e.$t("check.content.open_method_delete")), 1),
                                    ]),
                                    _: 1,
                                  },
                                ),
                              ]),
                              _: 1,
                            }),
                          ]),
                          default: h(() => [
                            n(
                              "span",
                              {
                                class: "openMethodJumpPageMore",
                                onClick: t[2] || (t[2] = D(() => {}, ["stop"])),
                              },
                              [p(r, null, { default: h(() => [p(V)]), _: 1 })],
                            ),
                          ]),
                          _: 2,
                        },
                        1032,
                        ["onCommand"],
                      ),
                    ],
                    42,
                    Re,
                  )
                ),
              ),
              128,
            )),
          ]))
        : v("", !0),
      e.modelValue.length < e.maxJumpPages
        ? (c(),
          M(
            R,
            {
              key: 1,
              class: "openMethodAddPageBtn",
              type: "primary",
              link: "",
              onClick: t[3] || (t[3] = (w) => e.openJumpPageEditor()),
            },
            {
              default: h(() => [
                p(r, { class: "openMethodAddPageIcon" }, { default: h(() => [p(O)]), _: 1 }),
                P(" " + o(e.$t("check.content.open_method_add_page")), 1),
              ]),
              _: 1,
            },
          ))
        : (c(), m("div", De, o(e.$t("check.content.open_method_max_pages")), 1)),
      p(
        H,
        {
          modelValue: e.showJumpPageEditorDialog,
          "onUpdate:modelValue": t[7] || (t[7] = (w) => (e.showJumpPageEditorDialog = w)),
          title:
            e.jumpPageEditorIndex === null
              ? e.$t("check.content.open_method_add_page")
              : e.$t("check.content.open_method_edit_page"),
          width: "480px",
          "append-to-body": "",
          class: "jumpPageEditorDialog",
          onClosed: e.resetJumpPageEditor,
        },
        {
          footer: h(() => [
            p(
              R,
              { onClick: t[6] || (t[6] = (w) => (e.showJumpPageEditorDialog = !1)) },
              { default: h(() => [P(o(e.$t("check.content.cancel")), 1)]), _: 1 },
            ),
            p(
              R,
              { type: "primary", loading: e.savingJumpUrls, onClick: e.saveJumpPageEditor },
              { default: h(() => [P(o(e.$t("check.content.open_method_save")), 1)]), _: 1 },
              8,
              ["loading", "onClick"],
            ),
          ]),
          default: h(() => [
            n("div", Oe, [
              n("span", Ne, o(e.$t("check.content.open_method_url_label")), 1),
              n("div", Ve, [
                n("div", Fe, [
                  p(
                    $,
                    {
                      modelValue: e.jumpPageEditorProtocol,
                      "onUpdate:modelValue": t[4] || (t[4] = (w) => (e.jumpPageEditorProtocol = w)),
                      class: "jumpPageEditorProtocol",
                    },
                    {
                      default: h(() => [
                        p(q, { label: "https://", value: "https://" }),
                        p(q, { label: "http://", value: "http://" }),
                      ]),
                      _: 1,
                    },
                    8,
                    ["modelValue"],
                  ),
                  p(
                    W,
                    {
                      modelValue: e.jumpPageEditorHost,
                      "onUpdate:modelValue": t[5] || (t[5] = (w) => (e.jumpPageEditorHost = w)),
                      class: T(["jumpPageEditorHost", { "is-error": !!e.jumpPageEditorError }]),
                      placeholder: e.$t("check.content.open_method_url_placeholder"),
                      clearable: "",
                      onInput: e.onJumpPageHostInput,
                      onKeyup: pe(e.saveJumpPageEditor, ["enter"]),
                    },
                    null,
                    8,
                    ["modelValue", "placeholder", "class", "onInput", "onKeyup"],
                  ),
                ]),
                e.jumpPageEditorError
                  ? (c(), m("div", $e, o(e.jumpPageEditorError), 1))
                  : v("", !0),
              ]),
            ]),
          ]),
          _: 1,
        },
        8,
        ["modelValue", "title", "onClosed"],
      ),
    ])
  );
}
const Ye = le(Ie, [
    ["render", je],
    ["__scopeId", "data-v-086b7552"],
  ]),
  Ge = "/assets/china-BKPdZLOY.png",
  Ke =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAiCAYAAADvVd+PAAAACXBIWXMAAAsTAAALEwEAmpwYAAAGNElEQVRoge2Xa2wU1xmGn9kZe+1de3fjXYOxHdtrRwFqA6YYA1lIasiFe+qmCAOtStQK2oRFLQlpSZTUOKlEf5S0oVKiRFWqJqUqUqUkahSihjYh2LEBE9MAjhcDTmxT27tmd/Yye52Z/rBYiYgYJVU6lsjza450zpn3HZ3zfe8IHo9XBxBNIqqmcpUvOp5sTr0yyr3yRaYiJoDGhbP44Y9WYRIEAGaUOHnssY1YLXkA5JlzeeTRDVRWTgdAQKBlUxNNTfOzG9XVuXn44fsRTSYAXE47P/9FC3ab9f9q6IsiAfj9Ml1dvWi6jiXfTDgc42S3D0VJYsk3o8STdHX2EpaV7Linp59UMo0gCOSZcwkFo3R0nEXVNCz5ZmQ5Rs+H/UQiCgXVVVTcVme01+siXL0CALXfqKKlpYm2tldIZzLYbVZa927lV8+8SmBcRjSZ2LNnM4cPn+Bkdx8Aa9csobTUyUsvvYmOTrW7lG3b19L6yz+SSKYAWL/+Dnbv3miMwxsgVlQsahUQcBbZiETi9PUNEhiXcTntyHKUy8MBhoYCFN1SSExJ8OmnY/j9Mrk5EpmMiizH6L8wTDii4HLaiUTinD8/zOhYEJfTjhJPMnPmrXg8U/gErF61iHn1Nfx631/QdJ3ysmL2tm1lp/cAMSVBnjmX/c8+xO9++zf6fIMICHi9zYyMXuHQoXcBWLZ0DitXNfLUky+jahoup53f7P8JO70HmJWRaXYkjXX6OQgej1cvsOYDEIslcLtLuHx5nPx8M6FQFLe7hEuXRrDZLKTTGaZPL2JgYASrdaJAqqqGw1FAJKJcs8fgoJ/CQguhUIS5sZEp2wUkgGgsDsCSxbU0f2cpTzz+B4KhCHablb1tW3lk1/OM+UOIJhM/2Hof7cc+4h/vdAOwedMKnC4bvz/wGjo6c+rcbNu+jt2PvsCVYHjiJYWFFDgrDbI4OYLH49XLy4qpqSmlveMMugaFhfl8c8HtdHWeI5FIYTbnsHhJLT0f9iPLMQQBGhpm4g+EGLg0CoDLZaO2topjx86gqhpWq5mGhbM43tXL8hXzp2wRNAFUVE6nrMxFJqOiaRqSJLJsaR3xeApN04nHUzQsuJ2Cgnw0TSOjqpSWOqmqLEHVJtaUlblwu0tIpdNomoaqaixfXk8ymTba46Rc0wbdVSXc9a16/vzqO9k2+N0Nd/H6a+3ZNrh5y910dZ7Dd34IgMbG2cwoKeKNNzrQ0SkvL+beexo4ePBItg3eWWHne/OKjXF4A6TsgyiSTqtcuRImnckgiWK2sMnhGJIoklFVxkaDqKqGJIqoqkYqmcYfkNHRkUSRRDxFNBonkUxl14Q/9tHfddgwk5MhVlQsam1snM3qNYt4790ePu4bZEaJE6/323R3++g63ktujsSuXRsYGgrQfcpHKBhl85YVuFw2Pug8x+DgGHPqqtnY0sTR905z5uwlXE47P/3ZA5zuucAt0SA1yaDRXq+LBDA2GuSDjrNouo7Vkkc4HKOzsxdFSWK15BFTErS3n0GWY9nxqW4fqVQGkyBgNucSDEZ4/+i/UTUNqyUPWY5x4kQfkYhCefMaVu5Yb7TX6yIBDHwyAkBtbRWbNi1nb+ufOPLPU9htVtqefpCn217h/WMfIZpMPP7EFt566zgnT05E4XVrl1Ba6uLFF//O0LCfmupStv94HU89+TJvv30CAJM5lxyH3SCLkyN4PF5dQMDptKFqGna7lYGBEYpdDsbHZWbPrsTnG8LhKMAfCFFx6zQUJYmqakSjcZxOGyaTwOX/jFPscpBMppk2zUH/hWGKXQ78gRD3LKhm+7r5N1ZjABNRePVi6ufVsG/fwYkoXF5MW9uDeHc89/lReGczoyNB/nroXwDcuWwu961ceE0U3v/sQ3h3PId75OKUTYKCx+PVr/73x5QEAObcXPLycgiHFXQmumRhgYVMRiWemMj0n13z2XGOJGG1TtSTqRyFhaNHT+s3nva/YVdTTMvEvurXfCkETdO+8g8wlZHSIdloDYYivF7dcFOfAJPRAoxGum3b943WYCg3fRG86a+AcOTuB27qEyBFL35itAZDkYoWzDVag6F8XQSNFmA00uk9zxitwVC+jsJGCzCa/wJAuMDq/oy1ZQAAAABJRU5ErkJggg==",
  ze =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAArCAYAAADIWo5HAAAACXBIWXMAAAsTAAALEwEAmpwYAAACXElEQVRoge2ZsWtTURjFz3s+25DXPEgNIVhNKVWILSXER83g0sHqKMEO3Yp2cHAQHNql/4AOhVIcXOJaaEWkk9Yhi4OWGEQaA1pKrUgIsYHUhKbWlw4qNuhQknPvLeSdOfl9J78h93I/zXGcOto4uuoCquMKUF1AdVwBqguojitAdQHVMaRPrAPVj5uo5jbwo1gCAJwM+OGN9MF7vhfQ5NaRJqCa28CXhwsoPHmJWr743890hgII3riCM3fG4Y30Semlib4J7pfK+DQ1i6+Pn6HuOEcrpes4ffM6zj24B8NviawnVsD3TA7vEnex+znf1Pc94RCiT+fQFYuQm/2NMAHl1++RuXob+zuVljiGz0TsxSNY8SFSs8YIEVDbyuONPY69339yraYj4Mel9AI6z4YovMMRcgxmJ2ZoPx4A9oolZCdmaLzDoQsoLK1gO7XKxmI7tYrC0gqdSxeweT/JRgplUwVU1tZRTmeZyIaU01lU1tapTKqAb89fMXFSZlAF7Lz9wMRJmUEVUNtq7sKjcgZVwM/qLhMnZQZVwAmvh4mTMoMqQMRNTfQMqgDfxQtMnJQZVAGnrl1m4qTMoAowB/th2QNMZEMsewDmYD+VSb8K907fYiOFsukCgmOj6B4ZZmPRPTKM4Ngoneu+B9CJ+HVURZfnYfjMllmGz0R0eV7YEStsL2DFh2CnkvCEmy/uCYdgp5LCnsMAwYuRrlgE8cwieiYT0PSjj9J0HT2TCcQzi0IfRAEJz+J/0rZ7gX9yzDZD8gUcs7T9ctQVoLqA6rgCVBdQHVeA6gKqcwBvcs0PgfYsUAAAAABJRU5ErkJggg==",
  qe =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAArCAYAAADIWo5HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAlklEQVRoge3QwQ0BYBTA4Mco7CIxgEXcTSGGMIKLqZxcWOJPvoh2gKbpZna3zyzmfj3M6bhf6nw/nvM6X5Y6Z2a2y40/RgN0gKYBOkDTAB2gaYAO0DRAB2gaoAM0DdABmgboAE0DdICmATpA0wAdoGmADtA0QAdoGqADNA3QAZoG6ABNA3SApgE6QNMAHaBpgA7Q/P2ALyL4CKMFN8bSAAAAAElFTkSuQmCC",
  Qe =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAArCAYAAADIWo5HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAqElEQVRoge3asQlCURAFUZ/8JmxBMDA01cxexCKs5fdjZGJgZgGiGGoZJ7h3KhgGloVlx7za/hbBLLWApgG0gKYBtIAmPsB4Xm/Ra3C8P9/oAPEj0ABaQNMAWkAzzqdL9BYYm/UxOkD8CDSAFtA0gBbQNIAW0DSAFtA0gBbQxAeY9oeddqD0KKoFNA2gBTQNoAU00+v+0A6U0R+hcBpAC2gaQAto4gP8AXqEFuGzxKPjAAAAAElFTkSuQmCC",
  We =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAArCAYAAADIWo5HAAAACXBIWXMAAAsTAAALEwEAmpwYAAAAe0lEQVRoge3YsQ3AMBADMTvI3t7cyRgs/jjBQaX2Xetbgz06QGsAHaA1gA7QGkAHaA2gA7QG0AFaA+gArQF0gNYAOkBrAB2gjR/gXefoBmrfe3uFJ2sAHaA1gA7QGkAHaA2gA7QG0AFaA+gArQF0gNYAOkBrAB2gjR/gB/twB0uxtX1tAAAAAElFTkSuQmCC",
  He =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAAAgCAYAAACinX6EAAAACXBIWXMAAAsTAAALEwEAmpwYAAADYUlEQVRoge2YXUhTYRjH/6/n+AGyMFwRIlFGjBFaMw1pQXQh2sYu1OWC0Is2YSmKiBeSeBWLLkKk0AS3GyVosubFcPlxEYELydVSkTEiiYgRNSkaA7/m6UI35z5qZ3NnZ+D/8jzvy/v8f+c973neh6zI7zLFPVoIpBUI17LLjQdPrDBPO8AwTEScjZSyyzA+VcO36MTKjdtRx1x4/QL5F8VQtRtgsr5Paj1CCOprJOjrkOE8vQX34xF4TFbA7wcACKSVKO7RgvbaFuBULAQfhIIoFRVhfFBzqCBSrUjjQ1iKYjzgkxaqFPCYrMh0EGyNB5Tl62xF2fwEhCoFQFF7INRwKjTw2uwHBgdAOCZ70VBbDkIIZwZjiRCChtpyOCZ7MdpVjfyBISxV1cFjtAB+PwTSSogtBogt+gjzyy43siRyHZr7Z5FpIJI13timh0SuA80wDF5OfYB52rG7hTpbUdbdEjw0+PZpJLrVA8bD86QDQb6DOGzjAdHhg/kGIlXGYwJIFQi+Gd9f56w2rlcUb2ERK6F3H79ArboaVyFkML7FlUtnElqH7c4jt9pGWO3RLALU10iglEmwsfoV3589x/bar2D82LUKnGiqB8nJjjo/HgAA8HvqDdZMr8DsGSe5OTjZVBfVOMMwMFkdME87sMPyiyM7O2ynJKd4AXAl2rfo5HTBdddqQrFUicwXlPKrpuVYWelOIN06ApDuBNKtIwDpTiDdIl7HCqd/gXXXKj5r70eNnRt+iDxRCZfpgOa68PiX8kQl3BdCqnYDqwmhpXC0RojXZsePsQkwG5sAAEJRKFTeREHt9aQSZTa38HPMjD9z+80ZuvA4Tt27g9yS04mXwolchkpFRRFxr82Ob4+G4bUt7D6gKAiVMhR1t+DTdnZCl6FE1mF7GfrvIRjaehof1EQk5bXZ4VRo4FSod5OiKAhVCpTNT8DX2Yrm/llI5DrMzMVfcs/MOSGR69DYpseyy30gJpBWQGzRQ2wxQCCtBPx+eIwWLFXVIX9gCKNd1axadTH7Acm+8eb+5BoiEf2IsDwCIELz8Bgt8JisECplGO1uQV+HjH1DJN3GuQYRBMA341yBoPluPNUgaMdkb0YYD9dhgaCjnep8Nh6uZEEEz4BMMx6uREHQmW48XGxB/AX549xCg/n26QAAAABJRU5ErkJggg==";
let se = !1,
  ee = {},
  oe = !1,
  N = null;
const ae = 3,
  Xe = 1e4,
  Ze = te({
    name: "check",
    components: { OpenMethodJumpPages: Ye },
    data() {
      return {
        listLoading: !1,
        bindLocalLoading: !1,
        mall: {},
        ipInfo: {},
        loadUa: !0,
        checkUa: !1,
        loadIp: !0,
        checkIp: !1,
        checkIpEnd: !1,
        spCheckSetupPending: !1,
        spCheckSetupError: "",
        spUaChecked: !1,
        spIpChecked: !1,
        checkResult: this.$t("check.content.detecting"),
        websiteList: [],
        currencyList: [],
        adsRecommendList: [],
        isShowAds: !0,
        localGeo: "",
        showLocal: !1,
        mallId: "",
        titleIP: "",
        isExternalNetwork: !1,
        maxRetryTimes: 0,
        maxRetryNum: 1,
        translation_ip: "",
        initJson: {},
        reqLimit: 0,
        showSpeedTestGuide: !0,
        ipv6: !1,
        nowTs: Date.now(),
        transferProxies: [],
        currentTransferProxyIndex: -1,
        nextTransferProxyIndex: 0,
        transferProxySwitchCount: 0,
        switchingIndex: -1,
        spTriedCandidateIndexes: [],
        spProxySwitchAttempt: 0,
        spProxySnapshotId: "",
        spRelayPool: null,
        spRelayAutomatic: false,
        spRelayStatus: "",
        spRelayRefreshPending: false,
        lastReportedTransferProxyKey: "",
        hasPendingTransferReport: !1,
        transitLatencyMap: {},
        isTransitLatencyTesting: !1,
        isBatchTransitTesting: !1,
        autoSwitchBestTransitEnabled: !0,
        testingTransitIndex: -1,
        lineTestingStatus: "idle",
        lineTestingMessage: "",
        showOpenMethodDialog: !1,
        openMethodFormValue: 2,
        localJumpMethod: null,
        openingLastSession: !1,
        saveOpenMethodLoading: !1,
        jumpPagesDraft: [],
        pageLoadJumpPages: [],
        systemConfigMap: {},
        pageLoadJumpMethod: 0,
        TimeZone: [
          { name: "北京", image: Ge },
          { name: "西雅图", image: Ke },
          { name: "东京", image: ze },
          { name: "伦敦", image: He },
          { name: "巴黎", image: qe },
          { name: "曼谷", image: Qe },
          { name: "雅加达", image: We },
        ],
      };
    },
    computed: {
      checkAll() {
        return this.checkIp && this.checkUa;
      },
      displayCheckResult() {
        return this.checkAll ? this.$t("check.content.wieh_login") : this.checkResult;
      },
      resultClass() {
        let e = "default__style";
        const t = this.displayCheckResult;
        return (
          t === this.$t("check.content.the_test_failed") ||
          t === this.$t("check.content.the_test_failed_ipv6")
            ? (e = "redHeader__style")
            : t === this.$t("check.content.detecting")
              ? (e = "default__style")
              : t === this.$t("check.content.wieh_login") && (e = "blueHeader__style"),
          e
        );
      },
      showOpenMethodSettingButton() {
        const e = this.initJson?.appVersion || "1.0.0";
        return X.compareVersion(e, "5.2.9") > 0;
      },
      isClientPingMethodSupported() {
        const e = this.initJson?.appVersion || "1.0.0";
        return X.compareVersion(e, "5.2.12") > 0;
      },
      hasTransferProxyPool() {
        if(this.spRelayPool)return true;
        const e = this.mall?.has_one_agent_ip_v2?.transfer_proxies;
        return Array.isArray(e) && e.length > 0;
      },
      hasCommonParams() {
        const e = this.initJson?.commonParams;
        return !!e && typeof e == "object" && !Array.isArray(e) && Object.keys(e).length > 0;
      },
      lastSelectedTransferProxyAddress() {
        const e = this.transferProxies[this.currentTransferProxyIndex];
        return e ? `${e.ip || "-"}:${e.port || "-"}` : "-";
      },
      getTransitTestingLineName() {
        const e = this.testingTransitIndex;
        if (e < 0) return "";
        const t = this.transferProxies[e];
        return this.getTransitLineDisplayName(t, e);
      },
      lineTestingStatusText() {
        let e = this.$t("check.transit.not_tested");
        if (
          (this.lineTestingStatus === "testing"
            ? (e = this.$t("check.transit.testing"))
            : this.lineTestingStatus === "success"
              ? (e = this.$t("popup.success"))
              : this.lineTestingStatus === "fail" && (e = this.$t("popup.fail")),
          this.lineTestingStatus === "testing")
        ) {
          const t = this.getTransitTestingLineName;
          return t
            ? this.$t("check.transit.current_testing_line", { lineName: t, status: e })
            : this.$t("check.transit.current_testing_status", { status: e });
        }
        return this.lineTestingMessage
          ? String(this.lineTestingMessage).includes(String(e))
            ? this.lineTestingMessage
            : this.lineTestingStatus === "success" || this.lineTestingStatus === "fail"
              ? `${this.lineTestingMessage}（${e}）`
              : this.lineTestingMessage
          : this.lineTestingStatus === "success"
            ? this.$t("check.transit.current_testing_status", { status: e })
            : this.lineTestingStatus === "fail"
              ? this.$t("check.transit.current_testing_status", { status: e })
              : this.$t("check.transit.not_tested");
      },
    },
    watch: {
      checkIp() {
        if (this.initJson?.desktopProtocol && (this.spCheckSetupPending || this.loadIp || (!this.spIpChecked && !this.checkIp))) return;
        this.checkIp && this.checkUa
          ? (this.openPinnedPage(), (this.checkResult = this.$t("check.content.wieh_login")))
          : (this.checkResult = this.$t("check.content.the_test_failed"));
      },
      checkIpEnd(e) {
        if (e) {
          if (this.isTransitLatencyTesting) {
            _.info("[check.vue] checkIpEnd skipped while transit latency testing");
            return;
          }
          if (
            (console.log("检测ip,ua", this.checkIp, this.checkUa, this.checkAll),
            this.checkIp && this.checkUa)
          )
            (console.log("检测完成------"),
              (this.checkResult = this.$t("check.content.wieh_login")),
              this.reportSelectedTransferOnSuccess(),
              chrome.runtime.sendMessage({ type: S.event_type.report_opened_tab_urls }),
              this.shouldOpenMallAfterCheck() && this.openMall());
          else {
            if (this.trySwitchTransferProxy()) return;
            (console.log("检测失败，重试次数：", this.maxRetryTimes),
              this.maxRetryTimes > this.maxRetryNum
                ? ((this.checkResult = this.ipv6
                    ? this.$t("check.content.the_test_failed_ipv6")
                    : this.$t("check.content.the_test_failed")),
                  console.log("还是失败了---"))
                : (console.log("即将重试..."),
                  (this.checkResult = this.$t("check.content.detecting")),
                  (this.loadIp = !0),
                  console.log("开始重新设置代理：" + (this.maxRetryTimes + 1)),
                  (this.checkIpEnd = !1),
                  this.maxRetryTimes++,
                  setTimeout(() => {
                    this.startProxy();
                  }, 1e3 * this.maxRetryNum)));
          }
        }
      },
    },
    async mounted() {
      (this.initClientLogger(),
        this._tzTimer && clearInterval(this._tzTimer),
        (this._tzTimer = setInterval(() => {
          this.nowTs = Date.now();
        }, 1e3)),
        await this.loadSystemConfigs(),
        this.initPageData(),
        await this.getInitData(),
        this.initJson?.appVersion === "5.2.16" &&
          setTimeout(() => {
            this.closeAllMultiOpen();
          }, 800),
        this.initMessageWithServiceWorker(),
        this.getMallInfo(),
        this.initADS(),
        this.getCurrency());
      this._relayTimer=setInterval(()=>{void this.refreshRelayState();},5000);
    },
    beforeUnmount() {
      this._relayTimer&&clearInterval(this._relayTimer);
      (this._tzTimer && clearInterval(this._tzTimer), (this._tzTimer = null));
    },
    methods: {
      applyRelaySnapshot(snapshot) {
        if(!snapshot?.relayPool)return;
        this.spRelayPool=snapshot.relayPool;
        this.spRelayAutomatic=snapshot.automatic;
        this.spRelayStatus=snapshot.relayStatus;
        this.syncTransitCandidateIndex(snapshot.candidateIndex);
        for(const line of snapshot.candidates){
          const index=this.transferProxies.findIndex(item=>item.candidateIndex===line.candidateIndex);
          if(index<0||!line.health||this.testingTransitIndex===index)continue;
          this.updateTransitLatencyState(index,{status:line.health.available?'success':'fail',
            localToTransitMs:line.health.entryLatencyMs,transitToWebAvgMs:line.health.delay,
            transferLineTotalMs:line.health.delay,sampledAt:line.health.sampledAt});
        }
      },
      async refreshRelayState() {
        if(!this.spRelayPool||this.spRelayRefreshPending||this.isTransitLatencyTesting||this.switchingIndex!==-1)return;
        this.spRelayRefreshPending=true;
        try{
          const snapshot=await requestProxyRoutes();
          if(snapshot.snapshotId===this.spProxySnapshotId)this.applyRelaySnapshot(snapshot);
        }catch{}finally{this.spRelayRefreshPending=false;}
      },
      async setRelayAutomatic(automatic) {
        if(this.isTransitLatencyTesting||this.switchingIndex!==-1)return;
        try{this.applyRelaySnapshot(await requestProxyAutomatic(automatic,this.spProxySnapshotId));}
        catch{y.warning('线路正在检测或切换，请稍后重试');}
      },
      relayStateText() {
        const status={initializing:'正在选择线路',healthy:'线路正常',degraded:'正在确认线路状态',unavailable:'当前没有可用备用线路',monitoring:'运行期间持续检测',locked:'已锁定当前线路'};
        return `${this.spRelayPool?.name||'平台中继池'} · ${this.spRelayAutomatic?'自动故障切换':'手动锁定'} · ${status[this.spRelayStatus]||''}`;
      },
      relaySampleText(index) {
        const sample=this.getTransitLatencyState(index),time=sample.sampledAt?new Date(sample.sampledAt).toLocaleTimeString():'尚未检测';
        return `入口 TCP ${this.formatLatency(sample.localToTransitMs)} · 网站响应 ${this.formatLatency(sample.transitToWebAvgMs)} · ${time}`;
      },
      canUseTransitPoolFlow() {
        return this.hasTransferProxyPool;
      },
      encryptLogText(e) {
        const t = String(e ?? "");
        if (!t) return "";
        try {
          return Te(t);
        } catch (s) {
          return (_.warn("[check.vue] encryptLogText failed", s), "encrypt_failed");
        }
      },
      initClientLogger() {
        oe ||
          ((N = we({
            getContext: () => ({
              browserId: this.initJson?.browserId || ee?.browserId,
              mallId: this.mallId || this.mall?.mall_id,
            }),
          })),
          (oe = !0),
          _.info("【check.vue】client logger initialized"));
      },
      getTransitLatencyState(e) {
        const t = this.transitLatencyMap[String(e)];
        return (
          t || {
            status: "idle",
            localToTransitMs: null,
            transferLineTotalMs: null,
            transferLineError: "",
            transitToWebSamples: [],
            transitToWebAvgMs: null,
            error: "",
            updatedAt: 0,
          }
        );
      },
      updateTransitLatencyState(e, t) {
        const s = String(e),
          i = this.getTransitLatencyState(e);
        this.transitLatencyMap[s] = { ...i, ...t, updatedAt: Date.now() };
      },
      resetTransitLatencyStates() {
        ((this.transitLatencyMap = {}),
          (this.isTransitLatencyTesting = !1),
          (this.isBatchTransitTesting = !1),
          (this.testingTransitIndex = -1),
          (this.lineTestingStatus = "idle"),
          (this.lineTestingMessage = ""));
      },
      buildTransitProxyList() {
        const e = this.mall?.has_one_agent_ip_v2 || {},
          t = Array.isArray(e?.transfer_proxies) ? e.transfer_proxies : [],
          s = [],
          i = new Set(),
          a = (r, u = {}, V = !1) => {
            const C = {
                ...r,
                ip: r?.ip || "",
                port: r?.port,
                proxy_type: r?.proxy_type ?? u?.proxy_type ?? "",
                username: r?.username ?? u?.username ?? "",
                password: r?.password ?? u?.password ?? "",
                password_k: r?.password_k ?? u?.password_k ?? "",
                password_key: r?.password_key ?? u?.password_key ?? "",
                encryption: r?.encryption ?? u?.encryption ?? "",
                protocol: r?.protocol ?? u?.protocol ?? "",
                protocol_parameter: r?.protocol_parameter ?? u?.protocol_parameter ?? "",
                confuse: r?.confuse ?? u?.confuse ?? "",
                confuse_parameter: r?.confuse_parameter ?? u?.confuse_parameter ?? "",
                protocol_family:
                  r?.protocol_family ??
                  r?.protocolType ??
                  u?.protocol_family ??
                  u?.protocolType ??
                  1,
                area_name: r?.area_name ?? u?.area_name ?? "",
                type_name: r?.type_name ?? u?.type_name ?? "",
                ip_area: r?.ip_area || u?.ip_area || u?.area_name || "",
                map_ip: r?.map_ip ?? u?.map_ip ?? "",
                map_port: r?.map_port ?? u?.map_port ?? "",
                is_transit: r?.is_transit === void 0 ? (u?.is_transit ?? -1) : r?.is_transit,
                transit_info: r?.transit_info ?? u?.transit_info ?? "",
                uuid: r?.uuid ?? u?.uuid ?? "",
                flow: r?.flow ?? u?.flow ?? "",
                server_name: r?.server_name ?? u?.server_name ?? "",
                public_key: r?.public_key ?? u?.public_key ?? "",
                short_id: r?.short_id ?? u?.short_id ?? "",
                network: r?.network ?? u?.network ?? "",
                security: r?.security ?? u?.security ?? "",
                fingerprint: r?.fingerprint ?? u?.fingerprint ?? "",
                isCurrentMainTransit: V ? 1 : 0,
              },
              I = String(C.ip || "").trim(),
              B = C.port,
              O = B == null ? "" : String(B).trim();
            if (!I) return;
            const R = Number.isInteger(C.candidateIndex) ? `candidate:${C.candidateIndex}` : `${I}:${O}`;
            i.has(R) || (i.add(R), s.push(C));
          };
        (!!e?.ip && a(e, {}, !0),
          t.forEach((r) => {
            a(r, e, !1);
          }));
        let l = s;
        return (
          this.hasCommonParams ||
            (l = s.filter((r) => {
              const u = String(r?.proxy_type || r?.proxyType || "").toLowerCase();
              return !u.includes("vless") && !u.includes("https");
            })),
          { list: l, hasCurrentMainProxy: l.some((r) => r?.isCurrentMainTransit === 1) }
        );
      },
      isCurrentMainTransitLine(e, t) {
        return e?.isCurrentMainTransit === 1
          ? !0
          : !!(t === 0 && this.mall?.has_one_agent_ip_v2?.ip);
      },
      formatLatency(e) {
        if (e == null || e === "") return "--";
        const t = Number(e);
        return !Number.isFinite(t) || t < 0 ? "--" : `${Math.round(t)}ms`;
      },
      getTransitMetricValue(e, t) {
        const s = this.getTransitLatencyState(e);
        return t === "local"
          ? s.localToTransitMs
          : t === "line"
            ? s.transferLineTotalMs
            : s.transitToWebAvgMs;
      },
      getTransitMetricDisplay(e, t) {
        const s = this.getTransitMetricValue(e, t);
        return this.formatLatency(s);
      },
      getTransitLineError(e) {
        const t = this.getTransitLatencyState(e);
        return String(t?.transferLineError || "");
      },
      getTransitMetricLevel(e, t) {
        const s = this.getTransitLatencyState(e);
        if (s.status !== "success" || (t === "line" && s.transferLineError)) return "gray";
        const value = this.getTransitMetricValue(e, t);
        if (value == null || value === "") return "gray";
        const i = Number(value);
        if (!Number.isFinite(i) || i < 0) return "gray";
        let a = 120,
          d = 260;
        return (
          (t === "transit" || t === "line") && ((a = 700), (d = 1400)),
          i <= a ? "green" : i <= d ? "yellow" : "red"
        );
      },
      getTransitLatencySummary(e) {
        const t = this.getTransitLatencyState(e);
        return t.status === "testing"
          ? this.$t("check.transit.testing")
          : t.status === "fail"
            ? t.error || this.$t("check.transit.test_failed")
            : t.status !== "success"
              ? this.$t("check.transit.not_tested")
              : this.isClientPingMethodSupported
                ? `L ${this.formatLatency(t.localToTransitMs)} | T ${this.formatLatency(t.transitToWebAvgMs)}`
                : `T ${this.formatLatency(t.transitToWebAvgMs)}`;
      },
      getTransitLatencyClass(e) {
        const t = this.getTransitLatencyState(e).status;
        return { testing: t === "testing", success: t === "success", fail: t === "fail" };
      },
      getTransitLineDisplayName(e, t) {
        if(this.initJson?.desktopProtocol&&e?.name)return [e.poolName,e.name,e.region].filter(Boolean).join(' · ');
        if (e?.is_direct === 1) return this.$t("check.transit.direct_line");
        const s = String(e?.ip || "")
            .trim()
            .split(".")[0],
          i = s.match(/-(\d+)$/)?.[1];
        return i
          ? this.$t("check.transit.line_short_name", { n: i })
          : s || this.$t("check.transit.line_short_name", { n: t + 1 });
      },
      getBestTransitCandidateByLatency() {
        let e = -1,
          t = Number.POSITIVE_INFINITY;
        for (let i = 0; i < this.transferProxies.length; i++) {
          const a = this.getTransitLatencyState(i);
          if (a.status !== "success") continue;
          const d = Number(a.transitToWebAvgMs);
          !Number.isFinite(d) || d < 0 || (d < t && ((t = d), (e = i)));
        }
        if (e < 0) return null;
        const s = this.transferProxies[e];
        return { index: e, item: s, latency: t, lineName: this.getTransitLineDisplayName(s, e) };
      },
      async switchBestTransitAfterTestAllIfEnabled() {
        if (!this.autoSwitchBestTransitEnabled) return;
        const e = this.getBestTransitCandidateByLatency();
        if (!(!e || !e.item)) {
          if (e.index === this.currentTransferProxyIndex) {
            (_.info("[check.vue] best transit already in use after testAll", { index: e.index }),
              (this.lineTestingStatus = "success"),
              (this.lineTestingMessage = this.$t("check.transit.best_line_in_use", {
                lineName: e.lineName,
              })));
            return;
          }
          try {
            if (await this.handleManualSwitchTransit(e.item, e.index) === false) return;
            ((this.lineTestingStatus = "success"),
              (this.lineTestingMessage = this.$t("check.transit.auto_switched_best", {
                lineName: e.lineName,
              })));
          } catch (t) {
            _.warn("[check.vue] auto switch to best transit failed", { index: e.index, error: t });
          }
        }
      },
      canTestTransitLatency(e) {
        return this.switchingIndex !== -1
          ? !1
          : this.isTransitLatencyTesting
            ? this.testingTransitIndex === e && !this.isBatchTransitTesting
            : !0;
      },
      normalizeTransitTargetUrl(e) {
        const t = String(e || "").trim();
        if (!t) return "";
        let s = t;
        /^https?:\/\//i.test(s) || (s = `https://${s.replace(/^\/+/, "")}`);
        try {
          return `${new URL(s).origin}/`;
        } catch (i) {
          return (
            _.warn("[check.vue] normalizeTransitTargetUrl failed", { link: t, error: i }),
            ""
          );
        }
      },
      parsePlatformNetworkSiteMap() {
        const e = this.getSystemConfig("platform_network_site");
        if (!e) return null;
        const t = e.contents ?? e;
        if (!t) return null;
        if (typeof t == "string")
          try {
            return JSON.parse(t);
          } catch (s) {
            return (_.warn("[check.vue] parse platform_network_site failed", s), null);
          }
        return typeof t == "object" ? t : null;
      },
      getSpeedtestUrlBySiteInfoId() {
        const e = Number(this.mall?.site_info_id);
        if (!Number.isFinite(e) || e <= 0) return "";
        const t = this.parsePlatformNetworkSiteMap();
        if (!t || typeof t != "object") return "";
        const s = t[String(e)] || Object.values(t).find((i) => Number(i?.id) === e);
        return String(s?.speedtestUrl || "").trim();
      },
      getTransitLatencyTargetUrl() {
        const e = this.getSpeedtestUrlBySiteInfoId(),
          t = this.normalizeTransitTargetUrl(e);
        if (t) return t;
        const s = this.mall?.has_one_platform?.link;
        return this.normalizeTransitTargetUrl(s);
      },
      extractPingLatency(e) {
        const s = e?.parsedMessage?.returnObj?.[0]?.latency;
        if (s == null || s === "") return null;
        const i = Number(s);
        return Number.isFinite(i) ? i : null;
      },
      async measureLocalToTransit(e) {
        if (!this.isClientPingMethodSupported) return null;
        if ((N || this.initClientLogger(), !N)) throw new Error("ipc_unavailable");
        const t = { currentTransferProxies: [this.initJson?.desktopProtocol ? {candidateIndex:e.candidateIndex} : e],
            ...(this.initJson?.desktopProtocol ? {snapshotId:this.spProxySnapshotId} : {}) },
          s = await N.sendAction(S.event_type.ping, t, { is_reply: 1, timeoutMs: 15e3 }),
          i = this.extractPingLatency(s);
        if (
          (console.info(
            "[check.vue] measureLocalToTransit reply",
            s?.parsedMessage ?? s?.decryptedMessage,
          ),
          i === null)
        )
          throw new Error("ping_failed");
        return i;
      },
      async closeAllMultiOpen() {
        if ((N || this.initClientLogger(), !N)) {
          y.error("ipc_unavailable");
          return;
        }
        try {
          (await N.sendAction(S.event_type.close_all_multi_open, {}),
            _.info("[check.vue] closeAllMultiOpen sent"));
        } catch (e) {
          (_.warn("[check.vue] closeAllMultiOpen failed", e), y.error("closeAllMultiOpen failed"));
        }
      },
      async waitForInitProxyComplete(e = 15e3) {
        return new Promise((t, s) => {
          let i = !1,
            a = null;
          const d = (r, u, V) => {
              r?.type === S.event_type.init_proxy_complete && (l(), t());
            },
            l = () => {
              i || ((i = !0), a && clearTimeout(a), chrome.runtime.onMessage.removeListener(d));
            };
          ((a = setTimeout(() => {
            (l(), s(new Error("switch_timeout")));
          }, e)),
            chrome.runtime.onMessage.addListener(d));
        });
      },
      async switchTransitAndWaitReady(e) {
        if (this.initJson?.desktopProtocol) {
          if (!await this.swithTransit(e)) throw new Error('switch_failed');
          return;
        }
        const t = this.waitForInitProxyComplete(15e3);
        (this.swithTransit(e), await t);
      },
      async fetchLatencyOnce(e, t = 1e4) {
        const s = new AbortController(),
          i = setTimeout(() => s.abort(), t),
          a = `_latency_ts=${Date.now()}_${Math.random().toString(16).slice(2)}`,
          d = `${e}${e.includes("?") ? "&" : "?"}${a}`,
          l = performance.now();
        try {
          await fetch(d, {
            method: "GET",
            cache: "no-store",
            mode: "no-cors",
            credentials: "omit",
            signal: s.signal,
          });
        } catch (r) {
          throw r?.name === "AbortError" ? new Error("fetch_timeout") : new Error("fetch_failed");
        } finally {
          clearTimeout(i);
        }
        return Math.round(performance.now() - l);
      },
      async measureTransitToWebAvg(e) {
        const t = [];
        let s = 0,
          i = null;
        for (let d = 0; d < ae; d++)
          try {
            const l = await this.fetchLatencyOnce(e, 12e3);
            t.push(l);
          } catch (l) {
            (s++, (i = l));
          }
        if (s >= ae) throw i || new Error("fetch_failed");
        const a = t.reduce((d, l) => d + l, 0);
        return { samples: t, average: Math.round(a / t.length) };
      },
      async measureTransferLineTotalLatency(e, t) {
        if (this.initJson?.desktopProtocol) return requestTransferSpeed(e.candidateIndex, this.spProxySnapshotId);
        const s = {
          type: String(e?.proxy_type || ""),
          info: {
            address: String(e?.ip || ""),
            port: Number(e?.port || 0),
            password: String(e?.password || ""),
            method: String(e?.encryption || ""),
          },
          target_url: t,
          timeout_ms: Xe,
        };
        let i = null;
        try {
          i = await E.transferSpeed(s);
        } catch (d) {
          throw (
            _.warn("[check.vue] transferSpeed request failed", d),
            new Error("transfer_speed_failed")
          );
        }
        if ((_.info("[check.vue] transferSpeed result", i), !i || Number(i.errorCode) !== 0))
          throw new Error("transfer_speed_failed");
        if (i?.data?.available === !1) throw new Error("transfer_speed_unavailable");
        const a = Number(i?.data?.delay);
        if (!Number.isFinite(a) || a < 0) throw new Error("transfer_speed_total_missing");
        return Math.round(a);
      },
      toTransitLatencyErrorMessage(e) {
        const t = String(e?.message || "");
        return t.includes("ping_failed")
          ? this.$t("check.transit.ping_failed")
          : t.includes("switch_timeout")
            ? this.$t("check.transit.switch_timeout")
            : t.includes("fetch_timeout")
              ? this.$t("check.transit.fetch_timeout")
              : t.includes("transfer_speed_failed")
                ? this.$t("check.transit.line_latency_failed")
                : t.includes("transfer_speed_total_missing")
                  ? this.$t("check.transit.line_latency_no_total")
                  : t.includes("transfer_speed_unavailable")
                    ? this.$t("check.transit.line_latency_unavailable")
                    : t.includes("ipc_unavailable")
                      ? this.$t("check.content.not_connected")
                      : this.$t("check.transit.test_failed");
      },
      async getTransitSelectionSnapshot() {
        if (this.initJson?.desktopProtocol) {
          const current = await requestProxyRoutes();
          if (current.snapshotId !== this.spProxySnapshotId) throw new Error('线路配置已变化，请刷新检测页');
          this.syncTransitCandidateIndex(current.candidateIndex);
        }
        return {
          currentTransferProxyIndex: this.currentTransferProxyIndex,
          nextTransferProxyIndex: this.nextTransferProxyIndex,
        };
      },
      async restoreTransitSelectionAfterTest(e) {
        if(this.initJson?.desktopProtocol)return;
        if (!this.initJson?.desktopProtocol) this.currentTransferProxyIndex = e.currentTransferProxyIndex;
        this.nextTransferProxyIndex = e.nextTransferProxyIndex;
        try {
          const t = e.currentTransferProxyIndex;
          if (t >= 0 && this.transferProxies[t]) {
            (await this.switchTransitAndWaitReady(this.transferProxies[t]),
              _.info("[check.vue] transit selection restored to previous transit proxy", {
                restoreIndex: t,
              }));
            return;
          }
          const s = this.waitForInitProxyComplete(15e3);
          (this.startProxy(),
            await s,
            _.info("[check.vue] transit selection restored to main proxy"));
        } catch (t) {
          _.warn("[check.vue] failed to restore proxy after transit latency test", t);
        }
      },
      async runTransitLatencyTest(e, t) {
        ((this.testingTransitIndex = t),
          (this.lineTestingStatus = "testing"),
          (this.lineTestingMessage = this.$t("check.transit.testing")),
          this.updateTransitLatencyState(t, {
            status: "testing",
            error: "",
            localToTransitMs: null,
            transferLineTotalMs: null,
            transferLineError: "",
            transitToWebSamples: [],
            transitToWebAvgMs: null,
          }));
        try {
          if(this.initJson?.desktopProtocol){
            const sample=await requestTransferDetails(e.candidateIndex,this.spProxySnapshotId);
            this.updateTransitLatencyState(t,{status:'success',localToTransitMs:sample.entryLatencyMs,
              transitToWebSamples:[sample.delay],transitToWebAvgMs:sample.delay,transferLineTotalMs:sample.delay,sampledAt:sample.sampledAt,error:''});
            this.lineTestingStatus='success';this.lineTestingMessage='';
            return true;
          }
          const s = await this.measureLocalToTransit(e);
          (this.updateTransitLatencyState(t, { localToTransitMs: s }),
            await this.switchTransitAndWaitReady(e));
          const i = this.getTransitLatencyTargetUrl();
          if (!i) throw new Error("target_url_invalid");
          const { samples: a, average: d } = await this.measureTransitToWebAvg(i);
          this.updateTransitLatencyState(t, { transitToWebSamples: a, transitToWebAvgMs: d });
          let l = null,
            r = "";
          try {
            l = await this.measureTransferLineTotalLatency(e, i);
          } catch (u) {
            ((r = this.toTransitLatencyErrorMessage(u)),
              _.warn("[check.vue] transferSpeed failed, ignore and continue", {
                index: t,
                error: u,
                transferLineError: r,
              }));
          }
          return (
            this.updateTransitLatencyState(t, {
              status: "success",
              transferLineTotalMs: l,
              transferLineError: r,
              error: "",
            }),
            (this.lineTestingStatus = "success"),
            (this.lineTestingMessage = ""),
            _.info("[check.vue] transit latency test success", {
              index: t,
              localToTransitMs: s,
              transitToWebSamples: a,
              transitToWebAvgMs: d,
              transferLineTotalMs: l,
            }),
            !0
          );
        } catch (s) {
          const i = this.toTransitLatencyErrorMessage(s);
          return (
            this.updateTransitLatencyState(t, { status: "fail", error: i }),
            (this.lineTestingStatus = "fail"),
            (this.lineTestingMessage = i),
            _.warn("[check.vue] transit latency test fail", { index: t, error: s }),
            !1
          );
        } finally {
          this.testingTransitIndex = -1;
        }
      },
      async sendTransferProxiesTest() {
        const e = this.transferProxies[this.currentTransferProxyIndex] || this.transferProxies[0];
        if (!e) {
          y.warning(this.$t("check.transit.no_line"));
          return;
        }
        try {
          const t = await this.measureLocalToTransit(e);
          y.success(`transferProxies ping latency: ${this.formatLatency(t)}`);
        } catch (t) {
          (_.warn("【check.vue】send transferProxies test reply timeout/error", t),
            y.error(this.toTransitLatencyErrorMessage(t)));
        }
      },
      async handleTestSingleTransit(e, t) {
        if (this.isTransitLatencyTesting || this.switchingIndex !== -1) return;
        const s = await this.getTransitSelectionSnapshot();
        ((this.isTransitLatencyTesting = !0), (this.isBatchTransitTesting = !1));
        try {
          await this.runTransitLatencyTest(e, t);
        } finally {
          (await this.restoreTransitSelectionAfterTest(s), (this.isTransitLatencyTesting = !1));
        }
      },
      async testAllTransitLines() {
        if (this.isTransitLatencyTesting || this.switchingIndex !== -1) return;
        if (!this.transferProxies.length) {
          y.warning(this.$t("check.transit.no_line"));
          return;
        }
        const e = await this.getTransitSelectionSnapshot();
        ((this.isTransitLatencyTesting = !0),
          (this.isBatchTransitTesting = !0),
          (this.lineTestingStatus = "testing"),
          (this.lineTestingMessage = this.$t("check.transit.testing")));
        let t = 0;
        try {
          for (let s = 0; s < this.transferProxies.length; s++)
            (await this.runTransitLatencyTest(this.transferProxies[s], s)) && t++;
          t > 0
            ? ((this.lineTestingStatus = "success"),
              (this.lineTestingMessage = `${this.$t("check.transit.batch_done")}: ${t}/${this.transferProxies.length}`))
            : ((this.lineTestingStatus = "fail"),
              (this.lineTestingMessage = this.$t("check.transit.test_failed")));
        } finally {
          (await this.restoreTransitSelectionAfterTest(e),
            (this.testingTransitIndex = -1),
            (this.isTransitLatencyTesting = !1),
            (this.isBatchTransitTesting = !1));
        }
        if(!this.initJson?.desktopProtocol&&t>0)await this.switchBestTransitAfterTestAllIfEnabled();
      },
      async handleManualSwitchTransit(e, t) {
        if (this.switchingIndex !== -1 || this.isTransitLatencyTesting) return false;
        ((this.switchingIndex = t),
          !this.initJson?.desktopProtocol && (this.currentTransferProxyIndex = t),
          (this.nextTransferProxyIndex = t + 1),
          (this.checkResult = this.$t("check.content.detecting")),
          (this.loadIp = !0),
          (this.checkIpEnd = !1),
          (this.checkIp = !1),
          _.info(
            `[check.vue] Manually switching to transit proxy #${t + 1}: ${this.encryptLogText(e.ip)}:${e.port}`,
          ),
          (this.hasPendingTransferReport = !0));
        if (this.initJson?.desktopProtocol) this.spTriedCandidateIndexes = [];
        return await this.swithTransit(e);
      },
      async reportSelectedTransferOnSuccess() {
        if (
          !this.canUseTransitPoolFlow() ||
          !this.hasPendingTransferReport ||
          this.currentTransferProxyIndex < 0
        )
          return;
        const e = this.transferProxies[this.currentTransferProxyIndex];
        if (!e) return;
        if (!this.hasCommonParams) {
          const a = String(e?.proxy_type || e?.proxyType || "").toLowerCase(),
            d = String(
              this.mall?.has_one_agent_ip_v2?.proxy_type ||
                this.mall?.has_one_agent_ip_v2?.proxyType ||
                "",
            ).toLowerCase();
          if (a.includes("vless") || d.includes("vless")) {
            ((this.hasPendingTransferReport = !1),
              _.info("【check.vue】skip updateMain on old client because current line is vless", {
                currentProxyType: a,
                mainProxyType: d,
              }));
            return;
          }
        }
        const t = Number.isInteger(e.candidateIndex) ? `candidate:${e.candidateIndex}` : `${e.ip || ""}:${e.port || ""}`;
        if (t && t === this.lastReportedTransferProxyKey) {
          this.hasPendingTransferReport = !1;
          return;
        }
        const s = {
            ip: this?.mall?.has_one_agent_ip?.map_ip || this?.mall?.has_one_agent_ip.map_ip || "",
            transfer_name: e?.ip || "",
            port: e?.port || "",
            mall_id: this.initJson?.desktopProtocol ? String(this.mallId) : Number(this.mallId),
            ...(Number.isInteger(e.candidateIndex) ? {candidateIndex:e.candidateIndex} : {}),
            ...(this.initJson?.desktopProtocol ? {snapshotId:this.spProxySnapshotId} : {}),
          },
          i = this.mall?.ip_local_region;
        i != null && (s.ip_local_region = i);
        try {
          const a = await E.updateMainTransfer(s);
          (_.info(
            "【check.vue】updateMain result",
            a,
            `current updateMain Link ：${this.encryptLogText(s.transfer_name)}`,
          ),
            a &&
              a.errorCode === 0 &&
              t &&
              ((this.lastReportedTransferProxyKey = t), (this.hasPendingTransferReport = !1)));
        } catch (a) {
          _.error("【check.vue】updateMain error", a, s);
        }
      },
      trySwitchTransferProxy() {
        // Managed pool selection belongs to the desktop controller. A page
        // watcher must not race it or silently turn an automatic route into a lock.
        if(this.spRelayPool){this.loadIp=false;this.switchingIndex=-1;return true;}
        if (!this.canUseTransitPoolFlow()) return !1;
        if (this.isTransitLatencyTesting) return !0;
        if (this.initJson?.desktopProtocol) {
          const next = this.transferProxies.findIndex(line => !this.spTriedCandidateIndexes.includes(line.candidateIndex));
          this.nextTransferProxyIndex = next < 0 ? this.transferProxies.length : next;
        }
        const e = this.transferProxies[this.nextTransferProxyIndex];
        return e
          ? ((this.checkResult = this.$t("check.content.detecting")),
            (this.loadIp = !0),
            (this.checkIpEnd = !1),
            this.initJson?.desktopProtocol
              ? (this.switchingIndex = this.nextTransferProxyIndex)
              : (this.currentTransferProxyIndex = this.nextTransferProxyIndex),
            this.nextTransferProxyIndex++,
            this.transferProxySwitchCount++,
            _.info(
              `Switching transit proxy for check attempt #${this.transferProxySwitchCount}`,
              e.ip,
            ),
            (this.hasPendingTransferReport = !0),
            this.swithTransit(e, {autoAdvance:true}),
            !0)
          : this.transferProxies.length > 0
            ? ((this.checkResult = this.ipv6
                ? this.$t("check.content.the_test_failed_ipv6")
                : this.$t("check.content.the_test_failed")),
              this.initJson?.desktopProtocol &&
                ((this.loadIp = !1), (this.checkIp = !1), (this.switchingIndex = -1),
                  (this.hasPendingTransferReport = !1),
                  this.spNetwork && (this.spNetwork.message = this.checkResult)),
              _.error("Transit list polling ended, still not passed detection"),
              !0)
            : !1;
      },
      normalizeJumpMethod(e) {
        const t = Number(e);
        return t === 0 || t === 1 || t === 2 || t === 3 || t === 4 ? t : null;
      },
      getJumpMethodCacheKey() {
        return this.mallId ? `zf_mall_jump_method_${this.mallId}` : "";
      },
      getCachedJumpMethod() {
        const e = this.getJumpMethodCacheKey();
        if (!e) return null;
        const t = sessionStorage.getItem(e);
        return t === null || t === "" ? null : this.normalizeJumpMethod(t);
      },
      setJumpMethodCache(e) {
        const t = this.getJumpMethodCacheKey();
        t && sessionStorage.setItem(t, String(e));
      },
      getMallJumpMethod() {
        return this.localJumpMethod !== null
          ? this.localJumpMethod
          : this.normalizeJumpMethod(this.mall?.jump_method);
      },
      cloneJumpPages(e) {
        return F(e).map((t) => ({ sort: t.sort, link: t.link }));
      },
      resolveJumpMethod() {
        const e = this.getMallJumpMethod();
        if (e !== null) return e;
        const t = this.getCachedJumpMethod();
        return t !== null ? t : 0;
      },
      resolveDialogJumpMethod() {
        const e = this.getCachedJumpMethod();
        if (e !== null) return e;
        const t = this.getMallJumpMethod();
        return t !== null ? t : 0;
      },
      getShouldAutoOpenMall() {
        const e = this.initJson?.appVersion || "1.0.0";
        return X.compareVersion(e, "5.2.9") > 0
          ? this.initJson?.privateMode?.autoOpenMallHome === 1
          : !0;
      },
      shouldOpenMallAfterCheck() {
        if (!this.showOpenMethodSettingButton) return this.getShouldAutoOpenMall();
        const e = this.pageLoadJumpMethod;
        return e === 1 || e === 3 || e === 4 ? !0 : e === 2 ? !1 : this.getShouldAutoOpenMall();
      },
      syncPageLoadJumpMethod() {
        const e = this.getMallJumpMethod();
        if (((this.pageLoadJumpPages = this.cloneJumpPages(ie(this.mall))), e !== null)) {
          (this.setJumpMethodCache(e), (this.pageLoadJumpMethod = e));
          return;
        }
        this.pageLoadJumpMethod = this.resolveJumpMethod();
      },
      openOpenMethodDialog() {
        const e = this.resolveDialogJumpMethod();
        (e === 1 || e === 2 || e === 3 || e === 4
          ? (this.openMethodFormValue = e)
          : (this.openMethodFormValue = this.getShouldAutoOpenMall() ? 1 : 2),
          (this.jumpPagesDraft = this.cloneJumpPages(ie(this.mall))),
          (this.showOpenMethodDialog = !0));
      },
      applySavedJumpPagesToMall(e, t) {
        const s = { ...this.mall, jump_urls: e, jumpUrls: e, jump_pages: e, jumpPages: e };
        (t !== void 0 && (s.jump_method = t), (this.mall = s));
      },
      onJumpPagesSaved(e) {
        this.applySavedJumpPagesToMall(e);
      },
      async saveOpenMethodSetting() {
        const e = this.openMethodFormValue,
          t = this.cloneJumpPages(this.jumpPagesDraft);
        if (e === 3 && t.length === 0) {
          y.warning(this.$t("check.content.open_method_need_one"));
          return;
        }
        this.saveOpenMethodLoading = !0;
        try {
          if (e === 4) {
            (await chrome.storage.local.set({ [Y(String(this.mallId))]: 4 }),
              (this.localJumpMethod = 4),
              this.setJumpMethodCache(4),
              (this.showOpenMethodDialog = !1),
              y.success(this.$t("check.content.open_method_save_success")));
            return;
          }
          if (
            (await E.saveMallJumpMethod({ id: Number(this.mallId), isAll: 0, jumpMethod: e }))
              ?.errorCode === 0
          ) {
            (await chrome.storage.local.remove(Y(String(this.mallId))),
              (this.localJumpMethod = null),
              this.setJumpMethodCache(e),
              this.applySavedJumpPagesToMall(t, e),
              (this.showOpenMethodDialog = !1),
              y.success(this.$t("check.content.open_method_save_success")));
            return;
          }
          (await chrome.storage.local.set({ [Y(String(this.mallId))]: e }),
            (this.localJumpMethod = e),
            this.setJumpMethodCache(e),
            this.applySavedJumpPagesToMall(t, e),
            y.error(this.$t("check.content.open_method_save_failed")));
        } catch {
          try {
            (await chrome.storage.local.set({ [Y(String(this.mallId))]: e }),
              (this.localJumpMethod = e),
              this.setJumpMethodCache(e),
              this.applySavedJumpPagesToMall(t, e),
              y.error(this.$t("check.content.open_method_save_failed")));
          } catch (i) {
            (_.error("save local open method failed", i),
              y.error(this.$t("check.content.open_method_local_save_failed")));
          }
        } finally {
          this.saveOpenMethodLoading = !1;
        }
      },
      getOpenMallUrls() {
        if (this.pageLoadJumpMethod === 3) {
          const t = F(this.pageLoadJumpPages);
          if (t.length > 0) return t.map((s) => s.link);
        }
        const e = this.getOpenMallUrl();
        return e ? [e] : [];
      },
      formatTimeForZone(e) {
        const t = (d) => String(d).padStart(2, "0"),
          s = (d) =>
            `${t(d.getMonth() + 1)}月${t(d.getDate())}日 ${t(d.getHours())}:${t(d.getMinutes())}:${t(d.getSeconds())}`,
          a = {
            西雅图: "America/Los_Angeles",
            东京: "Asia/Tokyo",
            伦敦: "Europe/London",
            巴黎: "Europe/Paris",
            曼谷: "Asia/Bangkok",
            雅加达: "Asia/Jakarta",
            北京: "Asia/Shanghai",
          }[e?.name];
        if (!a) return s(new Date(this.nowTs));
        try {
          const d = new Intl.DateTimeFormat("zh-CN", {
              timeZone: a,
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
              hour12: !1,
            }).formatToParts(new Date(this.nowTs)),
            l = (r) => d.find((u) => u.type === r)?.value || "00";
          return `${l("month")}-${l("day")} ${l("hour")}:${l("minute")}:${l("second")}`;
        } catch {
          return s(new Date(this.nowTs));
        }
      },
      async loadSystemConfigs() {
        const e = [
          "ipCheckList",
          "dynamicIpCheckList",
          "platform_network_site",
          "open_mall_link_by_uid_site",
        ].join(",");
        try {
          const t = await E.getInfoByKeys({ keys: e });
          if (t?.errorCode === 0 && Array.isArray(t.data)) {
            const s = {};
            (t.data.forEach((i) => {
              i?.key && (s[i.key] = i.value);
            }),
              (this.systemConfigMap = s));
          }
        } catch (t) {
          console.log("loadSystemConfigs error", t);
        }
      },
      getSystemConfig(e) {
        return this.systemConfigMap[e];
      },
      parseOpenMallLinkByUidSiteMap() {
        const e = this.getSystemConfig("open_mall_link_by_uid_site");
        if (!e) return null;
        const t = e.contents ?? e;
        if (!t) return null;
        if (typeof t == "string")
          try {
            return JSON.parse(t);
          } catch (s) {
            return (_.warn("[check.vue] parse open_mall_link_by_uid_site failed", s), null);
          }
        return typeof t == "object" ? t : null;
      },
      getOpenMallLinkByUidSite() {
        const e = this.mall?.uid,
          t = this.mall?.site_info_id;
        if (e == null || e === "" || t == null || t === "") return "";
        const s = this.parseOpenMallLinkByUidSiteMap();
        if (!s || typeof s != "object") return "";
        const i = s[String(e)] ?? s[e] ?? null;
        if (!i || typeof i != "object") return "";
        const a = i[String(t)] ?? i[t] ?? "";
        return String(a || "").trim();
      },
      getOpenMallUrl() {
        const e = this.getOpenMallLinkByUidSite();
        return e || this.mall?.has_one_platform?.link || "";
      },
      getInitData() {
        return (
          et(),
          (document.title = this.$t("check.page_title")),
          new Promise((e) => {
            chrome.runtime.sendMessage({ type: S.event_type.get_init_data }, {}, (t) => {
              if (t) {
                ((ee = this.initJson = t),
                  (se = this.initJson.isdebug || !1),
                  console.log("InitJson data：", this.initJson),
                  (this.translation_ip = t?.translation_ip ?? ""));
                const s = t?.localGeo;
                if (
                  (s &&
                    ((this.localGeo = s.country_name + " " + s.region_name + " " + s.city_name),
                    s.country_code && s.country_code != "CN" && (this.isExternalNetwork = !0)),
                  t.logoInfo)
                ) {
                  const i = t.logoInfo;
                  ((document.title = i.brand_name + this.$t("check.page_title")),
                    xe(i.main_logo || ""));
                }
              }
              e(t);
            });
          })
        );
      },
      initMessageWithServiceWorker() {
        chrome.runtime.onMessage.addListener((e, t, s) => {
          if (e.type === S.event_type.no_other_action) {
            const i = this.$t("check.content.after_inspection");
            y({ type: "warning", message: i });
          } else if (e.type === S.event_type.init_proxy_complete) {
            if (this.initJson?.desktopProtocol && (this.spCheckSetupPending || !this.spProxySnapshotId)) return true;
            if (this.initJson?.desktopProtocol && e.snapshotId && e.snapshotId !== this.spProxySnapshotId) return true;
            if (this.initJson?.desktopProtocol) this.syncTransitCandidateIndex(e.candidateIndex);
            if ((console.log("初始化代理完成", e), this.isTransitLatencyTesting))
              return (
                _.info("[check.vue] init_proxy_complete received during transit latency testing"),
                !0
              );
            const i = this.mall.check_env;
            i == "1" ? this.checkIpHandle() : i == "2" && ((this.loadIp = !1), (this.checkIp = !0),
              this.initJson?.desktopProtocol && (this.switchingIndex = -1));
          } else
            e.type === S.event_type.network_exception &&
              chrome.superbrowser.showMessageDialog(
                this.$t("check.network_exception.title"),
                this.$t("check.network_exception.content"),
                "",
                this.$t("check.network_exception.ok"),
                this.$t("check.network_exception.close"),
                !0,
                (i) => {
                  chrome.runtime.reload();
                },
              );
          return !0;
        });
      },
      initPageData() {
        const e = ye("mallId");
        if (!e) {
          y({ message: this.$t("check.content.reopen") });
          return;
        }
        this.mallId = e;
        const t = Number(localStorage.getItem("closeAdsTime")) || 0;
        this.isShowAds = new Date().getTime() - t > 0;
      },
      initADS() {
        const e = Number(localStorage.getItem("closeAdsTime")) || 0;
        this.isShowAds = new Date().getTime() - e > 0;
      },
      startProxy() {
        if (this.initJson?.desktopProtocol && !this.isTransitLatencyTesting) {
          const line = this.transferProxies[this.currentTransferProxyIndex];
          this.spTriedCandidateIndexes = line ? [line.candidateIndex] : [];
        }
        const e = {};
        ((e.type = S.event_type.set_proxy),
          (e.white_list = this.mall?.has_one_platform?.white_list || []),
          (e.black_list = this.mall?.has_one_platform?.black_list || []),
          (e.mallInfo = this.mall),
          console.log("通知后台设置代理", e),
          chrome.runtime.sendMessage(e));
      },
      syncTransitCandidateIndex(candidateIndex) {
        if (!Number.isInteger(candidateIndex) || candidateIndex < 0 || candidateIndex > 8) return;
        const index = this.transferProxies.findIndex(line => line.candidateIndex === candidateIndex);
        if (index < 0) return;
        this.currentTransferProxyIndex = index;
        this.nextTransferProxyIndex = index + 1;
      },
      swithTransit(e, options = {}) {
        if (!e) return;
        if (this.initJson?.desktopProtocol) {
          const attempt = ++this.spProxySwitchAttempt;
          if (!this.isTransitLatencyTesting) {
            if (!this.spTriedCandidateIndexes.includes(e.candidateIndex)) this.spTriedCandidateIndexes.push(e.candidateIndex);
          }
          return requestProxySwitch(e.candidateIndex, this.spProxySnapshotId).then(() => {
            if (attempt === this.spProxySwitchAttempt) this.syncTransitCandidateIndex(e.candidateIndex);
            if(this.spRelayPool){this.spRelayAutomatic=false;this.spRelayStatus='locked';}
            return true;
          }, (error) => {
            if (attempt !== this.spProxySwitchAttempt) return false;
            // A rejected desktop switch keeps its previous forwarder alive.
            this.syncTransitCandidateIndex(error?.candidateIndex);
            this.nextTransferProxyIndex = this.currentTransferProxyIndex + 1;
            if (!this.isTransitLatencyTesting) {
              this.switchingIndex = -1;
              this.loadIp = false;
              this.checkIp = false;
              this.checkResult = '线路切换失败，请重试或选择其他线路';
              if (this.spNetwork) this.spNetwork.message = this.checkResult;
              this.hasPendingTransferReport = false;
              // No ready event follows a rejection. Advance explicitly only
              // for automatic fallback; the latency loop owns its own steps.
              this.checkIpEnd = false;
              if (options.autoAdvance) this.trySwitchTransferProxy();
            }
            return false;
          });
        }
        const t = Number(e.port || 0),
          s = e.proxy_type || e.proxyType || "",
          i = {};
        ((i.type = S.event_type.swith_transit),
          (i.proxyInfo = {
            protocolType: e.protocol_family || e.protocolType || "",
            proxyOnlyId: String(e.id || e.proxyOnlyId || ""),
            ip: e.ip || "",
            port: Number.isNaN(t) ? 0 : t,
            proxyType: s,
            userName: e.username || e.userName || "",
            password: e.password || "",
            password_k: e.password_k || "",
            encryption: e.encryption || "",
            encryptKey: e.password_key || e.encryptKey || "",
            protocol: e.protocol || "",
            protocolParameter: e.protocol_parameter || e.protocolParameter || "",
            confuse: e.confuse || "",
            confuseParameter: e.confuse_parameter || e.confuseParameter || "",
            areaName: e.area_name || e.areaName || "",
            typeName: e.ip_area || e.type_name || e.typeName || "",
            mappingIp: e.map_ip || e.mappingIp || "",
            mappingPort: e.map_port || e.mappingPort || "",
            is_transit: e.is_transit === void 0 ? -1 : e.is_transit,
            transit_info: e.transit_info || e.transitInfo || "",
          }),
          String(s).toLowerCase() === "vless" &&
            (i.proxyInfo.vlessUser = {
              id: e.uuid || "",
              flow: e.flow || "",
              serverName: e.server_name || "",
              publicKey: e.public_key || "",
              shortId: e.short_id || "",
              network: e.network || "",
              security: e.security || "",
              encryption: e.encryption || "",
              fingerprint: e.fingerprint || "",
            }),
          console.log("通知后台切换中继", i),
          chrome.runtime.sendMessage(i, (a) => {
            console.log(a);
          }));
      },
      async openMall() {
        if (this.pageLoadJumpMethod === 4) {
          if (this.openingLastSession) return;
          this.openingLastSession = !0;
          try {
            const s = await chrome.tabs.getCurrent();
            let i;
            for (
              let a = 0;
              a < 60 &&
              ((i = await chrome.runtime.sendMessage({ type: ke, tabId: s?.id })), !!i?.pending);
              a++
            )
              await new Promise((d) => setTimeout(d, 500));
            if (!i?.ok) {
              (_.warn("restoreLastSessionTabs request rejected", i),
                y.warning(
                  this.$t(
                    i?.pending
                      ? "check.content.after_inspection"
                      : "check.content.open_method_restore_failed",
                  ),
                ));
              return;
            }
            if (
              (i.failed && y.warning(this.$t("check.content.open_method_restore_failed")),
              i.restored)
            ) {
              i.firstUrl && this.notifyMallOpen(i.firstUrl);
              return;
            }
            if (i.failed) return;
          } catch (s) {
            (_.error("restoreLastSessionTabs failed", s),
              y.error(this.$t("check.content.open_method_restore_failed")));
            return;
          } finally {
            this.openingLastSession = !1;
          }
        }
        const e = this.getOpenMallUrls(),
          t = e[0] || this.getOpenMallUrl();
        t &&
          (this.notifyMallOpen(t),
          chrome.tabs.query({ active: !0, lastFocusedWindow: !0 }, (s) => {
            const i = s[0].id;
            (this.createOrMoveTab(t, i),
              e.slice(1).forEach((a) => {
                window.open(a);
              }));
          }));
      },
      notifyMallOpen(e) {
        chrome.runtime.sendMessage({
          account: this.mall.mall_account,
          password: this.mall.password_key,
          mall_account_lock: this.mall.mall_account_lock || !1,
          passwordK: this.mall.password_k,
          key: this.mall.random_string,
          address: this.mall.mall_address,
          url: e,
          platformName: this.mall.has_one_platform.name,
          type: S.event_type.open_mall,
        });
      },
      createOrMoveTab(e, t) {
        window.open(e);
      },
      getEquipmentCode(e) {
        return e?.equipment_code || e?.has_one_agent_ip?.equipment_code || "" || "-";
      },
      async copyEquipmentCode() {
        const e = this.getEquipmentCode(this.mall);
        if (!(!e || e === "-"))
          try {
            if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(e);
            else {
              const t = document.createElement("textarea");
              ((t.value = e),
                (t.style.position = "fixed"),
                (t.style.left = "-9999px"),
                document.body.appendChild(t),
                t.select(),
                document.execCommand("copy"),
                document.body.removeChild(t));
            }
            y.success(this.$t("check.content.copy_equipment_code_success"));
          } catch (t) {
            (console.log("copyEquipmentCode error", t),
              y.error(this.$t("check.content.copy_equipment_code_failed")));
          }
      },
      getShowName(e) {
        let t = "-";
        return (
          (e.has_one_agent_ip && e.has_one_agent_ip.web_type) === 1
            ? (t = e.has_one_agent_ip.equipment_name)
            : (t = e.has_one_agent_ip && (e.has_one_agent_ip.map_ip || e.has_one_agent_ip.ip)),
          t
        );
      },
      getShowType(e) {
        let t = "-";
        return (
          (e.has_one_agent_ip && e.has_one_agent_ip.web_type) === 1
            ? (t = "动态宽带")
            : (t = e.has_one_agent_ip && e.has_one_agent_ip.type_name),
          t
        );
      },
      bindLocal() {
        console.log("测试", this.mall);
      },
      toAdsRecommend(e) {
        (console.log("toAdsRecommend", e), this.uploadStatistics(e), window.open(e));
      },
      uploadStatistics(e) {
        const t = {
          code: e,
          source: "helper_adsRecommend",
          mall_id: this.mallId,
          platform_id: this.mall?.has_one_platform?.platform_id,
          action: 1,
        };
        E.uploadStatistics(t).then((s) => {
          (console.log("uploadStatistics", s, t), s.data && console.log("元素统计上报成功"));
        });
      },
      setCloseAdsTime(e) {
        const t = e * 24 * 60 * 60 * 1e3 + new Date().getTime();
        (console.log("🚀 ~ setCloseAdsTime ~ closeAdsTime:", t),
          localStorage.setItem("closeAdsTime", t + ""),
          (this.isShowAds = new Date().getTime() - t > 0));
      },
      openWebsite(e) {
        window.open(e);
      },
      openPinnedPage() {
        if (this.pageLoadJumpMethod !== 4 && this.checkAll) {
          const e = { mall_id: parseInt(this.mallId) };
          E.getTagPages(e)
            .then((t) => {
              console.log("getTagPages", t);
              try {
                const s = (t.data && t.data.tab_pages) || [];
                s &&
                  s.length > 0 &&
                  s.map((i) => {
                    this.createTab(i);
                  });
              } catch (s) {
                console.log("error", s);
              }
            })
            .catch((t) => {
              console.log("err", t);
            });
        }
      },
      createTab(e) {
        chrome.tabs.query({}, (t) => {
          console.log(t);
          const s = t.findIndex((i) => i.url.indexOf(e) > -1);
          (console.log("index :" + s),
            s < 0 &&
              (_.info(`【check.vue】createTab:${e}`),
              chrome.tabs.create({ url: e, pinned: !0, active: !1 })));
        });
      },
      async getCurrency() {
        const e = await E.getCurrency();
        (console.log("getCurrency", e), e.errorCode === 0 && (this.currencyList = e.data));
      },
      async getMallInfo() {
        if (this.spCheckSetupPending) return;
        this.spCheckSetupPending = true;
        this.listLoading = !0;
        let setupStage = "details";
        if (this.initJson?.desktopProtocol) {
          this.spCheckSetupError = "";
          this.spProxySnapshotId = "";
          this.transferProxies = [];
          this.currentTransferProxyIndex = -1;
          this.nextTransferProxyIndex = 0;
          this.checkIpEnd = false;
          this.checkIp = false;
          this.checkUa = false;
          this.spIpChecked = false;
          this.spUaChecked = false;
          this.loadIp = true;
          this.loadUa = true;
          this.checkResult = this.$t("check.content.detecting");
          if (this.spNetwork) this.spNetwork.message = "";
        }
        const e = { mallId: this.mallId, ip_local_region: 1 };
        try {
          const t = this.initJson?.localGeo,
            s = t?.country_code;
          (s && (e.ip_local_region = String(s).toUpperCase() === "CN" ? 1 : 2),
            t && (e.geo_info = JSON.stringify(t)));
        } catch {
          e.ip_local_region = 1;
        }
        try {
          const t = await E.getMallInfo(e);
          if (!t || t.errorCode !== 0 || !t.data || typeof t.data !== "object" || Array.isArray(t.data))
            throw new Error("shop_details_unavailable");
          this.mall = t.data;
          (this.mall.is_check_agent === 2 && this.mall.has_one_agent_ip && (this.mall.has_one_agent_ip.ip_type = 5),
            this.mall.has_one_agent_ip &&
              this.mall.has_one_agent_ip.ip_type == 1 &&
              this.mall.has_one_agent_ip.web_type == 1 &&
              (this.mall.has_one_agent_ip.ip_type = 5));
          setupStage = "routes";
          const liveSnapshot = this.initJson?.desktopProtocol ? await requestProxyRoutes() : null;
          if (liveSnapshot) {
            this.spProxySnapshotId = liveSnapshot.snapshotId;
            // Server configuration may have been edited while this browser is
            // running. Display exactly the immutable routes it can switch to.
            this.mall.has_one_agent_ip_v2 = {...this.mall.has_one_agent_ip_v2,
              ...liveSnapshot.candidates[0], transfer_proxies:liveSnapshot.candidates.slice(1)};
          }
          const s = this.buildTransitProxyList();
          ((this.transferProxies = s.list),
            this.canUseTransitPoolFlow() && s.hasCurrentMainProxy && this.transferProxies.length > 0
              ? ((this.currentTransferProxyIndex = 0), (this.nextTransferProxyIndex = 1))
              : ((this.currentTransferProxyIndex = -1), (this.nextTransferProxyIndex = 0)),
            (this.transferProxySwitchCount = 0),
            (this.lastReportedTransferProxyKey = ""),
            (this.hasPendingTransferReport = !1),
            this.resetTransitLatencyStates());
          if (liveSnapshot && this.transferProxies.length) {
            const preferred = liveSnapshot.candidateIndex;
            const index = this.transferProxies.findIndex(line => line.candidateIndex === preferred);
            this.currentTransferProxyIndex = index < 0 ? 0 : index;
            this.nextTransferProxyIndex = this.currentTransferProxyIndex + 1;
            if(liveSnapshot.relayPool)this.applyRelaySnapshot(liveSnapshot);
          }
          setupStage = "prepare";
          try {
            const l = Y(String(this.mallId)),
              r = await chrome.storage.local.get(l);
            this.localJumpMethod = r[l] == null ? null : this.normalizeJumpMethod(r[l]);
          } catch (l) {
            _.warn("read local open method failed", l);
          }
          (this.syncPageLoadJumpMethod(),
            this.checkUserAgent(),
            this.getWebsiteList(),
            this.getAdsRecommend(this.mall.site_info_id));
          const a =
              (this.mall.has_one_agent_ip &&
                (this.mall.has_one_agent_ip.map_ip || this.mall.has_one_agent_ip.ip)) ||
              "",
            d = (this.mall.has_one_agent_ip && this.mall.has_one_agent_ip.area_name) || "";
          this.listLoading = false;
          this.spCheckSetupPending = false;
          ((this.titleIP = a + "(" + d + ")"), this.startProxy());
        } catch (t) {
          this.spCheckSetupPending = false;
          if (this.initJson?.desktopProtocol) {
            this.listLoading = false;
            this.loadIp = false;
            this.loadUa = false;
            this.checkIpEnd = false;
            this.spCheckSetupError = setupStage === "details"
              ? "店铺信息加载失败，请点击重新检测"
              : setupStage === "routes"
                ? "线路信息加载失败，请点击重新检测；仍未恢复请关闭店铺后重新打开"
                : "店铺检测信息未准备好，请点击重新检测";
            this.checkResult = this.spCheckSetupError;
            if (this.spNetwork) this.spNetwork.message = "";
            return;
          }
          (console.log("异常--", t, this.reqLimit),
            t &&
              t?.message?.indexOf("timeout") > -1 &&
              (console.log("getMallInfo timeout reset-----"),
              this.reqLimit < 4
                ? (this.reqLimit++, this.getMallInfo())
                : ((this.checkResult = this.$t("check.content.the_test_failed")),
                  (this.listLoading = !1),
                  (this.loadIp = !1),
                  (this.loadUa = !1))));
        }
      },
      checkUserAgent() {
        ((this.loadUa = !1), console.log("进行环境检测"));
        const e = navigator.userAgent,
          t =
            e.indexOf("Mac") > -1
              ? this.mall?.has_one_mac_user_agent?.ua
              : this.mall?.has_one_user_agent?.ua;
        if (typeof t !== "string" || !t.trim()) throw new Error("shop_agent_unavailable");
        this.spUaChecked = true;
        let s = t,
          i = /Chrome\/([\d.]+)/.exec(s),
          a;
        (i &&
          ((i = i[1]),
          (a = i.split(".")[0]),
          a >= 101 && (s = s.replace("Chrome/" + i, "Chrome/" + a + ".0.0.0"))),
          console.log("当前userAgent", e),
          console.log("店铺userAgent", s),
          console.log(a, this.mall.platformName),
          navigator.userAgent === t || navigator.userAgent === s
            ? a < 109 && String(this.mall.platformName || "").indexOf("ebay") > -1
              ? ((this.checkUa = !1),
                (this.checkResult = this.$t("check.content.the_test_failed_ua")),
                y.warning({
                  message:
                    "<strong>检测到ebay店铺UA版本过低</strong><br/>1.点编辑店铺然后刷新店铺UA <br/>2.清理店铺所有缓存 <br/>3.重新打开店铺",
                  dangerouslyUseHTMLString: !0,
                }))
              : (this.checkUa = !0)
            : ((this.checkUa = !1), (this.checkResult = this.$t("check.content.the_test_failed"))));
      },
      getWebsiteList() {
        E.getWebsiteList({ site_info_id: this.mall.site_info_id }).then((e) => {
          (console.log("站点推荐列表", e),
            e.errorCode === 0 && (this.websiteList = e.data.websiteList || []));
        });
      },
      getAdsRecommend(e) {
        const t = { site_info_id: e };
        E.getAdsRecommendBySite(t).then((s) => {
          (console.log("广告推荐列表", s),
            s.errorCode === 0 && (this.adsRecommendList = s.data || []));
        });
      },
      setCheckResult(e, t = !0, s = 0) {
        if (((this.checkIpEnd = !0), (this.loadIp = !1), (this.switchingIndex = -1), t)) {
          (this.mall.has_one_agent_ip &&
            this.mall.has_one_agent_ip.ip_type === 3 &&
            (this.showLocal = !1),
            (this.ipInfo.ip = e || this.ipInfo.ip),
            console.log("this.ipInfo", this.ipInfo),
            (this.ipInfo.type = "setTz"));
          const i = { type: S.event_type.check_completed };
          ((this.checkIp = !0), chrome.runtime.sendMessage(i, {}));
        } else if (
          ((this.showLocal = !1),
          (this.checkResult = this.$t("check.content.the_test_failed")),
          console.log("Local dynamics", this.mall.has_one_agent_ip, s),
          this.mall.has_one_agent_ip &&
            (this.mall.has_one_agent_ip.ip_type === 3 ||
              (this.mall.has_one_agent_ip.ip_type === 5 && s > 0)))
        ) {
          ((this.checkIp = !0),
            console.log("this.ipInfo", this.ipInfo),
            (this.ipInfo.ip = e || this.ipInfo.ip),
            (this.ipInfo.type = "setTz"));
          const i = { type: S.event_type.check_completed };
          chrome.runtime.sendMessage(i, {});
        }
      },
      async checkIpHandle() {
        const e = (this.ipv6 =
            this.mall.has_one_agent_ip && this.mall.has_one_agent_ip.protocol_family == 2),
          t = this.mall.has_one_agent_ip.map_ip || this.mall.has_one_agent_ip.ip || "";
        let s = this.mall.has_one_agent_ip && this.mall.has_one_agent_ip.ip_type;
        if (s == 3 || s == 2) {
          this.setCheckResult(t);
          return;
        }
        if ((console.log(new Date()), e))
          (console.log("------[暂不支持ipv6检测功能]------"), this.setCheckResult(t, !1));
        else {
          console.log("IPV4检测");
          const i = s == 5 ? "dynamicIpCheckList" : "ipCheckList";
          s == 5 && (this.maxRetryNum = 7);
          let a = this.getSystemConfig(i);
          a || (await this.loadSystemConfigs(), (a = this.getSystemConfig(i)));
          const l = ((a && a.contents) || "").split(",") || [];
          (console.log("ipCheckList", l),
            Ae({ targetIP: t, urls: l }).then(({ successCount: r, totalCount: u }) => {
              (console.log(" 验证结果:", r > 0),
                r > 0 ? this.setCheckResult(t) : this.setCheckResult(t, !1, u));
            }));
        }
      },
    },
  });
function xe(e) {
  if (!e) return;
  const t = document.querySelector('link[rel="shortcut icon"]');
  t && document.head.removeChild(t);
  let s = document.querySelector('link[rel="icon"]');
  s !== null
    ? (s.href = e)
    : ((s = document.createElement("link")),
      (s.rel = "icon"),
      (s.href = e),
      document.head.appendChild(s));
}
const re = console;
function et() {
  ["log", "warn", "error", "info", "debug"].forEach((e) => {
    const t = re[e];
    console[e] = function () {
      se && t.apply(re, [...arguments]);
    };
  });
}
class G {
  static SEQUENCE_TIMEOUT = 3e3;
  static REQUIRED_KEY_COUNT = 8;
  keySequence = [];
  sequenceTimer = null;
  wordBuffer = "";
  wordTimer = null;
  isModifierActive = !1;
  constructor() {
    this.initializeEventListeners();
  }
  initializeEventListeners() {
    (document.addEventListener("keydown", (t) => this.handleKeyDown(t)),
      document.addEventListener("keyup", (t) => this.handleKeyUp(t)));
  }
  handleKeyDown(t) {
    ((this.isModifierActive = t.ctrlKey && t.altKey && t.shiftKey),
      this.isModifierActive
        ? this.handleModifierSequence(t.key.toLowerCase())
        : this.handleWordInput(t.key.toLowerCase()));
  }
  handleKeyUp(t) {
    (!t.ctrlKey || !t.altKey || !t.shiftKey) && (this.isModifierActive = !1);
  }
  handleModifierSequence(t) {
    ["x", "v"].includes(t) &&
      (this.resetSequenceTimer(), this.keySequence.push(t), this.checkSequenceCompletion());
  }
  handleWordInput(t) {
    if (!/^[a-z]$/.test(t)) {
      this.resetWordBuffer();
      return;
    }
    (this.resetWordTimer(), (this.wordBuffer += t), this.checkWordCompletion());
  }
  checkSequenceCompletion() {
    if (this.keySequence.length >= G.REQUIRED_KEY_COUNT) {
      const t = this.keySequence[0];
      this.keySequence.every((i) => i === t)
        ? (t === "x" ? this.triggerDebugMode(!0) : t === "v" && this.triggerDebugMode(!1),
          this.resetSequence())
        : (this.keySequence = [this.keySequence[this.keySequence.length - 1]]);
    }
  }
  checkWordCompletion() {
    const t = this.wordBuffer.toLowerCase();
    t === "start"
      ? (this.triggerDebugMode(!0), this.resetWordBuffer())
      : t === "stop"
        ? (this.triggerDebugMode(!1), this.resetWordBuffer())
        : t.length > 5 && this.resetWordBuffer();
  }
  triggerDebugMode(t) {
    const s = t ? "开启调试" : "关闭调试";
    (console.log(s), (se = t), console.log("InitJson data：", t && ee));
    const i = t ? S.event_type.enable_debug_mode : S.event_type.disable_debug_mode;
    (console.log("debug：", i), chrome.runtime.sendMessage({ type: i }), this.showNotification(s));
  }
  showNotification(t) {
    const s = document.createElement("div");
    ((s.textContent = t),
      (s.style.cssText = ` 
      position: fixed; 
      top: 20px; 
      left: 50%; 
      transform: translateX(-50%); 
      padding: 10px 20px; 
      background: ${t.includes(" 开启") ? "#4CAF50" : "#f44336"}; 
      color: white; 
      border-radius: 4px; 
      z-index: 9999; 
    `),
      document.body.appendChild(s),
      setTimeout(() => {
        s.remove();
      }, 3e3));
  }
  resetSequenceTimer() {
    (this.sequenceTimer && clearTimeout(this.sequenceTimer),
      (this.sequenceTimer = setTimeout(() => {
        this.resetSequence();
      }, G.SEQUENCE_TIMEOUT)));
  }
  resetWordTimer() {
    (this.wordTimer && clearTimeout(this.wordTimer),
      (this.wordTimer = setTimeout(() => {
        this.resetWordBuffer();
      }, G.SEQUENCE_TIMEOUT)));
  }
  resetSequence() {
    ((this.keySequence = []), (this.sequenceTimer = null));
  }
  resetWordBuffer() {
    ((this.wordBuffer = ""), (this.wordTimer = null));
  }
}
new G();
const tt = "/assets/imageLogoHelp-DBeOKbnV.png",
  K =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAAADrSURBVDiN7dQtTwNBGATgmb1rcluuqWn4N6hKZIO9BI1oTZNKBKahAoMtAkkl/BsEmpAQQsOtuNtBXUk/7sKSCkRHbd7NPpnXLLDnsDqc3b6m1nZPAZ+EEcbl+cfTw8XxEgDiapwcdYaQvwrv5GHb3QmAKQCYVdXSt8Kxyizsqu+fkZocwAP4H8B4c0Bp7Mm3X7WReiKvm0FycX9uX+qQ7M4NAY3KQidRzFjAGhi8suDZdL/VsCQH2TyvX1l4B3AZReyXZI/SblA0BQFQmqGxw08qTMa4LdDlnzdJO30GGPjByrmv5WPYm4B8AzZFRR/XamAvAAAAAElFTkSuQmCC",
  st =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAwAAAAOCAYAAAAbvf3sAAAAAXNSR0IArs4c6QAAAARzQklUCAgICHwIZIgAAADCSURBVCiRnZExDgFhEIW/mUx0OoU7UC1KhUvolUhknUAcwYmIXrmlRIQjkCgYxf6bsFk/8ar5M+/97+WNEJDMvS/OljjOVkzyoImAw6iKKU4PYWzdmbdRGkDLAYVDmXy/k4lyASbmyg6oFUuHdVmgyrBYG1ATWAKbqiilD8QA3Ml2K6kUdFJ/d6vsIgIFEMG/U/90sB84iNAiLyAINB7JYRGGq5EfJu4Qan8oJwuWgyT1+keHl9oN2AtMI3FuAsfi/QShEDY776nbGQAAAABJRU5ErkJggg==",
  nt =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAQCAYAAAAWGF8bAAACDklEQVR4AZxTTUhUURT+zp0gWyQiETFBBSMEtbGZRyAR5KaNFBS0aDELKWwR1UyLaqdbFzlvHCiICpEWLaKgli2aRUFTvjdG4CJMRVAREUE3/jDv+F3xwRtxdMbH+95337nnfPfcczgGB3ycjKZTGZ0hf45KmGRGe4i+BtGvwDAUo+RrFC5tx/cYAXoPgCc2Ky8vXaoY4/piqGEqwCUEuKwVdGgAJzBoD2I4HzM4y9MS3DvNgHhQwfH1NbQ2LaP5aAuO0AZmpiI4B8UzCnZaLTPqypQ3KN/9gvz0B8UrD8if8nMZ+zUg/37nZIJ7054rc+WCLPx9KUs/3spKsU9WaRNe994hxQlm2j/iStFq7dqU1ANN2Az2g+/Kq1Je5qN+VYLJrLbxGsuIYTz1SD9GHetdG9t2inyz4B1KDGQp8BCCG7R5xNZePWy1DOsQZ/AFCp0iYsQGi3ySbN8kP1fqhdUyLK7j5aSFnFCBw+AmHvCUop9okwbhVNXQz8k4BZpRQRs7d5PiDb9VgmG0V5D/4TpkJ6t3OrLaGv7X4l0Fo87tGT3Dhign4vW6YpGFT0f3d66Ndd4L7NIkg9aIODHLwg/v5W8zHKLjV47OF/IHjtI7NuQN8YI2l5m9p/0whXrJVnSRXKyBIdvlbjbiKkfnOvnWSE7SbMhd4j5tWT8vt3nIY4p3UaRAn2NEZw10bwIAAP//m4TP5AAAAAZJREFUAwDShEf+OT6v+QAAAABJRU5ErkJggg==",
  it = "/assets/avatar_extracted-BsUeCeNq.png",
  ot =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACwAAAAyCAYAAAAnWDnqAAAAAXNSR0IB2cksfwAAAAlwSFlzAAALEwAACxMBAJqcGAAACOJJREFUeJztmQdwVFUUhtnshhRCWEJIIAkGL0gRUUEGBbFRRCyAgGVQUREde1fErlhARVR0xLEPtlEUsWJ3QFFGBbGM4lgoir2gAUkeyfr/uf/N3rzsYoSgjuPOfHlv3768+99zzz3n3PuaNfv/8x/5mKEToiIWrKsiGTjP+Kd1NfhQFIHAqCc6+q8UDEERT2TzEO56RojIPyk24lk0nWB3X53gv1W013A0RBbIgfBsHEmmiIWo68iWFupbKkKfdciitYIltlGCt5hoT6zvAlFvoqUS7HAuEha85SztHirBLmzF5LfOHVqAYtAZ9BA8L9Jv0ZABMlwHmlyw3xBEUlw2jrRmlqzMa+1AH3AYOA3Xp4DxOO8t0fUsid/caDWNa/CBKRqIyLKZIBff4zgWgHKcDwAUOB3fl4JPwRx8Pxj0BHmh52WIpvNlDZnzw3AHKLgM7ACGg4m4dg/4AvwGKsAKcCF+GwbK5ePscMQX3CRiJZizPFeifR9kwwbsDsah0cngQ/AzWPt7IlGD4xoxA/ccro4VOtF8dpML1nDFJNz5ahx0BwfIqneBz8GPFFqTwAd/Ahx4DbyL+04Eu4D2nIB0KY1arejNEpnKnzQxaJm2YHtwILhYYr+hVSugb73EVlXWCf4dfIx7T5ePl2qyZrjMuFmC/aCf4re4Js9YcDkamqfJtRasA+vXJDYEFLneugT9+GvwHu4/FfRnJKF1+Ty5Q2yTxUpUZrpJptDUj8OLhp4F74BVGnb66rey9ifgdTAX3IH7LwKHgG3pDu55mnjRzfZhiQ1PMgb5ErArGrgEzAcvKyrMAjPBNFoenA1OAseCQ8EQsB1oGW6LFlZ7zTdHcKYmV1gw/bcXGhmlSTQRnAOOB0eAMWAf+WofJQwK3RoUpGrLCVZcb1zG8zONIoErWsIuwU4w9XYBO0kU6Qa6GpuKOexMxx00IsXy/dx0gkNFVHr3MA0Lmnq1bIr7Y4oU+cZmuLjOW+hYLJH09QK6gO5nHM/yfdXzX78uiaT155DYiETmiXoTTg9ursxGcXk4byFBrekq+E6RbUShrJovsbl6btzDdTTHF5zSwinEOgs7a0S8e6MSxnDEYe6I41Y630bu0Ev+SlcxOpKOoNTYoqhMrtJV95SoczkyRiSl4FRi0/qMvT9XDdBnBxmb3QgTBycfC5ujwThj64lh+m0EGAr2AH2NzXI8383Y0NiDo8JRc7G40YLTiTbJyNBbYhgZzgeXgSvBFHA9uBXcBC4FLHQmi/PAGWCCOsXjMSYZ6rpLdJZn4YywiHC1X7diYMoE2Qox/J6vYaSlGLquA7PAXPACeBEsAG+C18Az+u1Z8Rh4ANwOZqhTU8El4GSNFMNkW7XHKBRrjFgKbAXagxLVt4R5n3XDGFnrXvA0rr0EFoJFTLvgs8DWvjxfjHs+BKwfPgBLwELwqjr5BLgfTJPoofifzjSOJvXGBcua+RJbLgpBGwmmO7B2YHp9SCn5S/AD+B6sQN1QFdjat0Jp+hfwK/gOfAVWq6ZYydpDHXgSXAPG4xpjeRmOLevVFmksmyeBFNdBgttKMDvRS5PrHFmY6fgtsETCKqpqEkGNLSerA1sIsUKrZEd8eC2wBdEKudBMcAonIyMPjjRcg6KrmWfdHA19scR1EEUSzOsMT4M0Yeh/D4JXwEf4jayuFVydSFRW12yoFQ0qa6oSlUFVIuFq4yBIbKhO1Ej4cvz/2+BOY6s4pnIKZvjMSinYc4W2EkbaiWJZnXCoGNL2lTWmygefAwnAwn11pa2Fa8vgykR1TRV7wE/1BqrFsdoKt65CwYvAzcYWSH1lMCaS1EWQslcrWbNYx7hn2TZyl9YS3ROMBIwWF4MbZG1OJE44rt1WacjpFushtVoibTVvz39mJxVhGBZrF6hqh+EtreCYbiryBOZLtLN4XJ1qrZm8FxgNGFNZPl4AblT44kRitKDFf5Il19WKTtSJZZH/qSLIw2ASRw7XOsl/m/+Z4Hxv6AslrEDDUyT4naGuGxgIDgDDwN5oZD9FkEmaQM8zlAU2xC1zoiuCikSl9V1Oxi9xzxuAhf0Jxi5iuZrmaKbf2ZRLtJRlneACiaQLlMrKrB2YRvcEo8BYQH/eRW6yM85HG5vRaO3ZxiYTrjqWB3YVvU7iV+L6KmMTDOcCM14ftoNjtuZX6vWdsRsiLkoUavK1D5LhzcH6djDdAEwCdAOKHgBYmLNDrBNYO9C/L9XsZ6bj/gRjMOMv4/DnSirMlucCjhILKFZ8f168yy1aSXCRhp4iWY2V68jEcRCOXM4vALeqseE478oOGrsw7S8BtBqXSLfIkkslnBnwA3XkWnCUsQUVq7gWDcSlM3Vga4d4kMx0HYNkxisJkpnuqsDG3ffBbRLN+Ex34TKIcMXRV759nKIAk81TYB54VG7DCTsQcLKx7YbW3YjgDM81yiS0TLATFMFMx52dOYHdhloMOOxMJiwZWcBso+DPDveSIJacZ4Krja3qWMExUeyrDrISZCj760v9wCaSuNyDQtvJXTjkrGHPwvnjEsxagpt8Vxm7fO+H76zq2msCsbPMkPTtwRohlpVHgv3lCry/lUkuGlKm5Lq3OhuxuKvc8hRJaP1OapTFz3xNJMZbhrIzcKRrdNGEdZOYcKXBibmjXKWP3KZc1s3fqGAJ9Teg6wqh0D18CPe/3DqvVJbibs9sCaaVHzG2TBwJtpVgl4CyPTH5igRc63FxGtdza4VKU/qXNabh66l6q2Q1xELErYaLZB1OpJmafMuMLRGna5J1llXdSjnTe174xY1bmGZJcL2d+XQ+6/Zm696fef/kdtizJbpAQ0m3uBLX75bY+4zNcgMUx5kpneXcSDoLuvcbblfJvbRp/DsOX6z7J5Nc8md5D6eV6cec3QxJrLLov1cYG0+7e/7orJbpPTsaEux+3/R3G57gmCfYba7QYtzXZUweIdHcPuX2FGvZksY0bpIvYqImXQreBOFOcMwk9yt4zhDE5T5n/BD5bX9ZN+U2VPgTaGXsu2OTiP7/8xc/fwB4aP5YUVjL4gAAAABJRU5ErkJggg==",
  k = (e) => (ge("data-v-fadd5fbc"), (e = e()), me(), e),
  at = { class: "box__style" },
  rt = { class: "body__style" },
  lt = { class: "timeZoneBox" },
  ct = ["src"],
  ht = { class: "timeZoneTime" },
  dt = { class: "leftBoxStyle" },
  ut = { class: "logoStyle" },
  pt = k(() =>
    n(
      "div",
      { class: "logImgContainer" },
      [n("div", { class: "logImg" }, [n("img", { src: tt })])],
      -1,
    ),
  ),
  gt = { class: "resultBox__style" },
  mt = { class: "text__style" },
  ft = { class: "logoStyleImg" },
  _t = ["src"],
  At = { class: "text" },
  yt = { class: "textStyle" },
  Tt = { class: "openMallActions" },
  kt = ["translation_ip"],
  wt = { class: "transferProxyDebugPanel" },
  vt = { class: "transferProxyDebugTitle" },
  Mt = { class: "transferProxyIndex" },
  St = { class: "transferProxyAddress" },
  Pt = { class: "transferProxyArea" },
  Et = { key: 0, class: "warnTips" },
  Ct = k(() =>
    n(
      "i",
      { class: "el-icon-warning", style: { "margin-right": "5px", "font-size": "18px" } },
      null,
      -1,
    ),
  ),
  Lt = { class: "rightBox" },
  bt = { class: "rightMainInfo" },
  It = { class: "detectionsStyle" },
  Bt = { class: "imgStyle" },
  Rt = ce(
    '<div class="circle" data-v-fadd5fbc><li class="C-A" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-A" data-v-fadd5fbc></li></div>',
    1,
  ),
  Jt = { key: 0, class: "textStyle" },
  Ut = { class: "imgStyle" },
  Dt = ce(
    '<div class="circle" data-v-fadd5fbc><li class="C-A" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-B" data-v-fadd5fbc></li><li class="C-A" data-v-fadd5fbc></li></div>',
    1,
  ),
  Ot = { key: 0, class: "textStyle" },
  Nt = { class: "detectItemStyle successItemStyle" },
  Vt = { class: "imgStyle" },
  Ft = { class: "textStyle styleSuccess" },
  $t = { class: "rightBoxStyle" },
  jt = ["title"],
  Yt = k(() => n("img", { src: K, alt: "" }, null, -1)),
  Gt = { class: "text" },
  Kt = { class: "text-title" },
  zt = { class: "text-result" },
  qt = ["title"],
  Qt = k(() => n("img", { src: K, alt: "" }, null, -1)),
  Wt = { class: "text" },
  Ht = { class: "text-title" },
  Xt = { class: "text-result" },
  Zt = ["title"],
  xt = k(() => n("img", { src: K, alt: "" }, null, -1)),
  es = { class: "text" },
  ts = { class: "text-title" },
  ss = { class: "text-result equipment-code-result" },
  ns = ["title"],
  is = ["title"],
  os = k(() => n("img", { src: K, alt: "" }, null, -1)),
  as = { class: "text" },
  rs = { class: "text-title" },
  ls = { class: "text-result" },
  cs = ["title"],
  hs = k(() => n("img", { src: K, alt: "" }, null, -1)),
  ds = { class: "text" },
  us = { class: "text-title" },
  ps = { class: "text-result" },
  gs = { key: 0, class: "rightTransitBox" },
  ms = { class: "transitSelectorCard rightTransitCard" },
  fs = { class: "transitSelectorHeader" },
  _s = { class: "transitHeaderLeft" },
  As = { class: "transitSelectorTitle" },
  ys = k(() => n("img", { src: nt, style: { width: "12px", height: "12px" } }, null, -1)),
  Ts = ["title"],
  ks = k(() => n("span", { class: "transitTitleHelpIcon" }, "?", -1)),
  ws = { class: "transitHeaderActions" },
  vs = { class: "transitAutoSwitchTooltipContent" },
  Ms = k(() => n("span", { class: "transitAutoSwitchRadio" }, null, -1)),
  Ss = { class: "transitAutoSwitchText" },
  Ps = k(() => n("span", { class: "transitAutoSwitchRadio" }, null, -1)),
  Es = { class: "transitAutoSwitchText" },
  Cs = { class: "transitTestBtnWrap" },
  Ls = { key: 0, class: "speed-test-guide-tooltip" },
  bs = { class: "guide-content" },
  Is = k(() => n("div", { class: "guide-mascot" }, [n("img", { src: it, alt: "mascot" })], -1)),
  Bs = { class: "guide-text-wrap" },
  Rs = { class: "guide-text" },
  Js = { class: "guide-text" },
  Us = k(() =>
    n("div", { class: "guide-decoration" }, [n("img", { src: ot, alt: "decoration" })], -1),
  ),
  Ds = k(() => n("div", { class: "guide-arrow" }, null, -1)),
  Os = { class: "transitList" },
  Ns = { class: "transitItemLeft" },
  Vs = k(() => n("div", { class: "transitStatusDot" }, null, -1)),
  Fs = { class: "transitInfo" },
  $s = { class: "transitNameRow" },
  js = ["title"],
  Ys = { class: "transitLatencyTooltipMetrics" },
  Gs = { class: "metricLabel" },
  Ks = { class: "metricValue" },
  zs = { class: "metricLabel" },
  qs = { class: "metricValue" },
  Qs = { key: 1, class: "transitLatencyHint metricError" },
  Ws = k(() => n("span", { class: "latencyBreathLight" }, null, -1)),
  Hs = { class: "metricValue" },
  Xs = { class: "transitItemRight" },
  Zs = { key: 0, class: "local-tip" },
  xs = k(() =>
    n(
      "img",
      {
        class: "iconWarning__style-1MQJrYS6",
        src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACEAAAAhCAYAAABX5MJvAAADTklEQVRYhb3Y34uVZRAH8M++G5sbZEFCP/EikzYocCtak4KUEKzUJegf2KJM2qyb7EYv6spL3fSisj9h1wryUqGytlgUCjTMIEmLNMo1OBpYXcycztvZfc95zy7s3Dw77zvzne/O884885y+2fFdepBH8FSu9+IW3IRL+A3f4St8kmst6atBYhBj2IHVPRD+HntxEI1OhkUXoK04hXeSwHnsx3MYws3oy3Uon+9Pu3swkf6jnYJUZeJ67MOLqZ/A2/gQ17oQh35swW6syWfv4lVcbTeeLxPLcTgJXBHb8DAmaxKQdlN4KP2vJN7hxO9IYiCd1+NnrBMZqQp+Kx7EbRXv/07/dYm3PvEHOpGYwAb8hMdwvAIctom9n8kAr3ewPY7HE3dDxpmXxKhIWQOb8UMHUGJ/y/4vd7E/k7iNjPPfx9oEGRTlBDvFh9hNbmjTB+a1+r+cSHwZb7BMYgwr0+hADTD4o4teJQfE9qzE82USO3J9S/0KWCiJa6LciS1VYEQ0onOiD9SV37voneQj8VGvxkiBjfliSpRUXVloJohsTObfGwusTeVoDyCLJVGO92iB+1L5dolJNOMNFeI4JhrOUpJoxltRaPXy2SUm0Yx3Y1FS5hwsXWQx1VGOd7kQExHc3iPIYjPRjHexwMlU7u8R5KTWxNQo4dSVZrxTBb5M5YkeQS7gSezJ9UKP/s14X/TNju8aSSLnRD/vpWEtVPrxI+7E2gLTOJ0PtvYINioysblHvy0Z7zSmmwdY8xjfnSzryE7R6t8QZ8FrNf360Rxs99E6RT/AWTGUbq8JNtamb6vptx3DGe9gmURD6zjfozUhd5Jf2/RLNXzWJL6M1yiTgEN4T0w7H+PuLoBvajWoy1oTU5WsStzBjHOo+aJ90H0Fn+IufCbSViWfi2oaTvujHWyH23DHyy/bSfyFZ3BEdLRj5g60ZflTjIRV506RAY8l3hE8re0CNB/4LDaJG9MyUTkzohzrVk5/2s+ICliWeJvmI3xdBchVvCRuTHvFBzUlRrJJkfpv8EuCLhcXoAdEJ3wWdyTWWVG+U1WM697KXxBf86puxiU5k//A+7rcyqsyUZaGuDFNmPv7xAqRhVlcFL9PfC0yOI1/6rD9Fx9vzxjHTY2ZAAAAAElFTkSuQmCC",
      },
      null,
      -1,
    ),
  ),
  en = { class: "tips__style-1C1xbq1J" },
  tn = { class: "tipContainer__style-Ti7BRWQG" },
  sn = { class: "leftBox__style-20mup_lT" },
  nn = { class: "row__style-lDcIWATI" },
  on = { class: "strongColor__style-4erBGHC3" },
  an = { class: "redColor__style-3CnK4F89" },
  rn = { class: "rightBox__style-k5lE1gxd" },
  ln = { class: "currency" },
  cn = { key: 0, class: "adsRecommend" },
  hn = { class: "title" },
  dn = ["src", "onClick"],
  un = { class: "el-dropdown-link" },
  pn = { class: "box__style_22" },
  gn = { key: 0, class: "header__style_3a" },
  mn = k(() => n("div", { class: "line__style_e9" }, null, -1)),
  fn = { class: "text__style_ab" },
  _n = k(() => n("div", { class: "line__style_e9" }, null, -1)),
  An = { class: "container__style_7e" },
  yn = { class: "item__style_63 moduleTitle__style_0b" },
  Tn = { class: "websiteList" },
  kn = ["onClick"],
  wn = { class: "openMethodAutoWrap" },
  vn = { class: "openMethodAutoTitle" },
  Mn = ["title"],
  Sn = { class: "openMethodAutoWrap" },
  Pn = { class: "openMethodAutoTitle" },
  En = { class: "openMethodUrl" },
  Cn = { class: "openMethodCustomWrap" },
  Ln = { class: "openMethodCustomTitle" };
function bn(e, t, s, i, a, d) {
  const l = A("el-button"),
    r = A("Setting"),
    u = A("el-icon"),
    V = A("el-button-group"),
    C = A("Loading"),
    I = A("CircleCheck"),
    B = A("Warning"),
    O = A("el-tooltip"),
    R = A("el-carousel-item"),
    q = A("el-carousel"),
    $ = A("el-dropdown-item"),
    W = A("el-dropdown-menu"),
    H = A("el-dropdown"),
    w = A("el-radio"),
    L = A("OpenMethodJumpPages"),
    b = A("el-radio-group"),
    de = A("el-dialog");
  return (
    c(),
    m("div", at, [
      n("div", rt, [
        n("div", lt, [
          (c(!0),
          m(
            J,
            null,
            U(
              e.TimeZone,
              (g) => (
                c(),
                m("div", { class: "timeZoneItem", key: g.name }, [
                  n("img", { src: g.image }, null, 8, ct),
                  n("span", null, o(g.name), 1),
                  n("span", ht, o(e.formatTimeForZone(g)), 1),
                ])
              ),
            ),
            128,
          )),
        ]),
        n(
          "div",
          { class: T(["userInfoStyle", { hasTransitProxy: e.hasTransferProxyPool }]) },
          [
            n("div", dt, [
              n("div", ut, [
                pt,
                n(
                  "div",
                  { class: T([e.resultClass, "header__style"]) },
                  [
                    n("div", gt, [
                      n(
                        "i",
                        {
                          class: T([e.checkAll ? "el-icon-success" : "el-icon-warning"]),
                          style: { "margin-right": "5px", "font-size": "18px" },
                        },
                        null,
                        2,
                      ),
                      n("span", mt, o(e.displayCheckResult), 1),
                    ]),
                  ],
                  2,
                ),
                n("div", ft, [
                  n(
                    "img",
                    { src: e.mall.has_one_platform && e.mall.has_one_platform.logo },
                    null,
                    8,
                    _t,
                  ),
                  n("div", At, o(e.mall.mall_name), 1),
                ]),
                n("div", yt, [
                  n("div", Tt, [
                    p(
                      V,
                      { class: "openMallBtnGroup" },
                      {
                        default: h(() => [
                          p(
                            l,
                            {
                              type: e.checkAll ? "primary" : "danger",
                              disabled: !e.checkAll,
                              class: "ant-btn ant-btn-primary openMallOpenBtn",
                              onClick: t[0] || (t[0] = (g) => e.openMall()),
                            },
                            {
                              default: h(() => [
                                n(
                                  "span",
                                  { translation_ip: e.translation_ip },
                                  o(e.$t("check.content.open_store")),
                                  9,
                                  kt,
                                ),
                              ]),
                              _: 1,
                            },
                            8,
                            ["type", "disabled"],
                          ),
                          e.showOpenMethodSettingButton
                            ? (c(),
                              M(
                                l,
                                {
                                  key: 0,
                                  class: "openMallSettingBtn",
                                  type: "primary",
                                  onClick: e.openOpenMethodDialog,
                                },
                                {
                                  default: h(() => [
                                    p(
                                      u,
                                      { class: "openMallSettingIcon" },
                                      { default: h(() => [p(r)]), _: 1 },
                                    ),
                                  ]),
                                  _: 1,
                                },
                                8,
                                ["onClick"],
                              ))
                            : v("", !0),
                        ]),
                        _: 1,
                      },
                    ),
                    n("div", wt, [
                      n(
                        "div",
                        vt,
                        " transferProxies(" +
                          o(e.transferProxies.length) +
                          ") selectedAddress: " +
                          o(e.lastSelectedTransferProxyAddress),
                        1,
                      ),
                      (c(!0),
                      m(
                        J,
                        null,
                        U(
                          e.transferProxies,
                          (g, f) => (
                            c(),
                            m(
                              "div",
                              {
                                key: `transfer-proxy-${f}-${g.id || ""}`,
                                class: T([
                                  "transferProxyDebugItem",
                                  {
                                    active: f === e.currentTransferProxyIndex,
                                    switched: f < e.nextTransferProxyIndex,
                                  },
                                ]),
                              },
                              [
                                n("span", Mt, o(f + 1) + ".", 1),
                                n("span", St, o(g.ip) + ":" + o(g.port), 1),
                                n("span", Pt, o(e.$t("check.transit.line_name", { n: f + 1 })), 1),
                              ],
                              2,
                            )
                          ),
                        ),
                        128,
                      )),
                    ]),
                  ]),
                ]),
                e.isExternalNetwork
                  ? (c(), m("p", Et, [Ct, n("span", null, o(e.$t("check.content.vpn")), 1)]))
                  : v("", !0),
              ]),
            ]),
            n("div", Lt, [
              n("div", bt, [
                n("div", It, [
                  n(
                    "div",
                    {
                      class: T([
                        "detectItemStyle",
                        [e.checkIp ? "circle-check" : "warning-outline"] + "ItemStyle",
                      ]),
                    },
                    [
                      n("div", Bt, [
                        e.loadIp
                          ? (c(),
                            M(
                              u,
                              { key: 0, size: 24, color: "#3370ff", class: "is-loading" },
                              { default: h(() => [p(C)]), _: 1 },
                            ))
                          : (c(),
                            M(
                              u,
                              { key: 1, size: 24 },
                              {
                                default: h(() => [
                                  e.checkIp
                                    ? (c(), M(I, { key: 0, style: { color: "#07c255" } }))
                                    : (c(), M(B, { key: 1, style: { color: "#f40009" } })),
                                ]),
                                _: 1,
                              },
                            )),
                        Rt,
                      ]),
                      n("div", null, [
                        n("div", null, o(e.$t("check.content.ip_testing")), 1),
                        e.loadIp
                          ? (c(), m("div", Jt, o(e.$t("popup.loading")), 1))
                          : (c(),
                            m(
                              "div",
                              {
                                key: 1,
                                class: T([
                                  "textStyle",
                                  (e.checkIp && "styleSuccess") || "styleError",
                                ]),
                              },
                              o(e.checkIp ? e.$t("popup.success") : e.$t("popup.fail")),
                              3,
                            )),
                      ]),
                    ],
                    2,
                  ),
                  n(
                    "div",
                    {
                      class: T([
                        "detectItemStyle",
                        [e.checkUa ? "success" : "error"] + "ItemStyle",
                      ]),
                    },
                    [
                      n("div", Ut, [
                        e.loadUa
                          ? (c(),
                            M(
                              u,
                              { key: 0, size: 24, color: "#3370ff", class: "is-loading" },
                              { default: h(() => [p(C)]), _: 1 },
                            ))
                          : (c(),
                            M(
                              u,
                              { key: 1, size: 24 },
                              {
                                default: h(() => [
                                  e.checkUa
                                    ? (c(), M(I, { key: 0, style: { color: "#07c255" } }))
                                    : (c(), M(B, { key: 1, style: { color: "#f40009" } })),
                                ]),
                                _: 1,
                              },
                            )),
                        Dt,
                      ]),
                      n("div", null, [
                        n("div", null, o(e.$t("check.content.hunji_testing")), 1),
                        e.loadUa
                          ? (c(), m("div", Ot, o(e.$t("popup.loading")), 1))
                          : (c(),
                            m(
                              "div",
                              {
                                key: 1,
                                class: T([
                                  "textStyle",
                                  (e.checkUa && "styleSuccess") || "styleError",
                                ]),
                              },
                              o(e.checkUa ? e.$t("popup.success") : e.$t("popup.fail")),
                              3,
                            )),
                      ]),
                    ],
                    2,
                  ),
                  n("div", Nt, [
                    n("div", Vt, [
                      p(u, { size: 24, color: "#07c255" }, { default: h(() => [p(I)]), _: 1 }),
                    ]),
                    n("div", null, [
                      n("div", null, o(e.$t("check.content.line_testing")), 1),
                      n("div", Ft, o(e.$t("popup.success")), 1),
                    ]),
                  ]),
                ]),
                n("div", $t, [
                  n(
                    "div",
                    { title: e.ipInfo.ip, class: "itemStyle" },
                    [
                      Yt,
                      n("div", Gt, [
                        n("p", Kt, o(e.$t("check.content.actual_testing")), 1),
                        n("p", zt, o(e.ipInfo.ip), 1),
                      ]),
                    ],
                    8,
                    jt,
                  ),
                  n(
                    "div",
                    { title: e.titleIP, class: "itemStyle" },
                    [
                      Qt,
                      n("div", Wt, [
                        n("p", Ht, o(e.$t("check.content.agent")), 1),
                        n(
                          "p",
                          Xt,
                          o(e.getShowName(e.mall)) +
                            "(" +
                            o(e.mall.has_one_agent_ip && e.mall.has_one_agent_ip.area_name) +
                            ") ",
                          1,
                        ),
                      ]),
                    ],
                    8,
                    qt,
                  ),
                  n(
                    "div",
                    { title: e.getEquipmentCode(e.mall), class: "itemStyle equipment-code-item" },
                    [
                      xt,
                      n("div", es, [
                        n("p", ts, o(e.$t("check.content.equipment_code")), 1),
                        n("p", ss, [
                          P(o(e.getEquipmentCode(e.mall)) + " ", 1),
                          e.getEquipmentCode(e.mall) !== "-"
                            ? (c(),
                              m(
                                "img",
                                {
                                  key: 0,
                                  class: "equipment-code-copy",
                                  src: st,
                                  alt: "",
                                  title: e.$t("check.content.copy_equipment_code"),
                                  onClick:
                                    t[1] ||
                                    (t[1] = D(
                                      (...g) => e.copyEquipmentCode && e.copyEquipmentCode(...g),
                                      ["stop"],
                                    )),
                                },
                                null,
                                8,
                                ns,
                              ))
                            : v("", !0),
                        ]),
                      ]),
                    ],
                    8,
                    Zt,
                  ),
                  n(
                    "div",
                    {
                      title: e.mall.has_one_agent_ip && e.mall.has_one_agent_ip.type_name,
                      class: "itemStyle",
                    },
                    [
                      os,
                      n("div", as, [
                        n("p", rs, o(e.$t("check.content.type")), 1),
                        n(
                          "p",
                          ls,
                          o(e.getShowType(e.mall)) +
                            " (" +
                            o(e.mall.has_one_agent_ip && e.mall.has_one_agent_ip.equipment_name) +
                            ")",
                          1,
                        ),
                      ]),
                    ],
                    8,
                    is,
                  ),
                  n(
                    "div",
                    { title: e.localGeo, class: "itemStyle" },
                    [
                      hs,
                      n("div", ds, [
                        n("p", us, o(e.$t("check.content.local_net")), 1),
                        n("p", ps, o(e.localGeo), 1),
                      ]),
                    ],
                    8,
                    cs,
                  ),
                ]),
              ]),
              e.hasTransferProxyPool
                ? (c(),
                  m("div", gs, [
                    n("div", ms, [
                      n("div", fs, [
                        n("div", _s, [
                          n("div", As, [
                            ys,
                            n(
                              "span",
                              {
                                class: "transitSelectorTitleText",
                                title: e.$t("check.transit.title"),
                              },
                              o(e.$t("check.transit.title")),
                              9,
                              Ts,
                            ),
                            p(
                              O,
                              { content: e.$t("check.transit.subtitle"), placement: "top" },
                              { default: h(() => [ks]), _: 1 },
                              8,
                              ["content"],
                            ),
                          ]),
                        ]),
                        n("div", ws, [
                          e.spRelayPool ? n("div",{style:{display:'flex',gap:'8px'}},[
                            p(l,{size:'small',loading:e.isTransitLatencyTesting,disabled:e.isTransitLatencyTesting||e.switchingIndex!==-1,onClick:e.testAllTransitLines},{default:h(()=>[P('全部测速')]),_:1},8,['disabled','loading']),
                            p(l,{size:'small',type:e.spRelayAutomatic?'default':'primary',disabled:e.isTransitLatencyTesting||e.switchingIndex!==-1,onClick:()=>e.setRelayAutomatic(!e.spRelayAutomatic)},{default:h(()=>[P(e.spRelayAutomatic?'锁定当前线路':'恢复自动')]),_:1},8,['disabled','type']),
                          ]) : p(
                            O,
                            {
                              placement: "bottom",
                              effect: "light",
                              teleported: !1,
                              "popper-class": "transitAutoSwitchTooltip",
                            },
                            {
                              content: h(() => [
                                n("div", vs, [
                                  n(
                                    "div",
                                    {
                                      class: T([
                                        "transitAutoSwitchOption",
                                        { active: e.autoSwitchBestTransitEnabled },
                                      ]),
                                      onClick:
                                        t[2] ||
                                        (t[2] = (g) => (e.autoSwitchBestTransitEnabled = !0)),
                                    },
                                    [Ms, n("span", Ss, o(e.$t("check.transit.auto_switch_on")), 1)],
                                    2,
                                  ),
                                  n(
                                    "div",
                                    {
                                      class: T([
                                        "transitAutoSwitchOption",
                                        { active: !e.autoSwitchBestTransitEnabled },
                                      ]),
                                      onClick:
                                        t[3] ||
                                        (t[3] = (g) => (e.autoSwitchBestTransitEnabled = !1)),
                                    },
                                    [
                                      Ps,
                                      n("span", Es, o(e.$t("check.transit.auto_switch_off")), 1),
                                    ],
                                    2,
                                  ),
                                ]),
                              ]),
                              default: h(() => [
                                n("span", Cs, [
                                  p(
                                    l,
                                    {
                                      size: "small",
                                      type: "primary",
                                      loading: e.isTransitLatencyTesting && e.isBatchTransitTesting,
                                      disabled:
                                        e.isTransitLatencyTesting || e.switchingIndex !== -1,
                                      onClick: e.testAllTransitLines,
                                    },
                                    {
                                      default: h(() => [
                                        P(o(e.$t("check.transit.switch_best")), 1),
                                      ]),
                                      _: 1,
                                    },
                                    8,
                                    ["loading", "disabled", "onClick"],
                                  ),
                                  e.showSpeedTestGuide
                                    ? (c(),
                                      m("div", Ls, [
                                        n("div", bs, [
                                          Is,
                                          n("div", Bs, [
                                            n("div", Rs, o(e.$t("check.transit.guide_text_1")), 1),
                                            n("div", Js, o(e.$t("check.transit.guide_text_2")), 1),
                                          ]),
                                          Us,
                                          n(
                                            "span",
                                            {
                                              class: "guide-close",
                                              onClick:
                                                t[4] ||
                                                (t[4] = D(
                                                  (g) => (e.showSpeedTestGuide = !1),
                                                  ["stop"],
                                                )),
                                            },
                                            "×",
                                          ),
                                        ]),
                                        Ds,
                                      ]))
                                    : v("", !0),
                                ]),
                              ]),
                              _: 1,
                            },
                          ),
                        ]),
                      ]),
                      e.spRelayPool?n("div",{style:{padding:'8px 0',fontSize:'12px',color:'#606266'}},[
                        n("div",null,o(e.relayStateText()),1),
                        n("div",null,'手动选择会暂停自动切换。测速不会切换当前线路；实际切线可能短暂中断现有连接。'),
                      ]):v('',true),
                      n(
                        "div",
                        {
                          class: T([
                            "transitRealtimeStatus",
                            {
                              styleSuccess: e.lineTestingStatus === "success",
                              styleError: e.lineTestingStatus === "fail",
                              styleLoad: e.lineTestingStatus === "testing",
                            },
                          ]),
                        },
                        o(e.lineTestingStatusText),
                        3,
                      ),
                      n("div", Os, [
                        (c(!0),
                        m(
                          J,
                          null,
                          U(
                            e.transferProxies,
                            (g, f) => (
                              c(),
                              m(
                                "div",
                                {
                                  key: `transit-item-${f}-${g.id || ""}`,
                                  class: T([
                                    "transitItem",
                                    {
                                      active: f === e.currentTransferProxyIndex,
                                      switching: f === e.switchingIndex,
                                    },
                                  ]),
                                },
                                [
                                  n("div", Ns, [
                                    Vs,
                                    n("div", Fs, [
                                      n("div", $s, [
                                        n(
                                          "div",
                                          {
                                            class: "transitName",
                                            title: e.getTransitLineDisplayName(g, f),
                                          },
                                          o(e.getTransitLineDisplayName(g, f)),
                                          9,
                                          js,
                                        ),
                                        p(
                                          O,
                                          { placement: "top", effect: "light" },
                                          {
                                            content: h(() => [
                                              n("div", Ys, [
                                                e.isClientPingMethodSupported
                                                  ? (c(),
                                                    m(
                                                      "div",
                                                      {
                                                        key: 0,
                                                        class: T([
                                                          "tooltipLatencyMetric",
                                                          `is-${e.getTransitMetricLevel(f, "local")}`,
                                                        ]),
                                                      },
                                                      [
                                                        n(
                                                          "span",
                                                          Gs,
                                                          o(e.$t("check.transit.local_latency")),
                                                          1,
                                                        ),
                                                        n(
                                                          "span",
                                                          Ks,
                                                          o(e.getTransitMetricDisplay(f, "local")),
                                                          1,
                                                        ),
                                                      ],
                                                      2,
                                                    ))
                                                  : v("", !0),
                                                n(
                                                  "div",
                                                  {
                                                    class: T([
                                                      "tooltipLatencyMetric",
                                                      `is-${e.getTransitMetricLevel(f, "line")}`,
                                                    ]),
                                                  },
                                                  [
                                                    n(
                                                      "span",
                                                      zs,
                                                      o(e.$t("check.transit.line_latency")),
                                                      1,
                                                    ),
                                                    n(
                                                      "span",
                                                      qs,
                                                      o(e.getTransitMetricDisplay(f, "line")),
                                                      1,
                                                    ),
                                                  ],
                                                  2,
                                                ),
                                                e.getTransitLineError(f)
                                                  ? (c(),
                                                    m("div", Qs, o(e.getTransitLineError(f)), 1))
                                                  : v("", !0),
                                                e.getTransitLatencyState(f).status !== "success"
                                                  ? (c(),
                                                    m(
                                                      "div",
                                                      {
                                                        key: 2,
                                                        class: T([
                                                          "transitLatencyHint",
                                                          e.getTransitLatencyClass(f),
                                                        ]),
                                                      },
                                                      o(e.getTransitLatencySummary(f)),
                                                      3,
                                                    ))
                                                  : v("", !0),
                                              ]),
                                            ]),
                                            default: h(() => [
                                              n(
                                                "div",
                                                {
                                                  class: T([
                                                    "transitWebLatencyQuick",
                                                    `is-${e.getTransitMetricLevel(f, "transit")}`,
                                                  ]),
                                                },
                                                [
                                                  Ws,
                                                  n(
                                                    "span",
                                                    Hs,
                                                    o(e.getTransitMetricDisplay(f, "transit")),
                                                    1,
                                                  ),
                                                ],
                                                2,
                                              ),
                                            ]),
                                            _: 2,
                                          },
                                          1024,
                                        ),
                                      ]),
                                      e.spRelayPool?n("div",{style:{fontSize:'12px',color:'#606266',marginTop:'6px'}},o(e.relaySampleText(f)),1):v('',true),
                                    ]),
                                  ]),
                                  n("div", Xs, [
                                    f === e.currentTransferProxyIndex
                                      ? (c(),
                                        M(
                                          l,
                                          {
                                            key: 0,
                                            type: "success",
                                            size: "small",
                                            plain: "",
                                            disabled: "",
                                            class: "transitBtn activeBtn",
                                          },
                                          {
                                            default: h(() => [
                                              n("span", null, o(e.$t("check.transit.in_use")), 1),
                                            ]),
                                            _: 1,
                                          },
                                        ))
                                      : (c(),
                                        M(
                                          l,
                                          {
                                            key: 1,
                                            type: "primary",
                                            size: "small",
                                            plain: "",
                                            loading: f === e.switchingIndex,
                                            disabled: e.switchingIndex !== -1,
                                            class: "transitBtn switchBtn",
                                            onClick: (j) => e.handleManualSwitchTransit(g, f),
                                          },
                                          {
                                            default: h(() => [
                                              n("span", null, o(e.$t("check.transit.switch")), 1),
                                            ]),
                                            _: 2,
                                          },
                                          1032,
                                          ["loading", "disabled", "onClick"],
                                        )),
                                    p(
                                      l,
                                      {
                                        size: "small",
                                        plain: "",
                                        class: "transitBtn testBtn",
                                        loading: f === e.testingTransitIndex,
                                        disabled: !e.canTestTransitLatency(f),
                                        onClick: (j) => e.handleTestSingleTransit(g, f),
                                      },
                                      {
                                        default: h(() => [
                                          n("span", null, o(e.$t("check.transit.test")), 1),
                                        ]),
                                        _: 2,
                                      },
                                      1032,
                                      ["loading", "disabled", "onClick"],
                                    ),
                                  ]),
                                ],
                                2,
                              )
                            ),
                          ),
                          128,
                        )),
                      ]),
                    ]),
                  ]))
                : v("", !0),
            ]),
            e.showLocal
              ? (c(),
                m("div", Zs, [
                  xs,
                  n("div", en, [
                    n("div", tn, [
                      n("div", sn, [
                        n("div", nn, [
                          n("span", on, o(e.$t("check.content.vpn_ip")), 1),
                          n("span", an, o(e.ipInfo.ip), 1),
                          n("span", null, o(e.$t("check.content.confirm_binding")), 1),
                        ]),
                      ]),
                      n("div", rn, [
                        p(
                          l,
                          {
                            type: "primary",
                            size: "mini",
                            loading: e.bindLocalLoading,
                            onClick: e.bindLocal,
                          },
                          { default: h(() => [P(o(e.$t("check.content.agent")), 1)]), _: 1 },
                          8,
                          ["loading", "onClick"],
                        ),
                      ]),
                    ]),
                  ]),
                ]))
              : v("", !0),
          ],
          2,
        ),
        n("div", ln, [
          (c(!0),
          m(
            J,
            null,
            U(
              e.currencyList,
              (g, f) => (
                c(),
                m("div", { key: f, class: "currencyItem" }, [
                  n(
                    "span",
                    null,
                    o(g.from_amount) + o(g.from_name) + "=" + o(g.to_amount) + o(g.to_name),
                    1,
                  ),
                ])
              ),
            ),
            128,
          )),
        ]),
        e.adsRecommendList.length && e.isShowAds
          ? (c(),
            m("div", cn, [
              n("p", hn, o(e.$t("check.content.recommend_plugins")), 1),
              p(
                q,
                {
                  autoplay: !0,
                  "indicator-position": "none",
                  height: "254px",
                  loop: !0,
                  interval: 5e3,
                },
                {
                  default: h(() => [
                    (c(!0),
                    m(
                      J,
                      null,
                      U(
                        e.adsRecommendList,
                        (g, f) => (
                          c(),
                          M(
                            R,
                            { style: { width: "100%", cursor: "pointer" }, key: f },
                            {
                              default: h(() => [
                                n(
                                  "img",
                                  {
                                    style: { width: "100%" },
                                    src: g.type_e_url,
                                    onClick: (j) => e.toAdsRecommend(g.target_url),
                                  },
                                  null,
                                  8,
                                  dn,
                                ),
                              ]),
                              _: 2,
                            },
                            1024,
                          )
                        ),
                      ),
                      128,
                    )),
                  ]),
                  _: 1,
                },
              ),
              p(
                H,
                { class: "close_nav_ads", onCommand: e.setCloseAdsTime, trigger: "click" },
                {
                  default: h(() => [
                    n("span", un, o(e.$t("check.content.closeAdvertisement")), 1),
                    p(
                      W,
                      { slot: "dropdown" },
                      {
                        default: h(() => [
                          p(
                            $,
                            { command: 1, icon: "el-icon-check" },
                            {
                              default: h(() => [
                                P(o(e.$t("check.content.closeAdvertisementDay1")), 1),
                              ]),
                              _: 1,
                            },
                          ),
                          p(
                            $,
                            { command: 3, icon: "el-icon-check" },
                            {
                              default: h(() => [
                                P(o(e.$t("check.content.closeAdvertisementDay3")), 1),
                              ]),
                              _: 1,
                            },
                          ),
                          p(
                            $,
                            { command: 7, icon: "el-icon-check" },
                            {
                              default: h(() => [
                                P(o(e.$t("check.content.closeAdvertisementDay7")), 1),
                              ]),
                              _: 1,
                            },
                          ),
                        ]),
                        _: 1,
                      },
                    ),
                  ]),
                  _: 1,
                },
                8,
                ["onCommand"],
              ),
            ]))
          : v("", !0),
        n("div", pn, [
          e.websiteList && e.websiteList.length
            ? (c(), m("div", gn, [mn, n("div", fn, o(e.$t("check.content.used_web")), 1), _n]))
            : v("", !0),
          n("div", An, [
            (c(!0),
            m(
              J,
              null,
              U(
                e.websiteList,
                (g, f) => (
                  c(),
                  m("div", { key: f, class: "module__style_60" }, [
                    n("div", yn, o(g.name), 1),
                    n("div", Tn, [
                      (c(!0),
                      m(
                        J,
                        null,
                        U(
                          g.data,
                          (j, ue) => (
                            c(),
                            m("div", { key: ue, class: "item__style_63" }, [
                              n(
                                "span",
                                { onClick: (Jn) => e.openWebsite(j.website_url) },
                                o(j.name),
                                9,
                                kn,
                              ),
                            ])
                          ),
                        ),
                        128,
                      )),
                    ]),
                  ])
                ),
              ),
              128,
            )),
          ]),
        ]),
        p(
          de,
          {
            modelValue: e.showOpenMethodDialog,
            "onUpdate:modelValue": t[8] || (t[8] = (g) => (e.showOpenMethodDialog = g)),
            title: e.$t("check.content.open_method_setting"),
            width: "460px",
            class: "openMethodDialog",
          },
          {
            footer: h(() => [
              p(
                l,
                {
                  class: "openMethodCancelBtn",
                  onClick: t[7] || (t[7] = (g) => (e.showOpenMethodDialog = !1)),
                },
                { default: h(() => [P(o(e.$t("check.content.cancel")), 1)]), _: 1 },
              ),
              p(
                l,
                {
                  class: "openMethodConfirmBtn",
                  type: "primary",
                  loading: e.saveOpenMethodLoading,
                  onClick: e.saveOpenMethodSetting,
                },
                { default: h(() => [P(o(e.$t("check.content.query")), 1)]), _: 1 },
                8,
                ["loading", "onClick"],
              ),
            ]),
            default: h(() => [
              p(
                b,
                {
                  modelValue: e.openMethodFormValue,
                  "onUpdate:modelValue": t[6] || (t[6] = (g) => (e.openMethodFormValue = g)),
                  class: "openMethodRadioGroup",
                },
                {
                  default: h(() => [
                    p(
                      w,
                      { label: 2, class: "openMethodRadio" },
                      {
                        default: h(() => [P(o(e.$t("check.content.open_method_manual")), 1)]),
                        _: 1,
                      },
                    ),
                    p(
                      w,
                      { label: 1, class: "openMethodRadio openMethodRadioAuto" },
                      {
                        default: h(() => [
                          n("div", wn, [
                            n("div", vn, o(e.$t("check.content.open_method_auto")), 1),
                            e.mall?.has_one_platform?.link
                              ? (c(),
                                m(
                                  "div",
                                  {
                                    key: 0,
                                    class: "openMethodUrl",
                                    title: e.mall.has_one_platform.link,
                                  },
                                  o(e.mall.has_one_platform.link),
                                  9,
                                  Mn,
                                ))
                              : v("", !0),
                          ]),
                        ]),
                        _: 1,
                      },
                    ),
                    p(
                      w,
                      { label: 4, class: "openMethodRadio openMethodRadioAuto" },
                      {
                        default: h(() => [
                          n("div", Sn, [
                            n("div", Pn, o(e.$t("check.content.open_method_resume")), 1),
                            n("div", En, o(e.$t("check.content.open_method_resume_hint")), 1),
                          ]),
                        ]),
                        _: 1,
                      },
                    ),
                    p(
                      w,
                      { label: 3, class: "openMethodRadio openMethodRadioCustom" },
                      {
                        default: h(() => [
                          n("div", Cn, [
                            n("div", Ln, o(e.$t("check.content.open_method_custom")), 1),
                            e.openMethodFormValue === 3
                              ? (c(),
                                M(
                                  L,
                                  {
                                    key: 0,
                                    modelValue: e.jumpPagesDraft,
                                    "onUpdate:modelValue":
                                      t[5] || (t[5] = (g) => (e.jumpPagesDraft = g)),
                                    "mall-id": e.mallId,
                                    active: e.showOpenMethodDialog,
                                    onSaved: e.onJumpPagesSaved,
                                  },
                                  null,
                                  8,
                                  ["modelValue", "mall-id", "active", "onSaved"],
                                ))
                              : v("", !0),
                          ]),
                        ]),
                        _: 1,
                      },
                    ),
                  ]),
                  _: 1,
                },
                8,
                ["modelValue"],
              ),
            ]),
            _: 1,
          },
          8,
          ["modelValue", "title"],
        ),
      ]),
    ])
  );
}
const In = le(Ze, [
    ["render", bn],
    ["__scopeId", "data-v-fadd5fbc"],
  ]),
  Bn = te({
    __name: "App",
    setup(e) {
      return (t, s) => (c(), M(In));
    },
  }),
  Rn = _e(),
  z = fe(Bn);
for (const [e, t] of Object.entries(ve)) z.component(e, t);
z.use(Rn);
z.use(Me);
z.use(Se);
z.mount("#app");
