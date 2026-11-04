(function () {
  "use strict";
  const l = {
    event_type: {
      message_tip: "messageTip",
      flash_window: "FlashWindow",
      play_video_mp3: "PlayVideoMp3",
    },
    tipUrl: [
      "gsp.aliexpress.com",
      ".shopee",
      "kwaixiaodian.com",
      "jinritemai.com",
      "sellercenter.lazada",
    ],
  };
  function v() {
    try {
      return window.localStorage.getItem("isDebugger") === "1";
    } catch {
      return !1;
    }
  }
  function n(...s) {
    v() && console.log("[ZF MessageTip]", ...s);
  }
  const _ = window.location.href,
    p = l.tipUrl,
    g = p.findIndex((s) => _.includes(s));
  if (g > -1) {
    let s = function () {
        const e = Date.now();
        e - f < M ||
          ((f = e),
          chrome.runtime.sendMessage({ event_type: l.event_type.flash_window }, {}, (t) => {
            n("flash_window", t);
          }));
      },
      c = function () {
        f = 0;
      },
      x = function () {
        switch (p[g]) {
          case "gsp.aliexpress.com":
            y();
            break;
          case ".shopee":
            b();
            break;
          case "kwaixiaodian.com":
            w();
            break;
          case "jinritemai.com":
            S();
            break;
          case "sellercenter.lazada":
            T();
            break;
        }
      },
      y = function () {
        (n("当前为速卖通消息提示"),
          setInterval(() => {
            const e = document.querySelectorAll(".session-item");
            let t = !1;
            for (let o = 0; o < e.length; o++)
              e[o].querySelector(".badge") &&
                parseInt(e[o].querySelector(".badge").innerHTML) > 0 &&
                (t = !0);
            (n("是否存在新消息", t),
              t && (i || (n("响铃提示", t), d()), (i = !0), s()),
              t || ((i = !1), c()));
          }, 5e3));
      },
      b = function () {
        (n("当前为shoppe店铺消息提示"),
          setInterval(() => {
            let e = null;
            const t = document.querySelectorAll(
              ".panel-item-container .panel-item-tooltip .eds-popover__ref",
            );
            t &&
              t.length &&
              t[2] &&
              (e =
                t[2].querySelector(".panel-item>div>div>div>font>font") ||
                t[2].querySelector(".panel-item>div>div>div"));
            let o = e ? e.innerText : 0;
            (
              document.querySelectorAll(
                ".ReactVirtualized__Grid__innerScrollContainer>div>div>div>div>div>div",
              ) || []
            ).forEach((r) => {
              r && r.innerText > 0 && r.innerText < 999 && (o = r.innerText);
            });
            const a = !1,
              m = parseInt(o) || 0;
            (n("是否存在新消息", m > 0),
              m > 0 && (i || (n("响铃提示", a), d(), (i = !0)), s()),
              m === 0 && ((i = !1), c()));
          }, 5e3));
      },
      w = function () {
        (n("当前为快手店铺消息提示"),
          setInterval(() => {
            const t = document
              .querySelector('[tabindex="0"].ant-tabs-tab-btn')
              .querySelectorAll(".ant-tabs-tab-btn>div>div");
            if (t.length && t[0].innerText > 0) {
              const o = parseInt(t[0].innerText) || 0;
              (n("是否存在新消息", o > 0), u(o));
            }
          }, 5e3));
      },
      S = function () {
        (n("当前为抖音店铺消息提示"),
          setInterval(() => {
            const e =
              document.querySelector('[data-show="true"].auxo-scroll-number.auxo-badge-count') ?? 0;
            e && e.title > 0 && (u(e.title), n("是否存在新消息", e.title));
          }, 5e3));
      },
      T = function () {
        setInterval(() => {
          let e = 0;
          const t = document.querySelectorAll('[data-spm="im_session_item"]');
          t &&
            t.length &&
            t.forEach((h) => {
              const a = h.querySelectorAll(".next-box>.next-box>.next-box>.next-box>div");
              a && a[1] && a[1].innerText > 0 && (e = a[1].innerText);
            });
          const o = document.querySelector('[data-spm="d_im_count_icon"]');
          (o &&
            o.title &&
            o.title.match(/\d+/) &&
            o.title.match(/\d+/)[0] > 0 &&
            (e = o.title.match(/\d+/)[0]),
            n("是否存在新消息", e > 0),
            u(e));
        }, 5e3);
      },
      u = function (e) {
        (e > 0 && (i || (d(), (i = !0)), s()), e === 0 && ((i = !1), c()));
      },
      d = function () {
        (n("playAudio"),
          chrome.runtime.sendMessage({ event_type: l.event_type.play_video_mp3 }, {}, (e) => {
            n("remind", e);
          }));
      },
      i = !1;
    const M = 1e4;
    let f = 0;
    chrome.runtime.sendMessage({ event_type: l.event_type.message_tip }, {}, (e) => {
      e.showMessage ? (n("开启消息提示"), x()) : n("关闭消息提示");
    });
  }
})();
