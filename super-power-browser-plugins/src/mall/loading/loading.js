import {
  _ as c,
  c as d,
  o as i,
  s as r,
  a as s,
  t as n,
  b as l,
  e as p,
} from "../js/vendor-vue.js";
import { i as m } from "../js/locales.js";
import "../js/auth.js";
const g = {
    name: "Loading",
    data() {
      return { systemConfig: {} };
    },
    mounted() {
      ((document.title = this.$t("loading.loading")),
        chrome.storage.local.get(["systemConfig"], (e) => {
          (console.log("index pages", e),
            e.systemConfig &&
              ((this.systemConfig = e.systemConfig),
              (document.title = this.$t("loading.loading")),
              this.changeIcon(this.systemConfig.main_logo || "")));
        }));
    },
    methods: {
      changeIcon(e) {
        if (!e) return;
        const t = document.querySelector('link[rel="shortcut icon"]');
        t && document.head.removeChild(t);
        let o = document.querySelector('link[rel="icon"]');
        o !== null
          ? (o.href = e)
          : ((o = document.createElement("link")),
            (o.rel = "icon"),
            (o.href = e),
            document.head.appendChild(o));
      },
    },
  },
  _ = { class: "loader-container" },
  h = r(
    '<div class="spinner"><div class="spinner-dot"></div><div class="spinner-dot"></div><div class="spinner-dot"></div><div class="spinner-dot"></div></div>',
    1,
  ),
  u = { id: "loadingText" },
  f = s("div", { class: "loader" }, null, -1),
  v = { class: "progress-text", id: "progressText" };
function $(e, t, o, x, k, B) {
  return (
    i(),
    d("div", _, [
      h,
      s("h1", u, n(e.$t("loading.loading")), 1),
      f,
      s("p", v, n(e.$t("loading.progress")), 1),
    ])
  );
}
const y = c(g, [["render", $]]),
  C = {
    __name: "App",
    setup(e) {
      return (t, o) => (i(), l(y));
    },
  },
  a = p(C);
a.use(m);
a.mount("#app");
