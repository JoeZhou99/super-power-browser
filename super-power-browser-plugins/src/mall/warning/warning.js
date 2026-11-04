import {
  _ as C,
  h as p,
  c,
  o as r,
  s as A,
  a as i,
  t,
  j as v,
  i as y,
  m as d,
  A as I,
  b as g,
  k as m,
  v as S,
  x as L,
  e as B,
} from "../js/vendor-vue.js";
import { m as h } from "../js/api.js";
import { c as w, g as k } from "../js/common.js";
import { i as U } from "../js/vendor-elements.js";
import { i as $ } from "../js/locales.js";
import "../js/auth.js";
import "../js/vendor-commonjs.js";
const N = "/assets/rz-B_nyHGUT.png",
  J = {
    data() {
      return {
        rz: N,
        href: "",
        dialogVisible: !1,
        authInfo: {},
        reason: "",
        isAllow: !0,
        disabled: !0,
        status: 0,
        __url: "",
        loading: !0,
        chromiumVersion: 0,
      };
    },
    watch: {},
    created() {},
    async mounted() {
      ((this.href = k("rediectUrl") || k("specialurl")), await this.getAuditStatusFun());
      let e = this.href,
        s = (this.url = decodeURIComponent(e.split("?")[0]));
      (console.log("rediectUrl", e),
        s &&
          this.isAllow &&
          this.getInitJson(async () => {
            if (
              (this.is513 && (await this.isUrlInBlackList(s), console.log("isAllow", this.isAllow)),
              !this.isAllow)
            ) {
              this.loading = !1;
              return;
            }
            this.getCheckStatus();
          }));
    },
    methods: {
      async getCheckStatus() {
        const e = {
            url: this.url,
            ip_scene: this.ip_scene,
            is_new: this.is513 ? 1 : 2,
            is_auto_review: 1,
          },
          s = await h.reviewReasonV2(e);
        ((this.loading = !1), console.log("reviewReasonV2", s), (this.reason = s.data.reason));
        const n = (this.status = s.data.status);
        return (
          n === 1
            ? (this.disabled = !0)
            : n === 2
              ? ((this.disabled = !0),
                this.canAutoAddBlockList() && ((this.loading = !0), this.addBlockList()))
              : n === 3
                ? (this.disabled = !0)
                : n === 4
                  ? ((this.disabled = !0),
                    this.canAutoAddBlockList() && ((this.loading = !0), this.addBlockList()))
                  : (this.disabled = !1),
          this.disabled
        );
      },
      addBlockList(e) {
        const s = [new URL(this.url).hostname];
        (console.log("添加特例名单", s),
          chrome.runtime.sendMessage(
            {
              type: w.event_type.add_block_list,
              list: s,
              rediectUrl: decodeURIComponent(this.href),
            },
            {},
            (n) => {
              console.log("添加特例名单结果：", n);
            },
          ));
      },
      getInitJson(e) {
        chrome.runtime.sendMessage({ type: w.event_type.get_init_data }, {}, (s) => {
          s &&
            ((this.initJson = s),
            console.log("InitJson data：", this.initJson),
            (this.appVersion = this.initJson?.appVersion),
            (this.ip_scene = this.initJson?.ip_scene || "all"),
            (this.chromiumVersion = this.resolveChromiumVersion()),
            (this.is513 = !0),
            e && e());
        });
      },
      canAutoAddBlockList() {
        return R(this.appVersion, "5.2.4") > 0 && Number(this.chromiumVersion) > 130;
      },
      resolveChromiumVersion() {
        const e = this.initJson?.commonParams?.chromiumVersion;
        return e != null && e !== "" ? Number(e) || 0 : this.getChromiumVersionFromUA();
      },
      getChromiumVersionFromUA() {
        const s = (navigator.userAgent || "").match(/(?:Chrome|Chromium)\/(\d+)/i);
        return s ? Number(s[1]) : 0;
      },
      handleClick() {
        const e = { type: "OPEN_MMS_SETUP", path: "/company/authentication" };
        chrome.runtime.sendMessage(e, (s) => {
          console.log("收到来自后台的回复：", s);
        });
      },
      async isUrlInBlackList(e) {
        try {
          console.log("inBlackList", e);
          const s = await h.inBlackList({ url: e });
          (console.log("inBlackList", s), (this.isAllow = !s.data.status));
        } catch (s) {
          console.error("Invalid URL:", s);
        }
      },
      refresh() {
        (location.reload(), console.log("刷新"));
      },
      copyLick(e) {
        console.log("copy");
        const s = document.createElement("input");
        (document.body.appendChild(s),
          (s.value = e),
          s.select(),
          document.execCommand("copy") && document.execCommand("copy"),
          s.blur(),
          this.$message({ message: this.$t("popup.success"), type: "success" }),
          document.body.removeChild(s));
      },
      async apllyWhiteList() {
        if (
          (console.log("this.authInfo", this.authInfo),
          this.authInfo &&
            this.authInfo.legal_person_api_valid !== 2 &&
            this.authInfo.fdd_user_status !== 2)
        ) {
          (console.log("去认证"), (this.dialogVisible = !0));
          return;
        } else this.dialogVisible = !1;
        if (await this.getCheckStatus()) {
          console.log("已经申请过白名单，无需重复申请");
          return;
        }
        const s = decodeURIComponent(this.url);
        console.log("url", s);
        const n = { url: s, ip_scene: this.ip_scene, is_new: this.is513 ? 1 : 2 };
        h.applyWhiteV2(n)
          .then((l) => {
            this.getCheckStatus();
          })
          .catch(() => {
            this.$message({ type: "error", message: this.$t("warning.unsuccessful") });
          });
      },
      async getAuditStatusFun() {
        try {
          const e = await h.getAuditStatus();
          (console.log("getAuditStatusFun-请求认证数据", e), (this.authInfo = e.data));
        } catch {}
      },
    },
  },
  R = (e = "5.0.0", s) => {
    if (e === s) return 0;
    const n = e.split(".").map((a) => parseInt(a)),
      l = s.split(".").map((a) => parseInt(a)),
      o = Math.min(n.length, l.length);
    for (let a = 0; a < o; a++) {
      if (n[a] > l[a]) return 1;
      if (n[a] < l[a]) return -1;
    }
    return o === n.length ? -1 : 1;
  },
  z = (e) => (S("data-v-1a95e069"), (e = e()), L(), e),
  M = {
    style: {
      width: "100%",
      height: "100vh",
      display: "flex",
      "align-items": "center",
      "justify-content": "center",
    },
  },
  F = { key: 0, class: "loader-container" },
  W = A(
    '<div class="spinner" data-v-1a95e069><div class="spinner-dot" data-v-1a95e069></div><div class="spinner-dot" data-v-1a95e069></div><div class="spinner-dot" data-v-1a95e069></div><div class="spinner-dot" data-v-1a95e069></div></div>',
    1,
  ),
  j = { id: "loadingText" },
  E = z(() => i("div", { class: "loader" }, null, -1)),
  P = { key: 1, class: "app-container" },
  T = { class: "warning-desc" },
  D = { class: "first-line" },
  G = { class: "third-line" },
  H = { class: "second-line" },
  O = { class: "third-line" },
  q = { class: "third-line", style: { "word-break": "break-word" } },
  K = { key: 0, class: "third-line", style: { color: "red" } },
  Q = { class: "third-line aplly" },
  X = { class: "dialog-content" },
  Y = { style: { color: "red" } },
  Z = { style: { color: "red" } },
  x = { style: { "font-weight": "bold", "font-size": "16px", width: "100%", "margin-top": "5px" } };
function ee(e, s, n, l, o, a) {
  const b = p("el-image"),
    f = p("el-button"),
    V = p("el-dialog");
  return (
    r(),
    c("div", M, [
      o.loading
        ? (r(), c("div", F, [W, i("h1", j, t(e.$t("loading.checking")), 1), E]))
        : (r(),
          c("div", P, [
            v(b, { class: "warning-img", src: "../../../icons/warn.png" }),
            i("div", T, [
              i("div", D, t(e.$t("warning.abnormal_environment")), 1),
              i("div", G, t(e.$t("warning.abnormal_application")), 1),
              i("div", H, t(e.$t("warning.prompt_to_restart")), 1),
              i("div", O, t(e.$t("warning.abnormal_website")), 1),
              i("div", q, [
                d(t(e.$t("warning.abnormal_access")) + t(o.href) + " ", 1),
                i(
                  "span",
                  { class: "url-op", onClick: s[0] || (s[0] = (u) => a.copyLick(o.href)) },
                  t(e.$t("warning.copy")),
                  1,
                ),
                i(
                  "span",
                  { class: "url-op", onClick: s[1] || (s[1] = (u) => a.refresh()) },
                  t(e.$t("popup.refresh")),
                  1,
                ),
              ]),
              o.isAllow ? y("", !0) : (r(), c("div", K, t(e.$t("warning.error_message")), 1)),
              o.reason != ""
                ? (r(),
                  c(
                    "div",
                    {
                      key: 1,
                      class: "third-line",
                      style: I({
                        fontWeight: "bold",
                        color:
                          o.status == 2 || o.status == 4
                            ? "green"
                            : o.status == 3
                              ? "red"
                              : "black",
                      }),
                    },
                    t(e.$t("warning.check_status")) + t(o.reason),
                    5,
                  ))
                : y("", !0),
              i("div", Q, [
                o.isAllow && !o.disabled
                  ? (r(),
                    g(
                      f,
                      {
                        key: 0,
                        size: "mini",
                        type: "primary",
                        href: "javaScript:void(0);",
                        onClick: a.apllyWhiteList,
                      },
                      { default: m(() => [d(t(e.$t("warning.add_whitelist")), 1)]), _: 1 },
                      8,
                      ["onClick"],
                    ))
                  : (r(),
                    g(
                      f,
                      {
                        key: 1,
                        size: "mini",
                        type: "primary",
                        href: "javaScript:void(0);",
                        disabled: "",
                      },
                      { default: m(() => [d(t(e.$t("warning.add_whitelist")), 1)]), _: 1 },
                    )),
              ]),
            ]),
            v(
              V,
              {
                title: e.$t("warning.certification_reminder"),
                modelValue: o.dialogVisible,
                "onUpdate:modelValue": s[2] || (s[2] = (u) => (o.dialogVisible = u)),
                "close-on-click-modal": !1,
                "append-to-body": !0,
                width: "400px",
                class: "dialog-style",
              },
              {
                default: m(() => [
                  i("div", X, [
                    i("p", null, [
                      i("span", Y, t(e.$t("warning.certification_message1")), 1),
                      d(t(e.$t("warning.certification_message2")), 1),
                      i("span", Z, t(e.$t("warning.certification_message3")), 1),
                    ]),
                    i("p", x, [i("span", null, t(e.$t("warning.certification_tips")), 1)]),
                  ]),
                ]),
                _: 1,
              },
              8,
              ["title", "modelValue"],
            ),
          ])),
    ])
  );
}
const se = C(J, [
    ["render", ee],
    ["__scopeId", "data-v-1a95e069"],
  ]),
  te = {
    __name: "App",
    setup(e) {
      return (s, n) => (r(), g(se));
    },
  },
  _ = B(te);
_.use(U);
_.use($);
_.mount("#app");
