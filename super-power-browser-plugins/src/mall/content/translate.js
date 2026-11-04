(function () {
  "use strict";
  console.log("====translate.js=====");
  let a = null,
    c = [],
    f = 0;
  async function d() {
    const e = document.querySelector("html"),
      t = window.setInterval(() => {
        (e.getAttribute("translate")
          ? (window.setTimeout(() => {
              var s;
              (console.log('=====移除 translate="no"'),
                (s = document.querySelector("html")) == null || s.removeAttribute("translate"));
            }, 2e3),
            t && clearInterval(t))
          : f > 30 && t && clearInterval(t),
          f++);
      }, 1e3);
    ((c = (await m()) || []),
      console.log("=====获取非翻译节点", c),
      u(),
      window.setInterval(() => {
        (a && a.disconnect(), u());
      }, 2e3));
  }
  d();
  async function m() {
    return new Promise((e, t) => {
      chrome.runtime.sendMessage({ type: "get_not_translate_doms" }, {}, (n) => {
        n && e(n);
      });
    });
  }
  function u() {
    const e = location.href;
    c.forEach((t) => {
      const n = t.site_flags,
        s = t.staticDoms || [],
        o = t.dynamicsDoms || [];
      n.every((r) => e.indexOf(r) > -1) &&
        (s.forEach((r) => {
          document.querySelectorAll(r).forEach((i) => {
            i.setAttribute("translate", "no");
          });
        }),
        o.length && h(o));
    });
  }
  function h(e) {
    a = new MutationObserver(function (n, s) {
      for (var o of n)
        o.type === "childList" &&
          o.addedNodes.length > 0 &&
          o.addedNodes.forEach(function (l) {
            l.nodeType === Node.ELEMENT_NODE &&
              e.forEach((r) => {
                document.querySelectorAll(r).forEach((i) => {
                  l == i && l.setAttribute("translate", "no");
                });
              });
          });
    });
    var t = { childList: !0, subtree: !0 };
    a.observe(document.body, t);
  }
})();
