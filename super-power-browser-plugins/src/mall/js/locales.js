import {
  y as Rn,
  r as Mn,
  K as Un,
  f as Le,
  w as rt,
  O as xn,
  d as pt,
  B as Ie,
  an as sn,
  C as Wn,
  g as $n,
  a2 as Bn,
  F as on,
  j as Vn,
  a9 as Yn,
} from "./vendor-vue.js";
import { g as Hn } from "./auth.js";
var jn = {
  name: "en",
  el: {
    breadcrumb: { label: "Breadcrumb" },
    colorpicker: {
      confirm: "OK",
      clear: "Clear",
      defaultLabel: "color picker",
      description: "current color is {color}. press enter to select a new color.",
      alphaLabel: "pick alpha value",
    },
    datepicker: {
      now: "Now",
      today: "Today",
      cancel: "Cancel",
      clear: "Clear",
      confirm: "OK",
      dateTablePrompt: "Use the arrow keys and enter to select the day of the month",
      monthTablePrompt: "Use the arrow keys and enter to select the month",
      yearTablePrompt: "Use the arrow keys and enter to select the year",
      selectedDate: "Selected date",
      selectDate: "Select date",
      selectTime: "Select time",
      startDate: "Start Date",
      startTime: "Start Time",
      endDate: "End Date",
      endTime: "End Time",
      prevYear: "Previous Year",
      nextYear: "Next Year",
      prevMonth: "Previous Month",
      nextMonth: "Next Month",
      year: "",
      month1: "January",
      month2: "February",
      month3: "March",
      month4: "April",
      month5: "May",
      month6: "June",
      month7: "July",
      month8: "August",
      month9: "September",
      month10: "October",
      month11: "November",
      month12: "December",
      week: "week",
      weeks: { sun: "Sun", mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat" },
      weeksFull: {
        sun: "Sunday",
        mon: "Monday",
        tue: "Tuesday",
        wed: "Wednesday",
        thu: "Thursday",
        fri: "Friday",
        sat: "Saturday",
      },
      months: {
        jan: "Jan",
        feb: "Feb",
        mar: "Mar",
        apr: "Apr",
        may: "May",
        jun: "Jun",
        jul: "Jul",
        aug: "Aug",
        sep: "Sep",
        oct: "Oct",
        nov: "Nov",
        dec: "Dec",
      },
    },
    inputNumber: { decrease: "decrease number", increase: "increase number" },
    select: {
      loading: "Loading",
      noMatch: "No matching data",
      noData: "No data",
      placeholder: "Select",
    },
    mention: { loading: "Loading" },
    dropdown: { toggleDropdown: "Toggle Dropdown" },
    cascader: {
      noMatch: "No matching data",
      loading: "Loading",
      placeholder: "Select",
      noData: "No data",
    },
    pagination: {
      goto: "Go to",
      pagesize: "/page",
      total: "Total {total}",
      pageClassifier: "",
      page: "Page",
      prev: "Go to previous page",
      next: "Go to next page",
      currentPage: "page {pager}",
      prevPages: "Previous {pager} pages",
      nextPages: "Next {pager} pages",
      deprecationWarning:
        "Deprecated usages detected, please refer to the el-pagination documentation for more details",
    },
    dialog: { close: "Close this dialog" },
    drawer: { close: "Close this dialog" },
    messagebox: {
      title: "Message",
      confirm: "OK",
      cancel: "Cancel",
      error: "Illegal input",
      close: "Close this dialog",
    },
    upload: {
      deleteTip: "press delete to remove",
      delete: "Delete",
      preview: "Preview",
      continue: "Continue",
    },
    slider: {
      defaultLabel: "slider between {min} and {max}",
      defaultRangeStartLabel: "pick start value",
      defaultRangeEndLabel: "pick end value",
    },
    table: {
      emptyText: "No Data",
      confirmFilter: "Confirm",
      resetFilter: "Reset",
      clearFilter: "All",
      sumText: "Sum",
    },
    tour: { next: "Next", previous: "Previous", finish: "Finish" },
    tree: { emptyText: "No Data" },
    transfer: {
      noMatch: "No matching data",
      noData: "No data",
      titles: ["List 1", "List 2"],
      filterPlaceholder: "Enter keyword",
      noCheckedFormat: "{total} items",
      hasCheckedFormat: "{checked}/{total} checked",
    },
    image: { error: "FAILED" },
    pageHeader: { title: "Back" },
    popconfirm: { confirmButtonText: "Yes", cancelButtonText: "No" },
    carousel: {
      leftArrow: "Carousel arrow left",
      rightArrow: "Carousel arrow right",
      indicator: "Carousel switch to index {index}",
    },
  },
};
/*!
 * shared v11.1.7
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ const Me = typeof window < "u",
  le = (e, t = !1) => (t ? Symbol.for(e) : Symbol(e)),
  Gn = (e, t, n) => Kn({ l: e, k: t, s: n }),
  Kn = (e) =>
    JSON.stringify(e)
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029")
      .replace(/\u0027/g, "\\u0027"),
  H = (e) => typeof e == "number" && isFinite(e),
  Xn = (e) => ht(e) === "[object Date]",
  ge = (e) => ht(e) === "[object RegExp]",
  Ue = (e) => S(e) && Object.keys(e).length === 0,
  j = Object.assign,
  Jn = Object.create,
  M = (e = null) => Jn(e);
let vt;
const fe = () =>
  vt ||
  (vt =
    typeof globalThis < "u"
      ? globalThis
      : typeof self < "u"
        ? self
        : typeof window < "u"
          ? window
          : typeof global < "u"
            ? global
            : M());
function Ft(e) {
  return e
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
const qn = Object.prototype.hasOwnProperty;
function z(e, t) {
  return qn.call(e, t);
}
const B = Array.isArray,
  W = (e) => typeof e == "function",
  N = (e) => typeof e == "string",
  O = (e) => typeof e == "boolean",
  w = (e) => e !== null && typeof e == "object",
  Qn = (e) => w(e) && W(e.then) && W(e.catch),
  ln = Object.prototype.toString,
  ht = (e) => ln.call(e),
  S = (e) => ht(e) === "[object Object]",
  Zn = (e) =>
    e == null ? "" : B(e) || (S(e) && e.toString === ln) ? JSON.stringify(e, null, 2) : String(e);
function gt(e, t = "") {
  return e.reduce((n, a, r) => (r === 0 ? n + a : n + t + a), "");
}
function zn(e, t) {
  typeof console < "u" && (console.warn("[intlify] " + e), t && console.warn(t.stack));
}
const Se = (e) => !w(e) || B(e);
function Re(e, t) {
  if (Se(e) || Se(t)) throw new Error("Invalid value");
  const n = [{ src: e, des: t }];
  for (; n.length;) {
    const { src: a, des: r } = n.pop();
    Object.keys(a).forEach((s) => {
      s !== "__proto__" &&
        (w(a[s]) && !w(r[s]) && (r[s] = Array.isArray(a[s]) ? [] : M()),
        Se(r[s]) || Se(a[s]) ? (r[s] = a[s]) : n.push({ src: a[s], des: r[s] }));
    });
  }
}
/*!
 * message-compiler v11.1.7
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ function ea(e, t, n) {
  return { line: e, column: t, offset: n };
}
function st(e, t, n) {
  return { start: e, end: t };
}
const R = {
    EXPECTED_TOKEN: 1,
    INVALID_TOKEN_IN_PLACEHOLDER: 2,
    UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER: 3,
    UNKNOWN_ESCAPE_SEQUENCE: 4,
    INVALID_UNICODE_ESCAPE_SEQUENCE: 5,
    UNBALANCED_CLOSING_BRACE: 6,
    UNTERMINATED_CLOSING_BRACE: 7,
    EMPTY_PLACEHOLDER: 8,
    NOT_ALLOW_NEST_PLACEHOLDER: 9,
    INVALID_LINKED_FORMAT: 10,
    MUST_HAVE_MESSAGES_IN_PLURAL: 11,
    UNEXPECTED_EMPTY_LINKED_MODIFIER: 12,
    UNEXPECTED_EMPTY_LINKED_KEY: 13,
    UNEXPECTED_LEXICAL_ANALYSIS: 14,
  },
  ta = 17;
function xe(e, t, n = {}) {
  const { domain: a, messages: r, args: s } = n,
    i = e,
    c = new SyntaxError(String(i));
  return ((c.code = e), t && (c.location = t), (c.domain = a), c);
}
function na(e) {
  throw e;
}
const ae = " ",
  aa = "\r",
  K = `
`,
  ra = "\u2028",
  sa = "\u2029";
function oa(e) {
  const t = e;
  let n = 0,
    a = 1,
    r = 1,
    s = 0;
  const i = (E) => t[E] === aa && t[E + 1] === K,
    c = (E) => t[E] === K,
    f = (E) => t[E] === sa,
    d = (E) => t[E] === ra,
    T = (E) => i(E) || c(E) || f(E) || d(E),
    b = () => n,
    y = () => a,
    v = () => r,
    P = () => s,
    k = (E) => (i(E) || f(E) || d(E) ? K : t[E]),
    F = () => k(n),
    u = () => k(n + s);
  function h() {
    return ((s = 0), T(n) && (a++, (r = 0)), i(n) && n++, n++, r++, t[n]);
  }
  function L() {
    return (i(n + s) && s++, s++, t[n + s]);
  }
  function m() {
    ((n = 0), (a = 1), (r = 1), (s = 0));
  }
  function I(E = 0) {
    s = E;
  }
  function C() {
    const E = n + s;
    for (; E !== n;) h();
    s = 0;
  }
  return {
    index: b,
    line: y,
    column: v,
    peekOffset: P,
    charAt: k,
    currentChar: F,
    currentPeek: u,
    next: h,
    peek: L,
    reset: m,
    resetPeek: I,
    skipToPeek: C,
  };
}
const oe = void 0,
  la = ".",
  At = "'",
  ia = "tokenizer";
function ca(e, t = {}) {
  const n = t.location !== !1,
    a = oa(e),
    r = () => a.index(),
    s = () => ea(a.line(), a.column(), a.index()),
    i = s(),
    c = r(),
    f = {
      currentType: 13,
      offset: c,
      startLoc: i,
      endLoc: i,
      lastType: 13,
      lastOffset: c,
      lastStartLoc: i,
      lastEndLoc: i,
      braceNest: 0,
      inLinked: !1,
      text: "",
    },
    d = () => f,
    { onError: T } = t;
  function b(o, l, p, ...A) {
    const V = d();
    if (((l.column += p), (l.offset += p), T)) {
      const D = n ? st(V.startLoc, l) : null,
        _ = xe(o, D, { domain: ia, args: A });
      T(_);
    }
  }
  function y(o, l, p) {
    ((o.endLoc = s()), (o.currentType = l));
    const A = { type: l };
    return (n && (A.loc = st(o.startLoc, o.endLoc)), p != null && (A.value = p), A);
  }
  const v = (o) => y(o, 13);
  function P(o, l) {
    return o.currentChar() === l ? (o.next(), l) : (b(R.EXPECTED_TOKEN, s(), 0, l), "");
  }
  function k(o) {
    let l = "";
    for (; o.currentPeek() === ae || o.currentPeek() === K;) ((l += o.currentPeek()), o.peek());
    return l;
  }
  function F(o) {
    const l = k(o);
    return (o.skipToPeek(), l);
  }
  function u(o) {
    if (o === oe) return !1;
    const l = o.charCodeAt(0);
    return (l >= 97 && l <= 122) || (l >= 65 && l <= 90) || l === 95;
  }
  function h(o) {
    if (o === oe) return !1;
    const l = o.charCodeAt(0);
    return l >= 48 && l <= 57;
  }
  function L(o, l) {
    const { currentType: p } = l;
    if (p !== 2) return !1;
    k(o);
    const A = u(o.currentPeek());
    return (o.resetPeek(), A);
  }
  function m(o, l) {
    const { currentType: p } = l;
    if (p !== 2) return !1;
    k(o);
    const A = o.currentPeek() === "-" ? o.peek() : o.currentPeek(),
      V = h(A);
    return (o.resetPeek(), V);
  }
  function I(o, l) {
    const { currentType: p } = l;
    if (p !== 2) return !1;
    k(o);
    const A = o.currentPeek() === At;
    return (o.resetPeek(), A);
  }
  function C(o, l) {
    const { currentType: p } = l;
    if (p !== 7) return !1;
    k(o);
    const A = o.currentPeek() === ".";
    return (o.resetPeek(), A);
  }
  function E(o, l) {
    const { currentType: p } = l;
    if (p !== 8) return !1;
    k(o);
    const A = u(o.currentPeek());
    return (o.resetPeek(), A);
  }
  function x(o, l) {
    const { currentType: p } = l;
    if (!(p === 7 || p === 11)) return !1;
    k(o);
    const A = o.currentPeek() === ":";
    return (o.resetPeek(), A);
  }
  function $(o, l) {
    const { currentType: p } = l;
    if (p !== 9) return !1;
    const A = () => {
        const D = o.currentPeek();
        return D === "{"
          ? u(o.peek())
          : D === "@" || D === "|" || D === ":" || D === "." || D === ae || !D
            ? !1
            : D === K
              ? (o.peek(), A())
              : Z(o, !1);
      },
      V = A();
    return (o.resetPeek(), V);
  }
  function J(o) {
    k(o);
    const l = o.currentPeek() === "|";
    return (o.resetPeek(), l);
  }
  function Z(o, l = !0) {
    const p = (V = !1, D = "") => {
        const _ = o.currentPeek();
        return _ === "{" || _ === "@" || !_
          ? V
          : _ === "|"
            ? !(D === ae || D === K)
            : _ === ae
              ? (o.peek(), p(!0, ae))
              : _ === K
                ? (o.peek(), p(!0, K))
                : !0;
      },
      A = p();
    return (l && o.resetPeek(), A);
  }
  function G(o, l) {
    const p = o.currentChar();
    return p === oe ? oe : l(p) ? (o.next(), p) : null;
  }
  function _e(o) {
    const l = o.charCodeAt(0);
    return (
      (l >= 97 && l <= 122) || (l >= 65 && l <= 90) || (l >= 48 && l <= 57) || l === 95 || l === 36
    );
  }
  function $e(o) {
    return G(o, _e);
  }
  function Be(o) {
    const l = o.charCodeAt(0);
    return (
      (l >= 97 && l <= 122) ||
      (l >= 65 && l <= 90) ||
      (l >= 48 && l <= 57) ||
      l === 95 ||
      l === 36 ||
      l === 45
    );
  }
  function Ve(o) {
    return G(o, Be);
  }
  function Ye(o) {
    const l = o.charCodeAt(0);
    return l >= 48 && l <= 57;
  }
  function He(o) {
    return G(o, Ye);
  }
  function ne(o) {
    const l = o.charCodeAt(0);
    return (l >= 48 && l <= 57) || (l >= 65 && l <= 70) || (l >= 97 && l <= 102);
  }
  function Fe(o) {
    return G(o, ne);
  }
  function Ae(o) {
    let l = "",
      p = "";
    for (; (l = He(o));) p += l;
    return p;
  }
  function je(o) {
    let l = "";
    for (;;) {
      const p = o.currentChar();
      if (p === "{" || p === "}" || p === "@" || p === "|" || !p) break;
      if (p === ae || p === K)
        if (Z(o)) ((l += p), o.next());
        else {
          if (J(o)) break;
          ((l += p), o.next());
        }
      else ((l += p), o.next());
    }
    return l;
  }
  function Ge(o) {
    F(o);
    let l = "",
      p = "";
    for (; (l = Ve(o));) p += l;
    return (o.currentChar() === oe && b(R.UNTERMINATED_CLOSING_BRACE, s(), 0), p);
  }
  function Ke(o) {
    F(o);
    let l = "";
    return (
      o.currentChar() === "-" ? (o.next(), (l += `-${Ae(o)}`)) : (l += Ae(o)),
      o.currentChar() === oe && b(R.UNTERMINATED_CLOSING_BRACE, s(), 0),
      l
    );
  }
  function kt(o) {
    return o !== At && o !== K;
  }
  function Xe(o) {
    (F(o), P(o, "'"));
    let l = "",
      p = "";
    for (; (l = G(o, kt));) l === "\\" ? (p += Je(o)) : (p += l);
    const A = o.currentChar();
    return A === K || A === oe
      ? (b(R.UNTERMINATED_SINGLE_QUOTE_IN_PLACEHOLDER, s(), 0), A === K && (o.next(), P(o, "'")), p)
      : (P(o, "'"), p);
  }
  function Je(o) {
    const l = o.currentChar();
    switch (l) {
      case "\\":
      case "'":
        return (o.next(), `\\${l}`);
      case "u":
        return Pe(o, l, 4);
      case "U":
        return Pe(o, l, 6);
      default:
        return (b(R.UNKNOWN_ESCAPE_SEQUENCE, s(), 0, l), "");
    }
  }
  function Pe(o, l, p) {
    P(o, l);
    let A = "";
    for (let V = 0; V < p; V++) {
      const D = Fe(o);
      if (!D) {
        b(R.INVALID_UNICODE_ESCAPE_SEQUENCE, s(), 0, `\\${l}${A}${o.currentChar()}`);
        break;
      }
      A += D;
    }
    return `\\${l}${A}`;
  }
  function qe(o) {
    return o !== "{" && o !== "}" && o !== ae && o !== K;
  }
  function Qe(o) {
    F(o);
    let l = "",
      p = "";
    for (; (l = G(o, qe));) p += l;
    return p;
  }
  function Ze(o) {
    let l = "",
      p = "";
    for (; (l = $e(o));) p += l;
    return p;
  }
  function ze(o) {
    const l = (p) => {
      const A = o.currentChar();
      return A === "{" || A === "@" || A === "|" || A === "(" || A === ")" || !A || A === ae
        ? p
        : ((p += A), o.next(), l(p));
    };
    return l("");
  }
  function be(o) {
    F(o);
    const l = P(o, "|");
    return (F(o), l);
  }
  function me(o, l) {
    let p = null;
    switch (o.currentChar()) {
      case "{":
        return (
          l.braceNest >= 1 && b(R.NOT_ALLOW_NEST_PLACEHOLDER, s(), 0),
          o.next(),
          (p = y(l, 2, "{")),
          F(o),
          l.braceNest++,
          p
        );
      case "}":
        return (
          l.braceNest > 0 && l.currentType === 2 && b(R.EMPTY_PLACEHOLDER, s(), 0),
          o.next(),
          (p = y(l, 3, "}")),
          l.braceNest--,
          l.braceNest > 0 && F(o),
          l.inLinked && l.braceNest === 0 && (l.inLinked = !1),
          p
        );
      case "@":
        return (
          l.braceNest > 0 && b(R.UNTERMINATED_CLOSING_BRACE, s(), 0),
          (p = de(o, l) || v(l)),
          (l.braceNest = 0),
          p
        );
      default: {
        let V = !0,
          D = !0,
          _ = !0;
        if (J(o))
          return (
            l.braceNest > 0 && b(R.UNTERMINATED_CLOSING_BRACE, s(), 0),
            (p = y(l, 1, be(o))),
            (l.braceNest = 0),
            (l.inLinked = !1),
            p
          );
        if (l.braceNest > 0 && (l.currentType === 4 || l.currentType === 5 || l.currentType === 6))
          return (b(R.UNTERMINATED_CLOSING_BRACE, s(), 0), (l.braceNest = 0), ye(o, l));
        if ((V = L(o, l))) return ((p = y(l, 4, Ge(o))), F(o), p);
        if ((D = m(o, l))) return ((p = y(l, 5, Ke(o))), F(o), p);
        if ((_ = I(o, l))) return ((p = y(l, 6, Xe(o))), F(o), p);
        if (!V && !D && !_)
          return (
            (p = y(l, 12, Qe(o))),
            b(R.INVALID_TOKEN_IN_PLACEHOLDER, s(), 0, p.value),
            F(o),
            p
          );
        break;
      }
    }
    return p;
  }
  function de(o, l) {
    const { currentType: p } = l;
    let A = null;
    const V = o.currentChar();
    switch (
      ((p === 7 || p === 8 || p === 11 || p === 9) &&
        (V === K || V === ae) &&
        b(R.INVALID_LINKED_FORMAT, s(), 0),
      V)
    ) {
      case "@":
        return (o.next(), (A = y(l, 7, "@")), (l.inLinked = !0), A);
      case ".":
        return (F(o), o.next(), y(l, 8, "."));
      case ":":
        return (F(o), o.next(), y(l, 9, ":"));
      default:
        return J(o)
          ? ((A = y(l, 1, be(o))), (l.braceNest = 0), (l.inLinked = !1), A)
          : C(o, l) || x(o, l)
            ? (F(o), de(o, l))
            : E(o, l)
              ? (F(o), y(l, 11, Ze(o)))
              : $(o, l)
                ? (F(o), V === "{" ? me(o, l) || A : y(l, 10, ze(o)))
                : (p === 7 && b(R.INVALID_LINKED_FORMAT, s(), 0),
                  (l.braceNest = 0),
                  (l.inLinked = !1),
                  ye(o, l));
    }
  }
  function ye(o, l) {
    let p = { type: 13 };
    if (l.braceNest > 0) return me(o, l) || v(l);
    if (l.inLinked) return de(o, l) || v(l);
    switch (o.currentChar()) {
      case "{":
        return me(o, l) || v(l);
      case "}":
        return (b(R.UNBALANCED_CLOSING_BRACE, s(), 0), o.next(), y(l, 3, "}"));
      case "@":
        return de(o, l) || v(l);
      default: {
        if (J(o)) return ((p = y(l, 1, be(o))), (l.braceNest = 0), (l.inLinked = !1), p);
        if (Z(o)) return y(l, 0, je(o));
        break;
      }
    }
    return p;
  }
  function et() {
    const { currentType: o, offset: l, startLoc: p, endLoc: A } = f;
    return (
      (f.lastType = o),
      (f.lastOffset = l),
      (f.lastStartLoc = p),
      (f.lastEndLoc = A),
      (f.offset = r()),
      (f.startLoc = s()),
      a.currentChar() === oe ? y(f, 13) : ye(a, f)
    );
  }
  return { nextToken: et, currentOffset: r, currentPosition: s, context: d };
}
const ua = "parser",
  fa = /(?:\\\\|\\'|\\u([0-9a-fA-F]{4})|\\U([0-9a-fA-F]{6}))/g;
function _a(e, t, n) {
  switch (e) {
    case "\\\\":
      return "\\";
    case "\\'":
      return "'";
    default: {
      const a = parseInt(t || n, 16);
      return a <= 55295 || a >= 57344 ? String.fromCodePoint(a) : "�";
    }
  }
}
function ma(e = {}) {
  const t = e.location !== !1,
    { onError: n } = e;
  function a(u, h, L, m, ...I) {
    const C = u.currentPosition();
    if (((C.offset += m), (C.column += m), n)) {
      const E = t ? st(L, C) : null,
        x = xe(h, E, { domain: ua, args: I });
      n(x);
    }
  }
  function r(u, h, L) {
    const m = { type: u };
    return (t && ((m.start = h), (m.end = h), (m.loc = { start: L, end: L })), m);
  }
  function s(u, h, L, m) {
    t && ((u.end = h), u.loc && (u.loc.end = L));
  }
  function i(u, h) {
    const L = u.context(),
      m = r(3, L.offset, L.startLoc);
    return ((m.value = h), s(m, u.currentOffset(), u.currentPosition()), m);
  }
  function c(u, h) {
    const L = u.context(),
      { lastOffset: m, lastStartLoc: I } = L,
      C = r(5, m, I);
    return (
      (C.index = parseInt(h, 10)),
      u.nextToken(),
      s(C, u.currentOffset(), u.currentPosition()),
      C
    );
  }
  function f(u, h) {
    const L = u.context(),
      { lastOffset: m, lastStartLoc: I } = L,
      C = r(4, m, I);
    return ((C.key = h), u.nextToken(), s(C, u.currentOffset(), u.currentPosition()), C);
  }
  function d(u, h) {
    const L = u.context(),
      { lastOffset: m, lastStartLoc: I } = L,
      C = r(9, m, I);
    return (
      (C.value = h.replace(fa, _a)),
      u.nextToken(),
      s(C, u.currentOffset(), u.currentPosition()),
      C
    );
  }
  function T(u) {
    const h = u.nextToken(),
      L = u.context(),
      { lastOffset: m, lastStartLoc: I } = L,
      C = r(8, m, I);
    return h.type !== 11
      ? (a(u, R.UNEXPECTED_EMPTY_LINKED_MODIFIER, L.lastStartLoc, 0),
        (C.value = ""),
        s(C, m, I),
        { nextConsumeToken: h, node: C })
      : (h.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, L.lastStartLoc, 0, ee(h)),
        (C.value = h.value || ""),
        s(C, u.currentOffset(), u.currentPosition()),
        { node: C });
  }
  function b(u, h) {
    const L = u.context(),
      m = r(7, L.offset, L.startLoc);
    return ((m.value = h), s(m, u.currentOffset(), u.currentPosition()), m);
  }
  function y(u) {
    const h = u.context(),
      L = r(6, h.offset, h.startLoc);
    let m = u.nextToken();
    if (m.type === 8) {
      const I = T(u);
      ((L.modifier = I.node), (m = I.nextConsumeToken || u.nextToken()));
    }
    switch (
      (m.type !== 9 && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee(m)),
      (m = u.nextToken()),
      m.type === 2 && (m = u.nextToken()),
      m.type)
    ) {
      case 10:
        (m.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee(m)),
          (L.key = b(u, m.value || "")));
        break;
      case 4:
        (m.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee(m)),
          (L.key = f(u, m.value || "")));
        break;
      case 5:
        (m.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee(m)),
          (L.key = c(u, m.value || "")));
        break;
      case 6:
        (m.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee(m)),
          (L.key = d(u, m.value || "")));
        break;
      default: {
        a(u, R.UNEXPECTED_EMPTY_LINKED_KEY, h.lastStartLoc, 0);
        const I = u.context(),
          C = r(7, I.offset, I.startLoc);
        return (
          (C.value = ""),
          s(C, I.offset, I.startLoc),
          (L.key = C),
          s(L, I.offset, I.startLoc),
          { nextConsumeToken: m, node: L }
        );
      }
    }
    return (s(L, u.currentOffset(), u.currentPosition()), { node: L });
  }
  function v(u) {
    const h = u.context(),
      L = h.currentType === 1 ? u.currentOffset() : h.offset,
      m = h.currentType === 1 ? h.endLoc : h.startLoc,
      I = r(2, L, m);
    I.items = [];
    let C = null;
    do {
      const $ = C || u.nextToken();
      switch (((C = null), $.type)) {
        case 0:
          ($.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee($)),
            I.items.push(i(u, $.value || "")));
          break;
        case 5:
          ($.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee($)),
            I.items.push(c(u, $.value || "")));
          break;
        case 4:
          ($.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee($)),
            I.items.push(f(u, $.value || "")));
          break;
        case 6:
          ($.value == null && a(u, R.UNEXPECTED_LEXICAL_ANALYSIS, h.lastStartLoc, 0, ee($)),
            I.items.push(d(u, $.value || "")));
          break;
        case 7: {
          const J = y(u);
          (I.items.push(J.node), (C = J.nextConsumeToken || null));
          break;
        }
      }
    } while (h.currentType !== 13 && h.currentType !== 1);
    const E = h.currentType === 1 ? h.lastOffset : u.currentOffset(),
      x = h.currentType === 1 ? h.lastEndLoc : u.currentPosition();
    return (s(I, E, x), I);
  }
  function P(u, h, L, m) {
    const I = u.context();
    let C = m.items.length === 0;
    const E = r(1, h, L);
    ((E.cases = []), E.cases.push(m));
    do {
      const x = v(u);
      (C || (C = x.items.length === 0), E.cases.push(x));
    } while (I.currentType !== 13);
    return (
      C && a(u, R.MUST_HAVE_MESSAGES_IN_PLURAL, L, 0),
      s(E, u.currentOffset(), u.currentPosition()),
      E
    );
  }
  function k(u) {
    const h = u.context(),
      { offset: L, startLoc: m } = h,
      I = v(u);
    return h.currentType === 13 ? I : P(u, L, m, I);
  }
  function F(u) {
    const h = ca(u, j({}, e)),
      L = h.context(),
      m = r(0, L.offset, L.startLoc);
    return (
      t && m.loc && (m.loc.source = u),
      (m.body = k(h)),
      e.onCacheKey && (m.cacheKey = e.onCacheKey(u)),
      L.currentType !== 13 &&
        a(h, R.UNEXPECTED_LEXICAL_ANALYSIS, L.lastStartLoc, 0, u[L.offset] || ""),
      s(m, h.currentOffset(), h.currentPosition()),
      m
    );
  }
  return { parse: F };
}
function ee(e) {
  if (e.type === 13) return "EOF";
  const t = (e.value || "").replace(/\r?\n/gu, "\\n");
  return t.length > 10 ? t.slice(0, 9) + "…" : t;
}
function da(e, t = {}) {
  const n = { ast: e, helpers: new Set() };
  return { context: () => n, helper: (s) => (n.helpers.add(s), s) };
}
function Pt(e, t) {
  for (let n = 0; n < e.length; n++) Et(e[n], t);
}
function Et(e, t) {
  switch (e.type) {
    case 1:
      (Pt(e.cases, t), t.helper("plural"));
      break;
    case 2:
      Pt(e.items, t);
      break;
    case 6: {
      (Et(e.key, t), t.helper("linked"), t.helper("type"));
      break;
    }
    case 5:
      (t.helper("interpolate"), t.helper("list"));
      break;
    case 4:
      (t.helper("interpolate"), t.helper("named"));
      break;
  }
}
function pa(e, t = {}) {
  const n = da(e);
  (n.helper("normalize"), e.body && Et(e.body, n));
  const a = n.context();
  e.helpers = Array.from(a.helpers);
}
function ha(e) {
  const t = e.body;
  return (t.type === 2 ? Dt(t) : t.cases.forEach((n) => Dt(n)), e);
}
function Dt(e) {
  if (e.items.length === 1) {
    const t = e.items[0];
    (t.type === 3 || t.type === 9) && ((e.static = t.value), delete t.value);
  } else {
    const t = [];
    for (let n = 0; n < e.items.length; n++) {
      const a = e.items[n];
      if (!(a.type === 3 || a.type === 9) || a.value == null) break;
      t.push(a.value);
    }
    if (t.length === e.items.length) {
      e.static = gt(t);
      for (let n = 0; n < e.items.length; n++) {
        const a = e.items[n];
        (a.type === 3 || a.type === 9) && delete a.value;
      }
    }
  }
}
function he(e) {
  switch (((e.t = e.type), e.type)) {
    case 0: {
      const t = e;
      (he(t.body), (t.b = t.body), delete t.body);
      break;
    }
    case 1: {
      const t = e,
        n = t.cases;
      for (let a = 0; a < n.length; a++) he(n[a]);
      ((t.c = n), delete t.cases);
      break;
    }
    case 2: {
      const t = e,
        n = t.items;
      for (let a = 0; a < n.length; a++) he(n[a]);
      ((t.i = n), delete t.items, t.static && ((t.s = t.static), delete t.static));
      break;
    }
    case 3:
    case 9:
    case 8:
    case 7: {
      const t = e;
      t.value && ((t.v = t.value), delete t.value);
      break;
    }
    case 6: {
      const t = e;
      (he(t.key),
        (t.k = t.key),
        delete t.key,
        t.modifier && (he(t.modifier), (t.m = t.modifier), delete t.modifier));
      break;
    }
    case 5: {
      const t = e;
      ((t.i = t.index), delete t.index);
      break;
    }
    case 4: {
      const t = e;
      ((t.k = t.key), delete t.key);
      break;
    }
  }
  delete e.type;
}
function ga(e, t) {
  const { filename: n, breakLineCode: a, needIndent: r } = t,
    s = t.location !== !1,
    i = {
      filename: n,
      code: "",
      column: 1,
      line: 1,
      offset: 0,
      map: void 0,
      breakLineCode: a,
      needIndent: r,
      indentLevel: 0,
    };
  s && e.loc && (i.source = e.loc.source);
  const c = () => i;
  function f(k, F) {
    i.code += k;
  }
  function d(k, F = !0) {
    const u = F ? a : "";
    f(r ? u + "  ".repeat(k) : u);
  }
  function T(k = !0) {
    const F = ++i.indentLevel;
    k && d(F);
  }
  function b(k = !0) {
    const F = --i.indentLevel;
    k && d(F);
  }
  function y() {
    d(i.indentLevel);
  }
  return {
    context: c,
    push: f,
    indent: T,
    deindent: b,
    newline: y,
    helper: (k) => `_${k}`,
    needIndent: () => i.needIndent,
  };
}
function Ea(e, t) {
  const { helper: n } = e;
  (e.push(`${n("linked")}(`),
    Ee(e, t.key),
    t.modifier
      ? (e.push(", "), Ee(e, t.modifier), e.push(", _type"))
      : e.push(", undefined, _type"),
    e.push(")"));
}
function ba(e, t) {
  const { helper: n, needIndent: a } = e;
  (e.push(`${n("normalize")}([`), e.indent(a()));
  const r = t.items.length;
  for (let s = 0; s < r && (Ee(e, t.items[s]), s !== r - 1); s++) e.push(", ");
  (e.deindent(a()), e.push("])"));
}
function ya(e, t) {
  const { helper: n, needIndent: a } = e;
  if (t.cases.length > 1) {
    (e.push(`${n("plural")}([`), e.indent(a()));
    const r = t.cases.length;
    for (let s = 0; s < r && (Ee(e, t.cases[s]), s !== r - 1); s++) e.push(", ");
    (e.deindent(a()), e.push("])"));
  }
}
function La(e, t) {
  t.body ? Ee(e, t.body) : e.push("null");
}
function Ee(e, t) {
  const { helper: n } = e;
  switch (t.type) {
    case 0:
      La(e, t);
      break;
    case 1:
      ya(e, t);
      break;
    case 2:
      ba(e, t);
      break;
    case 6:
      Ea(e, t);
      break;
    case 8:
      e.push(JSON.stringify(t.value), t);
      break;
    case 7:
      e.push(JSON.stringify(t.value), t);
      break;
    case 5:
      e.push(`${n("interpolate")}(${n("list")}(${t.index}))`, t);
      break;
    case 4:
      e.push(`${n("interpolate")}(${n("named")}(${JSON.stringify(t.key)}))`, t);
      break;
    case 9:
      e.push(JSON.stringify(t.value), t);
      break;
    case 3:
      e.push(JSON.stringify(t.value), t);
      break;
  }
}
const Ta = (e, t = {}) => {
  const n = N(t.mode) ? t.mode : "normal",
    a = N(t.filename) ? t.filename : "message.intl";
  t.sourceMap;
  const r =
      t.breakLineCode != null
        ? t.breakLineCode
        : n === "arrow"
          ? ";"
          : `
`,
    s = t.needIndent ? t.needIndent : n !== "arrow",
    i = e.helpers || [],
    c = ga(e, { filename: a, breakLineCode: r, needIndent: s });
  (c.push(n === "normal" ? "function __msg__ (ctx) {" : "(ctx) => {"),
    c.indent(s),
    i.length > 0 &&
      (c.push(
        `const { ${gt(
          i.map((T) => `${T}: _${T}`),
          ", ",
        )} } = ctx`,
      ),
      c.newline()),
    c.push("return "),
    Ee(c, e),
    c.deindent(s),
    c.push("}"),
    delete e.helpers);
  const { code: f, map: d } = c.context();
  return { ast: e, code: f, map: d ? d.toJSON() : void 0 };
};
function Ia(e, t = {}) {
  const n = j({}, t),
    a = !!n.jit,
    r = !!n.minify,
    s = n.optimize == null ? !0 : n.optimize,
    c = ma(n).parse(e);
  return a ? (s && ha(c), r && he(c), { ast: c, code: "" }) : (pa(c, n), Ta(c, n));
}
/*!
 * core-base v11.1.7
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ function Ca() {
  (typeof __INTLIFY_PROD_DEVTOOLS__ != "boolean" && (fe().__INTLIFY_PROD_DEVTOOLS__ = !1),
    typeof __INTLIFY_DROP_MESSAGE_COMPILER__ != "boolean" &&
      (fe().__INTLIFY_DROP_MESSAGE_COMPILER__ = !1));
}
function te(e) {
  return w(e) && bt(e) === 0 && (z(e, "b") || z(e, "body"));
}
const cn = ["b", "body"];
function Na(e) {
  return ie(e, cn);
}
const un = ["c", "cases"];
function ka(e) {
  return ie(e, un, []);
}
const fn = ["s", "static"];
function va(e) {
  return ie(e, fn);
}
const _n = ["i", "items"];
function Fa(e) {
  return ie(e, _n, []);
}
const mn = ["t", "type"];
function bt(e) {
  return ie(e, mn);
}
const dn = ["v", "value"];
function Oe(e, t) {
  const n = ie(e, dn);
  if (n != null) return n;
  throw Ce(t);
}
const pn = ["m", "modifier"];
function Aa(e) {
  return ie(e, pn);
}
const hn = ["k", "key"];
function Pa(e) {
  const t = ie(e, hn);
  if (t) return t;
  throw Ce(6);
}
function ie(e, t, n) {
  for (let a = 0; a < t.length; a++) {
    const r = t[a];
    if (z(e, r) && e[r] != null) return e[r];
  }
  return n;
}
const gn = [...cn, ...un, ...fn, ..._n, ...hn, ...pn, ...dn, ...mn];
function Ce(e) {
  return new Error(`unhandled node type: ${e}`);
}
function tt(e) {
  return (n) => Da(n, e);
}
function Da(e, t) {
  const n = Na(t);
  if (n == null) throw Ce(0);
  if (bt(n) === 1) {
    const s = ka(n);
    return e.plural(s.reduce((i, c) => [...i, St(e, c)], []));
  } else return St(e, n);
}
function St(e, t) {
  const n = va(t);
  if (n != null) return e.type === "text" ? n : e.normalize([n]);
  {
    const a = Fa(t).reduce((r, s) => [...r, ot(e, s)], []);
    return e.normalize(a);
  }
}
function ot(e, t) {
  const n = bt(t);
  switch (n) {
    case 3:
      return Oe(t, n);
    case 9:
      return Oe(t, n);
    case 4: {
      const a = t;
      if (z(a, "k") && a.k) return e.interpolate(e.named(a.k));
      if (z(a, "key") && a.key) return e.interpolate(e.named(a.key));
      throw Ce(n);
    }
    case 5: {
      const a = t;
      if (z(a, "i") && H(a.i)) return e.interpolate(e.list(a.i));
      if (z(a, "index") && H(a.index)) return e.interpolate(e.list(a.index));
      throw Ce(n);
    }
    case 6: {
      const a = t,
        r = Aa(a),
        s = Pa(a);
      return e.linked(ot(e, s), r ? ot(e, r) : void 0, e.type);
    }
    case 7:
      return Oe(t, n);
    case 8:
      return Oe(t, n);
    default:
      throw new Error(`unhandled node on format message part: ${n}`);
  }
}
const Sa = (e) => e;
let we = M();
function Oa(e, t = {}) {
  let n = !1;
  const a = t.onError || na;
  return (
    (t.onError = (r) => {
      ((n = !0), a(r));
    }),
    { ...Ia(e, t), detectError: n }
  );
}
function wa(e, t) {
  if (!__INTLIFY_DROP_MESSAGE_COMPILER__ && N(e)) {
    O(t.warnHtmlMessage) && t.warnHtmlMessage;
    const a = (t.onCacheKey || Sa)(e),
      r = we[a];
    if (r) return r;
    const { ast: s, detectError: i } = Oa(e, { ...t, location: !1, jit: !0 }),
      c = tt(s);
    return i ? c : (we[a] = c);
  } else {
    const n = e.cacheKey;
    if (n) {
      const a = we[n];
      return a || (we[n] = tt(e));
    } else return tt(e);
  }
}
let Ne = null;
function Ra(e) {
  Ne = e;
}
function Ma(e, t, n) {
  Ne && Ne.emit("i18n:init", { timestamp: Date.now(), i18n: e, version: t, meta: n });
}
const Ua = xa("function:translate");
function xa(e) {
  return (t) => Ne && Ne.emit(e, t);
}
const re = {
    INVALID_ARGUMENT: ta,
    INVALID_DATE_ARGUMENT: 18,
    INVALID_ISO_DATE_ARGUMENT: 19,
    NOT_SUPPORT_LOCALE_PROMISE_VALUE: 21,
    NOT_SUPPORT_LOCALE_ASYNC_FUNCTION: 22,
    NOT_SUPPORT_LOCALE_TYPE: 23,
  },
  Wa = 24;
function se(e) {
  return xe(e, null, void 0);
}
function yt(e, t) {
  return t.locale != null ? Ot(t.locale) : Ot(e.locale);
}
let nt;
function Ot(e) {
  if (N(e)) return e;
  if (W(e)) {
    if (e.resolvedOnce && nt != null) return nt;
    if (e.constructor.name === "Function") {
      const t = e();
      if (Qn(t)) throw se(re.NOT_SUPPORT_LOCALE_PROMISE_VALUE);
      return (nt = t);
    } else throw se(re.NOT_SUPPORT_LOCALE_ASYNC_FUNCTION);
  } else throw se(re.NOT_SUPPORT_LOCALE_TYPE);
}
function $a(e, t, n) {
  return [...new Set([n, ...(B(t) ? t : w(t) ? Object.keys(t) : N(t) ? [t] : [n])])];
}
function En(e, t, n) {
  const a = N(n) ? n : ke,
    r = e;
  r.__localeChainCache || (r.__localeChainCache = new Map());
  let s = r.__localeChainCache.get(a);
  if (!s) {
    s = [];
    let i = [n];
    for (; B(i);) i = wt(s, i, t);
    const c = B(t) || !S(t) ? t : t.default ? t.default : null;
    ((i = N(c) ? [c] : c), B(i) && wt(s, i, !1), r.__localeChainCache.set(a, s));
  }
  return s;
}
function wt(e, t, n) {
  let a = !0;
  for (let r = 0; r < t.length && O(a); r++) {
    const s = t[r];
    N(s) && (a = Ba(e, t[r], n));
  }
  return a;
}
function Ba(e, t, n) {
  let a;
  const r = t.split("-");
  do {
    const s = r.join("-");
    ((a = Va(e, s, n)), r.splice(-1, 1));
  } while (r.length && a === !0);
  return a;
}
function Va(e, t, n) {
  let a = !1;
  if (!e.includes(t) && ((a = !0), t)) {
    a = t[t.length - 1] !== "!";
    const r = t.replace(/!/g, "");
    (e.push(r), (B(n) || S(n)) && n[r] && (a = n[r]));
  }
  return a;
}
const ce = [];
ce[0] = { w: [0], i: [3, 0], "[": [4], o: [7] };
ce[1] = { w: [1], ".": [2], "[": [4], o: [7] };
ce[2] = { w: [2], i: [3, 0], 0: [3, 0] };
ce[3] = { i: [3, 0], 0: [3, 0], w: [1, 1], ".": [2, 1], "[": [4, 1], o: [7, 1] };
ce[4] = { "'": [5, 0], '"': [6, 0], "[": [4, 2], "]": [1, 3], o: 8, l: [4, 0] };
ce[5] = { "'": [4, 0], o: 8, l: [5, 0] };
ce[6] = { '"': [4, 0], o: 8, l: [6, 0] };
const Ya = /^\s?(?:true|false|-?[\d.]+|'[^']*'|"[^"]*")\s?$/;
function Ha(e) {
  return Ya.test(e);
}
function ja(e) {
  const t = e.charCodeAt(0),
    n = e.charCodeAt(e.length - 1);
  return t === n && (t === 34 || t === 39) ? e.slice(1, -1) : e;
}
function Ga(e) {
  if (e == null) return "o";
  switch (e.charCodeAt(0)) {
    case 91:
    case 93:
    case 46:
    case 34:
    case 39:
      return e;
    case 95:
    case 36:
    case 45:
      return "i";
    case 9:
    case 10:
    case 13:
    case 160:
    case 65279:
    case 8232:
    case 8233:
      return "w";
  }
  return "i";
}
function Ka(e) {
  const t = e.trim();
  return e.charAt(0) === "0" && isNaN(parseInt(e)) ? !1 : Ha(t) ? ja(t) : "*" + t;
}
function Xa(e) {
  const t = [];
  let n = -1,
    a = 0,
    r = 0,
    s,
    i,
    c,
    f,
    d,
    T,
    b;
  const y = [];
  ((y[0] = () => {
    i === void 0 ? (i = c) : (i += c);
  }),
    (y[1] = () => {
      i !== void 0 && (t.push(i), (i = void 0));
    }),
    (y[2] = () => {
      (y[0](), r++);
    }),
    (y[3] = () => {
      if (r > 0) (r--, (a = 4), y[0]());
      else {
        if (((r = 0), i === void 0 || ((i = Ka(i)), i === !1))) return !1;
        y[1]();
      }
    }));
  function v() {
    const P = e[n + 1];
    if ((a === 5 && P === "'") || (a === 6 && P === '"')) return (n++, (c = "\\" + P), y[0](), !0);
  }
  for (; a !== null;)
    if ((n++, (s = e[n]), !(s === "\\" && v()))) {
      if (
        ((f = Ga(s)),
        (b = ce[a]),
        (d = b[f] || b.l || 8),
        d === 8 || ((a = d[0]), d[1] !== void 0 && ((T = y[d[1]]), T && ((c = s), T() === !1))))
      )
        return;
      if (a === 7) return t;
    }
}
const Rt = new Map();
function Ja(e, t) {
  return w(e) ? e[t] : null;
}
function qa(e, t) {
  if (!w(e)) return null;
  let n = Rt.get(t);
  if ((n || ((n = Xa(t)), n && Rt.set(t, n)), !n)) return null;
  const a = n.length;
  let r = e,
    s = 0;
  for (; s < a;) {
    const i = n[s];
    if (gn.includes(i) && te(r)) return null;
    const c = r[i];
    if (c === void 0 || W(r)) return null;
    ((r = c), s++);
  }
  return r;
}
const Qa = "11.1.7",
  We = -1,
  ke = "en-US",
  Mt = "",
  Ut = (e) => `${e.charAt(0).toLocaleUpperCase()}${e.substr(1)}`;
function Za() {
  return {
    upper: (e, t) =>
      t === "text" && N(e)
        ? e.toUpperCase()
        : t === "vnode" && w(e) && "__v_isVNode" in e
          ? e.children.toUpperCase()
          : e,
    lower: (e, t) =>
      t === "text" && N(e)
        ? e.toLowerCase()
        : t === "vnode" && w(e) && "__v_isVNode" in e
          ? e.children.toLowerCase()
          : e,
    capitalize: (e, t) =>
      t === "text" && N(e)
        ? Ut(e)
        : t === "vnode" && w(e) && "__v_isVNode" in e
          ? Ut(e.children)
          : e,
  };
}
let bn;
function za(e) {
  bn = e;
}
let yn;
function er(e) {
  yn = e;
}
let Ln;
function tr(e) {
  Ln = e;
}
let Tn = null;
const nr = (e) => {
    Tn = e;
  },
  ar = () => Tn;
let In = null;
const xt = (e) => {
    In = e;
  },
  rr = () => In;
let Wt = 0;
function sr(e = {}) {
  const t = W(e.onWarn) ? e.onWarn : zn,
    n = N(e.version) ? e.version : Qa,
    a = N(e.locale) || W(e.locale) ? e.locale : ke,
    r = W(a) ? ke : a,
    s =
      B(e.fallbackLocale) || S(e.fallbackLocale) || N(e.fallbackLocale) || e.fallbackLocale === !1
        ? e.fallbackLocale
        : r,
    i = S(e.messages) ? e.messages : at(r),
    c = S(e.datetimeFormats) ? e.datetimeFormats : at(r),
    f = S(e.numberFormats) ? e.numberFormats : at(r),
    d = j(M(), e.modifiers, Za()),
    T = e.pluralRules || M(),
    b = W(e.missing) ? e.missing : null,
    y = O(e.missingWarn) || ge(e.missingWarn) ? e.missingWarn : !0,
    v = O(e.fallbackWarn) || ge(e.fallbackWarn) ? e.fallbackWarn : !0,
    P = !!e.fallbackFormat,
    k = !!e.unresolving,
    F = W(e.postTranslation) ? e.postTranslation : null,
    u = S(e.processor) ? e.processor : null,
    h = O(e.warnHtmlMessage) ? e.warnHtmlMessage : !0,
    L = !!e.escapeParameter,
    m = W(e.messageCompiler) ? e.messageCompiler : bn,
    I = W(e.messageResolver) ? e.messageResolver : yn || Ja,
    C = W(e.localeFallbacker) ? e.localeFallbacker : Ln || $a,
    E = w(e.fallbackContext) ? e.fallbackContext : void 0,
    x = e,
    $ = w(x.__datetimeFormatters) ? x.__datetimeFormatters : new Map(),
    J = w(x.__numberFormatters) ? x.__numberFormatters : new Map(),
    Z = w(x.__meta) ? x.__meta : {};
  Wt++;
  const G = {
    version: n,
    cid: Wt,
    locale: a,
    fallbackLocale: s,
    messages: i,
    modifiers: d,
    pluralRules: T,
    missing: b,
    missingWarn: y,
    fallbackWarn: v,
    fallbackFormat: P,
    unresolving: k,
    postTranslation: F,
    processor: u,
    warnHtmlMessage: h,
    escapeParameter: L,
    messageCompiler: m,
    messageResolver: I,
    localeFallbacker: C,
    fallbackContext: E,
    onWarn: t,
    __meta: Z,
  };
  return (
    (G.datetimeFormats = c),
    (G.numberFormats = f),
    (G.__datetimeFormatters = $),
    (G.__numberFormatters = J),
    __INTLIFY_PROD_DEVTOOLS__ && Ma(G, n, Z),
    G
  );
}
const at = (e) => ({ [e]: M() });
function Lt(e, t, n, a, r) {
  const { missing: s, onWarn: i } = e;
  if (s !== null) {
    const c = s(e, n, t, r);
    return N(c) ? c : t;
  } else return t;
}
function Te(e, t, n) {
  const a = e;
  ((a.__localeChainCache = new Map()), e.localeFallbacker(e, n, t));
}
function or(e, t) {
  return e === t ? !1 : e.split("-")[0] === t.split("-")[0];
}
function lr(e, t) {
  const n = t.indexOf(e);
  if (n === -1) return !1;
  for (let a = n + 1; a < t.length; a++) if (or(e, t[a])) return !0;
  return !1;
}
function $t(e, ...t) {
  const {
      datetimeFormats: n,
      unresolving: a,
      fallbackLocale: r,
      onWarn: s,
      localeFallbacker: i,
    } = e,
    { __datetimeFormatters: c } = e,
    [f, d, T, b] = lt(...t),
    y = O(T.missingWarn) ? T.missingWarn : e.missingWarn;
  O(T.fallbackWarn) ? T.fallbackWarn : e.fallbackWarn;
  const v = !!T.part,
    P = yt(e, T),
    k = i(e, r, P);
  if (!N(f) || f === "") return new Intl.DateTimeFormat(P, b).format(d);
  let F = {},
    u,
    h = null;
  const L = "datetime format";
  for (let C = 0; C < k.length && ((u = k[C]), (F = n[u] || {}), (h = F[f]), !S(h)); C++)
    Lt(e, f, u, y, L);
  if (!S(h) || !N(u)) return a ? We : f;
  let m = `${u}__${f}`;
  Ue(b) || (m = `${m}__${JSON.stringify(b)}`);
  let I = c.get(m);
  return (
    I || ((I = new Intl.DateTimeFormat(u, j({}, h, b))), c.set(m, I)),
    v ? I.formatToParts(d) : I.format(d)
  );
}
const Cn = [
  "localeMatcher",
  "weekday",
  "era",
  "year",
  "month",
  "day",
  "hour",
  "minute",
  "second",
  "timeZoneName",
  "formatMatcher",
  "hour12",
  "timeZone",
  "dateStyle",
  "timeStyle",
  "calendar",
  "dayPeriod",
  "numberingSystem",
  "hourCycle",
  "fractionalSecondDigits",
];
function lt(...e) {
  const [t, n, a, r] = e,
    s = M();
  let i = M(),
    c;
  if (N(t)) {
    const f = t.match(/(\d{4}-\d{2}-\d{2})(T|\s)?(.*)/);
    if (!f) throw se(re.INVALID_ISO_DATE_ARGUMENT);
    const d = f[3]
      ? f[3].trim().startsWith("T")
        ? `${f[1].trim()}${f[3].trim()}`
        : `${f[1].trim()}T${f[3].trim()}`
      : f[1].trim();
    c = new Date(d);
    try {
      c.toISOString();
    } catch {
      throw se(re.INVALID_ISO_DATE_ARGUMENT);
    }
  } else if (Xn(t)) {
    if (isNaN(t.getTime())) throw se(re.INVALID_DATE_ARGUMENT);
    c = t;
  } else if (H(t)) c = t;
  else throw se(re.INVALID_ARGUMENT);
  return (
    N(n)
      ? (s.key = n)
      : S(n) &&
        Object.keys(n).forEach((f) => {
          Cn.includes(f) ? (i[f] = n[f]) : (s[f] = n[f]);
        }),
    N(a) ? (s.locale = a) : S(a) && (i = a),
    S(r) && (i = r),
    [s.key || "", c, s, i]
  );
}
function Bt(e, t, n) {
  const a = e;
  for (const r in n) {
    const s = `${t}__${r}`;
    a.__datetimeFormatters.has(s) && a.__datetimeFormatters.delete(s);
  }
}
function Vt(e, ...t) {
  const { numberFormats: n, unresolving: a, fallbackLocale: r, onWarn: s, localeFallbacker: i } = e,
    { __numberFormatters: c } = e,
    [f, d, T, b] = it(...t),
    y = O(T.missingWarn) ? T.missingWarn : e.missingWarn;
  O(T.fallbackWarn) ? T.fallbackWarn : e.fallbackWarn;
  const v = !!T.part,
    P = yt(e, T),
    k = i(e, r, P);
  if (!N(f) || f === "") return new Intl.NumberFormat(P, b).format(d);
  let F = {},
    u,
    h = null;
  const L = "number format";
  for (let C = 0; C < k.length && ((u = k[C]), (F = n[u] || {}), (h = F[f]), !S(h)); C++)
    Lt(e, f, u, y, L);
  if (!S(h) || !N(u)) return a ? We : f;
  let m = `${u}__${f}`;
  Ue(b) || (m = `${m}__${JSON.stringify(b)}`);
  let I = c.get(m);
  return (
    I || ((I = new Intl.NumberFormat(u, j({}, h, b))), c.set(m, I)),
    v ? I.formatToParts(d) : I.format(d)
  );
}
const Nn = [
  "localeMatcher",
  "style",
  "currency",
  "currencyDisplay",
  "currencySign",
  "useGrouping",
  "minimumIntegerDigits",
  "minimumFractionDigits",
  "maximumFractionDigits",
  "minimumSignificantDigits",
  "maximumSignificantDigits",
  "compactDisplay",
  "notation",
  "signDisplay",
  "unit",
  "unitDisplay",
  "roundingMode",
  "roundingPriority",
  "roundingIncrement",
  "trailingZeroDisplay",
];
function it(...e) {
  const [t, n, a, r] = e,
    s = M();
  let i = M();
  if (!H(t)) throw se(re.INVALID_ARGUMENT);
  const c = t;
  return (
    N(n)
      ? (s.key = n)
      : S(n) &&
        Object.keys(n).forEach((f) => {
          Nn.includes(f) ? (i[f] = n[f]) : (s[f] = n[f]);
        }),
    N(a) ? (s.locale = a) : S(a) && (i = a),
    S(r) && (i = r),
    [s.key || "", c, s, i]
  );
}
function Yt(e, t, n) {
  const a = e;
  for (const r in n) {
    const s = `${t}__${r}`;
    a.__numberFormatters.has(s) && a.__numberFormatters.delete(s);
  }
}
const ir = (e) => e,
  cr = (e) => "",
  ur = "text",
  fr = (e) => (e.length === 0 ? "" : gt(e)),
  _r = Zn;
function Ht(e, t) {
  return ((e = Math.abs(e)), t === 2 ? (e ? (e > 1 ? 1 : 0) : 1) : e ? Math.min(e, 2) : 0);
}
function mr(e) {
  const t = H(e.pluralIndex) ? e.pluralIndex : -1;
  return e.named && (H(e.named.count) || H(e.named.n))
    ? H(e.named.count)
      ? e.named.count
      : H(e.named.n)
        ? e.named.n
        : t
    : t;
}
function dr(e, t) {
  (t.count || (t.count = e), t.n || (t.n = e));
}
function pr(e = {}) {
  const t = e.locale,
    n = mr(e),
    a = w(e.pluralRules) && N(t) && W(e.pluralRules[t]) ? e.pluralRules[t] : Ht,
    r = w(e.pluralRules) && N(t) && W(e.pluralRules[t]) ? Ht : void 0,
    s = (u) => u[a(n, u.length, r)],
    i = e.list || [],
    c = (u) => i[u],
    f = e.named || M();
  H(e.pluralIndex) && dr(n, f);
  const d = (u) => f[u];
  function T(u, h) {
    const L = W(e.messages) ? e.messages(u, !!h) : w(e.messages) ? e.messages[u] : !1;
    return L || (e.parent ? e.parent.message(u) : cr);
  }
  const b = (u) => (e.modifiers ? e.modifiers[u] : ir),
    y = S(e.processor) && W(e.processor.normalize) ? e.processor.normalize : fr,
    v = S(e.processor) && W(e.processor.interpolate) ? e.processor.interpolate : _r,
    P = S(e.processor) && N(e.processor.type) ? e.processor.type : ur,
    F = {
      list: c,
      named: d,
      plural: s,
      linked: (u, ...h) => {
        const [L, m] = h;
        let I = "text",
          C = "";
        h.length === 1
          ? w(L)
            ? ((C = L.modifier || C), (I = L.type || I))
            : N(L) && (C = L || C)
          : h.length === 2 && (N(L) && (C = L || C), N(m) && (I = m || I));
        const E = T(u, !0)(F),
          x = I === "vnode" && B(E) && C ? E[0] : E;
        return C ? b(C)(x, I) : x;
      },
      message: T,
      type: P,
      interpolate: v,
      normalize: y,
      values: j(M(), i, f),
    };
  return F;
}
const jt = () => "",
  Q = (e) => W(e);
function Gt(e, ...t) {
  const {
      fallbackFormat: n,
      postTranslation: a,
      unresolving: r,
      messageCompiler: s,
      fallbackLocale: i,
      messages: c,
    } = e,
    [f, d] = ct(...t),
    T = O(d.missingWarn) ? d.missingWarn : e.missingWarn,
    b = O(d.fallbackWarn) ? d.fallbackWarn : e.fallbackWarn,
    y = O(d.escapeParameter) ? d.escapeParameter : e.escapeParameter,
    v = !!d.resolvedMessage,
    P =
      N(d.default) || O(d.default)
        ? O(d.default)
          ? s
            ? f
            : () => f
          : d.default
        : n
          ? s
            ? f
            : () => f
          : null,
    k = n || (P != null && (N(P) || W(P))),
    F = yt(e, d);
  y && hr(d);
  let [u, h, L] = v ? [f, F, c[F] || M()] : kn(e, f, F, i, b, T),
    m = u,
    I = f;
  if (
    (!v && !(N(m) || te(m) || Q(m)) && k && ((m = P), (I = m)),
    !v && (!(N(m) || te(m) || Q(m)) || !N(h)))
  )
    return r ? We : f;
  let C = !1;
  const E = () => {
      C = !0;
    },
    x = Q(m) ? m : vn(e, f, h, m, I, E);
  if (C) return m;
  const $ = br(e, h, L, d),
    J = pr($),
    Z = gr(e, x, J),
    G = a ? a(Z, f) : Z;
  if (__INTLIFY_PROD_DEVTOOLS__) {
    const _e = {
      timestamp: Date.now(),
      key: N(f) ? f : Q(m) ? m.key : "",
      locale: h || (Q(m) ? m.locale : ""),
      format: N(m) ? m : Q(m) ? m.source : "",
      message: G,
    };
    ((_e.meta = j({}, e.__meta, ar() || {})), Ua(_e));
  }
  return G;
}
function hr(e) {
  B(e.list)
    ? (e.list = e.list.map((t) => (N(t) ? Ft(t) : t)))
    : w(e.named) &&
      Object.keys(e.named).forEach((t) => {
        N(e.named[t]) && (e.named[t] = Ft(e.named[t]));
      });
}
function kn(e, t, n, a, r, s) {
  const { messages: i, onWarn: c, messageResolver: f, localeFallbacker: d } = e,
    T = d(e, a, n);
  let b = M(),
    y,
    v = null;
  const P = "translate";
  for (
    let k = 0;
    k < T.length &&
    ((y = T[k]), (b = i[y] || M()), (v = f(b, t)) === null && (v = b[t]), !(N(v) || te(v) || Q(v)));
    k++
  )
    if (!lr(y, T)) {
      const F = Lt(e, t, y, s, P);
      F !== t && (v = F);
    }
  return [v, y, b];
}
function vn(e, t, n, a, r, s) {
  const { messageCompiler: i, warnHtmlMessage: c } = e;
  if (Q(a)) {
    const d = a;
    return ((d.locale = d.locale || n), (d.key = d.key || t), d);
  }
  if (i == null) {
    const d = () => a;
    return ((d.locale = n), (d.key = t), d);
  }
  const f = i(a, Er(e, n, r, a, c, s));
  return ((f.locale = n), (f.key = t), (f.source = a), f);
}
function gr(e, t, n) {
  return t(n);
}
function ct(...e) {
  const [t, n, a] = e,
    r = M();
  if (!N(t) && !H(t) && !Q(t) && !te(t)) throw se(re.INVALID_ARGUMENT);
  const s = H(t) ? String(t) : (Q(t), t);
  return (
    H(n)
      ? (r.plural = n)
      : N(n)
        ? (r.default = n)
        : S(n) && !Ue(n)
          ? (r.named = n)
          : B(n) && (r.list = n),
    H(a) ? (r.plural = a) : N(a) ? (r.default = a) : S(a) && j(r, a),
    [s, r]
  );
}
function Er(e, t, n, a, r, s) {
  return {
    locale: t,
    key: n,
    warnHtmlMessage: r,
    onError: (i) => {
      throw (s && s(i), i);
    },
    onCacheKey: (i) => Gn(t, n, i),
  };
}
function br(e, t, n, a) {
  const {
      modifiers: r,
      pluralRules: s,
      messageResolver: i,
      fallbackLocale: c,
      fallbackWarn: f,
      missingWarn: d,
      fallbackContext: T,
    } = e,
    y = {
      locale: t,
      modifiers: r,
      pluralRules: s,
      messages: (v, P) => {
        let k = i(n, v);
        if (k == null && (T || P)) {
          const [, , F] = kn(T || e, v, t, c, f, d);
          k = i(F, v);
        }
        if (N(k) || te(k)) {
          let F = !1;
          const h = vn(e, v, t, k, v, () => {
            F = !0;
          });
          return F ? jt : h;
        } else return Q(k) ? k : jt;
      },
    };
  return (
    e.processor && (y.processor = e.processor),
    a.list && (y.list = a.list),
    a.named && (y.named = a.named),
    H(a.plural) && (y.pluralIndex = a.plural),
    y
  );
}
Ca();
/*!
 * vue-i18n v11.1.7
 * (c) 2025 kazuya kawaguchi
 * Released under the MIT License.
 */ const yr = "11.1.7";
function Lr() {
  (typeof __VUE_I18N_FULL_INSTALL__ != "boolean" && (fe().__VUE_I18N_FULL_INSTALL__ = !0),
    typeof __VUE_I18N_LEGACY_API__ != "boolean" && (fe().__VUE_I18N_LEGACY_API__ = !0),
    typeof __INTLIFY_DROP_MESSAGE_COMPILER__ != "boolean" &&
      (fe().__INTLIFY_DROP_MESSAGE_COMPILER__ = !1),
    typeof __INTLIFY_PROD_DEVTOOLS__ != "boolean" && (fe().__INTLIFY_PROD_DEVTOOLS__ = !1));
}
const X = {
  UNEXPECTED_RETURN_TYPE: Wa,
  INVALID_ARGUMENT: 25,
  MUST_BE_CALL_SETUP_TOP: 26,
  NOT_INSTALLED: 27,
  REQUIRED_VALUE: 28,
  INVALID_VALUE: 29,
  NOT_INSTALLED_WITH_PROVIDE: 31,
  UNEXPECTED_ERROR: 32,
};
function q(e, ...t) {
  return xe(e, null, void 0);
}
const ut = le("__translateVNode"),
  ft = le("__datetimeParts"),
  _t = le("__numberParts"),
  Fn = le("__setPluralRules"),
  An = le("__injectWithOption"),
  mt = le("__dispose");
function ve(e) {
  if (!w(e) || te(e)) return e;
  for (const t in e)
    if (z(e, t))
      if (!t.includes(".")) w(e[t]) && ve(e[t]);
      else {
        const n = t.split("."),
          a = n.length - 1;
        let r = e,
          s = !1;
        for (let i = 0; i < a; i++) {
          if (n[i] === "__proto__") throw new Error(`unsafe key: ${n[i]}`);
          if ((n[i] in r || (r[n[i]] = M()), !w(r[n[i]]))) {
            s = !0;
            break;
          }
          r = r[n[i]];
        }
        if (
          (s || (te(r) ? gn.includes(n[a]) || delete e[t] : ((r[n[a]] = e[t]), delete e[t])),
          !te(r))
        ) {
          const i = r[n[a]];
          w(i) && ve(i);
        }
      }
  return e;
}
function Tt(e, t) {
  const { messages: n, __i18n: a, messageResolver: r, flatJson: s } = t,
    i = S(n) ? n : B(a) ? M() : { [e]: M() };
  if (
    (B(a) &&
      a.forEach((c) => {
        if ("locale" in c && "resource" in c) {
          const { locale: f, resource: d } = c;
          f ? ((i[f] = i[f] || M()), Re(d, i[f])) : Re(d, i);
        } else N(c) && Re(JSON.parse(c), i);
      }),
    r == null && s)
  )
    for (const c in i) z(i, c) && ve(i[c]);
  return i;
}
function Pn(e) {
  return e.type;
}
function Dn(e, t, n) {
  let a = w(t.messages) ? t.messages : M();
  "__i18nGlobal" in n && (a = Tt(e.locale.value, { messages: a, __i18n: n.__i18nGlobal }));
  const r = Object.keys(a);
  r.length &&
    r.forEach((s) => {
      e.mergeLocaleMessage(s, a[s]);
    });
  {
    if (w(t.datetimeFormats)) {
      const s = Object.keys(t.datetimeFormats);
      s.length &&
        s.forEach((i) => {
          e.mergeDateTimeFormat(i, t.datetimeFormats[i]);
        });
    }
    if (w(t.numberFormats)) {
      const s = Object.keys(t.numberFormats);
      s.length &&
        s.forEach((i) => {
          e.mergeNumberFormat(i, t.numberFormats[i]);
        });
    }
  }
}
function Kt(e) {
  return Vn(Yn, null, e, 0);
}
const Xt = "__INTLIFY_META__",
  Jt = () => [],
  Tr = () => !1;
let qt = 0;
function Qt(e) {
  return (t, n, a, r) => e(n, a, Ie() || void 0, r);
}
const Ir = () => {
  const e = Ie();
  let t = null;
  return e && (t = Pn(e)[Xt]) ? { [Xt]: t } : null;
};
function It(e = {}) {
  const { __root: t, __injectWithOption: n } = e,
    a = t === void 0,
    r = e.flatJson,
    s = Me ? Mn : Un;
  let i = O(e.inheritLocale) ? e.inheritLocale : !0;
  const c = s(t && i ? t.locale.value : N(e.locale) ? e.locale : ke),
    f = s(
      t && i
        ? t.fallbackLocale.value
        : N(e.fallbackLocale) ||
            B(e.fallbackLocale) ||
            S(e.fallbackLocale) ||
            e.fallbackLocale === !1
          ? e.fallbackLocale
          : c.value,
    ),
    d = s(Tt(c.value, e)),
    T = s(S(e.datetimeFormats) ? e.datetimeFormats : { [c.value]: {} }),
    b = s(S(e.numberFormats) ? e.numberFormats : { [c.value]: {} });
  let y = t ? t.missingWarn : O(e.missingWarn) || ge(e.missingWarn) ? e.missingWarn : !0,
    v = t ? t.fallbackWarn : O(e.fallbackWarn) || ge(e.fallbackWarn) ? e.fallbackWarn : !0,
    P = t ? t.fallbackRoot : O(e.fallbackRoot) ? e.fallbackRoot : !0,
    k = !!e.fallbackFormat,
    F = W(e.missing) ? e.missing : null,
    u = W(e.missing) ? Qt(e.missing) : null,
    h = W(e.postTranslation) ? e.postTranslation : null,
    L = t ? t.warnHtmlMessage : O(e.warnHtmlMessage) ? e.warnHtmlMessage : !0,
    m = !!e.escapeParameter;
  const I = t ? t.modifiers : S(e.modifiers) ? e.modifiers : {};
  let C = e.pluralRules || (t && t.pluralRules),
    E;
  ((E = (() => {
    a && xt(null);
    const _ = {
      version: yr,
      locale: c.value,
      fallbackLocale: f.value,
      messages: d.value,
      modifiers: I,
      pluralRules: C,
      missing: u === null ? void 0 : u,
      missingWarn: y,
      fallbackWarn: v,
      fallbackFormat: k,
      unresolving: !0,
      postTranslation: h === null ? void 0 : h,
      warnHtmlMessage: L,
      escapeParameter: m,
      messageResolver: e.messageResolver,
      messageCompiler: e.messageCompiler,
      __meta: { framework: "vue" },
    };
    ((_.datetimeFormats = T.value),
      (_.numberFormats = b.value),
      (_.__datetimeFormatters = S(E) ? E.__datetimeFormatters : void 0),
      (_.__numberFormatters = S(E) ? E.__numberFormatters : void 0));
    const g = sr(_);
    return (a && xt(g), g);
  })()),
    Te(E, c.value, f.value));
  function $() {
    return [c.value, f.value, d.value, T.value, b.value];
  }
  const J = Le({
      get: () => c.value,
      set: (_) => {
        ((E.locale = _), (c.value = _));
      },
    }),
    Z = Le({
      get: () => f.value,
      set: (_) => {
        ((E.fallbackLocale = _), (f.value = _), Te(E, c.value, _));
      },
    }),
    G = Le(() => d.value),
    _e = Le(() => T.value),
    $e = Le(() => b.value);
  function Be() {
    return W(h) ? h : null;
  }
  function Ve(_) {
    ((h = _), (E.postTranslation = _));
  }
  function Ye() {
    return F;
  }
  function He(_) {
    (_ !== null && (u = Qt(_)), (F = _), (E.missing = u));
  }
  const ne = (_, g, U, Y, ue, De) => {
    $();
    let pe;
    try {
      (__INTLIFY_PROD_DEVTOOLS__, a || (E.fallbackContext = t ? rr() : void 0), (pe = _(E)));
    } finally {
      (__INTLIFY_PROD_DEVTOOLS__, a || (E.fallbackContext = void 0));
    }
    if ((U !== "translate exists" && H(pe) && pe === We) || (U === "translate exists" && !pe)) {
      const [wn, Jr] = g();
      return t && P ? Y(t) : ue(wn);
    } else {
      if (De(pe)) return pe;
      throw q(X.UNEXPECTED_RETURN_TYPE);
    }
  };
  function Fe(..._) {
    return ne(
      (g) => Reflect.apply(Gt, null, [g, ..._]),
      () => ct(..._),
      "translate",
      (g) => Reflect.apply(g.t, g, [..._]),
      (g) => g,
      (g) => N(g),
    );
  }
  function Ae(..._) {
    const [g, U, Y] = _;
    if (Y && !w(Y)) throw q(X.INVALID_ARGUMENT);
    return Fe(g, U, j({ resolvedMessage: !0 }, Y || {}));
  }
  function je(..._) {
    return ne(
      (g) => Reflect.apply($t, null, [g, ..._]),
      () => lt(..._),
      "datetime format",
      (g) => Reflect.apply(g.d, g, [..._]),
      () => Mt,
      (g) => N(g) || B(g),
    );
  }
  function Ge(..._) {
    return ne(
      (g) => Reflect.apply(Vt, null, [g, ..._]),
      () => it(..._),
      "number format",
      (g) => Reflect.apply(g.n, g, [..._]),
      () => Mt,
      (g) => N(g) || B(g),
    );
  }
  function Ke(_) {
    return _.map((g) => (N(g) || H(g) || O(g) ? Kt(String(g)) : g));
  }
  const Xe = { normalize: Ke, interpolate: (_) => _, type: "vnode" };
  function Je(..._) {
    return ne(
      (g) => {
        let U;
        const Y = g;
        try {
          ((Y.processor = Xe), (U = Reflect.apply(Gt, null, [Y, ..._])));
        } finally {
          Y.processor = null;
        }
        return U;
      },
      () => ct(..._),
      "translate",
      (g) => g[ut](..._),
      (g) => [Kt(g)],
      (g) => B(g),
    );
  }
  function Pe(..._) {
    return ne(
      (g) => Reflect.apply(Vt, null, [g, ..._]),
      () => it(..._),
      "number format",
      (g) => g[_t](..._),
      Jt,
      (g) => N(g) || B(g),
    );
  }
  function qe(..._) {
    return ne(
      (g) => Reflect.apply($t, null, [g, ..._]),
      () => lt(..._),
      "datetime format",
      (g) => g[ft](..._),
      Jt,
      (g) => N(g) || B(g),
    );
  }
  function Qe(_) {
    ((C = _), (E.pluralRules = C));
  }
  function Ze(_, g) {
    return ne(
      () => {
        if (!_) return !1;
        const U = N(g) ? g : c.value,
          Y = me(U),
          ue = E.messageResolver(Y, _);
        return te(ue) || Q(ue) || N(ue);
      },
      () => [_],
      "translate exists",
      (U) => Reflect.apply(U.te, U, [_, g]),
      Tr,
      (U) => O(U),
    );
  }
  function ze(_) {
    let g = null;
    const U = En(E, f.value, c.value);
    for (let Y = 0; Y < U.length; Y++) {
      const ue = d.value[U[Y]] || {},
        De = E.messageResolver(ue, _);
      if (De != null) {
        g = De;
        break;
      }
    }
    return g;
  }
  function be(_) {
    const g = ze(_);
    return g ?? (t ? t.tm(_) || {} : {});
  }
  function me(_) {
    return d.value[_] || {};
  }
  function de(_, g) {
    if (r) {
      const U = { [_]: g };
      for (const Y in U) z(U, Y) && ve(U[Y]);
      g = U[_];
    }
    ((d.value[_] = g), (E.messages = d.value));
  }
  function ye(_, g) {
    d.value[_] = d.value[_] || {};
    const U = { [_]: g };
    if (r) for (const Y in U) z(U, Y) && ve(U[Y]);
    ((g = U[_]), Re(g, d.value[_]), (E.messages = d.value));
  }
  function et(_) {
    return T.value[_] || {};
  }
  function o(_, g) {
    ((T.value[_] = g), (E.datetimeFormats = T.value), Bt(E, _, g));
  }
  function l(_, g) {
    ((T.value[_] = j(T.value[_] || {}, g)), (E.datetimeFormats = T.value), Bt(E, _, g));
  }
  function p(_) {
    return b.value[_] || {};
  }
  function A(_, g) {
    ((b.value[_] = g), (E.numberFormats = b.value), Yt(E, _, g));
  }
  function V(_, g) {
    ((b.value[_] = j(b.value[_] || {}, g)), (E.numberFormats = b.value), Yt(E, _, g));
  }
  (qt++,
    t &&
      Me &&
      (rt(t.locale, (_) => {
        i && ((c.value = _), (E.locale = _), Te(E, c.value, f.value));
      }),
      rt(t.fallbackLocale, (_) => {
        i && ((f.value = _), (E.fallbackLocale = _), Te(E, c.value, f.value));
      })));
  const D = {
    id: qt,
    locale: J,
    fallbackLocale: Z,
    get inheritLocale() {
      return i;
    },
    set inheritLocale(_) {
      ((i = _),
        _ &&
          t &&
          ((c.value = t.locale.value),
          (f.value = t.fallbackLocale.value),
          Te(E, c.value, f.value)));
    },
    get availableLocales() {
      return Object.keys(d.value).sort();
    },
    messages: G,
    get modifiers() {
      return I;
    },
    get pluralRules() {
      return C || {};
    },
    get isGlobal() {
      return a;
    },
    get missingWarn() {
      return y;
    },
    set missingWarn(_) {
      ((y = _), (E.missingWarn = y));
    },
    get fallbackWarn() {
      return v;
    },
    set fallbackWarn(_) {
      ((v = _), (E.fallbackWarn = v));
    },
    get fallbackRoot() {
      return P;
    },
    set fallbackRoot(_) {
      P = _;
    },
    get fallbackFormat() {
      return k;
    },
    set fallbackFormat(_) {
      ((k = _), (E.fallbackFormat = k));
    },
    get warnHtmlMessage() {
      return L;
    },
    set warnHtmlMessage(_) {
      ((L = _), (E.warnHtmlMessage = _));
    },
    get escapeParameter() {
      return m;
    },
    set escapeParameter(_) {
      ((m = _), (E.escapeParameter = _));
    },
    t: Fe,
    getLocaleMessage: me,
    setLocaleMessage: de,
    mergeLocaleMessage: ye,
    getPostTranslationHandler: Be,
    setPostTranslationHandler: Ve,
    getMissingHandler: Ye,
    setMissingHandler: He,
    [Fn]: Qe,
  };
  return (
    (D.datetimeFormats = _e),
    (D.numberFormats = $e),
    (D.rt = Ae),
    (D.te = Ze),
    (D.tm = be),
    (D.d = je),
    (D.n = Ge),
    (D.getDateTimeFormat = et),
    (D.setDateTimeFormat = o),
    (D.mergeDateTimeFormat = l),
    (D.getNumberFormat = p),
    (D.setNumberFormat = A),
    (D.mergeNumberFormat = V),
    (D[An] = n),
    (D[ut] = Je),
    (D[ft] = qe),
    (D[_t] = Pe),
    D
  );
}
function Cr(e) {
  const t = N(e.locale) ? e.locale : ke,
    n =
      N(e.fallbackLocale) || B(e.fallbackLocale) || S(e.fallbackLocale) || e.fallbackLocale === !1
        ? e.fallbackLocale
        : t,
    a = W(e.missing) ? e.missing : void 0,
    r = O(e.silentTranslationWarn) || ge(e.silentTranslationWarn) ? !e.silentTranslationWarn : !0,
    s = O(e.silentFallbackWarn) || ge(e.silentFallbackWarn) ? !e.silentFallbackWarn : !0,
    i = O(e.fallbackRoot) ? e.fallbackRoot : !0,
    c = !!e.formatFallbackMessages,
    f = S(e.modifiers) ? e.modifiers : {},
    d = e.pluralizationRules,
    T = W(e.postTranslation) ? e.postTranslation : void 0,
    b = N(e.warnHtmlInMessage) ? e.warnHtmlInMessage !== "off" : !0,
    y = !!e.escapeParameterHtml,
    v = O(e.sync) ? e.sync : !0;
  let P = e.messages;
  if (S(e.sharedMessages)) {
    const I = e.sharedMessages;
    P = Object.keys(I).reduce((E, x) => {
      const $ = E[x] || (E[x] = {});
      return (j($, I[x]), E);
    }, P || {});
  }
  const { __i18n: k, __root: F, __injectWithOption: u } = e,
    h = e.datetimeFormats,
    L = e.numberFormats,
    m = e.flatJson;
  return {
    locale: t,
    fallbackLocale: n,
    messages: P,
    flatJson: m,
    datetimeFormats: h,
    numberFormats: L,
    missing: a,
    missingWarn: r,
    fallbackWarn: s,
    fallbackRoot: i,
    fallbackFormat: c,
    modifiers: f,
    pluralRules: d,
    postTranslation: T,
    warnHtmlMessage: b,
    escapeParameter: y,
    messageResolver: e.messageResolver,
    inheritLocale: v,
    __i18n: k,
    __root: F,
    __injectWithOption: u,
  };
}
function dt(e = {}) {
  const t = It(Cr(e)),
    { __extender: n } = e,
    a = {
      id: t.id,
      get locale() {
        return t.locale.value;
      },
      set locale(r) {
        t.locale.value = r;
      },
      get fallbackLocale() {
        return t.fallbackLocale.value;
      },
      set fallbackLocale(r) {
        t.fallbackLocale.value = r;
      },
      get messages() {
        return t.messages.value;
      },
      get datetimeFormats() {
        return t.datetimeFormats.value;
      },
      get numberFormats() {
        return t.numberFormats.value;
      },
      get availableLocales() {
        return t.availableLocales;
      },
      get missing() {
        return t.getMissingHandler();
      },
      set missing(r) {
        t.setMissingHandler(r);
      },
      get silentTranslationWarn() {
        return O(t.missingWarn) ? !t.missingWarn : t.missingWarn;
      },
      set silentTranslationWarn(r) {
        t.missingWarn = O(r) ? !r : r;
      },
      get silentFallbackWarn() {
        return O(t.fallbackWarn) ? !t.fallbackWarn : t.fallbackWarn;
      },
      set silentFallbackWarn(r) {
        t.fallbackWarn = O(r) ? !r : r;
      },
      get modifiers() {
        return t.modifiers;
      },
      get formatFallbackMessages() {
        return t.fallbackFormat;
      },
      set formatFallbackMessages(r) {
        t.fallbackFormat = r;
      },
      get postTranslation() {
        return t.getPostTranslationHandler();
      },
      set postTranslation(r) {
        t.setPostTranslationHandler(r);
      },
      get sync() {
        return t.inheritLocale;
      },
      set sync(r) {
        t.inheritLocale = r;
      },
      get warnHtmlInMessage() {
        return t.warnHtmlMessage ? "warn" : "off";
      },
      set warnHtmlInMessage(r) {
        t.warnHtmlMessage = r !== "off";
      },
      get escapeParameterHtml() {
        return t.escapeParameter;
      },
      set escapeParameterHtml(r) {
        t.escapeParameter = r;
      },
      get pluralizationRules() {
        return t.pluralRules || {};
      },
      __composer: t,
      t(...r) {
        return Reflect.apply(t.t, t, [...r]);
      },
      rt(...r) {
        return Reflect.apply(t.rt, t, [...r]);
      },
      te(r, s) {
        return t.te(r, s);
      },
      tm(r) {
        return t.tm(r);
      },
      getLocaleMessage(r) {
        return t.getLocaleMessage(r);
      },
      setLocaleMessage(r, s) {
        t.setLocaleMessage(r, s);
      },
      mergeLocaleMessage(r, s) {
        t.mergeLocaleMessage(r, s);
      },
      d(...r) {
        return Reflect.apply(t.d, t, [...r]);
      },
      getDateTimeFormat(r) {
        return t.getDateTimeFormat(r);
      },
      setDateTimeFormat(r, s) {
        t.setDateTimeFormat(r, s);
      },
      mergeDateTimeFormat(r, s) {
        t.mergeDateTimeFormat(r, s);
      },
      n(...r) {
        return Reflect.apply(t.n, t, [...r]);
      },
      getNumberFormat(r) {
        return t.getNumberFormat(r);
      },
      setNumberFormat(r, s) {
        t.setNumberFormat(r, s);
      },
      mergeNumberFormat(r, s) {
        t.mergeNumberFormat(r, s);
      },
    };
  return ((a.__extender = n), a);
}
function Nr(e, t, n) {
  return {
    beforeCreate() {
      const a = Ie();
      if (!a) throw q(X.UNEXPECTED_ERROR);
      const r = this.$options;
      if (r.i18n) {
        const s = r.i18n;
        if ((r.__i18n && (s.__i18n = r.__i18n), (s.__root = t), this === this.$root))
          this.$i18n = Zt(e, s);
        else {
          ((s.__injectWithOption = !0), (s.__extender = n.__vueI18nExtend), (this.$i18n = dt(s)));
          const i = this.$i18n;
          i.__extender && (i.__disposer = i.__extender(this.$i18n));
        }
      } else if (r.__i18n)
        if (this === this.$root) this.$i18n = Zt(e, r);
        else {
          this.$i18n = dt({
            __i18n: r.__i18n,
            __injectWithOption: !0,
            __extender: n.__vueI18nExtend,
            __root: t,
          });
          const s = this.$i18n;
          s.__extender && (s.__disposer = s.__extender(this.$i18n));
        }
      else this.$i18n = e;
      (r.__i18nGlobal && Dn(t, r, r),
        (this.$t = (...s) => this.$i18n.t(...s)),
        (this.$rt = (...s) => this.$i18n.rt(...s)),
        (this.$te = (s, i) => this.$i18n.te(s, i)),
        (this.$d = (...s) => this.$i18n.d(...s)),
        (this.$n = (...s) => this.$i18n.n(...s)),
        (this.$tm = (s) => this.$i18n.tm(s)),
        n.__setInstance(a, this.$i18n));
    },
    mounted() {},
    unmounted() {
      const a = Ie();
      if (!a) throw q(X.UNEXPECTED_ERROR);
      const r = this.$i18n;
      (delete this.$t,
        delete this.$rt,
        delete this.$te,
        delete this.$d,
        delete this.$n,
        delete this.$tm,
        r.__disposer && (r.__disposer(), delete r.__disposer, delete r.__extender),
        n.__deleteInstance(a),
        delete this.$i18n);
    },
  };
}
function Zt(e, t) {
  ((e.locale = t.locale || e.locale),
    (e.fallbackLocale = t.fallbackLocale || e.fallbackLocale),
    (e.missing = t.missing || e.missing),
    (e.silentTranslationWarn = t.silentTranslationWarn || e.silentFallbackWarn),
    (e.silentFallbackWarn = t.silentFallbackWarn || e.silentFallbackWarn),
    (e.formatFallbackMessages = t.formatFallbackMessages || e.formatFallbackMessages),
    (e.postTranslation = t.postTranslation || e.postTranslation),
    (e.warnHtmlInMessage = t.warnHtmlInMessage || e.warnHtmlInMessage),
    (e.escapeParameterHtml = t.escapeParameterHtml || e.escapeParameterHtml),
    (e.sync = t.sync || e.sync),
    e.__composer[Fn](t.pluralizationRules || e.pluralizationRules));
  const n = Tt(e.locale, { messages: t.messages, __i18n: t.__i18n });
  return (
    Object.keys(n).forEach((a) => e.mergeLocaleMessage(a, n[a])),
    t.datetimeFormats &&
      Object.keys(t.datetimeFormats).forEach((a) => e.mergeDateTimeFormat(a, t.datetimeFormats[a])),
    t.numberFormats &&
      Object.keys(t.numberFormats).forEach((a) => e.mergeNumberFormat(a, t.numberFormats[a])),
    e
  );
}
const Ct = {
  tag: { type: [String, Object] },
  locale: { type: String },
  scope: { type: String, validator: (e) => e === "parent" || e === "global", default: "parent" },
  i18n: { type: Object },
};
function kr({ slots: e }, t) {
  return t.length === 1 && t[0] === "default"
    ? (e.default ? e.default() : []).reduce(
        (a, r) => [...a, ...(r.type === on ? r.children : [r])],
        [],
      )
    : t.reduce((n, a) => {
        const r = e[a];
        return (r && (n[a] = r()), n);
      }, M());
}
function Sn() {
  return on;
}
const vr = pt({
    name: "i18n-t",
    props: j(
      {
        keypath: { type: String, required: !0 },
        plural: { type: [Number, String], validator: (e) => H(e) || !isNaN(e) },
      },
      Ct,
    ),
    setup(e, t) {
      const { slots: n, attrs: a } = t,
        r = e.i18n || Nt({ useScope: e.scope, __useComponent: !0 });
      return () => {
        const s = Object.keys(n).filter((b) => b[0] !== "_"),
          i = M();
        (e.locale && (i.locale = e.locale),
          e.plural !== void 0 && (i.plural = N(e.plural) ? +e.plural : e.plural));
        const c = kr(t, s),
          f = r[ut](e.keypath, c, i),
          d = j(M(), a),
          T = N(e.tag) || w(e.tag) ? e.tag : Sn();
        return sn(T, d, f);
      };
    },
  }),
  zt = vr;
function Fr(e) {
  return B(e) && !N(e[0]);
}
function On(e, t, n, a) {
  const { slots: r, attrs: s } = t;
  return () => {
    const i = { part: !0 };
    let c = M();
    (e.locale && (i.locale = e.locale),
      N(e.format)
        ? (i.key = e.format)
        : w(e.format) &&
          (N(e.format.key) && (i.key = e.format.key),
          (c = Object.keys(e.format).reduce(
            (y, v) => (n.includes(v) ? j(M(), y, { [v]: e.format[v] }) : y),
            M(),
          ))));
    const f = a(e.value, i, c);
    let d = [i.key];
    B(f)
      ? (d = f.map((y, v) => {
          const P = r[y.type],
            k = P ? P({ [y.type]: y.value, index: v, parts: f }) : [y.value];
          return (Fr(k) && (k[0].key = `${y.type}-${v}`), k);
        }))
      : N(f) && (d = [f]);
    const T = j(M(), s),
      b = N(e.tag) || w(e.tag) ? e.tag : Sn();
    return sn(b, T, d);
  };
}
const Ar = pt({
    name: "i18n-n",
    props: j({ value: { type: Number, required: !0 }, format: { type: [String, Object] } }, Ct),
    setup(e, t) {
      const n = e.i18n || Nt({ useScope: e.scope, __useComponent: !0 });
      return On(e, t, Nn, (...a) => n[_t](...a));
    },
  }),
  en = Ar;
function Pr(e, t) {
  const n = e;
  if (e.mode === "composition") return n.__getInstance(t) || e.global;
  {
    const a = n.__getInstance(t);
    return a != null ? a.__composer : e.global.__composer;
  }
}
function Dr(e) {
  const t = (i) => {
    const { instance: c, value: f } = i;
    if (!c || !c.$) throw q(X.UNEXPECTED_ERROR);
    const d = Pr(e, c.$),
      T = tn(f);
    return [Reflect.apply(d.t, d, [...nn(T)]), d];
  };
  return {
    created: (i, c) => {
      const [f, d] = t(c);
      (Me &&
        e.global === d &&
        (i.__i18nWatcher = rt(d.locale, () => {
          c.instance && c.instance.$forceUpdate();
        })),
        (i.__composer = d),
        (i.textContent = f));
    },
    unmounted: (i) => {
      (Me &&
        i.__i18nWatcher &&
        (i.__i18nWatcher(), (i.__i18nWatcher = void 0), delete i.__i18nWatcher),
        i.__composer && ((i.__composer = void 0), delete i.__composer));
    },
    beforeUpdate: (i, { value: c }) => {
      if (i.__composer) {
        const f = i.__composer,
          d = tn(c);
        i.textContent = Reflect.apply(f.t, f, [...nn(d)]);
      }
    },
    getSSRProps: (i) => {
      const [c] = t(i);
      return { textContent: c };
    },
  };
}
function tn(e) {
  if (N(e)) return { path: e };
  if (S(e)) {
    if (!("path" in e)) throw q(X.REQUIRED_VALUE, "path");
    return e;
  } else throw q(X.INVALID_VALUE);
}
function nn(e) {
  const { path: t, locale: n, args: a, choice: r, plural: s } = e,
    i = {},
    c = a || {};
  return (N(n) && (i.locale = n), H(r) && (i.plural = r), H(s) && (i.plural = s), [t, c, i]);
}
function Sr(e, t, ...n) {
  const a = S(n[0]) ? n[0] : {};
  ((O(a.globalInstall) ? a.globalInstall : !0) &&
    ([zt.name, "I18nT"].forEach((s) => e.component(s, zt)),
    [en.name, "I18nN"].forEach((s) => e.component(s, en)),
    [rn.name, "I18nD"].forEach((s) => e.component(s, rn))),
    e.directive("t", Dr(t)));
}
const Or = le("global-vue-i18n");
function wr(e = {}) {
  const t = __VUE_I18N_LEGACY_API__ && O(e.legacy) ? e.legacy : __VUE_I18N_LEGACY_API__,
    n = O(e.globalInjection) ? e.globalInjection : !0,
    a = new Map(),
    [r, s] = Rr(e, t),
    i = le("");
  function c(b) {
    return a.get(b) || null;
  }
  function f(b, y) {
    a.set(b, y);
  }
  function d(b) {
    a.delete(b);
  }
  const T = {
    get mode() {
      return __VUE_I18N_LEGACY_API__ && t ? "legacy" : "composition";
    },
    async install(b, ...y) {
      if (((b.__VUE_I18N_SYMBOL__ = i), b.provide(b.__VUE_I18N_SYMBOL__, T), S(y[0]))) {
        const k = y[0];
        ((T.__composerExtend = k.__composerExtend), (T.__vueI18nExtend = k.__vueI18nExtend));
      }
      let v = null;
      (!t && n && (v = Yr(b, T.global)),
        __VUE_I18N_FULL_INSTALL__ && Sr(b, T, ...y),
        __VUE_I18N_LEGACY_API__ && t && b.mixin(Nr(s, s.__composer, T)));
      const P = b.unmount;
      b.unmount = () => {
        (v && v(), T.dispose(), P());
      };
    },
    get global() {
      return s;
    },
    dispose() {
      r.stop();
    },
    __instances: a,
    __getInstance: c,
    __setInstance: f,
    __deleteInstance: d,
  };
  return T;
}
function Nt(e = {}) {
  const t = Ie();
  if (t == null) throw q(X.MUST_BE_CALL_SETUP_TOP);
  if (!t.isCE && t.appContext.app != null && !t.appContext.app.__VUE_I18N_SYMBOL__)
    throw q(X.NOT_INSTALLED);
  const n = Mr(t),
    a = xr(n),
    r = Pn(t),
    s = Ur(e, r);
  if (s === "global") return (Dn(a, e, r), a);
  if (s === "parent") {
    let f = Wr(n, t, e.__useComponent);
    return (f == null && (f = a), f);
  }
  const i = n;
  let c = i.__getInstance(t);
  if (c == null) {
    const f = j({}, e);
    ("__i18n" in r && (f.__i18n = r.__i18n),
      a && (f.__root = a),
      (c = It(f)),
      i.__composerExtend && (c[mt] = i.__composerExtend(c)),
      Br(i, t, c),
      i.__setInstance(t, c));
  }
  return c;
}
function Rr(e, t) {
  const n = Rn(),
    a = __VUE_I18N_LEGACY_API__ && t ? n.run(() => dt(e)) : n.run(() => It(e));
  if (a == null) throw q(X.UNEXPECTED_ERROR);
  return [n, a];
}
function Mr(e) {
  const t = Wn(e.isCE ? Or : e.appContext.app.__VUE_I18N_SYMBOL__);
  if (!t) throw q(e.isCE ? X.NOT_INSTALLED_WITH_PROVIDE : X.UNEXPECTED_ERROR);
  return t;
}
function Ur(e, t) {
  return Ue(e) ? ("__i18n" in t ? "local" : "global") : e.useScope ? e.useScope : "local";
}
function xr(e) {
  return e.mode === "composition" ? e.global : e.global.__composer;
}
function Wr(e, t, n = !1) {
  let a = null;
  const r = t.root;
  let s = $r(t, n);
  for (; s != null;) {
    const i = e;
    if (e.mode === "composition") a = i.__getInstance(s);
    else if (__VUE_I18N_LEGACY_API__) {
      const c = i.__getInstance(s);
      c != null && ((a = c.__composer), n && a && !a[An] && (a = null));
    }
    if (a != null || r === s) break;
    s = s.parent;
  }
  return a;
}
function $r(e, t = !1) {
  return e == null ? null : (t && e.vnode.ctx) || e.parent;
}
function Br(e, t, n) {
  ($n(() => {}, t),
    Bn(() => {
      const a = n;
      e.__deleteInstance(t);
      const r = a[mt];
      r && (r(), delete a[mt]);
    }, t));
}
const Vr = ["locale", "fallbackLocale", "availableLocales"],
  an = ["t", "rt", "d", "n", "tm", "te"];
function Yr(e, t) {
  const n = Object.create(null);
  return (
    Vr.forEach((r) => {
      const s = Object.getOwnPropertyDescriptor(t, r);
      if (!s) throw q(X.UNEXPECTED_ERROR);
      const i = xn(s.value)
        ? {
            get() {
              return s.value.value;
            },
            set(c) {
              s.value.value = c;
            },
          }
        : {
            get() {
              return s.get && s.get();
            },
          };
      Object.defineProperty(n, r, i);
    }),
    (e.config.globalProperties.$i18n = n),
    an.forEach((r) => {
      const s = Object.getOwnPropertyDescriptor(t, r);
      if (!s || !s.value) throw q(X.UNEXPECTED_ERROR);
      Object.defineProperty(e.config.globalProperties, `$${r}`, s);
    }),
    () => {
      (delete e.config.globalProperties.$i18n,
        an.forEach((r) => {
          delete e.config.globalProperties[`$${r}`];
        }));
    }
  );
}
const Hr = pt({
    name: "i18n-d",
    props: j(
      { value: { type: [Number, Date], required: !0 }, format: { type: [String, Object] } },
      Ct,
    ),
    setup(e, t) {
      const n = e.i18n || Nt({ useScope: e.scope, __useComponent: !0 });
      return On(e, t, Cn, (...a) => n[ft](...a));
    },
  }),
  rn = Hr;
Lr();
za(wa);
er(qa);
tr(En);
if (__INTLIFY_PROD_DEVTOOLS__) {
  const e = fe();
  ((e.__INTLIFY__ = !0), Ra(e.__INTLIFY_DEVTOOLS_GLOBAL_HOOK__));
}
var jr = {
  name: "zh-cn",
  el: {
    breadcrumb: { label: "面包屑" },
    colorpicker: {
      confirm: "确定",
      clear: "清空",
      defaultLabel: "颜色选择器",
      description: "当前颜色 {color}，按 Enter 键选择新颜色",
      alphaLabel: "选择透明度的值",
    },
    datepicker: {
      now: "此刻",
      today: "今天",
      cancel: "取消",
      clear: "清空",
      confirm: "确定",
      dateTablePrompt: "使用方向键与 Enter 键可选择日期",
      monthTablePrompt: "使用方向键与 Enter 键可选择月份",
      yearTablePrompt: "使用方向键与 Enter 键可选择年份",
      selectedDate: "已选日期",
      selectDate: "选择日期",
      selectTime: "选择时间",
      startDate: "开始日期",
      startTime: "开始时间",
      endDate: "结束日期",
      endTime: "结束时间",
      prevYear: "前一年",
      nextYear: "后一年",
      prevMonth: "上个月",
      nextMonth: "下个月",
      year: "年",
      month1: "1 月",
      month2: "2 月",
      month3: "3 月",
      month4: "4 月",
      month5: "5 月",
      month6: "6 月",
      month7: "7 月",
      month8: "8 月",
      month9: "9 月",
      month10: "10 月",
      month11: "11 月",
      month12: "12 月",
      weeks: { sun: "日", mon: "一", tue: "二", wed: "三", thu: "四", fri: "五", sat: "六" },
      weeksFull: {
        sun: "星期日",
        mon: "星期一",
        tue: "星期二",
        wed: "星期三",
        thu: "星期四",
        fri: "星期五",
        sat: "星期六",
      },
      months: {
        jan: "一月",
        feb: "二月",
        mar: "三月",
        apr: "四月",
        may: "五月",
        jun: "六月",
        jul: "七月",
        aug: "八月",
        sep: "九月",
        oct: "十月",
        nov: "十一月",
        dec: "十二月",
      },
    },
    inputNumber: { decrease: "减少数值", increase: "增加数值" },
    select: { loading: "加载中", noMatch: "无匹配数据", noData: "无数据", placeholder: "请选择" },
    dropdown: { toggleDropdown: "切换下拉选项" },
    mention: { loading: "加载中" },
    cascader: {
      noMatch: "无匹配数据",
      loading: "加载中",
      placeholder: "请选择",
      noData: "暂无数据",
    },
    pagination: {
      goto: "前往",
      pagesize: "条/页",
      total: "共 {total} 条",
      pageClassifier: "页",
      page: "页",
      prev: "上一页",
      next: "下一页",
      currentPage: "第 {pager} 页",
      prevPages: "向前 {pager} 页",
      nextPages: "向后 {pager} 页",
      deprecationWarning: "你使用了一些已被废弃的用法，请参考 el-pagination 的官方文档",
    },
    dialog: { close: "关闭此对话框" },
    drawer: { close: "关闭此对话框" },
    messagebox: {
      title: "提示",
      confirm: "确定",
      cancel: "取消",
      error: "输入的数据不合法!",
      close: "关闭此对话框",
    },
    upload: {
      deleteTip: "按 Delete 键可删除",
      delete: "删除",
      preview: "查看图片",
      continue: "继续上传",
    },
    slider: {
      defaultLabel: "滑块介于 {min} 至 {max}",
      defaultRangeStartLabel: "选择起始值",
      defaultRangeEndLabel: "选择结束值",
    },
    table: {
      emptyText: "暂无数据",
      confirmFilter: "筛选",
      resetFilter: "重置",
      clearFilter: "全部",
      sumText: "合计",
    },
    tour: { next: "下一步", previous: "上一步", finish: "结束导览" },
    tree: { emptyText: "暂无数据" },
    transfer: {
      noMatch: "无匹配数据",
      noData: "无数据",
      titles: ["列表 1", "列表 2"],
      filterPlaceholder: "请输入搜索内容",
      noCheckedFormat: "共 {total} 项",
      hasCheckedFormat: "已选 {checked}/{total} 项",
    },
    image: { error: "加载失败" },
    pageHeader: { title: "返回" },
    popconfirm: { confirmButtonText: "确定", cancelButtonText: "取消" },
    carousel: {
      leftArrow: "上一张幻灯片",
      rightArrow: "下一张幻灯片",
      indicator: "幻灯片切换至索引 {index}",
    },
  },
};
const Gr = {
    check: {
      page_title: " · 环境检查",
      title: "应用中心",
      website: "网站",
      extension: "插件",
      content: {
        open_store: "打开店铺",
        actual_testing: "实际检测",
        local_net: "本地网络",
        agent: "绑定设备",
        equipment_code: "设备编码",
        copy_equipment_code: "复制设备编码",
        copy_equipment_code_success: "设备编码已复制",
        copy_equipment_code_failed: "复制失败，请手动复制",
        type: "类型",
        ip_testing: "设备安全检测",
        hunji_testing: "环境安全检测",
        line_testing: "线路优化检测",
        used_web: "常用网站",
        detecting: "检测中",
        wieh_login: "当前环境检测安全，可以放心登录。",
        the_test_failed: "当前环境检测未通过",
        the_test_failed_ipv6: "暂不支持Ipv6，请确认当前IP是否IPv6！",
        reopen: "店铺信息不存在，请重新打开",
        not_connected: "未连接上客户端！",
        after_inspection: "正在进行环境安全检测，请在检测完毕后在进行其他操作~",
        category: "所属类目",
        all: "全部",
        no_data: "暂无数据",
        add_more_extensions: "添加更多插件",
        classify: "分类",
        status: "状态",
        added: "已添加",
        continue_add: "继续添加",
        delete: "删除",
        add: "添加",
        input_chrome_url: "输入Chrome应用商店上的扩展程序URL",
        input_extension_url: "请输入扩展程序URL",
        submit: "提交",
        submit_tip1: "插件添加申请已经反馈给后台，通过审核后将展示在应用中心，",
        submit_tip2: "请关注插件更新并进行添加",
        submit_tip3: "好的，知道了",
        add_extension: "添加应用",
        choose_store: "选择店铺",
        selected_store: "已选定店铺",
        cancel: "取消",
        query: "确定",
        vpn: "当前检测到有外网，请确认是否开启代理或VPN",
        vpn_ip: "我们检测出您的本机外网设备为：",
        confirm_binding: "，是否确认绑定？",
        recommend_plugins: "推荐插件",
        closeAdvertisement: "关闭广告",
        closeAdvertisementDay1: "1天内不展示",
        closeAdvertisementDay3: "3天内不展示",
        closeAdvertisementDay7: "7天内不展示",
        open_method_setting: "打开方式设置",
        open_method_manual: "手动打开",
        open_method_auto: "自动打开当前店铺默认网页",
        open_method_custom: "打开特定网页或一组网页",
        open_method_resume: "继续浏览上次打开的页面",
        open_method_resume_hint: "仅当前设备生效，下次打开店铺时恢复",
        open_method_restore_failed: "部分页面未能恢复，请重试或手动打开",
        open_method_local_save_failed: "本地设置保存失败，请重试",
        open_method_add_page: "添加新网页",
        open_method_edit_page: "编辑网页",
        open_method_url_label: "网址：",
        open_method_url_placeholder: "请输入页面地址",
        open_method_url_required: "请输入页面地址",
        open_method_url_invalid: "请输入正确的网址",
        open_method_url_duplicate: "该网页已添加",
        open_method_need_one: "请至少添加一个网页",
        open_method_max_pages: "最多添加 5 个网页",
        open_method_move_up: "上移",
        open_method_move_down: "下移",
        open_method_drag_tip: "拖动调整顺序",
        open_method_edit: "编辑",
        open_method_delete: "删除",
        open_method_save: "保存",
        open_method_save_success: "打开方式设置成功",
        open_method_save_failed: "打开方式设置保存失败，已使用本地设置兜底",
        open_method_urls_save_failed: "网页列表保存失败",
      },
      operation_tips: {
        true_url: "请输入正确的扩展程序URL",
        delete_tip_desc: "本操作将删除所有店铺中已添加的本应用。是否确定删除应用？",
        delete_query: "确定删除",
        delete_tip: "删除应用提示",
      },
      network_exception: {
        title: "网络异常",
        content: "检测到当前店铺网络异常，即将尝试网络修复!!!",
        ok: "确定",
        close: "关闭",
      },
      transit: {
        title: "加速线路",
        subtitle: "若当前线路检测失败，您可以手动切换其他加速线路",
        in_use: "当前使用",
        switch: "切换",
        test: "测速",
        test_all: "全部测速",
        testing: "测速中...",
        not_tested: "未测速",
        test_failed: "测速失败",
        no_line: "暂无可测速的加速线路",
        ping_failed: "本地到加速线路 Ping 失败",
        switch_timeout: "切换加速线路超时",
        fetch_timeout: "加速线路到网站测速超时",
        batch_done: "测速完成",
        line_name: "加速线路 {n}",
        line_short_name: "线路 {n}",
        direct_line: "直连线路",
        auto_switch_on: "开启切换最优线路",
        auto_switch_off: "关闭切换最优线路",
        switch_best: "切换最优",
        guide_text_1: "网络卡顿？点我试试，",
        guide_text_2: "一键自动切换最优线路",
        local_latency: "本地延迟",
        line_latency: "线路延迟",
        actual_latency: "实际延迟",
        line_latency_failed: "线路延迟测速失败",
        line_latency_unavailable: "线路延迟测速返回异常状态",
        line_latency_no_total: "线路延迟测速返回缺少 total_ms",
        current_testing_line: "当前检测线路：{lineName}（{status}）",
        current_testing_status: "当前检测状态：{status}",
        best_line_in_use: "最优线路已在使用中：{lineName}",
        auto_switched_best: "已自动切换最优线路：{lineName}",
      },
    },
    newtab: {
      page_title: "新标签页",
      welcome: "欢迎使用浏览器",
      new_custom_tab: "这是自定义的新标签页",
    },
    loading: {
      loading: "正在加载中，请稍候...",
      progress: "正在初始化，请耐心等待",
      checking: "正在检测中，请稍候...",
    },
    popup: {
      shop_assistant: "店铺助手",
      search_shop_name: "请输入店铺名称",
      null_ip: "(无设备)",
      ip_beoverdue: "(设备已过期)",
      refresh: "刷新",
      login_manage: "登录管理",
      success: "成功",
      fail: "失败",
      loading: "检测中...",
      astartup: "启动中......",
      dont_open: "该店铺已被他人打开，暂不允许打开！",
      mall_open: "最近打开",
      mall_all: "所有店铺",
      search: "搜索",
    },
    cookieTool: {
      title: "Cookie 导入导出",
      currentSite: "当前网站",
      allCookies: "全部 Cookie",
      importTab: "导入",
      exportTab: "导出",
      jsonPlaceholder: "粘贴 Cookie JSON 对象或数组",
      importAction: "导入 Cookie",
      format: "导出格式",
      copyAction: "复制",
      empty: "当前范围没有 Cookie",
      imported: "成功 {count} 条",
      failed: "失败 {count} 条",
      skipped: "跳过 {count} 条",
      copied: "已复制 {count} 条 Cookie",
      details: "查看详情",
      item: "第 {index} 条",
      cookieCount: "当前范围 {count} 条",
      invalidJson: "导入失败",
      loadFailed: "读取 Cookie 失败",
      copyFailed: "复制失败",
    },
    warning: {
      abnormal_environment: "您所访问的网页可能涉及不符合相关法律法规和政策的内容，未予显示。",
      abnormal_access:
        "您所登录的子账号当前没有权限访问此页面，若要访问此页面请联系管理员修改您的访问网页权限",
      abnormal_application_tip: "专属设备禁止访问其它地址。",
      prompt_to_restart:
        "提示: zhanfubrowser浏览器提供的设备皆受国家网络监管，youtube等网站不支持访问，不提供翻墙服务",
      address: "当前地址：",
      ruleName: "当前匹配规则名称：",
      abnormal_application:
        "若您访问的是符合相关法律法规和政策的网站，请联系客服微信zhanfubrowser了解访问申请流程",
      abnormal_website:
        "若您访问的网站shopify、shopline、店匠、shopyy等平台的独立站，请申请加白，非shopify、shopline、店匠、shopyy等平台的加白申请一律不通过。",
      failure_reason: "最近一次审核失败原因：",
      check_status: "当前审核状态：",
      copy: "复制",
      add_whitelist: "加入白名单",
      certification_reminder: "个人实名认证通知",
      certification_tips: "请前往 企业管理-》认证管理-》企业或个人认证",
      certification_message1: "检测您当前未进行实名认证操作，",
      certification_message2: "为了规范互联网信息服务活动，促进互联网信息服务健康有序发展，",
      certification_message3: "加入白名单需进行实名认证。",
      certification_status: "个人实名待认证",
      certification_cancel: "取消认证",
      Immediately_authenticate: "立即认证",
      upgrade: "去升级",
      error_message:
        "很抱歉，您所申请加入白名单的网站不是可申请加白平台的相关站点。增加联系客服进行跳转。",
      success_message: "加白通过后，刷新当前页面，即可继续访问!",
      unsuccessful: "申请失败!",
    },
  },
  Kr = {
    check: {
      page_title: " · Environment check",
      title: "App Center",
      website: "Website",
      extension: "Extension",
      content: {
        open_store: "Open the store",
        actual_testing: "Actual testing",
        local_net: "Local network",
        agent: "IP",
        equipment_code: "Equipment code",
        copy_equipment_code: "Copy equipment code",
        copy_equipment_code_success: "Equipment code copied",
        copy_equipment_code_failed: "Copy failed, please copy manually",
        type: "Type",
        ip_testing: "IP security testing",
        hunji_testing: "Environmental security testing",
        line_testing: "Line optimization testing",
        used_web: " commonly used websites",
        detecting: "detecting",
        wieh_login: "Current environment detection is safe",
        the_test_failed: "The current environment test failed",
        the_test_failed_ipv6:
          "IPv6 is not supported yet. Please confirm whether the current IP is IPv6!",
        reopen: "The store information does not exist, please reopen it",
        not_connected: "The client is failed to connet",
        after_inspection:
          "Environmental safety testing is in progress, please proceed other operations after testing~",
        category: "Category",
        all: "All",
        no_data: "No data",
        add_more_extensions: "Add more extensions",
        classify: "Classify",
        status: "Status",
        added: "Added",
        continue_add: "Continue adding",
        delete: "Delete",
        add: "Add",
        input_chrome_url: "Please enter the extension URL on the chrome store",
        input_extension_url: "Please enter the extender URL",
        submit: "Submit",
        submit_tip1:
          "The application for adding plug-ins has been fed back to the background and will be displayed in the application center after being approved,",
        submit_tip2: "Please follow the plug-in update and add it",
        submit_tip3: "OK, I see",
        add_extension: "Add app",
        choose_store: "Choose store",
        selected_store: "Selected store",
        cancel: "Cancel",
        query: "Query",
        vpn: "We have detected an external network, please confirm if you have enabled a proxy or VPN",
        vpn_ip: "We have detected that your local external network device is: ",
        confirm_binding: ",Are you sure to bind?",
        recommend_plugins: "Recommended plugins",
        closeAdvertisement: "close Advertisement",
        closeAdvertisementDay1: "Not displayed within 1 day",
        closeAdvertisementDay3: "Not displayed within 3 day",
        closeAdvertisementDay7: "Not displayed within 7 day",
        open_method_setting: "Open method settings",
        open_method_manual: "Open manually",
        open_method_auto: "Automatically open default page of current mall",
        open_method_custom: "Open a specific page or set of pages",
        open_method_resume: "Continue browsing previous pages",
        open_method_resume_hint: "On this device only. Applies the next time you open the store.",
        open_method_restore_failed:
          "Some pages could not be restored. Please retry or open them manually.",
        open_method_local_save_failed: "Could not save the local setting. Please retry.",
        open_method_add_page: "Add a new page",
        open_method_edit_page: "Edit page",
        open_method_url_label: "URL:",
        open_method_url_placeholder: "Enter page address",
        open_method_url_required: "Please enter a page address",
        open_method_url_invalid: "Please enter a valid URL",
        open_method_url_duplicate: "This page has already been added",
        open_method_need_one: "Please add at least one page",
        open_method_max_pages: "Up to 5 pages",
        open_method_move_up: "Move up",
        open_method_move_down: "Move down",
        open_method_drag_tip: "Drag to reorder",
        open_method_edit: "Edit",
        open_method_delete: "Delete",
        open_method_save: "Save",
        open_method_save_success: "Open method saved successfully",
        open_method_save_failed: "Failed to save open method, local fallback applied",
        open_method_urls_save_failed: "Failed to save page list",
      },
      operation_tips: {
        true_url: "Please enter the correct extender URL",
        delete_tip_desc:
          "This operation will delete this app that has been added in all stores. Are you sure you want to delete the app?",
        delete_query: "Are you sure to delete",
        delete_tip: "Delete application tips",
      },
      network_exception: {
        title: "Network Exception",
        content: "Network exception detected, attempting network repair!!!",
        ok: "Confirm",
        close: "Close",
      },
      transit: {
        title: "Line Selection",
        subtitle:
          "If the current line fails detection, you can manually switch to other acceleration lines",
        in_use: "In Use",
        switch: "Switch",
        test: "Test",
        test_all: "Test All",
        testing: "Testing...",
        not_tested: "Not tested",
        test_failed: "Test failed",
        no_line: "No acceleration lines available",
        ping_failed: "Local to transit ping failed",
        switch_timeout: "Transit switch timeout",
        fetch_timeout: "Transit to website timeout",
        batch_done: "Test finished",
        line_name: "Acceleration Line {n}",
        line_short_name: "Line {n}",
        direct_line: "Direct Line",
        auto_switch_on: "Enable auto-switch to best line",
        auto_switch_off: "Disable auto-switch to best line",
        switch_best: "Switch to Best",
        guide_text_1: "Network lagging? Try me,",
        guide_text_2: "Auto-switch to the best line in one click",
        local_latency: "Local Latency",
        line_latency: "Line Latency",
        actual_latency: "Actual Latency",
        line_latency_failed: "Line latency test failed",
        line_latency_unavailable: "Line latency returned unavailable status",
        line_latency_no_total: "Line latency response missing total_ms",
        current_testing_line: "Current testing line: {lineName} ({status})",
        current_testing_status: "Current test status: {status}",
        best_line_in_use: "Best line already in use: {lineName}",
        auto_switched_best: "Auto-switched to best line: {lineName}",
      },
    },
    newtab: {
      page_title: "newTab",
      welcome_cyt: "Welcome to browser",
      new_custom_tab: "This is a new custom tab",
    },
    loading: {
      loading: "Loading...",
      progress: "Initializing, please wait",
      checking: "Checking, please wait...",
    },
    popup: {
      shop_assistant: "Store assistant",
      search_shop_name: "Please enter the store name",
      null_ip: "(No IP)",
      ip_beoverdue: "(IP has expired)",
      refresh: "Refresh",
      login_manage: "Login Administration",
      success: "Success",
      loading: "Loading...",
      fail: "Fail",
      astartup: "Start-up......",
      dont_open:
        "The store has been opened by others and is not allowed to open for the time being",
      mall_open: "Recently opened",
      mall_all: "All Shop",
      search: "Search",
    },
    cookieTool: {
      title: "Cookie import and export",
      currentSite: "Current site",
      allCookies: "All cookies",
      importTab: "Import",
      exportTab: "Export",
      jsonPlaceholder: "Paste a Cookie JSON object or array",
      importAction: "Import cookies",
      format: "Export format",
      copyAction: "Copy",
      empty: "No cookies in the current scope",
      imported: "{count} imported",
      failed: "{count} failed",
      skipped: "{count} skipped",
      copied: "Copied {count} cookies",
      details: "View details",
      item: "Item {index}",
      cookieCount: "{count} cookies in scope",
      invalidJson: "Import failed",
      loadFailed: "Failed to read cookies",
      copyFailed: "Copy failed",
    },
    warning: {
      abnormal_environment:
        "The webpage you visited may involve content that does not comply with relevant laws, regulations and policies and is not displayed.",
      prompt_to_restart:
        "Prompt: please confirm whether the current agent IP is normal or not, open it again, or contact the administrator for handling.",
      abnormal_access:
        "The sub account you are logged into currently does not have permission to access this page. To access this page, please contact the administrator to modify your webpage access permissions",
      abnormal_application_tip: "Dedicated devices prohibit access to other addresses.",
      address: "Current address: ",
      ruleName: "Current matching rule name: ",
      abnormal_application:
        "If you are visiting a website that complies with relevant laws, regulations, and policies, please contact customer service on WeChat zhanfubrowser to learn about the access application process",
      abnormal_website:
        "If the website you visit Shopify shopline、 For independent websites on platforms such as Shopsmith and Shopyy, please apply for whitelisting, not Shopify shopline、 Whitening applications from platforms such as Shopsmith and Shopyy will not be approved.",
      failure_reason: "Reason for the latest audit failure: ",
      check_status: "Current audit status: ",
      copy: "copy",
      add_whitelist: "Add to whitelist",
      certification_reminder: "Personal Authentication Notice",
      certification_tips:
        "Enterprise Management - > Certification Management - > Enterprise or Individual Certification",
      certification_message1:
        "Please go to Enterprise Management -> Certification Management -> Enterprise or Individual Certification",
      certification_message2:
        "It is detected that you have not conducted real name authentication. In order to standardize Internet information service activities and promote the healthy and orderly development of Internet information services, you need to conduct real name authentication to join the white list.",
      certification_message3: "",
      certification_status: "Personal real name pending authentication",
      certification_cancel: "Cancel authentication",
      Immediately_authenticate: "Immediately authenticate",
      upgrade: "Go upgrade",
      error_message:
        "Sorry, the website you applied to join the whitelist is not a relevant site that can apply for whitelisting. Add contact customer service for redirection.",
      success_message: "After whitelisting, refresh the current page to continue accessing!",
      Unsuccessful: "Unsuccessful!",
    },
  };
let Xr = await Hn();
const Zr = wr({
  locale: Xr || "zh",
  messages: { zh: Object.assign(Gr, jr), en: Object.assign(Kr, jn) },
  globalInjection: !0,
  silentFallbackWarn: !0,
});
export { jn as E, Zr as i, Nt as u };
