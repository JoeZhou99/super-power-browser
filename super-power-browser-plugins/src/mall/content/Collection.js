(function () {
  "use strict";
  const tr = {
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
  let Ne = {};
  Ne = tr;
  const Oe = Ne,
    rr = Oe.VUE_APP_MMS,
    ar = (r) =>
      new Promise((n) => {
        chrome.cookies.get({ url: r.url || rr, name: r.name }, (e) => {
          n((e == null ? void 0 : e.value) || null);
        });
      }),
    nr = "get_chrome_cookie",
    or = Oe.VUE_APP_MMS;
  function ir(r) {
    var t;
    const n = r.url ?? or,
      { name: e } = r;
    return typeof chrome > "u" || !((t = chrome.runtime) != null && t.sendMessage)
      ? Promise.resolve(null)
      : chrome.runtime
          .sendMessage({ type: nr, url: n, name: e })
          .then((u) => (u == null ? void 0 : u.value) ?? null)
          .catch(() => null);
  }
  const sr = "chrome_token";
  function xr() {
    var r;
    return (
      typeof chrome < "u" && typeof ((r = chrome.cookies) == null ? void 0 : r.get) == "function"
    );
  }
  async function J0(r) {
    return xr() ? ar(r) : ir(r);
  }
  const cr = "browserVersion";
  async function lr() {
    return await J0({ name: cr });
  }
  async function fr() {
    return await J0({ name: sr });
  }
  async function dr() {
    return await J0({ name: "lang" });
  }
  var U =
    typeof globalThis < "u"
      ? globalThis
      : typeof window < "u"
        ? window
        : typeof global < "u"
          ? global
          : typeof self < "u"
            ? self
            : {};
  function pr(r) {
    if (r.__esModule) return r;
    var n = r.default;
    if (typeof n == "function") {
      var e = function t() {
        return this instanceof t
          ? Reflect.construct(n, arguments, this.constructor)
          : n.apply(this, arguments);
      };
      e.prototype = n.prototype;
    } else e = {};
    return (
      Object.defineProperty(e, "__esModule", { value: !0 }),
      Object.keys(r).forEach(function (t) {
        var u = Object.getOwnPropertyDescriptor(r, t);
        Object.defineProperty(
          e,
          t,
          u.get
            ? u
            : {
                enumerable: !0,
                get: function () {
                  return r[t];
                },
              },
        );
      }),
      e
    );
  }
  var qe = { exports: {} };
  function ur(r) {
    throw new Error(
      'Could not dynamically require "' +
        r +
        '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.',
    );
  }
  var ee = { exports: {} };
  const hr = pr(
    Object.freeze(
      Object.defineProperty({ __proto__: null, default: {} }, Symbol.toStringTag, {
        value: "Module",
      }),
    ),
  );
  var je;
  function q() {
    return (
      je ||
        ((je = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t();
          })(U, function () {
            var e =
              e ||
              (function (t, u) {
                var h;
                if (
                  (typeof window < "u" && window.crypto && (h = window.crypto),
                  typeof self < "u" && self.crypto && (h = self.crypto),
                  typeof globalThis < "u" && globalThis.crypto && (h = globalThis.crypto),
                  !h && typeof window < "u" && window.msCrypto && (h = window.msCrypto),
                  !h && typeof U < "u" && U.crypto && (h = U.crypto),
                  !h && typeof ur == "function")
                )
                  try {
                    h = hr;
                  } catch {}
                var m = function () {
                    if (h) {
                      if (typeof h.getRandomValues == "function")
                        try {
                          return h.getRandomValues(new Uint32Array(1))[0];
                        } catch {}
                      if (typeof h.randomBytes == "function")
                        try {
                          return h.randomBytes(4).readInt32LE();
                        } catch {}
                    }
                    throw new Error(
                      "Native crypto module could not be used to get secure random number.",
                    );
                  },
                  g =
                    Object.create ||
                    (function () {
                      function s() {}
                      return function (x) {
                        var p;
                        return ((s.prototype = x), (p = new s()), (s.prototype = null), p);
                      };
                    })(),
                  v = {},
                  a = (v.lib = {}),
                  o = (a.Base = (function () {
                    return {
                      extend: function (s) {
                        var x = g(this);
                        return (
                          s && x.mixIn(s),
                          (!x.hasOwnProperty("init") || this.init === x.init) &&
                            (x.init = function () {
                              x.$super.init.apply(this, arguments);
                            }),
                          (x.init.prototype = x),
                          (x.$super = this),
                          x
                        );
                      },
                      create: function () {
                        var s = this.extend();
                        return (s.init.apply(s, arguments), s);
                      },
                      init: function () {},
                      mixIn: function (s) {
                        for (var x in s) s.hasOwnProperty(x) && (this[x] = s[x]);
                        s.hasOwnProperty("toString") && (this.toString = s.toString);
                      },
                      clone: function () {
                        return this.init.prototype.extend(this);
                      },
                    };
                  })()),
                  B = (a.WordArray = o.extend({
                    init: function (s, x) {
                      ((s = this.words = s || []),
                        x != u ? (this.sigBytes = x) : (this.sigBytes = s.length * 4));
                    },
                    toString: function (s) {
                      return (s || c).stringify(this);
                    },
                    concat: function (s) {
                      var x = this.words,
                        p = s.words,
                        b = this.sigBytes,
                        C = s.sigBytes;
                      if ((this.clamp(), b % 4))
                        for (var A = 0; A < C; A++) {
                          var D = (p[A >>> 2] >>> (24 - (A % 4) * 8)) & 255;
                          x[(b + A) >>> 2] |= D << (24 - ((b + A) % 4) * 8);
                        }
                      else for (var H = 0; H < C; H += 4) x[(b + H) >>> 2] = p[H >>> 2];
                      return ((this.sigBytes += C), this);
                    },
                    clamp: function () {
                      var s = this.words,
                        x = this.sigBytes;
                      ((s[x >>> 2] &= 4294967295 << (32 - (x % 4) * 8)),
                        (s.length = t.ceil(x / 4)));
                    },
                    clone: function () {
                      var s = o.clone.call(this);
                      return ((s.words = this.words.slice(0)), s);
                    },
                    random: function (s) {
                      for (var x = [], p = 0; p < s; p += 4) x.push(m());
                      return new B.init(x, s);
                    },
                  })),
                  i = (v.enc = {}),
                  c = (i.Hex = {
                    stringify: function (s) {
                      for (var x = s.words, p = s.sigBytes, b = [], C = 0; C < p; C++) {
                        var A = (x[C >>> 2] >>> (24 - (C % 4) * 8)) & 255;
                        (b.push((A >>> 4).toString(16)), b.push((A & 15).toString(16)));
                      }
                      return b.join("");
                    },
                    parse: function (s) {
                      for (var x = s.length, p = [], b = 0; b < x; b += 2)
                        p[b >>> 3] |= parseInt(s.substr(b, 2), 16) << (24 - (b % 8) * 4);
                      return new B.init(p, x / 2);
                    },
                  }),
                  l = (i.Latin1 = {
                    stringify: function (s) {
                      for (var x = s.words, p = s.sigBytes, b = [], C = 0; C < p; C++) {
                        var A = (x[C >>> 2] >>> (24 - (C % 4) * 8)) & 255;
                        b.push(String.fromCharCode(A));
                      }
                      return b.join("");
                    },
                    parse: function (s) {
                      for (var x = s.length, p = [], b = 0; b < x; b++)
                        p[b >>> 2] |= (s.charCodeAt(b) & 255) << (24 - (b % 4) * 8);
                      return new B.init(p, x);
                    },
                  }),
                  f = (i.Utf8 = {
                    stringify: function (s) {
                      try {
                        return decodeURIComponent(escape(l.stringify(s)));
                      } catch {
                        throw new Error("Malformed UTF-8 data");
                      }
                    },
                    parse: function (s) {
                      return l.parse(unescape(encodeURIComponent(s)));
                    },
                  }),
                  d = (a.BufferedBlockAlgorithm = o.extend({
                    reset: function () {
                      ((this._data = new B.init()), (this._nDataBytes = 0));
                    },
                    _append: function (s) {
                      (typeof s == "string" && (s = f.parse(s)),
                        this._data.concat(s),
                        (this._nDataBytes += s.sigBytes));
                    },
                    _process: function (s) {
                      var x,
                        p = this._data,
                        b = p.words,
                        C = p.sigBytes,
                        A = this.blockSize,
                        D = A * 4,
                        H = C / D;
                      s ? (H = t.ceil(H)) : (H = t.max((H | 0) - this._minBufferSize, 0));
                      var y = H * A,
                        F = t.min(y * 4, C);
                      if (y) {
                        for (var _ = 0; _ < y; _ += A) this._doProcessBlock(b, _);
                        ((x = b.splice(0, y)), (p.sigBytes -= F));
                      }
                      return new B.init(x, F);
                    },
                    clone: function () {
                      var s = o.clone.call(this);
                      return ((s._data = this._data.clone()), s);
                    },
                    _minBufferSize: 0,
                  }));
                a.Hasher = d.extend({
                  cfg: o.extend(),
                  init: function (s) {
                    ((this.cfg = this.cfg.extend(s)), this.reset());
                  },
                  reset: function () {
                    (d.reset.call(this), this._doReset());
                  },
                  update: function (s) {
                    return (this._append(s), this._process(), this);
                  },
                  finalize: function (s) {
                    s && this._append(s);
                    var x = this._doFinalize();
                    return x;
                  },
                  blockSize: 16,
                  _createHelper: function (s) {
                    return function (x, p) {
                      return new s.init(p).finalize(x);
                    };
                  },
                  _createHmacHelper: function (s) {
                    return function (x, p) {
                      return new E.HMAC.init(s, p).finalize(x);
                    };
                  },
                });
                var E = (v.algo = {});
                return v;
              })(Math);
            return e;
          });
        })(ee)),
      ee.exports
    );
  }
  var te = { exports: {} },
    Ke;
  function K0() {
    return (
      Ke ||
        ((Ke = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function (t) {
                var u = e,
                  h = u.lib,
                  m = h.Base,
                  g = h.WordArray,
                  v = (u.x64 = {});
                ((v.Word = m.extend({
                  init: function (a, o) {
                    ((this.high = a), (this.low = o));
                  },
                })),
                  (v.WordArray = m.extend({
                    init: function (a, o) {
                      ((a = this.words = a || []),
                        o != t ? (this.sigBytes = o) : (this.sigBytes = a.length * 8));
                    },
                    toX32: function () {
                      for (var a = this.words, o = a.length, B = [], i = 0; i < o; i++) {
                        var c = a[i];
                        (B.push(c.high), B.push(c.low));
                      }
                      return g.create(B, this.sigBytes);
                    },
                    clone: function () {
                      for (
                        var a = m.clone.call(this),
                          o = (a.words = this.words.slice(0)),
                          B = o.length,
                          i = 0;
                        i < B;
                        i++
                      )
                        o[i] = o[i].clone();
                      return a;
                    },
                  })));
              })(),
              e
            );
          });
        })(te)),
      te.exports
    );
  }
  var re = { exports: {} },
    Xe;
  function vr() {
    return (
      Xe ||
        ((Xe = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function () {
                if (typeof ArrayBuffer == "function") {
                  var t = e,
                    u = t.lib,
                    h = u.WordArray,
                    m = h.init,
                    g = (h.init = function (v) {
                      if (
                        (v instanceof ArrayBuffer && (v = new Uint8Array(v)),
                        (v instanceof Int8Array ||
                          (typeof Uint8ClampedArray < "u" && v instanceof Uint8ClampedArray) ||
                          v instanceof Int16Array ||
                          v instanceof Uint16Array ||
                          v instanceof Int32Array ||
                          v instanceof Uint32Array ||
                          v instanceof Float32Array ||
                          v instanceof Float64Array) &&
                          (v = new Uint8Array(v.buffer, v.byteOffset, v.byteLength)),
                        v instanceof Uint8Array)
                      ) {
                        for (var a = v.byteLength, o = [], B = 0; B < a; B++)
                          o[B >>> 2] |= v[B] << (24 - (B % 4) * 8);
                        m.call(this, o, a);
                      } else m.apply(this, arguments);
                    });
                  g.prototype = h;
                }
              })(),
              e.lib.WordArray
            );
          });
        })(re)),
      re.exports
    );
  }
  var ae = { exports: {} },
    Ge;
  function gr() {
    return (
      Ge ||
        ((Ge = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.WordArray,
                  m = t.enc;
                ((m.Utf16 = m.Utf16BE =
                  {
                    stringify: function (v) {
                      for (var a = v.words, o = v.sigBytes, B = [], i = 0; i < o; i += 2) {
                        var c = (a[i >>> 2] >>> (16 - (i % 4) * 8)) & 65535;
                        B.push(String.fromCharCode(c));
                      }
                      return B.join("");
                    },
                    parse: function (v) {
                      for (var a = v.length, o = [], B = 0; B < a; B++)
                        o[B >>> 1] |= v.charCodeAt(B) << (16 - (B % 2) * 16);
                      return h.create(o, a * 2);
                    },
                  }),
                  (m.Utf16LE = {
                    stringify: function (v) {
                      for (var a = v.words, o = v.sigBytes, B = [], i = 0; i < o; i += 2) {
                        var c = g((a[i >>> 2] >>> (16 - (i % 4) * 8)) & 65535);
                        B.push(String.fromCharCode(c));
                      }
                      return B.join("");
                    },
                    parse: function (v) {
                      for (var a = v.length, o = [], B = 0; B < a; B++)
                        o[B >>> 1] |= g(v.charCodeAt(B) << (16 - (B % 2) * 16));
                      return h.create(o, a * 2);
                    },
                  }));
                function g(v) {
                  return ((v << 8) & 4278255360) | ((v >>> 8) & 16711935);
                }
              })(),
              e.enc.Utf16
            );
          });
        })(ae)),
      ae.exports
    );
  }
  var ne = { exports: {} },
    Ve;
  function A0() {
    return (
      Ve ||
        ((Ve = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.WordArray,
                  m = t.enc;
                m.Base64 = {
                  stringify: function (v) {
                    var a = v.words,
                      o = v.sigBytes,
                      B = this._map;
                    v.clamp();
                    for (var i = [], c = 0; c < o; c += 3)
                      for (
                        var l = (a[c >>> 2] >>> (24 - (c % 4) * 8)) & 255,
                          f = (a[(c + 1) >>> 2] >>> (24 - ((c + 1) % 4) * 8)) & 255,
                          d = (a[(c + 2) >>> 2] >>> (24 - ((c + 2) % 4) * 8)) & 255,
                          E = (l << 16) | (f << 8) | d,
                          s = 0;
                        s < 4 && c + s * 0.75 < o;
                        s++
                      )
                        i.push(B.charAt((E >>> (6 * (3 - s))) & 63));
                    var x = B.charAt(64);
                    if (x) for (; i.length % 4;) i.push(x);
                    return i.join("");
                  },
                  parse: function (v) {
                    var a = v.length,
                      o = this._map,
                      B = this._reverseMap;
                    if (!B) {
                      B = this._reverseMap = [];
                      for (var i = 0; i < o.length; i++) B[o.charCodeAt(i)] = i;
                    }
                    var c = o.charAt(64);
                    if (c) {
                      var l = v.indexOf(c);
                      l !== -1 && (a = l);
                    }
                    return g(v, a, B);
                  },
                  _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                };
                function g(v, a, o) {
                  for (var B = [], i = 0, c = 0; c < a; c++)
                    if (c % 4) {
                      var l = o[v.charCodeAt(c - 1)] << ((c % 4) * 2),
                        f = o[v.charCodeAt(c)] >>> (6 - (c % 4) * 2),
                        d = l | f;
                      ((B[i >>> 2] |= d << (24 - (i % 4) * 8)), i++);
                    }
                  return h.create(B, i);
                }
              })(),
              e.enc.Base64
            );
          });
        })(ne)),
      ne.exports
    );
  }
  var oe = { exports: {} },
    Ye;
  function Br() {
    return (
      Ye ||
        ((Ye = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.WordArray,
                  m = t.enc;
                m.Base64url = {
                  stringify: function (v, a) {
                    a === void 0 && (a = !0);
                    var o = v.words,
                      B = v.sigBytes,
                      i = a ? this._safe_map : this._map;
                    v.clamp();
                    for (var c = [], l = 0; l < B; l += 3)
                      for (
                        var f = (o[l >>> 2] >>> (24 - (l % 4) * 8)) & 255,
                          d = (o[(l + 1) >>> 2] >>> (24 - ((l + 1) % 4) * 8)) & 255,
                          E = (o[(l + 2) >>> 2] >>> (24 - ((l + 2) % 4) * 8)) & 255,
                          s = (f << 16) | (d << 8) | E,
                          x = 0;
                        x < 4 && l + x * 0.75 < B;
                        x++
                      )
                        c.push(i.charAt((s >>> (6 * (3 - x))) & 63));
                    var p = i.charAt(64);
                    if (p) for (; c.length % 4;) c.push(p);
                    return c.join("");
                  },
                  parse: function (v, a) {
                    a === void 0 && (a = !0);
                    var o = v.length,
                      B = a ? this._safe_map : this._map,
                      i = this._reverseMap;
                    if (!i) {
                      i = this._reverseMap = [];
                      for (var c = 0; c < B.length; c++) i[B.charCodeAt(c)] = c;
                    }
                    var l = B.charAt(64);
                    if (l) {
                      var f = v.indexOf(l);
                      f !== -1 && (o = f);
                    }
                    return g(v, o, i);
                  },
                  _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                  _safe_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
                };
                function g(v, a, o) {
                  for (var B = [], i = 0, c = 0; c < a; c++)
                    if (c % 4) {
                      var l = o[v.charCodeAt(c - 1)] << ((c % 4) * 2),
                        f = o[v.charCodeAt(c)] >>> (6 - (c % 4) * 2),
                        d = l | f;
                      ((B[i >>> 2] |= d << (24 - (i % 4) * 8)), i++);
                    }
                  return h.create(B, i);
                }
              })(),
              e.enc.Base64url
            );
          });
        })(oe)),
      oe.exports
    );
  }
  var ie = { exports: {} },
    Ze;
  function F0() {
    return (
      Ze ||
        ((Ze = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function (t) {
                var u = e,
                  h = u.lib,
                  m = h.WordArray,
                  g = h.Hasher,
                  v = u.algo,
                  a = [];
                (function () {
                  for (var f = 0; f < 64; f++) a[f] = (t.abs(t.sin(f + 1)) * 4294967296) | 0;
                })();
                var o = (v.MD5 = g.extend({
                  _doReset: function () {
                    this._hash = new m.init([1732584193, 4023233417, 2562383102, 271733878]);
                  },
                  _doProcessBlock: function (f, d) {
                    for (var E = 0; E < 16; E++) {
                      var s = d + E,
                        x = f[s];
                      f[s] =
                        (((x << 8) | (x >>> 24)) & 16711935) |
                        (((x << 24) | (x >>> 8)) & 4278255360);
                    }
                    var p = this._hash.words,
                      b = f[d + 0],
                      C = f[d + 1],
                      A = f[d + 2],
                      D = f[d + 3],
                      H = f[d + 4],
                      y = f[d + 5],
                      F = f[d + 6],
                      _ = f[d + 7],
                      k = f[d + 8],
                      L = f[d + 9],
                      $ = f[d + 10],
                      I = f[d + 11],
                      Z = f[d + 12],
                      X = f[d + 13],
                      V = f[d + 14],
                      G = f[d + 15],
                      w = p[0],
                      S = p[1],
                      P = p[2],
                      z = p[3];
                    ((w = B(w, S, P, z, b, 7, a[0])),
                      (z = B(z, w, S, P, C, 12, a[1])),
                      (P = B(P, z, w, S, A, 17, a[2])),
                      (S = B(S, P, z, w, D, 22, a[3])),
                      (w = B(w, S, P, z, H, 7, a[4])),
                      (z = B(z, w, S, P, y, 12, a[5])),
                      (P = B(P, z, w, S, F, 17, a[6])),
                      (S = B(S, P, z, w, _, 22, a[7])),
                      (w = B(w, S, P, z, k, 7, a[8])),
                      (z = B(z, w, S, P, L, 12, a[9])),
                      (P = B(P, z, w, S, $, 17, a[10])),
                      (S = B(S, P, z, w, I, 22, a[11])),
                      (w = B(w, S, P, z, Z, 7, a[12])),
                      (z = B(z, w, S, P, X, 12, a[13])),
                      (P = B(P, z, w, S, V, 17, a[14])),
                      (S = B(S, P, z, w, G, 22, a[15])),
                      (w = i(w, S, P, z, C, 5, a[16])),
                      (z = i(z, w, S, P, F, 9, a[17])),
                      (P = i(P, z, w, S, I, 14, a[18])),
                      (S = i(S, P, z, w, b, 20, a[19])),
                      (w = i(w, S, P, z, y, 5, a[20])),
                      (z = i(z, w, S, P, $, 9, a[21])),
                      (P = i(P, z, w, S, G, 14, a[22])),
                      (S = i(S, P, z, w, H, 20, a[23])),
                      (w = i(w, S, P, z, L, 5, a[24])),
                      (z = i(z, w, S, P, V, 9, a[25])),
                      (P = i(P, z, w, S, D, 14, a[26])),
                      (S = i(S, P, z, w, k, 20, a[27])),
                      (w = i(w, S, P, z, X, 5, a[28])),
                      (z = i(z, w, S, P, A, 9, a[29])),
                      (P = i(P, z, w, S, _, 14, a[30])),
                      (S = i(S, P, z, w, Z, 20, a[31])),
                      (w = c(w, S, P, z, y, 4, a[32])),
                      (z = c(z, w, S, P, k, 11, a[33])),
                      (P = c(P, z, w, S, I, 16, a[34])),
                      (S = c(S, P, z, w, V, 23, a[35])),
                      (w = c(w, S, P, z, C, 4, a[36])),
                      (z = c(z, w, S, P, H, 11, a[37])),
                      (P = c(P, z, w, S, _, 16, a[38])),
                      (S = c(S, P, z, w, $, 23, a[39])),
                      (w = c(w, S, P, z, X, 4, a[40])),
                      (z = c(z, w, S, P, b, 11, a[41])),
                      (P = c(P, z, w, S, D, 16, a[42])),
                      (S = c(S, P, z, w, F, 23, a[43])),
                      (w = c(w, S, P, z, L, 4, a[44])),
                      (z = c(z, w, S, P, Z, 11, a[45])),
                      (P = c(P, z, w, S, G, 16, a[46])),
                      (S = c(S, P, z, w, A, 23, a[47])),
                      (w = l(w, S, P, z, b, 6, a[48])),
                      (z = l(z, w, S, P, _, 10, a[49])),
                      (P = l(P, z, w, S, V, 15, a[50])),
                      (S = l(S, P, z, w, y, 21, a[51])),
                      (w = l(w, S, P, z, Z, 6, a[52])),
                      (z = l(z, w, S, P, D, 10, a[53])),
                      (P = l(P, z, w, S, $, 15, a[54])),
                      (S = l(S, P, z, w, C, 21, a[55])),
                      (w = l(w, S, P, z, k, 6, a[56])),
                      (z = l(z, w, S, P, G, 10, a[57])),
                      (P = l(P, z, w, S, F, 15, a[58])),
                      (S = l(S, P, z, w, X, 21, a[59])),
                      (w = l(w, S, P, z, H, 6, a[60])),
                      (z = l(z, w, S, P, I, 10, a[61])),
                      (P = l(P, z, w, S, A, 15, a[62])),
                      (S = l(S, P, z, w, L, 21, a[63])),
                      (p[0] = (p[0] + w) | 0),
                      (p[1] = (p[1] + S) | 0),
                      (p[2] = (p[2] + P) | 0),
                      (p[3] = (p[3] + z) | 0));
                  },
                  _doFinalize: function () {
                    var f = this._data,
                      d = f.words,
                      E = this._nDataBytes * 8,
                      s = f.sigBytes * 8;
                    d[s >>> 5] |= 128 << (24 - (s % 32));
                    var x = t.floor(E / 4294967296),
                      p = E;
                    ((d[(((s + 64) >>> 9) << 4) + 15] =
                      (((x << 8) | (x >>> 24)) & 16711935) |
                      (((x << 24) | (x >>> 8)) & 4278255360)),
                      (d[(((s + 64) >>> 9) << 4) + 14] =
                        (((p << 8) | (p >>> 24)) & 16711935) |
                        (((p << 24) | (p >>> 8)) & 4278255360)),
                      (f.sigBytes = (d.length + 1) * 4),
                      this._process());
                    for (var b = this._hash, C = b.words, A = 0; A < 4; A++) {
                      var D = C[A];
                      C[A] =
                        (((D << 8) | (D >>> 24)) & 16711935) |
                        (((D << 24) | (D >>> 8)) & 4278255360);
                    }
                    return b;
                  },
                  clone: function () {
                    var f = g.clone.call(this);
                    return ((f._hash = this._hash.clone()), f);
                  },
                }));
                function B(f, d, E, s, x, p, b) {
                  var C = f + ((d & E) | (~d & s)) + x + b;
                  return ((C << p) | (C >>> (32 - p))) + d;
                }
                function i(f, d, E, s, x, p, b) {
                  var C = f + ((d & s) | (E & ~s)) + x + b;
                  return ((C << p) | (C >>> (32 - p))) + d;
                }
                function c(f, d, E, s, x, p, b) {
                  var C = f + (d ^ E ^ s) + x + b;
                  return ((C << p) | (C >>> (32 - p))) + d;
                }
                function l(f, d, E, s, x, p, b) {
                  var C = f + (E ^ (d | ~s)) + x + b;
                  return ((C << p) | (C >>> (32 - p))) + d;
                }
                ((u.MD5 = g._createHelper(o)), (u.HmacMD5 = g._createHmacHelper(o)));
              })(Math),
              e.MD5
            );
          });
        })(ie)),
      ie.exports
    );
  }
  var se = { exports: {} },
    Qe;
  function Je() {
    return (
      Qe ||
        ((Qe = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.WordArray,
                  m = u.Hasher,
                  g = t.algo,
                  v = [],
                  a = (g.SHA1 = m.extend({
                    _doReset: function () {
                      this._hash = new h.init([
                        1732584193, 4023233417, 2562383102, 271733878, 3285377520,
                      ]);
                    },
                    _doProcessBlock: function (o, B) {
                      for (
                        var i = this._hash.words,
                          c = i[0],
                          l = i[1],
                          f = i[2],
                          d = i[3],
                          E = i[4],
                          s = 0;
                        s < 80;
                        s++
                      ) {
                        if (s < 16) v[s] = o[B + s] | 0;
                        else {
                          var x = v[s - 3] ^ v[s - 8] ^ v[s - 14] ^ v[s - 16];
                          v[s] = (x << 1) | (x >>> 31);
                        }
                        var p = ((c << 5) | (c >>> 27)) + E + v[s];
                        (s < 20
                          ? (p += ((l & f) | (~l & d)) + 1518500249)
                          : s < 40
                            ? (p += (l ^ f ^ d) + 1859775393)
                            : s < 60
                              ? (p += ((l & f) | (l & d) | (f & d)) - 1894007588)
                              : (p += (l ^ f ^ d) - 899497514),
                          (E = d),
                          (d = f),
                          (f = (l << 30) | (l >>> 2)),
                          (l = c),
                          (c = p));
                      }
                      ((i[0] = (i[0] + c) | 0),
                        (i[1] = (i[1] + l) | 0),
                        (i[2] = (i[2] + f) | 0),
                        (i[3] = (i[3] + d) | 0),
                        (i[4] = (i[4] + E) | 0));
                    },
                    _doFinalize: function () {
                      var o = this._data,
                        B = o.words,
                        i = this._nDataBytes * 8,
                        c = o.sigBytes * 8;
                      return (
                        (B[c >>> 5] |= 128 << (24 - (c % 32))),
                        (B[(((c + 64) >>> 9) << 4) + 14] = Math.floor(i / 4294967296)),
                        (B[(((c + 64) >>> 9) << 4) + 15] = i),
                        (o.sigBytes = B.length * 4),
                        this._process(),
                        this._hash
                      );
                    },
                    clone: function () {
                      var o = m.clone.call(this);
                      return ((o._hash = this._hash.clone()), o);
                    },
                  }));
                ((t.SHA1 = m._createHelper(a)), (t.HmacSHA1 = m._createHmacHelper(a)));
              })(),
              e.SHA1
            );
          });
        })(se)),
      se.exports
    );
  }
  var xe = { exports: {} },
    et;
  function ce() {
    return (
      et ||
        ((et = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            return (
              (function (t) {
                var u = e,
                  h = u.lib,
                  m = h.WordArray,
                  g = h.Hasher,
                  v = u.algo,
                  a = [],
                  o = [];
                (function () {
                  function c(E) {
                    for (var s = t.sqrt(E), x = 2; x <= s; x++) if (!(E % x)) return !1;
                    return !0;
                  }
                  function l(E) {
                    return ((E - (E | 0)) * 4294967296) | 0;
                  }
                  for (var f = 2, d = 0; d < 64;)
                    (c(f) &&
                      (d < 8 && (a[d] = l(t.pow(f, 1 / 2))), (o[d] = l(t.pow(f, 1 / 3))), d++),
                      f++);
                })();
                var B = [],
                  i = (v.SHA256 = g.extend({
                    _doReset: function () {
                      this._hash = new m.init(a.slice(0));
                    },
                    _doProcessBlock: function (c, l) {
                      for (
                        var f = this._hash.words,
                          d = f[0],
                          E = f[1],
                          s = f[2],
                          x = f[3],
                          p = f[4],
                          b = f[5],
                          C = f[6],
                          A = f[7],
                          D = 0;
                        D < 64;
                        D++
                      ) {
                        if (D < 16) B[D] = c[l + D] | 0;
                        else {
                          var H = B[D - 15],
                            y = ((H << 25) | (H >>> 7)) ^ ((H << 14) | (H >>> 18)) ^ (H >>> 3),
                            F = B[D - 2],
                            _ = ((F << 15) | (F >>> 17)) ^ ((F << 13) | (F >>> 19)) ^ (F >>> 10);
                          B[D] = y + B[D - 7] + _ + B[D - 16];
                        }
                        var k = (p & b) ^ (~p & C),
                          L = (d & E) ^ (d & s) ^ (E & s),
                          $ =
                            ((d << 30) | (d >>> 2)) ^
                            ((d << 19) | (d >>> 13)) ^
                            ((d << 10) | (d >>> 22)),
                          I =
                            ((p << 26) | (p >>> 6)) ^
                            ((p << 21) | (p >>> 11)) ^
                            ((p << 7) | (p >>> 25)),
                          Z = A + I + k + o[D] + B[D],
                          X = $ + L;
                        ((A = C),
                          (C = b),
                          (b = p),
                          (p = (x + Z) | 0),
                          (x = s),
                          (s = E),
                          (E = d),
                          (d = (Z + X) | 0));
                      }
                      ((f[0] = (f[0] + d) | 0),
                        (f[1] = (f[1] + E) | 0),
                        (f[2] = (f[2] + s) | 0),
                        (f[3] = (f[3] + x) | 0),
                        (f[4] = (f[4] + p) | 0),
                        (f[5] = (f[5] + b) | 0),
                        (f[6] = (f[6] + C) | 0),
                        (f[7] = (f[7] + A) | 0));
                    },
                    _doFinalize: function () {
                      var c = this._data,
                        l = c.words,
                        f = this._nDataBytes * 8,
                        d = c.sigBytes * 8;
                      return (
                        (l[d >>> 5] |= 128 << (24 - (d % 32))),
                        (l[(((d + 64) >>> 9) << 4) + 14] = t.floor(f / 4294967296)),
                        (l[(((d + 64) >>> 9) << 4) + 15] = f),
                        (c.sigBytes = l.length * 4),
                        this._process(),
                        this._hash
                      );
                    },
                    clone: function () {
                      var c = g.clone.call(this);
                      return ((c._hash = this._hash.clone()), c);
                    },
                  }));
                ((u.SHA256 = g._createHelper(i)), (u.HmacSHA256 = g._createHmacHelper(i)));
              })(Math),
              e.SHA256
            );
          });
        })(xe)),
      xe.exports
    );
  }
  var le = { exports: {} },
    tt;
  function Er() {
    return (
      tt ||
        ((tt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), ce());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.WordArray,
                  m = t.algo,
                  g = m.SHA256,
                  v = (m.SHA224 = g.extend({
                    _doReset: function () {
                      this._hash = new h.init([
                        3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025,
                        1694076839, 3204075428,
                      ]);
                    },
                    _doFinalize: function () {
                      var a = g._doFinalize.call(this);
                      return ((a.sigBytes -= 4), a);
                    },
                  }));
                ((t.SHA224 = g._createHelper(v)), (t.HmacSHA224 = g._createHmacHelper(v)));
              })(),
              e.SHA224
            );
          });
        })(le)),
      le.exports
    );
  }
  var fe = { exports: {} },
    rt;
  function at() {
    return (
      rt ||
        ((rt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), K0());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.Hasher,
                  m = t.x64,
                  g = m.Word,
                  v = m.WordArray,
                  a = t.algo;
                function o() {
                  return g.create.apply(g, arguments);
                }
                var B = [
                    o(1116352408, 3609767458),
                    o(1899447441, 602891725),
                    o(3049323471, 3964484399),
                    o(3921009573, 2173295548),
                    o(961987163, 4081628472),
                    o(1508970993, 3053834265),
                    o(2453635748, 2937671579),
                    o(2870763221, 3664609560),
                    o(3624381080, 2734883394),
                    o(310598401, 1164996542),
                    o(607225278, 1323610764),
                    o(1426881987, 3590304994),
                    o(1925078388, 4068182383),
                    o(2162078206, 991336113),
                    o(2614888103, 633803317),
                    o(3248222580, 3479774868),
                    o(3835390401, 2666613458),
                    o(4022224774, 944711139),
                    o(264347078, 2341262773),
                    o(604807628, 2007800933),
                    o(770255983, 1495990901),
                    o(1249150122, 1856431235),
                    o(1555081692, 3175218132),
                    o(1996064986, 2198950837),
                    o(2554220882, 3999719339),
                    o(2821834349, 766784016),
                    o(2952996808, 2566594879),
                    o(3210313671, 3203337956),
                    o(3336571891, 1034457026),
                    o(3584528711, 2466948901),
                    o(113926993, 3758326383),
                    o(338241895, 168717936),
                    o(666307205, 1188179964),
                    o(773529912, 1546045734),
                    o(1294757372, 1522805485),
                    o(1396182291, 2643833823),
                    o(1695183700, 2343527390),
                    o(1986661051, 1014477480),
                    o(2177026350, 1206759142),
                    o(2456956037, 344077627),
                    o(2730485921, 1290863460),
                    o(2820302411, 3158454273),
                    o(3259730800, 3505952657),
                    o(3345764771, 106217008),
                    o(3516065817, 3606008344),
                    o(3600352804, 1432725776),
                    o(4094571909, 1467031594),
                    o(275423344, 851169720),
                    o(430227734, 3100823752),
                    o(506948616, 1363258195),
                    o(659060556, 3750685593),
                    o(883997877, 3785050280),
                    o(958139571, 3318307427),
                    o(1322822218, 3812723403),
                    o(1537002063, 2003034995),
                    o(1747873779, 3602036899),
                    o(1955562222, 1575990012),
                    o(2024104815, 1125592928),
                    o(2227730452, 2716904306),
                    o(2361852424, 442776044),
                    o(2428436474, 593698344),
                    o(2756734187, 3733110249),
                    o(3204031479, 2999351573),
                    o(3329325298, 3815920427),
                    o(3391569614, 3928383900),
                    o(3515267271, 566280711),
                    o(3940187606, 3454069534),
                    o(4118630271, 4000239992),
                    o(116418474, 1914138554),
                    o(174292421, 2731055270),
                    o(289380356, 3203993006),
                    o(460393269, 320620315),
                    o(685471733, 587496836),
                    o(852142971, 1086792851),
                    o(1017036298, 365543100),
                    o(1126000580, 2618297676),
                    o(1288033470, 3409855158),
                    o(1501505948, 4234509866),
                    o(1607167915, 987167468),
                    o(1816402316, 1246189591),
                  ],
                  i = [];
                (function () {
                  for (var l = 0; l < 80; l++) i[l] = o();
                })();
                var c = (a.SHA512 = h.extend({
                  _doReset: function () {
                    this._hash = new v.init([
                      new g.init(1779033703, 4089235720),
                      new g.init(3144134277, 2227873595),
                      new g.init(1013904242, 4271175723),
                      new g.init(2773480762, 1595750129),
                      new g.init(1359893119, 2917565137),
                      new g.init(2600822924, 725511199),
                      new g.init(528734635, 4215389547),
                      new g.init(1541459225, 327033209),
                    ]);
                  },
                  _doProcessBlock: function (l, f) {
                    for (
                      var d = this._hash.words,
                        E = d[0],
                        s = d[1],
                        x = d[2],
                        p = d[3],
                        b = d[4],
                        C = d[5],
                        A = d[6],
                        D = d[7],
                        H = E.high,
                        y = E.low,
                        F = s.high,
                        _ = s.low,
                        k = x.high,
                        L = x.low,
                        $ = p.high,
                        I = p.low,
                        Z = b.high,
                        X = b.low,
                        V = C.high,
                        G = C.low,
                        w = A.high,
                        S = A.low,
                        P = D.high,
                        z = D.low,
                        J = H,
                        Y = y,
                        i0 = F,
                        O = _,
                        M0 = k,
                        k0 = L,
                        Ue = $,
                        U0 = I,
                        d0 = Z,
                        x0 = X,
                        Y0 = V,
                        I0 = G,
                        Z0 = w,
                        N0 = S,
                        Ie = P,
                        O0 = z,
                        p0 = 0;
                      p0 < 80;
                      p0++
                    ) {
                      var l0,
                        C0,
                        Q0 = i[p0];
                      if (p0 < 16)
                        ((C0 = Q0.high = l[f + p0 * 2] | 0), (l0 = Q0.low = l[f + p0 * 2 + 1] | 0));
                      else {
                        var Ot = i[p0 - 15],
                          z0 = Ot.high,
                          q0 = Ot.low,
                          ya = ((z0 >>> 1) | (q0 << 31)) ^ ((z0 >>> 8) | (q0 << 24)) ^ (z0 >>> 7),
                          qt =
                            ((q0 >>> 1) | (z0 << 31)) ^
                            ((q0 >>> 8) | (z0 << 24)) ^
                            ((q0 >>> 7) | (z0 << 25)),
                          jt = i[p0 - 2],
                          S0 = jt.high,
                          j0 = jt.low,
                          ba = ((S0 >>> 19) | (j0 << 13)) ^ ((S0 << 3) | (j0 >>> 29)) ^ (S0 >>> 6),
                          Kt =
                            ((j0 >>> 19) | (S0 << 13)) ^
                            ((j0 << 3) | (S0 >>> 29)) ^
                            ((j0 >>> 6) | (S0 << 26)),
                          Xt = i[p0 - 7],
                          Ca = Xt.high,
                          ma = Xt.low,
                          Gt = i[p0 - 16],
                          Aa = Gt.high,
                          Vt = Gt.low;
                        ((l0 = qt + ma),
                          (C0 = ya + Ca + (l0 >>> 0 < qt >>> 0 ? 1 : 0)),
                          (l0 = l0 + Kt),
                          (C0 = C0 + ba + (l0 >>> 0 < Kt >>> 0 ? 1 : 0)),
                          (l0 = l0 + Vt),
                          (C0 = C0 + Aa + (l0 >>> 0 < Vt >>> 0 ? 1 : 0)),
                          (Q0.high = C0),
                          (Q0.low = l0));
                      }
                      var Fa = (d0 & Y0) ^ (~d0 & Z0),
                        Yt = (x0 & I0) ^ (~x0 & N0),
                        Da = (J & i0) ^ (J & M0) ^ (i0 & M0),
                        wa = (Y & O) ^ (Y & k0) ^ (O & k0),
                        _a =
                          ((J >>> 28) | (Y << 4)) ^
                          ((J << 30) | (Y >>> 2)) ^
                          ((J << 25) | (Y >>> 7)),
                        Zt =
                          ((Y >>> 28) | (J << 4)) ^
                          ((Y << 30) | (J >>> 2)) ^
                          ((Y << 25) | (J >>> 7)),
                        ka =
                          ((d0 >>> 14) | (x0 << 18)) ^
                          ((d0 >>> 18) | (x0 << 14)) ^
                          ((d0 << 23) | (x0 >>> 9)),
                        za =
                          ((x0 >>> 14) | (d0 << 18)) ^
                          ((x0 >>> 18) | (d0 << 14)) ^
                          ((x0 << 23) | (d0 >>> 9)),
                        Qt = B[p0],
                        Sa = Qt.high,
                        Jt = Qt.low,
                        c0 = O0 + za,
                        m0 = Ie + ka + (c0 >>> 0 < O0 >>> 0 ? 1 : 0),
                        c0 = c0 + Yt,
                        m0 = m0 + Fa + (c0 >>> 0 < Yt >>> 0 ? 1 : 0),
                        c0 = c0 + Jt,
                        m0 = m0 + Sa + (c0 >>> 0 < Jt >>> 0 ? 1 : 0),
                        c0 = c0 + l0,
                        m0 = m0 + C0 + (c0 >>> 0 < l0 >>> 0 ? 1 : 0),
                        er = Zt + wa,
                        Pa = _a + Da + (er >>> 0 < Zt >>> 0 ? 1 : 0);
                      ((Ie = Z0),
                        (O0 = N0),
                        (Z0 = Y0),
                        (N0 = I0),
                        (Y0 = d0),
                        (I0 = x0),
                        (x0 = (U0 + c0) | 0),
                        (d0 = (Ue + m0 + (x0 >>> 0 < U0 >>> 0 ? 1 : 0)) | 0),
                        (Ue = M0),
                        (U0 = k0),
                        (M0 = i0),
                        (k0 = O),
                        (i0 = J),
                        (O = Y),
                        (Y = (c0 + er) | 0),
                        (J = (m0 + Pa + (Y >>> 0 < c0 >>> 0 ? 1 : 0)) | 0));
                    }
                    ((y = E.low = y + Y),
                      (E.high = H + J + (y >>> 0 < Y >>> 0 ? 1 : 0)),
                      (_ = s.low = _ + O),
                      (s.high = F + i0 + (_ >>> 0 < O >>> 0 ? 1 : 0)),
                      (L = x.low = L + k0),
                      (x.high = k + M0 + (L >>> 0 < k0 >>> 0 ? 1 : 0)),
                      (I = p.low = I + U0),
                      (p.high = $ + Ue + (I >>> 0 < U0 >>> 0 ? 1 : 0)),
                      (X = b.low = X + x0),
                      (b.high = Z + d0 + (X >>> 0 < x0 >>> 0 ? 1 : 0)),
                      (G = C.low = G + I0),
                      (C.high = V + Y0 + (G >>> 0 < I0 >>> 0 ? 1 : 0)),
                      (S = A.low = S + N0),
                      (A.high = w + Z0 + (S >>> 0 < N0 >>> 0 ? 1 : 0)),
                      (z = D.low = z + O0),
                      (D.high = P + Ie + (z >>> 0 < O0 >>> 0 ? 1 : 0)));
                  },
                  _doFinalize: function () {
                    var l = this._data,
                      f = l.words,
                      d = this._nDataBytes * 8,
                      E = l.sigBytes * 8;
                    ((f[E >>> 5] |= 128 << (24 - (E % 32))),
                      (f[(((E + 128) >>> 10) << 5) + 30] = Math.floor(d / 4294967296)),
                      (f[(((E + 128) >>> 10) << 5) + 31] = d),
                      (l.sigBytes = f.length * 4),
                      this._process());
                    var s = this._hash.toX32();
                    return s;
                  },
                  clone: function () {
                    var l = h.clone.call(this);
                    return ((l._hash = this._hash.clone()), l);
                  },
                  blockSize: 1024 / 32,
                }));
                ((t.SHA512 = h._createHelper(c)), (t.HmacSHA512 = h._createHmacHelper(c)));
              })(),
              e.SHA512
            );
          });
        })(fe)),
      fe.exports
    );
  }
  var de = { exports: {} },
    nt;
  function yr() {
    return (
      nt ||
        ((nt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), K0(), at());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.x64,
                  h = u.Word,
                  m = u.WordArray,
                  g = t.algo,
                  v = g.SHA512,
                  a = (g.SHA384 = v.extend({
                    _doReset: function () {
                      this._hash = new m.init([
                        new h.init(3418070365, 3238371032),
                        new h.init(1654270250, 914150663),
                        new h.init(2438529370, 812702999),
                        new h.init(355462360, 4144912697),
                        new h.init(1731405415, 4290775857),
                        new h.init(2394180231, 1750603025),
                        new h.init(3675008525, 1694076839),
                        new h.init(1203062813, 3204075428),
                      ]);
                    },
                    _doFinalize: function () {
                      var o = v._doFinalize.call(this);
                      return ((o.sigBytes -= 16), o);
                    },
                  }));
                ((t.SHA384 = v._createHelper(a)), (t.HmacSHA384 = v._createHmacHelper(a)));
              })(),
              e.SHA384
            );
          });
        })(de)),
      de.exports
    );
  }
  var pe = { exports: {} },
    ot;
  function br() {
    return (
      ot ||
        ((ot = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), K0());
          })(U, function (e) {
            return (
              (function (t) {
                var u = e,
                  h = u.lib,
                  m = h.WordArray,
                  g = h.Hasher,
                  v = u.x64,
                  a = v.Word,
                  o = u.algo,
                  B = [],
                  i = [],
                  c = [];
                (function () {
                  for (var d = 1, E = 0, s = 0; s < 24; s++) {
                    B[d + 5 * E] = (((s + 1) * (s + 2)) / 2) % 64;
                    var x = E % 5,
                      p = (2 * d + 3 * E) % 5;
                    ((d = x), (E = p));
                  }
                  for (var d = 0; d < 5; d++)
                    for (var E = 0; E < 5; E++) i[d + 5 * E] = E + ((2 * d + 3 * E) % 5) * 5;
                  for (var b = 1, C = 0; C < 24; C++) {
                    for (var A = 0, D = 0, H = 0; H < 7; H++) {
                      if (b & 1) {
                        var y = (1 << H) - 1;
                        y < 32 ? (D ^= 1 << y) : (A ^= 1 << (y - 32));
                      }
                      b & 128 ? (b = (b << 1) ^ 113) : (b <<= 1);
                    }
                    c[C] = a.create(A, D);
                  }
                })();
                var l = [];
                (function () {
                  for (var d = 0; d < 25; d++) l[d] = a.create();
                })();
                var f = (o.SHA3 = g.extend({
                  cfg: g.cfg.extend({ outputLength: 512 }),
                  _doReset: function () {
                    for (var d = (this._state = []), E = 0; E < 25; E++) d[E] = new a.init();
                    this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
                  },
                  _doProcessBlock: function (d, E) {
                    for (var s = this._state, x = this.blockSize / 2, p = 0; p < x; p++) {
                      var b = d[E + 2 * p],
                        C = d[E + 2 * p + 1];
                      ((b =
                        (((b << 8) | (b >>> 24)) & 16711935) |
                        (((b << 24) | (b >>> 8)) & 4278255360)),
                        (C =
                          (((C << 8) | (C >>> 24)) & 16711935) |
                          (((C << 24) | (C >>> 8)) & 4278255360)));
                      var A = s[p];
                      ((A.high ^= C), (A.low ^= b));
                    }
                    for (var D = 0; D < 24; D++) {
                      for (var H = 0; H < 5; H++) {
                        for (var y = 0, F = 0, _ = 0; _ < 5; _++) {
                          var A = s[H + 5 * _];
                          ((y ^= A.high), (F ^= A.low));
                        }
                        var k = l[H];
                        ((k.high = y), (k.low = F));
                      }
                      for (var H = 0; H < 5; H++)
                        for (
                          var L = l[(H + 4) % 5],
                            $ = l[(H + 1) % 5],
                            I = $.high,
                            Z = $.low,
                            y = L.high ^ ((I << 1) | (Z >>> 31)),
                            F = L.low ^ ((Z << 1) | (I >>> 31)),
                            _ = 0;
                          _ < 5;
                          _++
                        ) {
                          var A = s[H + 5 * _];
                          ((A.high ^= y), (A.low ^= F));
                        }
                      for (var X = 1; X < 25; X++) {
                        var y,
                          F,
                          A = s[X],
                          V = A.high,
                          G = A.low,
                          w = B[X];
                        w < 32
                          ? ((y = (V << w) | (G >>> (32 - w))), (F = (G << w) | (V >>> (32 - w))))
                          : ((y = (G << (w - 32)) | (V >>> (64 - w))),
                            (F = (V << (w - 32)) | (G >>> (64 - w))));
                        var S = l[i[X]];
                        ((S.high = y), (S.low = F));
                      }
                      var P = l[0],
                        z = s[0];
                      ((P.high = z.high), (P.low = z.low));
                      for (var H = 0; H < 5; H++)
                        for (var _ = 0; _ < 5; _++) {
                          var X = H + 5 * _,
                            A = s[X],
                            J = l[X],
                            Y = l[((H + 1) % 5) + 5 * _],
                            i0 = l[((H + 2) % 5) + 5 * _];
                          ((A.high = J.high ^ (~Y.high & i0.high)),
                            (A.low = J.low ^ (~Y.low & i0.low)));
                        }
                      var A = s[0],
                        O = c[D];
                      ((A.high ^= O.high), (A.low ^= O.low));
                    }
                  },
                  _doFinalize: function () {
                    var d = this._data,
                      E = d.words;
                    this._nDataBytes * 8;
                    var s = d.sigBytes * 8,
                      x = this.blockSize * 32;
                    ((E[s >>> 5] |= 1 << (24 - (s % 32))),
                      (E[((t.ceil((s + 1) / x) * x) >>> 5) - 1] |= 128),
                      (d.sigBytes = E.length * 4),
                      this._process());
                    for (
                      var p = this._state, b = this.cfg.outputLength / 8, C = b / 8, A = [], D = 0;
                      D < C;
                      D++
                    ) {
                      var H = p[D],
                        y = H.high,
                        F = H.low;
                      ((y =
                        (((y << 8) | (y >>> 24)) & 16711935) |
                        (((y << 24) | (y >>> 8)) & 4278255360)),
                        (F =
                          (((F << 8) | (F >>> 24)) & 16711935) |
                          (((F << 24) | (F >>> 8)) & 4278255360)),
                        A.push(F),
                        A.push(y));
                    }
                    return new m.init(A, b);
                  },
                  clone: function () {
                    for (
                      var d = g.clone.call(this), E = (d._state = this._state.slice(0)), s = 0;
                      s < 25;
                      s++
                    )
                      E[s] = E[s].clone();
                    return d;
                  },
                }));
                ((u.SHA3 = g._createHelper(f)), (u.HmacSHA3 = g._createHmacHelper(f)));
              })(Math),
              e.SHA3
            );
          });
        })(pe)),
      pe.exports
    );
  }
  var ue = { exports: {} },
    it;
  function Cr() {
    return (
      it ||
        ((it = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            /** @preserve
  			(c) 2012 by Cédric Mesnil. All rights reserved.

  			Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

  			    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
  			    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

  			THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
  			*/ return (
              (function (t) {
                var u = e,
                  h = u.lib,
                  m = h.WordArray,
                  g = h.Hasher,
                  v = u.algo,
                  a = m.create([
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3,
                    12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
                    1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10,
                    14, 1, 3, 8, 11, 6, 15, 13,
                  ]),
                  o = m.create([
                    5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10,
                    14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
                    8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7,
                    6, 2, 13, 14, 0, 3, 9, 11,
                  ]),
                  B = m.create([
                    11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7,
                    15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5,
                    12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11,
                    6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6,
                  ]),
                  i = m.create([
                    8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9,
                    11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13,
                    13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9,
                    12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11,
                  ]),
                  c = m.create([0, 1518500249, 1859775393, 2400959708, 2840853838]),
                  l = m.create([1352829926, 1548603684, 1836072691, 2053994217, 0]),
                  f = (v.RIPEMD160 = g.extend({
                    _doReset: function () {
                      this._hash = m.create([
                        1732584193, 4023233417, 2562383102, 271733878, 3285377520,
                      ]);
                    },
                    _doProcessBlock: function (C, A) {
                      for (var D = 0; D < 16; D++) {
                        var H = A + D,
                          y = C[H];
                        C[H] =
                          (((y << 8) | (y >>> 24)) & 16711935) |
                          (((y << 24) | (y >>> 8)) & 4278255360);
                      }
                      var F = this._hash.words,
                        _ = c.words,
                        k = l.words,
                        L = a.words,
                        $ = o.words,
                        I = B.words,
                        Z = i.words,
                        X,
                        V,
                        G,
                        w,
                        S,
                        P,
                        z,
                        J,
                        Y,
                        i0;
                      ((P = X = F[0]),
                        (z = V = F[1]),
                        (J = G = F[2]),
                        (Y = w = F[3]),
                        (i0 = S = F[4]));
                      for (var O, D = 0; D < 80; D += 1)
                        ((O = (X + C[A + L[D]]) | 0),
                          D < 16
                            ? (O += d(V, G, w) + _[0])
                            : D < 32
                              ? (O += E(V, G, w) + _[1])
                              : D < 48
                                ? (O += s(V, G, w) + _[2])
                                : D < 64
                                  ? (O += x(V, G, w) + _[3])
                                  : (O += p(V, G, w) + _[4]),
                          (O = O | 0),
                          (O = b(O, I[D])),
                          (O = (O + S) | 0),
                          (X = S),
                          (S = w),
                          (w = b(G, 10)),
                          (G = V),
                          (V = O),
                          (O = (P + C[A + $[D]]) | 0),
                          D < 16
                            ? (O += p(z, J, Y) + k[0])
                            : D < 32
                              ? (O += x(z, J, Y) + k[1])
                              : D < 48
                                ? (O += s(z, J, Y) + k[2])
                                : D < 64
                                  ? (O += E(z, J, Y) + k[3])
                                  : (O += d(z, J, Y) + k[4]),
                          (O = O | 0),
                          (O = b(O, Z[D])),
                          (O = (O + i0) | 0),
                          (P = i0),
                          (i0 = Y),
                          (Y = b(J, 10)),
                          (J = z),
                          (z = O));
                      ((O = (F[1] + G + Y) | 0),
                        (F[1] = (F[2] + w + i0) | 0),
                        (F[2] = (F[3] + S + P) | 0),
                        (F[3] = (F[4] + X + z) | 0),
                        (F[4] = (F[0] + V + J) | 0),
                        (F[0] = O));
                    },
                    _doFinalize: function () {
                      var C = this._data,
                        A = C.words,
                        D = this._nDataBytes * 8,
                        H = C.sigBytes * 8;
                      ((A[H >>> 5] |= 128 << (24 - (H % 32))),
                        (A[(((H + 64) >>> 9) << 4) + 14] =
                          (((D << 8) | (D >>> 24)) & 16711935) |
                          (((D << 24) | (D >>> 8)) & 4278255360)),
                        (C.sigBytes = (A.length + 1) * 4),
                        this._process());
                      for (var y = this._hash, F = y.words, _ = 0; _ < 5; _++) {
                        var k = F[_];
                        F[_] =
                          (((k << 8) | (k >>> 24)) & 16711935) |
                          (((k << 24) | (k >>> 8)) & 4278255360);
                      }
                      return y;
                    },
                    clone: function () {
                      var C = g.clone.call(this);
                      return ((C._hash = this._hash.clone()), C);
                    },
                  }));
                function d(C, A, D) {
                  return C ^ A ^ D;
                }
                function E(C, A, D) {
                  return (C & A) | (~C & D);
                }
                function s(C, A, D) {
                  return (C | ~A) ^ D;
                }
                function x(C, A, D) {
                  return (C & D) | (A & ~D);
                }
                function p(C, A, D) {
                  return C ^ (A | ~D);
                }
                function b(C, A) {
                  return (C << A) | (C >>> (32 - A));
                }
                ((u.RIPEMD160 = g._createHelper(f)), (u.HmacRIPEMD160 = g._createHmacHelper(f)));
              })(),
              e.RIPEMD160
            );
          });
        })(ue)),
      ue.exports
    );
  }
  var he = { exports: {} },
    st;
  function ve() {
    return (
      st ||
        ((st = 1),
        (function (r, n) {
          (function (e, t) {
            r.exports = t(q());
          })(U, function (e) {
            (function () {
              var t = e,
                u = t.lib,
                h = u.Base,
                m = t.enc,
                g = m.Utf8,
                v = t.algo;
              v.HMAC = h.extend({
                init: function (a, o) {
                  ((a = this._hasher = new a.init()), typeof o == "string" && (o = g.parse(o)));
                  var B = a.blockSize,
                    i = B * 4;
                  (o.sigBytes > i && (o = a.finalize(o)), o.clamp());
                  for (
                    var c = (this._oKey = o.clone()),
                      l = (this._iKey = o.clone()),
                      f = c.words,
                      d = l.words,
                      E = 0;
                    E < B;
                    E++
                  )
                    ((f[E] ^= 1549556828), (d[E] ^= 909522486));
                  ((c.sigBytes = l.sigBytes = i), this.reset());
                },
                reset: function () {
                  var a = this._hasher;
                  (a.reset(), a.update(this._iKey));
                },
                update: function (a) {
                  return (this._hasher.update(a), this);
                },
                finalize: function (a) {
                  var o = this._hasher,
                    B = o.finalize(a);
                  o.reset();
                  var i = o.finalize(this._oKey.clone().concat(B));
                  return i;
                },
              });
            })();
          });
        })(he)),
      he.exports
    );
  }
  var ge = { exports: {} },
    xt;
  function mr() {
    return (
      xt ||
        ((xt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), ce(), ve());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.Base,
                  m = u.WordArray,
                  g = t.algo,
                  v = g.SHA256,
                  a = g.HMAC,
                  o = (g.PBKDF2 = h.extend({
                    cfg: h.extend({ keySize: 128 / 32, hasher: v, iterations: 25e4 }),
                    init: function (B) {
                      this.cfg = this.cfg.extend(B);
                    },
                    compute: function (B, i) {
                      for (
                        var c = this.cfg,
                          l = a.create(c.hasher, B),
                          f = m.create(),
                          d = m.create([1]),
                          E = f.words,
                          s = d.words,
                          x = c.keySize,
                          p = c.iterations;
                        E.length < x;
                      ) {
                        var b = l.update(i).finalize(d);
                        l.reset();
                        for (var C = b.words, A = C.length, D = b, H = 1; H < p; H++) {
                          ((D = l.finalize(D)), l.reset());
                          for (var y = D.words, F = 0; F < A; F++) C[F] ^= y[F];
                        }
                        (f.concat(b), s[0]++);
                      }
                      return ((f.sigBytes = x * 4), f);
                    },
                  }));
                t.PBKDF2 = function (B, i, c) {
                  return o.create(c).compute(B, i);
                };
              })(),
              e.PBKDF2
            );
          });
        })(ge)),
      ge.exports
    );
  }
  var Be = { exports: {} },
    ct;
  function B0() {
    return (
      ct ||
        ((ct = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), Je(), ve());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.Base,
                  m = u.WordArray,
                  g = t.algo,
                  v = g.MD5,
                  a = (g.EvpKDF = h.extend({
                    cfg: h.extend({ keySize: 128 / 32, hasher: v, iterations: 1 }),
                    init: function (o) {
                      this.cfg = this.cfg.extend(o);
                    },
                    compute: function (o, B) {
                      for (
                        var i,
                          c = this.cfg,
                          l = c.hasher.create(),
                          f = m.create(),
                          d = f.words,
                          E = c.keySize,
                          s = c.iterations;
                        d.length < E;
                      ) {
                        (i && l.update(i), (i = l.update(o).finalize(B)), l.reset());
                        for (var x = 1; x < s; x++) ((i = l.finalize(i)), l.reset());
                        f.concat(i);
                      }
                      return ((f.sigBytes = E * 4), f);
                    },
                  }));
                t.EvpKDF = function (o, B, i) {
                  return a.create(i).compute(o, B);
                };
              })(),
              e.EvpKDF
            );
          });
        })(Be)),
      Be.exports
    );
  }
  var Ee = { exports: {} },
    lt;
  function t0() {
    return (
      lt ||
        ((lt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), B0());
          })(U, function (e) {
            e.lib.Cipher ||
              (function (t) {
                var u = e,
                  h = u.lib,
                  m = h.Base,
                  g = h.WordArray,
                  v = h.BufferedBlockAlgorithm,
                  a = u.enc;
                a.Utf8;
                var o = a.Base64,
                  B = u.algo,
                  i = B.EvpKDF,
                  c = (h.Cipher = v.extend({
                    cfg: m.extend(),
                    createEncryptor: function (y, F) {
                      return this.create(this._ENC_XFORM_MODE, y, F);
                    },
                    createDecryptor: function (y, F) {
                      return this.create(this._DEC_XFORM_MODE, y, F);
                    },
                    init: function (y, F, _) {
                      ((this.cfg = this.cfg.extend(_)),
                        (this._xformMode = y),
                        (this._key = F),
                        this.reset());
                    },
                    reset: function () {
                      (v.reset.call(this), this._doReset());
                    },
                    process: function (y) {
                      return (this._append(y), this._process());
                    },
                    finalize: function (y) {
                      y && this._append(y);
                      var F = this._doFinalize();
                      return F;
                    },
                    keySize: 128 / 32,
                    ivSize: 128 / 32,
                    _ENC_XFORM_MODE: 1,
                    _DEC_XFORM_MODE: 2,
                    _createHelper: (function () {
                      function y(F) {
                        return typeof F == "string" ? H : C;
                      }
                      return function (F) {
                        return {
                          encrypt: function (_, k, L) {
                            return y(k).encrypt(F, _, k, L);
                          },
                          decrypt: function (_, k, L) {
                            return y(k).decrypt(F, _, k, L);
                          },
                        };
                      };
                    })(),
                  }));
                h.StreamCipher = c.extend({
                  _doFinalize: function () {
                    var y = this._process(!0);
                    return y;
                  },
                  blockSize: 1,
                });
                var l = (u.mode = {}),
                  f = (h.BlockCipherMode = m.extend({
                    createEncryptor: function (y, F) {
                      return this.Encryptor.create(y, F);
                    },
                    createDecryptor: function (y, F) {
                      return this.Decryptor.create(y, F);
                    },
                    init: function (y, F) {
                      ((this._cipher = y), (this._iv = F));
                    },
                  })),
                  d = (l.CBC = (function () {
                    var y = f.extend();
                    ((y.Encryptor = y.extend({
                      processBlock: function (_, k) {
                        var L = this._cipher,
                          $ = L.blockSize;
                        (F.call(this, _, k, $),
                          L.encryptBlock(_, k),
                          (this._prevBlock = _.slice(k, k + $)));
                      },
                    })),
                      (y.Decryptor = y.extend({
                        processBlock: function (_, k) {
                          var L = this._cipher,
                            $ = L.blockSize,
                            I = _.slice(k, k + $);
                          (L.decryptBlock(_, k), F.call(this, _, k, $), (this._prevBlock = I));
                        },
                      })));
                    function F(_, k, L) {
                      var $,
                        I = this._iv;
                      I ? (($ = I), (this._iv = t)) : ($ = this._prevBlock);
                      for (var Z = 0; Z < L; Z++) _[k + Z] ^= $[Z];
                    }
                    return y;
                  })()),
                  E = (u.pad = {}),
                  s = (E.Pkcs7 = {
                    pad: function (y, F) {
                      for (
                        var _ = F * 4,
                          k = _ - (y.sigBytes % _),
                          L = (k << 24) | (k << 16) | (k << 8) | k,
                          $ = [],
                          I = 0;
                        I < k;
                        I += 4
                      )
                        $.push(L);
                      var Z = g.create($, k);
                      y.concat(Z);
                    },
                    unpad: function (y) {
                      var F = y.words[(y.sigBytes - 1) >>> 2] & 255;
                      y.sigBytes -= F;
                    },
                  });
                h.BlockCipher = c.extend({
                  cfg: c.cfg.extend({ mode: d, padding: s }),
                  reset: function () {
                    var y;
                    c.reset.call(this);
                    var F = this.cfg,
                      _ = F.iv,
                      k = F.mode;
                    (this._xformMode == this._ENC_XFORM_MODE
                      ? (y = k.createEncryptor)
                      : ((y = k.createDecryptor), (this._minBufferSize = 1)),
                      this._mode && this._mode.__creator == y
                        ? this._mode.init(this, _ && _.words)
                        : ((this._mode = y.call(k, this, _ && _.words)),
                          (this._mode.__creator = y)));
                  },
                  _doProcessBlock: function (y, F) {
                    this._mode.processBlock(y, F);
                  },
                  _doFinalize: function () {
                    var y,
                      F = this.cfg.padding;
                    return (
                      this._xformMode == this._ENC_XFORM_MODE
                        ? (F.pad(this._data, this.blockSize), (y = this._process(!0)))
                        : ((y = this._process(!0)), F.unpad(y)),
                      y
                    );
                  },
                  blockSize: 128 / 32,
                });
                var x = (h.CipherParams = m.extend({
                    init: function (y) {
                      this.mixIn(y);
                    },
                    toString: function (y) {
                      return (y || this.formatter).stringify(this);
                    },
                  })),
                  p = (u.format = {}),
                  b = (p.OpenSSL = {
                    stringify: function (y) {
                      var F,
                        _ = y.ciphertext,
                        k = y.salt;
                      return (
                        k ? (F = g.create([1398893684, 1701076831]).concat(k).concat(_)) : (F = _),
                        F.toString(o)
                      );
                    },
                    parse: function (y) {
                      var F,
                        _ = o.parse(y),
                        k = _.words;
                      return (
                        k[0] == 1398893684 &&
                          k[1] == 1701076831 &&
                          ((F = g.create(k.slice(2, 4))), k.splice(0, 4), (_.sigBytes -= 16)),
                        x.create({ ciphertext: _, salt: F })
                      );
                    },
                  }),
                  C = (h.SerializableCipher = m.extend({
                    cfg: m.extend({ format: b }),
                    encrypt: function (y, F, _, k) {
                      k = this.cfg.extend(k);
                      var L = y.createEncryptor(_, k),
                        $ = L.finalize(F),
                        I = L.cfg;
                      return x.create({
                        ciphertext: $,
                        key: _,
                        iv: I.iv,
                        algorithm: y,
                        mode: I.mode,
                        padding: I.padding,
                        blockSize: y.blockSize,
                        formatter: k.format,
                      });
                    },
                    decrypt: function (y, F, _, k) {
                      ((k = this.cfg.extend(k)), (F = this._parse(F, k.format)));
                      var L = y.createDecryptor(_, k).finalize(F.ciphertext);
                      return L;
                    },
                    _parse: function (y, F) {
                      return typeof y == "string" ? F.parse(y, this) : y;
                    },
                  })),
                  A = (u.kdf = {}),
                  D = (A.OpenSSL = {
                    execute: function (y, F, _, k, L) {
                      if ((k || (k = g.random(64 / 8)), L))
                        var $ = i.create({ keySize: F + _, hasher: L }).compute(y, k);
                      else var $ = i.create({ keySize: F + _ }).compute(y, k);
                      var I = g.create($.words.slice(F), _ * 4);
                      return (($.sigBytes = F * 4), x.create({ key: $, iv: I, salt: k }));
                    },
                  }),
                  H = (h.PasswordBasedCipher = C.extend({
                    cfg: C.cfg.extend({ kdf: D }),
                    encrypt: function (y, F, _, k) {
                      k = this.cfg.extend(k);
                      var L = k.kdf.execute(_, y.keySize, y.ivSize, k.salt, k.hasher);
                      k.iv = L.iv;
                      var $ = C.encrypt.call(this, y, F, L.key, k);
                      return ($.mixIn(L), $);
                    },
                    decrypt: function (y, F, _, k) {
                      ((k = this.cfg.extend(k)), (F = this._parse(F, k.format)));
                      var L = k.kdf.execute(_, y.keySize, y.ivSize, F.salt, k.hasher);
                      k.iv = L.iv;
                      var $ = C.decrypt.call(this, y, F, L.key, k);
                      return $;
                    },
                  }));
              })();
          });
        })(Ee)),
      Ee.exports
    );
  }
  var ye = { exports: {} },
    ft;
  function Ar() {
    return (
      ft ||
        ((ft = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.mode.CFB = (function () {
                var t = e.lib.BlockCipherMode.extend();
                ((t.Encryptor = t.extend({
                  processBlock: function (h, m) {
                    var g = this._cipher,
                      v = g.blockSize;
                    (u.call(this, h, m, v, g), (this._prevBlock = h.slice(m, m + v)));
                  },
                })),
                  (t.Decryptor = t.extend({
                    processBlock: function (h, m) {
                      var g = this._cipher,
                        v = g.blockSize,
                        a = h.slice(m, m + v);
                      (u.call(this, h, m, v, g), (this._prevBlock = a));
                    },
                  })));
                function u(h, m, g, v) {
                  var a,
                    o = this._iv;
                  (o ? ((a = o.slice(0)), (this._iv = void 0)) : (a = this._prevBlock),
                    v.encryptBlock(a, 0));
                  for (var B = 0; B < g; B++) h[m + B] ^= a[B];
                }
                return t;
              })()),
              e.mode.CFB
            );
          });
        })(ye)),
      ye.exports
    );
  }
  var be = { exports: {} },
    dt;
  function Fr() {
    return (
      dt ||
        ((dt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.mode.CTR = (function () {
                var t = e.lib.BlockCipherMode.extend(),
                  u = (t.Encryptor = t.extend({
                    processBlock: function (h, m) {
                      var g = this._cipher,
                        v = g.blockSize,
                        a = this._iv,
                        o = this._counter;
                      a && ((o = this._counter = a.slice(0)), (this._iv = void 0));
                      var B = o.slice(0);
                      (g.encryptBlock(B, 0), (o[v - 1] = (o[v - 1] + 1) | 0));
                      for (var i = 0; i < v; i++) h[m + i] ^= B[i];
                    },
                  }));
                return ((t.Decryptor = u), t);
              })()),
              e.mode.CTR
            );
          });
        })(be)),
      be.exports
    );
  }
  var Ce = { exports: {} },
    pt;
  function Dr() {
    return (
      pt ||
        ((pt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            /** @preserve
             * Counter block mode compatible with  Dr Brian Gladman fileenc.c
             * derived from CryptoJS.mode.CTR
             * Jan Hruby jhruby.web@gmail.com
             */ return (
              (e.mode.CTRGladman = (function () {
                var t = e.lib.BlockCipherMode.extend();
                function u(g) {
                  if (((g >> 24) & 255) === 255) {
                    var v = (g >> 16) & 255,
                      a = (g >> 8) & 255,
                      o = g & 255;
                    (v === 255
                      ? ((v = 0), a === 255 ? ((a = 0), o === 255 ? (o = 0) : ++o) : ++a)
                      : ++v,
                      (g = 0),
                      (g += v << 16),
                      (g += a << 8),
                      (g += o));
                  } else g += 1 << 24;
                  return g;
                }
                function h(g) {
                  return ((g[0] = u(g[0])) === 0 && (g[1] = u(g[1])), g);
                }
                var m = (t.Encryptor = t.extend({
                  processBlock: function (g, v) {
                    var a = this._cipher,
                      o = a.blockSize,
                      B = this._iv,
                      i = this._counter;
                    (B && ((i = this._counter = B.slice(0)), (this._iv = void 0)), h(i));
                    var c = i.slice(0);
                    a.encryptBlock(c, 0);
                    for (var l = 0; l < o; l++) g[v + l] ^= c[l];
                  },
                }));
                return ((t.Decryptor = m), t);
              })()),
              e.mode.CTRGladman
            );
          });
        })(Ce)),
      Ce.exports
    );
  }
  var me = { exports: {} },
    ut;
  function wr() {
    return (
      ut ||
        ((ut = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.mode.OFB = (function () {
                var t = e.lib.BlockCipherMode.extend(),
                  u = (t.Encryptor = t.extend({
                    processBlock: function (h, m) {
                      var g = this._cipher,
                        v = g.blockSize,
                        a = this._iv,
                        o = this._keystream;
                      (a && ((o = this._keystream = a.slice(0)), (this._iv = void 0)),
                        g.encryptBlock(o, 0));
                      for (var B = 0; B < v; B++) h[m + B] ^= o[B];
                    },
                  }));
                return ((t.Decryptor = u), t);
              })()),
              e.mode.OFB
            );
          });
        })(me)),
      me.exports
    );
  }
  var Ae = { exports: {} },
    ht;
  function _r() {
    return (
      ht ||
        ((ht = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.mode.ECB = (function () {
                var t = e.lib.BlockCipherMode.extend();
                return (
                  (t.Encryptor = t.extend({
                    processBlock: function (u, h) {
                      this._cipher.encryptBlock(u, h);
                    },
                  })),
                  (t.Decryptor = t.extend({
                    processBlock: function (u, h) {
                      this._cipher.decryptBlock(u, h);
                    },
                  })),
                  t
                );
              })()),
              e.mode.ECB
            );
          });
        })(Ae)),
      Ae.exports
    );
  }
  var Fe = { exports: {} },
    vt;
  function kr() {
    return (
      vt ||
        ((vt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.pad.AnsiX923 = {
                pad: function (t, u) {
                  var h = t.sigBytes,
                    m = u * 4,
                    g = m - (h % m),
                    v = h + g - 1;
                  (t.clamp(), (t.words[v >>> 2] |= g << (24 - (v % 4) * 8)), (t.sigBytes += g));
                },
                unpad: function (t) {
                  var u = t.words[(t.sigBytes - 1) >>> 2] & 255;
                  t.sigBytes -= u;
                },
              }),
              e.pad.Ansix923
            );
          });
        })(Fe)),
      Fe.exports
    );
  }
  var De = { exports: {} },
    gt;
  function zr() {
    return (
      gt ||
        ((gt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.pad.Iso10126 = {
                pad: function (t, u) {
                  var h = u * 4,
                    m = h - (t.sigBytes % h);
                  t.concat(e.lib.WordArray.random(m - 1)).concat(
                    e.lib.WordArray.create([m << 24], 1),
                  );
                },
                unpad: function (t) {
                  var u = t.words[(t.sigBytes - 1) >>> 2] & 255;
                  t.sigBytes -= u;
                },
              }),
              e.pad.Iso10126
            );
          });
        })(De)),
      De.exports
    );
  }
  var we = { exports: {} },
    Bt;
  function Sr() {
    return (
      Bt ||
        ((Bt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.pad.Iso97971 = {
                pad: function (t, u) {
                  (t.concat(e.lib.WordArray.create([2147483648], 1)), e.pad.ZeroPadding.pad(t, u));
                },
                unpad: function (t) {
                  (e.pad.ZeroPadding.unpad(t), t.sigBytes--);
                },
              }),
              e.pad.Iso97971
            );
          });
        })(we)),
      we.exports
    );
  }
  var _e = { exports: {} },
    Et;
  function Pr() {
    return (
      Et ||
        ((Et = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.pad.ZeroPadding = {
                pad: function (t, u) {
                  var h = u * 4;
                  (t.clamp(), (t.sigBytes += h - (t.sigBytes % h || h)));
                },
                unpad: function (t) {
                  for (var u = t.words, h = t.sigBytes - 1, h = t.sigBytes - 1; h >= 0; h--)
                    if ((u[h >>> 2] >>> (24 - (h % 4) * 8)) & 255) {
                      t.sigBytes = h + 1;
                      break;
                    }
                },
              }),
              e.pad.ZeroPadding
            );
          });
        })(_e)),
      _e.exports
    );
  }
  var ke = { exports: {} },
    yt;
  function Hr() {
    return (
      yt ||
        ((yt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (e.pad.NoPadding = { pad: function () {}, unpad: function () {} }),
              e.pad.NoPadding
            );
          });
        })(ke)),
      ke.exports
    );
  }
  var ze = { exports: {} },
    bt;
  function Rr() {
    return (
      bt ||
        ((bt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), t0());
          })(U, function (e) {
            return (
              (function (t) {
                var u = e,
                  h = u.lib,
                  m = h.CipherParams,
                  g = u.enc,
                  v = g.Hex,
                  a = u.format;
                a.Hex = {
                  stringify: function (o) {
                    return o.ciphertext.toString(v);
                  },
                  parse: function (o) {
                    var B = v.parse(o);
                    return m.create({ ciphertext: B });
                  },
                };
              })(),
              e.format.Hex
            );
          });
        })(ze)),
      ze.exports
    );
  }
  var Se = { exports: {} },
    Ct;
  function Lr() {
    return (
      Ct ||
        ((Ct = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), A0(), F0(), B0(), t0());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.BlockCipher,
                  m = t.algo,
                  g = [],
                  v = [],
                  a = [],
                  o = [],
                  B = [],
                  i = [],
                  c = [],
                  l = [],
                  f = [],
                  d = [];
                (function () {
                  for (var x = [], p = 0; p < 256; p++)
                    p < 128 ? (x[p] = p << 1) : (x[p] = (p << 1) ^ 283);
                  for (var b = 0, C = 0, p = 0; p < 256; p++) {
                    var A = C ^ (C << 1) ^ (C << 2) ^ (C << 3) ^ (C << 4);
                    ((A = (A >>> 8) ^ (A & 255) ^ 99), (g[b] = A), (v[A] = b));
                    var D = x[b],
                      H = x[D],
                      y = x[H],
                      F = (x[A] * 257) ^ (A * 16843008);
                    ((a[b] = (F << 24) | (F >>> 8)),
                      (o[b] = (F << 16) | (F >>> 16)),
                      (B[b] = (F << 8) | (F >>> 24)),
                      (i[b] = F));
                    var F = (y * 16843009) ^ (H * 65537) ^ (D * 257) ^ (b * 16843008);
                    ((c[A] = (F << 24) | (F >>> 8)),
                      (l[A] = (F << 16) | (F >>> 16)),
                      (f[A] = (F << 8) | (F >>> 24)),
                      (d[A] = F),
                      b ? ((b = D ^ x[x[x[y ^ D]]]), (C ^= x[x[C]])) : (b = C = 1));
                  }
                })();
                var E = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54],
                  s = (m.AES = h.extend({
                    _doReset: function () {
                      var x;
                      if (!(this._nRounds && this._keyPriorReset === this._key)) {
                        for (
                          var p = (this._keyPriorReset = this._key),
                            b = p.words,
                            C = p.sigBytes / 4,
                            A = (this._nRounds = C + 6),
                            D = (A + 1) * 4,
                            H = (this._keySchedule = []),
                            y = 0;
                          y < D;
                          y++
                        )
                          y < C
                            ? (H[y] = b[y])
                            : ((x = H[y - 1]),
                              y % C
                                ? C > 6 &&
                                  y % C == 4 &&
                                  (x =
                                    (g[x >>> 24] << 24) |
                                    (g[(x >>> 16) & 255] << 16) |
                                    (g[(x >>> 8) & 255] << 8) |
                                    g[x & 255])
                                : ((x = (x << 8) | (x >>> 24)),
                                  (x =
                                    (g[x >>> 24] << 24) |
                                    (g[(x >>> 16) & 255] << 16) |
                                    (g[(x >>> 8) & 255] << 8) |
                                    g[x & 255]),
                                  (x ^= E[(y / C) | 0] << 24)),
                              (H[y] = H[y - C] ^ x));
                        for (var F = (this._invKeySchedule = []), _ = 0; _ < D; _++) {
                          var y = D - _;
                          if (_ % 4) var x = H[y];
                          else var x = H[y - 4];
                          _ < 4 || y <= 4
                            ? (F[_] = x)
                            : (F[_] =
                                c[g[x >>> 24]] ^
                                l[g[(x >>> 16) & 255]] ^
                                f[g[(x >>> 8) & 255]] ^
                                d[g[x & 255]]);
                        }
                      }
                    },
                    encryptBlock: function (x, p) {
                      this._doCryptBlock(x, p, this._keySchedule, a, o, B, i, g);
                    },
                    decryptBlock: function (x, p) {
                      var b = x[p + 1];
                      ((x[p + 1] = x[p + 3]),
                        (x[p + 3] = b),
                        this._doCryptBlock(x, p, this._invKeySchedule, c, l, f, d, v));
                      var b = x[p + 1];
                      ((x[p + 1] = x[p + 3]), (x[p + 3] = b));
                    },
                    _doCryptBlock: function (x, p, b, C, A, D, H, y) {
                      for (
                        var F = this._nRounds,
                          _ = x[p] ^ b[0],
                          k = x[p + 1] ^ b[1],
                          L = x[p + 2] ^ b[2],
                          $ = x[p + 3] ^ b[3],
                          I = 4,
                          Z = 1;
                        Z < F;
                        Z++
                      ) {
                        var X =
                            C[_ >>> 24] ^
                            A[(k >>> 16) & 255] ^
                            D[(L >>> 8) & 255] ^
                            H[$ & 255] ^
                            b[I++],
                          V =
                            C[k >>> 24] ^
                            A[(L >>> 16) & 255] ^
                            D[($ >>> 8) & 255] ^
                            H[_ & 255] ^
                            b[I++],
                          G =
                            C[L >>> 24] ^
                            A[($ >>> 16) & 255] ^
                            D[(_ >>> 8) & 255] ^
                            H[k & 255] ^
                            b[I++],
                          w =
                            C[$ >>> 24] ^
                            A[(_ >>> 16) & 255] ^
                            D[(k >>> 8) & 255] ^
                            H[L & 255] ^
                            b[I++];
                        ((_ = X), (k = V), (L = G), ($ = w));
                      }
                      var X =
                          ((y[_ >>> 24] << 24) |
                            (y[(k >>> 16) & 255] << 16) |
                            (y[(L >>> 8) & 255] << 8) |
                            y[$ & 255]) ^
                          b[I++],
                        V =
                          ((y[k >>> 24] << 24) |
                            (y[(L >>> 16) & 255] << 16) |
                            (y[($ >>> 8) & 255] << 8) |
                            y[_ & 255]) ^
                          b[I++],
                        G =
                          ((y[L >>> 24] << 24) |
                            (y[($ >>> 16) & 255] << 16) |
                            (y[(_ >>> 8) & 255] << 8) |
                            y[k & 255]) ^
                          b[I++],
                        w =
                          ((y[$ >>> 24] << 24) |
                            (y[(_ >>> 16) & 255] << 16) |
                            (y[(k >>> 8) & 255] << 8) |
                            y[L & 255]) ^
                          b[I++];
                      ((x[p] = X), (x[p + 1] = V), (x[p + 2] = G), (x[p + 3] = w));
                    },
                    keySize: 256 / 32,
                  }));
                t.AES = h._createHelper(s);
              })(),
              e.AES
            );
          });
        })(Se)),
      Se.exports
    );
  }
  var Pe = { exports: {} },
    mt;
  function $r() {
    return (
      mt ||
        ((mt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), A0(), F0(), B0(), t0());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.WordArray,
                  m = u.BlockCipher,
                  g = t.algo,
                  v = [
                    57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27,
                    19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30,
                    22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
                  ],
                  a = [
                    14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20,
                    13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53,
                    46, 42, 50, 36, 29, 32,
                  ],
                  o = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28],
                  B = [
                    {
                      0: 8421888,
                      268435456: 32768,
                      536870912: 8421378,
                      805306368: 2,
                      1073741824: 512,
                      1342177280: 8421890,
                      1610612736: 8389122,
                      1879048192: 8388608,
                      2147483648: 514,
                      2415919104: 8389120,
                      2684354560: 33280,
                      2952790016: 8421376,
                      3221225472: 32770,
                      3489660928: 8388610,
                      3758096384: 0,
                      4026531840: 33282,
                      134217728: 0,
                      402653184: 8421890,
                      671088640: 33282,
                      939524096: 32768,
                      1207959552: 8421888,
                      1476395008: 512,
                      1744830464: 8421378,
                      2013265920: 2,
                      2281701376: 8389120,
                      2550136832: 33280,
                      2818572288: 8421376,
                      3087007744: 8389122,
                      3355443200: 8388610,
                      3623878656: 32770,
                      3892314112: 514,
                      4160749568: 8388608,
                      1: 32768,
                      268435457: 2,
                      536870913: 8421888,
                      805306369: 8388608,
                      1073741825: 8421378,
                      1342177281: 33280,
                      1610612737: 512,
                      1879048193: 8389122,
                      2147483649: 8421890,
                      2415919105: 8421376,
                      2684354561: 8388610,
                      2952790017: 33282,
                      3221225473: 514,
                      3489660929: 8389120,
                      3758096385: 32770,
                      4026531841: 0,
                      134217729: 8421890,
                      402653185: 8421376,
                      671088641: 8388608,
                      939524097: 512,
                      1207959553: 32768,
                      1476395009: 8388610,
                      1744830465: 2,
                      2013265921: 33282,
                      2281701377: 32770,
                      2550136833: 8389122,
                      2818572289: 514,
                      3087007745: 8421888,
                      3355443201: 8389120,
                      3623878657: 0,
                      3892314113: 33280,
                      4160749569: 8421378,
                    },
                    {
                      0: 1074282512,
                      16777216: 16384,
                      33554432: 524288,
                      50331648: 1074266128,
                      67108864: 1073741840,
                      83886080: 1074282496,
                      100663296: 1073758208,
                      117440512: 16,
                      134217728: 540672,
                      150994944: 1073758224,
                      167772160: 1073741824,
                      184549376: 540688,
                      201326592: 524304,
                      218103808: 0,
                      234881024: 16400,
                      251658240: 1074266112,
                      8388608: 1073758208,
                      25165824: 540688,
                      41943040: 16,
                      58720256: 1073758224,
                      75497472: 1074282512,
                      92274688: 1073741824,
                      109051904: 524288,
                      125829120: 1074266128,
                      142606336: 524304,
                      159383552: 0,
                      176160768: 16384,
                      192937984: 1074266112,
                      209715200: 1073741840,
                      226492416: 540672,
                      243269632: 1074282496,
                      260046848: 16400,
                      268435456: 0,
                      285212672: 1074266128,
                      301989888: 1073758224,
                      318767104: 1074282496,
                      335544320: 1074266112,
                      352321536: 16,
                      369098752: 540688,
                      385875968: 16384,
                      402653184: 16400,
                      419430400: 524288,
                      436207616: 524304,
                      452984832: 1073741840,
                      469762048: 540672,
                      486539264: 1073758208,
                      503316480: 1073741824,
                      520093696: 1074282512,
                      276824064: 540688,
                      293601280: 524288,
                      310378496: 1074266112,
                      327155712: 16384,
                      343932928: 1073758208,
                      360710144: 1074282512,
                      377487360: 16,
                      394264576: 1073741824,
                      411041792: 1074282496,
                      427819008: 1073741840,
                      444596224: 1073758224,
                      461373440: 524304,
                      478150656: 0,
                      494927872: 16400,
                      511705088: 1074266128,
                      528482304: 540672,
                    },
                    {
                      0: 260,
                      1048576: 0,
                      2097152: 67109120,
                      3145728: 65796,
                      4194304: 65540,
                      5242880: 67108868,
                      6291456: 67174660,
                      7340032: 67174400,
                      8388608: 67108864,
                      9437184: 67174656,
                      10485760: 65792,
                      11534336: 67174404,
                      12582912: 67109124,
                      13631488: 65536,
                      14680064: 4,
                      15728640: 256,
                      524288: 67174656,
                      1572864: 67174404,
                      2621440: 0,
                      3670016: 67109120,
                      4718592: 67108868,
                      5767168: 65536,
                      6815744: 65540,
                      7864320: 260,
                      8912896: 4,
                      9961472: 256,
                      11010048: 67174400,
                      12058624: 65796,
                      13107200: 65792,
                      14155776: 67109124,
                      15204352: 67174660,
                      16252928: 67108864,
                      16777216: 67174656,
                      17825792: 65540,
                      18874368: 65536,
                      19922944: 67109120,
                      20971520: 256,
                      22020096: 67174660,
                      23068672: 67108868,
                      24117248: 0,
                      25165824: 67109124,
                      26214400: 67108864,
                      27262976: 4,
                      28311552: 65792,
                      29360128: 67174400,
                      30408704: 260,
                      31457280: 65796,
                      32505856: 67174404,
                      17301504: 67108864,
                      18350080: 260,
                      19398656: 67174656,
                      20447232: 0,
                      21495808: 65540,
                      22544384: 67109120,
                      23592960: 256,
                      24641536: 67174404,
                      25690112: 65536,
                      26738688: 67174660,
                      27787264: 65796,
                      28835840: 67108868,
                      29884416: 67109124,
                      30932992: 67174400,
                      31981568: 4,
                      33030144: 65792,
                    },
                    {
                      0: 2151682048,
                      65536: 2147487808,
                      131072: 4198464,
                      196608: 2151677952,
                      262144: 0,
                      327680: 4198400,
                      393216: 2147483712,
                      458752: 4194368,
                      524288: 2147483648,
                      589824: 4194304,
                      655360: 64,
                      720896: 2147487744,
                      786432: 2151678016,
                      851968: 4160,
                      917504: 4096,
                      983040: 2151682112,
                      32768: 2147487808,
                      98304: 64,
                      163840: 2151678016,
                      229376: 2147487744,
                      294912: 4198400,
                      360448: 2151682112,
                      425984: 0,
                      491520: 2151677952,
                      557056: 4096,
                      622592: 2151682048,
                      688128: 4194304,
                      753664: 4160,
                      819200: 2147483648,
                      884736: 4194368,
                      950272: 4198464,
                      1015808: 2147483712,
                      1048576: 4194368,
                      1114112: 4198400,
                      1179648: 2147483712,
                      1245184: 0,
                      1310720: 4160,
                      1376256: 2151678016,
                      1441792: 2151682048,
                      1507328: 2147487808,
                      1572864: 2151682112,
                      1638400: 2147483648,
                      1703936: 2151677952,
                      1769472: 4198464,
                      1835008: 2147487744,
                      1900544: 4194304,
                      1966080: 64,
                      2031616: 4096,
                      1081344: 2151677952,
                      1146880: 2151682112,
                      1212416: 0,
                      1277952: 4198400,
                      1343488: 4194368,
                      1409024: 2147483648,
                      1474560: 2147487808,
                      1540096: 64,
                      1605632: 2147483712,
                      1671168: 4096,
                      1736704: 2147487744,
                      1802240: 2151678016,
                      1867776: 4160,
                      1933312: 2151682048,
                      1998848: 4194304,
                      2064384: 4198464,
                    },
                    {
                      0: 128,
                      4096: 17039360,
                      8192: 262144,
                      12288: 536870912,
                      16384: 537133184,
                      20480: 16777344,
                      24576: 553648256,
                      28672: 262272,
                      32768: 16777216,
                      36864: 537133056,
                      40960: 536871040,
                      45056: 553910400,
                      49152: 553910272,
                      53248: 0,
                      57344: 17039488,
                      61440: 553648128,
                      2048: 17039488,
                      6144: 553648256,
                      10240: 128,
                      14336: 17039360,
                      18432: 262144,
                      22528: 537133184,
                      26624: 553910272,
                      30720: 536870912,
                      34816: 537133056,
                      38912: 0,
                      43008: 553910400,
                      47104: 16777344,
                      51200: 536871040,
                      55296: 553648128,
                      59392: 16777216,
                      63488: 262272,
                      65536: 262144,
                      69632: 128,
                      73728: 536870912,
                      77824: 553648256,
                      81920: 16777344,
                      86016: 553910272,
                      90112: 537133184,
                      94208: 16777216,
                      98304: 553910400,
                      102400: 553648128,
                      106496: 17039360,
                      110592: 537133056,
                      114688: 262272,
                      118784: 536871040,
                      122880: 0,
                      126976: 17039488,
                      67584: 553648256,
                      71680: 16777216,
                      75776: 17039360,
                      79872: 537133184,
                      83968: 536870912,
                      88064: 17039488,
                      92160: 128,
                      96256: 553910272,
                      100352: 262272,
                      104448: 553910400,
                      108544: 0,
                      112640: 553648128,
                      116736: 16777344,
                      120832: 262144,
                      124928: 537133056,
                      129024: 536871040,
                    },
                    {
                      0: 268435464,
                      256: 8192,
                      512: 270532608,
                      768: 270540808,
                      1024: 268443648,
                      1280: 2097152,
                      1536: 2097160,
                      1792: 268435456,
                      2048: 0,
                      2304: 268443656,
                      2560: 2105344,
                      2816: 8,
                      3072: 270532616,
                      3328: 2105352,
                      3584: 8200,
                      3840: 270540800,
                      128: 270532608,
                      384: 270540808,
                      640: 8,
                      896: 2097152,
                      1152: 2105352,
                      1408: 268435464,
                      1664: 268443648,
                      1920: 8200,
                      2176: 2097160,
                      2432: 8192,
                      2688: 268443656,
                      2944: 270532616,
                      3200: 0,
                      3456: 270540800,
                      3712: 2105344,
                      3968: 268435456,
                      4096: 268443648,
                      4352: 270532616,
                      4608: 270540808,
                      4864: 8200,
                      5120: 2097152,
                      5376: 268435456,
                      5632: 268435464,
                      5888: 2105344,
                      6144: 2105352,
                      6400: 0,
                      6656: 8,
                      6912: 270532608,
                      7168: 8192,
                      7424: 268443656,
                      7680: 270540800,
                      7936: 2097160,
                      4224: 8,
                      4480: 2105344,
                      4736: 2097152,
                      4992: 268435464,
                      5248: 268443648,
                      5504: 8200,
                      5760: 270540808,
                      6016: 270532608,
                      6272: 270540800,
                      6528: 270532616,
                      6784: 8192,
                      7040: 2105352,
                      7296: 2097160,
                      7552: 0,
                      7808: 268435456,
                      8064: 268443656,
                    },
                    {
                      0: 1048576,
                      16: 33555457,
                      32: 1024,
                      48: 1049601,
                      64: 34604033,
                      80: 0,
                      96: 1,
                      112: 34603009,
                      128: 33555456,
                      144: 1048577,
                      160: 33554433,
                      176: 34604032,
                      192: 34603008,
                      208: 1025,
                      224: 1049600,
                      240: 33554432,
                      8: 34603009,
                      24: 0,
                      40: 33555457,
                      56: 34604032,
                      72: 1048576,
                      88: 33554433,
                      104: 33554432,
                      120: 1025,
                      136: 1049601,
                      152: 33555456,
                      168: 34603008,
                      184: 1048577,
                      200: 1024,
                      216: 34604033,
                      232: 1,
                      248: 1049600,
                      256: 33554432,
                      272: 1048576,
                      288: 33555457,
                      304: 34603009,
                      320: 1048577,
                      336: 33555456,
                      352: 34604032,
                      368: 1049601,
                      384: 1025,
                      400: 34604033,
                      416: 1049600,
                      432: 1,
                      448: 0,
                      464: 34603008,
                      480: 33554433,
                      496: 1024,
                      264: 1049600,
                      280: 33555457,
                      296: 34603009,
                      312: 1,
                      328: 33554432,
                      344: 1048576,
                      360: 1025,
                      376: 34604032,
                      392: 33554433,
                      408: 34603008,
                      424: 0,
                      440: 34604033,
                      456: 1049601,
                      472: 1024,
                      488: 33555456,
                      504: 1048577,
                    },
                    {
                      0: 134219808,
                      1: 131072,
                      2: 134217728,
                      3: 32,
                      4: 131104,
                      5: 134350880,
                      6: 134350848,
                      7: 2048,
                      8: 134348800,
                      9: 134219776,
                      10: 133120,
                      11: 134348832,
                      12: 2080,
                      13: 0,
                      14: 134217760,
                      15: 133152,
                      2147483648: 2048,
                      2147483649: 134350880,
                      2147483650: 134219808,
                      2147483651: 134217728,
                      2147483652: 134348800,
                      2147483653: 133120,
                      2147483654: 133152,
                      2147483655: 32,
                      2147483656: 134217760,
                      2147483657: 2080,
                      2147483658: 131104,
                      2147483659: 134350848,
                      2147483660: 0,
                      2147483661: 134348832,
                      2147483662: 134219776,
                      2147483663: 131072,
                      16: 133152,
                      17: 134350848,
                      18: 32,
                      19: 2048,
                      20: 134219776,
                      21: 134217760,
                      22: 134348832,
                      23: 131072,
                      24: 0,
                      25: 131104,
                      26: 134348800,
                      27: 134219808,
                      28: 134350880,
                      29: 133120,
                      30: 2080,
                      31: 134217728,
                      2147483664: 131072,
                      2147483665: 2048,
                      2147483666: 134348832,
                      2147483667: 133152,
                      2147483668: 32,
                      2147483669: 134348800,
                      2147483670: 134217728,
                      2147483671: 134219808,
                      2147483672: 134350880,
                      2147483673: 134217760,
                      2147483674: 134219776,
                      2147483675: 0,
                      2147483676: 133120,
                      2147483677: 2080,
                      2147483678: 131104,
                      2147483679: 134350848,
                    },
                  ],
                  i = [4160749569, 528482304, 33030144, 2064384, 129024, 8064, 504, 2147483679],
                  c = (g.DES = m.extend({
                    _doReset: function () {
                      for (var E = this._key, s = E.words, x = [], p = 0; p < 56; p++) {
                        var b = v[p] - 1;
                        x[p] = (s[b >>> 5] >>> (31 - (b % 32))) & 1;
                      }
                      for (var C = (this._subKeys = []), A = 0; A < 16; A++) {
                        for (var D = (C[A] = []), H = o[A], p = 0; p < 24; p++)
                          ((D[(p / 6) | 0] |= x[(a[p] - 1 + H) % 28] << (31 - (p % 6))),
                            (D[4 + ((p / 6) | 0)] |=
                              x[28 + ((a[p + 24] - 1 + H) % 28)] << (31 - (p % 6))));
                        D[0] = (D[0] << 1) | (D[0] >>> 31);
                        for (var p = 1; p < 7; p++) D[p] = D[p] >>> ((p - 1) * 4 + 3);
                        D[7] = (D[7] << 5) | (D[7] >>> 27);
                      }
                      for (var y = (this._invSubKeys = []), p = 0; p < 16; p++) y[p] = C[15 - p];
                    },
                    encryptBlock: function (E, s) {
                      this._doCryptBlock(E, s, this._subKeys);
                    },
                    decryptBlock: function (E, s) {
                      this._doCryptBlock(E, s, this._invSubKeys);
                    },
                    _doCryptBlock: function (E, s, x) {
                      ((this._lBlock = E[s]),
                        (this._rBlock = E[s + 1]),
                        l.call(this, 4, 252645135),
                        l.call(this, 16, 65535),
                        f.call(this, 2, 858993459),
                        f.call(this, 8, 16711935),
                        l.call(this, 1, 1431655765));
                      for (var p = 0; p < 16; p++) {
                        for (
                          var b = x[p], C = this._lBlock, A = this._rBlock, D = 0, H = 0;
                          H < 8;
                          H++
                        )
                          D |= B[H][((A ^ b[H]) & i[H]) >>> 0];
                        ((this._lBlock = A), (this._rBlock = C ^ D));
                      }
                      var y = this._lBlock;
                      ((this._lBlock = this._rBlock),
                        (this._rBlock = y),
                        l.call(this, 1, 1431655765),
                        f.call(this, 8, 16711935),
                        f.call(this, 2, 858993459),
                        l.call(this, 16, 65535),
                        l.call(this, 4, 252645135),
                        (E[s] = this._lBlock),
                        (E[s + 1] = this._rBlock));
                    },
                    keySize: 64 / 32,
                    ivSize: 64 / 32,
                    blockSize: 64 / 32,
                  }));
                function l(E, s) {
                  var x = ((this._lBlock >>> E) ^ this._rBlock) & s;
                  ((this._rBlock ^= x), (this._lBlock ^= x << E));
                }
                function f(E, s) {
                  var x = ((this._rBlock >>> E) ^ this._lBlock) & s;
                  ((this._lBlock ^= x), (this._rBlock ^= x << E));
                }
                t.DES = m._createHelper(c);
                var d = (g.TripleDES = m.extend({
                  _doReset: function () {
                    var E = this._key,
                      s = E.words;
                    if (s.length !== 2 && s.length !== 4 && s.length < 6)
                      throw new Error(
                        "Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.",
                      );
                    var x = s.slice(0, 2),
                      p = s.length < 4 ? s.slice(0, 2) : s.slice(2, 4),
                      b = s.length < 6 ? s.slice(0, 2) : s.slice(4, 6);
                    ((this._des1 = c.createEncryptor(h.create(x))),
                      (this._des2 = c.createEncryptor(h.create(p))),
                      (this._des3 = c.createEncryptor(h.create(b))));
                  },
                  encryptBlock: function (E, s) {
                    (this._des1.encryptBlock(E, s),
                      this._des2.decryptBlock(E, s),
                      this._des3.encryptBlock(E, s));
                  },
                  decryptBlock: function (E, s) {
                    (this._des3.decryptBlock(E, s),
                      this._des2.encryptBlock(E, s),
                      this._des1.decryptBlock(E, s));
                  },
                  keySize: 192 / 32,
                  ivSize: 64 / 32,
                  blockSize: 64 / 32,
                }));
                t.TripleDES = m._createHelper(d);
              })(),
              e.TripleDES
            );
          });
        })(Pe)),
      Pe.exports
    );
  }
  var He = { exports: {} },
    At;
  function Wr() {
    return (
      At ||
        ((At = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), A0(), F0(), B0(), t0());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.StreamCipher,
                  m = t.algo,
                  g = (m.RC4 = h.extend({
                    _doReset: function () {
                      for (
                        var o = this._key, B = o.words, i = o.sigBytes, c = (this._S = []), l = 0;
                        l < 256;
                        l++
                      )
                        c[l] = l;
                      for (var l = 0, f = 0; l < 256; l++) {
                        var d = l % i,
                          E = (B[d >>> 2] >>> (24 - (d % 4) * 8)) & 255;
                        f = (f + c[l] + E) % 256;
                        var s = c[l];
                        ((c[l] = c[f]), (c[f] = s));
                      }
                      this._i = this._j = 0;
                    },
                    _doProcessBlock: function (o, B) {
                      o[B] ^= v.call(this);
                    },
                    keySize: 256 / 32,
                    ivSize: 0,
                  }));
                function v() {
                  for (var o = this._S, B = this._i, i = this._j, c = 0, l = 0; l < 4; l++) {
                    ((B = (B + 1) % 256), (i = (i + o[B]) % 256));
                    var f = o[B];
                    ((o[B] = o[i]), (o[i] = f), (c |= o[(o[B] + o[i]) % 256] << (24 - l * 8)));
                  }
                  return ((this._i = B), (this._j = i), c);
                }
                t.RC4 = h._createHelper(g);
                var a = (m.RC4Drop = g.extend({
                  cfg: g.cfg.extend({ drop: 192 }),
                  _doReset: function () {
                    g._doReset.call(this);
                    for (var o = this.cfg.drop; o > 0; o--) v.call(this);
                  },
                }));
                t.RC4Drop = h._createHelper(a);
              })(),
              e.RC4
            );
          });
        })(He)),
      He.exports
    );
  }
  var Re = { exports: {} },
    Ft;
  function Tr() {
    return (
      Ft ||
        ((Ft = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), A0(), F0(), B0(), t0());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.StreamCipher,
                  m = t.algo,
                  g = [],
                  v = [],
                  a = [],
                  o = (m.Rabbit = h.extend({
                    _doReset: function () {
                      for (var i = this._key.words, c = this.cfg.iv, l = 0; l < 4; l++)
                        i[l] =
                          (((i[l] << 8) | (i[l] >>> 24)) & 16711935) |
                          (((i[l] << 24) | (i[l] >>> 8)) & 4278255360);
                      var f = (this._X = [
                          i[0],
                          (i[3] << 16) | (i[2] >>> 16),
                          i[1],
                          (i[0] << 16) | (i[3] >>> 16),
                          i[2],
                          (i[1] << 16) | (i[0] >>> 16),
                          i[3],
                          (i[2] << 16) | (i[1] >>> 16),
                        ]),
                        d = (this._C = [
                          (i[2] << 16) | (i[2] >>> 16),
                          (i[0] & 4294901760) | (i[1] & 65535),
                          (i[3] << 16) | (i[3] >>> 16),
                          (i[1] & 4294901760) | (i[2] & 65535),
                          (i[0] << 16) | (i[0] >>> 16),
                          (i[2] & 4294901760) | (i[3] & 65535),
                          (i[1] << 16) | (i[1] >>> 16),
                          (i[3] & 4294901760) | (i[0] & 65535),
                        ]);
                      this._b = 0;
                      for (var l = 0; l < 4; l++) B.call(this);
                      for (var l = 0; l < 8; l++) d[l] ^= f[(l + 4) & 7];
                      if (c) {
                        var E = c.words,
                          s = E[0],
                          x = E[1],
                          p =
                            (((s << 8) | (s >>> 24)) & 16711935) |
                            (((s << 24) | (s >>> 8)) & 4278255360),
                          b =
                            (((x << 8) | (x >>> 24)) & 16711935) |
                            (((x << 24) | (x >>> 8)) & 4278255360),
                          C = (p >>> 16) | (b & 4294901760),
                          A = (b << 16) | (p & 65535);
                        ((d[0] ^= p),
                          (d[1] ^= C),
                          (d[2] ^= b),
                          (d[3] ^= A),
                          (d[4] ^= p),
                          (d[5] ^= C),
                          (d[6] ^= b),
                          (d[7] ^= A));
                        for (var l = 0; l < 4; l++) B.call(this);
                      }
                    },
                    _doProcessBlock: function (i, c) {
                      var l = this._X;
                      (B.call(this),
                        (g[0] = l[0] ^ (l[5] >>> 16) ^ (l[3] << 16)),
                        (g[1] = l[2] ^ (l[7] >>> 16) ^ (l[5] << 16)),
                        (g[2] = l[4] ^ (l[1] >>> 16) ^ (l[7] << 16)),
                        (g[3] = l[6] ^ (l[3] >>> 16) ^ (l[1] << 16)));
                      for (var f = 0; f < 4; f++)
                        ((g[f] =
                          (((g[f] << 8) | (g[f] >>> 24)) & 16711935) |
                          (((g[f] << 24) | (g[f] >>> 8)) & 4278255360)),
                          (i[c + f] ^= g[f]));
                    },
                    blockSize: 128 / 32,
                    ivSize: 64 / 32,
                  }));
                function B() {
                  for (var i = this._X, c = this._C, l = 0; l < 8; l++) v[l] = c[l];
                  ((c[0] = (c[0] + 1295307597 + this._b) | 0),
                    (c[1] = (c[1] + 3545052371 + (c[0] >>> 0 < v[0] >>> 0 ? 1 : 0)) | 0),
                    (c[2] = (c[2] + 886263092 + (c[1] >>> 0 < v[1] >>> 0 ? 1 : 0)) | 0),
                    (c[3] = (c[3] + 1295307597 + (c[2] >>> 0 < v[2] >>> 0 ? 1 : 0)) | 0),
                    (c[4] = (c[4] + 3545052371 + (c[3] >>> 0 < v[3] >>> 0 ? 1 : 0)) | 0),
                    (c[5] = (c[5] + 886263092 + (c[4] >>> 0 < v[4] >>> 0 ? 1 : 0)) | 0),
                    (c[6] = (c[6] + 1295307597 + (c[5] >>> 0 < v[5] >>> 0 ? 1 : 0)) | 0),
                    (c[7] = (c[7] + 3545052371 + (c[6] >>> 0 < v[6] >>> 0 ? 1 : 0)) | 0),
                    (this._b = c[7] >>> 0 < v[7] >>> 0 ? 1 : 0));
                  for (var l = 0; l < 8; l++) {
                    var f = i[l] + c[l],
                      d = f & 65535,
                      E = f >>> 16,
                      s = ((((d * d) >>> 17) + d * E) >>> 15) + E * E,
                      x = (((f & 4294901760) * f) | 0) + (((f & 65535) * f) | 0);
                    a[l] = s ^ x;
                  }
                  ((i[0] =
                    (a[0] + ((a[7] << 16) | (a[7] >>> 16)) + ((a[6] << 16) | (a[6] >>> 16))) | 0),
                    (i[1] = (a[1] + ((a[0] << 8) | (a[0] >>> 24)) + a[7]) | 0),
                    (i[2] =
                      (a[2] + ((a[1] << 16) | (a[1] >>> 16)) + ((a[0] << 16) | (a[0] >>> 16))) | 0),
                    (i[3] = (a[3] + ((a[2] << 8) | (a[2] >>> 24)) + a[1]) | 0),
                    (i[4] =
                      (a[4] + ((a[3] << 16) | (a[3] >>> 16)) + ((a[2] << 16) | (a[2] >>> 16))) | 0),
                    (i[5] = (a[5] + ((a[4] << 8) | (a[4] >>> 24)) + a[3]) | 0),
                    (i[6] =
                      (a[6] + ((a[5] << 16) | (a[5] >>> 16)) + ((a[4] << 16) | (a[4] >>> 16))) | 0),
                    (i[7] = (a[7] + ((a[6] << 8) | (a[6] >>> 24)) + a[5]) | 0));
                }
                t.Rabbit = h._createHelper(o);
              })(),
              e.Rabbit
            );
          });
        })(Re)),
      Re.exports
    );
  }
  var Le = { exports: {} },
    Dt;
  function Mr() {
    return (
      Dt ||
        ((Dt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), A0(), F0(), B0(), t0());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.StreamCipher,
                  m = t.algo,
                  g = [],
                  v = [],
                  a = [],
                  o = (m.RabbitLegacy = h.extend({
                    _doReset: function () {
                      var i = this._key.words,
                        c = this.cfg.iv,
                        l = (this._X = [
                          i[0],
                          (i[3] << 16) | (i[2] >>> 16),
                          i[1],
                          (i[0] << 16) | (i[3] >>> 16),
                          i[2],
                          (i[1] << 16) | (i[0] >>> 16),
                          i[3],
                          (i[2] << 16) | (i[1] >>> 16),
                        ]),
                        f = (this._C = [
                          (i[2] << 16) | (i[2] >>> 16),
                          (i[0] & 4294901760) | (i[1] & 65535),
                          (i[3] << 16) | (i[3] >>> 16),
                          (i[1] & 4294901760) | (i[2] & 65535),
                          (i[0] << 16) | (i[0] >>> 16),
                          (i[2] & 4294901760) | (i[3] & 65535),
                          (i[1] << 16) | (i[1] >>> 16),
                          (i[3] & 4294901760) | (i[0] & 65535),
                        ]);
                      this._b = 0;
                      for (var d = 0; d < 4; d++) B.call(this);
                      for (var d = 0; d < 8; d++) f[d] ^= l[(d + 4) & 7];
                      if (c) {
                        var E = c.words,
                          s = E[0],
                          x = E[1],
                          p =
                            (((s << 8) | (s >>> 24)) & 16711935) |
                            (((s << 24) | (s >>> 8)) & 4278255360),
                          b =
                            (((x << 8) | (x >>> 24)) & 16711935) |
                            (((x << 24) | (x >>> 8)) & 4278255360),
                          C = (p >>> 16) | (b & 4294901760),
                          A = (b << 16) | (p & 65535);
                        ((f[0] ^= p),
                          (f[1] ^= C),
                          (f[2] ^= b),
                          (f[3] ^= A),
                          (f[4] ^= p),
                          (f[5] ^= C),
                          (f[6] ^= b),
                          (f[7] ^= A));
                        for (var d = 0; d < 4; d++) B.call(this);
                      }
                    },
                    _doProcessBlock: function (i, c) {
                      var l = this._X;
                      (B.call(this),
                        (g[0] = l[0] ^ (l[5] >>> 16) ^ (l[3] << 16)),
                        (g[1] = l[2] ^ (l[7] >>> 16) ^ (l[5] << 16)),
                        (g[2] = l[4] ^ (l[1] >>> 16) ^ (l[7] << 16)),
                        (g[3] = l[6] ^ (l[3] >>> 16) ^ (l[1] << 16)));
                      for (var f = 0; f < 4; f++)
                        ((g[f] =
                          (((g[f] << 8) | (g[f] >>> 24)) & 16711935) |
                          (((g[f] << 24) | (g[f] >>> 8)) & 4278255360)),
                          (i[c + f] ^= g[f]));
                    },
                    blockSize: 128 / 32,
                    ivSize: 64 / 32,
                  }));
                function B() {
                  for (var i = this._X, c = this._C, l = 0; l < 8; l++) v[l] = c[l];
                  ((c[0] = (c[0] + 1295307597 + this._b) | 0),
                    (c[1] = (c[1] + 3545052371 + (c[0] >>> 0 < v[0] >>> 0 ? 1 : 0)) | 0),
                    (c[2] = (c[2] + 886263092 + (c[1] >>> 0 < v[1] >>> 0 ? 1 : 0)) | 0),
                    (c[3] = (c[3] + 1295307597 + (c[2] >>> 0 < v[2] >>> 0 ? 1 : 0)) | 0),
                    (c[4] = (c[4] + 3545052371 + (c[3] >>> 0 < v[3] >>> 0 ? 1 : 0)) | 0),
                    (c[5] = (c[5] + 886263092 + (c[4] >>> 0 < v[4] >>> 0 ? 1 : 0)) | 0),
                    (c[6] = (c[6] + 1295307597 + (c[5] >>> 0 < v[5] >>> 0 ? 1 : 0)) | 0),
                    (c[7] = (c[7] + 3545052371 + (c[6] >>> 0 < v[6] >>> 0 ? 1 : 0)) | 0),
                    (this._b = c[7] >>> 0 < v[7] >>> 0 ? 1 : 0));
                  for (var l = 0; l < 8; l++) {
                    var f = i[l] + c[l],
                      d = f & 65535,
                      E = f >>> 16,
                      s = ((((d * d) >>> 17) + d * E) >>> 15) + E * E,
                      x = (((f & 4294901760) * f) | 0) + (((f & 65535) * f) | 0);
                    a[l] = s ^ x;
                  }
                  ((i[0] =
                    (a[0] + ((a[7] << 16) | (a[7] >>> 16)) + ((a[6] << 16) | (a[6] >>> 16))) | 0),
                    (i[1] = (a[1] + ((a[0] << 8) | (a[0] >>> 24)) + a[7]) | 0),
                    (i[2] =
                      (a[2] + ((a[1] << 16) | (a[1] >>> 16)) + ((a[0] << 16) | (a[0] >>> 16))) | 0),
                    (i[3] = (a[3] + ((a[2] << 8) | (a[2] >>> 24)) + a[1]) | 0),
                    (i[4] =
                      (a[4] + ((a[3] << 16) | (a[3] >>> 16)) + ((a[2] << 16) | (a[2] >>> 16))) | 0),
                    (i[5] = (a[5] + ((a[4] << 8) | (a[4] >>> 24)) + a[3]) | 0),
                    (i[6] =
                      (a[6] + ((a[5] << 16) | (a[5] >>> 16)) + ((a[4] << 16) | (a[4] >>> 16))) | 0),
                    (i[7] = (a[7] + ((a[6] << 8) | (a[6] >>> 24)) + a[5]) | 0));
                }
                t.RabbitLegacy = h._createHelper(o);
              })(),
              e.RabbitLegacy
            );
          });
        })(Le)),
      Le.exports
    );
  }
  var $e = { exports: {} },
    wt;
  function Ur() {
    return (
      wt ||
        ((wt = 1),
        (function (r, n) {
          (function (e, t, u) {
            r.exports = t(q(), A0(), F0(), B0(), t0());
          })(U, function (e) {
            return (
              (function () {
                var t = e,
                  u = t.lib,
                  h = u.BlockCipher,
                  m = t.algo;
                const g = 16,
                  v = [
                    608135816, 2242054355, 320440878, 57701188, 2752067618, 698298832, 137296536,
                    3964562569, 1160258022, 953160567, 3193202383, 887688300, 3232508343,
                    3380367581, 1065670069, 3041331479, 2450970073, 2306472731,
                  ],
                  a = [
                    [
                      3509652390, 2564797868, 805139163, 3491422135, 3101798381, 1780907670,
                      3128725573, 4046225305, 614570311, 3012652279, 134345442, 2240740374,
                      1667834072, 1901547113, 2757295779, 4103290238, 227898511, 1921955416,
                      1904987480, 2182433518, 2069144605, 3260701109, 2620446009, 720527379,
                      3318853667, 677414384, 3393288472, 3101374703, 2390351024, 1614419982,
                      1822297739, 2954791486, 3608508353, 3174124327, 2024746970, 1432378464,
                      3864339955, 2857741204, 1464375394, 1676153920, 1439316330, 715854006,
                      3033291828, 289532110, 2706671279, 2087905683, 3018724369, 1668267050,
                      732546397, 1947742710, 3462151702, 2609353502, 2950085171, 1814351708,
                      2050118529, 680887927, 999245976, 1800124847, 3300911131, 1713906067,
                      1641548236, 4213287313, 1216130144, 1575780402, 4018429277, 3917837745,
                      3693486850, 3949271944, 596196993, 3549867205, 258830323, 2213823033,
                      772490370, 2760122372, 1774776394, 2652871518, 566650946, 4142492826,
                      1728879713, 2882767088, 1783734482, 3629395816, 2517608232, 2874225571,
                      1861159788, 326777828, 3124490320, 2130389656, 2716951837, 967770486,
                      1724537150, 2185432712, 2364442137, 1164943284, 2105845187, 998989502,
                      3765401048, 2244026483, 1075463327, 1455516326, 1322494562, 910128902,
                      469688178, 1117454909, 936433444, 3490320968, 3675253459, 1240580251,
                      122909385, 2157517691, 634681816, 4142456567, 3825094682, 3061402683,
                      2540495037, 79693498, 3249098678, 1084186820, 1583128258, 426386531,
                      1761308591, 1047286709, 322548459, 995290223, 1845252383, 2603652396,
                      3431023940, 2942221577, 3202600964, 3727903485, 1712269319, 422464435,
                      3234572375, 1170764815, 3523960633, 3117677531, 1434042557, 442511882,
                      3600875718, 1076654713, 1738483198, 4213154764, 2393238008, 3677496056,
                      1014306527, 4251020053, 793779912, 2902807211, 842905082, 4246964064,
                      1395751752, 1040244610, 2656851899, 3396308128, 445077038, 3742853595,
                      3577915638, 679411651, 2892444358, 2354009459, 1767581616, 3150600392,
                      3791627101, 3102740896, 284835224, 4246832056, 1258075500, 768725851,
                      2589189241, 3069724005, 3532540348, 1274779536, 3789419226, 2764799539,
                      1660621633, 3471099624, 4011903706, 913787905, 3497959166, 737222580,
                      2514213453, 2928710040, 3937242737, 1804850592, 3499020752, 2949064160,
                      2386320175, 2390070455, 2415321851, 4061277028, 2290661394, 2416832540,
                      1336762016, 1754252060, 3520065937, 3014181293, 791618072, 3188594551,
                      3933548030, 2332172193, 3852520463, 3043980520, 413987798, 3465142937,
                      3030929376, 4245938359, 2093235073, 3534596313, 375366246, 2157278981,
                      2479649556, 555357303, 3870105701, 2008414854, 3344188149, 4221384143,
                      3956125452, 2067696032, 3594591187, 2921233993, 2428461, 544322398, 577241275,
                      1471733935, 610547355, 4027169054, 1432588573, 1507829418, 2025931657,
                      3646575487, 545086370, 48609733, 2200306550, 1653985193, 298326376,
                      1316178497, 3007786442, 2064951626, 458293330, 2589141269, 3591329599,
                      3164325604, 727753846, 2179363840, 146436021, 1461446943, 4069977195,
                      705550613, 3059967265, 3887724982, 4281599278, 3313849956, 1404054877,
                      2845806497, 146425753, 1854211946,
                    ],
                    [
                      1266315497, 3048417604, 3681880366, 3289982499, 290971e4, 1235738493,
                      2632868024, 2414719590, 3970600049, 1771706367, 1449415276, 3266420449,
                      422970021, 1963543593, 2690192192, 3826793022, 1062508698, 1531092325,
                      1804592342, 2583117782, 2714934279, 4024971509, 1294809318, 4028980673,
                      1289560198, 2221992742, 1669523910, 35572830, 157838143, 1052438473,
                      1016535060, 1802137761, 1753167236, 1386275462, 3080475397, 2857371447,
                      1040679964, 2145300060, 2390574316, 1461121720, 2956646967, 4031777805,
                      4028374788, 33600511, 2920084762, 1018524850, 629373528, 3691585981,
                      3515945977, 2091462646, 2486323059, 586499841, 988145025, 935516892,
                      3367335476, 2599673255, 2839830854, 265290510, 3972581182, 2759138881,
                      3795373465, 1005194799, 847297441, 406762289, 1314163512, 1332590856,
                      1866599683, 4127851711, 750260880, 613907577, 1450815602, 3165620655,
                      3734664991, 3650291728, 3012275730, 3704569646, 1427272223, 778793252,
                      1343938022, 2676280711, 2052605720, 1946737175, 3164576444, 3914038668,
                      3967478842, 3682934266, 1661551462, 3294938066, 4011595847, 840292616,
                      3712170807, 616741398, 312560963, 711312465, 1351876610, 322626781,
                      1910503582, 271666773, 2175563734, 1594956187, 70604529, 3617834859,
                      1007753275, 1495573769, 4069517037, 2549218298, 2663038764, 504708206,
                      2263041392, 3941167025, 2249088522, 1514023603, 1998579484, 1312622330,
                      694541497, 2582060303, 2151582166, 1382467621, 776784248, 2618340202,
                      3323268794, 2497899128, 2784771155, 503983604, 4076293799, 907881277,
                      423175695, 432175456, 1378068232, 4145222326, 3954048622, 3938656102,
                      3820766613, 2793130115, 2977904593, 26017576, 3274890735, 3194772133,
                      1700274565, 1756076034, 4006520079, 3677328699, 720338349, 1533947780,
                      354530856, 688349552, 3973924725, 1637815568, 332179504, 3949051286, 53804574,
                      2852348879, 3044236432, 1282449977, 3583942155, 3416972820, 4006381244,
                      1617046695, 2628476075, 3002303598, 1686838959, 431878346, 2686675385,
                      1700445008, 1080580658, 1009431731, 832498133, 3223435511, 2605976345,
                      2271191193, 2516031870, 1648197032, 4164389018, 2548247927, 300782431,
                      375919233, 238389289, 3353747414, 2531188641, 2019080857, 1475708069,
                      455242339, 2609103871, 448939670, 3451063019, 1395535956, 2413381860,
                      1841049896, 1491858159, 885456874, 4264095073, 4001119347, 1565136089,
                      3898914787, 1108368660, 540939232, 1173283510, 2745871338, 3681308437,
                      4207628240, 3343053890, 4016749493, 1699691293, 1103962373, 3625875870,
                      2256883143, 3830138730, 1031889488, 3479347698, 1535977030, 4236805024,
                      3251091107, 2132092099, 1774941330, 1199868427, 1452454533, 157007616,
                      2904115357, 342012276, 595725824, 1480756522, 206960106, 497939518, 591360097,
                      863170706, 2375253569, 3596610801, 1814182875, 2094937945, 3421402208,
                      1082520231, 3463918190, 2785509508, 435703966, 3908032597, 1641649973,
                      2842273706, 3305899714, 1510255612, 2148256476, 2655287854, 3276092548,
                      4258621189, 236887753, 3681803219, 274041037, 1734335097, 3815195456,
                      3317970021, 1899903192, 1026095262, 4050517792, 356393447, 2410691914,
                      3873677099, 3682840055,
                    ],
                    [
                      3913112168, 2491498743, 4132185628, 2489919796, 1091903735, 1979897079,
                      3170134830, 3567386728, 3557303409, 857797738, 1136121015, 1342202287,
                      507115054, 2535736646, 337727348, 3213592640, 1301675037, 2528481711,
                      1895095763, 1721773893, 3216771564, 62756741, 2142006736, 835421444,
                      2531993523, 1442658625, 3659876326, 2882144922, 676362277, 1392781812,
                      170690266, 3921047035, 1759253602, 3611846912, 1745797284, 664899054,
                      1329594018, 3901205900, 3045908486, 2062866102, 2865634940, 3543621612,
                      3464012697, 1080764994, 553557557, 3656615353, 3996768171, 991055499,
                      499776247, 1265440854, 648242737, 3940784050, 980351604, 3713745714,
                      1749149687, 3396870395, 4211799374, 3640570775, 1161844396, 3125318951,
                      1431517754, 545492359, 4268468663, 3499529547, 1437099964, 2702547544,
                      3433638243, 2581715763, 2787789398, 1060185593, 1593081372, 2418618748,
                      4260947970, 69676912, 2159744348, 86519011, 2512459080, 3838209314,
                      1220612927, 3339683548, 133810670, 1090789135, 1078426020, 1569222167,
                      845107691, 3583754449, 4072456591, 1091646820, 628848692, 1613405280,
                      3757631651, 526609435, 236106946, 48312990, 2942717905, 3402727701,
                      1797494240, 859738849, 992217954, 4005476642, 2243076622, 3870952857,
                      3732016268, 765654824, 3490871365, 2511836413, 1685915746, 3888969200,
                      1414112111, 2273134842, 3281911079, 4080962846, 172450625, 2569994100,
                      980381355, 4109958455, 2819808352, 2716589560, 2568741196, 3681446669,
                      3329971472, 1835478071, 660984891, 3704678404, 4045999559, 3422617507,
                      3040415634, 1762651403, 1719377915, 3470491036, 2693910283, 3642056355,
                      3138596744, 1364962596, 2073328063, 1983633131, 926494387, 3423689081,
                      2150032023, 4096667949, 1749200295, 3328846651, 309677260, 2016342300,
                      1779581495, 3079819751, 111262694, 1274766160, 443224088, 298511866,
                      1025883608, 3806446537, 1145181785, 168956806, 3641502830, 3584813610,
                      1689216846, 3666258015, 3200248200, 1692713982, 2646376535, 4042768518,
                      1618508792, 1610833997, 3523052358, 4130873264, 2001055236, 3610705100,
                      2202168115, 4028541809, 2961195399, 1006657119, 2006996926, 3186142756,
                      1430667929, 3210227297, 1314452623, 4074634658, 4101304120, 2273951170,
                      1399257539, 3367210612, 3027628629, 1190975929, 2062231137, 2333990788,
                      2221543033, 2438960610, 1181637006, 548689776, 2362791313, 3372408396,
                      3104550113, 3145860560, 296247880, 1970579870, 3078560182, 3769228297,
                      1714227617, 3291629107, 3898220290, 166772364, 1251581989, 493813264,
                      448347421, 195405023, 2709975567, 677966185, 3703036547, 1463355134,
                      2715995803, 1338867538, 1343315457, 2802222074, 2684532164, 233230375,
                      2599980071, 2000651841, 3277868038, 1638401717, 4028070440, 3237316320,
                      6314154, 819756386, 300326615, 590932579, 1405279636, 3267499572, 3150704214,
                      2428286686, 3959192993, 3461946742, 1862657033, 1266418056, 963775037,
                      2089974820, 2263052895, 1917689273, 448879540, 3550394620, 3981727096,
                      150775221, 3627908307, 1303187396, 508620638, 2975983352, 2726630617,
                      1817252668, 1876281319, 1457606340, 908771278, 3720792119, 3617206836,
                      2455994898, 1729034894, 1080033504,
                    ],
                    [
                      976866871, 3556439503, 2881648439, 1522871579, 1555064734, 1336096578,
                      3548522304, 2579274686, 3574697629, 3205460757, 3593280638, 3338716283,
                      3079412587, 564236357, 2993598910, 1781952180, 1464380207, 3163844217,
                      3332601554, 1699332808, 1393555694, 1183702653, 3581086237, 1288719814,
                      691649499, 2847557200, 2895455976, 3193889540, 2717570544, 1781354906,
                      1676643554, 2592534050, 3230253752, 1126444790, 2770207658, 2633158820,
                      2210423226, 2615765581, 2414155088, 3127139286, 673620729, 2805611233,
                      1269405062, 4015350505, 3341807571, 4149409754, 1057255273, 2012875353,
                      2162469141, 2276492801, 2601117357, 993977747, 3918593370, 2654263191,
                      753973209, 36408145, 2530585658, 25011837, 3520020182, 2088578344, 530523599,
                      2918365339, 1524020338, 1518925132, 3760827505, 3759777254, 1202760957,
                      3985898139, 3906192525, 674977740, 4174734889, 2031300136, 2019492241,
                      3983892565, 4153806404, 3822280332, 352677332, 2297720250, 60907813, 90501309,
                      3286998549, 1016092578, 2535922412, 2839152426, 457141659, 509813237,
                      4120667899, 652014361, 1966332200, 2975202805, 55981186, 2327461051,
                      676427537, 3255491064, 2882294119, 3433927263, 1307055953, 942726286,
                      933058658, 2468411793, 3933900994, 4215176142, 1361170020, 2001714738,
                      2830558078, 3274259782, 1222529897, 1679025792, 2729314320, 3714953764,
                      1770335741, 151462246, 3013232138, 1682292957, 1483529935, 471910574,
                      1539241949, 458788160, 3436315007, 1807016891, 3718408830, 978976581,
                      1043663428, 3165965781, 1927990952, 4200891579, 2372276910, 3208408903,
                      3533431907, 1412390302, 2931980059, 4132332400, 1947078029, 3881505623,
                      4168226417, 2941484381, 1077988104, 1320477388, 886195818, 18198404,
                      3786409e3, 2509781533, 112762804, 3463356488, 1866414978, 891333506, 18488651,
                      661792760, 1628790961, 3885187036, 3141171499, 876946877, 2693282273,
                      1372485963, 791857591, 2686433993, 3759982718, 3167212022, 3472953795,
                      2716379847, 445679433, 3561995674, 3504004811, 3574258232, 54117162,
                      3331405415, 2381918588, 3769707343, 4154350007, 1140177722, 4074052095,
                      668550556, 3214352940, 367459370, 261225585, 2610173221, 4209349473,
                      3468074219, 3265815641, 314222801, 3066103646, 3808782860, 282218597,
                      3406013506, 3773591054, 379116347, 1285071038, 846784868, 2669647154,
                      3771962079, 3550491691, 2305946142, 453669953, 1268987020, 3317592352,
                      3279303384, 3744833421, 2610507566, 3859509063, 266596637, 3847019092,
                      517658769, 3462560207, 3443424879, 370717030, 4247526661, 2224018117,
                      4143653529, 4112773975, 2788324899, 2477274417, 1456262402, 2901442914,
                      1517677493, 1846949527, 2295493580, 3734397586, 2176403920, 1280348187,
                      1908823572, 3871786941, 846861322, 1172426758, 3287448474, 3383383037,
                      1655181056, 3139813346, 901632758, 1897031941, 2986607138, 3066810236,
                      3447102507, 1393639104, 373351379, 950779232, 625454576, 3124240540,
                      4148612726, 2007998917, 544563296, 2244738638, 2330496472, 2058025392,
                      1291430526, 424198748, 50039436, 29584100, 3605783033, 2429876329, 2791104160,
                      1057563949, 3255363231, 3075367218, 3463963227, 1469046755, 985887462,
                    ],
                  ];
                var o = { pbox: [], sbox: [] };
                function B(d, E) {
                  let s = (E >> 24) & 255,
                    x = (E >> 16) & 255,
                    p = (E >> 8) & 255,
                    b = E & 255,
                    C = d.sbox[0][s] + d.sbox[1][x];
                  return ((C = C ^ d.sbox[2][p]), (C = C + d.sbox[3][b]), C);
                }
                function i(d, E, s) {
                  let x = E,
                    p = s,
                    b;
                  for (let C = 0; C < g; ++C)
                    ((x = x ^ d.pbox[C]), (p = B(d, x) ^ p), (b = x), (x = p), (p = b));
                  return (
                    (b = x),
                    (x = p),
                    (p = b),
                    (p = p ^ d.pbox[g]),
                    (x = x ^ d.pbox[g + 1]),
                    { left: x, right: p }
                  );
                }
                function c(d, E, s) {
                  let x = E,
                    p = s,
                    b;
                  for (let C = g + 1; C > 1; --C)
                    ((x = x ^ d.pbox[C]), (p = B(d, x) ^ p), (b = x), (x = p), (p = b));
                  return (
                    (b = x),
                    (x = p),
                    (p = b),
                    (p = p ^ d.pbox[1]),
                    (x = x ^ d.pbox[0]),
                    { left: x, right: p }
                  );
                }
                function l(d, E, s) {
                  for (let A = 0; A < 4; A++) {
                    d.sbox[A] = [];
                    for (let D = 0; D < 256; D++) d.sbox[A][D] = a[A][D];
                  }
                  let x = 0;
                  for (let A = 0; A < g + 2; A++)
                    ((d.pbox[A] = v[A] ^ E[x]), x++, x >= s && (x = 0));
                  let p = 0,
                    b = 0,
                    C = 0;
                  for (let A = 0; A < g + 2; A += 2)
                    ((C = i(d, p, b)),
                      (p = C.left),
                      (b = C.right),
                      (d.pbox[A] = p),
                      (d.pbox[A + 1] = b));
                  for (let A = 0; A < 4; A++)
                    for (let D = 0; D < 256; D += 2)
                      ((C = i(d, p, b)),
                        (p = C.left),
                        (b = C.right),
                        (d.sbox[A][D] = p),
                        (d.sbox[A][D + 1] = b));
                  return !0;
                }
                var f = (m.Blowfish = h.extend({
                  _doReset: function () {
                    if (this._keyPriorReset !== this._key) {
                      var d = (this._keyPriorReset = this._key),
                        E = d.words,
                        s = d.sigBytes / 4;
                      l(o, E, s);
                    }
                  },
                  encryptBlock: function (d, E) {
                    var s = i(o, d[E], d[E + 1]);
                    ((d[E] = s.left), (d[E + 1] = s.right));
                  },
                  decryptBlock: function (d, E) {
                    var s = c(o, d[E], d[E + 1]);
                    ((d[E] = s.left), (d[E + 1] = s.right));
                  },
                  blockSize: 64 / 32,
                  keySize: 128 / 32,
                  ivSize: 64 / 32,
                }));
                t.Blowfish = h._createHelper(f);
              })(),
              e.Blowfish
            );
          });
        })($e)),
      $e.exports
    );
  }
  (function (r, n) {
    (function (e, t, u) {
      r.exports = t(
        q(),
        K0(),
        vr(),
        gr(),
        A0(),
        Br(),
        F0(),
        Je(),
        ce(),
        Er(),
        at(),
        yr(),
        br(),
        Cr(),
        ve(),
        mr(),
        B0(),
        t0(),
        Ar(),
        Fr(),
        Dr(),
        wr(),
        _r(),
        kr(),
        zr(),
        Sr(),
        Pr(),
        Hr(),
        Rr(),
        Lr(),
        $r(),
        Wr(),
        Tr(),
        Mr(),
        Ur(),
      );
    })(U, function (e) {
      return e;
    });
  })(qe);
  var E0 = qe.exports;
  const _t = { aes_key: "c4n0lFdTM39TTYjH", aes_iv: "sn7TwyGuU7kJWEAp" },
    kt = _t.aes_key,
    zt = _t.aes_iv;
  function X0(r) {
    var n = E0.AES.encrypt(r, E0.enc.Utf8.parse(kt), { iv: E0.enc.Utf8.parse(zt) });
    return E0.enc.Base64.stringify(n.ciphertext);
  }
  function Ir(r) {
    var n = E0.AES.decrypt(r, E0.enc.Utf8.parse(kt), { iv: E0.enc.Utf8.parse(zt) });
    return n.toString(E0.enc.Utf8);
  }
  const T = "https://api.zhanfubrowser.com/api/v1",
    Nr = "/bindMall/savePasskey",
    Or = "/bindMall/listPasskey",
    M = function (r) {
      if (r.errorCode !== 0)
        return (
          r.errorCode === 400997 && console.error("授权已过期"),
          Promise.reject(new Error(r.message || r.msg || "Error"))
        );
      if (r.format === 1) {
        const e = r.data,
          t = Ir(e),
          u = JSON.parse(t);
        r.data = u;
      }
      return r;
    },
    W = async (r) => {
      const n = { "Content-Type": "application/json" },
        e = await fr(),
        t = await lr(),
        u = await dr();
      return (
        e && (n.Authorization = "Bearer " + e),
        t && (n.browserVersion = t),
        u && (n["X-Language"] = u),
        n
      );
    },
    w0 = {
      async getUserInfo(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/user/getUserInfo?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getUserInfo error", e);
        }
      },
      async getUserWebPageList(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/webpage/getBindWebpageRuleV2?${new URLSearchParams(r)}`, {
              headers: n,
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getUserWebPageList error", e);
        }
      },
      async getInfoByKey(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/sundry/getInfoByKey?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getInfoByKey error", e);
        }
      },
      async getInfoByKeys(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/sundry/getInfoByKeys?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getInfoByKeys error", e);
        }
      },
      async uploadStatistics(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/statistics/click?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("uploadStatistics error", e);
        }
      },
      async getTagPages(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/getTagPages?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getTagPages error", e);
        }
      },
      async getStaticByIp(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/mall/bindMall/getAcceleratedDomain?${new URLSearchParams(r)}`, {
              headers: n,
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getStaticByIp error", e);
        }
      },
      async getCurrency(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/common/currency?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getCurrency error", e);
        }
      },
      async getTime(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/common/time?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getTime error", e);
        }
      },
      async getAdsRecommendBySite(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/safe/actionLog/GetAdsRecommendBySite?${new URLSearchParams(r)}`, {
              headers: n,
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getAdsRecommendBySite error", e);
        }
      },
      async getMallInfo(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/mall/bindMall/getMall?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getMallInfo error", e);
        }
      },
      async saveMallJumpMethod(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/updateJumpMethod`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("saveMallJumpMethod error", e);
        }
      },
      async saveMallJumpUrls(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/updateJumpUrls`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("saveMallJumpUrls error", e);
        }
      },
      async getWebsiteList(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/ads/website/getWebsiteList?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getWebsiteList error", e);
        }
      },
      async addTagPages(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/addTagPages`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("addTagPages error", e);
        }
      },
      async getFirewall(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/mall/bindMall/getFirewall?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getFirewall error", e);
        }
      },
      async getFirewallNew(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/mall/bindMall/getFirewallV2?${new URLSearchParams(r)}`, {
              headers: n,
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getFirewallNew error", e);
        }
      },
      async getWhiteList(r) {
        const n = await W();
        try {
          return await (
            await fetch("https://cyt-browser-oss.zhanfubrowser.com/whiteList_data.json", {
              headers: n,
            })
          ).json();
        } catch (e) {
          console.log("getWhiteList error", e);
        }
      },
      async getDirectList(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/mall/bindMall/blackList?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getDirectList error", e);
        }
      },
      async getPluginInfo(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/ads/plugin/getMallPluginInfo?${new URLSearchParams(r)}`, {
              headers: n,
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getPluginInfo error", e);
        }
      },
      async getPluginInfoByChromeId(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/ads/plugin/getPluginInfo?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getPluginInfoByChromeId error", e);
        }
      },
      async getPluginList(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/ads/plugins/getMallList?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getPluginList error", e);
        }
      },
      async getBookmark(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bookmark/showBookmark?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getBookmark error", e);
        }
      },
      async inBlackList(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/mall/bindMall/inBlackList?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("inBlackList error", e);
        }
      },
      async getAuditStatus(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/epcheck/getAuditStatus?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getAuditStatus error", e);
        }
      },
      async getAuthenticationCode(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/getAuthenticationCode?${new URLSearchParams(r)}`, {
              headers: n,
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getAuthenticationCode error", e);
        }
      },
      async setAuthenticationCode(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/setAuthenticationCode`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("setAuthenticationCode error", e);
        }
      },
      async refreshToken(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/user/refreshToken?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("refreshToken error", e);
        }
      },
      async saveBookmark(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bookmark/saveBookmark`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("saveBookmark error", e);
        }
      },
      async applyWhite(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/white/apply`, { method: "POST", headers: n, body: JSON.stringify(r) })
          ).json();
          return M(t);
        } catch (e) {
          console.log("applyWhite error", e);
        }
      },
      async applyWhiteV2(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/white/applyV2`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("applyWhiteV2 error", e);
        }
      },
      async setCookie(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/setCookie`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("setCookie error", e);
        }
      },
      async reviewReason(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/white/reviewReason`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("reviewReason error", e);
        }
      },
      async reviewReasonV2(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/white/reviewReasonV2`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("reviewReasonV2 error", e);
        }
      },
      async decryptData(r) {
        console.log("decryptData", r);
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/common/decryptData`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("decryptData error", e);
        }
      },
      async reportVerification(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/reportVerification`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("reportVerification error", e);
        }
      },
      async reportCheckForcedOffline(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/checkForcedOffline`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("reportCheckForcedOffline error", e);
        }
      },
      async setAccessStatus(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/bindMall/setAccessStatus`, {
              method: "POST",
              headers: n,
              body: JSON.stringify(r),
            })
          ).json();
          return M(t);
        } catch (e) {
          console.log("setAccessStatus error", e);
        }
      },
      async getWebpageList(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}/webpage/list?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("getWebpageList error", e);
        }
      },
      async getWebpageGroupList() {
        const r = await W();
        try {
          const e = await (
            await fetch(`${T}/webpage/groupList?group_name=`, { headers: r })
          ).json();
          return M(e);
        } catch (n) {
          console.log("getWebpageGroupList error", n);
        }
      },
      async saveWebpage(r) {
        const n = await W();
        n.encryption = 1;
        try {
          const e = JSON.stringify(r || {}),
            t = X0(e),
            h = await (
              await fetch(`${T}/webpage/save`, {
                method: "POST",
                headers: n,
                body: JSON.stringify({ data: t }),
              })
            ).json();
          return M(h);
        } catch (e) {
          console.log("reportVerification error", e);
        }
      },
      async batchSaveUrl(r) {
        const n = await W();
        n.encryption = 1;
        try {
          const e = JSON.stringify(r || {}),
            t = X0(e),
            h = await (
              await fetch(`${T}/domainUrl/batchSave`, {
                method: "POST",
                headers: n,
                body: JSON.stringify({ data: t }),
              })
            ).json();
          return M(h);
        } catch (e) {
          console.log("batchSaveUrl error", e);
        }
      },
      async savePasskey(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}${Nr}`, { method: "POST", headers: n, body: JSON.stringify(r) })
          ).json();
          return M(t);
        } catch (e) {
          console.log("savePasskey error", e);
        }
      },
      async listPasskey(r) {
        const n = await W();
        try {
          const t = await (
            await fetch(`${T}${Or}?${new URLSearchParams(r)}`, { headers: n })
          ).json();
          return M(t);
        } catch (e) {
          console.log("listPasskey error", e);
        }
      },
      async transferSpeed(r) {
        const n = await W();
        n.encryption = 1;
        try {
          const e = JSON.stringify(r || {}),
            t = X0(e),
            h = await (
              await fetch(`${T}/mall/bindMall/transferSpeed`, {
                method: "POST",
                headers: n,
                body: JSON.stringify({ data: t }),
              })
            ).json();
          return M(h);
        } catch (e) {
          console.log("transferSpeed error", e);
        }
      },
      async updateMainTransfer(r) {
        const n = await W();
        n.encryption = 1;
        try {
          const e = JSON.stringify(r || {}),
            t = X0(e),
            h = await (
              await fetch(`${T}/mall/bindMall/updateMainTransfer`, {
                method: "POST",
                headers: n,
                body: JSON.stringify({ data: t }),
              })
            ).json();
          return M(h);
        } catch (e) {
          console.log("batchSaveUrl error", e);
        }
      },
    },
    We = "zf_mall_collection_v1",
    qr = "data-zf-collection-host",
    jr = 420,
    Kr = 360,
    f0 = 260,
    e0 = 180,
    Xr = 32;
  let N = null,
    h0 = null,
    K = null,
    _0 = !1,
    R = {
      rows: [],
      smartMode: !1,
      panelEdge: "right",
      panelFloat: null,
      panelDockWidth: jr,
      panelDockHeight: Kr,
      picking: !1,
    },
    P0 = null,
    H0 = null,
    R0 = null,
    L0 = null,
    $0 = null,
    r0 = null,
    j = null,
    y0 = [];
  function Gr(r) {
    h0 && h0.style.setProperty("display", "none", "important");
  }
  function Vr() {
    w0.getWebpageGroupList()
      .then((r) => {
        if ((r == null ? void 0 : r.errorCode) !== 0) {
          y0 = [];
          return;
        }
        y0 = (r == null ? void 0 : r.data) ?? [];
      })
      .catch(() => {
        y0 = [];
      });
  }
  function Yr(r) {
    if (!r || !Array.isArray(r.element)) return [];
    const n = String(r.web_url ?? location.href),
      e = String(r.web_name ?? (document.title || location.hostname)),
      t = r.id != null ? String(r.id) : "0";
    return r.element.map((u, h) => {
      const m = String((u == null ? void 0 : u.elementInfo) ?? ""),
        g = String((u == null ? void 0 : u.elementName) ?? "未命名"),
        v = m.length > 80 ? `${m.slice(0, 77)}...` : m;
      return {
        id: `zf-srv-${t}-${h}`,
        pageUrl: n,
        pageTitle: e,
        featureName: g,
        selector: m,
        tagPreview: v,
        createdAt: 0,
      };
    });
  }
  function St() {
    j && ((R.rows = Yr(j)), v0());
  }
  function W0() {
    const r = location.origin.replace(/\/+$/, "");
    w0.getWebpageList({ page: 1, pageSize: 10, search: r })
      .then((n) => {
        var t;
        if ((n == null ? void 0 : n.errorCode) !== 0) {
          j = null;
          return;
        }
        const e = (t = n.data) == null ? void 0 : t.list;
        Array.isArray(e) && e.length > 0 ? ((j = e[0]), St(), K && s0()) : (j = null);
      })
      .catch(() => {
        j = null;
      });
  }
  function Zr(r) {
    try {
      chrome.storage.local.get([We], (n) => {
        const e = n[We];
        if (e && typeof e == "object" && !Array.isArray(e)) {
          const t = e;
          (Array.isArray(t.rows) && (R.rows = t.rows),
            typeof t.smartMode == "boolean" && (R.smartMode = t.smartMode));
          const u = ["left", "right", "top", "bottom"];
          (typeof t.panelEdge == "string" && u.includes(t.panelEdge)
            ? (R.panelEdge = t.panelEdge)
            : typeof t.dockRight == "boolean" && (R.panelEdge = t.dockRight ? "right" : "left"),
            t.panelFloat &&
              typeof t.panelFloat == "object" &&
              typeof t.panelFloat.left == "number" &&
              typeof t.panelFloat.top == "number" &&
              typeof t.panelFloat.width == "number" &&
              typeof t.panelFloat.height == "number" &&
              (R.panelFloat = t.panelFloat),
            typeof t.panelDockWidth == "number" &&
              t.panelDockWidth >= f0 &&
              (R.panelDockWidth = t.panelDockWidth),
            typeof t.panelDockHeight == "number" &&
              t.panelDockHeight >= e0 &&
              (R.panelDockHeight = t.panelDockHeight));
        } else if (typeof e == "string")
          try {
            const t = JSON.parse(e);
            (Array.isArray(t.rows) && (R.rows = t.rows),
              typeof t.smartMode == "boolean" && (R.smartMode = t.smartMode));
            const u = ["left", "right", "top", "bottom"];
            (typeof t.panelEdge == "string" && u.includes(t.panelEdge)
              ? (R.panelEdge = t.panelEdge)
              : typeof t.dockRight == "boolean" && (R.panelEdge = t.dockRight ? "right" : "left"),
              t.panelFloat &&
                typeof t.panelFloat == "object" &&
                typeof t.panelFloat.left == "number" &&
                (R.panelFloat = t.panelFloat),
              typeof t.panelDockWidth == "number" &&
                t.panelDockWidth >= f0 &&
                (R.panelDockWidth = t.panelDockWidth),
              typeof t.panelDockHeight == "number" &&
                t.panelDockHeight >= e0 &&
                (R.panelDockHeight = t.panelDockHeight));
          } catch {}
        r();
      });
    } catch {
      r();
    }
  }
  function v0() {
    try {
      chrome.storage.local.set({
        [We]: {
          rows: R.rows,
          smartMode: R.smartMode,
          panelEdge: R.panelEdge,
          panelFloat: R.panelFloat,
          panelDockWidth: R.panelDockWidth,
          panelDockHeight: R.panelDockHeight,
        },
      });
    } catch {}
  }
  function Qr() {
    return new Set(R.rows.map((n) => n.pageUrl)).size;
  }
  function Pt(r) {
    return typeof CSS < "u" && CSS.escape ? CSS.escape(r) : r.replace(/([^a-zA-Z0-9_-])/g, "\\$1");
  }
  function Jr(r) {
    if (r.id) return `#${Pt(r.id)}`;
    const n = [];
    let e = r,
      t = 0;
    const u = 12;
    for (; e && e.nodeType === Node.ELEMENT_NODE && t < u;) {
      const h = e.tagName.toLowerCase();
      if (e.id) {
        n.unshift(`#${Pt(e.id)}`);
        break;
      }
      const m = e.parentElement;
      if (m) {
        const v = [...m.children].filter((a) => a.tagName === e.tagName).indexOf(e) + 1;
        n.unshift(`${h}:nth-of-type(${v})`);
      } else n.unshift(h);
      ((e = m), t++);
    }
    return n.join(" > ");
  }
  function ea(r) {
    if (!r || !N) return !1;
    const n = r.getRootNode();
    return n instanceof ShadowRoot && n.host === N ? !0 : N.contains(r);
  }
  function Ht(r, n) {
    const e = document.elementsFromPoint(r, n);
    for (const t of e)
      if (
        t instanceof Element &&
        !ea(t) &&
        !(t === document.documentElement || t === document.body)
      )
        return t;
    return null;
  }
  function ta() {
    var r;
    return typeof window < "u" &&
      (r = window.matchMedia) != null &&
      r.call(window, "(prefers-reduced-motion: reduce)").matches
      ? ""
      : "left 0.14s cubic-bezier(0.33, 1, 0.68, 1), top 0.14s cubic-bezier(0.33, 1, 0.68, 1), width 0.14s cubic-bezier(0.33, 1, 0.68, 1), height 0.14s cubic-bezier(0.33, 1, 0.68, 1)";
  }
  function ra() {
    if (P0) return P0;
    const r = document.createElement("div"),
      n = ta();
    return (
      (r.style.cssText = [
        "position:fixed",
        "pointer-events:none",
        "z-index:100000",
        "border:2px solid #1677ff",
        "border-radius:4px",
        "background:rgba(22,119,255,0.08)",
        "box-sizing:border-box",
        "display:none",
        n ? `transition:${n}` : "",
      ]
        .filter(Boolean)
        .join(";")),
      document.documentElement.appendChild(r),
      (P0 = r),
      r
    );
  }
  function Rt() {
    P0 && (P0.style.display = "none");
  }
  function aa(r) {
    const n = ra();
    if (!r || !r.getBoundingClientRect) {
      n.style.display = "none";
      return;
    }
    const e = r.getBoundingClientRect();
    ((n.style.display = "block"),
      (n.style.left = `${e.left}px`),
      (n.style.top = `${e.top}px`),
      (n.style.width = `${e.width}px`),
      (n.style.height = `${e.height}px`));
  }
  function Lt() {
    (H0 && (document.removeEventListener("mousemove", H0, !0), (H0 = null)),
      R0 && (document.removeEventListener("mousedown", R0, !0), (R0 = null)),
      L0 && (document.removeEventListener("click", L0, !0), (L0 = null)),
      $0 && (document.removeEventListener("keydown", $0, !0), ($0 = null)));
  }
  function $t() {
    ((R.picking = !1),
      Rt(),
      Lt(),
      N && ((N.style.pointerEvents = ""), (N.style.opacity = "")),
      s0());
  }
  function Wt() {
    R.picking ||
      ((R.picking = !0),
      N && ((N.style.pointerEvents = "none"), (N.style.opacity = "0.35")),
      (H0 = (r) => {
        if (!R.picking) return;
        const n = Ht(r.clientX, r.clientY);
        aa(n);
      }),
      (L0 = (r) => {
        if (!R.picking) return;
        (r.preventDefault(), r.stopPropagation(), r.stopImmediatePropagation());
        const n = Ht(r.clientX, r.clientY);
        if (!n) {
          $t();
          return;
        }
        const e = Jr(n),
          t = (n.textContent || "").trim().slice(0, 80) || n.tagName.toLowerCase();
        ((R.picking = !1),
          Rt(),
          Lt(),
          N && ((N.style.pointerEvents = "auto"), (N.style.opacity = "1")),
          (r0 = { selector: e, tagPreview: t }),
          xa(t.slice(0, 24) || "未命名"),
          s0());
      }),
      ($0 = (r) => {
        r.key === "Escape" && $t();
      }),
      (R0 = (r) => {
        R.picking && (r.preventDefault(), r.stopPropagation());
      }),
      document.addEventListener("mousedown", R0, !0),
      document.addEventListener("mousemove", H0, !0),
      document.addEventListener("click", L0, !0),
      document.addEventListener("keydown", $0, !0),
      s0());
  }
  function na(r) {
    try {
      const n = new URL(r),
        e = new URL(location.href);
      if (
        n.origin === e.origin &&
        n.pathname === e.pathname &&
        n.search === e.search &&
        n.hash === e.hash
      )
        return document.title || n.hostname;
      const t = n.pathname === "/" ? "" : n.pathname;
      return `${n.hostname}${t}` || r;
    } catch {
      return document.title || location.hostname;
    }
  }
  function Tt(r) {
    return r.replace(/\/+$/, "").toLowerCase();
  }
  function oa(r) {
    if (r == null) return !1;
    const n = String(r).trim();
    if (!n) return !1;
    try {
      const e = /^[a-z][a-z0-9+.-]*:\/\//i.test(n) ? n : `https://${n}`,
        t = new URL(e);
      if (Tt(t.origin) !== Tt(location.origin)) return !1;
      const u = t.pathname.replace(/\/+$/, "") || "/",
        h = location.pathname.replace(/\/+$/, "") || "/";
      return u === "/" ? !1 : u === h;
    } catch {
      return !1;
    }
  }
  function ia() {
    if (!K) return;
    if (j && oa(j.web_url)) {
      (console.log("网页管理数据已包含该网址", j.web_url),
        a0("网页管理数据已包含该网址", "warning"));
      return;
    }
    const r = K.getElementById("zf-collect-page-modal"),
      n = K.getElementById("zf-collect-page-url");
    !r ||
      !n ||
      ((n.value = `${location.origin}${location.pathname}`),
      r.classList.add("is-open"),
      r.setAttribute("aria-hidden", "false"),
      requestAnimationFrame(() => {
        (n.focus(), n.select());
      }));
  }
  function G0() {
    if (!K) return;
    const r = K.getElementById("zf-collect-page-modal");
    (r == null || r.classList.remove("is-open"),
      r == null || r.setAttribute("aria-hidden", "true"));
  }
  function sa() {
    if (!K) return;
    const r = K.getElementById("zf-collect-page-url"),
      n = (r == null ? void 0 : r.value.trim()) ?? "";
    if (!n) {
      window.alert("请输入网页地址");
      return;
    }
    let e = n,
      t = "";
    try {
      const h = new URL(n),
        m = h.pathname.replace(/\/+$/, "") || "/";
      ((t = `${h.origin}${m === "/" ? "/" : m}`), (e = t));
    } catch {
      window.alert("请输入合法的网页地址（需包含 http:// 或 https://）");
      return;
    }
    if (!Array.isArray(y0) || y0.length === 0) {
      a0("请先在 SuperPower 创建网页分组", "error");
      return;
    }
    const u = {
      id: 0,
      web_name: document.title.slice(0, 50),
      remark: "",
      group_id: y0[0].id,
      element: [],
      web_url: t,
    };
    w0.saveWebpage(u)
      .then((h) => {
        if ((h == null ? void 0 : h.errorCode) === 0) {
          (G0(), a0("保存成功", "success"), W0());
          const m = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
            pageUrl: e,
            pageTitle: na(e),
            featureName: "整页",
            selector: "",
            tagPreview: (() => {
              try {
                return new URL(e).pathname || "/";
              } catch {
                return "/";
              }
            })(),
            createdAt: Date.now(),
          };
          (R.rows.push(m), v0(), s0());
        } else a0("保存失败", "error");
      })
      .catch(() => {
        a0("保存失败", "error");
      });
  }
  function xa(r) {
    if (!K) return;
    const n = K.getElementById("zf-feature-name-modal"),
      e = K.getElementById("zf-feature-name-input");
    !n ||
      !e ||
      ((e.value = r),
      n.classList.add("is-open"),
      n.setAttribute("aria-hidden", "false"),
      requestAnimationFrame(() => {
        (e.focus(), e.select());
      }));
  }
  function Mt() {
    var r, n;
    K &&
      ((r = K.getElementById("zf-feature-name-modal")) == null || r.classList.remove("is-open"),
      (n = K.getElementById("zf-feature-name-modal")) == null ||
        n.setAttribute("aria-hidden", "true"));
  }
  function ca() {
    ((r0 = null), Mt());
  }
  function Te() {
    (ca(), s0());
  }
  let T0 = null;
  function a0(r, n = "success") {
    var o;
    ((o = document.getElementById("zf-collection-toast")) == null || o.remove(),
      T0 && (clearTimeout(T0), (T0 = null)));
    let e, t, u, h, m;
    n === "success"
      ? ((e = "#f0f9eb"), (t = "#67c23a"), (u = "#e1f3d8"), (h = "#67c23a"), (m = "✓"))
      : n === "warning"
        ? ((e = "#fdf6ec"), (t = "#e6a23c"), (u = "#faecd8"), (h = "#e6a23c"), (m = "!"))
        : ((e = "#fef0f0"), (t = "#f56c6c"), (u = "#fde2e2"), (h = "#f56c6c"), (m = "×"));
    const g = document.createElement("div");
    ((g.id = "zf-collection-toast"),
      g.setAttribute("role", "status"),
      g.setAttribute("aria-live", "polite"),
      (g.style.cssText = [
        "position:fixed",
        "top:24px",
        "left:50%",
        "transform:translateX(-50%)",
        "display:flex",
        "align-items:center",
        "gap:10px",
        "padding:11px 18px",
        "border-radius:6px",
        "box-shadow:0 4px 12px rgba(0,0,0,0.12)",
        "font-size:14px",
        "line-height:1.5",
        'font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
        "pointer-events:none",
        `background:${e};color:${t};border:1px solid ${u}`,
        "z-index:1000000",
      ].join(";")));
    const v = document.createElement("span");
    (v.setAttribute("aria-hidden", "true"),
      (v.style.cssText = [
        "flex-shrink:0",
        "width:20px",
        "height:20px",
        "border-radius:50%",
        "display:flex",
        "align-items:center",
        "justify-content:center",
        "font-size:12px",
        "line-height:1",
        `background:${h};color:#fff`,
      ].join(";")),
      (v.textContent = m));
    const a = document.createElement("span");
    ((a.textContent = r),
      g.appendChild(v),
      g.appendChild(a),
      document.documentElement.appendChild(g),
      (T0 = setTimeout(() => {
        (g.remove(), (T0 = null));
      }, 2800)));
  }
  function la() {
    console.log("pendingFeaturePick", r0);
    const r = K == null ? void 0 : K.getElementById("zf-feature-name-input"),
      n = (r == null ? void 0 : r.value.trim()) || "未命名";
    if (j) {
      Array.isArray(j.element) || (j.element = []);
      const e = (r0 == null ? void 0 : r0.selector) ?? "";
      if (j.element.some((h) => (h == null ? void 0 : h.elementInfo) === e)) {
        a0("该元素已存在", "warning");
        return;
      }
      j.element.push({ elementInfo: r0 == null ? void 0 : r0.selector, elementName: n });
      const u = {
        id: j.id,
        web_name: (j.web_name || location.host).slice(0, 50),
        remark: j.remark,
        group_id: j.group_id,
        element: j.element,
        web_url: j.web_url,
      };
      w0.saveWebpage(u)
        .then((h) => {
          h.errorCode === 0 ? (a0("保存成功", "success"), Ut(), W0()) : a0("保存失败", "error");
        })
        .catch(() => {
          a0("保存失败", "error");
        });
    } else fa([{ elementInfo: r0 == null ? void 0 : r0.selector, elementName: n }]);
  }
  function fa(r) {
    if (y0.length == 0) {
      a0("请先在 SuperPower 创建网页分组", "error");
      return;
    } else {
      Array.isArray(r) && r.length > 0;
      const n = {
        id: 0,
        web_name: `${document.title.slice(0, 50)}`,
        remark: "",
        group_id: y0[0].id,
        element: r,
        web_url: `${location.origin}${location.pathname}`,
      };
      w0.saveWebpage(n)
        .then((e) => {
          e.errorCode === 0 ? (a0("保存成功", "success"), Ut(), W0()) : a0(e.message, "error");
        })
        .catch((e) => {
          a0(e.message, "error");
        });
    }
  }
  function Ut() {
    if (!K || !r0) return;
    const r = K.getElementById("zf-feature-name-input"),
      n = (r == null ? void 0 : r.value.trim()) || "未命名",
      e = r0;
    ((r0 = null), Mt());
    const t = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      pageUrl: location.href,
      pageTitle: document.title || location.hostname,
      featureName: n,
      selector: e.selector,
      tagPreview: e.tagPreview,
      createdAt: Date.now(),
    };
    (R.rows.push(t), v0(), s0());
  }
  function da(r) {
    const n = R.rows.find((t) => t.id === r);
    if (n && j && Array.isArray(j.element)) {
      const t = n.featureName;
      j.element = j.element.filter((u) => (u == null ? void 0 : u.elementName) !== t);
    }
    const e = {
      id: j.id,
      web_name: j.web_name.slice(0, 50),
      remark: j.remark,
      group_id: j.group_id,
      element: j.element,
      web_url: j.web_url,
    };
    (w0
      .saveWebpage(e)
      .then((t) => {
        t.errorCode === 0 ? (a0("删除成功", "success"), W0()) : a0("删除失败", "error");
      })
      .catch(() => {
        a0("删除失败", "error");
      }),
      (R.rows = R.rows.filter((t) => t.id !== r)),
      v0(),
      s0());
  }
  function s0() {
    if (!K) return;
    const r = K.getElementById("zf-collection-root");
    if (!r) return;
    const n = R.rows.length,
      e = Qr(),
      t = r.querySelector('[data-bind="stats"]');
    t && (t.textContent = `本次已采集 ${n} 个元素，${e} 个网页`);
    const u = r.querySelector('[data-bind="tbody"]');
    if (u)
      if (((u.innerHTML = ""), R.rows.length === 0)) {
        const v = document.createElement("tr"),
          a = document.createElement("td");
        ((a.colSpan = 4),
          (a.className = "empty-cell"),
          (a.innerHTML = `
        <div class="empty-wrap">
          <div class="empty-icon" aria-hidden="true">🛸</div>
          <p class="empty-text">未采集任何元素，点击下方按钮开始采集需要控制的元素吧 ~</p>
        </div>
      `),
          v.appendChild(a),
          u.appendChild(v));
      } else
        for (const v of R.rows) {
          const a = document.createElement("tr");
          ((a.innerHTML = `
          <td class="cell-ellipsis" title="${D0(v.pageUrl)}">${D0(v.pageTitle || v.pageUrl)}</td>
          <td class="cell-ellipsis" title="${D0(v.featureName)}">${D0(v.featureName)}</td>
          <td class="cell-mono" title="${D0(v.selector || "(整页)")}">${D0(v.selector ? pa(v.selector, Xr) : "(整页)")}</td>
          <td><button type="button" class="link-btn" data-action="del" data-id="${D0(v.id)}">删除</button></td>
        `),
            u.appendChild(a));
        }
    const h = r.querySelector('[data-action="toggle-smart"]');
    (h && (h.textContent = R.smartMode ? "切换为手动网页采集" : "切换为智能网页采集"),
      r.querySelectorAll('[data-action="dock-edge"]').forEach((v) => {
        const a = v.getAttribute("data-edge");
        if (!a) return;
        const o = R.panelFloat === null && R.panelEdge === a;
        v.classList.toggle("dock-edge-active", o);
      }));
    const m = r.querySelector('[data-action="pick"]');
    if (m) {
      const v = r0 !== null;
      ((m.disabled = R.picking || v),
        (m.textContent = R.picking ? "采集中… (Esc 取消)" : v ? "填写功能名称…" : "采集元素"));
    }
    const g = r.querySelector('[data-action="collect-page"]');
    (g && (g.disabled = r0 !== null), u0(r));
  }
  function D0(r) {
    return r
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function pa(r, n) {
    return r.length <= n ? r : `${r.slice(0, n)}...`;
  }
  function b0() {
    return Math.max(f0, window.innerWidth - 8);
  }
  function n0() {
    return Math.max(e0, window.innerHeight - 8);
  }
  function Q(r, n, e) {
    return Math.max(n, Math.min(e, r));
  }
  function u0(r) {
    if (
      (r.classList.remove("dock-left", "dock-right", "dock-top", "dock-bottom", "panel-floating"),
      !N)
    )
      return;
    if (R.panelFloat) {
      const u = R.panelFloat,
        h = Q(u.width, f0, b0()),
        m = Q(u.height, e0, n0()),
        g = V0(u.left, u.top, h, m);
      (r.classList.add("panel-floating"),
        (N.style.cssText = [
          "position:fixed",
          `left:${g.left}px`,
          `top:${g.top}px`,
          `width:${h}px`,
          `height:${m}px`,
          "z-index:100001",
          "pointer-events:auto",
          "right:auto",
          "bottom:auto",
          "box-shadow:0 8px 32px rgba(0,80,160,0.15)",
        ].join(";")));
      return;
    }
    r.classList.add(`dock-${R.panelEdge}`);
    const n = R.panelEdge,
      e = Q(R.panelDockWidth, f0, b0()),
      t = Q(R.panelDockHeight, e0, n0());
    n === "right"
      ? (N.style.cssText = [
          "position:fixed",
          "top:0",
          "right:0",
          `width:${e}px`,
          `height:${t}px`,
          `min-height:${e0}px`,
          `max-height:${n0()}px`,
          "left:auto",
          "bottom:auto",
          "z-index:100001",
          "pointer-events:auto",
          "box-shadow:-4px 0 24px rgba(0,80,180,0.08)",
        ].join(";"))
      : n === "left"
        ? (N.style.cssText = [
            "position:fixed",
            "top:0",
            "left:0",
            `width:${e}px`,
            `height:${t}px`,
            `min-height:${e0}px`,
            `max-height:${n0()}px`,
            "right:auto",
            "bottom:auto",
            "z-index:100001",
            "pointer-events:auto",
            "box-shadow:4px 0 24px rgba(0,80,180,0.08)",
          ].join(";"))
        : n === "top"
          ? (N.style.cssText = [
              "position:fixed",
              "top:0",
              "left:0",
              "right:0",
              "width:100%",
              `height:${t}px`,
              `min-height:${e0}px`,
              `max-height:${n0()}px`,
              "bottom:auto",
              "z-index:100001",
              "pointer-events:auto",
              "box-shadow:0 4px 24px rgba(0,80,180,0.1)",
            ].join(";"))
          : (N.style.cssText = [
              "position:fixed",
              "bottom:0",
              "left:0",
              "right:0",
              "width:100%",
              `height:${t}px`,
              `min-height:${e0}px`,
              `max-height:${n0()}px`,
              "top:auto",
              "z-index:100001",
              "pointer-events:auto",
              "box-shadow:0 -4px 24px rgba(0,80,180,0.1)",
            ].join(";"));
  }
  let g0 = null;
  function V0(r, n, e, t) {
    const u = Math.max(0, window.innerWidth - e),
      h = Math.max(0, window.innerHeight - t);
    return { left: Math.max(0, Math.min(r, u)), top: Math.max(0, Math.min(n, h)) };
  }
  function ua(r) {
    const n = (e) => {
      const t = e;
      if (t.button !== 0) return;
      const u = t.target;
      if (u == null) return;
      let h = null;
      if ((u instanceof Element ? (h = u) : u instanceof Node && (h = u.parentElement), !h)) return;
      const m = h.closest(".header");
      if (!m || h.closest("button, a, input, select, textarea, label") || !N) return;
      (e.preventDefault(), e.stopPropagation());
      const g = N.getBoundingClientRect();
      g0 = {
        startX: t.clientX,
        startY: t.clientY,
        origLeft: g.left,
        origTop: g.top,
        width: g.width,
        height: g.height,
      };
      try {
        m.setPointerCapture(t.pointerId);
      } catch {}
      const v = (o) => {
          const B = o;
          if (!g0 || !N) return;
          const i = B.clientX - g0.startX,
            c = B.clientY - g0.startY;
          let l = g0.origLeft + i,
            f = g0.origTop + c;
          const d = g0.width,
            E = g0.height,
            s = V0(l, f, d, E);
          ((l = s.left),
            (f = s.top),
            (R.panelFloat = { left: l, top: f, width: d, height: E }),
            (N.style.cssText = [
              "position:fixed",
              `left:${l}px`,
              `top:${f}px`,
              `width:${d}px`,
              `height:${E}px`,
              "z-index:100001",
              "pointer-events:auto",
              "right:auto",
              "bottom:auto",
              "box-shadow:0 8px 32px rgba(0,80,160,0.15)",
            ].join(";")));
          const x = r.getElementById("zf-collection-root");
          x &&
            (x.classList.remove("dock-left", "dock-right", "dock-top", "dock-bottom"),
            x.classList.add("panel-floating"));
        },
        a = (o) => {
          const B = o;
          (document.removeEventListener("pointermove", v, !0),
            document.removeEventListener("pointerup", a, !0),
            document.removeEventListener("pointercancel", a, !0));
          try {
            m.releasePointerCapture(B.pointerId);
          } catch {}
          ((g0 = null), v0(), r.getElementById("zf-collection-root") && s0());
        };
      (document.addEventListener("pointermove", v, !0),
        document.addEventListener("pointerup", a, !0),
        document.addEventListener("pointercancel", a, !0));
    };
    r.addEventListener("pointerdown", n, !0);
  }
  let o0 = null;
  function ha(r) {
    const n = (e) => {
      const t = e,
        u = t.target.closest(".resize-handle");
      if (!u || t.button !== 0 || !N) return;
      const h = u.getAttribute("data-resize");
      if (!h) return;
      (t.preventDefault(), t.stopPropagation());
      const m = N.getBoundingClientRect();
      o0 = {
        mode: h,
        startX: t.clientX,
        startY: t.clientY,
        startW: m.width,
        startH: m.height,
        startLeft: m.left,
        startTop: m.top,
      };
      try {
        u.setPointerCapture(t.pointerId);
      } catch {}
      const g = (a) => {
          const o = a;
          if (!o0 || !N) return;
          const B = o.clientX - o0.startX,
            i = o.clientY - o0.startY,
            c = o0.mode,
            l = r.getElementById("zf-collection-root");
          if (l) {
            if (R.panelFloat) {
              const f = o0,
                d = c.includes("n"),
                E = c.includes("s"),
                s = c.includes("e"),
                x = c.includes("w");
              let p = f.startW,
                b = f.startH,
                C = f.startLeft,
                A = f.startTop;
              (s && (p = f.startW + B),
                E && (b = f.startH + i),
                x && (p = f.startW - B),
                d && (b = f.startH - i),
                (p = Q(p, f0, b0())),
                (b = Q(b, e0, n0())),
                x && (C = f.startLeft + (f.startW - p)),
                d && (A = f.startTop + (f.startH - b)));
              const D = V0(C, A, p, b);
              ((R.panelFloat = { left: D.left, top: D.top, width: p, height: b }), u0(l));
              return;
            }
            if (R.panelEdge === "left" && (c === "n" || c === "s")) {
              const f = Q(c === "n" ? o0.startH - i : o0.startH + i, e0, n0());
              ((R.panelDockHeight = f), u0(l));
              return;
            }
            if (R.panelEdge === "right" && (c === "n" || c === "s")) {
              const f = Q(c === "n" ? o0.startH - i : o0.startH + i, e0, n0());
              ((R.panelDockHeight = f), u0(l));
              return;
            }
            if (R.panelEdge === "right" && (c === "w" || c === "nw" || c === "sw")) {
              const f = Q(o0.startW - B, f0, b0());
              ((R.panelDockWidth = f), u0(l));
              return;
            }
            if (R.panelEdge === "left" && (c === "e" || c === "ne" || c === "se")) {
              const f = Q(o0.startW + B, f0, b0());
              ((R.panelDockWidth = f), u0(l));
              return;
            }
            if (R.panelEdge === "top" && (c === "s" || c === "se" || c === "sw")) {
              const f = Q(o0.startH + i, e0, n0());
              ((R.panelDockHeight = f), u0(l));
              return;
            }
            if (R.panelEdge === "bottom" && (c === "n" || c === "ne" || c === "nw")) {
              const f = Q(o0.startH - i, e0, n0());
              ((R.panelDockHeight = f), u0(l));
            }
          }
        },
        v = (a) => {
          const o = a;
          (document.removeEventListener("pointermove", g, !0),
            document.removeEventListener("pointerup", v, !0),
            document.removeEventListener("pointercancel", v, !0));
          try {
            u.releasePointerCapture(o.pointerId);
          } catch {}
          ((o0 = null), v0(), r.getElementById("zf-collection-root") && s0());
        };
      (document.addEventListener("pointermove", g, !0),
        document.addEventListener("pointerup", v, !0),
        document.addEventListener("pointercancel", v, !0));
    };
    r.addEventListener("pointerdown", n, !0);
  }
  function It() {
    if (h0) return h0;
    const r = 0,
      n = 4,
      e = document.createElement("button");
    ((e.type = "button"),
      (e.textContent = "网页/元素采集"),
      e.setAttribute("aria-label", "打开网页元素采集面板"),
      e.style.setProperty("all", "initial", "important"),
      e.style.setProperty("position", "fixed", "important"),
      e.style.setProperty("right", "0", "important"),
      e.style.setProperty("top", "50%", "important"),
      e.style.setProperty("transform", "translateY(-50%)", "important"),
      e.style.setProperty("z-index", "3000000", "important"),
      e.style.setProperty("padding", "10px 6px", "important"),
      e.style.setProperty("writing-mode", "vertical-rl", "important"),
      e.style.setProperty("letter-spacing", "2px", "important"),
      e.style.setProperty("font-size", "13px", "important"),
      e.style.setProperty(
        "font-family",
        'system-ui,-apple-system,"Segoe UI",Roboto,sans-serif',
        "important",
      ),
      e.style.setProperty("line-height", "1.2", "important"),
      e.style.setProperty("color", "#fff", "important"),
      e.style.setProperty("background", "#1677ff", "important"),
      e.style.setProperty("border", "none", "important"),
      e.style.setProperty("border-radius", "8px 0 0 8px", "important"),
      e.style.setProperty("cursor", "pointer", "important"),
      e.style.setProperty("box-shadow", "-2px 0 8px rgba(0,80,180,0.2)", "important"),
      e.style.setProperty("width", "auto", "important"),
      e.style.setProperty("height", "auto", "important"),
      e.style.setProperty("max-width", "unset", "important"),
      e.style.setProperty("max-height", "unset", "important"),
      e.style.setProperty("display", "none", "important"));
    let t = 0,
      u = 0,
      h = 0,
      m = 0,
      g = !1,
      v = !1;
    const a = (o, B) => {
      const i = e.offsetWidth,
        c = e.offsetHeight,
        l = Math.max(r, window.innerWidth - i - r),
        f = Math.max(r, window.innerHeight - c - r),
        d = Q(o, r, l),
        E = Q(B, r, f),
        s = d,
        x = window.innerWidth - (d + i),
        p = E,
        b = window.innerHeight - (E + c),
        C = Math.min(s, x, p, b);
      if (((e.style.transform = "none"), C === s)) {
        ((e.style.left = `${r}px`),
          (e.style.right = "auto"),
          (e.style.top = `${E}px`),
          (e.style.bottom = "auto"),
          (e.style.borderRadius = "0 8px 8px 0"),
          (e.style.boxShadow = "2px 0 8px rgba(0,80,180,0.2)"));
        return;
      }
      if (C === x) {
        ((e.style.right = `${r}px`),
          (e.style.left = "auto"),
          (e.style.top = `${E}px`),
          (e.style.bottom = "auto"),
          (e.style.borderRadius = "8px 0 0 8px"),
          (e.style.boxShadow = "-2px 0 8px rgba(0,80,180,0.2)"));
        return;
      }
      if (C === p) {
        ((e.style.top = `${r}px`),
          (e.style.bottom = "auto"),
          (e.style.left = `${d}px`),
          (e.style.right = "auto"),
          (e.style.borderRadius = "0 0 8px 8px"),
          (e.style.boxShadow = "0 2px 8px rgba(0,80,180,0.2)"));
        return;
      }
      ((e.style.bottom = `${r}px`),
        (e.style.top = "auto"),
        (e.style.left = `${d}px`),
        (e.style.right = "auto"),
        (e.style.borderRadius = "8px 8px 0 0"),
        (e.style.boxShadow = "0 -2px 8px rgba(0,80,180,0.2)"));
    };
    return (
      e.addEventListener("pointerdown", (o) => {
        if (o.button !== 0) return;
        (o.preventDefault(), (t = o.clientX), (u = o.clientY));
        const B = e.getBoundingClientRect();
        ((h = B.left), (m = B.top), (v = !0), (g = !1));
        try {
          e.setPointerCapture(o.pointerId);
        } catch {}
      }),
      e.addEventListener("pointermove", (o) => {
        if (!v) return;
        const B = o.clientX - t,
          i = o.clientY - u;
        !g && (Math.abs(B) > n || Math.abs(i) > n) && (g = !0);
        const c = e.offsetWidth,
          l = e.offsetHeight,
          f = Math.max(r, window.innerWidth - c - r),
          d = Math.max(r, window.innerHeight - l - r),
          E = Q(h + B, r, f),
          s = Q(m + i, r, d);
        ((e.style.transform = "none"),
          (e.style.left = `${E}px`),
          (e.style.right = "auto"),
          (e.style.top = `${s}px`),
          (e.style.bottom = "auto"));
      }),
      e.addEventListener("pointerup", (o) => {
        if (!v) return;
        v = !1;
        try {
          e.releasePointerCapture(o.pointerId);
        } catch {}
        const B = e.getBoundingClientRect();
        a(B.left, B.top);
      }),
      e.addEventListener("pointercancel", () => {
        v = !1;
      }),
      e.addEventListener("click", () => {
        if (_0) {
          if (g) {
            g = !1;
            return;
          }
          (Gr(), Me());
        }
      }),
      (h0 = e),
      e
    );
  }
  function va(r) {
    (r.addEventListener("click", (n) => {
      const e = n.target;
      if (e.id === "zf-collect-page-modal") {
        G0();
        return;
      }
      if (e.id === "zf-feature-name-modal") {
        Te();
        return;
      }
      const u = n.target.closest("[data-action]");
      if (!u) return;
      const h = u.getAttribute("data-action");
      if (h === "close") {
        (N && (N.style.display = "none"), _0 && (It().style.display = "block"));
        return;
      }
      if (h === "dock-edge") {
        const m = u.getAttribute("data-edge");
        (m === "left" || m === "right" || m === "top" || m === "bottom") &&
          ((R.panelEdge = m),
          R.panelFloat &&
            ((R.panelDockWidth = Q(R.panelFloat.width, f0, b0())),
            (R.panelDockHeight = Q(R.panelFloat.height, e0, n0()))),
          (R.panelFloat = null),
          v0(),
          s0());
        return;
      }
      if (h === "toggle-smart") {
        ((R.smartMode = !R.smartMode), v0(), s0());
        return;
      }
      if (h === "guide") {
        window.alert(
          "新手引导：先点击「采集元素」，再在页面上点击目标控件；「采集网页」记录当前页地址。快捷键 Ctrl+Shift+Alt+W 可快速开始采集元素。",
        );
        return;
      }
      if (h === "policy") {
        window.alert("配置访问策略：请在工作台或后台规则中关联已采集的选择器。");
        return;
      }
      if (h === "collect-page") {
        ia();
        return;
      }
      if (h === "modal-page-cancel") {
        G0();
        return;
      }
      if (h === "modal-page-save") {
        sa();
        return;
      }
      if (h === "modal-feature-cancel") {
        Te();
        return;
      }
      if (h === "modal-feature-save") {
        la();
        return;
      }
      if (h === "pick") {
        Wt();
        return;
      }
      if (h === "del") {
        const m = u.getAttribute("data-id");
        m && da(m);
      }
    }),
      r.addEventListener(
        "keydown",
        (n) => {
          if (n.key !== "Escape") return;
          const e = r.getElementById("zf-feature-name-modal");
          if (e != null && e.classList.contains("is-open")) {
            (n.preventDefault(), n.stopPropagation(), Te());
            return;
          }
          const t = r.getElementById("zf-collect-page-modal");
          t != null &&
            t.classList.contains("is-open") &&
            (n.preventDefault(), n.stopPropagation(), G0());
        },
        !0,
      ));
  }
  function ga() {
    if (N) return;
    ((N = document.createElement("div")),
      N.setAttribute(qr, "1"),
      (N.style.cssText =
        "position:fixed;top:0;right:0;z-index:100001;width:420px;height:100%;pointer-events:auto;"),
      (K = N.attachShadow({ mode: "open" })));
    const r = document.createElement("style");
    r.textContent = `
    :host { all: initial; }
    * { box-sizing: border-box; font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; }
    .panel {
      position: relative;
      height: 100%;
      display: flex;
      flex-direction: column;
      background: linear-gradient(180deg, #e6f2ff 0%, #f0f7ff 40%, #e8f4fc 100%);
      color: #333;
      font-size: 13px;
      border: none;
      box-sizing: border-box;
    }
    .resize-handles { pointer-events: none; }
    .resize-handle {
      pointer-events: auto;
      position: absolute;
      z-index: 20;
      display: none;
      background: transparent;
    }
    .dock-right .resize-handle[data-resize="w"],
    .dock-right .resize-handle[data-resize="nw"],
    .dock-right .resize-handle[data-resize="sw"],
    .dock-right .resize-handle[data-resize="n"],
    .dock-right .resize-handle[data-resize="s"] {
      display: block;
    }
    .dock-left .resize-handle[data-resize="e"],
    .dock-left .resize-handle[data-resize="ne"],
    .dock-left .resize-handle[data-resize="se"],
    .dock-left .resize-handle[data-resize="n"],
    .dock-left .resize-handle[data-resize="s"] {
      display: block;
    }
    .dock-top .resize-handle[data-resize="s"],
    .dock-top .resize-handle[data-resize="se"],
    .dock-top .resize-handle[data-resize="sw"] {
      display: block;
    }
    .dock-bottom .resize-handle[data-resize="n"],
    .dock-bottom .resize-handle[data-resize="ne"],
    .dock-bottom .resize-handle[data-resize="nw"] {
      display: block;
    }
    .panel-floating .resize-handle { display: block; }
    .resize-handle[data-resize="n"] { top: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
    .resize-handle[data-resize="s"] { bottom: 0; left: 10px; right: 10px; height: 6px; cursor: ns-resize; }
    .resize-handle[data-resize="e"] { right: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
    .resize-handle[data-resize="w"] { left: 0; top: 10px; bottom: 10px; width: 6px; cursor: ew-resize; }
    .resize-handle[data-resize="ne"] { right: 0; top: 0; width: 14px; height: 14px; cursor: nesw-resize; }
    .resize-handle[data-resize="nw"] { left: 0; top: 0; width: 14px; height: 14px; cursor: nwse-resize; }
    .resize-handle[data-resize="se"] { right: 0; bottom: 0; width: 14px; height: 14px; cursor: nwse-resize; }
    .resize-handle[data-resize="sw"] { left: 0; bottom: 0; width: 14px; height: 14px; cursor: nesw-resize; }
    .dock-right.panel { border-left: 1px solid #bcdcff; }
    .dock-left.panel { border-right: 1px solid #bcdcff; }
    .dock-top.panel { border-bottom: 1px solid #bcdcff; }
    .dock-bottom.panel { border-top: 1px solid #bcdcff; }
    .panel-floating.panel { border: 1px solid #bcdcff; border-radius: 8px; overflow: hidden; }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 8px 10px;
      background: #fff;
      border-bottom: 1px solid #d9e8fb;
      gap: 6px;
      flex-wrap: wrap;
      cursor: grab;
      user-select: none;
    }
    .header:active { cursor: grabbing; }
    .header button,
    .header a {
      cursor: pointer;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      flex: 1;
      min-width: 0;
    }
    .drag-handle {
      padding: 6px 8px;
      font-size: 14px;
      line-height: 1;
      color: #666;
      border-radius: 6px;
      letter-spacing: -2px;
    }
    .drag-handle:hover { background: #f0f7ff; color: #1677ff; }
    .dock-edge-btns {
      display: flex;
      align-items: center;
      gap: 4px;
      flex-wrap: wrap;
    }
    .dock-edge-btn {
      border: 1px solid #bcdcff;
      background: #fff;
      color: #1677ff;
      border-radius: 6px;
      padding: 2px 8px;
      font-size: 12px;
      cursor: pointer;
      line-height: 1.4;
    }
    .dock-edge-btn:hover { background: #e6f4ff; }
    .dock-edge-btn.dock-edge-active {
      background: #1677ff;
      color: #fff;
      border-color: #1677ff;
    }
    .header a, .header button.link {
      background: none;
      border: none;
      color: #1677ff;
      cursor: pointer;
      font-size: 13px;
      padding: 2px 4px;
      text-decoration: none;
    }
    .header a:hover, .header button.link:hover { text-decoration: underline; }
    .header-right { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
    .icon-close {
      border: none;
      background: transparent;
      font-size: 18px;
      line-height: 1;
      cursor: pointer;
      color: #666;
      padding: 4px 8px;
    }
    .icon-close:hover { color: #000; }
    .stats-bar {
      margin: 10px 12px 0;
      padding: 10px 12px;
      background: #fff;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
      border: 1px solid #e0edf8;
    }
    .stats-bar span { color: #333; }
    .btn-outline {
      border: 1px solid #1677ff;
      color: #1677ff;
      background: #fff;
      border-radius: 6px;
      padding: 4px 12px;
      font-size: 13px;
      cursor: pointer;
    }
    .btn-outline:hover { background: #e6f4ff; }
    .table-wrap {
      flex: 1;
      margin: 10px 12px;
      background: #fff;
      border-radius: 8px;
      border: 1px solid #e0edf8;
      overflow: auto;
      min-height: 120px;
    }
    table { width: 100%; border-collapse: collapse; }
    thead th {
      text-align: left;
      padding: 10px 8px;
      font-weight: 600;
      color: #666;
      font-size: 12px;
      background: #f5f9ff;
      border-bottom: 1px solid #e0edf8;
    }
    tbody td {
      padding: 8px;
      border-bottom: 1px solid #f0f4fa;
      vertical-align: middle;
      font-size: 12px;
    }
    .cell-ellipsis { max-width: 90px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .cell-mono { font-family: ui-monospace, monospace; font-size: 11px; color: #444; max-width: 140px; }
    .link-btn {
      border: none;
      background: none;
      color: #1677ff;
      cursor: pointer;
      padding: 0;
      font-size: 12px;
    }
    .link-btn:hover { text-decoration: underline; }
    .empty-cell { padding: 32px 16px !important; border: none !important; }
    .empty-wrap { text-align: center; color: #8a9aaf; }
    .empty-icon { font-size: 48px; line-height: 1.2; margin-bottom: 8px; opacity: 0.85; }
    .empty-text { margin: 0; font-size: 13px; line-height: 1.5; }
    .footer {
      padding: 12px;
      background: transparent;
    }
    .footer-btns {
      display: flex;
      gap: 10px;
    }
    .footer-btns button {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      border: none;
    }
    .btn-ghost {
      background: #fff;
      color: #1677ff;
      border: 1px solid #1677ff !important;
    }
    .btn-ghost:hover { background: #e6f4ff; }
    .btn-primary {
      background: #1677ff;
      color: #fff;
    }
    .btn-primary:hover { background: #4096ff; }
    .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; }
    .tip {
      margin: 10px 4px 0;
      text-align: center;
      font-size: 12px;
      color: #d48806;
    }
    .modal-overlay {
      position: fixed;
      inset: 0;
      z-index: 100;
      background: rgba(0, 0, 0, 0.48);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 16px;
      opacity: 0;
      visibility: hidden;
      pointer-events: none;
      transition: opacity 0.22s ease, visibility 0.22s ease;
    }
    #zf-feature-name-modal {
      z-index: 110;
    }
    .modal-overlay.is-open {
      opacity: 1;
      visibility: visible;
      pointer-events: auto;
    }
    .modal-dialog {
      width: 100%;
      max-width: 380px;
      background: #fff;
      border: 1px solid #e8e8e8;
      border-radius: 12px;
      padding: 18px 16px;
      box-shadow: 0 12px 40px rgba(0, 0, 0, 0.12);
      transform: translateY(10px) scale(0.96);
      opacity: 0;
      transition: transform 0.26s cubic-bezier(0.34, 1.02, 0.68, 1), opacity 0.22s ease;
    }
    .modal-overlay.is-open .modal-dialog {
      transform: translateY(0) scale(1);
      opacity: 1;
      transition-delay: 0.02s, 0.02s;
    }
    @media (prefers-reduced-motion: reduce) {
      .modal-overlay,
      .modal-dialog {
        transition: none !important;
      }
      .modal-dialog {
        transform: none;
      }
    }
    .modal-title {
      font-weight: 600;
      font-size: 15px;
      margin: 0 0 6px;
      color: #1a1a1a;
    }
    .modal-desc {
      font-size: 12px;
      color: #666;
      margin: 0 0 14px;
      line-height: 1.45;
    }
    .modal-label {
      display: block;
      font-size: 12px;
      color: #444;
      margin-bottom: 6px;
    }
    .modal-input {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #d9d9d9;
      border-radius: 8px;
      font-size: 13px;
      background: #fff;
      color: #222;
      outline: none;
    }
    .modal-input:focus {
      border-color: #1677ff;
      box-shadow: 0 0 0 2px rgba(22, 119, 255, 0.15);
    }
    .modal-actions {
      display: flex;
      gap: 10px;
      margin-top: 18px;
      justify-content: flex-end;
    }
    .btn-modal-cancel {
      padding: 8px 18px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      border: 1px solid #bcdcff;
      background: #fff;
      color: #1677ff;
    }
    .btn-modal-cancel:hover { background: #f0f7ff; }
    .btn-modal-save {
      padding: 8px 20px;
      border-radius: 8px;
      font-size: 13px;
      cursor: pointer;
      border: none;
      background: #1677ff;
      color: #fff;
    }
    .btn-modal-save:hover { background: #4096ff; }
  `;
    const n = document.createElement("div");
    ((n.id = "zf-collection-root"),
      (n.className = "panel dock-right"),
      (n.innerHTML = `
    <div class="header" title="在标题栏空白处拖动移动面板">
      <div class="header-left">
        <span class="drag-handle" aria-hidden="true">⠿</span>
        <div class="dock-edge-btns">
          <button type="button" class="dock-edge-btn" data-action="dock-edge" data-edge="left" title="靠左">左</button>
          <button type="button" class="dock-edge-btn" data-action="dock-edge" data-edge="right" title="靠右">右</button>
          <button type="button" class="dock-edge-btn" data-action="dock-edge" data-edge="top" title="靠上">上</button>
          <button type="button" class="dock-edge-btn" data-action="dock-edge" data-edge="bottom" title="靠下">下</button>
        </div>
      </div>
      <div class="header-right">
        <a href="javascript:void(0)" data-action="guide">新手引导</a>
        <button type="button" class="icon-close" data-action="close" title="关闭" aria-label="关闭">×</button>
      </div>
    </div>
    <div class="stats-bar">
      <span data-bind="stats">本次已采集 0 个元素，0 个网页</span>
    </div>
    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>网页</th>
            <th>功能名称</th>
            <th>采集对象</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody data-bind="tbody"></tbody>
      </table>
    </div>
    <div class="footer">
      <div class="footer-btns">
        <button type="button" class="btn-primary" data-action="collect-page">🌐 采集网页</button>
        <button type="button" class="btn-primary" data-action="pick">选择采集元素</button>
      </div>
      <p class="tip">提示:采集的网址/元素信息将自动添加至成员访问控制-网页管理中</p>
      <p class="tip">小技巧：可使用快捷键 “Ctrl + Shift + Alt + W” 快速开始采集</p>
    </div>
    <div class="resize-handles" aria-hidden="true">
      <div class="resize-handle" data-resize="n" title="拖动调整高度"></div>
      <div class="resize-handle" data-resize="s" title="拖动调整高度"></div>
      <div class="resize-handle" data-resize="e" title="拖动调整宽度"></div>
      <div class="resize-handle" data-resize="w" title="拖动调整宽度"></div>
      <div class="resize-handle" data-resize="ne" title="拖动调整大小"></div>
      <div class="resize-handle" data-resize="nw" title="拖动调整大小"></div>
      <div class="resize-handle" data-resize="se" title="拖动调整大小"></div>
      <div class="resize-handle" data-resize="sw" title="拖动调整大小"></div>
    </div>
    <div id="zf-collect-page-modal" class="modal-overlay" aria-hidden="true">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="zf-collect-page-modal-title">
        <h2 id="zf-collect-page-modal-title" class="modal-title">采集网页</h2>
        <p class="modal-desc">请确认或编辑网页地址，保存后将加入采集列表。</p>
        <label class="modal-label" for="zf-collect-page-url">网页地址</label>
        <input type="text" id="zf-collect-page-url" class="modal-input" autocomplete="off" spellcheck="false" />
        <div class="modal-actions">
          <button type="button" class="btn-modal-cancel" data-action="modal-page-cancel">取消</button>
          <button type="button" class="btn-modal-save" data-action="modal-page-save">保存</button>
        </div>
      </div>
    </div>
    <div id="zf-feature-name-modal" class="modal-overlay" aria-hidden="true">
      <div class="modal-dialog" role="dialog" aria-modal="true" aria-labelledby="zf-feature-name-modal-title">
        <h2 id="zf-feature-name-modal-title" class="modal-title">功能名称</h2>
        <p class="modal-desc">用于标识该采集项，可修改后保存。</p>
        <label class="modal-label" for="zf-feature-name-input">功能名称</label>
        <input type="text" id="zf-feature-name-input" class="modal-input" autocomplete="off" spellcheck="false" />
        <div class="modal-actions">
          <button type="button" class="btn-modal-cancel" data-action="modal-feature-cancel">取消</button>
          <button type="button" class="btn-modal-save" data-action="modal-feature-save">保存</button>
        </div>
      </div>
    </div>
  `),
      K.appendChild(r),
      K.appendChild(n),
      document.documentElement.appendChild(N),
      va(K),
      ua(K),
      ha(K),
      Zr(() => {
        (St(), u0(n), s0());
      }));
  }
  function Ba(r) {
    if (!r.ctrlKey || !r.shiftKey || !r.altKey || r.key.toLowerCase() !== "w") return;
    const n = document.activeElement;
    (n && (n.tagName === "INPUT" || n.tagName === "TEXTAREA" || n.isContentEditable)) ||
      (r.preventDefault(), Me(), Wt());
  }
  function Me() {
    (!N || N.style.display === "none") &&
      (N ? (N.style.display = "") : ga(), h0 && (h0.style.display = "none"), W0(), Vr());
  }
  function Ea() {
    if (!N || !K) return;
    let r = !1;
    if (R.panelFloat) {
      const n = R.panelFloat,
        e = Q(n.width, f0, b0()),
        t = Q(n.height, e0, n0()),
        u = V0(n.left, n.top, e, t);
      (e !== n.width || t !== n.height || u.left !== n.left || u.top !== n.top) &&
        ((R.panelFloat = { left: u.left, top: u.top, width: e, height: t }), (r = !0));
    } else {
      const n = Q(R.panelDockWidth, f0, b0()),
        e = Q(R.panelDockHeight, e0, n0());
      (n !== R.panelDockWidth || e !== R.panelDockHeight) &&
        ((R.panelDockWidth = n), (R.panelDockHeight = e), (r = !0));
    }
    if (r) {
      v0();
      const n = K.getElementById("zf-collection-root");
      n && u0(n);
    }
  }
  function Nt() {
    (document.addEventListener("keydown", Ba, !0),
      chrome.runtime.onMessage.addListener((r) => {
        if ((r == null ? void 0 : r.type) === "open-collection-panel") {
          if (!_0) return;
          Me();
        }
      }),
      chrome.runtime
        .sendMessage({ type: "can_show_access_control" })
        .then((r) => {
          ((_0 = (r == null ? void 0 : r.allowed) === !0),
            _0 ? (It().style.display = "block") : h0 && (h0.style.display = "none"));
        })
        .catch(() => {
          _0 = !1;
        }),
      window.addEventListener("resize", Ea));
  }
  window.top === window.self &&
    (document.readyState === "loading"
      ? document.addEventListener("DOMContentLoaded", Nt, { once: !0 })
      : Nt());
})();
