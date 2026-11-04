const _ = {
  VUE_APP_BASE_NEW_API: "https://api.zhanfubrowser.com",
  VUE_APP_APM: "https://apm.zhanfubrowser.com",
  VUE_APP_ADMIN: "https://admin.zhanfubrowser.com",
  VUE_APP_ADMIN_OPEN: "https://admin.open.zhanfubrowser.com",
  VUE_APP_WSS: "wss://wss.zhanfubrowser.com",
  VUE_APP_MMS: "https://mms.zhanfubrowser.com",
  VUE_APP_MMS_NEW: "https://mms-new.zhanfubrowser.com",
  VUE_APP_GW_OPEN: "https://gw.open.zhanfubrowser.com",
  VUE_APP_EVAL: "https://eval.zhanfubrowser.com",
  VUE_APP_OPEN: "https://open.zhanfubrowser.com",
};
let r = {};
r = _;
const s = r,
  a = s.VUE_APP_MMS,
  c = (e) =>
    new Promise((n) => {
      chrome.cookies.set(
        {
          url: e.url || a,
          name: e.name,
          value: e.value || "",
          expirationDate: e.expirationDays ? Date.now() / 1e3 + e.expirationDays * 86400 : void 0,
          domain: e.domain,
          path: e.path || "/",
          secure: e.secure ?? !0,
          httpOnly: e.httpOnly ?? !1,
          sameSite: e.sameSite || "lax",
        },
        (o) => {
          n(!!o);
        },
      );
    }),
  h = (e) =>
    new Promise((n) => {
      chrome.cookies.get({ url: e.url || a, name: e.name }, (o) => {
        n(o?.value || null);
      });
    }),
  m = "get_chrome_cookie",
  l = s.VUE_APP_MMS;
function P(e) {
  const n = e.url ?? l,
    { name: o } = e;
  return typeof chrome > "u" || !chrome.runtime?.sendMessage
    ? Promise.resolve(null)
    : chrome.runtime
        .sendMessage({ type: m, url: n, name: o })
        .then((i) => i?.value ?? null)
        .catch(() => null);
}
const u = "chrome_token";
function f() {
  return typeof chrome < "u" && typeof chrome.cookies?.get == "function";
}
async function t(e) {
  return f() ? h(e) : P(e);
}
const w = "browserVersion";
async function E() {
  return await t({ name: w });
}
async function g() {
  return await t({ name: u });
}
async function A(e) {
  return await c({ name: u, value: e });
}
async function y() {
  return await t({ name: "lang" });
}
async function V(e) {
  return await c({ name: "lang", value: e });
}
export { m as G, g as a, V as b, E as c, y as g, A as s };
