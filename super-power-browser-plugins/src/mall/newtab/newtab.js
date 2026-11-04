import { _ as s, c as i, o as n, b as a, e as r } from "../js/vendor-vue.js";
import { i as m } from "../js/locales.js";
import "../js/auth.js";
const l = {
    name: "Newtab",
    data() {
      return { systemConfig: {} };
    },
    mounted() {
      ((document.title = this.$t("newtab.page_title")),
        chrome.storage.local.get(["systemConfig"], (e) => {
          (console.log("index pages", e),
            e.systemConfig &&
              ((this.systemConfig = e.systemConfig),
              (document.title = this.$t("newtab.page_title")),
              this.changeIcon(this.systemConfig.main_logo || "")));
        }));
    },
    methods: {
      changeIcon(e) {
        if (!e) return;
        const o = document.querySelector('link[rel="shortcut icon"]');
        o && document.head.removeChild(o);
        let t = document.querySelector('link[rel="icon"]');
        t !== null
          ? (t.href = e)
          : ((t = document.createElement("link")),
            (t.rel = "icon"),
            (t.href = e),
            document.head.appendChild(t));
      },
    },
  },
  p = { class: "login-container" };
function d(e, o, t, f, h, g) {
  return (n(), i("div", p));
}
const u = s(l, [["render", d]]),
  _ = {
    __name: "App",
    setup(e) {
      return (o, t) => (n(), a(u));
    },
  },
  c = r(_);
c.use(m);
c.mount("#app");
