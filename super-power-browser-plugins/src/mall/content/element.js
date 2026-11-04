(function () {
  "use strict";
  const I = { event_type: { observe_disabled_element: "ObserveDisabledElement" } },
    m = new Set();
  let a = null;
  const f = "zf-helper-disabled-element",
    T = "限制操作",
    E = new WeakSet(),
    h = new Set();
  let L = !1,
    d = null,
    k = !1,
    y = 0,
    v = 0,
    w = 0;
  function D() {
    if (d) return d;
    const t = document.createElement("div");
    return (
      (t.id = "zf-helper-disabled-tooltip-host"),
      t.setAttribute("role", "tooltip"),
      Object.assign(t.style, {
        position: "fixed",
        left: "0",
        top: "0",
        zIndex: "2147483647",
        padding: "6px 10px",
        fontSize: "12px",
        lineHeight: "1.4",
        color: "#fff",
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
        borderRadius: "4px",
        pointerEvents: "none",
        display: "none",
        maxWidth: "240px",
        boxSizing: "border-box",
        fontFamily: "system-ui, sans-serif",
      }),
      (t.style.webkitBackdropFilter = "blur(8px)"),
      document.documentElement.appendChild(t),
      (d = t),
      t
    );
  }
  function _(t, e) {
    const n = D();
    let i = null,
      o = 1 / 0;
    for (const b of h) {
      if (!b.isConnected) {
        h.delete(b);
        continue;
      }
      const l = b.getBoundingClientRect();
      if (
        !(l.width <= 0 && l.height <= 0) &&
        t >= l.left &&
        t < l.right &&
        e >= l.top &&
        e < l.bottom
      ) {
        const z = l.width * l.height;
        z < o && ((o = z), (i = b));
      }
    }
    if (!i) {
      n.style.display = "none";
      return;
    }
    ((n.textContent = T), (n.style.display = "block"));
    const r = 12,
      s = 6;
    ((n.style.left = "0"), (n.style.top = "0"));
    const p = n.offsetWidth,
      x = n.offsetHeight;
    let c = t + r,
      u = e + r;
    (c + p + s > window.innerWidth && (c = t - p - r),
      u + x + s > window.innerHeight && (u = e - x - r),
      (c = Math.max(s, Math.min(c, window.innerWidth - p - s))),
      (u = Math.max(s, Math.min(u, window.innerHeight - x - s))),
      (n.style.left = `${c}px`),
      (n.style.top = `${u}px`));
  }
  function A() {
    if (k) return;
    k = !0;
    const t = (n) => {
      ((v = n.clientX),
        (w = n.clientY),
        !y &&
          (y = requestAnimationFrame(() => {
            ((y = 0), _(v, w));
          })));
    };
    document.addEventListener("pointermove", t, !0);
    const e = () => _(v, w);
    (window.addEventListener("scroll", e, !0),
      document.addEventListener("wheel", e, { passive: !0, capture: !0 }),
      window.addEventListener(
        "blur",
        () => {
          d && (d.style.display = "none");
        },
        !0,
      ));
  }
  function C(t) {
    if (E.has(t)) return;
    E.add(t);
    const e = (i) => {
        (i.preventDefault(), i.stopPropagation(), i.stopImmediatePropagation());
      },
      n = { capture: !0 };
    (t.addEventListener("pointerdown", e, n),
      t.addEventListener("mousedown", e, n),
      t.addEventListener("click", e, n));
  }
  function M(t) {
    if (t == null) return null;
    if (typeof t == "string") return t;
    const e =
      t.selector ??
      t.css_selector ??
      t.cssSelector ??
      t.element_selector ??
      t.elementInfo ??
      (typeof t.element == "string" ? t.element : null);
    return typeof e != "string" || !e.trim() ? null : S(e.trim()) || null;
  }
  function S(t) {
    const e = t
      .split(">")
      .map((s) => s.trim())
      .filter(Boolean);
    if (e.length < 2) return t;
    const n = e[e.length - 1].toLowerCase(),
      i = e[e.length - 2].toLowerCase(),
      o = /^span(\b|[.#[:])/.test(n),
      r = /^button(\b|[.#[:])/.test(i) || /^a(\b|[.#[:])/.test(i);
    return o && r ? e.slice(0, -1).join(" > ") : t;
  }
  function F(t) {
    return !(t instanceof HTMLElement) || t.matches("button, a")
      ? t
      : (t.closest("button, a") ?? t);
  }
  function H(t) {
    if ((a == null || a(), (a = null), t.size === 0)) return;
    const e = (o) => {
        const r = o.target;
        if (!(!r || !(r instanceof Element)))
          for (const s of t)
            try {
              if (r.closest(s)) {
                (o.preventDefault(), o.stopPropagation(), o.stopImmediatePropagation());
                return;
              }
            } catch {}
      },
      n = { capture: !0 };
    (document.addEventListener("pointerdown", e, n),
      document.addEventListener("mousedown", e, n),
      document.addEventListener("click", e, n));
    const i = new MutationObserver(() => {});
    (i.observe(document.documentElement, {
      childList: !0,
      subtree: !0,
      attributes: !0,
      attributeFilter: ["disabled", "class", "aria-disabled"],
    }),
      (a = () => {
        (document.removeEventListener("pointerdown", e, n),
          document.removeEventListener("mousedown", e, n),
          document.removeEventListener("click", e, n),
          i.disconnect());
      }));
  }
  function B() {
    if (L) return;
    const t = document.createElement("style");
    ((t.textContent = `
.${f} {
  opacity: 0.5 !important;
  cursor: not-allowed !important;
  pointer-events: none !important;
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  position: relative !important;
}
.${f}::after {
  content: '限制访问';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.5px;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
  background: rgba(0, 0, 0, 0.35);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  pointer-events: none;
  z-index: 2147483646;
}
`),
      document.documentElement.appendChild(t),
      (L = !0),
      A());
  }
  function P(t) {
    t instanceof HTMLElement &&
      (t.classList.contains(f) ||
        (t.classList.add(f),
        t.setAttribute("aria-disabled", "true"),
        "disabled" in t && (t.disabled = !0),
        h.add(t),
        C(t)));
  }
  function g(t, e = document) {
    for (const n of t)
      try {
        e.querySelectorAll(n).forEach((o) => P(F(o)));
      } catch {}
  }
  function O(t) {
    (B(), g(t));
    const e = new MutationObserver((i) => {
      for (const o of i)
        o.type === "childList"
          ? o.addedNodes.forEach((r) => {
              r instanceof Element && g(t, r);
            })
          : o.type === "attributes" && o.target instanceof Element && g(t, o.target);
    });
    e.observe(document.documentElement, {
      childList: !0,
      subtree: !0,
      attributes: !0,
      attributeFilter: ["class", "style", "disabled", "aria-disabled"],
    });
    const n = a;
    a = () => {
      (n == null || n(), e.disconnect());
    };
  }
  chrome.runtime.onMessage.addListener((t, e, n) => {
    var o;
    if (
      (console.log(
        "observe_disabled_element",
        (o = t == null ? void 0 : t.element) == null ? void 0 : o.elementInfo,
      ),
      (t == null ? void 0 : t.event_type) !== I.event_type.observe_disabled_element)
    )
      return;
    const i = M(t.element ?? t);
    return (i && (m.add(i), H(m), O(m)), n(), !0);
  });
})();
