import { _ as t, c as s, o as e, a as o, d as a, b as r, e as _ } from "../js/vendor-vue.js";
import { c as p } from "../js/vendor-pinia.js";
const i = {},
  m = o("span", null, "店铺管理助手", -1),
  u = [m];
function d(c, n) {
  return (e(), s("div", null, u));
}
const f = t(i, [["render", d]]),
  l = a({
    __name: "App",
    setup(c) {
      return (n, B) => (e(), r(f));
    },
  }),
  h = p();
_(l).use(h).mount("#app");
