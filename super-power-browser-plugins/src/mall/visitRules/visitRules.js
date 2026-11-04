import {
  _ as p,
  h as _,
  c as o,
  o as t,
  j as d,
  a as s,
  i as u,
  t as a,
  b as h,
  e as f,
} from "../js/vendor-vue.js";
import { g as i } from "../js/common.js";
import { i as g } from "../js/vendor-elements.js";
import { i as w } from "../js/locales.js";
import "../js/vendor-commonjs.js";
import "../js/auth.js";
const N = {
    data() {
      return { href: "", ruleName: "" };
    },
    watch: {},
    created() {},
    mounted() {
      ((this.href = i("rediectUrl")),
        console.log(location.search, this.href),
        (this.ruleName = i("ruleName")));
    },
    methods: {},
  },
  v = { class: "app-container" },
  k = { class: "warning-desc" },
  b = { class: "first-line" },
  $ = { class: "third-line", style: { "word-break": "break-word" } },
  B = { key: 0, class: "third-line" };
function y(e, c, l, C, r, j) {
  const m = _("el-image");
  return (
    t(),
    o("div", v, [
      d(m, { class: "warning-img", src: "../../../icons/warn.png" }),
      s("div", k, [
        s(
          "div",
          b,
          a(
            r.ruleName == "temu"
              ? e.$t("warning.abnormal_application_tip")
              : e.$t("warning.abnormal_access"),
          ),
          1,
        ),
        s("div", $, [s("span", null, a(e.$t("warning.address")) + a(r.href), 1)]),
        r.ruleName != "temu"
          ? (t(), o("div", B, [s("span", null, a(e.$t("warning.ruleName")) + a(r.ruleName), 1)]))
          : u("", !0),
      ]),
    ])
  );
}
const V = p(N, [
    ["render", y],
    ["__scopeId", "data-v-6a023df9"],
  ]),
  A = {
    __name: "App",
    setup(e) {
      return (c, l) => (t(), h(V));
    },
  },
  n = f(A);
n.use(g);
n.use(w);
n.mount("#app");
