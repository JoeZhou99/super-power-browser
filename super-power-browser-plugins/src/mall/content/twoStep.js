(function () {
  "use strict";
  var V =
    typeof globalThis < "u"
      ? globalThis
      : typeof window < "u"
        ? window
        : typeof global < "u"
          ? global
          : typeof self < "u"
            ? self
            : {};
  function we(r) {
    return r && r.__esModule && Object.prototype.hasOwnProperty.call(r, "default") ? r.default : r;
  }
  function ke(r) {
    if (r.__esModule) return r;
    var o = r.default;
    if (typeof o == "function") {
      var x = function e() {
        return this instanceof e
          ? Reflect.construct(o, arguments, this.constructor)
          : o.apply(this, arguments);
      };
      x.prototype = o.prototype;
    } else x = {};
    return (
      Object.defineProperty(x, "__esModule", { value: !0 }),
      Object.keys(r).forEach(function (e) {
        var f = Object.getOwnPropertyDescriptor(r, e);
        Object.defineProperty(
          x,
          e,
          f.get
            ? f
            : {
                enumerable: !0,
                get: function () {
                  return r[e];
                },
              },
        );
      }),
      x
    );
  }
  var ix = { exports: {} };
  (function (r, o) {
    (function (e, f) {
      r.exports = f();
    })(typeof self < "u" ? self : V, function () {
      return (function (x) {
        var e = {};
        function f(d) {
          if (e[d]) return e[d].exports;
          var y = (e[d] = { i: d, l: !1, exports: {} });
          return (x[d].call(y.exports, y, y.exports, f), (y.l = !0), y.exports);
        }
        return (
          (f.m = x),
          (f.c = e),
          (f.d = function (d, y, l) {
            f.o(d, y) || Object.defineProperty(d, y, { configurable: !1, enumerable: !0, get: l });
          }),
          (f.n = function (d) {
            var y =
              d && d.__esModule
                ? function () {
                    return d.default;
                  }
                : function () {
                    return d;
                  };
            return (f.d(y, "a", y), y);
          }),
          (f.o = function (d, y) {
            return Object.prototype.hasOwnProperty.call(d, y);
          }),
          (f.p = ""),
          f((f.s = 3))
        );
      })([
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = (function () {
            function y(l, v) {
              ((this.width = v), (this.height = l.length / v), (this.data = l));
            }
            return (
              (y.createEmpty = function (l, v) {
                return new y(new Uint8ClampedArray(l * v), l);
              }),
              (y.prototype.get = function (l, v) {
                return l < 0 || l >= this.width || v < 0 || v >= this.height
                  ? !1
                  : !!this.data[v * this.width + l];
              }),
              (y.prototype.set = function (l, v, E) {
                this.data[v * this.width + l] = E ? 1 : 0;
              }),
              (y.prototype.setRegion = function (l, v, E, a, B) {
                for (var s = v; s < v + a; s++) for (var D = l; D < l + E; D++) this.set(D, s, !!B);
              }),
              y
            );
          })();
          e.BitMatrix = d;
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(2);
          function y(v, E) {
            return v ^ E;
          }
          e.addOrSubtractGF = y;
          var l = (function () {
            function v(E, a, B) {
              ((this.primitive = E),
                (this.size = a),
                (this.generatorBase = B),
                (this.expTable = new Array(this.size)),
                (this.logTable = new Array(this.size)));
              for (var s = 1, D = 0; D < this.size; D++)
                ((this.expTable[D] = s),
                  (s = s * 2),
                  s >= this.size && (s = (s ^ this.primitive) & (this.size - 1)));
              for (var D = 0; D < this.size - 1; D++) this.logTable[this.expTable[D]] = D;
              ((this.zero = new d.default(this, Uint8ClampedArray.from([0]))),
                (this.one = new d.default(this, Uint8ClampedArray.from([1]))));
            }
            return (
              (v.prototype.multiply = function (E, a) {
                return E === 0 || a === 0
                  ? 0
                  : this.expTable[(this.logTable[E] + this.logTable[a]) % (this.size - 1)];
              }),
              (v.prototype.inverse = function (E) {
                if (E === 0) throw new Error("Can't invert 0");
                return this.expTable[this.size - this.logTable[E] - 1];
              }),
              (v.prototype.buildMonomial = function (E, a) {
                if (E < 0) throw new Error("Invalid monomial degree less than 0");
                if (a === 0) return this.zero;
                var B = new Uint8ClampedArray(E + 1);
                return ((B[0] = a), new d.default(this, B));
              }),
              (v.prototype.log = function (E) {
                if (E === 0) throw new Error("Can't take log(0)");
                return this.logTable[E];
              }),
              (v.prototype.exp = function (E) {
                return this.expTable[E];
              }),
              v
            );
          })();
          e.default = l;
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(1),
            y = (function () {
              function l(v, E) {
                if (E.length === 0) throw new Error("No coefficients.");
                this.field = v;
                var a = E.length;
                if (a > 1 && E[0] === 0) {
                  for (var B = 1; B < a && E[B] === 0;) B++;
                  if (B === a) this.coefficients = v.zero.coefficients;
                  else {
                    this.coefficients = new Uint8ClampedArray(a - B);
                    for (var s = 0; s < this.coefficients.length; s++)
                      this.coefficients[s] = E[B + s];
                  }
                } else this.coefficients = E;
              }
              return (
                (l.prototype.degree = function () {
                  return this.coefficients.length - 1;
                }),
                (l.prototype.isZero = function () {
                  return this.coefficients[0] === 0;
                }),
                (l.prototype.getCoefficient = function (v) {
                  return this.coefficients[this.coefficients.length - 1 - v];
                }),
                (l.prototype.addOrSubtract = function (v) {
                  var E;
                  if (this.isZero()) return v;
                  if (v.isZero()) return this;
                  var a = this.coefficients,
                    B = v.coefficients;
                  a.length > B.length && ((E = [B, a]), (a = E[0]), (B = E[1]));
                  for (
                    var s = new Uint8ClampedArray(B.length), D = B.length - a.length, c = 0;
                    c < D;
                    c++
                  )
                    s[c] = B[c];
                  for (var c = D; c < B.length; c++) s[c] = d.addOrSubtractGF(a[c - D], B[c]);
                  return new l(this.field, s);
                }),
                (l.prototype.multiply = function (v) {
                  if (v === 0) return this.field.zero;
                  if (v === 1) return this;
                  for (
                    var E = this.coefficients.length, a = new Uint8ClampedArray(E), B = 0;
                    B < E;
                    B++
                  )
                    a[B] = this.field.multiply(this.coefficients[B], v);
                  return new l(this.field, a);
                }),
                (l.prototype.multiplyPoly = function (v) {
                  if (this.isZero() || v.isZero()) return this.field.zero;
                  for (
                    var E = this.coefficients,
                      a = E.length,
                      B = v.coefficients,
                      s = B.length,
                      D = new Uint8ClampedArray(a + s - 1),
                      c = 0;
                    c < a;
                    c++
                  )
                    for (var h = E[c], i = 0; i < s; i++)
                      D[c + i] = d.addOrSubtractGF(D[c + i], this.field.multiply(h, B[i]));
                  return new l(this.field, D);
                }),
                (l.prototype.multiplyByMonomial = function (v, E) {
                  if (v < 0) throw new Error("Invalid degree less than 0");
                  if (E === 0) return this.field.zero;
                  for (
                    var a = this.coefficients.length, B = new Uint8ClampedArray(a + v), s = 0;
                    s < a;
                    s++
                  )
                    B[s] = this.field.multiply(this.coefficients[s], E);
                  return new l(this.field, B);
                }),
                (l.prototype.evaluateAt = function (v) {
                  var E = 0;
                  if (v === 0) return this.getCoefficient(0);
                  var a = this.coefficients.length;
                  if (v === 1)
                    return (
                      this.coefficients.forEach(function (s) {
                        E = d.addOrSubtractGF(E, s);
                      }),
                      E
                    );
                  E = this.coefficients[0];
                  for (var B = 1; B < a; B++)
                    E = d.addOrSubtractGF(this.field.multiply(v, E), this.coefficients[B]);
                  return E;
                }),
                l
              );
            })();
          e.default = y;
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(4),
            y = f(5),
            l = f(11),
            v = f(12);
          function E(s) {
            var D = v.locate(s);
            if (!D) return null;
            for (var c = 0, h = D; c < h.length; c++) {
              var i = h[c],
                w = l.extract(s, i),
                C = y.decode(w.matrix);
              if (C)
                return {
                  binaryData: C.bytes,
                  data: C.text,
                  chunks: C.chunks,
                  version: C.version,
                  location: {
                    topRightCorner: w.mappingFunction(i.dimension, 0),
                    topLeftCorner: w.mappingFunction(0, 0),
                    bottomRightCorner: w.mappingFunction(i.dimension, i.dimension),
                    bottomLeftCorner: w.mappingFunction(0, i.dimension),
                    topRightFinderPattern: i.topRight,
                    topLeftFinderPattern: i.topLeft,
                    bottomLeftFinderPattern: i.bottomLeft,
                    bottomRightAlignmentPattern: i.alignmentPattern,
                  },
                };
            }
            return null;
          }
          var a = { inversionAttempts: "attemptBoth" };
          function B(s, D, c, h) {
            h === void 0 && (h = {});
            var i = a;
            Object.keys(i || {}).forEach(function (u) {
              i[u] = h[u] || i[u];
            });
            var w = i.inversionAttempts === "attemptBoth" || i.inversionAttempts === "invertFirst",
              C = i.inversionAttempts === "onlyInvert" || i.inversionAttempts === "invertFirst",
              n = d.binarize(s, D, c, w),
              t = n.binarized,
              A = n.inverted,
              F = E(C ? A : t);
            return (
              !F &&
                (i.inversionAttempts === "attemptBoth" || i.inversionAttempts === "invertFirst") &&
                (F = E(C ? t : A)),
              F
            );
          }
          ((B.default = B), (e.default = B));
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(0),
            y = 8,
            l = 24;
          function v(B, s, D) {
            return B < s ? s : B > D ? D : B;
          }
          var E = (function () {
            function B(s, D) {
              ((this.width = s), (this.data = new Uint8ClampedArray(s * D)));
            }
            return (
              (B.prototype.get = function (s, D) {
                return this.data[D * this.width + s];
              }),
              (B.prototype.set = function (s, D, c) {
                this.data[D * this.width + s] = c;
              }),
              B
            );
          })();
          function a(B, s, D, c) {
            if (B.length !== s * D * 4) throw new Error("Malformed data passed to binarizer.");
            for (var h = new E(s, D), i = 0; i < s; i++)
              for (var w = 0; w < D; w++) {
                var C = B[(w * s + i) * 4 + 0],
                  n = B[(w * s + i) * 4 + 1],
                  t = B[(w * s + i) * 4 + 2];
                h.set(i, w, 0.2126 * C + 0.7152 * n + 0.0722 * t);
              }
            for (var A = Math.ceil(s / y), F = Math.ceil(D / y), u = new E(A, F), k = 0; k < F; k++)
              for (var g = 0; g < A; g++) {
                for (var p = 0, m = 1 / 0, b = 0, w = 0; w < y; w++)
                  for (var i = 0; i < y; i++) {
                    var S = h.get(g * y + i, k * y + w);
                    ((p += S), (m = Math.min(m, S)), (b = Math.max(b, S)));
                  }
                var z = p / Math.pow(y, 2);
                if (b - m <= l && ((z = m / 2), k > 0 && g > 0)) {
                  var M = (u.get(g, k - 1) + 2 * u.get(g - 1, k) + u.get(g - 1, k - 1)) / 4;
                  m < M && (z = M);
                }
                u.set(g, k, z);
              }
            var R = d.BitMatrix.createEmpty(s, D),
              I = null;
            c && (I = d.BitMatrix.createEmpty(s, D));
            for (var k = 0; k < F; k++)
              for (var g = 0; g < A; g++) {
                for (var H = v(g, 2, A - 3), N = v(k, 2, F - 3), p = 0, O = -2; O <= 2; O++)
                  for (var P = -2; P <= 2; P++) p += u.get(H + O, N + P);
                for (var T = p / 25, O = 0; O < y; O++)
                  for (var P = 0; P < y; P++) {
                    var i = g * y + O,
                      w = k * y + P,
                      L = h.get(i, w);
                    (R.set(i, w, L <= T), c && I.set(i, w, !(L <= T)));
                  }
              }
            return c ? { binarized: R, inverted: I } : { binarized: R };
          }
          e.binarize = a;
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(0),
            y = f(6),
            l = f(9),
            v = f(10);
          function E(t, A) {
            for (var F = t ^ A, u = 0; F;) (u++, (F &= F - 1));
            return u;
          }
          function a(t, A) {
            return (A << 1) | t;
          }
          var B = [
              { bits: 21522, formatInfo: { errorCorrectionLevel: 1, dataMask: 0 } },
              { bits: 20773, formatInfo: { errorCorrectionLevel: 1, dataMask: 1 } },
              { bits: 24188, formatInfo: { errorCorrectionLevel: 1, dataMask: 2 } },
              { bits: 23371, formatInfo: { errorCorrectionLevel: 1, dataMask: 3 } },
              { bits: 17913, formatInfo: { errorCorrectionLevel: 1, dataMask: 4 } },
              { bits: 16590, formatInfo: { errorCorrectionLevel: 1, dataMask: 5 } },
              { bits: 20375, formatInfo: { errorCorrectionLevel: 1, dataMask: 6 } },
              { bits: 19104, formatInfo: { errorCorrectionLevel: 1, dataMask: 7 } },
              { bits: 30660, formatInfo: { errorCorrectionLevel: 0, dataMask: 0 } },
              { bits: 29427, formatInfo: { errorCorrectionLevel: 0, dataMask: 1 } },
              { bits: 32170, formatInfo: { errorCorrectionLevel: 0, dataMask: 2 } },
              { bits: 30877, formatInfo: { errorCorrectionLevel: 0, dataMask: 3 } },
              { bits: 26159, formatInfo: { errorCorrectionLevel: 0, dataMask: 4 } },
              { bits: 25368, formatInfo: { errorCorrectionLevel: 0, dataMask: 5 } },
              { bits: 27713, formatInfo: { errorCorrectionLevel: 0, dataMask: 6 } },
              { bits: 26998, formatInfo: { errorCorrectionLevel: 0, dataMask: 7 } },
              { bits: 5769, formatInfo: { errorCorrectionLevel: 3, dataMask: 0 } },
              { bits: 5054, formatInfo: { errorCorrectionLevel: 3, dataMask: 1 } },
              { bits: 7399, formatInfo: { errorCorrectionLevel: 3, dataMask: 2 } },
              { bits: 6608, formatInfo: { errorCorrectionLevel: 3, dataMask: 3 } },
              { bits: 1890, formatInfo: { errorCorrectionLevel: 3, dataMask: 4 } },
              { bits: 597, formatInfo: { errorCorrectionLevel: 3, dataMask: 5 } },
              { bits: 3340, formatInfo: { errorCorrectionLevel: 3, dataMask: 6 } },
              { bits: 2107, formatInfo: { errorCorrectionLevel: 3, dataMask: 7 } },
              { bits: 13663, formatInfo: { errorCorrectionLevel: 2, dataMask: 0 } },
              { bits: 12392, formatInfo: { errorCorrectionLevel: 2, dataMask: 1 } },
              { bits: 16177, formatInfo: { errorCorrectionLevel: 2, dataMask: 2 } },
              { bits: 14854, formatInfo: { errorCorrectionLevel: 2, dataMask: 3 } },
              { bits: 9396, formatInfo: { errorCorrectionLevel: 2, dataMask: 4 } },
              { bits: 8579, formatInfo: { errorCorrectionLevel: 2, dataMask: 5 } },
              { bits: 11994, formatInfo: { errorCorrectionLevel: 2, dataMask: 6 } },
              { bits: 11245, formatInfo: { errorCorrectionLevel: 2, dataMask: 7 } },
            ],
            s = [
              function (t) {
                return (t.y + t.x) % 2 === 0;
              },
              function (t) {
                return t.y % 2 === 0;
              },
              function (t) {
                return t.x % 3 === 0;
              },
              function (t) {
                return (t.y + t.x) % 3 === 0;
              },
              function (t) {
                return (Math.floor(t.y / 2) + Math.floor(t.x / 3)) % 2 === 0;
              },
              function (t) {
                return ((t.x * t.y) % 2) + ((t.x * t.y) % 3) === 0;
              },
              function (t) {
                return (((t.y * t.x) % 2) + ((t.y * t.x) % 3)) % 2 === 0;
              },
              function (t) {
                return (((t.y + t.x) % 2) + ((t.y * t.x) % 3)) % 2 === 0;
              },
            ];
          function D(t) {
            var A = 17 + 4 * t.versionNumber,
              F = d.BitMatrix.createEmpty(A, A);
            (F.setRegion(0, 0, 9, 9, !0),
              F.setRegion(A - 8, 0, 8, 9, !0),
              F.setRegion(0, A - 8, 9, 8, !0));
            for (var u = 0, k = t.alignmentPatternCenters; u < k.length; u++)
              for (var g = k[u], p = 0, m = t.alignmentPatternCenters; p < m.length; p++) {
                var b = m[p];
                (g === 6 && b === 6) ||
                  (g === 6 && b === A - 7) ||
                  (g === A - 7 && b === 6) ||
                  F.setRegion(g - 2, b - 2, 5, 5, !0);
              }
            return (
              F.setRegion(6, 9, 1, A - 17, !0),
              F.setRegion(9, 6, A - 17, 1, !0),
              t.versionNumber > 6 &&
                (F.setRegion(A - 11, 0, 3, 6, !0), F.setRegion(0, A - 11, 6, 3, !0)),
              F
            );
          }
          function c(t, A, F) {
            for (
              var u = s[F.dataMask],
                k = t.height,
                g = D(A),
                p = [],
                m = 0,
                b = 0,
                S = !0,
                z = k - 1;
              z > 0;
              z -= 2
            ) {
              z === 6 && z--;
              for (var M = 0; M < k; M++)
                for (var R = S ? k - 1 - M : M, I = 0; I < 2; I++) {
                  var H = z - I;
                  if (!g.get(H, R)) {
                    b++;
                    var N = t.get(H, R);
                    (u({ y: R, x: H }) && (N = !N),
                      (m = a(N, m)),
                      b === 8 && (p.push(m), (b = 0), (m = 0)));
                  }
                }
              S = !S;
            }
            return p;
          }
          function h(t) {
            var A = t.height,
              F = Math.floor((A - 17) / 4);
            if (F <= 6) return v.VERSIONS[F - 1];
            for (var u = 0, k = 5; k >= 0; k--)
              for (var g = A - 9; g >= A - 11; g--) u = a(t.get(g, k), u);
            for (var p = 0, g = 5; g >= 0; g--)
              for (var k = A - 9; k >= A - 11; k--) p = a(t.get(g, k), p);
            for (var m = 1 / 0, b, S = 0, z = v.VERSIONS; S < z.length; S++) {
              var M = z[S];
              if (M.infoBits === u || M.infoBits === p) return M;
              var R = E(u, M.infoBits);
              (R < m && ((b = M), (m = R)), (R = E(p, M.infoBits)), R < m && ((b = M), (m = R)));
            }
            if (m <= 3) return b;
          }
          function i(t) {
            for (var A = 0, F = 0; F <= 8; F++) F !== 6 && (A = a(t.get(F, 8), A));
            for (var u = 7; u >= 0; u--) u !== 6 && (A = a(t.get(8, u), A));
            for (var k = t.height, g = 0, u = k - 1; u >= k - 7; u--) g = a(t.get(8, u), g);
            for (var F = k - 8; F < k; F++) g = a(t.get(F, 8), g);
            for (var p = 1 / 0, m = null, b = 0, S = B; b < S.length; b++) {
              var z = S[b],
                M = z.bits,
                R = z.formatInfo;
              if (M === A || M === g) return R;
              var I = E(A, M);
              (I < p && ((m = R), (p = I)),
                A !== g && ((I = E(g, M)), I < p && ((m = R), (p = I))));
            }
            return p <= 3 ? m : null;
          }
          function w(t, A, F) {
            var u = A.errorCorrectionLevels[F],
              k = [],
              g = 0;
            if (
              (u.ecBlocks.forEach(function (N) {
                for (var O = 0; O < N.numBlocks; O++)
                  (k.push({ numDataCodewords: N.dataCodewordsPerBlock, codewords: [] }),
                    (g += N.dataCodewordsPerBlock + u.ecCodewordsPerBlock));
              }),
              t.length < g)
            )
              return null;
            t = t.slice(0, g);
            for (var p = u.ecBlocks[0].dataCodewordsPerBlock, m = 0; m < p; m++)
              for (var b = 0, S = k; b < S.length; b++) {
                var z = S[b];
                z.codewords.push(t.shift());
              }
            if (u.ecBlocks.length > 1)
              for (var M = u.ecBlocks[0].numBlocks, R = u.ecBlocks[1].numBlocks, m = 0; m < R; m++)
                k[M + m].codewords.push(t.shift());
            for (; t.length > 0;)
              for (var I = 0, H = k; I < H.length; I++) {
                var z = H[I];
                z.codewords.push(t.shift());
              }
            return k;
          }
          function C(t) {
            var A = h(t);
            if (!A) return null;
            var F = i(t);
            if (!F) return null;
            var u = c(t, A, F),
              k = w(u, A, F.errorCorrectionLevel);
            if (!k) return null;
            for (
              var g = k.reduce(function (I, H) {
                  return I + H.numDataCodewords;
                }, 0),
                p = new Uint8ClampedArray(g),
                m = 0,
                b = 0,
                S = k;
              b < S.length;
              b++
            ) {
              var z = S[b],
                M = l.decode(z.codewords, z.codewords.length - z.numDataCodewords);
              if (!M) return null;
              for (var R = 0; R < z.numDataCodewords; R++) p[m++] = M[R];
            }
            try {
              return y.decode(p, A.versionNumber);
            } catch {
              return null;
            }
          }
          function n(t) {
            if (t == null) return null;
            var A = C(t);
            if (A) return A;
            for (var F = 0; F < t.width; F++)
              for (var u = F + 1; u < t.height; u++)
                t.get(F, u) !== t.get(u, F) &&
                  (t.set(F, u, !t.get(F, u)), t.set(u, F, !t.get(u, F)));
            return C(t);
          }
          e.decode = n;
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(7),
            y = f(8),
            l;
          (function (h) {
            ((h.Numeric = "numeric"),
              (h.Alphanumeric = "alphanumeric"),
              (h.Byte = "byte"),
              (h.Kanji = "kanji"),
              (h.ECI = "eci"));
          })((l = e.Mode || (e.Mode = {})));
          var v;
          (function (h) {
            ((h[(h.Terminator = 0)] = "Terminator"),
              (h[(h.Numeric = 1)] = "Numeric"),
              (h[(h.Alphanumeric = 2)] = "Alphanumeric"),
              (h[(h.Byte = 4)] = "Byte"),
              (h[(h.Kanji = 8)] = "Kanji"),
              (h[(h.ECI = 7)] = "ECI"));
          })(v || (v = {}));
          function E(h, i) {
            for (var w = [], C = "", n = [10, 12, 14][i], t = h.readBits(n); t >= 3;) {
              var A = h.readBits(10);
              if (A >= 1e3) throw new Error("Invalid numeric value above 999");
              var F = Math.floor(A / 100),
                u = Math.floor(A / 10) % 10,
                k = A % 10;
              (w.push(48 + F, 48 + u, 48 + k),
                (C += F.toString() + u.toString() + k.toString()),
                (t -= 3));
            }
            if (t === 2) {
              var A = h.readBits(7);
              if (A >= 100) throw new Error("Invalid numeric value above 99");
              var F = Math.floor(A / 10),
                u = A % 10;
              (w.push(48 + F, 48 + u), (C += F.toString() + u.toString()));
            } else if (t === 1) {
              var A = h.readBits(4);
              if (A >= 10) throw new Error("Invalid numeric value above 9");
              (w.push(48 + A), (C += A.toString()));
            }
            return { bytes: w, text: C };
          }
          var a = [
            "0",
            "1",
            "2",
            "3",
            "4",
            "5",
            "6",
            "7",
            "8",
            "9",
            "A",
            "B",
            "C",
            "D",
            "E",
            "F",
            "G",
            "H",
            "I",
            "J",
            "K",
            "L",
            "M",
            "N",
            "O",
            "P",
            "Q",
            "R",
            "S",
            "T",
            "U",
            "V",
            "W",
            "X",
            "Y",
            "Z",
            " ",
            "$",
            "%",
            "*",
            "+",
            "-",
            ".",
            "/",
            ":",
          ];
          function B(h, i) {
            for (var w = [], C = "", n = [9, 11, 13][i], t = h.readBits(n); t >= 2;) {
              var A = h.readBits(11),
                F = Math.floor(A / 45),
                u = A % 45;
              (w.push(a[F].charCodeAt(0), a[u].charCodeAt(0)), (C += a[F] + a[u]), (t -= 2));
            }
            if (t === 1) {
              var F = h.readBits(6);
              (w.push(a[F].charCodeAt(0)), (C += a[F]));
            }
            return { bytes: w, text: C };
          }
          function s(h, i) {
            for (var w = [], C = "", n = [8, 16, 16][i], t = h.readBits(n), A = 0; A < t; A++) {
              var F = h.readBits(8);
              w.push(F);
            }
            try {
              C += decodeURIComponent(
                w
                  .map(function (u) {
                    return "%" + ("0" + u.toString(16)).substr(-2);
                  })
                  .join(""),
              );
            } catch {}
            return { bytes: w, text: C };
          }
          function D(h, i) {
            for (var w = [], C = "", n = [8, 10, 12][i], t = h.readBits(n), A = 0; A < t; A++) {
              var F = h.readBits(13),
                u = (Math.floor(F / 192) << 8) | (F % 192);
              (u < 7936 ? (u += 33088) : (u += 49472),
                w.push(u >> 8, u & 255),
                (C += String.fromCharCode(y.shiftJISTable[u])));
            }
            return { bytes: w, text: C };
          }
          function c(h, i) {
            for (
              var w,
                C,
                n,
                t,
                A = new d.BitStream(h),
                F = i <= 9 ? 0 : i <= 26 ? 1 : 2,
                u = { text: "", bytes: [], chunks: [], version: i };
              A.available() >= 4;
            ) {
              var k = A.readBits(4);
              if (k === v.Terminator) return u;
              if (k === v.ECI)
                A.readBits(1) === 0
                  ? u.chunks.push({ type: l.ECI, assignmentNumber: A.readBits(7) })
                  : A.readBits(1) === 0
                    ? u.chunks.push({ type: l.ECI, assignmentNumber: A.readBits(14) })
                    : A.readBits(1) === 0
                      ? u.chunks.push({ type: l.ECI, assignmentNumber: A.readBits(21) })
                      : u.chunks.push({ type: l.ECI, assignmentNumber: -1 });
              else if (k === v.Numeric) {
                var g = E(A, F);
                ((u.text += g.text),
                  (w = u.bytes).push.apply(w, g.bytes),
                  u.chunks.push({ type: l.Numeric, text: g.text }));
              } else if (k === v.Alphanumeric) {
                var p = B(A, F);
                ((u.text += p.text),
                  (C = u.bytes).push.apply(C, p.bytes),
                  u.chunks.push({ type: l.Alphanumeric, text: p.text }));
              } else if (k === v.Byte) {
                var m = s(A, F);
                ((u.text += m.text),
                  (n = u.bytes).push.apply(n, m.bytes),
                  u.chunks.push({ type: l.Byte, bytes: m.bytes, text: m.text }));
              } else if (k === v.Kanji) {
                var b = D(A, F);
                ((u.text += b.text),
                  (t = u.bytes).push.apply(t, b.bytes),
                  u.chunks.push({ type: l.Kanji, bytes: b.bytes, text: b.text }));
              }
            }
            if (A.available() === 0 || A.readBits(A.available()) === 0) return u;
          }
          e.decode = c;
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = (function () {
            function y(l) {
              ((this.byteOffset = 0), (this.bitOffset = 0), (this.bytes = l));
            }
            return (
              (y.prototype.readBits = function (l) {
                if (l < 1 || l > 32 || l > this.available())
                  throw new Error("Cannot read " + l.toString() + " bits");
                var v = 0;
                if (this.bitOffset > 0) {
                  var E = 8 - this.bitOffset,
                    a = l < E ? l : E,
                    B = E - a,
                    s = (255 >> (8 - a)) << B;
                  ((v = (this.bytes[this.byteOffset] & s) >> B),
                    (l -= a),
                    (this.bitOffset += a),
                    this.bitOffset === 8 && ((this.bitOffset = 0), this.byteOffset++));
                }
                if (l > 0) {
                  for (; l >= 8;)
                    ((v = (v << 8) | (this.bytes[this.byteOffset] & 255)),
                      this.byteOffset++,
                      (l -= 8));
                  if (l > 0) {
                    var B = 8 - l,
                      s = (255 >> B) << B;
                    ((v = (v << l) | ((this.bytes[this.byteOffset] & s) >> B)),
                      (this.bitOffset += l));
                  }
                }
                return v;
              }),
              (y.prototype.available = function () {
                return 8 * (this.bytes.length - this.byteOffset) - this.bitOffset;
              }),
              y
            );
          })();
          e.BitStream = d;
        },
        function (x, e, f) {
          (Object.defineProperty(e, "__esModule", { value: !0 }),
            (e.shiftJISTable = {
              32: 32,
              33: 33,
              34: 34,
              35: 35,
              36: 36,
              37: 37,
              38: 38,
              39: 39,
              40: 40,
              41: 41,
              42: 42,
              43: 43,
              44: 44,
              45: 45,
              46: 46,
              47: 47,
              48: 48,
              49: 49,
              50: 50,
              51: 51,
              52: 52,
              53: 53,
              54: 54,
              55: 55,
              56: 56,
              57: 57,
              58: 58,
              59: 59,
              60: 60,
              61: 61,
              62: 62,
              63: 63,
              64: 64,
              65: 65,
              66: 66,
              67: 67,
              68: 68,
              69: 69,
              70: 70,
              71: 71,
              72: 72,
              73: 73,
              74: 74,
              75: 75,
              76: 76,
              77: 77,
              78: 78,
              79: 79,
              80: 80,
              81: 81,
              82: 82,
              83: 83,
              84: 84,
              85: 85,
              86: 86,
              87: 87,
              88: 88,
              89: 89,
              90: 90,
              91: 91,
              92: 165,
              93: 93,
              94: 94,
              95: 95,
              96: 96,
              97: 97,
              98: 98,
              99: 99,
              100: 100,
              101: 101,
              102: 102,
              103: 103,
              104: 104,
              105: 105,
              106: 106,
              107: 107,
              108: 108,
              109: 109,
              110: 110,
              111: 111,
              112: 112,
              113: 113,
              114: 114,
              115: 115,
              116: 116,
              117: 117,
              118: 118,
              119: 119,
              120: 120,
              121: 121,
              122: 122,
              123: 123,
              124: 124,
              125: 125,
              126: 8254,
              33088: 12288,
              33089: 12289,
              33090: 12290,
              33091: 65292,
              33092: 65294,
              33093: 12539,
              33094: 65306,
              33095: 65307,
              33096: 65311,
              33097: 65281,
              33098: 12443,
              33099: 12444,
              33100: 180,
              33101: 65344,
              33102: 168,
              33103: 65342,
              33104: 65507,
              33105: 65343,
              33106: 12541,
              33107: 12542,
              33108: 12445,
              33109: 12446,
              33110: 12291,
              33111: 20189,
              33112: 12293,
              33113: 12294,
              33114: 12295,
              33115: 12540,
              33116: 8213,
              33117: 8208,
              33118: 65295,
              33119: 92,
              33120: 12316,
              33121: 8214,
              33122: 65372,
              33123: 8230,
              33124: 8229,
              33125: 8216,
              33126: 8217,
              33127: 8220,
              33128: 8221,
              33129: 65288,
              33130: 65289,
              33131: 12308,
              33132: 12309,
              33133: 65339,
              33134: 65341,
              33135: 65371,
              33136: 65373,
              33137: 12296,
              33138: 12297,
              33139: 12298,
              33140: 12299,
              33141: 12300,
              33142: 12301,
              33143: 12302,
              33144: 12303,
              33145: 12304,
              33146: 12305,
              33147: 65291,
              33148: 8722,
              33149: 177,
              33150: 215,
              33152: 247,
              33153: 65309,
              33154: 8800,
              33155: 65308,
              33156: 65310,
              33157: 8806,
              33158: 8807,
              33159: 8734,
              33160: 8756,
              33161: 9794,
              33162: 9792,
              33163: 176,
              33164: 8242,
              33165: 8243,
              33166: 8451,
              33167: 65509,
              33168: 65284,
              33169: 162,
              33170: 163,
              33171: 65285,
              33172: 65283,
              33173: 65286,
              33174: 65290,
              33175: 65312,
              33176: 167,
              33177: 9734,
              33178: 9733,
              33179: 9675,
              33180: 9679,
              33181: 9678,
              33182: 9671,
              33183: 9670,
              33184: 9633,
              33185: 9632,
              33186: 9651,
              33187: 9650,
              33188: 9661,
              33189: 9660,
              33190: 8251,
              33191: 12306,
              33192: 8594,
              33193: 8592,
              33194: 8593,
              33195: 8595,
              33196: 12307,
              33208: 8712,
              33209: 8715,
              33210: 8838,
              33211: 8839,
              33212: 8834,
              33213: 8835,
              33214: 8746,
              33215: 8745,
              33224: 8743,
              33225: 8744,
              33226: 172,
              33227: 8658,
              33228: 8660,
              33229: 8704,
              33230: 8707,
              33242: 8736,
              33243: 8869,
              33244: 8978,
              33245: 8706,
              33246: 8711,
              33247: 8801,
              33248: 8786,
              33249: 8810,
              33250: 8811,
              33251: 8730,
              33252: 8765,
              33253: 8733,
              33254: 8757,
              33255: 8747,
              33256: 8748,
              33264: 8491,
              33265: 8240,
              33266: 9839,
              33267: 9837,
              33268: 9834,
              33269: 8224,
              33270: 8225,
              33271: 182,
              33276: 9711,
              33359: 65296,
              33360: 65297,
              33361: 65298,
              33362: 65299,
              33363: 65300,
              33364: 65301,
              33365: 65302,
              33366: 65303,
              33367: 65304,
              33368: 65305,
              33376: 65313,
              33377: 65314,
              33378: 65315,
              33379: 65316,
              33380: 65317,
              33381: 65318,
              33382: 65319,
              33383: 65320,
              33384: 65321,
              33385: 65322,
              33386: 65323,
              33387: 65324,
              33388: 65325,
              33389: 65326,
              33390: 65327,
              33391: 65328,
              33392: 65329,
              33393: 65330,
              33394: 65331,
              33395: 65332,
              33396: 65333,
              33397: 65334,
              33398: 65335,
              33399: 65336,
              33400: 65337,
              33401: 65338,
              33409: 65345,
              33410: 65346,
              33411: 65347,
              33412: 65348,
              33413: 65349,
              33414: 65350,
              33415: 65351,
              33416: 65352,
              33417: 65353,
              33418: 65354,
              33419: 65355,
              33420: 65356,
              33421: 65357,
              33422: 65358,
              33423: 65359,
              33424: 65360,
              33425: 65361,
              33426: 65362,
              33427: 65363,
              33428: 65364,
              33429: 65365,
              33430: 65366,
              33431: 65367,
              33432: 65368,
              33433: 65369,
              33434: 65370,
              33439: 12353,
              33440: 12354,
              33441: 12355,
              33442: 12356,
              33443: 12357,
              33444: 12358,
              33445: 12359,
              33446: 12360,
              33447: 12361,
              33448: 12362,
              33449: 12363,
              33450: 12364,
              33451: 12365,
              33452: 12366,
              33453: 12367,
              33454: 12368,
              33455: 12369,
              33456: 12370,
              33457: 12371,
              33458: 12372,
              33459: 12373,
              33460: 12374,
              33461: 12375,
              33462: 12376,
              33463: 12377,
              33464: 12378,
              33465: 12379,
              33466: 12380,
              33467: 12381,
              33468: 12382,
              33469: 12383,
              33470: 12384,
              33471: 12385,
              33472: 12386,
              33473: 12387,
              33474: 12388,
              33475: 12389,
              33476: 12390,
              33477: 12391,
              33478: 12392,
              33479: 12393,
              33480: 12394,
              33481: 12395,
              33482: 12396,
              33483: 12397,
              33484: 12398,
              33485: 12399,
              33486: 12400,
              33487: 12401,
              33488: 12402,
              33489: 12403,
              33490: 12404,
              33491: 12405,
              33492: 12406,
              33493: 12407,
              33494: 12408,
              33495: 12409,
              33496: 12410,
              33497: 12411,
              33498: 12412,
              33499: 12413,
              33500: 12414,
              33501: 12415,
              33502: 12416,
              33503: 12417,
              33504: 12418,
              33505: 12419,
              33506: 12420,
              33507: 12421,
              33508: 12422,
              33509: 12423,
              33510: 12424,
              33511: 12425,
              33512: 12426,
              33513: 12427,
              33514: 12428,
              33515: 12429,
              33516: 12430,
              33517: 12431,
              33518: 12432,
              33519: 12433,
              33520: 12434,
              33521: 12435,
              33600: 12449,
              33601: 12450,
              33602: 12451,
              33603: 12452,
              33604: 12453,
              33605: 12454,
              33606: 12455,
              33607: 12456,
              33608: 12457,
              33609: 12458,
              33610: 12459,
              33611: 12460,
              33612: 12461,
              33613: 12462,
              33614: 12463,
              33615: 12464,
              33616: 12465,
              33617: 12466,
              33618: 12467,
              33619: 12468,
              33620: 12469,
              33621: 12470,
              33622: 12471,
              33623: 12472,
              33624: 12473,
              33625: 12474,
              33626: 12475,
              33627: 12476,
              33628: 12477,
              33629: 12478,
              33630: 12479,
              33631: 12480,
              33632: 12481,
              33633: 12482,
              33634: 12483,
              33635: 12484,
              33636: 12485,
              33637: 12486,
              33638: 12487,
              33639: 12488,
              33640: 12489,
              33641: 12490,
              33642: 12491,
              33643: 12492,
              33644: 12493,
              33645: 12494,
              33646: 12495,
              33647: 12496,
              33648: 12497,
              33649: 12498,
              33650: 12499,
              33651: 12500,
              33652: 12501,
              33653: 12502,
              33654: 12503,
              33655: 12504,
              33656: 12505,
              33657: 12506,
              33658: 12507,
              33659: 12508,
              33660: 12509,
              33661: 12510,
              33662: 12511,
              33664: 12512,
              33665: 12513,
              33666: 12514,
              33667: 12515,
              33668: 12516,
              33669: 12517,
              33670: 12518,
              33671: 12519,
              33672: 12520,
              33673: 12521,
              33674: 12522,
              33675: 12523,
              33676: 12524,
              33677: 12525,
              33678: 12526,
              33679: 12527,
              33680: 12528,
              33681: 12529,
              33682: 12530,
              33683: 12531,
              33684: 12532,
              33685: 12533,
              33686: 12534,
              33695: 913,
              33696: 914,
              33697: 915,
              33698: 916,
              33699: 917,
              33700: 918,
              33701: 919,
              33702: 920,
              33703: 921,
              33704: 922,
              33705: 923,
              33706: 924,
              33707: 925,
              33708: 926,
              33709: 927,
              33710: 928,
              33711: 929,
              33712: 931,
              33713: 932,
              33714: 933,
              33715: 934,
              33716: 935,
              33717: 936,
              33718: 937,
              33727: 945,
              33728: 946,
              33729: 947,
              33730: 948,
              33731: 949,
              33732: 950,
              33733: 951,
              33734: 952,
              33735: 953,
              33736: 954,
              33737: 955,
              33738: 956,
              33739: 957,
              33740: 958,
              33741: 959,
              33742: 960,
              33743: 961,
              33744: 963,
              33745: 964,
              33746: 965,
              33747: 966,
              33748: 967,
              33749: 968,
              33750: 969,
              33856: 1040,
              33857: 1041,
              33858: 1042,
              33859: 1043,
              33860: 1044,
              33861: 1045,
              33862: 1025,
              33863: 1046,
              33864: 1047,
              33865: 1048,
              33866: 1049,
              33867: 1050,
              33868: 1051,
              33869: 1052,
              33870: 1053,
              33871: 1054,
              33872: 1055,
              33873: 1056,
              33874: 1057,
              33875: 1058,
              33876: 1059,
              33877: 1060,
              33878: 1061,
              33879: 1062,
              33880: 1063,
              33881: 1064,
              33882: 1065,
              33883: 1066,
              33884: 1067,
              33885: 1068,
              33886: 1069,
              33887: 1070,
              33888: 1071,
              33904: 1072,
              33905: 1073,
              33906: 1074,
              33907: 1075,
              33908: 1076,
              33909: 1077,
              33910: 1105,
              33911: 1078,
              33912: 1079,
              33913: 1080,
              33914: 1081,
              33915: 1082,
              33916: 1083,
              33917: 1084,
              33918: 1085,
              33920: 1086,
              33921: 1087,
              33922: 1088,
              33923: 1089,
              33924: 1090,
              33925: 1091,
              33926: 1092,
              33927: 1093,
              33928: 1094,
              33929: 1095,
              33930: 1096,
              33931: 1097,
              33932: 1098,
              33933: 1099,
              33934: 1100,
              33935: 1101,
              33936: 1102,
              33937: 1103,
              33951: 9472,
              33952: 9474,
              33953: 9484,
              33954: 9488,
              33955: 9496,
              33956: 9492,
              33957: 9500,
              33958: 9516,
              33959: 9508,
              33960: 9524,
              33961: 9532,
              33962: 9473,
              33963: 9475,
              33964: 9487,
              33965: 9491,
              33966: 9499,
              33967: 9495,
              33968: 9507,
              33969: 9523,
              33970: 9515,
              33971: 9531,
              33972: 9547,
              33973: 9504,
              33974: 9519,
              33975: 9512,
              33976: 9527,
              33977: 9535,
              33978: 9501,
              33979: 9520,
              33980: 9509,
              33981: 9528,
              33982: 9538,
              34975: 20124,
              34976: 21782,
              34977: 23043,
              34978: 38463,
              34979: 21696,
              34980: 24859,
              34981: 25384,
              34982: 23030,
              34983: 36898,
              34984: 33909,
              34985: 33564,
              34986: 31312,
              34987: 24746,
              34988: 25569,
              34989: 28197,
              34990: 26093,
              34991: 33894,
              34992: 33446,
              34993: 39925,
              34994: 26771,
              34995: 22311,
              34996: 26017,
              34997: 25201,
              34998: 23451,
              34999: 22992,
              35e3: 34427,
              35001: 39156,
              35002: 32098,
              35003: 32190,
              35004: 39822,
              35005: 25110,
              35006: 31903,
              35007: 34999,
              35008: 23433,
              35009: 24245,
              35010: 25353,
              35011: 26263,
              35012: 26696,
              35013: 38343,
              35014: 38797,
              35015: 26447,
              35016: 20197,
              35017: 20234,
              35018: 20301,
              35019: 20381,
              35020: 20553,
              35021: 22258,
              35022: 22839,
              35023: 22996,
              35024: 23041,
              35025: 23561,
              35026: 24799,
              35027: 24847,
              35028: 24944,
              35029: 26131,
              35030: 26885,
              35031: 28858,
              35032: 30031,
              35033: 30064,
              35034: 31227,
              35035: 32173,
              35036: 32239,
              35037: 32963,
              35038: 33806,
              35039: 34915,
              35040: 35586,
              35041: 36949,
              35042: 36986,
              35043: 21307,
              35044: 20117,
              35045: 20133,
              35046: 22495,
              35047: 32946,
              35048: 37057,
              35049: 30959,
              35050: 19968,
              35051: 22769,
              35052: 28322,
              35053: 36920,
              35054: 31282,
              35055: 33576,
              35056: 33419,
              35057: 39983,
              35058: 20801,
              35059: 21360,
              35060: 21693,
              35061: 21729,
              35062: 22240,
              35063: 23035,
              35064: 24341,
              35065: 39154,
              35066: 28139,
              35067: 32996,
              35068: 34093,
              35136: 38498,
              35137: 38512,
              35138: 38560,
              35139: 38907,
              35140: 21515,
              35141: 21491,
              35142: 23431,
              35143: 28879,
              35144: 32701,
              35145: 36802,
              35146: 38632,
              35147: 21359,
              35148: 40284,
              35149: 31418,
              35150: 19985,
              35151: 30867,
              35152: 33276,
              35153: 28198,
              35154: 22040,
              35155: 21764,
              35156: 27421,
              35157: 34074,
              35158: 39995,
              35159: 23013,
              35160: 21417,
              35161: 28006,
              35162: 29916,
              35163: 38287,
              35164: 22082,
              35165: 20113,
              35166: 36939,
              35167: 38642,
              35168: 33615,
              35169: 39180,
              35170: 21473,
              35171: 21942,
              35172: 23344,
              35173: 24433,
              35174: 26144,
              35175: 26355,
              35176: 26628,
              35177: 27704,
              35178: 27891,
              35179: 27945,
              35180: 29787,
              35181: 30408,
              35182: 31310,
              35183: 38964,
              35184: 33521,
              35185: 34907,
              35186: 35424,
              35187: 37613,
              35188: 28082,
              35189: 30123,
              35190: 30410,
              35191: 39365,
              35192: 24742,
              35193: 35585,
              35194: 36234,
              35195: 38322,
              35196: 27022,
              35197: 21421,
              35198: 20870,
              35200: 22290,
              35201: 22576,
              35202: 22852,
              35203: 23476,
              35204: 24310,
              35205: 24616,
              35206: 25513,
              35207: 25588,
              35208: 27839,
              35209: 28436,
              35210: 28814,
              35211: 28948,
              35212: 29017,
              35213: 29141,
              35214: 29503,
              35215: 32257,
              35216: 33398,
              35217: 33489,
              35218: 34199,
              35219: 36960,
              35220: 37467,
              35221: 40219,
              35222: 22633,
              35223: 26044,
              35224: 27738,
              35225: 29989,
              35226: 20985,
              35227: 22830,
              35228: 22885,
              35229: 24448,
              35230: 24540,
              35231: 25276,
              35232: 26106,
              35233: 27178,
              35234: 27431,
              35235: 27572,
              35236: 29579,
              35237: 32705,
              35238: 35158,
              35239: 40236,
              35240: 40206,
              35241: 40644,
              35242: 23713,
              35243: 27798,
              35244: 33659,
              35245: 20740,
              35246: 23627,
              35247: 25014,
              35248: 33222,
              35249: 26742,
              35250: 29281,
              35251: 20057,
              35252: 20474,
              35253: 21368,
              35254: 24681,
              35255: 28201,
              35256: 31311,
              35257: 38899,
              35258: 19979,
              35259: 21270,
              35260: 20206,
              35261: 20309,
              35262: 20285,
              35263: 20385,
              35264: 20339,
              35265: 21152,
              35266: 21487,
              35267: 22025,
              35268: 22799,
              35269: 23233,
              35270: 23478,
              35271: 23521,
              35272: 31185,
              35273: 26247,
              35274: 26524,
              35275: 26550,
              35276: 27468,
              35277: 27827,
              35278: 28779,
              35279: 29634,
              35280: 31117,
              35281: 31166,
              35282: 31292,
              35283: 31623,
              35284: 33457,
              35285: 33499,
              35286: 33540,
              35287: 33655,
              35288: 33775,
              35289: 33747,
              35290: 34662,
              35291: 35506,
              35292: 22057,
              35293: 36008,
              35294: 36838,
              35295: 36942,
              35296: 38686,
              35297: 34442,
              35298: 20420,
              35299: 23784,
              35300: 25105,
              35301: 29273,
              35302: 30011,
              35303: 33253,
              35304: 33469,
              35305: 34558,
              35306: 36032,
              35307: 38597,
              35308: 39187,
              35309: 39381,
              35310: 20171,
              35311: 20250,
              35312: 35299,
              35313: 22238,
              35314: 22602,
              35315: 22730,
              35316: 24315,
              35317: 24555,
              35318: 24618,
              35319: 24724,
              35320: 24674,
              35321: 25040,
              35322: 25106,
              35323: 25296,
              35324: 25913,
              35392: 39745,
              35393: 26214,
              35394: 26800,
              35395: 28023,
              35396: 28784,
              35397: 30028,
              35398: 30342,
              35399: 32117,
              35400: 33445,
              35401: 34809,
              35402: 38283,
              35403: 38542,
              35404: 35997,
              35405: 20977,
              35406: 21182,
              35407: 22806,
              35408: 21683,
              35409: 23475,
              35410: 23830,
              35411: 24936,
              35412: 27010,
              35413: 28079,
              35414: 30861,
              35415: 33995,
              35416: 34903,
              35417: 35442,
              35418: 37799,
              35419: 39608,
              35420: 28012,
              35421: 39336,
              35422: 34521,
              35423: 22435,
              35424: 26623,
              35425: 34510,
              35426: 37390,
              35427: 21123,
              35428: 22151,
              35429: 21508,
              35430: 24275,
              35431: 25313,
              35432: 25785,
              35433: 26684,
              35434: 26680,
              35435: 27579,
              35436: 29554,
              35437: 30906,
              35438: 31339,
              35439: 35226,
              35440: 35282,
              35441: 36203,
              35442: 36611,
              35443: 37101,
              35444: 38307,
              35445: 38548,
              35446: 38761,
              35447: 23398,
              35448: 23731,
              35449: 27005,
              35450: 38989,
              35451: 38990,
              35452: 25499,
              35453: 31520,
              35454: 27179,
              35456: 27263,
              35457: 26806,
              35458: 39949,
              35459: 28511,
              35460: 21106,
              35461: 21917,
              35462: 24688,
              35463: 25324,
              35464: 27963,
              35465: 28167,
              35466: 28369,
              35467: 33883,
              35468: 35088,
              35469: 36676,
              35470: 19988,
              35471: 39993,
              35472: 21494,
              35473: 26907,
              35474: 27194,
              35475: 38788,
              35476: 26666,
              35477: 20828,
              35478: 31427,
              35479: 33970,
              35480: 37340,
              35481: 37772,
              35482: 22107,
              35483: 40232,
              35484: 26658,
              35485: 33541,
              35486: 33841,
              35487: 31909,
              35488: 21e3,
              35489: 33477,
              35490: 29926,
              35491: 20094,
              35492: 20355,
              35493: 20896,
              35494: 23506,
              35495: 21002,
              35496: 21208,
              35497: 21223,
              35498: 24059,
              35499: 21914,
              35500: 22570,
              35501: 23014,
              35502: 23436,
              35503: 23448,
              35504: 23515,
              35505: 24178,
              35506: 24185,
              35507: 24739,
              35508: 24863,
              35509: 24931,
              35510: 25022,
              35511: 25563,
              35512: 25954,
              35513: 26577,
              35514: 26707,
              35515: 26874,
              35516: 27454,
              35517: 27475,
              35518: 27735,
              35519: 28450,
              35520: 28567,
              35521: 28485,
              35522: 29872,
              35523: 29976,
              35524: 30435,
              35525: 30475,
              35526: 31487,
              35527: 31649,
              35528: 31777,
              35529: 32233,
              35530: 32566,
              35531: 32752,
              35532: 32925,
              35533: 33382,
              35534: 33694,
              35535: 35251,
              35536: 35532,
              35537: 36011,
              35538: 36996,
              35539: 37969,
              35540: 38291,
              35541: 38289,
              35542: 38306,
              35543: 38501,
              35544: 38867,
              35545: 39208,
              35546: 33304,
              35547: 20024,
              35548: 21547,
              35549: 23736,
              35550: 24012,
              35551: 29609,
              35552: 30284,
              35553: 30524,
              35554: 23721,
              35555: 32747,
              35556: 36107,
              35557: 38593,
              35558: 38929,
              35559: 38996,
              35560: 39e3,
              35561: 20225,
              35562: 20238,
              35563: 21361,
              35564: 21916,
              35565: 22120,
              35566: 22522,
              35567: 22855,
              35568: 23305,
              35569: 23492,
              35570: 23696,
              35571: 24076,
              35572: 24190,
              35573: 24524,
              35574: 25582,
              35575: 26426,
              35576: 26071,
              35577: 26082,
              35578: 26399,
              35579: 26827,
              35580: 26820,
              35648: 27231,
              35649: 24112,
              35650: 27589,
              35651: 27671,
              35652: 27773,
              35653: 30079,
              35654: 31048,
              35655: 23395,
              35656: 31232,
              35657: 32e3,
              35658: 24509,
              35659: 35215,
              35660: 35352,
              35661: 36020,
              35662: 36215,
              35663: 36556,
              35664: 36637,
              35665: 39138,
              35666: 39438,
              35667: 39740,
              35668: 20096,
              35669: 20605,
              35670: 20736,
              35671: 22931,
              35672: 23452,
              35673: 25135,
              35674: 25216,
              35675: 25836,
              35676: 27450,
              35677: 29344,
              35678: 30097,
              35679: 31047,
              35680: 32681,
              35681: 34811,
              35682: 35516,
              35683: 35696,
              35684: 25516,
              35685: 33738,
              35686: 38816,
              35687: 21513,
              35688: 21507,
              35689: 21931,
              35690: 26708,
              35691: 27224,
              35692: 35440,
              35693: 30759,
              35694: 26485,
              35695: 40653,
              35696: 21364,
              35697: 23458,
              35698: 33050,
              35699: 34384,
              35700: 36870,
              35701: 19992,
              35702: 20037,
              35703: 20167,
              35704: 20241,
              35705: 21450,
              35706: 21560,
              35707: 23470,
              35708: 24339,
              35709: 24613,
              35710: 25937,
              35712: 26429,
              35713: 27714,
              35714: 27762,
              35715: 27875,
              35716: 28792,
              35717: 29699,
              35718: 31350,
              35719: 31406,
              35720: 31496,
              35721: 32026,
              35722: 31998,
              35723: 32102,
              35724: 26087,
              35725: 29275,
              35726: 21435,
              35727: 23621,
              35728: 24040,
              35729: 25298,
              35730: 25312,
              35731: 25369,
              35732: 28192,
              35733: 34394,
              35734: 35377,
              35735: 36317,
              35736: 37624,
              35737: 28417,
              35738: 31142,
              35739: 39770,
              35740: 20136,
              35741: 20139,
              35742: 20140,
              35743: 20379,
              35744: 20384,
              35745: 20689,
              35746: 20807,
              35747: 31478,
              35748: 20849,
              35749: 20982,
              35750: 21332,
              35751: 21281,
              35752: 21375,
              35753: 21483,
              35754: 21932,
              35755: 22659,
              35756: 23777,
              35757: 24375,
              35758: 24394,
              35759: 24623,
              35760: 24656,
              35761: 24685,
              35762: 25375,
              35763: 25945,
              35764: 27211,
              35765: 27841,
              35766: 29378,
              35767: 29421,
              35768: 30703,
              35769: 33016,
              35770: 33029,
              35771: 33288,
              35772: 34126,
              35773: 37111,
              35774: 37857,
              35775: 38911,
              35776: 39255,
              35777: 39514,
              35778: 20208,
              35779: 20957,
              35780: 23597,
              35781: 26241,
              35782: 26989,
              35783: 23616,
              35784: 26354,
              35785: 26997,
              35786: 29577,
              35787: 26704,
              35788: 31873,
              35789: 20677,
              35790: 21220,
              35791: 22343,
              35792: 24062,
              35793: 37670,
              35794: 26020,
              35795: 27427,
              35796: 27453,
              35797: 29748,
              35798: 31105,
              35799: 31165,
              35800: 31563,
              35801: 32202,
              35802: 33465,
              35803: 33740,
              35804: 34943,
              35805: 35167,
              35806: 35641,
              35807: 36817,
              35808: 37329,
              35809: 21535,
              35810: 37504,
              35811: 20061,
              35812: 20534,
              35813: 21477,
              35814: 21306,
              35815: 29399,
              35816: 29590,
              35817: 30697,
              35818: 33510,
              35819: 36527,
              35820: 39366,
              35821: 39368,
              35822: 39378,
              35823: 20855,
              35824: 24858,
              35825: 34398,
              35826: 21936,
              35827: 31354,
              35828: 20598,
              35829: 23507,
              35830: 36935,
              35831: 38533,
              35832: 20018,
              35833: 27355,
              35834: 37351,
              35835: 23633,
              35836: 23624,
              35904: 25496,
              35905: 31391,
              35906: 27795,
              35907: 38772,
              35908: 36705,
              35909: 31402,
              35910: 29066,
              35911: 38536,
              35912: 31874,
              35913: 26647,
              35914: 32368,
              35915: 26705,
              35916: 37740,
              35917: 21234,
              35918: 21531,
              35919: 34219,
              35920: 35347,
              35921: 32676,
              35922: 36557,
              35923: 37089,
              35924: 21350,
              35925: 34952,
              35926: 31041,
              35927: 20418,
              35928: 20670,
              35929: 21009,
              35930: 20804,
              35931: 21843,
              35932: 22317,
              35933: 29674,
              35934: 22411,
              35935: 22865,
              35936: 24418,
              35937: 24452,
              35938: 24693,
              35939: 24950,
              35940: 24935,
              35941: 25001,
              35942: 25522,
              35943: 25658,
              35944: 25964,
              35945: 26223,
              35946: 26690,
              35947: 28179,
              35948: 30054,
              35949: 31293,
              35950: 31995,
              35951: 32076,
              35952: 32153,
              35953: 32331,
              35954: 32619,
              35955: 33550,
              35956: 33610,
              35957: 34509,
              35958: 35336,
              35959: 35427,
              35960: 35686,
              35961: 36605,
              35962: 38938,
              35963: 40335,
              35964: 33464,
              35965: 36814,
              35966: 39912,
              35968: 21127,
              35969: 25119,
              35970: 25731,
              35971: 28608,
              35972: 38553,
              35973: 26689,
              35974: 20625,
              35975: 27424,
              35976: 27770,
              35977: 28500,
              35978: 31348,
              35979: 32080,
              35980: 34880,
              35981: 35363,
              35982: 26376,
              35983: 20214,
              35984: 20537,
              35985: 20518,
              35986: 20581,
              35987: 20860,
              35988: 21048,
              35989: 21091,
              35990: 21927,
              35991: 22287,
              35992: 22533,
              35993: 23244,
              35994: 24314,
              35995: 25010,
              35996: 25080,
              35997: 25331,
              35998: 25458,
              35999: 26908,
              36e3: 27177,
              36001: 29309,
              36002: 29356,
              36003: 29486,
              36004: 30740,
              36005: 30831,
              36006: 32121,
              36007: 30476,
              36008: 32937,
              36009: 35211,
              36010: 35609,
              36011: 36066,
              36012: 36562,
              36013: 36963,
              36014: 37749,
              36015: 38522,
              36016: 38997,
              36017: 39443,
              36018: 40568,
              36019: 20803,
              36020: 21407,
              36021: 21427,
              36022: 24187,
              36023: 24358,
              36024: 28187,
              36025: 28304,
              36026: 29572,
              36027: 29694,
              36028: 32067,
              36029: 33335,
              36030: 35328,
              36031: 35578,
              36032: 38480,
              36033: 20046,
              36034: 20491,
              36035: 21476,
              36036: 21628,
              36037: 22266,
              36038: 22993,
              36039: 23396,
              36040: 24049,
              36041: 24235,
              36042: 24359,
              36043: 25144,
              36044: 25925,
              36045: 26543,
              36046: 28246,
              36047: 29392,
              36048: 31946,
              36049: 34996,
              36050: 32929,
              36051: 32993,
              36052: 33776,
              36053: 34382,
              36054: 35463,
              36055: 36328,
              36056: 37431,
              36057: 38599,
              36058: 39015,
              36059: 40723,
              36060: 20116,
              36061: 20114,
              36062: 20237,
              36063: 21320,
              36064: 21577,
              36065: 21566,
              36066: 23087,
              36067: 24460,
              36068: 24481,
              36069: 24735,
              36070: 26791,
              36071: 27278,
              36072: 29786,
              36073: 30849,
              36074: 35486,
              36075: 35492,
              36076: 35703,
              36077: 37264,
              36078: 20062,
              36079: 39881,
              36080: 20132,
              36081: 20348,
              36082: 20399,
              36083: 20505,
              36084: 20502,
              36085: 20809,
              36086: 20844,
              36087: 21151,
              36088: 21177,
              36089: 21246,
              36090: 21402,
              36091: 21475,
              36092: 21521,
              36160: 21518,
              36161: 21897,
              36162: 22353,
              36163: 22434,
              36164: 22909,
              36165: 23380,
              36166: 23389,
              36167: 23439,
              36168: 24037,
              36169: 24039,
              36170: 24055,
              36171: 24184,
              36172: 24195,
              36173: 24218,
              36174: 24247,
              36175: 24344,
              36176: 24658,
              36177: 24908,
              36178: 25239,
              36179: 25304,
              36180: 25511,
              36181: 25915,
              36182: 26114,
              36183: 26179,
              36184: 26356,
              36185: 26477,
              36186: 26657,
              36187: 26775,
              36188: 27083,
              36189: 27743,
              36190: 27946,
              36191: 28009,
              36192: 28207,
              36193: 28317,
              36194: 30002,
              36195: 30343,
              36196: 30828,
              36197: 31295,
              36198: 31968,
              36199: 32005,
              36200: 32024,
              36201: 32094,
              36202: 32177,
              36203: 32789,
              36204: 32771,
              36205: 32943,
              36206: 32945,
              36207: 33108,
              36208: 33167,
              36209: 33322,
              36210: 33618,
              36211: 34892,
              36212: 34913,
              36213: 35611,
              36214: 36002,
              36215: 36092,
              36216: 37066,
              36217: 37237,
              36218: 37489,
              36219: 30783,
              36220: 37628,
              36221: 38308,
              36222: 38477,
              36224: 38917,
              36225: 39321,
              36226: 39640,
              36227: 40251,
              36228: 21083,
              36229: 21163,
              36230: 21495,
              36231: 21512,
              36232: 22741,
              36233: 25335,
              36234: 28640,
              36235: 35946,
              36236: 36703,
              36237: 40633,
              36238: 20811,
              36239: 21051,
              36240: 21578,
              36241: 22269,
              36242: 31296,
              36243: 37239,
              36244: 40288,
              36245: 40658,
              36246: 29508,
              36247: 28425,
              36248: 33136,
              36249: 29969,
              36250: 24573,
              36251: 24794,
              36252: 39592,
              36253: 29403,
              36254: 36796,
              36255: 27492,
              36256: 38915,
              36257: 20170,
              36258: 22256,
              36259: 22372,
              36260: 22718,
              36261: 23130,
              36262: 24680,
              36263: 25031,
              36264: 26127,
              36265: 26118,
              36266: 26681,
              36267: 26801,
              36268: 28151,
              36269: 30165,
              36270: 32058,
              36271: 33390,
              36272: 39746,
              36273: 20123,
              36274: 20304,
              36275: 21449,
              36276: 21766,
              36277: 23919,
              36278: 24038,
              36279: 24046,
              36280: 26619,
              36281: 27801,
              36282: 29811,
              36283: 30722,
              36284: 35408,
              36285: 37782,
              36286: 35039,
              36287: 22352,
              36288: 24231,
              36289: 25387,
              36290: 20661,
              36291: 20652,
              36292: 20877,
              36293: 26368,
              36294: 21705,
              36295: 22622,
              36296: 22971,
              36297: 23472,
              36298: 24425,
              36299: 25165,
              36300: 25505,
              36301: 26685,
              36302: 27507,
              36303: 28168,
              36304: 28797,
              36305: 37319,
              36306: 29312,
              36307: 30741,
              36308: 30758,
              36309: 31085,
              36310: 25998,
              36311: 32048,
              36312: 33756,
              36313: 35009,
              36314: 36617,
              36315: 38555,
              36316: 21092,
              36317: 22312,
              36318: 26448,
              36319: 32618,
              36320: 36001,
              36321: 20916,
              36322: 22338,
              36323: 38442,
              36324: 22586,
              36325: 27018,
              36326: 32948,
              36327: 21682,
              36328: 23822,
              36329: 22524,
              36330: 30869,
              36331: 40442,
              36332: 20316,
              36333: 21066,
              36334: 21643,
              36335: 25662,
              36336: 26152,
              36337: 26388,
              36338: 26613,
              36339: 31364,
              36340: 31574,
              36341: 32034,
              36342: 37679,
              36343: 26716,
              36344: 39853,
              36345: 31545,
              36346: 21273,
              36347: 20874,
              36348: 21047,
              36416: 23519,
              36417: 25334,
              36418: 25774,
              36419: 25830,
              36420: 26413,
              36421: 27578,
              36422: 34217,
              36423: 38609,
              36424: 30352,
              36425: 39894,
              36426: 25420,
              36427: 37638,
              36428: 39851,
              36429: 30399,
              36430: 26194,
              36431: 19977,
              36432: 20632,
              36433: 21442,
              36434: 23665,
              36435: 24808,
              36436: 25746,
              36437: 25955,
              36438: 26719,
              36439: 29158,
              36440: 29642,
              36441: 29987,
              36442: 31639,
              36443: 32386,
              36444: 34453,
              36445: 35715,
              36446: 36059,
              36447: 37240,
              36448: 39184,
              36449: 26028,
              36450: 26283,
              36451: 27531,
              36452: 20181,
              36453: 20180,
              36454: 20282,
              36455: 20351,
              36456: 21050,
              36457: 21496,
              36458: 21490,
              36459: 21987,
              36460: 22235,
              36461: 22763,
              36462: 22987,
              36463: 22985,
              36464: 23039,
              36465: 23376,
              36466: 23629,
              36467: 24066,
              36468: 24107,
              36469: 24535,
              36470: 24605,
              36471: 25351,
              36472: 25903,
              36473: 23388,
              36474: 26031,
              36475: 26045,
              36476: 26088,
              36477: 26525,
              36478: 27490,
              36480: 27515,
              36481: 27663,
              36482: 29509,
              36483: 31049,
              36484: 31169,
              36485: 31992,
              36486: 32025,
              36487: 32043,
              36488: 32930,
              36489: 33026,
              36490: 33267,
              36491: 35222,
              36492: 35422,
              36493: 35433,
              36494: 35430,
              36495: 35468,
              36496: 35566,
              36497: 36039,
              36498: 36060,
              36499: 38604,
              36500: 39164,
              36501: 27503,
              36502: 20107,
              36503: 20284,
              36504: 20365,
              36505: 20816,
              36506: 23383,
              36507: 23546,
              36508: 24904,
              36509: 25345,
              36510: 26178,
              36511: 27425,
              36512: 28363,
              36513: 27835,
              36514: 29246,
              36515: 29885,
              36516: 30164,
              36517: 30913,
              36518: 31034,
              36519: 32780,
              36520: 32819,
              36521: 33258,
              36522: 33940,
              36523: 36766,
              36524: 27728,
              36525: 40575,
              36526: 24335,
              36527: 35672,
              36528: 40235,
              36529: 31482,
              36530: 36600,
              36531: 23437,
              36532: 38635,
              36533: 19971,
              36534: 21489,
              36535: 22519,
              36536: 22833,
              36537: 23241,
              36538: 23460,
              36539: 24713,
              36540: 28287,
              36541: 28422,
              36542: 30142,
              36543: 36074,
              36544: 23455,
              36545: 34048,
              36546: 31712,
              36547: 20594,
              36548: 26612,
              36549: 33437,
              36550: 23649,
              36551: 34122,
              36552: 32286,
              36553: 33294,
              36554: 20889,
              36555: 23556,
              36556: 25448,
              36557: 36198,
              36558: 26012,
              36559: 29038,
              36560: 31038,
              36561: 32023,
              36562: 32773,
              36563: 35613,
              36564: 36554,
              36565: 36974,
              36566: 34503,
              36567: 37034,
              36568: 20511,
              36569: 21242,
              36570: 23610,
              36571: 26451,
              36572: 28796,
              36573: 29237,
              36574: 37196,
              36575: 37320,
              36576: 37675,
              36577: 33509,
              36578: 23490,
              36579: 24369,
              36580: 24825,
              36581: 20027,
              36582: 21462,
              36583: 23432,
              36584: 25163,
              36585: 26417,
              36586: 27530,
              36587: 29417,
              36588: 29664,
              36589: 31278,
              36590: 33131,
              36591: 36259,
              36592: 37202,
              36593: 39318,
              36594: 20754,
              36595: 21463,
              36596: 21610,
              36597: 23551,
              36598: 25480,
              36599: 27193,
              36600: 32172,
              36601: 38656,
              36602: 22234,
              36603: 21454,
              36604: 21608,
              36672: 23447,
              36673: 23601,
              36674: 24030,
              36675: 20462,
              36676: 24833,
              36677: 25342,
              36678: 27954,
              36679: 31168,
              36680: 31179,
              36681: 32066,
              36682: 32333,
              36683: 32722,
              36684: 33261,
              36685: 33311,
              36686: 33936,
              36687: 34886,
              36688: 35186,
              36689: 35728,
              36690: 36468,
              36691: 36655,
              36692: 36913,
              36693: 37195,
              36694: 37228,
              36695: 38598,
              36696: 37276,
              36697: 20160,
              36698: 20303,
              36699: 20805,
              36700: 21313,
              36701: 24467,
              36702: 25102,
              36703: 26580,
              36704: 27713,
              36705: 28171,
              36706: 29539,
              36707: 32294,
              36708: 37325,
              36709: 37507,
              36710: 21460,
              36711: 22809,
              36712: 23487,
              36713: 28113,
              36714: 31069,
              36715: 32302,
              36716: 31899,
              36717: 22654,
              36718: 29087,
              36719: 20986,
              36720: 34899,
              36721: 36848,
              36722: 20426,
              36723: 23803,
              36724: 26149,
              36725: 30636,
              36726: 31459,
              36727: 33308,
              36728: 39423,
              36729: 20934,
              36730: 24490,
              36731: 26092,
              36732: 26991,
              36733: 27529,
              36734: 28147,
              36736: 28310,
              36737: 28516,
              36738: 30462,
              36739: 32020,
              36740: 24033,
              36741: 36981,
              36742: 37255,
              36743: 38918,
              36744: 20966,
              36745: 21021,
              36746: 25152,
              36747: 26257,
              36748: 26329,
              36749: 28186,
              36750: 24246,
              36751: 32210,
              36752: 32626,
              36753: 26360,
              36754: 34223,
              36755: 34295,
              36756: 35576,
              36757: 21161,
              36758: 21465,
              36759: 22899,
              36760: 24207,
              36761: 24464,
              36762: 24661,
              36763: 37604,
              36764: 38500,
              36765: 20663,
              36766: 20767,
              36767: 21213,
              36768: 21280,
              36769: 21319,
              36770: 21484,
              36771: 21736,
              36772: 21830,
              36773: 21809,
              36774: 22039,
              36775: 22888,
              36776: 22974,
              36777: 23100,
              36778: 23477,
              36779: 23558,
              36780: 23567,
              36781: 23569,
              36782: 23578,
              36783: 24196,
              36784: 24202,
              36785: 24288,
              36786: 24432,
              36787: 25215,
              36788: 25220,
              36789: 25307,
              36790: 25484,
              36791: 25463,
              36792: 26119,
              36793: 26124,
              36794: 26157,
              36795: 26230,
              36796: 26494,
              36797: 26786,
              36798: 27167,
              36799: 27189,
              36800: 27836,
              36801: 28040,
              36802: 28169,
              36803: 28248,
              36804: 28988,
              36805: 28966,
              36806: 29031,
              36807: 30151,
              36808: 30465,
              36809: 30813,
              36810: 30977,
              36811: 31077,
              36812: 31216,
              36813: 31456,
              36814: 31505,
              36815: 31911,
              36816: 32057,
              36817: 32918,
              36818: 33750,
              36819: 33931,
              36820: 34121,
              36821: 34909,
              36822: 35059,
              36823: 35359,
              36824: 35388,
              36825: 35412,
              36826: 35443,
              36827: 35937,
              36828: 36062,
              36829: 37284,
              36830: 37478,
              36831: 37758,
              36832: 37912,
              36833: 38556,
              36834: 38808,
              36835: 19978,
              36836: 19976,
              36837: 19998,
              36838: 20055,
              36839: 20887,
              36840: 21104,
              36841: 22478,
              36842: 22580,
              36843: 22732,
              36844: 23330,
              36845: 24120,
              36846: 24773,
              36847: 25854,
              36848: 26465,
              36849: 26454,
              36850: 27972,
              36851: 29366,
              36852: 30067,
              36853: 31331,
              36854: 33976,
              36855: 35698,
              36856: 37304,
              36857: 37664,
              36858: 22065,
              36859: 22516,
              36860: 39166,
              36928: 25325,
              36929: 26893,
              36930: 27542,
              36931: 29165,
              36932: 32340,
              36933: 32887,
              36934: 33394,
              36935: 35302,
              36936: 39135,
              36937: 34645,
              36938: 36785,
              36939: 23611,
              36940: 20280,
              36941: 20449,
              36942: 20405,
              36943: 21767,
              36944: 23072,
              36945: 23517,
              36946: 23529,
              36947: 24515,
              36948: 24910,
              36949: 25391,
              36950: 26032,
              36951: 26187,
              36952: 26862,
              36953: 27035,
              36954: 28024,
              36955: 28145,
              36956: 30003,
              36957: 30137,
              36958: 30495,
              36959: 31070,
              36960: 31206,
              36961: 32051,
              36962: 33251,
              36963: 33455,
              36964: 34218,
              36965: 35242,
              36966: 35386,
              36967: 36523,
              36968: 36763,
              36969: 36914,
              36970: 37341,
              36971: 38663,
              36972: 20154,
              36973: 20161,
              36974: 20995,
              36975: 22645,
              36976: 22764,
              36977: 23563,
              36978: 29978,
              36979: 23613,
              36980: 33102,
              36981: 35338,
              36982: 36805,
              36983: 38499,
              36984: 38765,
              36985: 31525,
              36986: 35535,
              36987: 38920,
              36988: 37218,
              36989: 22259,
              36990: 21416,
              36992: 36887,
              36993: 21561,
              36994: 22402,
              36995: 24101,
              36996: 25512,
              36997: 27700,
              36998: 28810,
              36999: 30561,
              37e3: 31883,
              37001: 32736,
              37002: 34928,
              37003: 36930,
              37004: 37204,
              37005: 37648,
              37006: 37656,
              37007: 38543,
              37008: 29790,
              37009: 39620,
              37010: 23815,
              37011: 23913,
              37012: 25968,
              37013: 26530,
              37014: 36264,
              37015: 38619,
              37016: 25454,
              37017: 26441,
              37018: 26905,
              37019: 33733,
              37020: 38935,
              37021: 38592,
              37022: 35070,
              37023: 28548,
              37024: 25722,
              37025: 23544,
              37026: 19990,
              37027: 28716,
              37028: 30045,
              37029: 26159,
              37030: 20932,
              37031: 21046,
              37032: 21218,
              37033: 22995,
              37034: 24449,
              37035: 24615,
              37036: 25104,
              37037: 25919,
              37038: 25972,
              37039: 26143,
              37040: 26228,
              37041: 26866,
              37042: 26646,
              37043: 27491,
              37044: 28165,
              37045: 29298,
              37046: 29983,
              37047: 30427,
              37048: 31934,
              37049: 32854,
              37050: 22768,
              37051: 35069,
              37052: 35199,
              37053: 35488,
              37054: 35475,
              37055: 35531,
              37056: 36893,
              37057: 37266,
              37058: 38738,
              37059: 38745,
              37060: 25993,
              37061: 31246,
              37062: 33030,
              37063: 38587,
              37064: 24109,
              37065: 24796,
              37066: 25114,
              37067: 26021,
              37068: 26132,
              37069: 26512,
              37070: 30707,
              37071: 31309,
              37072: 31821,
              37073: 32318,
              37074: 33034,
              37075: 36012,
              37076: 36196,
              37077: 36321,
              37078: 36447,
              37079: 30889,
              37080: 20999,
              37081: 25305,
              37082: 25509,
              37083: 25666,
              37084: 25240,
              37085: 35373,
              37086: 31363,
              37087: 31680,
              37088: 35500,
              37089: 38634,
              37090: 32118,
              37091: 33292,
              37092: 34633,
              37093: 20185,
              37094: 20808,
              37095: 21315,
              37096: 21344,
              37097: 23459,
              37098: 23554,
              37099: 23574,
              37100: 24029,
              37101: 25126,
              37102: 25159,
              37103: 25776,
              37104: 26643,
              37105: 26676,
              37106: 27849,
              37107: 27973,
              37108: 27927,
              37109: 26579,
              37110: 28508,
              37111: 29006,
              37112: 29053,
              37113: 26059,
              37114: 31359,
              37115: 31661,
              37116: 32218,
              37184: 32330,
              37185: 32680,
              37186: 33146,
              37187: 33307,
              37188: 33337,
              37189: 34214,
              37190: 35438,
              37191: 36046,
              37192: 36341,
              37193: 36984,
              37194: 36983,
              37195: 37549,
              37196: 37521,
              37197: 38275,
              37198: 39854,
              37199: 21069,
              37200: 21892,
              37201: 28472,
              37202: 28982,
              37203: 20840,
              37204: 31109,
              37205: 32341,
              37206: 33203,
              37207: 31950,
              37208: 22092,
              37209: 22609,
              37210: 23720,
              37211: 25514,
              37212: 26366,
              37213: 26365,
              37214: 26970,
              37215: 29401,
              37216: 30095,
              37217: 30094,
              37218: 30990,
              37219: 31062,
              37220: 31199,
              37221: 31895,
              37222: 32032,
              37223: 32068,
              37224: 34311,
              37225: 35380,
              37226: 38459,
              37227: 36961,
              37228: 40736,
              37229: 20711,
              37230: 21109,
              37231: 21452,
              37232: 21474,
              37233: 20489,
              37234: 21930,
              37235: 22766,
              37236: 22863,
              37237: 29245,
              37238: 23435,
              37239: 23652,
              37240: 21277,
              37241: 24803,
              37242: 24819,
              37243: 25436,
              37244: 25475,
              37245: 25407,
              37246: 25531,
              37248: 25805,
              37249: 26089,
              37250: 26361,
              37251: 24035,
              37252: 27085,
              37253: 27133,
              37254: 28437,
              37255: 29157,
              37256: 20105,
              37257: 30185,
              37258: 30456,
              37259: 31379,
              37260: 31967,
              37261: 32207,
              37262: 32156,
              37263: 32865,
              37264: 33609,
              37265: 33624,
              37266: 33900,
              37267: 33980,
              37268: 34299,
              37269: 35013,
              37270: 36208,
              37271: 36865,
              37272: 36973,
              37273: 37783,
              37274: 38684,
              37275: 39442,
              37276: 20687,
              37277: 22679,
              37278: 24974,
              37279: 33235,
              37280: 34101,
              37281: 36104,
              37282: 36896,
              37283: 20419,
              37284: 20596,
              37285: 21063,
              37286: 21363,
              37287: 24687,
              37288: 25417,
              37289: 26463,
              37290: 28204,
              37291: 36275,
              37292: 36895,
              37293: 20439,
              37294: 23646,
              37295: 36042,
              37296: 26063,
              37297: 32154,
              37298: 21330,
              37299: 34966,
              37300: 20854,
              37301: 25539,
              37302: 23384,
              37303: 23403,
              37304: 23562,
              37305: 25613,
              37306: 26449,
              37307: 36956,
              37308: 20182,
              37309: 22810,
              37310: 22826,
              37311: 27760,
              37312: 35409,
              37313: 21822,
              37314: 22549,
              37315: 22949,
              37316: 24816,
              37317: 25171,
              37318: 26561,
              37319: 33333,
              37320: 26965,
              37321: 38464,
              37322: 39364,
              37323: 39464,
              37324: 20307,
              37325: 22534,
              37326: 23550,
              37327: 32784,
              37328: 23729,
              37329: 24111,
              37330: 24453,
              37331: 24608,
              37332: 24907,
              37333: 25140,
              37334: 26367,
              37335: 27888,
              37336: 28382,
              37337: 32974,
              37338: 33151,
              37339: 33492,
              37340: 34955,
              37341: 36024,
              37342: 36864,
              37343: 36910,
              37344: 38538,
              37345: 40667,
              37346: 39899,
              37347: 20195,
              37348: 21488,
              37349: 22823,
              37350: 31532,
              37351: 37261,
              37352: 38988,
              37353: 40441,
              37354: 28381,
              37355: 28711,
              37356: 21331,
              37357: 21828,
              37358: 23429,
              37359: 25176,
              37360: 25246,
              37361: 25299,
              37362: 27810,
              37363: 28655,
              37364: 29730,
              37365: 35351,
              37366: 37944,
              37367: 28609,
              37368: 35582,
              37369: 33592,
              37370: 20967,
              37371: 34552,
              37372: 21482,
              37440: 21481,
              37441: 20294,
              37442: 36948,
              37443: 36784,
              37444: 22890,
              37445: 33073,
              37446: 24061,
              37447: 31466,
              37448: 36799,
              37449: 26842,
              37450: 35895,
              37451: 29432,
              37452: 40008,
              37453: 27197,
              37454: 35504,
              37455: 20025,
              37456: 21336,
              37457: 22022,
              37458: 22374,
              37459: 25285,
              37460: 25506,
              37461: 26086,
              37462: 27470,
              37463: 28129,
              37464: 28251,
              37465: 28845,
              37466: 30701,
              37467: 31471,
              37468: 31658,
              37469: 32187,
              37470: 32829,
              37471: 32966,
              37472: 34507,
              37473: 35477,
              37474: 37723,
              37475: 22243,
              37476: 22727,
              37477: 24382,
              37478: 26029,
              37479: 26262,
              37480: 27264,
              37481: 27573,
              37482: 30007,
              37483: 35527,
              37484: 20516,
              37485: 30693,
              37486: 22320,
              37487: 24347,
              37488: 24677,
              37489: 26234,
              37490: 27744,
              37491: 30196,
              37492: 31258,
              37493: 32622,
              37494: 33268,
              37495: 34584,
              37496: 36933,
              37497: 39347,
              37498: 31689,
              37499: 30044,
              37500: 31481,
              37501: 31569,
              37502: 33988,
              37504: 36880,
              37505: 31209,
              37506: 31378,
              37507: 33590,
              37508: 23265,
              37509: 30528,
              37510: 20013,
              37511: 20210,
              37512: 23449,
              37513: 24544,
              37514: 25277,
              37515: 26172,
              37516: 26609,
              37517: 27880,
              37518: 34411,
              37519: 34935,
              37520: 35387,
              37521: 37198,
              37522: 37619,
              37523: 39376,
              37524: 27159,
              37525: 28710,
              37526: 29482,
              37527: 33511,
              37528: 33879,
              37529: 36015,
              37530: 19969,
              37531: 20806,
              37532: 20939,
              37533: 21899,
              37534: 23541,
              37535: 24086,
              37536: 24115,
              37537: 24193,
              37538: 24340,
              37539: 24373,
              37540: 24427,
              37541: 24500,
              37542: 25074,
              37543: 25361,
              37544: 26274,
              37545: 26397,
              37546: 28526,
              37547: 29266,
              37548: 30010,
              37549: 30522,
              37550: 32884,
              37551: 33081,
              37552: 33144,
              37553: 34678,
              37554: 35519,
              37555: 35548,
              37556: 36229,
              37557: 36339,
              37558: 37530,
              37559: 38263,
              37560: 38914,
              37561: 40165,
              37562: 21189,
              37563: 25431,
              37564: 30452,
              37565: 26389,
              37566: 27784,
              37567: 29645,
              37568: 36035,
              37569: 37806,
              37570: 38515,
              37571: 27941,
              37572: 22684,
              37573: 26894,
              37574: 27084,
              37575: 36861,
              37576: 37786,
              37577: 30171,
              37578: 36890,
              37579: 22618,
              37580: 26626,
              37581: 25524,
              37582: 27131,
              37583: 20291,
              37584: 28460,
              37585: 26584,
              37586: 36795,
              37587: 34086,
              37588: 32180,
              37589: 37716,
              37590: 26943,
              37591: 28528,
              37592: 22378,
              37593: 22775,
              37594: 23340,
              37595: 32044,
              37596: 29226,
              37597: 21514,
              37598: 37347,
              37599: 40372,
              37600: 20141,
              37601: 20302,
              37602: 20572,
              37603: 20597,
              37604: 21059,
              37605: 35998,
              37606: 21576,
              37607: 22564,
              37608: 23450,
              37609: 24093,
              37610: 24213,
              37611: 24237,
              37612: 24311,
              37613: 24351,
              37614: 24716,
              37615: 25269,
              37616: 25402,
              37617: 25552,
              37618: 26799,
              37619: 27712,
              37620: 30855,
              37621: 31118,
              37622: 31243,
              37623: 32224,
              37624: 33351,
              37625: 35330,
              37626: 35558,
              37627: 36420,
              37628: 36883,
              37696: 37048,
              37697: 37165,
              37698: 37336,
              37699: 40718,
              37700: 27877,
              37701: 25688,
              37702: 25826,
              37703: 25973,
              37704: 28404,
              37705: 30340,
              37706: 31515,
              37707: 36969,
              37708: 37841,
              37709: 28346,
              37710: 21746,
              37711: 24505,
              37712: 25764,
              37713: 36685,
              37714: 36845,
              37715: 37444,
              37716: 20856,
              37717: 22635,
              37718: 22825,
              37719: 23637,
              37720: 24215,
              37721: 28155,
              37722: 32399,
              37723: 29980,
              37724: 36028,
              37725: 36578,
              37726: 39003,
              37727: 28857,
              37728: 20253,
              37729: 27583,
              37730: 28593,
              37731: 3e4,
              37732: 38651,
              37733: 20814,
              37734: 21520,
              37735: 22581,
              37736: 22615,
              37737: 22956,
              37738: 23648,
              37739: 24466,
              37740: 26007,
              37741: 26460,
              37742: 28193,
              37743: 30331,
              37744: 33759,
              37745: 36077,
              37746: 36884,
              37747: 37117,
              37748: 37709,
              37749: 30757,
              37750: 30778,
              37751: 21162,
              37752: 24230,
              37753: 22303,
              37754: 22900,
              37755: 24594,
              37756: 20498,
              37757: 20826,
              37758: 20908,
              37760: 20941,
              37761: 20992,
              37762: 21776,
              37763: 22612,
              37764: 22616,
              37765: 22871,
              37766: 23445,
              37767: 23798,
              37768: 23947,
              37769: 24764,
              37770: 25237,
              37771: 25645,
              37772: 26481,
              37773: 26691,
              37774: 26812,
              37775: 26847,
              37776: 30423,
              37777: 28120,
              37778: 28271,
              37779: 28059,
              37780: 28783,
              37781: 29128,
              37782: 24403,
              37783: 30168,
              37784: 31095,
              37785: 31561,
              37786: 31572,
              37787: 31570,
              37788: 31958,
              37789: 32113,
              37790: 21040,
              37791: 33891,
              37792: 34153,
              37793: 34276,
              37794: 35342,
              37795: 35588,
              37796: 35910,
              37797: 36367,
              37798: 36867,
              37799: 36879,
              37800: 37913,
              37801: 38518,
              37802: 38957,
              37803: 39472,
              37804: 38360,
              37805: 20685,
              37806: 21205,
              37807: 21516,
              37808: 22530,
              37809: 23566,
              37810: 24999,
              37811: 25758,
              37812: 27934,
              37813: 30643,
              37814: 31461,
              37815: 33012,
              37816: 33796,
              37817: 36947,
              37818: 37509,
              37819: 23776,
              37820: 40199,
              37821: 21311,
              37822: 24471,
              37823: 24499,
              37824: 28060,
              37825: 29305,
              37826: 30563,
              37827: 31167,
              37828: 31716,
              37829: 27602,
              37830: 29420,
              37831: 35501,
              37832: 26627,
              37833: 27233,
              37834: 20984,
              37835: 31361,
              37836: 26932,
              37837: 23626,
              37838: 40182,
              37839: 33515,
              37840: 23493,
              37841: 37193,
              37842: 28702,
              37843: 22136,
              37844: 23663,
              37845: 24775,
              37846: 25958,
              37847: 27788,
              37848: 35930,
              37849: 36929,
              37850: 38931,
              37851: 21585,
              37852: 26311,
              37853: 37389,
              37854: 22856,
              37855: 37027,
              37856: 20869,
              37857: 20045,
              37858: 20970,
              37859: 34201,
              37860: 35598,
              37861: 28760,
              37862: 25466,
              37863: 37707,
              37864: 26978,
              37865: 39348,
              37866: 32260,
              37867: 30071,
              37868: 21335,
              37869: 26976,
              37870: 36575,
              37871: 38627,
              37872: 27741,
              37873: 20108,
              37874: 23612,
              37875: 24336,
              37876: 36841,
              37877: 21250,
              37878: 36049,
              37879: 32905,
              37880: 34425,
              37881: 24319,
              37882: 26085,
              37883: 20083,
              37884: 20837,
              37952: 22914,
              37953: 23615,
              37954: 38894,
              37955: 20219,
              37956: 22922,
              37957: 24525,
              37958: 35469,
              37959: 28641,
              37960: 31152,
              37961: 31074,
              37962: 23527,
              37963: 33905,
              37964: 29483,
              37965: 29105,
              37966: 24180,
              37967: 24565,
              37968: 25467,
              37969: 25754,
              37970: 29123,
              37971: 31896,
              37972: 20035,
              37973: 24316,
              37974: 20043,
              37975: 22492,
              37976: 22178,
              37977: 24745,
              37978: 28611,
              37979: 32013,
              37980: 33021,
              37981: 33075,
              37982: 33215,
              37983: 36786,
              37984: 35223,
              37985: 34468,
              37986: 24052,
              37987: 25226,
              37988: 25773,
              37989: 35207,
              37990: 26487,
              37991: 27874,
              37992: 27966,
              37993: 29750,
              37994: 30772,
              37995: 23110,
              37996: 32629,
              37997: 33453,
              37998: 39340,
              37999: 20467,
              38e3: 24259,
              38001: 25309,
              38002: 25490,
              38003: 25943,
              38004: 26479,
              38005: 30403,
              38006: 29260,
              38007: 32972,
              38008: 32954,
              38009: 36649,
              38010: 37197,
              38011: 20493,
              38012: 22521,
              38013: 23186,
              38014: 26757,
              38016: 26995,
              38017: 29028,
              38018: 29437,
              38019: 36023,
              38020: 22770,
              38021: 36064,
              38022: 38506,
              38023: 36889,
              38024: 34687,
              38025: 31204,
              38026: 30695,
              38027: 33833,
              38028: 20271,
              38029: 21093,
              38030: 21338,
              38031: 25293,
              38032: 26575,
              38033: 27850,
              38034: 30333,
              38035: 31636,
              38036: 31893,
              38037: 33334,
              38038: 34180,
              38039: 36843,
              38040: 26333,
              38041: 28448,
              38042: 29190,
              38043: 32283,
              38044: 33707,
              38045: 39361,
              38046: 40614,
              38047: 20989,
              38048: 31665,
              38049: 30834,
              38050: 31672,
              38051: 32903,
              38052: 31560,
              38053: 27368,
              38054: 24161,
              38055: 32908,
              38056: 30033,
              38057: 30048,
              38058: 20843,
              38059: 37474,
              38060: 28300,
              38061: 30330,
              38062: 37271,
              38063: 39658,
              38064: 20240,
              38065: 32624,
              38066: 25244,
              38067: 31567,
              38068: 38309,
              38069: 40169,
              38070: 22138,
              38071: 22617,
              38072: 34532,
              38073: 38588,
              38074: 20276,
              38075: 21028,
              38076: 21322,
              38077: 21453,
              38078: 21467,
              38079: 24070,
              38080: 25644,
              38081: 26001,
              38082: 26495,
              38083: 27710,
              38084: 27726,
              38085: 29256,
              38086: 29359,
              38087: 29677,
              38088: 30036,
              38089: 32321,
              38090: 33324,
              38091: 34281,
              38092: 36009,
              38093: 31684,
              38094: 37318,
              38095: 29033,
              38096: 38930,
              38097: 39151,
              38098: 25405,
              38099: 26217,
              38100: 30058,
              38101: 30436,
              38102: 30928,
              38103: 34115,
              38104: 34542,
              38105: 21290,
              38106: 21329,
              38107: 21542,
              38108: 22915,
              38109: 24199,
              38110: 24444,
              38111: 24754,
              38112: 25161,
              38113: 25209,
              38114: 25259,
              38115: 26e3,
              38116: 27604,
              38117: 27852,
              38118: 30130,
              38119: 30382,
              38120: 30865,
              38121: 31192,
              38122: 32203,
              38123: 32631,
              38124: 32933,
              38125: 34987,
              38126: 35513,
              38127: 36027,
              38128: 36991,
              38129: 38750,
              38130: 39131,
              38131: 27147,
              38132: 31800,
              38133: 20633,
              38134: 23614,
              38135: 24494,
              38136: 26503,
              38137: 27608,
              38138: 29749,
              38139: 30473,
              38140: 32654,
              38208: 40763,
              38209: 26570,
              38210: 31255,
              38211: 21305,
              38212: 30091,
              38213: 39661,
              38214: 24422,
              38215: 33181,
              38216: 33777,
              38217: 32920,
              38218: 24380,
              38219: 24517,
              38220: 30050,
              38221: 31558,
              38222: 36924,
              38223: 26727,
              38224: 23019,
              38225: 23195,
              38226: 32016,
              38227: 30334,
              38228: 35628,
              38229: 20469,
              38230: 24426,
              38231: 27161,
              38232: 27703,
              38233: 28418,
              38234: 29922,
              38235: 31080,
              38236: 34920,
              38237: 35413,
              38238: 35961,
              38239: 24287,
              38240: 25551,
              38241: 30149,
              38242: 31186,
              38243: 33495,
              38244: 37672,
              38245: 37618,
              38246: 33948,
              38247: 34541,
              38248: 39981,
              38249: 21697,
              38250: 24428,
              38251: 25996,
              38252: 27996,
              38253: 28693,
              38254: 36007,
              38255: 36051,
              38256: 38971,
              38257: 25935,
              38258: 29942,
              38259: 19981,
              38260: 20184,
              38261: 22496,
              38262: 22827,
              38263: 23142,
              38264: 23500,
              38265: 20904,
              38266: 24067,
              38267: 24220,
              38268: 24598,
              38269: 25206,
              38270: 25975,
              38272: 26023,
              38273: 26222,
              38274: 28014,
              38275: 29238,
              38276: 31526,
              38277: 33104,
              38278: 33178,
              38279: 33433,
              38280: 35676,
              38281: 36e3,
              38282: 36070,
              38283: 36212,
              38284: 38428,
              38285: 38468,
              38286: 20398,
              38287: 25771,
              38288: 27494,
              38289: 33310,
              38290: 33889,
              38291: 34154,
              38292: 37096,
              38293: 23553,
              38294: 26963,
              38295: 39080,
              38296: 33914,
              38297: 34135,
              38298: 20239,
              38299: 21103,
              38300: 24489,
              38301: 24133,
              38302: 26381,
              38303: 31119,
              38304: 33145,
              38305: 35079,
              38306: 35206,
              38307: 28149,
              38308: 24343,
              38309: 25173,
              38310: 27832,
              38311: 20175,
              38312: 29289,
              38313: 39826,
              38314: 20998,
              38315: 21563,
              38316: 22132,
              38317: 22707,
              38318: 24996,
              38319: 25198,
              38320: 28954,
              38321: 22894,
              38322: 31881,
              38323: 31966,
              38324: 32027,
              38325: 38640,
              38326: 25991,
              38327: 32862,
              38328: 19993,
              38329: 20341,
              38330: 20853,
              38331: 22592,
              38332: 24163,
              38333: 24179,
              38334: 24330,
              38335: 26564,
              38336: 20006,
              38337: 34109,
              38338: 38281,
              38339: 38491,
              38340: 31859,
              38341: 38913,
              38342: 20731,
              38343: 22721,
              38344: 30294,
              38345: 30887,
              38346: 21029,
              38347: 30629,
              38348: 34065,
              38349: 31622,
              38350: 20559,
              38351: 22793,
              38352: 29255,
              38353: 31687,
              38354: 32232,
              38355: 36794,
              38356: 36820,
              38357: 36941,
              38358: 20415,
              38359: 21193,
              38360: 23081,
              38361: 24321,
              38362: 38829,
              38363: 20445,
              38364: 33303,
              38365: 37610,
              38366: 22275,
              38367: 25429,
              38368: 27497,
              38369: 29995,
              38370: 35036,
              38371: 36628,
              38372: 31298,
              38373: 21215,
              38374: 22675,
              38375: 24917,
              38376: 25098,
              38377: 26286,
              38378: 27597,
              38379: 31807,
              38380: 33769,
              38381: 20515,
              38382: 20472,
              38383: 21253,
              38384: 21574,
              38385: 22577,
              38386: 22857,
              38387: 23453,
              38388: 23792,
              38389: 23791,
              38390: 23849,
              38391: 24214,
              38392: 25265,
              38393: 25447,
              38394: 25918,
              38395: 26041,
              38396: 26379,
              38464: 27861,
              38465: 27873,
              38466: 28921,
              38467: 30770,
              38468: 32299,
              38469: 32990,
              38470: 33459,
              38471: 33804,
              38472: 34028,
              38473: 34562,
              38474: 35090,
              38475: 35370,
              38476: 35914,
              38477: 37030,
              38478: 37586,
              38479: 39165,
              38480: 40179,
              38481: 40300,
              38482: 20047,
              38483: 20129,
              38484: 20621,
              38485: 21078,
              38486: 22346,
              38487: 22952,
              38488: 24125,
              38489: 24536,
              38490: 24537,
              38491: 25151,
              38492: 26292,
              38493: 26395,
              38494: 26576,
              38495: 26834,
              38496: 20882,
              38497: 32033,
              38498: 32938,
              38499: 33192,
              38500: 35584,
              38501: 35980,
              38502: 36031,
              38503: 37502,
              38504: 38450,
              38505: 21536,
              38506: 38956,
              38507: 21271,
              38508: 20693,
              38509: 21340,
              38510: 22696,
              38511: 25778,
              38512: 26420,
              38513: 29287,
              38514: 30566,
              38515: 31302,
              38516: 37350,
              38517: 21187,
              38518: 27809,
              38519: 27526,
              38520: 22528,
              38521: 24140,
              38522: 22868,
              38523: 26412,
              38524: 32763,
              38525: 20961,
              38526: 30406,
              38528: 25705,
              38529: 30952,
              38530: 39764,
              38531: 40635,
              38532: 22475,
              38533: 22969,
              38534: 26151,
              38535: 26522,
              38536: 27598,
              38537: 21737,
              38538: 27097,
              38539: 24149,
              38540: 33180,
              38541: 26517,
              38542: 39850,
              38543: 26622,
              38544: 40018,
              38545: 26717,
              38546: 20134,
              38547: 20451,
              38548: 21448,
              38549: 25273,
              38550: 26411,
              38551: 27819,
              38552: 36804,
              38553: 20397,
              38554: 32365,
              38555: 40639,
              38556: 19975,
              38557: 24930,
              38558: 28288,
              38559: 28459,
              38560: 34067,
              38561: 21619,
              38562: 26410,
              38563: 39749,
              38564: 24051,
              38565: 31637,
              38566: 23724,
              38567: 23494,
              38568: 34588,
              38569: 28234,
              38570: 34001,
              38571: 31252,
              38572: 33032,
              38573: 22937,
              38574: 31885,
              38575: 27665,
              38576: 30496,
              38577: 21209,
              38578: 22818,
              38579: 28961,
              38580: 29279,
              38581: 30683,
              38582: 38695,
              38583: 40289,
              38584: 26891,
              38585: 23167,
              38586: 23064,
              38587: 20901,
              38588: 21517,
              38589: 21629,
              38590: 26126,
              38591: 30431,
              38592: 36855,
              38593: 37528,
              38594: 40180,
              38595: 23018,
              38596: 29277,
              38597: 28357,
              38598: 20813,
              38599: 26825,
              38600: 32191,
              38601: 32236,
              38602: 38754,
              38603: 40634,
              38604: 25720,
              38605: 27169,
              38606: 33538,
              38607: 22916,
              38608: 23391,
              38609: 27611,
              38610: 29467,
              38611: 30450,
              38612: 32178,
              38613: 32791,
              38614: 33945,
              38615: 20786,
              38616: 26408,
              38617: 40665,
              38618: 30446,
              38619: 26466,
              38620: 21247,
              38621: 39173,
              38622: 23588,
              38623: 25147,
              38624: 31870,
              38625: 36016,
              38626: 21839,
              38627: 24758,
              38628: 32011,
              38629: 38272,
              38630: 21249,
              38631: 20063,
              38632: 20918,
              38633: 22812,
              38634: 29242,
              38635: 32822,
              38636: 37326,
              38637: 24357,
              38638: 30690,
              38639: 21380,
              38640: 24441,
              38641: 32004,
              38642: 34220,
              38643: 35379,
              38644: 36493,
              38645: 38742,
              38646: 26611,
              38647: 34222,
              38648: 37971,
              38649: 24841,
              38650: 24840,
              38651: 27833,
              38652: 30290,
              38720: 35565,
              38721: 36664,
              38722: 21807,
              38723: 20305,
              38724: 20778,
              38725: 21191,
              38726: 21451,
              38727: 23461,
              38728: 24189,
              38729: 24736,
              38730: 24962,
              38731: 25558,
              38732: 26377,
              38733: 26586,
              38734: 28263,
              38735: 28044,
              38736: 29494,
              38737: 29495,
              38738: 30001,
              38739: 31056,
              38740: 35029,
              38741: 35480,
              38742: 36938,
              38743: 37009,
              38744: 37109,
              38745: 38596,
              38746: 34701,
              38747: 22805,
              38748: 20104,
              38749: 20313,
              38750: 19982,
              38751: 35465,
              38752: 36671,
              38753: 38928,
              38754: 20653,
              38755: 24188,
              38756: 22934,
              38757: 23481,
              38758: 24248,
              38759: 25562,
              38760: 25594,
              38761: 25793,
              38762: 26332,
              38763: 26954,
              38764: 27096,
              38765: 27915,
              38766: 28342,
              38767: 29076,
              38768: 29992,
              38769: 31407,
              38770: 32650,
              38771: 32768,
              38772: 33865,
              38773: 33993,
              38774: 35201,
              38775: 35617,
              38776: 36362,
              38777: 36965,
              38778: 38525,
              38779: 39178,
              38780: 24958,
              38781: 25233,
              38782: 27442,
              38784: 27779,
              38785: 28020,
              38786: 32716,
              38787: 32764,
              38788: 28096,
              38789: 32645,
              38790: 34746,
              38791: 35064,
              38792: 26469,
              38793: 33713,
              38794: 38972,
              38795: 38647,
              38796: 27931,
              38797: 32097,
              38798: 33853,
              38799: 37226,
              38800: 20081,
              38801: 21365,
              38802: 23888,
              38803: 27396,
              38804: 28651,
              38805: 34253,
              38806: 34349,
              38807: 35239,
              38808: 21033,
              38809: 21519,
              38810: 23653,
              38811: 26446,
              38812: 26792,
              38813: 29702,
              38814: 29827,
              38815: 30178,
              38816: 35023,
              38817: 35041,
              38818: 37324,
              38819: 38626,
              38820: 38520,
              38821: 24459,
              38822: 29575,
              38823: 31435,
              38824: 33870,
              38825: 25504,
              38826: 30053,
              38827: 21129,
              38828: 27969,
              38829: 28316,
              38830: 29705,
              38831: 30041,
              38832: 30827,
              38833: 31890,
              38834: 38534,
              38835: 31452,
              38836: 40845,
              38837: 20406,
              38838: 24942,
              38839: 26053,
              38840: 34396,
              38841: 20102,
              38842: 20142,
              38843: 20698,
              38844: 20001,
              38845: 20940,
              38846: 23534,
              38847: 26009,
              38848: 26753,
              38849: 28092,
              38850: 29471,
              38851: 30274,
              38852: 30637,
              38853: 31260,
              38854: 31975,
              38855: 33391,
              38856: 35538,
              38857: 36988,
              38858: 37327,
              38859: 38517,
              38860: 38936,
              38861: 21147,
              38862: 32209,
              38863: 20523,
              38864: 21400,
              38865: 26519,
              38866: 28107,
              38867: 29136,
              38868: 29747,
              38869: 33256,
              38870: 36650,
              38871: 38563,
              38872: 40023,
              38873: 40607,
              38874: 29792,
              38875: 22593,
              38876: 28057,
              38877: 32047,
              38878: 39006,
              38879: 20196,
              38880: 20278,
              38881: 20363,
              38882: 20919,
              38883: 21169,
              38884: 23994,
              38885: 24604,
              38886: 29618,
              38887: 31036,
              38888: 33491,
              38889: 37428,
              38890: 38583,
              38891: 38646,
              38892: 38666,
              38893: 40599,
              38894: 40802,
              38895: 26278,
              38896: 27508,
              38897: 21015,
              38898: 21155,
              38899: 28872,
              38900: 35010,
              38901: 24265,
              38902: 24651,
              38903: 24976,
              38904: 28451,
              38905: 29001,
              38906: 31806,
              38907: 32244,
              38908: 32879,
              38976: 34030,
              38977: 36899,
              38978: 37676,
              38979: 21570,
              38980: 39791,
              38981: 27347,
              38982: 28809,
              38983: 36034,
              38984: 36335,
              38985: 38706,
              38986: 21172,
              38987: 23105,
              38988: 24266,
              38989: 24324,
              38990: 26391,
              38991: 27004,
              38992: 27028,
              38993: 28010,
              38994: 28431,
              38995: 29282,
              38996: 29436,
              38997: 31725,
              38998: 32769,
              38999: 32894,
              39e3: 34635,
              39001: 37070,
              39002: 20845,
              39003: 40595,
              39004: 31108,
              39005: 32907,
              39006: 37682,
              39007: 35542,
              39008: 20525,
              39009: 21644,
              39010: 35441,
              39011: 27498,
              39012: 36036,
              39013: 33031,
              39014: 24785,
              39015: 26528,
              39016: 40434,
              39017: 20121,
              39018: 20120,
              39019: 39952,
              39020: 35435,
              39021: 34241,
              39022: 34152,
              39023: 26880,
              39024: 28286,
              39025: 30871,
              39026: 33109,
              39071: 24332,
              39072: 19984,
              39073: 19989,
              39074: 20010,
              39075: 20017,
              39076: 20022,
              39077: 20028,
              39078: 20031,
              39079: 20034,
              39080: 20054,
              39081: 20056,
              39082: 20098,
              39083: 20101,
              39084: 35947,
              39085: 20106,
              39086: 33298,
              39087: 24333,
              39088: 20110,
              39089: 20126,
              39090: 20127,
              39091: 20128,
              39092: 20130,
              39093: 20144,
              39094: 20147,
              39095: 20150,
              39096: 20174,
              39097: 20173,
              39098: 20164,
              39099: 20166,
              39100: 20162,
              39101: 20183,
              39102: 20190,
              39103: 20205,
              39104: 20191,
              39105: 20215,
              39106: 20233,
              39107: 20314,
              39108: 20272,
              39109: 20315,
              39110: 20317,
              39111: 20311,
              39112: 20295,
              39113: 20342,
              39114: 20360,
              39115: 20367,
              39116: 20376,
              39117: 20347,
              39118: 20329,
              39119: 20336,
              39120: 20369,
              39121: 20335,
              39122: 20358,
              39123: 20374,
              39124: 20760,
              39125: 20436,
              39126: 20447,
              39127: 20430,
              39128: 20440,
              39129: 20443,
              39130: 20433,
              39131: 20442,
              39132: 20432,
              39133: 20452,
              39134: 20453,
              39135: 20506,
              39136: 20520,
              39137: 20500,
              39138: 20522,
              39139: 20517,
              39140: 20485,
              39141: 20252,
              39142: 20470,
              39143: 20513,
              39144: 20521,
              39145: 20524,
              39146: 20478,
              39147: 20463,
              39148: 20497,
              39149: 20486,
              39150: 20547,
              39151: 20551,
              39152: 26371,
              39153: 20565,
              39154: 20560,
              39155: 20552,
              39156: 20570,
              39157: 20566,
              39158: 20588,
              39159: 20600,
              39160: 20608,
              39161: 20634,
              39162: 20613,
              39163: 20660,
              39164: 20658,
              39232: 20681,
              39233: 20682,
              39234: 20659,
              39235: 20674,
              39236: 20694,
              39237: 20702,
              39238: 20709,
              39239: 20717,
              39240: 20707,
              39241: 20718,
              39242: 20729,
              39243: 20725,
              39244: 20745,
              39245: 20737,
              39246: 20738,
              39247: 20758,
              39248: 20757,
              39249: 20756,
              39250: 20762,
              39251: 20769,
              39252: 20794,
              39253: 20791,
              39254: 20796,
              39255: 20795,
              39256: 20799,
              39257: 20800,
              39258: 20818,
              39259: 20812,
              39260: 20820,
              39261: 20834,
              39262: 31480,
              39263: 20841,
              39264: 20842,
              39265: 20846,
              39266: 20864,
              39267: 20866,
              39268: 22232,
              39269: 20876,
              39270: 20873,
              39271: 20879,
              39272: 20881,
              39273: 20883,
              39274: 20885,
              39275: 20886,
              39276: 20900,
              39277: 20902,
              39278: 20898,
              39279: 20905,
              39280: 20906,
              39281: 20907,
              39282: 20915,
              39283: 20913,
              39284: 20914,
              39285: 20912,
              39286: 20917,
              39287: 20925,
              39288: 20933,
              39289: 20937,
              39290: 20955,
              39291: 20960,
              39292: 34389,
              39293: 20969,
              39294: 20973,
              39296: 20976,
              39297: 20981,
              39298: 20990,
              39299: 20996,
              39300: 21003,
              39301: 21012,
              39302: 21006,
              39303: 21031,
              39304: 21034,
              39305: 21038,
              39306: 21043,
              39307: 21049,
              39308: 21071,
              39309: 21060,
              39310: 21067,
              39311: 21068,
              39312: 21086,
              39313: 21076,
              39314: 21098,
              39315: 21108,
              39316: 21097,
              39317: 21107,
              39318: 21119,
              39319: 21117,
              39320: 21133,
              39321: 21140,
              39322: 21138,
              39323: 21105,
              39324: 21128,
              39325: 21137,
              39326: 36776,
              39327: 36775,
              39328: 21164,
              39329: 21165,
              39330: 21180,
              39331: 21173,
              39332: 21185,
              39333: 21197,
              39334: 21207,
              39335: 21214,
              39336: 21219,
              39337: 21222,
              39338: 39149,
              39339: 21216,
              39340: 21235,
              39341: 21237,
              39342: 21240,
              39343: 21241,
              39344: 21254,
              39345: 21256,
              39346: 30008,
              39347: 21261,
              39348: 21264,
              39349: 21263,
              39350: 21269,
              39351: 21274,
              39352: 21283,
              39353: 21295,
              39354: 21297,
              39355: 21299,
              39356: 21304,
              39357: 21312,
              39358: 21318,
              39359: 21317,
              39360: 19991,
              39361: 21321,
              39362: 21325,
              39363: 20950,
              39364: 21342,
              39365: 21353,
              39366: 21358,
              39367: 22808,
              39368: 21371,
              39369: 21367,
              39370: 21378,
              39371: 21398,
              39372: 21408,
              39373: 21414,
              39374: 21413,
              39375: 21422,
              39376: 21424,
              39377: 21430,
              39378: 21443,
              39379: 31762,
              39380: 38617,
              39381: 21471,
              39382: 26364,
              39383: 29166,
              39384: 21486,
              39385: 21480,
              39386: 21485,
              39387: 21498,
              39388: 21505,
              39389: 21565,
              39390: 21568,
              39391: 21548,
              39392: 21549,
              39393: 21564,
              39394: 21550,
              39395: 21558,
              39396: 21545,
              39397: 21533,
              39398: 21582,
              39399: 21647,
              39400: 21621,
              39401: 21646,
              39402: 21599,
              39403: 21617,
              39404: 21623,
              39405: 21616,
              39406: 21650,
              39407: 21627,
              39408: 21632,
              39409: 21622,
              39410: 21636,
              39411: 21648,
              39412: 21638,
              39413: 21703,
              39414: 21666,
              39415: 21688,
              39416: 21669,
              39417: 21676,
              39418: 21700,
              39419: 21704,
              39420: 21672,
              39488: 21675,
              39489: 21698,
              39490: 21668,
              39491: 21694,
              39492: 21692,
              39493: 21720,
              39494: 21733,
              39495: 21734,
              39496: 21775,
              39497: 21780,
              39498: 21757,
              39499: 21742,
              39500: 21741,
              39501: 21754,
              39502: 21730,
              39503: 21817,
              39504: 21824,
              39505: 21859,
              39506: 21836,
              39507: 21806,
              39508: 21852,
              39509: 21829,
              39510: 21846,
              39511: 21847,
              39512: 21816,
              39513: 21811,
              39514: 21853,
              39515: 21913,
              39516: 21888,
              39517: 21679,
              39518: 21898,
              39519: 21919,
              39520: 21883,
              39521: 21886,
              39522: 21912,
              39523: 21918,
              39524: 21934,
              39525: 21884,
              39526: 21891,
              39527: 21929,
              39528: 21895,
              39529: 21928,
              39530: 21978,
              39531: 21957,
              39532: 21983,
              39533: 21956,
              39534: 21980,
              39535: 21988,
              39536: 21972,
              39537: 22036,
              39538: 22007,
              39539: 22038,
              39540: 22014,
              39541: 22013,
              39542: 22043,
              39543: 22009,
              39544: 22094,
              39545: 22096,
              39546: 29151,
              39547: 22068,
              39548: 22070,
              39549: 22066,
              39550: 22072,
              39552: 22123,
              39553: 22116,
              39554: 22063,
              39555: 22124,
              39556: 22122,
              39557: 22150,
              39558: 22144,
              39559: 22154,
              39560: 22176,
              39561: 22164,
              39562: 22159,
              39563: 22181,
              39564: 22190,
              39565: 22198,
              39566: 22196,
              39567: 22210,
              39568: 22204,
              39569: 22209,
              39570: 22211,
              39571: 22208,
              39572: 22216,
              39573: 22222,
              39574: 22225,
              39575: 22227,
              39576: 22231,
              39577: 22254,
              39578: 22265,
              39579: 22272,
              39580: 22271,
              39581: 22276,
              39582: 22281,
              39583: 22280,
              39584: 22283,
              39585: 22285,
              39586: 22291,
              39587: 22296,
              39588: 22294,
              39589: 21959,
              39590: 22300,
              39591: 22310,
              39592: 22327,
              39593: 22328,
              39594: 22350,
              39595: 22331,
              39596: 22336,
              39597: 22351,
              39598: 22377,
              39599: 22464,
              39600: 22408,
              39601: 22369,
              39602: 22399,
              39603: 22409,
              39604: 22419,
              39605: 22432,
              39606: 22451,
              39607: 22436,
              39608: 22442,
              39609: 22448,
              39610: 22467,
              39611: 22470,
              39612: 22484,
              39613: 22482,
              39614: 22483,
              39615: 22538,
              39616: 22486,
              39617: 22499,
              39618: 22539,
              39619: 22553,
              39620: 22557,
              39621: 22642,
              39622: 22561,
              39623: 22626,
              39624: 22603,
              39625: 22640,
              39626: 27584,
              39627: 22610,
              39628: 22589,
              39629: 22649,
              39630: 22661,
              39631: 22713,
              39632: 22687,
              39633: 22699,
              39634: 22714,
              39635: 22750,
              39636: 22715,
              39637: 22712,
              39638: 22702,
              39639: 22725,
              39640: 22739,
              39641: 22737,
              39642: 22743,
              39643: 22745,
              39644: 22744,
              39645: 22757,
              39646: 22748,
              39647: 22756,
              39648: 22751,
              39649: 22767,
              39650: 22778,
              39651: 22777,
              39652: 22779,
              39653: 22780,
              39654: 22781,
              39655: 22786,
              39656: 22794,
              39657: 22800,
              39658: 22811,
              39659: 26790,
              39660: 22821,
              39661: 22828,
              39662: 22829,
              39663: 22834,
              39664: 22840,
              39665: 22846,
              39666: 31442,
              39667: 22869,
              39668: 22864,
              39669: 22862,
              39670: 22874,
              39671: 22872,
              39672: 22882,
              39673: 22880,
              39674: 22887,
              39675: 22892,
              39676: 22889,
              39744: 22904,
              39745: 22913,
              39746: 22941,
              39747: 20318,
              39748: 20395,
              39749: 22947,
              39750: 22962,
              39751: 22982,
              39752: 23016,
              39753: 23004,
              39754: 22925,
              39755: 23001,
              39756: 23002,
              39757: 23077,
              39758: 23071,
              39759: 23057,
              39760: 23068,
              39761: 23049,
              39762: 23066,
              39763: 23104,
              39764: 23148,
              39765: 23113,
              39766: 23093,
              39767: 23094,
              39768: 23138,
              39769: 23146,
              39770: 23194,
              39771: 23228,
              39772: 23230,
              39773: 23243,
              39774: 23234,
              39775: 23229,
              39776: 23267,
              39777: 23255,
              39778: 23270,
              39779: 23273,
              39780: 23254,
              39781: 23290,
              39782: 23291,
              39783: 23308,
              39784: 23307,
              39785: 23318,
              39786: 23346,
              39787: 23248,
              39788: 23338,
              39789: 23350,
              39790: 23358,
              39791: 23363,
              39792: 23365,
              39793: 23360,
              39794: 23377,
              39795: 23381,
              39796: 23386,
              39797: 23387,
              39798: 23397,
              39799: 23401,
              39800: 23408,
              39801: 23411,
              39802: 23413,
              39803: 23416,
              39804: 25992,
              39805: 23418,
              39806: 23424,
              39808: 23427,
              39809: 23462,
              39810: 23480,
              39811: 23491,
              39812: 23495,
              39813: 23497,
              39814: 23508,
              39815: 23504,
              39816: 23524,
              39817: 23526,
              39818: 23522,
              39819: 23518,
              39820: 23525,
              39821: 23531,
              39822: 23536,
              39823: 23542,
              39824: 23539,
              39825: 23557,
              39826: 23559,
              39827: 23560,
              39828: 23565,
              39829: 23571,
              39830: 23584,
              39831: 23586,
              39832: 23592,
              39833: 23608,
              39834: 23609,
              39835: 23617,
              39836: 23622,
              39837: 23630,
              39838: 23635,
              39839: 23632,
              39840: 23631,
              39841: 23409,
              39842: 23660,
              39843: 23662,
              39844: 20066,
              39845: 23670,
              39846: 23673,
              39847: 23692,
              39848: 23697,
              39849: 23700,
              39850: 22939,
              39851: 23723,
              39852: 23739,
              39853: 23734,
              39854: 23740,
              39855: 23735,
              39856: 23749,
              39857: 23742,
              39858: 23751,
              39859: 23769,
              39860: 23785,
              39861: 23805,
              39862: 23802,
              39863: 23789,
              39864: 23948,
              39865: 23786,
              39866: 23819,
              39867: 23829,
              39868: 23831,
              39869: 23900,
              39870: 23839,
              39871: 23835,
              39872: 23825,
              39873: 23828,
              39874: 23842,
              39875: 23834,
              39876: 23833,
              39877: 23832,
              39878: 23884,
              39879: 23890,
              39880: 23886,
              39881: 23883,
              39882: 23916,
              39883: 23923,
              39884: 23926,
              39885: 23943,
              39886: 23940,
              39887: 23938,
              39888: 23970,
              39889: 23965,
              39890: 23980,
              39891: 23982,
              39892: 23997,
              39893: 23952,
              39894: 23991,
              39895: 23996,
              39896: 24009,
              39897: 24013,
              39898: 24019,
              39899: 24018,
              39900: 24022,
              39901: 24027,
              39902: 24043,
              39903: 24050,
              39904: 24053,
              39905: 24075,
              39906: 24090,
              39907: 24089,
              39908: 24081,
              39909: 24091,
              39910: 24118,
              39911: 24119,
              39912: 24132,
              39913: 24131,
              39914: 24128,
              39915: 24142,
              39916: 24151,
              39917: 24148,
              39918: 24159,
              39919: 24162,
              39920: 24164,
              39921: 24135,
              39922: 24181,
              39923: 24182,
              39924: 24186,
              39925: 40636,
              39926: 24191,
              39927: 24224,
              39928: 24257,
              39929: 24258,
              39930: 24264,
              39931: 24272,
              39932: 24271,
              4e4: 24278,
              40001: 24291,
              40002: 24285,
              40003: 24282,
              40004: 24283,
              40005: 24290,
              40006: 24289,
              40007: 24296,
              40008: 24297,
              40009: 24300,
              40010: 24305,
              40011: 24307,
              40012: 24304,
              40013: 24308,
              40014: 24312,
              40015: 24318,
              40016: 24323,
              40017: 24329,
              40018: 24413,
              40019: 24412,
              40020: 24331,
              40021: 24337,
              40022: 24342,
              40023: 24361,
              40024: 24365,
              40025: 24376,
              40026: 24385,
              40027: 24392,
              40028: 24396,
              40029: 24398,
              40030: 24367,
              40031: 24401,
              40032: 24406,
              40033: 24407,
              40034: 24409,
              40035: 24417,
              40036: 24429,
              40037: 24435,
              40038: 24439,
              40039: 24451,
              40040: 24450,
              40041: 24447,
              40042: 24458,
              40043: 24456,
              40044: 24465,
              40045: 24455,
              40046: 24478,
              40047: 24473,
              40048: 24472,
              40049: 24480,
              40050: 24488,
              40051: 24493,
              40052: 24508,
              40053: 24534,
              40054: 24571,
              40055: 24548,
              40056: 24568,
              40057: 24561,
              40058: 24541,
              40059: 24755,
              40060: 24575,
              40061: 24609,
              40062: 24672,
              40064: 24601,
              40065: 24592,
              40066: 24617,
              40067: 24590,
              40068: 24625,
              40069: 24603,
              40070: 24597,
              40071: 24619,
              40072: 24614,
              40073: 24591,
              40074: 24634,
              40075: 24666,
              40076: 24641,
              40077: 24682,
              40078: 24695,
              40079: 24671,
              40080: 24650,
              40081: 24646,
              40082: 24653,
              40083: 24675,
              40084: 24643,
              40085: 24676,
              40086: 24642,
              40087: 24684,
              40088: 24683,
              40089: 24665,
              40090: 24705,
              40091: 24717,
              40092: 24807,
              40093: 24707,
              40094: 24730,
              40095: 24708,
              40096: 24731,
              40097: 24726,
              40098: 24727,
              40099: 24722,
              40100: 24743,
              40101: 24715,
              40102: 24801,
              40103: 24760,
              40104: 24800,
              40105: 24787,
              40106: 24756,
              40107: 24560,
              40108: 24765,
              40109: 24774,
              40110: 24757,
              40111: 24792,
              40112: 24909,
              40113: 24853,
              40114: 24838,
              40115: 24822,
              40116: 24823,
              40117: 24832,
              40118: 24820,
              40119: 24826,
              40120: 24835,
              40121: 24865,
              40122: 24827,
              40123: 24817,
              40124: 24845,
              40125: 24846,
              40126: 24903,
              40127: 24894,
              40128: 24872,
              40129: 24871,
              40130: 24906,
              40131: 24895,
              40132: 24892,
              40133: 24876,
              40134: 24884,
              40135: 24893,
              40136: 24898,
              40137: 24900,
              40138: 24947,
              40139: 24951,
              40140: 24920,
              40141: 24921,
              40142: 24922,
              40143: 24939,
              40144: 24948,
              40145: 24943,
              40146: 24933,
              40147: 24945,
              40148: 24927,
              40149: 24925,
              40150: 24915,
              40151: 24949,
              40152: 24985,
              40153: 24982,
              40154: 24967,
              40155: 25004,
              40156: 24980,
              40157: 24986,
              40158: 24970,
              40159: 24977,
              40160: 25003,
              40161: 25006,
              40162: 25036,
              40163: 25034,
              40164: 25033,
              40165: 25079,
              40166: 25032,
              40167: 25027,
              40168: 25030,
              40169: 25018,
              40170: 25035,
              40171: 32633,
              40172: 25037,
              40173: 25062,
              40174: 25059,
              40175: 25078,
              40176: 25082,
              40177: 25076,
              40178: 25087,
              40179: 25085,
              40180: 25084,
              40181: 25086,
              40182: 25088,
              40183: 25096,
              40184: 25097,
              40185: 25101,
              40186: 25100,
              40187: 25108,
              40188: 25115,
              40256: 25118,
              40257: 25121,
              40258: 25130,
              40259: 25134,
              40260: 25136,
              40261: 25138,
              40262: 25139,
              40263: 25153,
              40264: 25166,
              40265: 25182,
              40266: 25187,
              40267: 25179,
              40268: 25184,
              40269: 25192,
              40270: 25212,
              40271: 25218,
              40272: 25225,
              40273: 25214,
              40274: 25234,
              40275: 25235,
              40276: 25238,
              40277: 25300,
              40278: 25219,
              40279: 25236,
              40280: 25303,
              40281: 25297,
              40282: 25275,
              40283: 25295,
              40284: 25343,
              40285: 25286,
              40286: 25812,
              40287: 25288,
              40288: 25308,
              40289: 25292,
              40290: 25290,
              40291: 25282,
              40292: 25287,
              40293: 25243,
              40294: 25289,
              40295: 25356,
              40296: 25326,
              40297: 25329,
              40298: 25383,
              40299: 25346,
              40300: 25352,
              40301: 25327,
              40302: 25333,
              40303: 25424,
              40304: 25406,
              40305: 25421,
              40306: 25628,
              40307: 25423,
              40308: 25494,
              40309: 25486,
              40310: 25472,
              40311: 25515,
              40312: 25462,
              40313: 25507,
              40314: 25487,
              40315: 25481,
              40316: 25503,
              40317: 25525,
              40318: 25451,
              40320: 25449,
              40321: 25534,
              40322: 25577,
              40323: 25536,
              40324: 25542,
              40325: 25571,
              40326: 25545,
              40327: 25554,
              40328: 25590,
              40329: 25540,
              40330: 25622,
              40331: 25652,
              40332: 25606,
              40333: 25619,
              40334: 25638,
              40335: 25654,
              40336: 25885,
              40337: 25623,
              40338: 25640,
              40339: 25615,
              40340: 25703,
              40341: 25711,
              40342: 25718,
              40343: 25678,
              40344: 25898,
              40345: 25749,
              40346: 25747,
              40347: 25765,
              40348: 25769,
              40349: 25736,
              40350: 25788,
              40351: 25818,
              40352: 25810,
              40353: 25797,
              40354: 25799,
              40355: 25787,
              40356: 25816,
              40357: 25794,
              40358: 25841,
              40359: 25831,
              40360: 33289,
              40361: 25824,
              40362: 25825,
              40363: 25260,
              40364: 25827,
              40365: 25839,
              40366: 25900,
              40367: 25846,
              40368: 25844,
              40369: 25842,
              40370: 25850,
              40371: 25856,
              40372: 25853,
              40373: 25880,
              40374: 25884,
              40375: 25861,
              40376: 25892,
              40377: 25891,
              40378: 25899,
              40379: 25908,
              40380: 25909,
              40381: 25911,
              40382: 25910,
              40383: 25912,
              40384: 30027,
              40385: 25928,
              40386: 25942,
              40387: 25941,
              40388: 25933,
              40389: 25944,
              40390: 25950,
              40391: 25949,
              40392: 25970,
              40393: 25976,
              40394: 25986,
              40395: 25987,
              40396: 35722,
              40397: 26011,
              40398: 26015,
              40399: 26027,
              40400: 26039,
              40401: 26051,
              40402: 26054,
              40403: 26049,
              40404: 26052,
              40405: 26060,
              40406: 26066,
              40407: 26075,
              40408: 26073,
              40409: 26080,
              40410: 26081,
              40411: 26097,
              40412: 26482,
              40413: 26122,
              40414: 26115,
              40415: 26107,
              40416: 26483,
              40417: 26165,
              40418: 26166,
              40419: 26164,
              40420: 26140,
              40421: 26191,
              40422: 26180,
              40423: 26185,
              40424: 26177,
              40425: 26206,
              40426: 26205,
              40427: 26212,
              40428: 26215,
              40429: 26216,
              40430: 26207,
              40431: 26210,
              40432: 26224,
              40433: 26243,
              40434: 26248,
              40435: 26254,
              40436: 26249,
              40437: 26244,
              40438: 26264,
              40439: 26269,
              40440: 26305,
              40441: 26297,
              40442: 26313,
              40443: 26302,
              40444: 26300,
              40512: 26308,
              40513: 26296,
              40514: 26326,
              40515: 26330,
              40516: 26336,
              40517: 26175,
              40518: 26342,
              40519: 26345,
              40520: 26352,
              40521: 26357,
              40522: 26359,
              40523: 26383,
              40524: 26390,
              40525: 26398,
              40526: 26406,
              40527: 26407,
              40528: 38712,
              40529: 26414,
              40530: 26431,
              40531: 26422,
              40532: 26433,
              40533: 26424,
              40534: 26423,
              40535: 26438,
              40536: 26462,
              40537: 26464,
              40538: 26457,
              40539: 26467,
              40540: 26468,
              40541: 26505,
              40542: 26480,
              40543: 26537,
              40544: 26492,
              40545: 26474,
              40546: 26508,
              40547: 26507,
              40548: 26534,
              40549: 26529,
              40550: 26501,
              40551: 26551,
              40552: 26607,
              40553: 26548,
              40554: 26604,
              40555: 26547,
              40556: 26601,
              40557: 26552,
              40558: 26596,
              40559: 26590,
              40560: 26589,
              40561: 26594,
              40562: 26606,
              40563: 26553,
              40564: 26574,
              40565: 26566,
              40566: 26599,
              40567: 27292,
              40568: 26654,
              40569: 26694,
              40570: 26665,
              40571: 26688,
              40572: 26701,
              40573: 26674,
              40574: 26702,
              40576: 26803,
              40577: 26667,
              40578: 26713,
              40579: 26723,
              40580: 26743,
              40581: 26751,
              40582: 26783,
              40583: 26767,
              40584: 26797,
              40585: 26772,
              40586: 26781,
              40587: 26779,
              40588: 26755,
              40589: 27310,
              40590: 26809,
              40591: 26740,
              40592: 26805,
              40593: 26784,
              40594: 26810,
              40595: 26895,
              40596: 26765,
              40597: 26750,
              40598: 26881,
              40599: 26826,
              40600: 26888,
              40601: 26840,
              40602: 26914,
              40603: 26918,
              40604: 26849,
              40605: 26892,
              40606: 26829,
              40607: 26836,
              40608: 26855,
              40609: 26837,
              40610: 26934,
              40611: 26898,
              40612: 26884,
              40613: 26839,
              40614: 26851,
              40615: 26917,
              40616: 26873,
              40617: 26848,
              40618: 26863,
              40619: 26920,
              40620: 26922,
              40621: 26906,
              40622: 26915,
              40623: 26913,
              40624: 26822,
              40625: 27001,
              40626: 26999,
              40627: 26972,
              40628: 27e3,
              40629: 26987,
              40630: 26964,
              40631: 27006,
              40632: 26990,
              40633: 26937,
              40634: 26996,
              40635: 26941,
              40636: 26969,
              40637: 26928,
              40638: 26977,
              40639: 26974,
              40640: 26973,
              40641: 27009,
              40642: 26986,
              40643: 27058,
              40644: 27054,
              40645: 27088,
              40646: 27071,
              40647: 27073,
              40648: 27091,
              40649: 27070,
              40650: 27086,
              40651: 23528,
              40652: 27082,
              40653: 27101,
              40654: 27067,
              40655: 27075,
              40656: 27047,
              40657: 27182,
              40658: 27025,
              40659: 27040,
              40660: 27036,
              40661: 27029,
              40662: 27060,
              40663: 27102,
              40664: 27112,
              40665: 27138,
              40666: 27163,
              40667: 27135,
              40668: 27402,
              40669: 27129,
              40670: 27122,
              40671: 27111,
              40672: 27141,
              40673: 27057,
              40674: 27166,
              40675: 27117,
              40676: 27156,
              40677: 27115,
              40678: 27146,
              40679: 27154,
              40680: 27329,
              40681: 27171,
              40682: 27155,
              40683: 27204,
              40684: 27148,
              40685: 27250,
              40686: 27190,
              40687: 27256,
              40688: 27207,
              40689: 27234,
              40690: 27225,
              40691: 27238,
              40692: 27208,
              40693: 27192,
              40694: 27170,
              40695: 27280,
              40696: 27277,
              40697: 27296,
              40698: 27268,
              40699: 27298,
              40700: 27299,
              40768: 27287,
              40769: 34327,
              40770: 27323,
              40771: 27331,
              40772: 27330,
              40773: 27320,
              40774: 27315,
              40775: 27308,
              40776: 27358,
              40777: 27345,
              40778: 27359,
              40779: 27306,
              40780: 27354,
              40781: 27370,
              40782: 27387,
              40783: 27397,
              40784: 34326,
              40785: 27386,
              40786: 27410,
              40787: 27414,
              40788: 39729,
              40789: 27423,
              40790: 27448,
              40791: 27447,
              40792: 30428,
              40793: 27449,
              40794: 39150,
              40795: 27463,
              40796: 27459,
              40797: 27465,
              40798: 27472,
              40799: 27481,
              40800: 27476,
              40801: 27483,
              40802: 27487,
              40803: 27489,
              40804: 27512,
              40805: 27513,
              40806: 27519,
              40807: 27520,
              40808: 27524,
              40809: 27523,
              40810: 27533,
              40811: 27544,
              40812: 27541,
              40813: 27550,
              40814: 27556,
              40815: 27562,
              40816: 27563,
              40817: 27567,
              40818: 27570,
              40819: 27569,
              40820: 27571,
              40821: 27575,
              40822: 27580,
              40823: 27590,
              40824: 27595,
              40825: 27603,
              40826: 27615,
              40827: 27628,
              40828: 27627,
              40829: 27635,
              40830: 27631,
              40832: 40638,
              40833: 27656,
              40834: 27667,
              40835: 27668,
              40836: 27675,
              40837: 27684,
              40838: 27683,
              40839: 27742,
              40840: 27733,
              40841: 27746,
              40842: 27754,
              40843: 27778,
              40844: 27789,
              40845: 27802,
              40846: 27777,
              40847: 27803,
              40848: 27774,
              40849: 27752,
              40850: 27763,
              40851: 27794,
              40852: 27792,
              40853: 27844,
              40854: 27889,
              40855: 27859,
              40856: 27837,
              40857: 27863,
              40858: 27845,
              40859: 27869,
              40860: 27822,
              40861: 27825,
              40862: 27838,
              40863: 27834,
              40864: 27867,
              40865: 27887,
              40866: 27865,
              40867: 27882,
              40868: 27935,
              40869: 34893,
              40870: 27958,
              40871: 27947,
              40872: 27965,
              40873: 27960,
              40874: 27929,
              40875: 27957,
              40876: 27955,
              40877: 27922,
              40878: 27916,
              40879: 28003,
              40880: 28051,
              40881: 28004,
              40882: 27994,
              40883: 28025,
              40884: 27993,
              40885: 28046,
              40886: 28053,
              40887: 28644,
              40888: 28037,
              40889: 28153,
              40890: 28181,
              40891: 28170,
              40892: 28085,
              40893: 28103,
              40894: 28134,
              40895: 28088,
              40896: 28102,
              40897: 28140,
              40898: 28126,
              40899: 28108,
              40900: 28136,
              40901: 28114,
              40902: 28101,
              40903: 28154,
              40904: 28121,
              40905: 28132,
              40906: 28117,
              40907: 28138,
              40908: 28142,
              40909: 28205,
              40910: 28270,
              40911: 28206,
              40912: 28185,
              40913: 28274,
              40914: 28255,
              40915: 28222,
              40916: 28195,
              40917: 28267,
              40918: 28203,
              40919: 28278,
              40920: 28237,
              40921: 28191,
              40922: 28227,
              40923: 28218,
              40924: 28238,
              40925: 28196,
              40926: 28415,
              40927: 28189,
              40928: 28216,
              40929: 28290,
              40930: 28330,
              40931: 28312,
              40932: 28361,
              40933: 28343,
              40934: 28371,
              40935: 28349,
              40936: 28335,
              40937: 28356,
              40938: 28338,
              40939: 28372,
              40940: 28373,
              40941: 28303,
              40942: 28325,
              40943: 28354,
              40944: 28319,
              40945: 28481,
              40946: 28433,
              40947: 28748,
              40948: 28396,
              40949: 28408,
              40950: 28414,
              40951: 28479,
              40952: 28402,
              40953: 28465,
              40954: 28399,
              40955: 28466,
              40956: 28364,
              161: 65377,
              162: 65378,
              163: 65379,
              164: 65380,
              165: 65381,
              166: 65382,
              167: 65383,
              168: 65384,
              169: 65385,
              170: 65386,
              171: 65387,
              172: 65388,
              173: 65389,
              174: 65390,
              175: 65391,
              176: 65392,
              177: 65393,
              178: 65394,
              179: 65395,
              180: 65396,
              181: 65397,
              182: 65398,
              183: 65399,
              184: 65400,
              185: 65401,
              186: 65402,
              187: 65403,
              188: 65404,
              189: 65405,
              190: 65406,
              191: 65407,
              192: 65408,
              193: 65409,
              194: 65410,
              195: 65411,
              196: 65412,
              197: 65413,
              198: 65414,
              199: 65415,
              200: 65416,
              201: 65417,
              202: 65418,
              203: 65419,
              204: 65420,
              205: 65421,
              206: 65422,
              207: 65423,
              208: 65424,
              209: 65425,
              210: 65426,
              211: 65427,
              212: 65428,
              213: 65429,
              214: 65430,
              215: 65431,
              216: 65432,
              217: 65433,
              218: 65434,
              219: 65435,
              220: 65436,
              221: 65437,
              222: 65438,
              223: 65439,
              57408: 28478,
              57409: 28435,
              57410: 28407,
              57411: 28550,
              57412: 28538,
              57413: 28536,
              57414: 28545,
              57415: 28544,
              57416: 28527,
              57417: 28507,
              57418: 28659,
              57419: 28525,
              57420: 28546,
              57421: 28540,
              57422: 28504,
              57423: 28558,
              57424: 28561,
              57425: 28610,
              57426: 28518,
              57427: 28595,
              57428: 28579,
              57429: 28577,
              57430: 28580,
              57431: 28601,
              57432: 28614,
              57433: 28586,
              57434: 28639,
              57435: 28629,
              57436: 28652,
              57437: 28628,
              57438: 28632,
              57439: 28657,
              57440: 28654,
              57441: 28635,
              57442: 28681,
              57443: 28683,
              57444: 28666,
              57445: 28689,
              57446: 28673,
              57447: 28687,
              57448: 28670,
              57449: 28699,
              57450: 28698,
              57451: 28532,
              57452: 28701,
              57453: 28696,
              57454: 28703,
              57455: 28720,
              57456: 28734,
              57457: 28722,
              57458: 28753,
              57459: 28771,
              57460: 28825,
              57461: 28818,
              57462: 28847,
              57463: 28913,
              57464: 28844,
              57465: 28856,
              57466: 28851,
              57467: 28846,
              57468: 28895,
              57469: 28875,
              57470: 28893,
              57472: 28889,
              57473: 28937,
              57474: 28925,
              57475: 28956,
              57476: 28953,
              57477: 29029,
              57478: 29013,
              57479: 29064,
              57480: 29030,
              57481: 29026,
              57482: 29004,
              57483: 29014,
              57484: 29036,
              57485: 29071,
              57486: 29179,
              57487: 29060,
              57488: 29077,
              57489: 29096,
              57490: 29100,
              57491: 29143,
              57492: 29113,
              57493: 29118,
              57494: 29138,
              57495: 29129,
              57496: 29140,
              57497: 29134,
              57498: 29152,
              57499: 29164,
              57500: 29159,
              57501: 29173,
              57502: 29180,
              57503: 29177,
              57504: 29183,
              57505: 29197,
              57506: 29200,
              57507: 29211,
              57508: 29224,
              57509: 29229,
              57510: 29228,
              57511: 29232,
              57512: 29234,
              57513: 29243,
              57514: 29244,
              57515: 29247,
              57516: 29248,
              57517: 29254,
              57518: 29259,
              57519: 29272,
              57520: 29300,
              57521: 29310,
              57522: 29314,
              57523: 29313,
              57524: 29319,
              57525: 29330,
              57526: 29334,
              57527: 29346,
              57528: 29351,
              57529: 29369,
              57530: 29362,
              57531: 29379,
              57532: 29382,
              57533: 29380,
              57534: 29390,
              57535: 29394,
              57536: 29410,
              57537: 29408,
              57538: 29409,
              57539: 29433,
              57540: 29431,
              57541: 20495,
              57542: 29463,
              57543: 29450,
              57544: 29468,
              57545: 29462,
              57546: 29469,
              57547: 29492,
              57548: 29487,
              57549: 29481,
              57550: 29477,
              57551: 29502,
              57552: 29518,
              57553: 29519,
              57554: 40664,
              57555: 29527,
              57556: 29546,
              57557: 29544,
              57558: 29552,
              57559: 29560,
              57560: 29557,
              57561: 29563,
              57562: 29562,
              57563: 29640,
              57564: 29619,
              57565: 29646,
              57566: 29627,
              57567: 29632,
              57568: 29669,
              57569: 29678,
              57570: 29662,
              57571: 29858,
              57572: 29701,
              57573: 29807,
              57574: 29733,
              57575: 29688,
              57576: 29746,
              57577: 29754,
              57578: 29781,
              57579: 29759,
              57580: 29791,
              57581: 29785,
              57582: 29761,
              57583: 29788,
              57584: 29801,
              57585: 29808,
              57586: 29795,
              57587: 29802,
              57588: 29814,
              57589: 29822,
              57590: 29835,
              57591: 29854,
              57592: 29863,
              57593: 29898,
              57594: 29903,
              57595: 29908,
              57596: 29681,
              57664: 29920,
              57665: 29923,
              57666: 29927,
              57667: 29929,
              57668: 29934,
              57669: 29938,
              57670: 29936,
              57671: 29937,
              57672: 29944,
              57673: 29943,
              57674: 29956,
              57675: 29955,
              57676: 29957,
              57677: 29964,
              57678: 29966,
              57679: 29965,
              57680: 29973,
              57681: 29971,
              57682: 29982,
              57683: 29990,
              57684: 29996,
              57685: 30012,
              57686: 30020,
              57687: 30029,
              57688: 30026,
              57689: 30025,
              57690: 30043,
              57691: 30022,
              57692: 30042,
              57693: 30057,
              57694: 30052,
              57695: 30055,
              57696: 30059,
              57697: 30061,
              57698: 30072,
              57699: 30070,
              57700: 30086,
              57701: 30087,
              57702: 30068,
              57703: 30090,
              57704: 30089,
              57705: 30082,
              57706: 30100,
              57707: 30106,
              57708: 30109,
              57709: 30117,
              57710: 30115,
              57711: 30146,
              57712: 30131,
              57713: 30147,
              57714: 30133,
              57715: 30141,
              57716: 30136,
              57717: 30140,
              57718: 30129,
              57719: 30157,
              57720: 30154,
              57721: 30162,
              57722: 30169,
              57723: 30179,
              57724: 30174,
              57725: 30206,
              57726: 30207,
              57728: 30204,
              57729: 30209,
              57730: 30192,
              57731: 30202,
              57732: 30194,
              57733: 30195,
              57734: 30219,
              57735: 30221,
              57736: 30217,
              57737: 30239,
              57738: 30247,
              57739: 30240,
              57740: 30241,
              57741: 30242,
              57742: 30244,
              57743: 30260,
              57744: 30256,
              57745: 30267,
              57746: 30279,
              57747: 30280,
              57748: 30278,
              57749: 30300,
              57750: 30296,
              57751: 30305,
              57752: 30306,
              57753: 30312,
              57754: 30313,
              57755: 30314,
              57756: 30311,
              57757: 30316,
              57758: 30320,
              57759: 30322,
              57760: 30326,
              57761: 30328,
              57762: 30332,
              57763: 30336,
              57764: 30339,
              57765: 30344,
              57766: 30347,
              57767: 30350,
              57768: 30358,
              57769: 30355,
              57770: 30361,
              57771: 30362,
              57772: 30384,
              57773: 30388,
              57774: 30392,
              57775: 30393,
              57776: 30394,
              57777: 30402,
              57778: 30413,
              57779: 30422,
              57780: 30418,
              57781: 30430,
              57782: 30433,
              57783: 30437,
              57784: 30439,
              57785: 30442,
              57786: 34351,
              57787: 30459,
              57788: 30472,
              57789: 30471,
              57790: 30468,
              57791: 30505,
              57792: 30500,
              57793: 30494,
              57794: 30501,
              57795: 30502,
              57796: 30491,
              57797: 30519,
              57798: 30520,
              57799: 30535,
              57800: 30554,
              57801: 30568,
              57802: 30571,
              57803: 30555,
              57804: 30565,
              57805: 30591,
              57806: 30590,
              57807: 30585,
              57808: 30606,
              57809: 30603,
              57810: 30609,
              57811: 30624,
              57812: 30622,
              57813: 30640,
              57814: 30646,
              57815: 30649,
              57816: 30655,
              57817: 30652,
              57818: 30653,
              57819: 30651,
              57820: 30663,
              57821: 30669,
              57822: 30679,
              57823: 30682,
              57824: 30684,
              57825: 30691,
              57826: 30702,
              57827: 30716,
              57828: 30732,
              57829: 30738,
              57830: 31014,
              57831: 30752,
              57832: 31018,
              57833: 30789,
              57834: 30862,
              57835: 30836,
              57836: 30854,
              57837: 30844,
              57838: 30874,
              57839: 30860,
              57840: 30883,
              57841: 30901,
              57842: 30890,
              57843: 30895,
              57844: 30929,
              57845: 30918,
              57846: 30923,
              57847: 30932,
              57848: 30910,
              57849: 30908,
              57850: 30917,
              57851: 30922,
              57852: 30956,
              57920: 30951,
              57921: 30938,
              57922: 30973,
              57923: 30964,
              57924: 30983,
              57925: 30994,
              57926: 30993,
              57927: 31001,
              57928: 31020,
              57929: 31019,
              57930: 31040,
              57931: 31072,
              57932: 31063,
              57933: 31071,
              57934: 31066,
              57935: 31061,
              57936: 31059,
              57937: 31098,
              57938: 31103,
              57939: 31114,
              57940: 31133,
              57941: 31143,
              57942: 40779,
              57943: 31146,
              57944: 31150,
              57945: 31155,
              57946: 31161,
              57947: 31162,
              57948: 31177,
              57949: 31189,
              57950: 31207,
              57951: 31212,
              57952: 31201,
              57953: 31203,
              57954: 31240,
              57955: 31245,
              57956: 31256,
              57957: 31257,
              57958: 31264,
              57959: 31263,
              57960: 31104,
              57961: 31281,
              57962: 31291,
              57963: 31294,
              57964: 31287,
              57965: 31299,
              57966: 31319,
              57967: 31305,
              57968: 31329,
              57969: 31330,
              57970: 31337,
              57971: 40861,
              57972: 31344,
              57973: 31353,
              57974: 31357,
              57975: 31368,
              57976: 31383,
              57977: 31381,
              57978: 31384,
              57979: 31382,
              57980: 31401,
              57981: 31432,
              57982: 31408,
              57984: 31414,
              57985: 31429,
              57986: 31428,
              57987: 31423,
              57988: 36995,
              57989: 31431,
              57990: 31434,
              57991: 31437,
              57992: 31439,
              57993: 31445,
              57994: 31443,
              57995: 31449,
              57996: 31450,
              57997: 31453,
              57998: 31457,
              57999: 31458,
              58e3: 31462,
              58001: 31469,
              58002: 31472,
              58003: 31490,
              58004: 31503,
              58005: 31498,
              58006: 31494,
              58007: 31539,
              58008: 31512,
              58009: 31513,
              58010: 31518,
              58011: 31541,
              58012: 31528,
              58013: 31542,
              58014: 31568,
              58015: 31610,
              58016: 31492,
              58017: 31565,
              58018: 31499,
              58019: 31564,
              58020: 31557,
              58021: 31605,
              58022: 31589,
              58023: 31604,
              58024: 31591,
              58025: 31600,
              58026: 31601,
              58027: 31596,
              58028: 31598,
              58029: 31645,
              58030: 31640,
              58031: 31647,
              58032: 31629,
              58033: 31644,
              58034: 31642,
              58035: 31627,
              58036: 31634,
              58037: 31631,
              58038: 31581,
              58039: 31641,
              58040: 31691,
              58041: 31681,
              58042: 31692,
              58043: 31695,
              58044: 31668,
              58045: 31686,
              58046: 31709,
              58047: 31721,
              58048: 31761,
              58049: 31764,
              58050: 31718,
              58051: 31717,
              58052: 31840,
              58053: 31744,
              58054: 31751,
              58055: 31763,
              58056: 31731,
              58057: 31735,
              58058: 31767,
              58059: 31757,
              58060: 31734,
              58061: 31779,
              58062: 31783,
              58063: 31786,
              58064: 31775,
              58065: 31799,
              58066: 31787,
              58067: 31805,
              58068: 31820,
              58069: 31811,
              58070: 31828,
              58071: 31823,
              58072: 31808,
              58073: 31824,
              58074: 31832,
              58075: 31839,
              58076: 31844,
              58077: 31830,
              58078: 31845,
              58079: 31852,
              58080: 31861,
              58081: 31875,
              58082: 31888,
              58083: 31908,
              58084: 31917,
              58085: 31906,
              58086: 31915,
              58087: 31905,
              58088: 31912,
              58089: 31923,
              58090: 31922,
              58091: 31921,
              58092: 31918,
              58093: 31929,
              58094: 31933,
              58095: 31936,
              58096: 31941,
              58097: 31938,
              58098: 31960,
              58099: 31954,
              58100: 31964,
              58101: 31970,
              58102: 39739,
              58103: 31983,
              58104: 31986,
              58105: 31988,
              58106: 31990,
              58107: 31994,
              58108: 32006,
              58176: 32002,
              58177: 32028,
              58178: 32021,
              58179: 32010,
              58180: 32069,
              58181: 32075,
              58182: 32046,
              58183: 32050,
              58184: 32063,
              58185: 32053,
              58186: 32070,
              58187: 32115,
              58188: 32086,
              58189: 32078,
              58190: 32114,
              58191: 32104,
              58192: 32110,
              58193: 32079,
              58194: 32099,
              58195: 32147,
              58196: 32137,
              58197: 32091,
              58198: 32143,
              58199: 32125,
              58200: 32155,
              58201: 32186,
              58202: 32174,
              58203: 32163,
              58204: 32181,
              58205: 32199,
              58206: 32189,
              58207: 32171,
              58208: 32317,
              58209: 32162,
              58210: 32175,
              58211: 32220,
              58212: 32184,
              58213: 32159,
              58214: 32176,
              58215: 32216,
              58216: 32221,
              58217: 32228,
              58218: 32222,
              58219: 32251,
              58220: 32242,
              58221: 32225,
              58222: 32261,
              58223: 32266,
              58224: 32291,
              58225: 32289,
              58226: 32274,
              58227: 32305,
              58228: 32287,
              58229: 32265,
              58230: 32267,
              58231: 32290,
              58232: 32326,
              58233: 32358,
              58234: 32315,
              58235: 32309,
              58236: 32313,
              58237: 32323,
              58238: 32311,
              58240: 32306,
              58241: 32314,
              58242: 32359,
              58243: 32349,
              58244: 32342,
              58245: 32350,
              58246: 32345,
              58247: 32346,
              58248: 32377,
              58249: 32362,
              58250: 32361,
              58251: 32380,
              58252: 32379,
              58253: 32387,
              58254: 32213,
              58255: 32381,
              58256: 36782,
              58257: 32383,
              58258: 32392,
              58259: 32393,
              58260: 32396,
              58261: 32402,
              58262: 32400,
              58263: 32403,
              58264: 32404,
              58265: 32406,
              58266: 32398,
              58267: 32411,
              58268: 32412,
              58269: 32568,
              58270: 32570,
              58271: 32581,
              58272: 32588,
              58273: 32589,
              58274: 32590,
              58275: 32592,
              58276: 32593,
              58277: 32597,
              58278: 32596,
              58279: 32600,
              58280: 32607,
              58281: 32608,
              58282: 32616,
              58283: 32617,
              58284: 32615,
              58285: 32632,
              58286: 32642,
              58287: 32646,
              58288: 32643,
              58289: 32648,
              58290: 32647,
              58291: 32652,
              58292: 32660,
              58293: 32670,
              58294: 32669,
              58295: 32666,
              58296: 32675,
              58297: 32687,
              58298: 32690,
              58299: 32697,
              58300: 32686,
              58301: 32694,
              58302: 32696,
              58303: 35697,
              58304: 32709,
              58305: 32710,
              58306: 32714,
              58307: 32725,
              58308: 32724,
              58309: 32737,
              58310: 32742,
              58311: 32745,
              58312: 32755,
              58313: 32761,
              58314: 39132,
              58315: 32774,
              58316: 32772,
              58317: 32779,
              58318: 32786,
              58319: 32792,
              58320: 32793,
              58321: 32796,
              58322: 32801,
              58323: 32808,
              58324: 32831,
              58325: 32827,
              58326: 32842,
              58327: 32838,
              58328: 32850,
              58329: 32856,
              58330: 32858,
              58331: 32863,
              58332: 32866,
              58333: 32872,
              58334: 32883,
              58335: 32882,
              58336: 32880,
              58337: 32886,
              58338: 32889,
              58339: 32893,
              58340: 32895,
              58341: 32900,
              58342: 32902,
              58343: 32901,
              58344: 32923,
              58345: 32915,
              58346: 32922,
              58347: 32941,
              58348: 20880,
              58349: 32940,
              58350: 32987,
              58351: 32997,
              58352: 32985,
              58353: 32989,
              58354: 32964,
              58355: 32986,
              58356: 32982,
              58357: 33033,
              58358: 33007,
              58359: 33009,
              58360: 33051,
              58361: 33065,
              58362: 33059,
              58363: 33071,
              58364: 33099,
              58432: 38539,
              58433: 33094,
              58434: 33086,
              58435: 33107,
              58436: 33105,
              58437: 33020,
              58438: 33137,
              58439: 33134,
              58440: 33125,
              58441: 33126,
              58442: 33140,
              58443: 33155,
              58444: 33160,
              58445: 33162,
              58446: 33152,
              58447: 33154,
              58448: 33184,
              58449: 33173,
              58450: 33188,
              58451: 33187,
              58452: 33119,
              58453: 33171,
              58454: 33193,
              58455: 33200,
              58456: 33205,
              58457: 33214,
              58458: 33208,
              58459: 33213,
              58460: 33216,
              58461: 33218,
              58462: 33210,
              58463: 33225,
              58464: 33229,
              58465: 33233,
              58466: 33241,
              58467: 33240,
              58468: 33224,
              58469: 33242,
              58470: 33247,
              58471: 33248,
              58472: 33255,
              58473: 33274,
              58474: 33275,
              58475: 33278,
              58476: 33281,
              58477: 33282,
              58478: 33285,
              58479: 33287,
              58480: 33290,
              58481: 33293,
              58482: 33296,
              58483: 33302,
              58484: 33321,
              58485: 33323,
              58486: 33336,
              58487: 33331,
              58488: 33344,
              58489: 33369,
              58490: 33368,
              58491: 33373,
              58492: 33370,
              58493: 33375,
              58494: 33380,
              58496: 33378,
              58497: 33384,
              58498: 33386,
              58499: 33387,
              58500: 33326,
              58501: 33393,
              58502: 33399,
              58503: 33400,
              58504: 33406,
              58505: 33421,
              58506: 33426,
              58507: 33451,
              58508: 33439,
              58509: 33467,
              58510: 33452,
              58511: 33505,
              58512: 33507,
              58513: 33503,
              58514: 33490,
              58515: 33524,
              58516: 33523,
              58517: 33530,
              58518: 33683,
              58519: 33539,
              58520: 33531,
              58521: 33529,
              58522: 33502,
              58523: 33542,
              58524: 33500,
              58525: 33545,
              58526: 33497,
              58527: 33589,
              58528: 33588,
              58529: 33558,
              58530: 33586,
              58531: 33585,
              58532: 33600,
              58533: 33593,
              58534: 33616,
              58535: 33605,
              58536: 33583,
              58537: 33579,
              58538: 33559,
              58539: 33560,
              58540: 33669,
              58541: 33690,
              58542: 33706,
              58543: 33695,
              58544: 33698,
              58545: 33686,
              58546: 33571,
              58547: 33678,
              58548: 33671,
              58549: 33674,
              58550: 33660,
              58551: 33717,
              58552: 33651,
              58553: 33653,
              58554: 33696,
              58555: 33673,
              58556: 33704,
              58557: 33780,
              58558: 33811,
              58559: 33771,
              58560: 33742,
              58561: 33789,
              58562: 33795,
              58563: 33752,
              58564: 33803,
              58565: 33729,
              58566: 33783,
              58567: 33799,
              58568: 33760,
              58569: 33778,
              58570: 33805,
              58571: 33826,
              58572: 33824,
              58573: 33725,
              58574: 33848,
              58575: 34054,
              58576: 33787,
              58577: 33901,
              58578: 33834,
              58579: 33852,
              58580: 34138,
              58581: 33924,
              58582: 33911,
              58583: 33899,
              58584: 33965,
              58585: 33902,
              58586: 33922,
              58587: 33897,
              58588: 33862,
              58589: 33836,
              58590: 33903,
              58591: 33913,
              58592: 33845,
              58593: 33994,
              58594: 33890,
              58595: 33977,
              58596: 33983,
              58597: 33951,
              58598: 34009,
              58599: 33997,
              58600: 33979,
              58601: 34010,
              58602: 34e3,
              58603: 33985,
              58604: 33990,
              58605: 34006,
              58606: 33953,
              58607: 34081,
              58608: 34047,
              58609: 34036,
              58610: 34071,
              58611: 34072,
              58612: 34092,
              58613: 34079,
              58614: 34069,
              58615: 34068,
              58616: 34044,
              58617: 34112,
              58618: 34147,
              58619: 34136,
              58620: 34120,
              58688: 34113,
              58689: 34306,
              58690: 34123,
              58691: 34133,
              58692: 34176,
              58693: 34212,
              58694: 34184,
              58695: 34193,
              58696: 34186,
              58697: 34216,
              58698: 34157,
              58699: 34196,
              58700: 34203,
              58701: 34282,
              58702: 34183,
              58703: 34204,
              58704: 34167,
              58705: 34174,
              58706: 34192,
              58707: 34249,
              58708: 34234,
              58709: 34255,
              58710: 34233,
              58711: 34256,
              58712: 34261,
              58713: 34269,
              58714: 34277,
              58715: 34268,
              58716: 34297,
              58717: 34314,
              58718: 34323,
              58719: 34315,
              58720: 34302,
              58721: 34298,
              58722: 34310,
              58723: 34338,
              58724: 34330,
              58725: 34352,
              58726: 34367,
              58727: 34381,
              58728: 20053,
              58729: 34388,
              58730: 34399,
              58731: 34407,
              58732: 34417,
              58733: 34451,
              58734: 34467,
              58735: 34473,
              58736: 34474,
              58737: 34443,
              58738: 34444,
              58739: 34486,
              58740: 34479,
              58741: 34500,
              58742: 34502,
              58743: 34480,
              58744: 34505,
              58745: 34851,
              58746: 34475,
              58747: 34516,
              58748: 34526,
              58749: 34537,
              58750: 34540,
              58752: 34527,
              58753: 34523,
              58754: 34543,
              58755: 34578,
              58756: 34566,
              58757: 34568,
              58758: 34560,
              58759: 34563,
              58760: 34555,
              58761: 34577,
              58762: 34569,
              58763: 34573,
              58764: 34553,
              58765: 34570,
              58766: 34612,
              58767: 34623,
              58768: 34615,
              58769: 34619,
              58770: 34597,
              58771: 34601,
              58772: 34586,
              58773: 34656,
              58774: 34655,
              58775: 34680,
              58776: 34636,
              58777: 34638,
              58778: 34676,
              58779: 34647,
              58780: 34664,
              58781: 34670,
              58782: 34649,
              58783: 34643,
              58784: 34659,
              58785: 34666,
              58786: 34821,
              58787: 34722,
              58788: 34719,
              58789: 34690,
              58790: 34735,
              58791: 34763,
              58792: 34749,
              58793: 34752,
              58794: 34768,
              58795: 38614,
              58796: 34731,
              58797: 34756,
              58798: 34739,
              58799: 34759,
              58800: 34758,
              58801: 34747,
              58802: 34799,
              58803: 34802,
              58804: 34784,
              58805: 34831,
              58806: 34829,
              58807: 34814,
              58808: 34806,
              58809: 34807,
              58810: 34830,
              58811: 34770,
              58812: 34833,
              58813: 34838,
              58814: 34837,
              58815: 34850,
              58816: 34849,
              58817: 34865,
              58818: 34870,
              58819: 34873,
              58820: 34855,
              58821: 34875,
              58822: 34884,
              58823: 34882,
              58824: 34898,
              58825: 34905,
              58826: 34910,
              58827: 34914,
              58828: 34923,
              58829: 34945,
              58830: 34942,
              58831: 34974,
              58832: 34933,
              58833: 34941,
              58834: 34997,
              58835: 34930,
              58836: 34946,
              58837: 34967,
              58838: 34962,
              58839: 34990,
              58840: 34969,
              58841: 34978,
              58842: 34957,
              58843: 34980,
              58844: 34992,
              58845: 35007,
              58846: 34993,
              58847: 35011,
              58848: 35012,
              58849: 35028,
              58850: 35032,
              58851: 35033,
              58852: 35037,
              58853: 35065,
              58854: 35074,
              58855: 35068,
              58856: 35060,
              58857: 35048,
              58858: 35058,
              58859: 35076,
              58860: 35084,
              58861: 35082,
              58862: 35091,
              58863: 35139,
              58864: 35102,
              58865: 35109,
              58866: 35114,
              58867: 35115,
              58868: 35137,
              58869: 35140,
              58870: 35131,
              58871: 35126,
              58872: 35128,
              58873: 35148,
              58874: 35101,
              58875: 35168,
              58876: 35166,
              58944: 35174,
              58945: 35172,
              58946: 35181,
              58947: 35178,
              58948: 35183,
              58949: 35188,
              58950: 35191,
              58951: 35198,
              58952: 35203,
              58953: 35208,
              58954: 35210,
              58955: 35219,
              58956: 35224,
              58957: 35233,
              58958: 35241,
              58959: 35238,
              58960: 35244,
              58961: 35247,
              58962: 35250,
              58963: 35258,
              58964: 35261,
              58965: 35263,
              58966: 35264,
              58967: 35290,
              58968: 35292,
              58969: 35293,
              58970: 35303,
              58971: 35316,
              58972: 35320,
              58973: 35331,
              58974: 35350,
              58975: 35344,
              58976: 35340,
              58977: 35355,
              58978: 35357,
              58979: 35365,
              58980: 35382,
              58981: 35393,
              58982: 35419,
              58983: 35410,
              58984: 35398,
              58985: 35400,
              58986: 35452,
              58987: 35437,
              58988: 35436,
              58989: 35426,
              58990: 35461,
              58991: 35458,
              58992: 35460,
              58993: 35496,
              58994: 35489,
              58995: 35473,
              58996: 35493,
              58997: 35494,
              58998: 35482,
              58999: 35491,
              59e3: 35524,
              59001: 35533,
              59002: 35522,
              59003: 35546,
              59004: 35563,
              59005: 35571,
              59006: 35559,
              59008: 35556,
              59009: 35569,
              59010: 35604,
              59011: 35552,
              59012: 35554,
              59013: 35575,
              59014: 35550,
              59015: 35547,
              59016: 35596,
              59017: 35591,
              59018: 35610,
              59019: 35553,
              59020: 35606,
              59021: 35600,
              59022: 35607,
              59023: 35616,
              59024: 35635,
              59025: 38827,
              59026: 35622,
              59027: 35627,
              59028: 35646,
              59029: 35624,
              59030: 35649,
              59031: 35660,
              59032: 35663,
              59033: 35662,
              59034: 35657,
              59035: 35670,
              59036: 35675,
              59037: 35674,
              59038: 35691,
              59039: 35679,
              59040: 35692,
              59041: 35695,
              59042: 35700,
              59043: 35709,
              59044: 35712,
              59045: 35724,
              59046: 35726,
              59047: 35730,
              59048: 35731,
              59049: 35734,
              59050: 35737,
              59051: 35738,
              59052: 35898,
              59053: 35905,
              59054: 35903,
              59055: 35912,
              59056: 35916,
              59057: 35918,
              59058: 35920,
              59059: 35925,
              59060: 35938,
              59061: 35948,
              59062: 35960,
              59063: 35962,
              59064: 35970,
              59065: 35977,
              59066: 35973,
              59067: 35978,
              59068: 35981,
              59069: 35982,
              59070: 35988,
              59071: 35964,
              59072: 35992,
              59073: 25117,
              59074: 36013,
              59075: 36010,
              59076: 36029,
              59077: 36018,
              59078: 36019,
              59079: 36014,
              59080: 36022,
              59081: 36040,
              59082: 36033,
              59083: 36068,
              59084: 36067,
              59085: 36058,
              59086: 36093,
              59087: 36090,
              59088: 36091,
              59089: 36100,
              59090: 36101,
              59091: 36106,
              59092: 36103,
              59093: 36111,
              59094: 36109,
              59095: 36112,
              59096: 40782,
              59097: 36115,
              59098: 36045,
              59099: 36116,
              59100: 36118,
              59101: 36199,
              59102: 36205,
              59103: 36209,
              59104: 36211,
              59105: 36225,
              59106: 36249,
              59107: 36290,
              59108: 36286,
              59109: 36282,
              59110: 36303,
              59111: 36314,
              59112: 36310,
              59113: 36300,
              59114: 36315,
              59115: 36299,
              59116: 36330,
              59117: 36331,
              59118: 36319,
              59119: 36323,
              59120: 36348,
              59121: 36360,
              59122: 36361,
              59123: 36351,
              59124: 36381,
              59125: 36382,
              59126: 36368,
              59127: 36383,
              59128: 36418,
              59129: 36405,
              59130: 36400,
              59131: 36404,
              59132: 36426,
              59200: 36423,
              59201: 36425,
              59202: 36428,
              59203: 36432,
              59204: 36424,
              59205: 36441,
              59206: 36452,
              59207: 36448,
              59208: 36394,
              59209: 36451,
              59210: 36437,
              59211: 36470,
              59212: 36466,
              59213: 36476,
              59214: 36481,
              59215: 36487,
              59216: 36485,
              59217: 36484,
              59218: 36491,
              59219: 36490,
              59220: 36499,
              59221: 36497,
              59222: 36500,
              59223: 36505,
              59224: 36522,
              59225: 36513,
              59226: 36524,
              59227: 36528,
              59228: 36550,
              59229: 36529,
              59230: 36542,
              59231: 36549,
              59232: 36552,
              59233: 36555,
              59234: 36571,
              59235: 36579,
              59236: 36604,
              59237: 36603,
              59238: 36587,
              59239: 36606,
              59240: 36618,
              59241: 36613,
              59242: 36629,
              59243: 36626,
              59244: 36633,
              59245: 36627,
              59246: 36636,
              59247: 36639,
              59248: 36635,
              59249: 36620,
              59250: 36646,
              59251: 36659,
              59252: 36667,
              59253: 36665,
              59254: 36677,
              59255: 36674,
              59256: 36670,
              59257: 36684,
              59258: 36681,
              59259: 36678,
              59260: 36686,
              59261: 36695,
              59262: 36700,
              59264: 36706,
              59265: 36707,
              59266: 36708,
              59267: 36764,
              59268: 36767,
              59269: 36771,
              59270: 36781,
              59271: 36783,
              59272: 36791,
              59273: 36826,
              59274: 36837,
              59275: 36834,
              59276: 36842,
              59277: 36847,
              59278: 36999,
              59279: 36852,
              59280: 36869,
              59281: 36857,
              59282: 36858,
              59283: 36881,
              59284: 36885,
              59285: 36897,
              59286: 36877,
              59287: 36894,
              59288: 36886,
              59289: 36875,
              59290: 36903,
              59291: 36918,
              59292: 36917,
              59293: 36921,
              59294: 36856,
              59295: 36943,
              59296: 36944,
              59297: 36945,
              59298: 36946,
              59299: 36878,
              59300: 36937,
              59301: 36926,
              59302: 36950,
              59303: 36952,
              59304: 36958,
              59305: 36968,
              59306: 36975,
              59307: 36982,
              59308: 38568,
              59309: 36978,
              59310: 36994,
              59311: 36989,
              59312: 36993,
              59313: 36992,
              59314: 37002,
              59315: 37001,
              59316: 37007,
              59317: 37032,
              59318: 37039,
              59319: 37041,
              59320: 37045,
              59321: 37090,
              59322: 37092,
              59323: 25160,
              59324: 37083,
              59325: 37122,
              59326: 37138,
              59327: 37145,
              59328: 37170,
              59329: 37168,
              59330: 37194,
              59331: 37206,
              59332: 37208,
              59333: 37219,
              59334: 37221,
              59335: 37225,
              59336: 37235,
              59337: 37234,
              59338: 37259,
              59339: 37257,
              59340: 37250,
              59341: 37282,
              59342: 37291,
              59343: 37295,
              59344: 37290,
              59345: 37301,
              59346: 37300,
              59347: 37306,
              59348: 37312,
              59349: 37313,
              59350: 37321,
              59351: 37323,
              59352: 37328,
              59353: 37334,
              59354: 37343,
              59355: 37345,
              59356: 37339,
              59357: 37372,
              59358: 37365,
              59359: 37366,
              59360: 37406,
              59361: 37375,
              59362: 37396,
              59363: 37420,
              59364: 37397,
              59365: 37393,
              59366: 37470,
              59367: 37463,
              59368: 37445,
              59369: 37449,
              59370: 37476,
              59371: 37448,
              59372: 37525,
              59373: 37439,
              59374: 37451,
              59375: 37456,
              59376: 37532,
              59377: 37526,
              59378: 37523,
              59379: 37531,
              59380: 37466,
              59381: 37583,
              59382: 37561,
              59383: 37559,
              59384: 37609,
              59385: 37647,
              59386: 37626,
              59387: 37700,
              59388: 37678,
              59456: 37657,
              59457: 37666,
              59458: 37658,
              59459: 37667,
              59460: 37690,
              59461: 37685,
              59462: 37691,
              59463: 37724,
              59464: 37728,
              59465: 37756,
              59466: 37742,
              59467: 37718,
              59468: 37808,
              59469: 37804,
              59470: 37805,
              59471: 37780,
              59472: 37817,
              59473: 37846,
              59474: 37847,
              59475: 37864,
              59476: 37861,
              59477: 37848,
              59478: 37827,
              59479: 37853,
              59480: 37840,
              59481: 37832,
              59482: 37860,
              59483: 37914,
              59484: 37908,
              59485: 37907,
              59486: 37891,
              59487: 37895,
              59488: 37904,
              59489: 37942,
              59490: 37931,
              59491: 37941,
              59492: 37921,
              59493: 37946,
              59494: 37953,
              59495: 37970,
              59496: 37956,
              59497: 37979,
              59498: 37984,
              59499: 37986,
              59500: 37982,
              59501: 37994,
              59502: 37417,
              59503: 38e3,
              59504: 38005,
              59505: 38007,
              59506: 38013,
              59507: 37978,
              59508: 38012,
              59509: 38014,
              59510: 38017,
              59511: 38015,
              59512: 38274,
              59513: 38279,
              59514: 38282,
              59515: 38292,
              59516: 38294,
              59517: 38296,
              59518: 38297,
              59520: 38304,
              59521: 38312,
              59522: 38311,
              59523: 38317,
              59524: 38332,
              59525: 38331,
              59526: 38329,
              59527: 38334,
              59528: 38346,
              59529: 28662,
              59530: 38339,
              59531: 38349,
              59532: 38348,
              59533: 38357,
              59534: 38356,
              59535: 38358,
              59536: 38364,
              59537: 38369,
              59538: 38373,
              59539: 38370,
              59540: 38433,
              59541: 38440,
              59542: 38446,
              59543: 38447,
              59544: 38466,
              59545: 38476,
              59546: 38479,
              59547: 38475,
              59548: 38519,
              59549: 38492,
              59550: 38494,
              59551: 38493,
              59552: 38495,
              59553: 38502,
              59554: 38514,
              59555: 38508,
              59556: 38541,
              59557: 38552,
              59558: 38549,
              59559: 38551,
              59560: 38570,
              59561: 38567,
              59562: 38577,
              59563: 38578,
              59564: 38576,
              59565: 38580,
              59566: 38582,
              59567: 38584,
              59568: 38585,
              59569: 38606,
              59570: 38603,
              59571: 38601,
              59572: 38605,
              59573: 35149,
              59574: 38620,
              59575: 38669,
              59576: 38613,
              59577: 38649,
              59578: 38660,
              59579: 38662,
              59580: 38664,
              59581: 38675,
              59582: 38670,
              59583: 38673,
              59584: 38671,
              59585: 38678,
              59586: 38681,
              59587: 38692,
              59588: 38698,
              59589: 38704,
              59590: 38713,
              59591: 38717,
              59592: 38718,
              59593: 38724,
              59594: 38726,
              59595: 38728,
              59596: 38722,
              59597: 38729,
              59598: 38748,
              59599: 38752,
              59600: 38756,
              59601: 38758,
              59602: 38760,
              59603: 21202,
              59604: 38763,
              59605: 38769,
              59606: 38777,
              59607: 38789,
              59608: 38780,
              59609: 38785,
              59610: 38778,
              59611: 38790,
              59612: 38795,
              59613: 38799,
              59614: 38800,
              59615: 38812,
              59616: 38824,
              59617: 38822,
              59618: 38819,
              59619: 38835,
              59620: 38836,
              59621: 38851,
              59622: 38854,
              59623: 38856,
              59624: 38859,
              59625: 38876,
              59626: 38893,
              59627: 40783,
              59628: 38898,
              59629: 31455,
              59630: 38902,
              59631: 38901,
              59632: 38927,
              59633: 38924,
              59634: 38968,
              59635: 38948,
              59636: 38945,
              59637: 38967,
              59638: 38973,
              59639: 38982,
              59640: 38991,
              59641: 38987,
              59642: 39019,
              59643: 39023,
              59644: 39024,
              59712: 39025,
              59713: 39028,
              59714: 39027,
              59715: 39082,
              59716: 39087,
              59717: 39089,
              59718: 39094,
              59719: 39108,
              59720: 39107,
              59721: 39110,
              59722: 39145,
              59723: 39147,
              59724: 39171,
              59725: 39177,
              59726: 39186,
              59727: 39188,
              59728: 39192,
              59729: 39201,
              59730: 39197,
              59731: 39198,
              59732: 39204,
              59733: 39200,
              59734: 39212,
              59735: 39214,
              59736: 39229,
              59737: 39230,
              59738: 39234,
              59739: 39241,
              59740: 39237,
              59741: 39248,
              59742: 39243,
              59743: 39249,
              59744: 39250,
              59745: 39244,
              59746: 39253,
              59747: 39319,
              59748: 39320,
              59749: 39333,
              59750: 39341,
              59751: 39342,
              59752: 39356,
              59753: 39391,
              59754: 39387,
              59755: 39389,
              59756: 39384,
              59757: 39377,
              59758: 39405,
              59759: 39406,
              59760: 39409,
              59761: 39410,
              59762: 39419,
              59763: 39416,
              59764: 39425,
              59765: 39439,
              59766: 39429,
              59767: 39394,
              59768: 39449,
              59769: 39467,
              59770: 39479,
              59771: 39493,
              59772: 39490,
              59773: 39488,
              59774: 39491,
              59776: 39486,
              59777: 39509,
              59778: 39501,
              59779: 39515,
              59780: 39511,
              59781: 39519,
              59782: 39522,
              59783: 39525,
              59784: 39524,
              59785: 39529,
              59786: 39531,
              59787: 39530,
              59788: 39597,
              59789: 39600,
              59790: 39612,
              59791: 39616,
              59792: 39631,
              59793: 39633,
              59794: 39635,
              59795: 39636,
              59796: 39646,
              59797: 39647,
              59798: 39650,
              59799: 39651,
              59800: 39654,
              59801: 39663,
              59802: 39659,
              59803: 39662,
              59804: 39668,
              59805: 39665,
              59806: 39671,
              59807: 39675,
              59808: 39686,
              59809: 39704,
              59810: 39706,
              59811: 39711,
              59812: 39714,
              59813: 39715,
              59814: 39717,
              59815: 39719,
              59816: 39720,
              59817: 39721,
              59818: 39722,
              59819: 39726,
              59820: 39727,
              59821: 39730,
              59822: 39748,
              59823: 39747,
              59824: 39759,
              59825: 39757,
              59826: 39758,
              59827: 39761,
              59828: 39768,
              59829: 39796,
              59830: 39827,
              59831: 39811,
              59832: 39825,
              59833: 39830,
              59834: 39831,
              59835: 39839,
              59836: 39840,
              59837: 39848,
              59838: 39860,
              59839: 39872,
              59840: 39882,
              59841: 39865,
              59842: 39878,
              59843: 39887,
              59844: 39889,
              59845: 39890,
              59846: 39907,
              59847: 39906,
              59848: 39908,
              59849: 39892,
              59850: 39905,
              59851: 39994,
              59852: 39922,
              59853: 39921,
              59854: 39920,
              59855: 39957,
              59856: 39956,
              59857: 39945,
              59858: 39955,
              59859: 39948,
              59860: 39942,
              59861: 39944,
              59862: 39954,
              59863: 39946,
              59864: 39940,
              59865: 39982,
              59866: 39963,
              59867: 39973,
              59868: 39972,
              59869: 39969,
              59870: 39984,
              59871: 40007,
              59872: 39986,
              59873: 40006,
              59874: 39998,
              59875: 40026,
              59876: 40032,
              59877: 40039,
              59878: 40054,
              59879: 40056,
              59880: 40167,
              59881: 40172,
              59882: 40176,
              59883: 40201,
              59884: 40200,
              59885: 40171,
              59886: 40195,
              59887: 40198,
              59888: 40234,
              59889: 40230,
              59890: 40367,
              59891: 40227,
              59892: 40223,
              59893: 40260,
              59894: 40213,
              59895: 40210,
              59896: 40257,
              59897: 40255,
              59898: 40254,
              59899: 40262,
              59900: 40264,
              59968: 40285,
              59969: 40286,
              59970: 40292,
              59971: 40273,
              59972: 40272,
              59973: 40281,
              59974: 40306,
              59975: 40329,
              59976: 40327,
              59977: 40363,
              59978: 40303,
              59979: 40314,
              59980: 40346,
              59981: 40356,
              59982: 40361,
              59983: 40370,
              59984: 40388,
              59985: 40385,
              59986: 40379,
              59987: 40376,
              59988: 40378,
              59989: 40390,
              59990: 40399,
              59991: 40386,
              59992: 40409,
              59993: 40403,
              59994: 40440,
              59995: 40422,
              59996: 40429,
              59997: 40431,
              59998: 40445,
              59999: 40474,
              6e4: 40475,
              60001: 40478,
              60002: 40565,
              60003: 40569,
              60004: 40573,
              60005: 40577,
              60006: 40584,
              60007: 40587,
              60008: 40588,
              60009: 40594,
              60010: 40597,
              60011: 40593,
              60012: 40605,
              60013: 40613,
              60014: 40617,
              60015: 40632,
              60016: 40618,
              60017: 40621,
              60018: 38753,
              60019: 40652,
              60020: 40654,
              60021: 40655,
              60022: 40656,
              60023: 40660,
              60024: 40668,
              60025: 40670,
              60026: 40669,
              60027: 40672,
              60028: 40677,
              60029: 40680,
              60030: 40687,
              60032: 40692,
              60033: 40694,
              60034: 40695,
              60035: 40697,
              60036: 40699,
              60037: 40700,
              60038: 40701,
              60039: 40711,
              60040: 40712,
              60041: 30391,
              60042: 40725,
              60043: 40737,
              60044: 40748,
              60045: 40766,
              60046: 40778,
              60047: 40786,
              60048: 40788,
              60049: 40803,
              60050: 40799,
              60051: 40800,
              60052: 40801,
              60053: 40806,
              60054: 40807,
              60055: 40812,
              60056: 40810,
              60057: 40823,
              60058: 40818,
              60059: 40822,
              60060: 40853,
              60061: 40860,
              60062: 40864,
              60063: 22575,
              60064: 27079,
              60065: 36953,
              60066: 29796,
              60067: 20956,
              60068: 29081,
            }));
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(1),
            y = f(2);
          function l(B, s, D, c) {
            var h;
            s.degree() < D.degree() && ((h = [D, s]), (s = h[0]), (D = h[1]));
            for (var i = s, w = D, C = B.zero, n = B.one; w.degree() >= c / 2;) {
              var t = i,
                A = C;
              if (((i = w), (C = n), i.isZero())) return null;
              w = t;
              for (
                var F = B.zero, u = i.getCoefficient(i.degree()), k = B.inverse(u);
                w.degree() >= i.degree() && !w.isZero();
              ) {
                var g = w.degree() - i.degree(),
                  p = B.multiply(w.getCoefficient(w.degree()), k);
                ((F = F.addOrSubtract(B.buildMonomial(g, p))),
                  (w = w.addOrSubtract(i.multiplyByMonomial(g, p))));
              }
              if (((n = F.multiplyPoly(C).addOrSubtract(A)), w.degree() >= i.degree())) return null;
            }
            var m = n.getCoefficient(0);
            if (m === 0) return null;
            var b = B.inverse(m);
            return [n.multiply(b), w.multiply(b)];
          }
          function v(B, s) {
            var D = s.degree();
            if (D === 1) return [s.getCoefficient(1)];
            for (var c = new Array(D), h = 0, i = 1; i < B.size && h < D; i++)
              s.evaluateAt(i) === 0 && ((c[h] = B.inverse(i)), h++);
            return h !== D ? null : c;
          }
          function E(B, s, D) {
            for (var c = D.length, h = new Array(c), i = 0; i < c; i++) {
              for (var w = B.inverse(D[i]), C = 1, n = 0; n < c; n++)
                i !== n && (C = B.multiply(C, d.addOrSubtractGF(1, B.multiply(D[n], w))));
              ((h[i] = B.multiply(s.evaluateAt(w), B.inverse(C))),
                B.generatorBase !== 0 && (h[i] = B.multiply(h[i], w)));
            }
            return h;
          }
          function a(B, s) {
            var D = new Uint8ClampedArray(B.length);
            D.set(B);
            for (
              var c = new d.default(285, 256, 0),
                h = new y.default(c, D),
                i = new Uint8ClampedArray(s),
                w = !1,
                C = 0;
              C < s;
              C++
            ) {
              var n = h.evaluateAt(c.exp(C + c.generatorBase));
              ((i[i.length - 1 - C] = n), n !== 0 && (w = !0));
            }
            if (!w) return D;
            var t = new y.default(c, i),
              A = l(c, c.buildMonomial(s, 1), t, s);
            if (A === null) return null;
            var F = v(c, A[0]);
            if (F == null) return null;
            for (var u = E(c, A[1], F), k = 0; k < F.length; k++) {
              var g = D.length - 1 - c.log(F[k]);
              if (g < 0) return null;
              D[g] = d.addOrSubtractGF(D[g], u[k]);
            }
            return D;
          }
          e.decode = a;
        },
        function (x, e, f) {
          (Object.defineProperty(e, "__esModule", { value: !0 }),
            (e.VERSIONS = [
              {
                infoBits: null,
                versionNumber: 1,
                alignmentPatternCenters: [],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 7,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 19 }],
                  },
                  {
                    ecCodewordsPerBlock: 10,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 16 }],
                  },
                  {
                    ecCodewordsPerBlock: 13,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 13 }],
                  },
                  {
                    ecCodewordsPerBlock: 17,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 9 }],
                  },
                ],
              },
              {
                infoBits: null,
                versionNumber: 2,
                alignmentPatternCenters: [6, 18],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 10,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 34 }],
                  },
                  {
                    ecCodewordsPerBlock: 16,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 28 }],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 22 }],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 16 }],
                  },
                ],
              },
              {
                infoBits: null,
                versionNumber: 3,
                alignmentPatternCenters: [6, 22],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 15,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 55 }],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 44 }],
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 17 }],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 13 }],
                  },
                ],
              },
              {
                infoBits: null,
                versionNumber: 4,
                alignmentPatternCenters: [6, 26],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 80 }],
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 32 }],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 24 }],
                  },
                  {
                    ecCodewordsPerBlock: 16,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 9 }],
                  },
                ],
              },
              {
                infoBits: null,
                versionNumber: 5,
                alignmentPatternCenters: [6, 30],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 1, dataCodewordsPerBlock: 108 }],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 43 }],
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 15 },
                      { numBlocks: 2, dataCodewordsPerBlock: 16 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 11 },
                      { numBlocks: 2, dataCodewordsPerBlock: 12 },
                    ],
                  },
                ],
              },
              {
                infoBits: null,
                versionNumber: 6,
                alignmentPatternCenters: [6, 34],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 68 }],
                  },
                  {
                    ecCodewordsPerBlock: 16,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 27 }],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 19 }],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 15 }],
                  },
                ],
              },
              {
                infoBits: 31892,
                versionNumber: 7,
                alignmentPatternCenters: [6, 22, 38],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 78 }],
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 31 }],
                  },
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 14 },
                      { numBlocks: 4, dataCodewordsPerBlock: 15 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 13 },
                      { numBlocks: 1, dataCodewordsPerBlock: 14 },
                    ],
                  },
                ],
              },
              {
                infoBits: 34236,
                versionNumber: 8,
                alignmentPatternCenters: [6, 24, 42],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 97 }],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 38 },
                      { numBlocks: 2, dataCodewordsPerBlock: 39 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 18 },
                      { numBlocks: 2, dataCodewordsPerBlock: 19 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 14 },
                      { numBlocks: 2, dataCodewordsPerBlock: 15 },
                    ],
                  },
                ],
              },
              {
                infoBits: 39577,
                versionNumber: 9,
                alignmentPatternCenters: [6, 26, 46],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [{ numBlocks: 2, dataCodewordsPerBlock: 116 }],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 36 },
                      { numBlocks: 2, dataCodewordsPerBlock: 37 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 16 },
                      { numBlocks: 4, dataCodewordsPerBlock: 17 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 12 },
                      { numBlocks: 4, dataCodewordsPerBlock: 13 },
                    ],
                  },
                ],
              },
              {
                infoBits: 42195,
                versionNumber: 10,
                alignmentPatternCenters: [6, 28, 50],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 18,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 68 },
                      { numBlocks: 2, dataCodewordsPerBlock: 69 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 43 },
                      { numBlocks: 1, dataCodewordsPerBlock: 44 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 19 },
                      { numBlocks: 2, dataCodewordsPerBlock: 20 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 15 },
                      { numBlocks: 2, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 48118,
                versionNumber: 11,
                alignmentPatternCenters: [6, 30, 54],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 81 }],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 50 },
                      { numBlocks: 4, dataCodewordsPerBlock: 51 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 22 },
                      { numBlocks: 4, dataCodewordsPerBlock: 23 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 12 },
                      { numBlocks: 8, dataCodewordsPerBlock: 13 },
                    ],
                  },
                ],
              },
              {
                infoBits: 51042,
                versionNumber: 12,
                alignmentPatternCenters: [6, 32, 58],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 92 },
                      { numBlocks: 2, dataCodewordsPerBlock: 93 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 36 },
                      { numBlocks: 2, dataCodewordsPerBlock: 37 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 20 },
                      { numBlocks: 6, dataCodewordsPerBlock: 21 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 14 },
                      { numBlocks: 4, dataCodewordsPerBlock: 15 },
                    ],
                  },
                ],
              },
              {
                infoBits: 55367,
                versionNumber: 13,
                alignmentPatternCenters: [6, 34, 62],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 4, dataCodewordsPerBlock: 107 }],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 37 },
                      { numBlocks: 1, dataCodewordsPerBlock: 38 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 20 },
                      { numBlocks: 4, dataCodewordsPerBlock: 21 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 11 },
                      { numBlocks: 4, dataCodewordsPerBlock: 12 },
                    ],
                  },
                ],
              },
              {
                infoBits: 58893,
                versionNumber: 14,
                alignmentPatternCenters: [6, 26, 46, 66],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 115 },
                      { numBlocks: 1, dataCodewordsPerBlock: 116 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 40 },
                      { numBlocks: 5, dataCodewordsPerBlock: 41 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 20,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 16 },
                      { numBlocks: 5, dataCodewordsPerBlock: 17 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 12 },
                      { numBlocks: 5, dataCodewordsPerBlock: 13 },
                    ],
                  },
                ],
              },
              {
                infoBits: 63784,
                versionNumber: 15,
                alignmentPatternCenters: [6, 26, 48, 70],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 22,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 87 },
                      { numBlocks: 1, dataCodewordsPerBlock: 88 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 41 },
                      { numBlocks: 5, dataCodewordsPerBlock: 42 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 24 },
                      { numBlocks: 7, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 12 },
                      { numBlocks: 7, dataCodewordsPerBlock: 13 },
                    ],
                  },
                ],
              },
              {
                infoBits: 68472,
                versionNumber: 16,
                alignmentPatternCenters: [6, 26, 50, 74],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 98 },
                      { numBlocks: 1, dataCodewordsPerBlock: 99 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 45 },
                      { numBlocks: 3, dataCodewordsPerBlock: 46 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 19 },
                      { numBlocks: 2, dataCodewordsPerBlock: 20 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 15 },
                      { numBlocks: 13, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 70749,
                versionNumber: 17,
                alignmentPatternCenters: [6, 30, 54, 78],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 107 },
                      { numBlocks: 5, dataCodewordsPerBlock: 108 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 46 },
                      { numBlocks: 1, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 22 },
                      { numBlocks: 15, dataCodewordsPerBlock: 23 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 14 },
                      { numBlocks: 17, dataCodewordsPerBlock: 15 },
                    ],
                  },
                ],
              },
              {
                infoBits: 76311,
                versionNumber: 18,
                alignmentPatternCenters: [6, 30, 56, 82],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 120 },
                      { numBlocks: 1, dataCodewordsPerBlock: 121 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 9, dataCodewordsPerBlock: 43 },
                      { numBlocks: 4, dataCodewordsPerBlock: 44 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 22 },
                      { numBlocks: 1, dataCodewordsPerBlock: 23 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 14 },
                      { numBlocks: 19, dataCodewordsPerBlock: 15 },
                    ],
                  },
                ],
              },
              {
                infoBits: 79154,
                versionNumber: 19,
                alignmentPatternCenters: [6, 30, 58, 86],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 113 },
                      { numBlocks: 4, dataCodewordsPerBlock: 114 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 44 },
                      { numBlocks: 11, dataCodewordsPerBlock: 45 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 21 },
                      { numBlocks: 4, dataCodewordsPerBlock: 22 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 9, dataCodewordsPerBlock: 13 },
                      { numBlocks: 16, dataCodewordsPerBlock: 14 },
                    ],
                  },
                ],
              },
              {
                infoBits: 84390,
                versionNumber: 20,
                alignmentPatternCenters: [6, 34, 62, 90],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 107 },
                      { numBlocks: 5, dataCodewordsPerBlock: 108 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 41 },
                      { numBlocks: 13, dataCodewordsPerBlock: 42 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 24 },
                      { numBlocks: 5, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 15 },
                      { numBlocks: 10, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 87683,
                versionNumber: 21,
                alignmentPatternCenters: [6, 28, 50, 72, 94],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 116 },
                      { numBlocks: 4, dataCodewordsPerBlock: 117 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 42 }],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 22 },
                      { numBlocks: 6, dataCodewordsPerBlock: 23 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 16 },
                      { numBlocks: 6, dataCodewordsPerBlock: 17 },
                    ],
                  },
                ],
              },
              {
                infoBits: 92361,
                versionNumber: 22,
                alignmentPatternCenters: [6, 26, 50, 74, 98],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 111 },
                      { numBlocks: 7, dataCodewordsPerBlock: 112 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 46 }],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 24 },
                      { numBlocks: 16, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 24,
                    ecBlocks: [{ numBlocks: 34, dataCodewordsPerBlock: 13 }],
                  },
                ],
              },
              {
                infoBits: 96236,
                versionNumber: 23,
                alignmentPatternCenters: [6, 30, 54, 74, 102],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 121 },
                      { numBlocks: 5, dataCodewordsPerBlock: 122 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 47 },
                      { numBlocks: 14, dataCodewordsPerBlock: 48 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 24 },
                      { numBlocks: 14, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 16, dataCodewordsPerBlock: 15 },
                      { numBlocks: 14, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 102084,
                versionNumber: 24,
                alignmentPatternCenters: [6, 28, 54, 80, 106],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 117 },
                      { numBlocks: 4, dataCodewordsPerBlock: 118 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 45 },
                      { numBlocks: 14, dataCodewordsPerBlock: 46 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 24 },
                      { numBlocks: 16, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 30, dataCodewordsPerBlock: 16 },
                      { numBlocks: 2, dataCodewordsPerBlock: 17 },
                    ],
                  },
                ],
              },
              {
                infoBits: 102881,
                versionNumber: 25,
                alignmentPatternCenters: [6, 32, 58, 84, 110],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 26,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 106 },
                      { numBlocks: 4, dataCodewordsPerBlock: 107 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 47 },
                      { numBlocks: 13, dataCodewordsPerBlock: 48 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 24 },
                      { numBlocks: 22, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 22, dataCodewordsPerBlock: 15 },
                      { numBlocks: 13, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 110507,
                versionNumber: 26,
                alignmentPatternCenters: [6, 30, 58, 86, 114],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 114 },
                      { numBlocks: 2, dataCodewordsPerBlock: 115 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 46 },
                      { numBlocks: 4, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 28, dataCodewordsPerBlock: 22 },
                      { numBlocks: 6, dataCodewordsPerBlock: 23 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 33, dataCodewordsPerBlock: 16 },
                      { numBlocks: 4, dataCodewordsPerBlock: 17 },
                    ],
                  },
                ],
              },
              {
                infoBits: 110734,
                versionNumber: 27,
                alignmentPatternCenters: [6, 34, 62, 90, 118],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 122 },
                      { numBlocks: 4, dataCodewordsPerBlock: 123 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 22, dataCodewordsPerBlock: 45 },
                      { numBlocks: 3, dataCodewordsPerBlock: 46 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 8, dataCodewordsPerBlock: 23 },
                      { numBlocks: 26, dataCodewordsPerBlock: 24 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 15 },
                      { numBlocks: 28, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 117786,
                versionNumber: 28,
                alignmentPatternCenters: [6, 26, 50, 74, 98, 122],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 117 },
                      { numBlocks: 10, dataCodewordsPerBlock: 118 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 3, dataCodewordsPerBlock: 45 },
                      { numBlocks: 23, dataCodewordsPerBlock: 46 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 24 },
                      { numBlocks: 31, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 15 },
                      { numBlocks: 31, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 119615,
                versionNumber: 29,
                alignmentPatternCenters: [6, 30, 54, 78, 102, 126],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 7, dataCodewordsPerBlock: 116 },
                      { numBlocks: 7, dataCodewordsPerBlock: 117 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 21, dataCodewordsPerBlock: 45 },
                      { numBlocks: 7, dataCodewordsPerBlock: 46 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 1, dataCodewordsPerBlock: 23 },
                      { numBlocks: 37, dataCodewordsPerBlock: 24 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 15 },
                      { numBlocks: 26, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 126325,
                versionNumber: 30,
                alignmentPatternCenters: [6, 26, 52, 78, 104, 130],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 5, dataCodewordsPerBlock: 115 },
                      { numBlocks: 10, dataCodewordsPerBlock: 116 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 47 },
                      { numBlocks: 10, dataCodewordsPerBlock: 48 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 15, dataCodewordsPerBlock: 24 },
                      { numBlocks: 25, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 23, dataCodewordsPerBlock: 15 },
                      { numBlocks: 25, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 127568,
                versionNumber: 31,
                alignmentPatternCenters: [6, 30, 56, 82, 108, 134],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 13, dataCodewordsPerBlock: 115 },
                      { numBlocks: 3, dataCodewordsPerBlock: 116 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 46 },
                      { numBlocks: 29, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 42, dataCodewordsPerBlock: 24 },
                      { numBlocks: 1, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 23, dataCodewordsPerBlock: 15 },
                      { numBlocks: 28, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 133589,
                versionNumber: 32,
                alignmentPatternCenters: [6, 34, 60, 86, 112, 138],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [{ numBlocks: 17, dataCodewordsPerBlock: 115 }],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 46 },
                      { numBlocks: 23, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 24 },
                      { numBlocks: 35, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 15 },
                      { numBlocks: 35, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 136944,
                versionNumber: 33,
                alignmentPatternCenters: [6, 30, 58, 86, 114, 142],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 115 },
                      { numBlocks: 1, dataCodewordsPerBlock: 116 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 14, dataCodewordsPerBlock: 46 },
                      { numBlocks: 21, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 29, dataCodewordsPerBlock: 24 },
                      { numBlocks: 19, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 11, dataCodewordsPerBlock: 15 },
                      { numBlocks: 46, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 141498,
                versionNumber: 34,
                alignmentPatternCenters: [6, 34, 62, 90, 118, 146],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 13, dataCodewordsPerBlock: 115 },
                      { numBlocks: 6, dataCodewordsPerBlock: 116 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 14, dataCodewordsPerBlock: 46 },
                      { numBlocks: 23, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 44, dataCodewordsPerBlock: 24 },
                      { numBlocks: 7, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 59, dataCodewordsPerBlock: 16 },
                      { numBlocks: 1, dataCodewordsPerBlock: 17 },
                    ],
                  },
                ],
              },
              {
                infoBits: 145311,
                versionNumber: 35,
                alignmentPatternCenters: [6, 30, 54, 78, 102, 126, 150],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 121 },
                      { numBlocks: 7, dataCodewordsPerBlock: 122 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 12, dataCodewordsPerBlock: 47 },
                      { numBlocks: 26, dataCodewordsPerBlock: 48 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 39, dataCodewordsPerBlock: 24 },
                      { numBlocks: 14, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 22, dataCodewordsPerBlock: 15 },
                      { numBlocks: 41, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 150283,
                versionNumber: 36,
                alignmentPatternCenters: [6, 24, 50, 76, 102, 128, 154],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 121 },
                      { numBlocks: 14, dataCodewordsPerBlock: 122 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 6, dataCodewordsPerBlock: 47 },
                      { numBlocks: 34, dataCodewordsPerBlock: 48 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 46, dataCodewordsPerBlock: 24 },
                      { numBlocks: 10, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 2, dataCodewordsPerBlock: 15 },
                      { numBlocks: 64, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 152622,
                versionNumber: 37,
                alignmentPatternCenters: [6, 28, 54, 80, 106, 132, 158],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 17, dataCodewordsPerBlock: 122 },
                      { numBlocks: 4, dataCodewordsPerBlock: 123 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 29, dataCodewordsPerBlock: 46 },
                      { numBlocks: 14, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 49, dataCodewordsPerBlock: 24 },
                      { numBlocks: 10, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 24, dataCodewordsPerBlock: 15 },
                      { numBlocks: 46, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 158308,
                versionNumber: 38,
                alignmentPatternCenters: [6, 32, 58, 84, 110, 136, 162],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 4, dataCodewordsPerBlock: 122 },
                      { numBlocks: 18, dataCodewordsPerBlock: 123 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 13, dataCodewordsPerBlock: 46 },
                      { numBlocks: 32, dataCodewordsPerBlock: 47 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 48, dataCodewordsPerBlock: 24 },
                      { numBlocks: 14, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 42, dataCodewordsPerBlock: 15 },
                      { numBlocks: 32, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 161089,
                versionNumber: 39,
                alignmentPatternCenters: [6, 26, 54, 82, 110, 138, 166],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 20, dataCodewordsPerBlock: 117 },
                      { numBlocks: 4, dataCodewordsPerBlock: 118 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 40, dataCodewordsPerBlock: 47 },
                      { numBlocks: 7, dataCodewordsPerBlock: 48 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 43, dataCodewordsPerBlock: 24 },
                      { numBlocks: 22, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 10, dataCodewordsPerBlock: 15 },
                      { numBlocks: 67, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
              {
                infoBits: 167017,
                versionNumber: 40,
                alignmentPatternCenters: [6, 30, 58, 86, 114, 142, 170],
                errorCorrectionLevels: [
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 19, dataCodewordsPerBlock: 118 },
                      { numBlocks: 6, dataCodewordsPerBlock: 119 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 28,
                    ecBlocks: [
                      { numBlocks: 18, dataCodewordsPerBlock: 47 },
                      { numBlocks: 31, dataCodewordsPerBlock: 48 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 34, dataCodewordsPerBlock: 24 },
                      { numBlocks: 34, dataCodewordsPerBlock: 25 },
                    ],
                  },
                  {
                    ecCodewordsPerBlock: 30,
                    ecBlocks: [
                      { numBlocks: 20, dataCodewordsPerBlock: 15 },
                      { numBlocks: 61, dataCodewordsPerBlock: 16 },
                    ],
                  },
                ],
              },
            ]));
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = f(0);
          function y(a, B, s, D) {
            var c = a.x - B.x + s.x - D.x,
              h = a.y - B.y + s.y - D.y;
            if (c === 0 && h === 0)
              return {
                a11: B.x - a.x,
                a12: B.y - a.y,
                a13: 0,
                a21: s.x - B.x,
                a22: s.y - B.y,
                a23: 0,
                a31: a.x,
                a32: a.y,
                a33: 1,
              };
            var i = B.x - s.x,
              w = D.x - s.x,
              C = B.y - s.y,
              n = D.y - s.y,
              t = i * n - w * C,
              A = (c * n - w * h) / t,
              F = (i * h - c * C) / t;
            return {
              a11: B.x - a.x + A * B.x,
              a12: B.y - a.y + A * B.y,
              a13: A,
              a21: D.x - a.x + F * D.x,
              a22: D.y - a.y + F * D.y,
              a23: F,
              a31: a.x,
              a32: a.y,
              a33: 1,
            };
          }
          function l(a, B, s, D) {
            var c = y(a, B, s, D);
            return {
              a11: c.a22 * c.a33 - c.a23 * c.a32,
              a12: c.a13 * c.a32 - c.a12 * c.a33,
              a13: c.a12 * c.a23 - c.a13 * c.a22,
              a21: c.a23 * c.a31 - c.a21 * c.a33,
              a22: c.a11 * c.a33 - c.a13 * c.a31,
              a23: c.a13 * c.a21 - c.a11 * c.a23,
              a31: c.a21 * c.a32 - c.a22 * c.a31,
              a32: c.a12 * c.a31 - c.a11 * c.a32,
              a33: c.a11 * c.a22 - c.a12 * c.a21,
            };
          }
          function v(a, B) {
            return {
              a11: a.a11 * B.a11 + a.a21 * B.a12 + a.a31 * B.a13,
              a12: a.a12 * B.a11 + a.a22 * B.a12 + a.a32 * B.a13,
              a13: a.a13 * B.a11 + a.a23 * B.a12 + a.a33 * B.a13,
              a21: a.a11 * B.a21 + a.a21 * B.a22 + a.a31 * B.a23,
              a22: a.a12 * B.a21 + a.a22 * B.a22 + a.a32 * B.a23,
              a23: a.a13 * B.a21 + a.a23 * B.a22 + a.a33 * B.a23,
              a31: a.a11 * B.a31 + a.a21 * B.a32 + a.a31 * B.a33,
              a32: a.a12 * B.a31 + a.a22 * B.a32 + a.a32 * B.a33,
              a33: a.a13 * B.a31 + a.a23 * B.a32 + a.a33 * B.a33,
            };
          }
          function E(a, B) {
            for (
              var s = l(
                  { x: 3.5, y: 3.5 },
                  { x: B.dimension - 3.5, y: 3.5 },
                  { x: B.dimension - 6.5, y: B.dimension - 6.5 },
                  { x: 3.5, y: B.dimension - 3.5 },
                ),
                D = y(B.topLeft, B.topRight, B.alignmentPattern, B.bottomLeft),
                c = v(D, s),
                h = d.BitMatrix.createEmpty(B.dimension, B.dimension),
                i = function (F, u) {
                  var k = c.a13 * F + c.a23 * u + c.a33;
                  return {
                    x: (c.a11 * F + c.a21 * u + c.a31) / k,
                    y: (c.a12 * F + c.a22 * u + c.a32) / k,
                  };
                },
                w = 0;
              w < B.dimension;
              w++
            )
              for (var C = 0; C < B.dimension; C++) {
                var n = C + 0.5,
                  t = w + 0.5,
                  A = i(n, t);
                h.set(C, w, a.get(Math.floor(A.x), Math.floor(A.y)));
              }
            return { matrix: h, mappingFunction: i };
          }
          e.extract = E;
        },
        function (x, e, f) {
          Object.defineProperty(e, "__esModule", { value: !0 });
          var d = 4,
            y = 0.5,
            l = 1.5,
            v = function (n, t) {
              return Math.sqrt(Math.pow(t.x - n.x, 2) + Math.pow(t.y - n.y, 2));
            };
          function E(n) {
            return n.reduce(function (t, A) {
              return t + A;
            });
          }
          function a(n, t, A) {
            var F,
              u,
              k,
              g,
              p = v(n, t),
              m = v(t, A),
              b = v(n, A),
              S,
              z,
              M;
            return (
              m >= p && m >= b
                ? ((F = [t, n, A]), (S = F[0]), (z = F[1]), (M = F[2]))
                : b >= m && b >= p
                  ? ((u = [n, t, A]), (S = u[0]), (z = u[1]), (M = u[2]))
                  : ((k = [n, A, t]), (S = k[0]), (z = k[1]), (M = k[2])),
              (M.x - z.x) * (S.y - z.y) - (M.y - z.y) * (S.x - z.x) < 0 &&
                ((g = [M, S]), (S = g[0]), (M = g[1])),
              { bottomLeft: S, topLeft: z, topRight: M }
            );
          }
          function B(n, t, A, F) {
            var u =
              (E(D(n, A, F, 5)) / 7 +
                E(D(n, t, F, 5)) / 7 +
                E(D(A, n, F, 5)) / 7 +
                E(D(t, n, F, 5)) / 7) /
              4;
            if (u < 1) throw new Error("Invalid module size");
            var k = Math.round(v(n, t) / u),
              g = Math.round(v(n, A) / u),
              p = Math.floor((k + g) / 2) + 7;
            switch (p % 4) {
              case 0:
                p++;
                break;
              case 2:
                p--;
                break;
            }
            return { dimension: p, moduleSize: u };
          }
          function s(n, t, A, F) {
            var u = [{ x: Math.floor(n.x), y: Math.floor(n.y) }],
              k = Math.abs(t.y - n.y) > Math.abs(t.x - n.x),
              g,
              p,
              m,
              b;
            k
              ? ((g = Math.floor(n.y)),
                (p = Math.floor(n.x)),
                (m = Math.floor(t.y)),
                (b = Math.floor(t.x)))
              : ((g = Math.floor(n.x)),
                (p = Math.floor(n.y)),
                (m = Math.floor(t.x)),
                (b = Math.floor(t.y)));
            for (
              var S = Math.abs(m - g),
                z = Math.abs(b - p),
                M = Math.floor(-S / 2),
                R = g < m ? 1 : -1,
                I = p < b ? 1 : -1,
                H = !0,
                N = g,
                O = p;
              N !== m + R;
              N += R
            ) {
              var P = k ? O : N,
                T = k ? N : O;
              if (A.get(P, T) !== H && ((H = !H), u.push({ x: P, y: T }), u.length === F + 1))
                break;
              if (((M += z), M > 0)) {
                if (O === b) break;
                ((O += I), (M -= S));
              }
            }
            for (var L = [], _ = 0; _ < F; _++)
              u[_] && u[_ + 1] ? L.push(v(u[_], u[_ + 1])) : L.push(0);
            return L;
          }
          function D(n, t, A, F) {
            var u,
              k = t.y - n.y,
              g = t.x - n.x,
              p = s(n, t, A, Math.ceil(F / 2)),
              m = s(n, { x: n.x - g, y: n.y - k }, A, Math.ceil(F / 2)),
              b = p.shift() + m.shift() - 1;
            return (u = m.concat(b)).concat.apply(u, p);
          }
          function c(n, t) {
            var A = E(n) / E(t),
              F = 0;
            return (
              t.forEach(function (u, k) {
                F += Math.pow(n[k] - u * A, 2);
              }),
              { averageSize: A, error: F }
            );
          }
          function h(n, t, A) {
            try {
              var F = D(n, { x: -1, y: n.y }, A, t.length),
                u = D(n, { x: n.x, y: -1 }, A, t.length),
                k = { x: Math.max(0, n.x - n.y) - 1, y: Math.max(0, n.y - n.x) - 1 },
                g = D(n, k, A, t.length),
                p = { x: Math.min(A.width, n.x + n.y) + 1, y: Math.min(A.height, n.y + n.x) + 1 },
                m = D(n, p, A, t.length),
                b = c(F, t),
                S = c(u, t),
                z = c(g, t),
                M = c(m, t),
                R = Math.sqrt(
                  b.error * b.error + S.error * S.error + z.error * z.error + M.error * M.error,
                ),
                I = (b.averageSize + S.averageSize + z.averageSize + M.averageSize) / 4,
                H =
                  (Math.pow(b.averageSize - I, 2) +
                    Math.pow(S.averageSize - I, 2) +
                    Math.pow(z.averageSize - I, 2) +
                    Math.pow(M.averageSize - I, 2)) /
                  I;
              return R + H;
            } catch {
              return 1 / 0;
            }
          }
          function i(n, t) {
            for (var A = Math.round(t.x); n.get(A, Math.round(t.y));) A--;
            for (var F = Math.round(t.x); n.get(F, Math.round(t.y));) F++;
            for (var u = (A + F) / 2, k = Math.round(t.y); n.get(Math.round(u), k);) k--;
            for (var g = Math.round(t.y); n.get(Math.round(u), g);) g++;
            var p = (k + g) / 2;
            return { x: u, y: p };
          }
          function w(n) {
            for (
              var t = [],
                A = [],
                F = [],
                u = [],
                k = function (P) {
                  for (
                    var T = 0,
                      L = !1,
                      _ = [0, 0, 0, 0, 0],
                      Q = function (K) {
                        var j = n.get(K, P);
                        if (j === L) T++;
                        else {
                          ((_ = [_[1], _[2], _[3], _[4], T]), (T = 1), (L = j));
                          var x0 = E(_) / 7,
                            i0 =
                              Math.abs(_[0] - x0) < x0 &&
                              Math.abs(_[1] - x0) < x0 &&
                              Math.abs(_[2] - 3 * x0) < 3 * x0 &&
                              Math.abs(_[3] - x0) < x0 &&
                              Math.abs(_[4] - x0) < x0 &&
                              !j,
                            s0 = E(_.slice(-3)) / 3,
                            d0 =
                              Math.abs(_[2] - s0) < s0 &&
                              Math.abs(_[3] - s0) < s0 &&
                              Math.abs(_[4] - s0) < s0 &&
                              j;
                          if (i0) {
                            var e0 = K - _[3] - _[4],
                              Y = e0 - _[2],
                              o0 = { startX: Y, endX: e0, y: P },
                              a0 = A.filter(function (r0) {
                                return (
                                  (Y >= r0.bottom.startX && Y <= r0.bottom.endX) ||
                                  (e0 >= r0.bottom.startX && Y <= r0.bottom.endX) ||
                                  (Y <= r0.bottom.startX &&
                                    e0 >= r0.bottom.endX &&
                                    _[2] / (r0.bottom.endX - r0.bottom.startX) < l &&
                                    _[2] / (r0.bottom.endX - r0.bottom.startX) > y)
                                );
                              });
                            a0.length > 0 ? (a0[0].bottom = o0) : A.push({ top: o0, bottom: o0 });
                          }
                          if (d0) {
                            var B0 = K - _[4],
                              n0 = B0 - _[3],
                              o0 = { startX: n0, y: P, endX: B0 },
                              a0 = u.filter(function (Z) {
                                return (
                                  (n0 >= Z.bottom.startX && n0 <= Z.bottom.endX) ||
                                  (B0 >= Z.bottom.startX && n0 <= Z.bottom.endX) ||
                                  (n0 <= Z.bottom.startX &&
                                    B0 >= Z.bottom.endX &&
                                    _[2] / (Z.bottom.endX - Z.bottom.startX) < l &&
                                    _[2] / (Z.bottom.endX - Z.bottom.startX) > y)
                                );
                              });
                            a0.length > 0 ? (a0[0].bottom = o0) : u.push({ top: o0, bottom: o0 });
                          }
                        }
                      },
                      q = -1;
                    q <= n.width;
                    q++
                  )
                    Q(q);
                  (t.push.apply(
                    t,
                    A.filter(function (K) {
                      return K.bottom.y !== P && K.bottom.y - K.top.y >= 2;
                    }),
                  ),
                    (A = A.filter(function (K) {
                      return K.bottom.y === P;
                    })),
                    F.push.apply(
                      F,
                      u.filter(function (K) {
                        return K.bottom.y !== P;
                      }),
                    ),
                    (u = u.filter(function (K) {
                      return K.bottom.y === P;
                    })));
                },
                g = 0;
              g <= n.height;
              g++
            )
              k(g);
            (t.push.apply(
              t,
              A.filter(function (P) {
                return P.bottom.y - P.top.y >= 2;
              }),
            ),
              F.push.apply(F, u));
            var p = t
              .filter(function (P) {
                return P.bottom.y - P.top.y >= 2;
              })
              .map(function (P) {
                var T = (P.top.startX + P.top.endX + P.bottom.startX + P.bottom.endX) / 4,
                  L = (P.top.y + P.bottom.y + 1) / 2;
                if (n.get(Math.round(T), Math.round(L))) {
                  var _ = [
                      P.top.endX - P.top.startX,
                      P.bottom.endX - P.bottom.startX,
                      P.bottom.y - P.top.y + 1,
                    ],
                    Q = E(_) / _.length,
                    q = h({ x: Math.round(T), y: Math.round(L) }, [1, 1, 3, 1, 1], n);
                  return { score: q, x: T, y: L, size: Q };
                }
              })
              .filter(function (P) {
                return !!P;
              })
              .sort(function (P, T) {
                return P.score - T.score;
              })
              .map(function (P, T, L) {
                if (T > d) return null;
                var _ = L.filter(function (q, K) {
                  return T !== K;
                })
                  .map(function (q) {
                    return {
                      x: q.x,
                      y: q.y,
                      score: q.score + Math.pow(q.size - P.size, 2) / P.size,
                      size: q.size,
                    };
                  })
                  .sort(function (q, K) {
                    return q.score - K.score;
                  });
                if (_.length < 2) return null;
                var Q = P.score + _[0].score + _[1].score;
                return { points: [P].concat(_.slice(0, 2)), score: Q };
              })
              .filter(function (P) {
                return !!P;
              })
              .sort(function (P, T) {
                return P.score - T.score;
              });
            if (p.length === 0) return null;
            var m = a(p[0].points[0], p[0].points[1], p[0].points[2]),
              b = m.topRight,
              S = m.topLeft,
              z = m.bottomLeft,
              M = C(n, F, b, S, z),
              R = [];
            M &&
              R.push({
                alignmentPattern: { x: M.alignmentPattern.x, y: M.alignmentPattern.y },
                bottomLeft: { x: z.x, y: z.y },
                dimension: M.dimension,
                topLeft: { x: S.x, y: S.y },
                topRight: { x: b.x, y: b.y },
              });
            var I = i(n, b),
              H = i(n, S),
              N = i(n, z),
              O = C(n, F, I, H, N);
            return (
              O &&
                R.push({
                  alignmentPattern: { x: O.alignmentPattern.x, y: O.alignmentPattern.y },
                  bottomLeft: { x: N.x, y: N.y },
                  topLeft: { x: H.x, y: H.y },
                  topRight: { x: I.x, y: I.y },
                  dimension: O.dimension,
                }),
              R.length === 0 ? null : R
            );
          }
          e.locate = w;
          function C(n, t, A, F, u) {
            var k, g, p;
            try {
              ((k = B(F, A, u, n)), (g = k.dimension), (p = k.moduleSize));
            } catch {
              return null;
            }
            var m = { x: A.x - F.x + u.x, y: A.y - F.y + u.y },
              b = (v(F, u) + v(F, A)) / 2 / p,
              S = 1 - 3 / b,
              z = { x: F.x + S * (m.x - F.x), y: F.y + S * (m.y - F.y) },
              M = t
                .map(function (I) {
                  var H = (I.top.startX + I.top.endX + I.bottom.startX + I.bottom.endX) / 4,
                    N = (I.top.y + I.bottom.y + 1) / 2;
                  if (n.get(Math.floor(H), Math.floor(N))) {
                    var O = [
                      I.top.endX - I.top.startX,
                      I.bottom.endX - I.bottom.startX,
                      I.bottom.y - I.top.y + 1,
                    ];
                    E(O) / O.length;
                    var P = h({ x: Math.floor(H), y: Math.floor(N) }, [1, 1, 1], n),
                      T = P + v({ x: H, y: N }, z);
                    return { x: H, y: N, score: T };
                  }
                })
                .filter(function (I) {
                  return !!I;
                })
                .sort(function (I, H) {
                  return I.score - H.score;
                }),
              R = b >= 15 && M.length ? M[0] : z;
            return { alignmentPattern: R, dimension: g };
          }
        },
      ]).default;
    });
  })(ix);
  var me = ix.exports;
  const ge = we(me),
    ye = {
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
  let Ax = {};
  Ax = ye;
  const Fx = Ax,
    be = Fx.VUE_APP_MMS,
    Pe = (r) =>
      new Promise((o) => {
        chrome.cookies.get({ url: r.url || be, name: r.name }, (x) => {
          o((x == null ? void 0 : x.value) || null);
        });
      }),
    Se = "get_chrome_cookie",
    _e = Fx.VUE_APP_MMS;
  function Te(r) {
    var e;
    const o = r.url ?? _e,
      { name: x } = r;
    return typeof chrome > "u" || !((e = chrome.runtime) != null && e.sendMessage)
      ? Promise.resolve(null)
      : chrome.runtime
          .sendMessage({ type: Se, url: o, name: x })
          .then((f) => (f == null ? void 0 : f.value) ?? null)
          .catch(() => null);
  }
  const Me = "chrome_token";
  function ze() {
    var r;
    return (
      typeof chrome < "u" && typeof ((r = chrome.cookies) == null ? void 0 : r.get) == "function"
    );
  }
  async function y0(r) {
    return ze() ? Pe(r) : Te(r);
  }
  const Le = "browserVersion";
  async function Re() {
    return await y0({ name: Le });
  }
  async function Ie() {
    return await y0({ name: Me });
  }
  async function He() {
    return await y0({ name: "lang" });
  }
  var Dx = { exports: {} };
  function Oe(r) {
    throw new Error(
      'Could not dynamically require "' +
        r +
        '". Please configure the dynamicRequireTargets or/and ignoreDynamicRequires option of @rollup/plugin-commonjs appropriately for this require call to work.',
    );
  }
  var b0 = { exports: {} };
  const Ne = ke(
    Object.freeze(
      Object.defineProperty({ __proto__: null, default: {} }, Symbol.toStringTag, {
        value: "Module",
      }),
    ),
  );
  var lx;
  function X() {
    return (
      lx ||
        ((lx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e();
          })(V, function () {
            var x =
              x ||
              (function (e, f) {
                var d;
                if (
                  (typeof window < "u" && window.crypto && (d = window.crypto),
                  typeof self < "u" && self.crypto && (d = self.crypto),
                  typeof globalThis < "u" && globalThis.crypto && (d = globalThis.crypto),
                  !d && typeof window < "u" && window.msCrypto && (d = window.msCrypto),
                  !d && typeof V < "u" && V.crypto && (d = V.crypto),
                  !d && typeof Oe == "function")
                )
                  try {
                    d = Ne;
                  } catch {}
                var y = function () {
                    if (d) {
                      if (typeof d.getRandomValues == "function")
                        try {
                          return d.getRandomValues(new Uint32Array(1))[0];
                        } catch {}
                      if (typeof d.randomBytes == "function")
                        try {
                          return d.randomBytes(4).readInt32LE();
                        } catch {}
                    }
                    throw new Error(
                      "Native crypto module could not be used to get secure random number.",
                    );
                  },
                  l =
                    Object.create ||
                    (function () {
                      function C() {}
                      return function (n) {
                        var t;
                        return ((C.prototype = n), (t = new C()), (C.prototype = null), t);
                      };
                    })(),
                  v = {},
                  E = (v.lib = {}),
                  a = (E.Base = (function () {
                    return {
                      extend: function (C) {
                        var n = l(this);
                        return (
                          C && n.mixIn(C),
                          (!n.hasOwnProperty("init") || this.init === n.init) &&
                            (n.init = function () {
                              n.$super.init.apply(this, arguments);
                            }),
                          (n.init.prototype = n),
                          (n.$super = this),
                          n
                        );
                      },
                      create: function () {
                        var C = this.extend();
                        return (C.init.apply(C, arguments), C);
                      },
                      init: function () {},
                      mixIn: function (C) {
                        for (var n in C) C.hasOwnProperty(n) && (this[n] = C[n]);
                        C.hasOwnProperty("toString") && (this.toString = C.toString);
                      },
                      clone: function () {
                        return this.init.prototype.extend(this);
                      },
                    };
                  })()),
                  B = (E.WordArray = a.extend({
                    init: function (C, n) {
                      ((C = this.words = C || []),
                        n != f ? (this.sigBytes = n) : (this.sigBytes = C.length * 4));
                    },
                    toString: function (C) {
                      return (C || D).stringify(this);
                    },
                    concat: function (C) {
                      var n = this.words,
                        t = C.words,
                        A = this.sigBytes,
                        F = C.sigBytes;
                      if ((this.clamp(), A % 4))
                        for (var u = 0; u < F; u++) {
                          var k = (t[u >>> 2] >>> (24 - (u % 4) * 8)) & 255;
                          n[(A + u) >>> 2] |= k << (24 - ((A + u) % 4) * 8);
                        }
                      else for (var g = 0; g < F; g += 4) n[(A + g) >>> 2] = t[g >>> 2];
                      return ((this.sigBytes += F), this);
                    },
                    clamp: function () {
                      var C = this.words,
                        n = this.sigBytes;
                      ((C[n >>> 2] &= 4294967295 << (32 - (n % 4) * 8)),
                        (C.length = e.ceil(n / 4)));
                    },
                    clone: function () {
                      var C = a.clone.call(this);
                      return ((C.words = this.words.slice(0)), C);
                    },
                    random: function (C) {
                      for (var n = [], t = 0; t < C; t += 4) n.push(y());
                      return new B.init(n, C);
                    },
                  })),
                  s = (v.enc = {}),
                  D = (s.Hex = {
                    stringify: function (C) {
                      for (var n = C.words, t = C.sigBytes, A = [], F = 0; F < t; F++) {
                        var u = (n[F >>> 2] >>> (24 - (F % 4) * 8)) & 255;
                        (A.push((u >>> 4).toString(16)), A.push((u & 15).toString(16)));
                      }
                      return A.join("");
                    },
                    parse: function (C) {
                      for (var n = C.length, t = [], A = 0; A < n; A += 2)
                        t[A >>> 3] |= parseInt(C.substr(A, 2), 16) << (24 - (A % 8) * 4);
                      return new B.init(t, n / 2);
                    },
                  }),
                  c = (s.Latin1 = {
                    stringify: function (C) {
                      for (var n = C.words, t = C.sigBytes, A = [], F = 0; F < t; F++) {
                        var u = (n[F >>> 2] >>> (24 - (F % 4) * 8)) & 255;
                        A.push(String.fromCharCode(u));
                      }
                      return A.join("");
                    },
                    parse: function (C) {
                      for (var n = C.length, t = [], A = 0; A < n; A++)
                        t[A >>> 2] |= (C.charCodeAt(A) & 255) << (24 - (A % 4) * 8);
                      return new B.init(t, n);
                    },
                  }),
                  h = (s.Utf8 = {
                    stringify: function (C) {
                      try {
                        return decodeURIComponent(escape(c.stringify(C)));
                      } catch {
                        throw new Error("Malformed UTF-8 data");
                      }
                    },
                    parse: function (C) {
                      return c.parse(unescape(encodeURIComponent(C)));
                    },
                  }),
                  i = (E.BufferedBlockAlgorithm = a.extend({
                    reset: function () {
                      ((this._data = new B.init()), (this._nDataBytes = 0));
                    },
                    _append: function (C) {
                      (typeof C == "string" && (C = h.parse(C)),
                        this._data.concat(C),
                        (this._nDataBytes += C.sigBytes));
                    },
                    _process: function (C) {
                      var n,
                        t = this._data,
                        A = t.words,
                        F = t.sigBytes,
                        u = this.blockSize,
                        k = u * 4,
                        g = F / k;
                      C ? (g = e.ceil(g)) : (g = e.max((g | 0) - this._minBufferSize, 0));
                      var p = g * u,
                        m = e.min(p * 4, F);
                      if (p) {
                        for (var b = 0; b < p; b += u) this._doProcessBlock(A, b);
                        ((n = A.splice(0, p)), (t.sigBytes -= m));
                      }
                      return new B.init(n, m);
                    },
                    clone: function () {
                      var C = a.clone.call(this);
                      return ((C._data = this._data.clone()), C);
                    },
                    _minBufferSize: 0,
                  }));
                E.Hasher = i.extend({
                  cfg: a.extend(),
                  init: function (C) {
                    ((this.cfg = this.cfg.extend(C)), this.reset());
                  },
                  reset: function () {
                    (i.reset.call(this), this._doReset());
                  },
                  update: function (C) {
                    return (this._append(C), this._process(), this);
                  },
                  finalize: function (C) {
                    C && this._append(C);
                    var n = this._doFinalize();
                    return n;
                  },
                  blockSize: 16,
                  _createHelper: function (C) {
                    return function (n, t) {
                      return new C.init(t).finalize(n);
                    };
                  },
                  _createHmacHelper: function (C) {
                    return function (n, t) {
                      return new w.HMAC.init(C, t).finalize(n);
                    };
                  },
                });
                var w = (v.algo = {});
                return v;
              })(Math);
            return x;
          });
        })(b0)),
      b0.exports
    );
  }
  var P0 = { exports: {} },
    dx;
  function w0() {
    return (
      dx ||
        ((dx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function (e) {
                var f = x,
                  d = f.lib,
                  y = d.Base,
                  l = d.WordArray,
                  v = (f.x64 = {});
                ((v.Word = y.extend({
                  init: function (E, a) {
                    ((this.high = E), (this.low = a));
                  },
                })),
                  (v.WordArray = y.extend({
                    init: function (E, a) {
                      ((E = this.words = E || []),
                        a != e ? (this.sigBytes = a) : (this.sigBytes = E.length * 8));
                    },
                    toX32: function () {
                      for (var E = this.words, a = E.length, B = [], s = 0; s < a; s++) {
                        var D = E[s];
                        (B.push(D.high), B.push(D.low));
                      }
                      return l.create(B, this.sigBytes);
                    },
                    clone: function () {
                      for (
                        var E = y.clone.call(this),
                          a = (E.words = this.words.slice(0)),
                          B = a.length,
                          s = 0;
                        s < B;
                        s++
                      )
                        a[s] = a[s].clone();
                      return E;
                    },
                  })));
              })(),
              x
            );
          });
        })(P0)),
      P0.exports
    );
  }
  var S0 = { exports: {} },
    fx;
  function Ue() {
    return (
      fx ||
        ((fx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function () {
                if (typeof ArrayBuffer == "function") {
                  var e = x,
                    f = e.lib,
                    d = f.WordArray,
                    y = d.init,
                    l = (d.init = function (v) {
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
                        for (var E = v.byteLength, a = [], B = 0; B < E; B++)
                          a[B >>> 2] |= v[B] << (24 - (B % 4) * 8);
                        y.call(this, a, E);
                      } else y.apply(this, arguments);
                    });
                  l.prototype = d;
                }
              })(),
              x.lib.WordArray
            );
          });
        })(S0)),
      S0.exports
    );
  }
  var _0 = { exports: {} },
    ux;
  function We() {
    return (
      ux ||
        ((ux = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.WordArray,
                  y = e.enc;
                ((y.Utf16 = y.Utf16BE =
                  {
                    stringify: function (v) {
                      for (var E = v.words, a = v.sigBytes, B = [], s = 0; s < a; s += 2) {
                        var D = (E[s >>> 2] >>> (16 - (s % 4) * 8)) & 65535;
                        B.push(String.fromCharCode(D));
                      }
                      return B.join("");
                    },
                    parse: function (v) {
                      for (var E = v.length, a = [], B = 0; B < E; B++)
                        a[B >>> 1] |= v.charCodeAt(B) << (16 - (B % 2) * 16);
                      return d.create(a, E * 2);
                    },
                  }),
                  (y.Utf16LE = {
                    stringify: function (v) {
                      for (var E = v.words, a = v.sigBytes, B = [], s = 0; s < a; s += 2) {
                        var D = l((E[s >>> 2] >>> (16 - (s % 4) * 8)) & 65535);
                        B.push(String.fromCharCode(D));
                      }
                      return B.join("");
                    },
                    parse: function (v) {
                      for (var E = v.length, a = [], B = 0; B < E; B++)
                        a[B >>> 1] |= l(v.charCodeAt(B) << (16 - (B % 2) * 16));
                      return d.create(a, E * 2);
                    },
                  }));
                function l(v) {
                  return ((v << 8) & 4278255360) | ((v >>> 8) & 16711935);
                }
              })(),
              x.enc.Utf16
            );
          });
        })(_0)),
      _0.exports
    );
  }
  var T0 = { exports: {} },
    hx;
  function D0() {
    return (
      hx ||
        ((hx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.WordArray,
                  y = e.enc;
                y.Base64 = {
                  stringify: function (v) {
                    var E = v.words,
                      a = v.sigBytes,
                      B = this._map;
                    v.clamp();
                    for (var s = [], D = 0; D < a; D += 3)
                      for (
                        var c = (E[D >>> 2] >>> (24 - (D % 4) * 8)) & 255,
                          h = (E[(D + 1) >>> 2] >>> (24 - ((D + 1) % 4) * 8)) & 255,
                          i = (E[(D + 2) >>> 2] >>> (24 - ((D + 2) % 4) * 8)) & 255,
                          w = (c << 16) | (h << 8) | i,
                          C = 0;
                        C < 4 && D + C * 0.75 < a;
                        C++
                      )
                        s.push(B.charAt((w >>> (6 * (3 - C))) & 63));
                    var n = B.charAt(64);
                    if (n) for (; s.length % 4;) s.push(n);
                    return s.join("");
                  },
                  parse: function (v) {
                    var E = v.length,
                      a = this._map,
                      B = this._reverseMap;
                    if (!B) {
                      B = this._reverseMap = [];
                      for (var s = 0; s < a.length; s++) B[a.charCodeAt(s)] = s;
                    }
                    var D = a.charAt(64);
                    if (D) {
                      var c = v.indexOf(D);
                      c !== -1 && (E = c);
                    }
                    return l(v, E, B);
                  },
                  _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                };
                function l(v, E, a) {
                  for (var B = [], s = 0, D = 0; D < E; D++)
                    if (D % 4) {
                      var c = a[v.charCodeAt(D - 1)] << ((D % 4) * 2),
                        h = a[v.charCodeAt(D)] >>> (6 - (D % 4) * 2),
                        i = c | h;
                      ((B[s >>> 2] |= i << (24 - (s % 4) * 8)), s++);
                    }
                  return d.create(B, s);
                }
              })(),
              x.enc.Base64
            );
          });
        })(T0)),
      T0.exports
    );
  }
  var M0 = { exports: {} },
    vx;
  function $e() {
    return (
      vx ||
        ((vx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.WordArray,
                  y = e.enc;
                y.Base64url = {
                  stringify: function (v, E) {
                    E === void 0 && (E = !0);
                    var a = v.words,
                      B = v.sigBytes,
                      s = E ? this._safe_map : this._map;
                    v.clamp();
                    for (var D = [], c = 0; c < B; c += 3)
                      for (
                        var h = (a[c >>> 2] >>> (24 - (c % 4) * 8)) & 255,
                          i = (a[(c + 1) >>> 2] >>> (24 - ((c + 1) % 4) * 8)) & 255,
                          w = (a[(c + 2) >>> 2] >>> (24 - ((c + 2) % 4) * 8)) & 255,
                          C = (h << 16) | (i << 8) | w,
                          n = 0;
                        n < 4 && c + n * 0.75 < B;
                        n++
                      )
                        D.push(s.charAt((C >>> (6 * (3 - n))) & 63));
                    var t = s.charAt(64);
                    if (t) for (; D.length % 4;) D.push(t);
                    return D.join("");
                  },
                  parse: function (v, E) {
                    E === void 0 && (E = !0);
                    var a = v.length,
                      B = E ? this._safe_map : this._map,
                      s = this._reverseMap;
                    if (!s) {
                      s = this._reverseMap = [];
                      for (var D = 0; D < B.length; D++) s[B.charCodeAt(D)] = D;
                    }
                    var c = B.charAt(64);
                    if (c) {
                      var h = v.indexOf(c);
                      h !== -1 && (a = h);
                    }
                    return l(v, a, s);
                  },
                  _map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
                  _safe_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
                };
                function l(v, E, a) {
                  for (var B = [], s = 0, D = 0; D < E; D++)
                    if (D % 4) {
                      var c = a[v.charCodeAt(D - 1)] << ((D % 4) * 2),
                        h = a[v.charCodeAt(D)] >>> (6 - (D % 4) * 2),
                        i = c | h;
                      ((B[s >>> 2] |= i << (24 - (s % 4) * 8)), s++);
                    }
                  return d.create(B, s);
                }
              })(),
              x.enc.Base64url
            );
          });
        })(M0)),
      M0.exports
    );
  }
  var z0 = { exports: {} },
    px;
  function l0() {
    return (
      px ||
        ((px = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function (e) {
                var f = x,
                  d = f.lib,
                  y = d.WordArray,
                  l = d.Hasher,
                  v = f.algo,
                  E = [];
                (function () {
                  for (var h = 0; h < 64; h++) E[h] = (e.abs(e.sin(h + 1)) * 4294967296) | 0;
                })();
                var a = (v.MD5 = l.extend({
                  _doReset: function () {
                    this._hash = new y.init([1732584193, 4023233417, 2562383102, 271733878]);
                  },
                  _doProcessBlock: function (h, i) {
                    for (var w = 0; w < 16; w++) {
                      var C = i + w,
                        n = h[C];
                      h[C] =
                        (((n << 8) | (n >>> 24)) & 16711935) |
                        (((n << 24) | (n >>> 8)) & 4278255360);
                    }
                    var t = this._hash.words,
                      A = h[i + 0],
                      F = h[i + 1],
                      u = h[i + 2],
                      k = h[i + 3],
                      g = h[i + 4],
                      p = h[i + 5],
                      m = h[i + 6],
                      b = h[i + 7],
                      S = h[i + 8],
                      z = h[i + 9],
                      M = h[i + 10],
                      R = h[i + 11],
                      I = h[i + 12],
                      H = h[i + 13],
                      N = h[i + 14],
                      O = h[i + 15],
                      P = t[0],
                      T = t[1],
                      L = t[2],
                      _ = t[3];
                    ((P = B(P, T, L, _, A, 7, E[0])),
                      (_ = B(_, P, T, L, F, 12, E[1])),
                      (L = B(L, _, P, T, u, 17, E[2])),
                      (T = B(T, L, _, P, k, 22, E[3])),
                      (P = B(P, T, L, _, g, 7, E[4])),
                      (_ = B(_, P, T, L, p, 12, E[5])),
                      (L = B(L, _, P, T, m, 17, E[6])),
                      (T = B(T, L, _, P, b, 22, E[7])),
                      (P = B(P, T, L, _, S, 7, E[8])),
                      (_ = B(_, P, T, L, z, 12, E[9])),
                      (L = B(L, _, P, T, M, 17, E[10])),
                      (T = B(T, L, _, P, R, 22, E[11])),
                      (P = B(P, T, L, _, I, 7, E[12])),
                      (_ = B(_, P, T, L, H, 12, E[13])),
                      (L = B(L, _, P, T, N, 17, E[14])),
                      (T = B(T, L, _, P, O, 22, E[15])),
                      (P = s(P, T, L, _, F, 5, E[16])),
                      (_ = s(_, P, T, L, m, 9, E[17])),
                      (L = s(L, _, P, T, R, 14, E[18])),
                      (T = s(T, L, _, P, A, 20, E[19])),
                      (P = s(P, T, L, _, p, 5, E[20])),
                      (_ = s(_, P, T, L, M, 9, E[21])),
                      (L = s(L, _, P, T, O, 14, E[22])),
                      (T = s(T, L, _, P, g, 20, E[23])),
                      (P = s(P, T, L, _, z, 5, E[24])),
                      (_ = s(_, P, T, L, N, 9, E[25])),
                      (L = s(L, _, P, T, k, 14, E[26])),
                      (T = s(T, L, _, P, S, 20, E[27])),
                      (P = s(P, T, L, _, H, 5, E[28])),
                      (_ = s(_, P, T, L, u, 9, E[29])),
                      (L = s(L, _, P, T, b, 14, E[30])),
                      (T = s(T, L, _, P, I, 20, E[31])),
                      (P = D(P, T, L, _, p, 4, E[32])),
                      (_ = D(_, P, T, L, S, 11, E[33])),
                      (L = D(L, _, P, T, R, 16, E[34])),
                      (T = D(T, L, _, P, N, 23, E[35])),
                      (P = D(P, T, L, _, F, 4, E[36])),
                      (_ = D(_, P, T, L, g, 11, E[37])),
                      (L = D(L, _, P, T, b, 16, E[38])),
                      (T = D(T, L, _, P, M, 23, E[39])),
                      (P = D(P, T, L, _, H, 4, E[40])),
                      (_ = D(_, P, T, L, A, 11, E[41])),
                      (L = D(L, _, P, T, k, 16, E[42])),
                      (T = D(T, L, _, P, m, 23, E[43])),
                      (P = D(P, T, L, _, z, 4, E[44])),
                      (_ = D(_, P, T, L, I, 11, E[45])),
                      (L = D(L, _, P, T, O, 16, E[46])),
                      (T = D(T, L, _, P, u, 23, E[47])),
                      (P = c(P, T, L, _, A, 6, E[48])),
                      (_ = c(_, P, T, L, b, 10, E[49])),
                      (L = c(L, _, P, T, N, 15, E[50])),
                      (T = c(T, L, _, P, p, 21, E[51])),
                      (P = c(P, T, L, _, I, 6, E[52])),
                      (_ = c(_, P, T, L, k, 10, E[53])),
                      (L = c(L, _, P, T, M, 15, E[54])),
                      (T = c(T, L, _, P, F, 21, E[55])),
                      (P = c(P, T, L, _, S, 6, E[56])),
                      (_ = c(_, P, T, L, O, 10, E[57])),
                      (L = c(L, _, P, T, m, 15, E[58])),
                      (T = c(T, L, _, P, H, 21, E[59])),
                      (P = c(P, T, L, _, g, 6, E[60])),
                      (_ = c(_, P, T, L, R, 10, E[61])),
                      (L = c(L, _, P, T, u, 15, E[62])),
                      (T = c(T, L, _, P, z, 21, E[63])),
                      (t[0] = (t[0] + P) | 0),
                      (t[1] = (t[1] + T) | 0),
                      (t[2] = (t[2] + L) | 0),
                      (t[3] = (t[3] + _) | 0));
                  },
                  _doFinalize: function () {
                    var h = this._data,
                      i = h.words,
                      w = this._nDataBytes * 8,
                      C = h.sigBytes * 8;
                    i[C >>> 5] |= 128 << (24 - (C % 32));
                    var n = e.floor(w / 4294967296),
                      t = w;
                    ((i[(((C + 64) >>> 9) << 4) + 15] =
                      (((n << 8) | (n >>> 24)) & 16711935) |
                      (((n << 24) | (n >>> 8)) & 4278255360)),
                      (i[(((C + 64) >>> 9) << 4) + 14] =
                        (((t << 8) | (t >>> 24)) & 16711935) |
                        (((t << 24) | (t >>> 8)) & 4278255360)),
                      (h.sigBytes = (i.length + 1) * 4),
                      this._process());
                    for (var A = this._hash, F = A.words, u = 0; u < 4; u++) {
                      var k = F[u];
                      F[u] =
                        (((k << 8) | (k >>> 24)) & 16711935) |
                        (((k << 24) | (k >>> 8)) & 4278255360);
                    }
                    return A;
                  },
                  clone: function () {
                    var h = l.clone.call(this);
                    return ((h._hash = this._hash.clone()), h);
                  },
                }));
                function B(h, i, w, C, n, t, A) {
                  var F = h + ((i & w) | (~i & C)) + n + A;
                  return ((F << t) | (F >>> (32 - t))) + i;
                }
                function s(h, i, w, C, n, t, A) {
                  var F = h + ((i & C) | (w & ~C)) + n + A;
                  return ((F << t) | (F >>> (32 - t))) + i;
                }
                function D(h, i, w, C, n, t, A) {
                  var F = h + (i ^ w ^ C) + n + A;
                  return ((F << t) | (F >>> (32 - t))) + i;
                }
                function c(h, i, w, C, n, t, A) {
                  var F = h + (w ^ (i | ~C)) + n + A;
                  return ((F << t) | (F >>> (32 - t))) + i;
                }
                ((f.MD5 = l._createHelper(a)), (f.HmacMD5 = l._createHmacHelper(a)));
              })(Math),
              x.MD5
            );
          });
        })(z0)),
      z0.exports
    );
  }
  var L0 = { exports: {} },
    wx;
  function kx() {
    return (
      wx ||
        ((wx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.WordArray,
                  y = f.Hasher,
                  l = e.algo,
                  v = [],
                  E = (l.SHA1 = y.extend({
                    _doReset: function () {
                      this._hash = new d.init([
                        1732584193, 4023233417, 2562383102, 271733878, 3285377520,
                      ]);
                    },
                    _doProcessBlock: function (a, B) {
                      for (
                        var s = this._hash.words,
                          D = s[0],
                          c = s[1],
                          h = s[2],
                          i = s[3],
                          w = s[4],
                          C = 0;
                        C < 80;
                        C++
                      ) {
                        if (C < 16) v[C] = a[B + C] | 0;
                        else {
                          var n = v[C - 3] ^ v[C - 8] ^ v[C - 14] ^ v[C - 16];
                          v[C] = (n << 1) | (n >>> 31);
                        }
                        var t = ((D << 5) | (D >>> 27)) + w + v[C];
                        (C < 20
                          ? (t += ((c & h) | (~c & i)) + 1518500249)
                          : C < 40
                            ? (t += (c ^ h ^ i) + 1859775393)
                            : C < 60
                              ? (t += ((c & h) | (c & i) | (h & i)) - 1894007588)
                              : (t += (c ^ h ^ i) - 899497514),
                          (w = i),
                          (i = h),
                          (h = (c << 30) | (c >>> 2)),
                          (c = D),
                          (D = t));
                      }
                      ((s[0] = (s[0] + D) | 0),
                        (s[1] = (s[1] + c) | 0),
                        (s[2] = (s[2] + h) | 0),
                        (s[3] = (s[3] + i) | 0),
                        (s[4] = (s[4] + w) | 0));
                    },
                    _doFinalize: function () {
                      var a = this._data,
                        B = a.words,
                        s = this._nDataBytes * 8,
                        D = a.sigBytes * 8;
                      return (
                        (B[D >>> 5] |= 128 << (24 - (D % 32))),
                        (B[(((D + 64) >>> 9) << 4) + 14] = Math.floor(s / 4294967296)),
                        (B[(((D + 64) >>> 9) << 4) + 15] = s),
                        (a.sigBytes = B.length * 4),
                        this._process(),
                        this._hash
                      );
                    },
                    clone: function () {
                      var a = y.clone.call(this);
                      return ((a._hash = this._hash.clone()), a);
                    },
                  }));
                ((e.SHA1 = y._createHelper(E)), (e.HmacSHA1 = y._createHmacHelper(E)));
              })(),
              x.SHA1
            );
          });
        })(L0)),
      L0.exports
    );
  }
  var R0 = { exports: {} },
    mx;
  function I0() {
    return (
      mx ||
        ((mx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            return (
              (function (e) {
                var f = x,
                  d = f.lib,
                  y = d.WordArray,
                  l = d.Hasher,
                  v = f.algo,
                  E = [],
                  a = [];
                (function () {
                  function D(w) {
                    for (var C = e.sqrt(w), n = 2; n <= C; n++) if (!(w % n)) return !1;
                    return !0;
                  }
                  function c(w) {
                    return ((w - (w | 0)) * 4294967296) | 0;
                  }
                  for (var h = 2, i = 0; i < 64;)
                    (D(h) &&
                      (i < 8 && (E[i] = c(e.pow(h, 1 / 2))), (a[i] = c(e.pow(h, 1 / 3))), i++),
                      h++);
                })();
                var B = [],
                  s = (v.SHA256 = l.extend({
                    _doReset: function () {
                      this._hash = new y.init(E.slice(0));
                    },
                    _doProcessBlock: function (D, c) {
                      for (
                        var h = this._hash.words,
                          i = h[0],
                          w = h[1],
                          C = h[2],
                          n = h[3],
                          t = h[4],
                          A = h[5],
                          F = h[6],
                          u = h[7],
                          k = 0;
                        k < 64;
                        k++
                      ) {
                        if (k < 16) B[k] = D[c + k] | 0;
                        else {
                          var g = B[k - 15],
                            p = ((g << 25) | (g >>> 7)) ^ ((g << 14) | (g >>> 18)) ^ (g >>> 3),
                            m = B[k - 2],
                            b = ((m << 15) | (m >>> 17)) ^ ((m << 13) | (m >>> 19)) ^ (m >>> 10);
                          B[k] = p + B[k - 7] + b + B[k - 16];
                        }
                        var S = (t & A) ^ (~t & F),
                          z = (i & w) ^ (i & C) ^ (w & C),
                          M =
                            ((i << 30) | (i >>> 2)) ^
                            ((i << 19) | (i >>> 13)) ^
                            ((i << 10) | (i >>> 22)),
                          R =
                            ((t << 26) | (t >>> 6)) ^
                            ((t << 21) | (t >>> 11)) ^
                            ((t << 7) | (t >>> 25)),
                          I = u + R + S + a[k] + B[k],
                          H = M + z;
                        ((u = F),
                          (F = A),
                          (A = t),
                          (t = (n + I) | 0),
                          (n = C),
                          (C = w),
                          (w = i),
                          (i = (I + H) | 0));
                      }
                      ((h[0] = (h[0] + i) | 0),
                        (h[1] = (h[1] + w) | 0),
                        (h[2] = (h[2] + C) | 0),
                        (h[3] = (h[3] + n) | 0),
                        (h[4] = (h[4] + t) | 0),
                        (h[5] = (h[5] + A) | 0),
                        (h[6] = (h[6] + F) | 0),
                        (h[7] = (h[7] + u) | 0));
                    },
                    _doFinalize: function () {
                      var D = this._data,
                        c = D.words,
                        h = this._nDataBytes * 8,
                        i = D.sigBytes * 8;
                      return (
                        (c[i >>> 5] |= 128 << (24 - (i % 32))),
                        (c[(((i + 64) >>> 9) << 4) + 14] = e.floor(h / 4294967296)),
                        (c[(((i + 64) >>> 9) << 4) + 15] = h),
                        (D.sigBytes = c.length * 4),
                        this._process(),
                        this._hash
                      );
                    },
                    clone: function () {
                      var D = l.clone.call(this);
                      return ((D._hash = this._hash.clone()), D);
                    },
                  }));
                ((f.SHA256 = l._createHelper(s)), (f.HmacSHA256 = l._createHmacHelper(s)));
              })(Math),
              x.SHA256
            );
          });
        })(R0)),
      R0.exports
    );
  }
  var H0 = { exports: {} },
    gx;
  function je() {
    return (
      gx ||
        ((gx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), I0());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.WordArray,
                  y = e.algo,
                  l = y.SHA256,
                  v = (y.SHA224 = l.extend({
                    _doReset: function () {
                      this._hash = new d.init([
                        3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025,
                        1694076839, 3204075428,
                      ]);
                    },
                    _doFinalize: function () {
                      var E = l._doFinalize.call(this);
                      return ((E.sigBytes -= 4), E);
                    },
                  }));
                ((e.SHA224 = l._createHelper(v)), (e.HmacSHA224 = l._createHmacHelper(v)));
              })(),
              x.SHA224
            );
          });
        })(H0)),
      H0.exports
    );
  }
  var O0 = { exports: {} },
    yx;
  function bx() {
    return (
      yx ||
        ((yx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), w0());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.Hasher,
                  y = e.x64,
                  l = y.Word,
                  v = y.WordArray,
                  E = e.algo;
                function a() {
                  return l.create.apply(l, arguments);
                }
                var B = [
                    a(1116352408, 3609767458),
                    a(1899447441, 602891725),
                    a(3049323471, 3964484399),
                    a(3921009573, 2173295548),
                    a(961987163, 4081628472),
                    a(1508970993, 3053834265),
                    a(2453635748, 2937671579),
                    a(2870763221, 3664609560),
                    a(3624381080, 2734883394),
                    a(310598401, 1164996542),
                    a(607225278, 1323610764),
                    a(1426881987, 3590304994),
                    a(1925078388, 4068182383),
                    a(2162078206, 991336113),
                    a(2614888103, 633803317),
                    a(3248222580, 3479774868),
                    a(3835390401, 2666613458),
                    a(4022224774, 944711139),
                    a(264347078, 2341262773),
                    a(604807628, 2007800933),
                    a(770255983, 1495990901),
                    a(1249150122, 1856431235),
                    a(1555081692, 3175218132),
                    a(1996064986, 2198950837),
                    a(2554220882, 3999719339),
                    a(2821834349, 766784016),
                    a(2952996808, 2566594879),
                    a(3210313671, 3203337956),
                    a(3336571891, 1034457026),
                    a(3584528711, 2466948901),
                    a(113926993, 3758326383),
                    a(338241895, 168717936),
                    a(666307205, 1188179964),
                    a(773529912, 1546045734),
                    a(1294757372, 1522805485),
                    a(1396182291, 2643833823),
                    a(1695183700, 2343527390),
                    a(1986661051, 1014477480),
                    a(2177026350, 1206759142),
                    a(2456956037, 344077627),
                    a(2730485921, 1290863460),
                    a(2820302411, 3158454273),
                    a(3259730800, 3505952657),
                    a(3345764771, 106217008),
                    a(3516065817, 3606008344),
                    a(3600352804, 1432725776),
                    a(4094571909, 1467031594),
                    a(275423344, 851169720),
                    a(430227734, 3100823752),
                    a(506948616, 1363258195),
                    a(659060556, 3750685593),
                    a(883997877, 3785050280),
                    a(958139571, 3318307427),
                    a(1322822218, 3812723403),
                    a(1537002063, 2003034995),
                    a(1747873779, 3602036899),
                    a(1955562222, 1575990012),
                    a(2024104815, 1125592928),
                    a(2227730452, 2716904306),
                    a(2361852424, 442776044),
                    a(2428436474, 593698344),
                    a(2756734187, 3733110249),
                    a(3204031479, 2999351573),
                    a(3329325298, 3815920427),
                    a(3391569614, 3928383900),
                    a(3515267271, 566280711),
                    a(3940187606, 3454069534),
                    a(4118630271, 4000239992),
                    a(116418474, 1914138554),
                    a(174292421, 2731055270),
                    a(289380356, 3203993006),
                    a(460393269, 320620315),
                    a(685471733, 587496836),
                    a(852142971, 1086792851),
                    a(1017036298, 365543100),
                    a(1126000580, 2618297676),
                    a(1288033470, 3409855158),
                    a(1501505948, 4234509866),
                    a(1607167915, 987167468),
                    a(1816402316, 1246189591),
                  ],
                  s = [];
                (function () {
                  for (var c = 0; c < 80; c++) s[c] = a();
                })();
                var D = (E.SHA512 = d.extend({
                  _doReset: function () {
                    this._hash = new v.init([
                      new l.init(1779033703, 4089235720),
                      new l.init(3144134277, 2227873595),
                      new l.init(1013904242, 4271175723),
                      new l.init(2773480762, 1595750129),
                      new l.init(1359893119, 2917565137),
                      new l.init(2600822924, 725511199),
                      new l.init(528734635, 4215389547),
                      new l.init(1541459225, 327033209),
                    ]);
                  },
                  _doProcessBlock: function (c, h) {
                    for (
                      var i = this._hash.words,
                        w = i[0],
                        C = i[1],
                        n = i[2],
                        t = i[3],
                        A = i[4],
                        F = i[5],
                        u = i[6],
                        k = i[7],
                        g = w.high,
                        p = w.low,
                        m = C.high,
                        b = C.low,
                        S = n.high,
                        z = n.low,
                        M = t.high,
                        R = t.low,
                        I = A.high,
                        H = A.low,
                        N = F.high,
                        O = F.low,
                        P = u.high,
                        T = u.low,
                        L = k.high,
                        _ = k.low,
                        Q = g,
                        q = p,
                        K = m,
                        j = b,
                        x0 = S,
                        i0 = z,
                        s0 = M,
                        d0 = R,
                        e0 = I,
                        Y = H,
                        o0 = N,
                        a0 = O,
                        B0 = P,
                        n0 = T,
                        r0 = L,
                        h0 = _,
                        Z = 0;
                      Z < 80;
                      Z++
                    ) {
                      var E0,
                        A0,
                        g0 = s[Z];
                      if (Z < 16)
                        ((A0 = g0.high = c[h + Z * 2] | 0), (E0 = g0.low = c[h + Z * 2 + 1] | 0));
                      else {
                        var Ce = s[Z - 15],
                          f0 = Ce.high,
                          v0 = Ce.low,
                          w9 = ((f0 >>> 1) | (v0 << 31)) ^ ((f0 >>> 8) | (v0 << 24)) ^ (f0 >>> 7),
                          ie =
                            ((v0 >>> 1) | (f0 << 31)) ^
                            ((v0 >>> 8) | (f0 << 24)) ^
                            ((v0 >>> 7) | (f0 << 25)),
                          Ae = s[Z - 2],
                          u0 = Ae.high,
                          p0 = Ae.low,
                          k9 = ((u0 >>> 19) | (p0 << 13)) ^ ((u0 << 3) | (p0 >>> 29)) ^ (u0 >>> 6),
                          Fe =
                            ((p0 >>> 19) | (u0 << 13)) ^
                            ((p0 << 3) | (u0 >>> 29)) ^
                            ((p0 >>> 6) | (u0 << 26)),
                          De = s[Z - 7],
                          m9 = De.high,
                          g9 = De.low,
                          le = s[Z - 16],
                          y9 = le.high,
                          de = le.low;
                        ((E0 = ie + g9),
                          (A0 = w9 + m9 + (E0 >>> 0 < ie >>> 0 ? 1 : 0)),
                          (E0 = E0 + Fe),
                          (A0 = A0 + k9 + (E0 >>> 0 < Fe >>> 0 ? 1 : 0)),
                          (E0 = E0 + de),
                          (A0 = A0 + y9 + (E0 >>> 0 < de >>> 0 ? 1 : 0)),
                          (g0.high = A0),
                          (g0.low = E0));
                      }
                      var b9 = (e0 & o0) ^ (~e0 & B0),
                        fe = (Y & a0) ^ (~Y & n0),
                        P9 = (Q & K) ^ (Q & x0) ^ (K & x0),
                        S9 = (q & j) ^ (q & i0) ^ (j & i0),
                        _9 =
                          ((Q >>> 28) | (q << 4)) ^
                          ((Q << 30) | (q >>> 2)) ^
                          ((Q << 25) | (q >>> 7)),
                        ue =
                          ((q >>> 28) | (Q << 4)) ^
                          ((q << 30) | (Q >>> 2)) ^
                          ((q << 25) | (Q >>> 7)),
                        T9 =
                          ((e0 >>> 14) | (Y << 18)) ^
                          ((e0 >>> 18) | (Y << 14)) ^
                          ((e0 << 23) | (Y >>> 9)),
                        M9 =
                          ((Y >>> 14) | (e0 << 18)) ^
                          ((Y >>> 18) | (e0 << 14)) ^
                          ((Y << 23) | (e0 >>> 9)),
                        he = B[Z],
                        z9 = he.high,
                        ve = he.low,
                        t0 = h0 + M9,
                        F0 = r0 + T9 + (t0 >>> 0 < h0 >>> 0 ? 1 : 0),
                        t0 = t0 + fe,
                        F0 = F0 + b9 + (t0 >>> 0 < fe >>> 0 ? 1 : 0),
                        t0 = t0 + ve,
                        F0 = F0 + z9 + (t0 >>> 0 < ve >>> 0 ? 1 : 0),
                        t0 = t0 + E0,
                        F0 = F0 + A0 + (t0 >>> 0 < E0 >>> 0 ? 1 : 0),
                        pe = ue + S9,
                        L9 = _9 + P9 + (pe >>> 0 < ue >>> 0 ? 1 : 0);
                      ((r0 = B0),
                        (h0 = n0),
                        (B0 = o0),
                        (n0 = a0),
                        (o0 = e0),
                        (a0 = Y),
                        (Y = (d0 + t0) | 0),
                        (e0 = (s0 + F0 + (Y >>> 0 < d0 >>> 0 ? 1 : 0)) | 0),
                        (s0 = x0),
                        (d0 = i0),
                        (x0 = K),
                        (i0 = j),
                        (K = Q),
                        (j = q),
                        (q = (t0 + pe) | 0),
                        (Q = (F0 + L9 + (q >>> 0 < t0 >>> 0 ? 1 : 0)) | 0));
                    }
                    ((p = w.low = p + q),
                      (w.high = g + Q + (p >>> 0 < q >>> 0 ? 1 : 0)),
                      (b = C.low = b + j),
                      (C.high = m + K + (b >>> 0 < j >>> 0 ? 1 : 0)),
                      (z = n.low = z + i0),
                      (n.high = S + x0 + (z >>> 0 < i0 >>> 0 ? 1 : 0)),
                      (R = t.low = R + d0),
                      (t.high = M + s0 + (R >>> 0 < d0 >>> 0 ? 1 : 0)),
                      (H = A.low = H + Y),
                      (A.high = I + e0 + (H >>> 0 < Y >>> 0 ? 1 : 0)),
                      (O = F.low = O + a0),
                      (F.high = N + o0 + (O >>> 0 < a0 >>> 0 ? 1 : 0)),
                      (T = u.low = T + n0),
                      (u.high = P + B0 + (T >>> 0 < n0 >>> 0 ? 1 : 0)),
                      (_ = k.low = _ + h0),
                      (k.high = L + r0 + (_ >>> 0 < h0 >>> 0 ? 1 : 0)));
                  },
                  _doFinalize: function () {
                    var c = this._data,
                      h = c.words,
                      i = this._nDataBytes * 8,
                      w = c.sigBytes * 8;
                    ((h[w >>> 5] |= 128 << (24 - (w % 32))),
                      (h[(((w + 128) >>> 10) << 5) + 30] = Math.floor(i / 4294967296)),
                      (h[(((w + 128) >>> 10) << 5) + 31] = i),
                      (c.sigBytes = h.length * 4),
                      this._process());
                    var C = this._hash.toX32();
                    return C;
                  },
                  clone: function () {
                    var c = d.clone.call(this);
                    return ((c._hash = this._hash.clone()), c);
                  },
                  blockSize: 1024 / 32,
                }));
                ((e.SHA512 = d._createHelper(D)), (e.HmacSHA512 = d._createHmacHelper(D)));
              })(),
              x.SHA512
            );
          });
        })(O0)),
      O0.exports
    );
  }
  var N0 = { exports: {} },
    Px;
  function qe() {
    return (
      Px ||
        ((Px = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), w0(), bx());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.x64,
                  d = f.Word,
                  y = f.WordArray,
                  l = e.algo,
                  v = l.SHA512,
                  E = (l.SHA384 = v.extend({
                    _doReset: function () {
                      this._hash = new y.init([
                        new d.init(3418070365, 3238371032),
                        new d.init(1654270250, 914150663),
                        new d.init(2438529370, 812702999),
                        new d.init(355462360, 4144912697),
                        new d.init(1731405415, 4290775857),
                        new d.init(2394180231, 1750603025),
                        new d.init(3675008525, 1694076839),
                        new d.init(1203062813, 3204075428),
                      ]);
                    },
                    _doFinalize: function () {
                      var a = v._doFinalize.call(this);
                      return ((a.sigBytes -= 16), a);
                    },
                  }));
                ((e.SHA384 = v._createHelper(E)), (e.HmacSHA384 = v._createHmacHelper(E)));
              })(),
              x.SHA384
            );
          });
        })(N0)),
      N0.exports
    );
  }
  var U0 = { exports: {} },
    Sx;
  function Ve() {
    return (
      Sx ||
        ((Sx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), w0());
          })(V, function (x) {
            return (
              (function (e) {
                var f = x,
                  d = f.lib,
                  y = d.WordArray,
                  l = d.Hasher,
                  v = f.x64,
                  E = v.Word,
                  a = f.algo,
                  B = [],
                  s = [],
                  D = [];
                (function () {
                  for (var i = 1, w = 0, C = 0; C < 24; C++) {
                    B[i + 5 * w] = (((C + 1) * (C + 2)) / 2) % 64;
                    var n = w % 5,
                      t = (2 * i + 3 * w) % 5;
                    ((i = n), (w = t));
                  }
                  for (var i = 0; i < 5; i++)
                    for (var w = 0; w < 5; w++) s[i + 5 * w] = w + ((2 * i + 3 * w) % 5) * 5;
                  for (var A = 1, F = 0; F < 24; F++) {
                    for (var u = 0, k = 0, g = 0; g < 7; g++) {
                      if (A & 1) {
                        var p = (1 << g) - 1;
                        p < 32 ? (k ^= 1 << p) : (u ^= 1 << (p - 32));
                      }
                      A & 128 ? (A = (A << 1) ^ 113) : (A <<= 1);
                    }
                    D[F] = E.create(u, k);
                  }
                })();
                var c = [];
                (function () {
                  for (var i = 0; i < 25; i++) c[i] = E.create();
                })();
                var h = (a.SHA3 = l.extend({
                  cfg: l.cfg.extend({ outputLength: 512 }),
                  _doReset: function () {
                    for (var i = (this._state = []), w = 0; w < 25; w++) i[w] = new E.init();
                    this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
                  },
                  _doProcessBlock: function (i, w) {
                    for (var C = this._state, n = this.blockSize / 2, t = 0; t < n; t++) {
                      var A = i[w + 2 * t],
                        F = i[w + 2 * t + 1];
                      ((A =
                        (((A << 8) | (A >>> 24)) & 16711935) |
                        (((A << 24) | (A >>> 8)) & 4278255360)),
                        (F =
                          (((F << 8) | (F >>> 24)) & 16711935) |
                          (((F << 24) | (F >>> 8)) & 4278255360)));
                      var u = C[t];
                      ((u.high ^= F), (u.low ^= A));
                    }
                    for (var k = 0; k < 24; k++) {
                      for (var g = 0; g < 5; g++) {
                        for (var p = 0, m = 0, b = 0; b < 5; b++) {
                          var u = C[g + 5 * b];
                          ((p ^= u.high), (m ^= u.low));
                        }
                        var S = c[g];
                        ((S.high = p), (S.low = m));
                      }
                      for (var g = 0; g < 5; g++)
                        for (
                          var z = c[(g + 4) % 5],
                            M = c[(g + 1) % 5],
                            R = M.high,
                            I = M.low,
                            p = z.high ^ ((R << 1) | (I >>> 31)),
                            m = z.low ^ ((I << 1) | (R >>> 31)),
                            b = 0;
                          b < 5;
                          b++
                        ) {
                          var u = C[g + 5 * b];
                          ((u.high ^= p), (u.low ^= m));
                        }
                      for (var H = 1; H < 25; H++) {
                        var p,
                          m,
                          u = C[H],
                          N = u.high,
                          O = u.low,
                          P = B[H];
                        P < 32
                          ? ((p = (N << P) | (O >>> (32 - P))), (m = (O << P) | (N >>> (32 - P))))
                          : ((p = (O << (P - 32)) | (N >>> (64 - P))),
                            (m = (N << (P - 32)) | (O >>> (64 - P))));
                        var T = c[s[H]];
                        ((T.high = p), (T.low = m));
                      }
                      var L = c[0],
                        _ = C[0];
                      ((L.high = _.high), (L.low = _.low));
                      for (var g = 0; g < 5; g++)
                        for (var b = 0; b < 5; b++) {
                          var H = g + 5 * b,
                            u = C[H],
                            Q = c[H],
                            q = c[((g + 1) % 5) + 5 * b],
                            K = c[((g + 2) % 5) + 5 * b];
                          ((u.high = Q.high ^ (~q.high & K.high)),
                            (u.low = Q.low ^ (~q.low & K.low)));
                        }
                      var u = C[0],
                        j = D[k];
                      ((u.high ^= j.high), (u.low ^= j.low));
                    }
                  },
                  _doFinalize: function () {
                    var i = this._data,
                      w = i.words;
                    this._nDataBytes * 8;
                    var C = i.sigBytes * 8,
                      n = this.blockSize * 32;
                    ((w[C >>> 5] |= 1 << (24 - (C % 32))),
                      (w[((e.ceil((C + 1) / n) * n) >>> 5) - 1] |= 128),
                      (i.sigBytes = w.length * 4),
                      this._process());
                    for (
                      var t = this._state, A = this.cfg.outputLength / 8, F = A / 8, u = [], k = 0;
                      k < F;
                      k++
                    ) {
                      var g = t[k],
                        p = g.high,
                        m = g.low;
                      ((p =
                        (((p << 8) | (p >>> 24)) & 16711935) |
                        (((p << 24) | (p >>> 8)) & 4278255360)),
                        (m =
                          (((m << 8) | (m >>> 24)) & 16711935) |
                          (((m << 24) | (m >>> 8)) & 4278255360)),
                        u.push(m),
                        u.push(p));
                    }
                    return new y.init(u, A);
                  },
                  clone: function () {
                    for (
                      var i = l.clone.call(this), w = (i._state = this._state.slice(0)), C = 0;
                      C < 25;
                      C++
                    )
                      w[C] = w[C].clone();
                    return i;
                  },
                }));
                ((f.SHA3 = l._createHelper(h)), (f.HmacSHA3 = l._createHmacHelper(h)));
              })(Math),
              x.SHA3
            );
          });
        })(U0)),
      U0.exports
    );
  }
  var W0 = { exports: {} },
    _x;
  function Xe() {
    return (
      _x ||
        ((_x = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            /** @preserve
				(c) 2012 by Cédric Mesnil. All rights reserved.

				Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:

				    - Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
				    - Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.

				THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
				*/ return (
              (function (e) {
                var f = x,
                  d = f.lib,
                  y = d.WordArray,
                  l = d.Hasher,
                  v = f.algo,
                  E = y.create([
                    0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3,
                    12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
                    1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10,
                    14, 1, 3, 8, 11, 6, 15, 13,
                  ]),
                  a = y.create([
                    5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10,
                    14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
                    8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7,
                    6, 2, 13, 14, 0, 3, 9, 11,
                  ]),
                  B = y.create([
                    11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7,
                    15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5,
                    12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11,
                    6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6,
                  ]),
                  s = y.create([
                    8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9,
                    11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13,
                    13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9,
                    12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11,
                  ]),
                  D = y.create([0, 1518500249, 1859775393, 2400959708, 2840853838]),
                  c = y.create([1352829926, 1548603684, 1836072691, 2053994217, 0]),
                  h = (v.RIPEMD160 = l.extend({
                    _doReset: function () {
                      this._hash = y.create([
                        1732584193, 4023233417, 2562383102, 271733878, 3285377520,
                      ]);
                    },
                    _doProcessBlock: function (F, u) {
                      for (var k = 0; k < 16; k++) {
                        var g = u + k,
                          p = F[g];
                        F[g] =
                          (((p << 8) | (p >>> 24)) & 16711935) |
                          (((p << 24) | (p >>> 8)) & 4278255360);
                      }
                      var m = this._hash.words,
                        b = D.words,
                        S = c.words,
                        z = E.words,
                        M = a.words,
                        R = B.words,
                        I = s.words,
                        H,
                        N,
                        O,
                        P,
                        T,
                        L,
                        _,
                        Q,
                        q,
                        K;
                      ((L = H = m[0]),
                        (_ = N = m[1]),
                        (Q = O = m[2]),
                        (q = P = m[3]),
                        (K = T = m[4]));
                      for (var j, k = 0; k < 80; k += 1)
                        ((j = (H + F[u + z[k]]) | 0),
                          k < 16
                            ? (j += i(N, O, P) + b[0])
                            : k < 32
                              ? (j += w(N, O, P) + b[1])
                              : k < 48
                                ? (j += C(N, O, P) + b[2])
                                : k < 64
                                  ? (j += n(N, O, P) + b[3])
                                  : (j += t(N, O, P) + b[4]),
                          (j = j | 0),
                          (j = A(j, R[k])),
                          (j = (j + T) | 0),
                          (H = T),
                          (T = P),
                          (P = A(O, 10)),
                          (O = N),
                          (N = j),
                          (j = (L + F[u + M[k]]) | 0),
                          k < 16
                            ? (j += t(_, Q, q) + S[0])
                            : k < 32
                              ? (j += n(_, Q, q) + S[1])
                              : k < 48
                                ? (j += C(_, Q, q) + S[2])
                                : k < 64
                                  ? (j += w(_, Q, q) + S[3])
                                  : (j += i(_, Q, q) + S[4]),
                          (j = j | 0),
                          (j = A(j, I[k])),
                          (j = (j + K) | 0),
                          (L = K),
                          (K = q),
                          (q = A(Q, 10)),
                          (Q = _),
                          (_ = j));
                      ((j = (m[1] + O + q) | 0),
                        (m[1] = (m[2] + P + K) | 0),
                        (m[2] = (m[3] + T + L) | 0),
                        (m[3] = (m[4] + H + _) | 0),
                        (m[4] = (m[0] + N + Q) | 0),
                        (m[0] = j));
                    },
                    _doFinalize: function () {
                      var F = this._data,
                        u = F.words,
                        k = this._nDataBytes * 8,
                        g = F.sigBytes * 8;
                      ((u[g >>> 5] |= 128 << (24 - (g % 32))),
                        (u[(((g + 64) >>> 9) << 4) + 14] =
                          (((k << 8) | (k >>> 24)) & 16711935) |
                          (((k << 24) | (k >>> 8)) & 4278255360)),
                        (F.sigBytes = (u.length + 1) * 4),
                        this._process());
                      for (var p = this._hash, m = p.words, b = 0; b < 5; b++) {
                        var S = m[b];
                        m[b] =
                          (((S << 8) | (S >>> 24)) & 16711935) |
                          (((S << 24) | (S >>> 8)) & 4278255360);
                      }
                      return p;
                    },
                    clone: function () {
                      var F = l.clone.call(this);
                      return ((F._hash = this._hash.clone()), F);
                    },
                  }));
                function i(F, u, k) {
                  return F ^ u ^ k;
                }
                function w(F, u, k) {
                  return (F & u) | (~F & k);
                }
                function C(F, u, k) {
                  return (F | ~u) ^ k;
                }
                function n(F, u, k) {
                  return (F & k) | (u & ~k);
                }
                function t(F, u, k) {
                  return F ^ (u | ~k);
                }
                function A(F, u) {
                  return (F << u) | (F >>> (32 - u));
                }
                ((f.RIPEMD160 = l._createHelper(h)), (f.HmacRIPEMD160 = l._createHmacHelper(h)));
              })(),
              x.RIPEMD160
            );
          });
        })(W0)),
      W0.exports
    );
  }
  var $0 = { exports: {} },
    Tx;
  function j0() {
    return (
      Tx ||
        ((Tx = 1),
        (function (r, o) {
          (function (x, e) {
            r.exports = e(X());
          })(V, function (x) {
            (function () {
              var e = x,
                f = e.lib,
                d = f.Base,
                y = e.enc,
                l = y.Utf8,
                v = e.algo;
              v.HMAC = d.extend({
                init: function (E, a) {
                  ((E = this._hasher = new E.init()), typeof a == "string" && (a = l.parse(a)));
                  var B = E.blockSize,
                    s = B * 4;
                  (a.sigBytes > s && (a = E.finalize(a)), a.clamp());
                  for (
                    var D = (this._oKey = a.clone()),
                      c = (this._iKey = a.clone()),
                      h = D.words,
                      i = c.words,
                      w = 0;
                    w < B;
                    w++
                  )
                    ((h[w] ^= 1549556828), (i[w] ^= 909522486));
                  ((D.sigBytes = c.sigBytes = s), this.reset());
                },
                reset: function () {
                  var E = this._hasher;
                  (E.reset(), E.update(this._iKey));
                },
                update: function (E) {
                  return (this._hasher.update(E), this);
                },
                finalize: function (E) {
                  var a = this._hasher,
                    B = a.finalize(E);
                  a.reset();
                  var s = a.finalize(this._oKey.clone().concat(B));
                  return s;
                },
              });
            })();
          });
        })($0)),
      $0.exports
    );
  }
  var q0 = { exports: {} },
    Mx;
  function Ge() {
    return (
      Mx ||
        ((Mx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), I0(), j0());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.Base,
                  y = f.WordArray,
                  l = e.algo,
                  v = l.SHA256,
                  E = l.HMAC,
                  a = (l.PBKDF2 = d.extend({
                    cfg: d.extend({ keySize: 128 / 32, hasher: v, iterations: 25e4 }),
                    init: function (B) {
                      this.cfg = this.cfg.extend(B);
                    },
                    compute: function (B, s) {
                      for (
                        var D = this.cfg,
                          c = E.create(D.hasher, B),
                          h = y.create(),
                          i = y.create([1]),
                          w = h.words,
                          C = i.words,
                          n = D.keySize,
                          t = D.iterations;
                        w.length < n;
                      ) {
                        var A = c.update(s).finalize(i);
                        c.reset();
                        for (var F = A.words, u = F.length, k = A, g = 1; g < t; g++) {
                          ((k = c.finalize(k)), c.reset());
                          for (var p = k.words, m = 0; m < u; m++) F[m] ^= p[m];
                        }
                        (h.concat(A), C[0]++);
                      }
                      return ((h.sigBytes = n * 4), h);
                    },
                  }));
                e.PBKDF2 = function (B, s, D) {
                  return a.create(D).compute(B, s);
                };
              })(),
              x.PBKDF2
            );
          });
        })(q0)),
      q0.exports
    );
  }
  var V0 = { exports: {} },
    zx;
  function c0() {
    return (
      zx ||
        ((zx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), kx(), j0());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.Base,
                  y = f.WordArray,
                  l = e.algo,
                  v = l.MD5,
                  E = (l.EvpKDF = d.extend({
                    cfg: d.extend({ keySize: 128 / 32, hasher: v, iterations: 1 }),
                    init: function (a) {
                      this.cfg = this.cfg.extend(a);
                    },
                    compute: function (a, B) {
                      for (
                        var s,
                          D = this.cfg,
                          c = D.hasher.create(),
                          h = y.create(),
                          i = h.words,
                          w = D.keySize,
                          C = D.iterations;
                        i.length < w;
                      ) {
                        (s && c.update(s), (s = c.update(a).finalize(B)), c.reset());
                        for (var n = 1; n < C; n++) ((s = c.finalize(s)), c.reset());
                        h.concat(s);
                      }
                      return ((h.sigBytes = w * 4), h);
                    },
                  }));
                e.EvpKDF = function (a, B, s) {
                  return E.create(s).compute(a, B);
                };
              })(),
              x.EvpKDF
            );
          });
        })(V0)),
      V0.exports
    );
  }
  var X0 = { exports: {} },
    Lx;
  function J() {
    return (
      Lx ||
        ((Lx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), c0());
          })(V, function (x) {
            x.lib.Cipher ||
              (function (e) {
                var f = x,
                  d = f.lib,
                  y = d.Base,
                  l = d.WordArray,
                  v = d.BufferedBlockAlgorithm,
                  E = f.enc;
                E.Utf8;
                var a = E.Base64,
                  B = f.algo,
                  s = B.EvpKDF,
                  D = (d.Cipher = v.extend({
                    cfg: y.extend(),
                    createEncryptor: function (p, m) {
                      return this.create(this._ENC_XFORM_MODE, p, m);
                    },
                    createDecryptor: function (p, m) {
                      return this.create(this._DEC_XFORM_MODE, p, m);
                    },
                    init: function (p, m, b) {
                      ((this.cfg = this.cfg.extend(b)),
                        (this._xformMode = p),
                        (this._key = m),
                        this.reset());
                    },
                    reset: function () {
                      (v.reset.call(this), this._doReset());
                    },
                    process: function (p) {
                      return (this._append(p), this._process());
                    },
                    finalize: function (p) {
                      p && this._append(p);
                      var m = this._doFinalize();
                      return m;
                    },
                    keySize: 128 / 32,
                    ivSize: 128 / 32,
                    _ENC_XFORM_MODE: 1,
                    _DEC_XFORM_MODE: 2,
                    _createHelper: (function () {
                      function p(m) {
                        return typeof m == "string" ? g : F;
                      }
                      return function (m) {
                        return {
                          encrypt: function (b, S, z) {
                            return p(S).encrypt(m, b, S, z);
                          },
                          decrypt: function (b, S, z) {
                            return p(S).decrypt(m, b, S, z);
                          },
                        };
                      };
                    })(),
                  }));
                d.StreamCipher = D.extend({
                  _doFinalize: function () {
                    var p = this._process(!0);
                    return p;
                  },
                  blockSize: 1,
                });
                var c = (f.mode = {}),
                  h = (d.BlockCipherMode = y.extend({
                    createEncryptor: function (p, m) {
                      return this.Encryptor.create(p, m);
                    },
                    createDecryptor: function (p, m) {
                      return this.Decryptor.create(p, m);
                    },
                    init: function (p, m) {
                      ((this._cipher = p), (this._iv = m));
                    },
                  })),
                  i = (c.CBC = (function () {
                    var p = h.extend();
                    ((p.Encryptor = p.extend({
                      processBlock: function (b, S) {
                        var z = this._cipher,
                          M = z.blockSize;
                        (m.call(this, b, S, M),
                          z.encryptBlock(b, S),
                          (this._prevBlock = b.slice(S, S + M)));
                      },
                    })),
                      (p.Decryptor = p.extend({
                        processBlock: function (b, S) {
                          var z = this._cipher,
                            M = z.blockSize,
                            R = b.slice(S, S + M);
                          (z.decryptBlock(b, S), m.call(this, b, S, M), (this._prevBlock = R));
                        },
                      })));
                    function m(b, S, z) {
                      var M,
                        R = this._iv;
                      R ? ((M = R), (this._iv = e)) : (M = this._prevBlock);
                      for (var I = 0; I < z; I++) b[S + I] ^= M[I];
                    }
                    return p;
                  })()),
                  w = (f.pad = {}),
                  C = (w.Pkcs7 = {
                    pad: function (p, m) {
                      for (
                        var b = m * 4,
                          S = b - (p.sigBytes % b),
                          z = (S << 24) | (S << 16) | (S << 8) | S,
                          M = [],
                          R = 0;
                        R < S;
                        R += 4
                      )
                        M.push(z);
                      var I = l.create(M, S);
                      p.concat(I);
                    },
                    unpad: function (p) {
                      var m = p.words[(p.sigBytes - 1) >>> 2] & 255;
                      p.sigBytes -= m;
                    },
                  });
                d.BlockCipher = D.extend({
                  cfg: D.cfg.extend({ mode: i, padding: C }),
                  reset: function () {
                    var p;
                    D.reset.call(this);
                    var m = this.cfg,
                      b = m.iv,
                      S = m.mode;
                    (this._xformMode == this._ENC_XFORM_MODE
                      ? (p = S.createEncryptor)
                      : ((p = S.createDecryptor), (this._minBufferSize = 1)),
                      this._mode && this._mode.__creator == p
                        ? this._mode.init(this, b && b.words)
                        : ((this._mode = p.call(S, this, b && b.words)),
                          (this._mode.__creator = p)));
                  },
                  _doProcessBlock: function (p, m) {
                    this._mode.processBlock(p, m);
                  },
                  _doFinalize: function () {
                    var p,
                      m = this.cfg.padding;
                    return (
                      this._xformMode == this._ENC_XFORM_MODE
                        ? (m.pad(this._data, this.blockSize), (p = this._process(!0)))
                        : ((p = this._process(!0)), m.unpad(p)),
                      p
                    );
                  },
                  blockSize: 128 / 32,
                });
                var n = (d.CipherParams = y.extend({
                    init: function (p) {
                      this.mixIn(p);
                    },
                    toString: function (p) {
                      return (p || this.formatter).stringify(this);
                    },
                  })),
                  t = (f.format = {}),
                  A = (t.OpenSSL = {
                    stringify: function (p) {
                      var m,
                        b = p.ciphertext,
                        S = p.salt;
                      return (
                        S ? (m = l.create([1398893684, 1701076831]).concat(S).concat(b)) : (m = b),
                        m.toString(a)
                      );
                    },
                    parse: function (p) {
                      var m,
                        b = a.parse(p),
                        S = b.words;
                      return (
                        S[0] == 1398893684 &&
                          S[1] == 1701076831 &&
                          ((m = l.create(S.slice(2, 4))), S.splice(0, 4), (b.sigBytes -= 16)),
                        n.create({ ciphertext: b, salt: m })
                      );
                    },
                  }),
                  F = (d.SerializableCipher = y.extend({
                    cfg: y.extend({ format: A }),
                    encrypt: function (p, m, b, S) {
                      S = this.cfg.extend(S);
                      var z = p.createEncryptor(b, S),
                        M = z.finalize(m),
                        R = z.cfg;
                      return n.create({
                        ciphertext: M,
                        key: b,
                        iv: R.iv,
                        algorithm: p,
                        mode: R.mode,
                        padding: R.padding,
                        blockSize: p.blockSize,
                        formatter: S.format,
                      });
                    },
                    decrypt: function (p, m, b, S) {
                      ((S = this.cfg.extend(S)), (m = this._parse(m, S.format)));
                      var z = p.createDecryptor(b, S).finalize(m.ciphertext);
                      return z;
                    },
                    _parse: function (p, m) {
                      return typeof p == "string" ? m.parse(p, this) : p;
                    },
                  })),
                  u = (f.kdf = {}),
                  k = (u.OpenSSL = {
                    execute: function (p, m, b, S, z) {
                      if ((S || (S = l.random(64 / 8)), z))
                        var M = s.create({ keySize: m + b, hasher: z }).compute(p, S);
                      else var M = s.create({ keySize: m + b }).compute(p, S);
                      var R = l.create(M.words.slice(m), b * 4);
                      return ((M.sigBytes = m * 4), n.create({ key: M, iv: R, salt: S }));
                    },
                  }),
                  g = (d.PasswordBasedCipher = F.extend({
                    cfg: F.cfg.extend({ kdf: k }),
                    encrypt: function (p, m, b, S) {
                      S = this.cfg.extend(S);
                      var z = S.kdf.execute(b, p.keySize, p.ivSize, S.salt, S.hasher);
                      S.iv = z.iv;
                      var M = F.encrypt.call(this, p, m, z.key, S);
                      return (M.mixIn(z), M);
                    },
                    decrypt: function (p, m, b, S) {
                      ((S = this.cfg.extend(S)), (m = this._parse(m, S.format)));
                      var z = S.kdf.execute(b, p.keySize, p.ivSize, m.salt, S.hasher);
                      S.iv = z.iv;
                      var M = F.decrypt.call(this, p, m, z.key, S);
                      return M;
                    },
                  }));
              })();
          });
        })(X0)),
      X0.exports
    );
  }
  var G0 = { exports: {} },
    Rx;
  function Ke() {
    return (
      Rx ||
        ((Rx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.mode.CFB = (function () {
                var e = x.lib.BlockCipherMode.extend();
                ((e.Encryptor = e.extend({
                  processBlock: function (d, y) {
                    var l = this._cipher,
                      v = l.blockSize;
                    (f.call(this, d, y, v, l), (this._prevBlock = d.slice(y, y + v)));
                  },
                })),
                  (e.Decryptor = e.extend({
                    processBlock: function (d, y) {
                      var l = this._cipher,
                        v = l.blockSize,
                        E = d.slice(y, y + v);
                      (f.call(this, d, y, v, l), (this._prevBlock = E));
                    },
                  })));
                function f(d, y, l, v) {
                  var E,
                    a = this._iv;
                  (a ? ((E = a.slice(0)), (this._iv = void 0)) : (E = this._prevBlock),
                    v.encryptBlock(E, 0));
                  for (var B = 0; B < l; B++) d[y + B] ^= E[B];
                }
                return e;
              })()),
              x.mode.CFB
            );
          });
        })(G0)),
      G0.exports
    );
  }
  var K0 = { exports: {} },
    Ix;
  function Qe() {
    return (
      Ix ||
        ((Ix = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.mode.CTR = (function () {
                var e = x.lib.BlockCipherMode.extend(),
                  f = (e.Encryptor = e.extend({
                    processBlock: function (d, y) {
                      var l = this._cipher,
                        v = l.blockSize,
                        E = this._iv,
                        a = this._counter;
                      E && ((a = this._counter = E.slice(0)), (this._iv = void 0));
                      var B = a.slice(0);
                      (l.encryptBlock(B, 0), (a[v - 1] = (a[v - 1] + 1) | 0));
                      for (var s = 0; s < v; s++) d[y + s] ^= B[s];
                    },
                  }));
                return ((e.Decryptor = f), e);
              })()),
              x.mode.CTR
            );
          });
        })(K0)),
      K0.exports
    );
  }
  var Q0 = { exports: {} },
    Hx;
  function Ze() {
    return (
      Hx ||
        ((Hx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            /** @preserve
             * Counter block mode compatible with  Dr Brian Gladman fileenc.c
             * derived from CryptoJS.mode.CTR
             * Jan Hruby jhruby.web@gmail.com
             */ return (
              (x.mode.CTRGladman = (function () {
                var e = x.lib.BlockCipherMode.extend();
                function f(l) {
                  if (((l >> 24) & 255) === 255) {
                    var v = (l >> 16) & 255,
                      E = (l >> 8) & 255,
                      a = l & 255;
                    (v === 255
                      ? ((v = 0), E === 255 ? ((E = 0), a === 255 ? (a = 0) : ++a) : ++E)
                      : ++v,
                      (l = 0),
                      (l += v << 16),
                      (l += E << 8),
                      (l += a));
                  } else l += 1 << 24;
                  return l;
                }
                function d(l) {
                  return ((l[0] = f(l[0])) === 0 && (l[1] = f(l[1])), l);
                }
                var y = (e.Encryptor = e.extend({
                  processBlock: function (l, v) {
                    var E = this._cipher,
                      a = E.blockSize,
                      B = this._iv,
                      s = this._counter;
                    (B && ((s = this._counter = B.slice(0)), (this._iv = void 0)), d(s));
                    var D = s.slice(0);
                    E.encryptBlock(D, 0);
                    for (var c = 0; c < a; c++) l[v + c] ^= D[c];
                  },
                }));
                return ((e.Decryptor = y), e);
              })()),
              x.mode.CTRGladman
            );
          });
        })(Q0)),
      Q0.exports
    );
  }
  var Z0 = { exports: {} },
    Ox;
  function Ye() {
    return (
      Ox ||
        ((Ox = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.mode.OFB = (function () {
                var e = x.lib.BlockCipherMode.extend(),
                  f = (e.Encryptor = e.extend({
                    processBlock: function (d, y) {
                      var l = this._cipher,
                        v = l.blockSize,
                        E = this._iv,
                        a = this._keystream;
                      (E && ((a = this._keystream = E.slice(0)), (this._iv = void 0)),
                        l.encryptBlock(a, 0));
                      for (var B = 0; B < v; B++) d[y + B] ^= a[B];
                    },
                  }));
                return ((e.Decryptor = f), e);
              })()),
              x.mode.OFB
            );
          });
        })(Z0)),
      Z0.exports
    );
  }
  var Y0 = { exports: {} },
    Nx;
  function Je() {
    return (
      Nx ||
        ((Nx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.mode.ECB = (function () {
                var e = x.lib.BlockCipherMode.extend();
                return (
                  (e.Encryptor = e.extend({
                    processBlock: function (f, d) {
                      this._cipher.encryptBlock(f, d);
                    },
                  })),
                  (e.Decryptor = e.extend({
                    processBlock: function (f, d) {
                      this._cipher.decryptBlock(f, d);
                    },
                  })),
                  e
                );
              })()),
              x.mode.ECB
            );
          });
        })(Y0)),
      Y0.exports
    );
  }
  var J0 = { exports: {} },
    Ux;
  function x9() {
    return (
      Ux ||
        ((Ux = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.pad.AnsiX923 = {
                pad: function (e, f) {
                  var d = e.sigBytes,
                    y = f * 4,
                    l = y - (d % y),
                    v = d + l - 1;
                  (e.clamp(), (e.words[v >>> 2] |= l << (24 - (v % 4) * 8)), (e.sigBytes += l));
                },
                unpad: function (e) {
                  var f = e.words[(e.sigBytes - 1) >>> 2] & 255;
                  e.sigBytes -= f;
                },
              }),
              x.pad.Ansix923
            );
          });
        })(J0)),
      J0.exports
    );
  }
  var xx = { exports: {} },
    Wx;
  function e9() {
    return (
      Wx ||
        ((Wx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.pad.Iso10126 = {
                pad: function (e, f) {
                  var d = f * 4,
                    y = d - (e.sigBytes % d);
                  e.concat(x.lib.WordArray.random(y - 1)).concat(
                    x.lib.WordArray.create([y << 24], 1),
                  );
                },
                unpad: function (e) {
                  var f = e.words[(e.sigBytes - 1) >>> 2] & 255;
                  e.sigBytes -= f;
                },
              }),
              x.pad.Iso10126
            );
          });
        })(xx)),
      xx.exports
    );
  }
  var ex = { exports: {} },
    $x;
  function r9() {
    return (
      $x ||
        (($x = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.pad.Iso97971 = {
                pad: function (e, f) {
                  (e.concat(x.lib.WordArray.create([2147483648], 1)), x.pad.ZeroPadding.pad(e, f));
                },
                unpad: function (e) {
                  (x.pad.ZeroPadding.unpad(e), e.sigBytes--);
                },
              }),
              x.pad.Iso97971
            );
          });
        })(ex)),
      ex.exports
    );
  }
  var rx = { exports: {} },
    jx;
  function t9() {
    return (
      jx ||
        ((jx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.pad.ZeroPadding = {
                pad: function (e, f) {
                  var d = f * 4;
                  (e.clamp(), (e.sigBytes += d - (e.sigBytes % d || d)));
                },
                unpad: function (e) {
                  for (var f = e.words, d = e.sigBytes - 1, d = e.sigBytes - 1; d >= 0; d--)
                    if ((f[d >>> 2] >>> (24 - (d % 4) * 8)) & 255) {
                      e.sigBytes = d + 1;
                      break;
                    }
                },
              }),
              x.pad.ZeroPadding
            );
          });
        })(rx)),
      rx.exports
    );
  }
  var tx = { exports: {} },
    qx;
  function o9() {
    return (
      qx ||
        ((qx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (x.pad.NoPadding = { pad: function () {}, unpad: function () {} }),
              x.pad.NoPadding
            );
          });
        })(tx)),
      tx.exports
    );
  }
  var ox = { exports: {} },
    Vx;
  function E9() {
    return (
      Vx ||
        ((Vx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), J());
          })(V, function (x) {
            return (
              (function (e) {
                var f = x,
                  d = f.lib,
                  y = d.CipherParams,
                  l = f.enc,
                  v = l.Hex,
                  E = f.format;
                E.Hex = {
                  stringify: function (a) {
                    return a.ciphertext.toString(v);
                  },
                  parse: function (a) {
                    var B = v.parse(a);
                    return y.create({ ciphertext: B });
                  },
                };
              })(),
              x.format.Hex
            );
          });
        })(ox)),
      ox.exports
    );
  }
  var Ex = { exports: {} },
    Xx;
  function a9() {
    return (
      Xx ||
        ((Xx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), D0(), l0(), c0(), J());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.BlockCipher,
                  y = e.algo,
                  l = [],
                  v = [],
                  E = [],
                  a = [],
                  B = [],
                  s = [],
                  D = [],
                  c = [],
                  h = [],
                  i = [];
                (function () {
                  for (var n = [], t = 0; t < 256; t++)
                    t < 128 ? (n[t] = t << 1) : (n[t] = (t << 1) ^ 283);
                  for (var A = 0, F = 0, t = 0; t < 256; t++) {
                    var u = F ^ (F << 1) ^ (F << 2) ^ (F << 3) ^ (F << 4);
                    ((u = (u >>> 8) ^ (u & 255) ^ 99), (l[A] = u), (v[u] = A));
                    var k = n[A],
                      g = n[k],
                      p = n[g],
                      m = (n[u] * 257) ^ (u * 16843008);
                    ((E[A] = (m << 24) | (m >>> 8)),
                      (a[A] = (m << 16) | (m >>> 16)),
                      (B[A] = (m << 8) | (m >>> 24)),
                      (s[A] = m));
                    var m = (p * 16843009) ^ (g * 65537) ^ (k * 257) ^ (A * 16843008);
                    ((D[u] = (m << 24) | (m >>> 8)),
                      (c[u] = (m << 16) | (m >>> 16)),
                      (h[u] = (m << 8) | (m >>> 24)),
                      (i[u] = m),
                      A ? ((A = k ^ n[n[n[p ^ k]]]), (F ^= n[n[F]])) : (A = F = 1));
                  }
                })();
                var w = [0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54],
                  C = (y.AES = d.extend({
                    _doReset: function () {
                      var n;
                      if (!(this._nRounds && this._keyPriorReset === this._key)) {
                        for (
                          var t = (this._keyPriorReset = this._key),
                            A = t.words,
                            F = t.sigBytes / 4,
                            u = (this._nRounds = F + 6),
                            k = (u + 1) * 4,
                            g = (this._keySchedule = []),
                            p = 0;
                          p < k;
                          p++
                        )
                          p < F
                            ? (g[p] = A[p])
                            : ((n = g[p - 1]),
                              p % F
                                ? F > 6 &&
                                  p % F == 4 &&
                                  (n =
                                    (l[n >>> 24] << 24) |
                                    (l[(n >>> 16) & 255] << 16) |
                                    (l[(n >>> 8) & 255] << 8) |
                                    l[n & 255])
                                : ((n = (n << 8) | (n >>> 24)),
                                  (n =
                                    (l[n >>> 24] << 24) |
                                    (l[(n >>> 16) & 255] << 16) |
                                    (l[(n >>> 8) & 255] << 8) |
                                    l[n & 255]),
                                  (n ^= w[(p / F) | 0] << 24)),
                              (g[p] = g[p - F] ^ n));
                        for (var m = (this._invKeySchedule = []), b = 0; b < k; b++) {
                          var p = k - b;
                          if (b % 4) var n = g[p];
                          else var n = g[p - 4];
                          b < 4 || p <= 4
                            ? (m[b] = n)
                            : (m[b] =
                                D[l[n >>> 24]] ^
                                c[l[(n >>> 16) & 255]] ^
                                h[l[(n >>> 8) & 255]] ^
                                i[l[n & 255]]);
                        }
                      }
                    },
                    encryptBlock: function (n, t) {
                      this._doCryptBlock(n, t, this._keySchedule, E, a, B, s, l);
                    },
                    decryptBlock: function (n, t) {
                      var A = n[t + 1];
                      ((n[t + 1] = n[t + 3]),
                        (n[t + 3] = A),
                        this._doCryptBlock(n, t, this._invKeySchedule, D, c, h, i, v));
                      var A = n[t + 1];
                      ((n[t + 1] = n[t + 3]), (n[t + 3] = A));
                    },
                    _doCryptBlock: function (n, t, A, F, u, k, g, p) {
                      for (
                        var m = this._nRounds,
                          b = n[t] ^ A[0],
                          S = n[t + 1] ^ A[1],
                          z = n[t + 2] ^ A[2],
                          M = n[t + 3] ^ A[3],
                          R = 4,
                          I = 1;
                        I < m;
                        I++
                      ) {
                        var H =
                            F[b >>> 24] ^
                            u[(S >>> 16) & 255] ^
                            k[(z >>> 8) & 255] ^
                            g[M & 255] ^
                            A[R++],
                          N =
                            F[S >>> 24] ^
                            u[(z >>> 16) & 255] ^
                            k[(M >>> 8) & 255] ^
                            g[b & 255] ^
                            A[R++],
                          O =
                            F[z >>> 24] ^
                            u[(M >>> 16) & 255] ^
                            k[(b >>> 8) & 255] ^
                            g[S & 255] ^
                            A[R++],
                          P =
                            F[M >>> 24] ^
                            u[(b >>> 16) & 255] ^
                            k[(S >>> 8) & 255] ^
                            g[z & 255] ^
                            A[R++];
                        ((b = H), (S = N), (z = O), (M = P));
                      }
                      var H =
                          ((p[b >>> 24] << 24) |
                            (p[(S >>> 16) & 255] << 16) |
                            (p[(z >>> 8) & 255] << 8) |
                            p[M & 255]) ^
                          A[R++],
                        N =
                          ((p[S >>> 24] << 24) |
                            (p[(z >>> 16) & 255] << 16) |
                            (p[(M >>> 8) & 255] << 8) |
                            p[b & 255]) ^
                          A[R++],
                        O =
                          ((p[z >>> 24] << 24) |
                            (p[(M >>> 16) & 255] << 16) |
                            (p[(b >>> 8) & 255] << 8) |
                            p[S & 255]) ^
                          A[R++],
                        P =
                          ((p[M >>> 24] << 24) |
                            (p[(b >>> 16) & 255] << 16) |
                            (p[(S >>> 8) & 255] << 8) |
                            p[z & 255]) ^
                          A[R++];
                      ((n[t] = H), (n[t + 1] = N), (n[t + 2] = O), (n[t + 3] = P));
                    },
                    keySize: 256 / 32,
                  }));
                e.AES = d._createHelper(C);
              })(),
              x.AES
            );
          });
        })(Ex)),
      Ex.exports
    );
  }
  var ax = { exports: {} },
    Gx;
  function n9() {
    return (
      Gx ||
        ((Gx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), D0(), l0(), c0(), J());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.WordArray,
                  y = f.BlockCipher,
                  l = e.algo,
                  v = [
                    57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27,
                    19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30,
                    22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4,
                  ],
                  E = [
                    14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20,
                    13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53,
                    46, 42, 50, 36, 29, 32,
                  ],
                  a = [1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28],
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
                  s = [4160749569, 528482304, 33030144, 2064384, 129024, 8064, 504, 2147483679],
                  D = (l.DES = y.extend({
                    _doReset: function () {
                      for (var w = this._key, C = w.words, n = [], t = 0; t < 56; t++) {
                        var A = v[t] - 1;
                        n[t] = (C[A >>> 5] >>> (31 - (A % 32))) & 1;
                      }
                      for (var F = (this._subKeys = []), u = 0; u < 16; u++) {
                        for (var k = (F[u] = []), g = a[u], t = 0; t < 24; t++)
                          ((k[(t / 6) | 0] |= n[(E[t] - 1 + g) % 28] << (31 - (t % 6))),
                            (k[4 + ((t / 6) | 0)] |=
                              n[28 + ((E[t + 24] - 1 + g) % 28)] << (31 - (t % 6))));
                        k[0] = (k[0] << 1) | (k[0] >>> 31);
                        for (var t = 1; t < 7; t++) k[t] = k[t] >>> ((t - 1) * 4 + 3);
                        k[7] = (k[7] << 5) | (k[7] >>> 27);
                      }
                      for (var p = (this._invSubKeys = []), t = 0; t < 16; t++) p[t] = F[15 - t];
                    },
                    encryptBlock: function (w, C) {
                      this._doCryptBlock(w, C, this._subKeys);
                    },
                    decryptBlock: function (w, C) {
                      this._doCryptBlock(w, C, this._invSubKeys);
                    },
                    _doCryptBlock: function (w, C, n) {
                      ((this._lBlock = w[C]),
                        (this._rBlock = w[C + 1]),
                        c.call(this, 4, 252645135),
                        c.call(this, 16, 65535),
                        h.call(this, 2, 858993459),
                        h.call(this, 8, 16711935),
                        c.call(this, 1, 1431655765));
                      for (var t = 0; t < 16; t++) {
                        for (
                          var A = n[t], F = this._lBlock, u = this._rBlock, k = 0, g = 0;
                          g < 8;
                          g++
                        )
                          k |= B[g][((u ^ A[g]) & s[g]) >>> 0];
                        ((this._lBlock = u), (this._rBlock = F ^ k));
                      }
                      var p = this._lBlock;
                      ((this._lBlock = this._rBlock),
                        (this._rBlock = p),
                        c.call(this, 1, 1431655765),
                        h.call(this, 8, 16711935),
                        h.call(this, 2, 858993459),
                        c.call(this, 16, 65535),
                        c.call(this, 4, 252645135),
                        (w[C] = this._lBlock),
                        (w[C + 1] = this._rBlock));
                    },
                    keySize: 64 / 32,
                    ivSize: 64 / 32,
                    blockSize: 64 / 32,
                  }));
                function c(w, C) {
                  var n = ((this._lBlock >>> w) ^ this._rBlock) & C;
                  ((this._rBlock ^= n), (this._lBlock ^= n << w));
                }
                function h(w, C) {
                  var n = ((this._rBlock >>> w) ^ this._lBlock) & C;
                  ((this._lBlock ^= n), (this._rBlock ^= n << w));
                }
                e.DES = y._createHelper(D);
                var i = (l.TripleDES = y.extend({
                  _doReset: function () {
                    var w = this._key,
                      C = w.words;
                    if (C.length !== 2 && C.length !== 4 && C.length < 6)
                      throw new Error(
                        "Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.",
                      );
                    var n = C.slice(0, 2),
                      t = C.length < 4 ? C.slice(0, 2) : C.slice(2, 4),
                      A = C.length < 6 ? C.slice(0, 2) : C.slice(4, 6);
                    ((this._des1 = D.createEncryptor(d.create(n))),
                      (this._des2 = D.createEncryptor(d.create(t))),
                      (this._des3 = D.createEncryptor(d.create(A))));
                  },
                  encryptBlock: function (w, C) {
                    (this._des1.encryptBlock(w, C),
                      this._des2.decryptBlock(w, C),
                      this._des3.encryptBlock(w, C));
                  },
                  decryptBlock: function (w, C) {
                    (this._des3.decryptBlock(w, C),
                      this._des2.encryptBlock(w, C),
                      this._des1.decryptBlock(w, C));
                  },
                  keySize: 192 / 32,
                  ivSize: 64 / 32,
                  blockSize: 64 / 32,
                }));
                e.TripleDES = y._createHelper(i);
              })(),
              x.TripleDES
            );
          });
        })(ax)),
      ax.exports
    );
  }
  var nx = { exports: {} },
    Kx;
  function s9() {
    return (
      Kx ||
        ((Kx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), D0(), l0(), c0(), J());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.StreamCipher,
                  y = e.algo,
                  l = (y.RC4 = d.extend({
                    _doReset: function () {
                      for (
                        var a = this._key, B = a.words, s = a.sigBytes, D = (this._S = []), c = 0;
                        c < 256;
                        c++
                      )
                        D[c] = c;
                      for (var c = 0, h = 0; c < 256; c++) {
                        var i = c % s,
                          w = (B[i >>> 2] >>> (24 - (i % 4) * 8)) & 255;
                        h = (h + D[c] + w) % 256;
                        var C = D[c];
                        ((D[c] = D[h]), (D[h] = C));
                      }
                      this._i = this._j = 0;
                    },
                    _doProcessBlock: function (a, B) {
                      a[B] ^= v.call(this);
                    },
                    keySize: 256 / 32,
                    ivSize: 0,
                  }));
                function v() {
                  for (var a = this._S, B = this._i, s = this._j, D = 0, c = 0; c < 4; c++) {
                    ((B = (B + 1) % 256), (s = (s + a[B]) % 256));
                    var h = a[B];
                    ((a[B] = a[s]), (a[s] = h), (D |= a[(a[B] + a[s]) % 256] << (24 - c * 8)));
                  }
                  return ((this._i = B), (this._j = s), D);
                }
                e.RC4 = d._createHelper(l);
                var E = (y.RC4Drop = l.extend({
                  cfg: l.cfg.extend({ drop: 192 }),
                  _doReset: function () {
                    l._doReset.call(this);
                    for (var a = this.cfg.drop; a > 0; a--) v.call(this);
                  },
                }));
                e.RC4Drop = d._createHelper(E);
              })(),
              x.RC4
            );
          });
        })(nx)),
      nx.exports
    );
  }
  var sx = { exports: {} },
    Qx;
  function B9() {
    return (
      Qx ||
        ((Qx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), D0(), l0(), c0(), J());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.StreamCipher,
                  y = e.algo,
                  l = [],
                  v = [],
                  E = [],
                  a = (y.Rabbit = d.extend({
                    _doReset: function () {
                      for (var s = this._key.words, D = this.cfg.iv, c = 0; c < 4; c++)
                        s[c] =
                          (((s[c] << 8) | (s[c] >>> 24)) & 16711935) |
                          (((s[c] << 24) | (s[c] >>> 8)) & 4278255360);
                      var h = (this._X = [
                          s[0],
                          (s[3] << 16) | (s[2] >>> 16),
                          s[1],
                          (s[0] << 16) | (s[3] >>> 16),
                          s[2],
                          (s[1] << 16) | (s[0] >>> 16),
                          s[3],
                          (s[2] << 16) | (s[1] >>> 16),
                        ]),
                        i = (this._C = [
                          (s[2] << 16) | (s[2] >>> 16),
                          (s[0] & 4294901760) | (s[1] & 65535),
                          (s[3] << 16) | (s[3] >>> 16),
                          (s[1] & 4294901760) | (s[2] & 65535),
                          (s[0] << 16) | (s[0] >>> 16),
                          (s[2] & 4294901760) | (s[3] & 65535),
                          (s[1] << 16) | (s[1] >>> 16),
                          (s[3] & 4294901760) | (s[0] & 65535),
                        ]);
                      this._b = 0;
                      for (var c = 0; c < 4; c++) B.call(this);
                      for (var c = 0; c < 8; c++) i[c] ^= h[(c + 4) & 7];
                      if (D) {
                        var w = D.words,
                          C = w[0],
                          n = w[1],
                          t =
                            (((C << 8) | (C >>> 24)) & 16711935) |
                            (((C << 24) | (C >>> 8)) & 4278255360),
                          A =
                            (((n << 8) | (n >>> 24)) & 16711935) |
                            (((n << 24) | (n >>> 8)) & 4278255360),
                          F = (t >>> 16) | (A & 4294901760),
                          u = (A << 16) | (t & 65535);
                        ((i[0] ^= t),
                          (i[1] ^= F),
                          (i[2] ^= A),
                          (i[3] ^= u),
                          (i[4] ^= t),
                          (i[5] ^= F),
                          (i[6] ^= A),
                          (i[7] ^= u));
                        for (var c = 0; c < 4; c++) B.call(this);
                      }
                    },
                    _doProcessBlock: function (s, D) {
                      var c = this._X;
                      (B.call(this),
                        (l[0] = c[0] ^ (c[5] >>> 16) ^ (c[3] << 16)),
                        (l[1] = c[2] ^ (c[7] >>> 16) ^ (c[5] << 16)),
                        (l[2] = c[4] ^ (c[1] >>> 16) ^ (c[7] << 16)),
                        (l[3] = c[6] ^ (c[3] >>> 16) ^ (c[1] << 16)));
                      for (var h = 0; h < 4; h++)
                        ((l[h] =
                          (((l[h] << 8) | (l[h] >>> 24)) & 16711935) |
                          (((l[h] << 24) | (l[h] >>> 8)) & 4278255360)),
                          (s[D + h] ^= l[h]));
                    },
                    blockSize: 128 / 32,
                    ivSize: 64 / 32,
                  }));
                function B() {
                  for (var s = this._X, D = this._C, c = 0; c < 8; c++) v[c] = D[c];
                  ((D[0] = (D[0] + 1295307597 + this._b) | 0),
                    (D[1] = (D[1] + 3545052371 + (D[0] >>> 0 < v[0] >>> 0 ? 1 : 0)) | 0),
                    (D[2] = (D[2] + 886263092 + (D[1] >>> 0 < v[1] >>> 0 ? 1 : 0)) | 0),
                    (D[3] = (D[3] + 1295307597 + (D[2] >>> 0 < v[2] >>> 0 ? 1 : 0)) | 0),
                    (D[4] = (D[4] + 3545052371 + (D[3] >>> 0 < v[3] >>> 0 ? 1 : 0)) | 0),
                    (D[5] = (D[5] + 886263092 + (D[4] >>> 0 < v[4] >>> 0 ? 1 : 0)) | 0),
                    (D[6] = (D[6] + 1295307597 + (D[5] >>> 0 < v[5] >>> 0 ? 1 : 0)) | 0),
                    (D[7] = (D[7] + 3545052371 + (D[6] >>> 0 < v[6] >>> 0 ? 1 : 0)) | 0),
                    (this._b = D[7] >>> 0 < v[7] >>> 0 ? 1 : 0));
                  for (var c = 0; c < 8; c++) {
                    var h = s[c] + D[c],
                      i = h & 65535,
                      w = h >>> 16,
                      C = ((((i * i) >>> 17) + i * w) >>> 15) + w * w,
                      n = (((h & 4294901760) * h) | 0) + (((h & 65535) * h) | 0);
                    E[c] = C ^ n;
                  }
                  ((s[0] =
                    (E[0] + ((E[7] << 16) | (E[7] >>> 16)) + ((E[6] << 16) | (E[6] >>> 16))) | 0),
                    (s[1] = (E[1] + ((E[0] << 8) | (E[0] >>> 24)) + E[7]) | 0),
                    (s[2] =
                      (E[2] + ((E[1] << 16) | (E[1] >>> 16)) + ((E[0] << 16) | (E[0] >>> 16))) | 0),
                    (s[3] = (E[3] + ((E[2] << 8) | (E[2] >>> 24)) + E[1]) | 0),
                    (s[4] =
                      (E[4] + ((E[3] << 16) | (E[3] >>> 16)) + ((E[2] << 16) | (E[2] >>> 16))) | 0),
                    (s[5] = (E[5] + ((E[4] << 8) | (E[4] >>> 24)) + E[3]) | 0),
                    (s[6] =
                      (E[6] + ((E[5] << 16) | (E[5] >>> 16)) + ((E[4] << 16) | (E[4] >>> 16))) | 0),
                    (s[7] = (E[7] + ((E[6] << 8) | (E[6] >>> 24)) + E[5]) | 0));
                }
                e.Rabbit = d._createHelper(a);
              })(),
              x.Rabbit
            );
          });
        })(sx)),
      sx.exports
    );
  }
  var Bx = { exports: {} },
    Zx;
  function c9() {
    return (
      Zx ||
        ((Zx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), D0(), l0(), c0(), J());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.StreamCipher,
                  y = e.algo,
                  l = [],
                  v = [],
                  E = [],
                  a = (y.RabbitLegacy = d.extend({
                    _doReset: function () {
                      var s = this._key.words,
                        D = this.cfg.iv,
                        c = (this._X = [
                          s[0],
                          (s[3] << 16) | (s[2] >>> 16),
                          s[1],
                          (s[0] << 16) | (s[3] >>> 16),
                          s[2],
                          (s[1] << 16) | (s[0] >>> 16),
                          s[3],
                          (s[2] << 16) | (s[1] >>> 16),
                        ]),
                        h = (this._C = [
                          (s[2] << 16) | (s[2] >>> 16),
                          (s[0] & 4294901760) | (s[1] & 65535),
                          (s[3] << 16) | (s[3] >>> 16),
                          (s[1] & 4294901760) | (s[2] & 65535),
                          (s[0] << 16) | (s[0] >>> 16),
                          (s[2] & 4294901760) | (s[3] & 65535),
                          (s[1] << 16) | (s[1] >>> 16),
                          (s[3] & 4294901760) | (s[0] & 65535),
                        ]);
                      this._b = 0;
                      for (var i = 0; i < 4; i++) B.call(this);
                      for (var i = 0; i < 8; i++) h[i] ^= c[(i + 4) & 7];
                      if (D) {
                        var w = D.words,
                          C = w[0],
                          n = w[1],
                          t =
                            (((C << 8) | (C >>> 24)) & 16711935) |
                            (((C << 24) | (C >>> 8)) & 4278255360),
                          A =
                            (((n << 8) | (n >>> 24)) & 16711935) |
                            (((n << 24) | (n >>> 8)) & 4278255360),
                          F = (t >>> 16) | (A & 4294901760),
                          u = (A << 16) | (t & 65535);
                        ((h[0] ^= t),
                          (h[1] ^= F),
                          (h[2] ^= A),
                          (h[3] ^= u),
                          (h[4] ^= t),
                          (h[5] ^= F),
                          (h[6] ^= A),
                          (h[7] ^= u));
                        for (var i = 0; i < 4; i++) B.call(this);
                      }
                    },
                    _doProcessBlock: function (s, D) {
                      var c = this._X;
                      (B.call(this),
                        (l[0] = c[0] ^ (c[5] >>> 16) ^ (c[3] << 16)),
                        (l[1] = c[2] ^ (c[7] >>> 16) ^ (c[5] << 16)),
                        (l[2] = c[4] ^ (c[1] >>> 16) ^ (c[7] << 16)),
                        (l[3] = c[6] ^ (c[3] >>> 16) ^ (c[1] << 16)));
                      for (var h = 0; h < 4; h++)
                        ((l[h] =
                          (((l[h] << 8) | (l[h] >>> 24)) & 16711935) |
                          (((l[h] << 24) | (l[h] >>> 8)) & 4278255360)),
                          (s[D + h] ^= l[h]));
                    },
                    blockSize: 128 / 32,
                    ivSize: 64 / 32,
                  }));
                function B() {
                  for (var s = this._X, D = this._C, c = 0; c < 8; c++) v[c] = D[c];
                  ((D[0] = (D[0] + 1295307597 + this._b) | 0),
                    (D[1] = (D[1] + 3545052371 + (D[0] >>> 0 < v[0] >>> 0 ? 1 : 0)) | 0),
                    (D[2] = (D[2] + 886263092 + (D[1] >>> 0 < v[1] >>> 0 ? 1 : 0)) | 0),
                    (D[3] = (D[3] + 1295307597 + (D[2] >>> 0 < v[2] >>> 0 ? 1 : 0)) | 0),
                    (D[4] = (D[4] + 3545052371 + (D[3] >>> 0 < v[3] >>> 0 ? 1 : 0)) | 0),
                    (D[5] = (D[5] + 886263092 + (D[4] >>> 0 < v[4] >>> 0 ? 1 : 0)) | 0),
                    (D[6] = (D[6] + 1295307597 + (D[5] >>> 0 < v[5] >>> 0 ? 1 : 0)) | 0),
                    (D[7] = (D[7] + 3545052371 + (D[6] >>> 0 < v[6] >>> 0 ? 1 : 0)) | 0),
                    (this._b = D[7] >>> 0 < v[7] >>> 0 ? 1 : 0));
                  for (var c = 0; c < 8; c++) {
                    var h = s[c] + D[c],
                      i = h & 65535,
                      w = h >>> 16,
                      C = ((((i * i) >>> 17) + i * w) >>> 15) + w * w,
                      n = (((h & 4294901760) * h) | 0) + (((h & 65535) * h) | 0);
                    E[c] = C ^ n;
                  }
                  ((s[0] =
                    (E[0] + ((E[7] << 16) | (E[7] >>> 16)) + ((E[6] << 16) | (E[6] >>> 16))) | 0),
                    (s[1] = (E[1] + ((E[0] << 8) | (E[0] >>> 24)) + E[7]) | 0),
                    (s[2] =
                      (E[2] + ((E[1] << 16) | (E[1] >>> 16)) + ((E[0] << 16) | (E[0] >>> 16))) | 0),
                    (s[3] = (E[3] + ((E[2] << 8) | (E[2] >>> 24)) + E[1]) | 0),
                    (s[4] =
                      (E[4] + ((E[3] << 16) | (E[3] >>> 16)) + ((E[2] << 16) | (E[2] >>> 16))) | 0),
                    (s[5] = (E[5] + ((E[4] << 8) | (E[4] >>> 24)) + E[3]) | 0),
                    (s[6] =
                      (E[6] + ((E[5] << 16) | (E[5] >>> 16)) + ((E[4] << 16) | (E[4] >>> 16))) | 0),
                    (s[7] = (E[7] + ((E[6] << 8) | (E[6] >>> 24)) + E[5]) | 0));
                }
                e.RabbitLegacy = d._createHelper(a);
              })(),
              x.RabbitLegacy
            );
          });
        })(Bx)),
      Bx.exports
    );
  }
  var cx = { exports: {} },
    Yx;
  function C9() {
    return (
      Yx ||
        ((Yx = 1),
        (function (r, o) {
          (function (x, e, f) {
            r.exports = e(X(), D0(), l0(), c0(), J());
          })(V, function (x) {
            return (
              (function () {
                var e = x,
                  f = e.lib,
                  d = f.BlockCipher,
                  y = e.algo;
                const l = 16,
                  v = [
                    608135816, 2242054355, 320440878, 57701188, 2752067618, 698298832, 137296536,
                    3964562569, 1160258022, 953160567, 3193202383, 887688300, 3232508343,
                    3380367581, 1065670069, 3041331479, 2450970073, 2306472731,
                  ],
                  E = [
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
                var a = { pbox: [], sbox: [] };
                function B(i, w) {
                  let C = (w >> 24) & 255,
                    n = (w >> 16) & 255,
                    t = (w >> 8) & 255,
                    A = w & 255,
                    F = i.sbox[0][C] + i.sbox[1][n];
                  return ((F = F ^ i.sbox[2][t]), (F = F + i.sbox[3][A]), F);
                }
                function s(i, w, C) {
                  let n = w,
                    t = C,
                    A;
                  for (let F = 0; F < l; ++F)
                    ((n = n ^ i.pbox[F]), (t = B(i, n) ^ t), (A = n), (n = t), (t = A));
                  return (
                    (A = n),
                    (n = t),
                    (t = A),
                    (t = t ^ i.pbox[l]),
                    (n = n ^ i.pbox[l + 1]),
                    { left: n, right: t }
                  );
                }
                function D(i, w, C) {
                  let n = w,
                    t = C,
                    A;
                  for (let F = l + 1; F > 1; --F)
                    ((n = n ^ i.pbox[F]), (t = B(i, n) ^ t), (A = n), (n = t), (t = A));
                  return (
                    (A = n),
                    (n = t),
                    (t = A),
                    (t = t ^ i.pbox[1]),
                    (n = n ^ i.pbox[0]),
                    { left: n, right: t }
                  );
                }
                function c(i, w, C) {
                  for (let u = 0; u < 4; u++) {
                    i.sbox[u] = [];
                    for (let k = 0; k < 256; k++) i.sbox[u][k] = E[u][k];
                  }
                  let n = 0;
                  for (let u = 0; u < l + 2; u++)
                    ((i.pbox[u] = v[u] ^ w[n]), n++, n >= C && (n = 0));
                  let t = 0,
                    A = 0,
                    F = 0;
                  for (let u = 0; u < l + 2; u += 2)
                    ((F = s(i, t, A)),
                      (t = F.left),
                      (A = F.right),
                      (i.pbox[u] = t),
                      (i.pbox[u + 1] = A));
                  for (let u = 0; u < 4; u++)
                    for (let k = 0; k < 256; k += 2)
                      ((F = s(i, t, A)),
                        (t = F.left),
                        (A = F.right),
                        (i.sbox[u][k] = t),
                        (i.sbox[u][k + 1] = A));
                  return !0;
                }
                var h = (y.Blowfish = d.extend({
                  _doReset: function () {
                    if (this._keyPriorReset !== this._key) {
                      var i = (this._keyPriorReset = this._key),
                        w = i.words,
                        C = i.sigBytes / 4;
                      c(a, w, C);
                    }
                  },
                  encryptBlock: function (i, w) {
                    var C = s(a, i[w], i[w + 1]);
                    ((i[w] = C.left), (i[w + 1] = C.right));
                  },
                  decryptBlock: function (i, w) {
                    var C = D(a, i[w], i[w + 1]);
                    ((i[w] = C.left), (i[w + 1] = C.right));
                  },
                  blockSize: 64 / 32,
                  keySize: 128 / 32,
                  ivSize: 64 / 32,
                }));
                e.Blowfish = d._createHelper(h);
              })(),
              x.Blowfish
            );
          });
        })(cx)),
      cx.exports
    );
  }
  (function (r, o) {
    (function (x, e, f) {
      r.exports = e(
        X(),
        w0(),
        Ue(),
        We(),
        D0(),
        $e(),
        l0(),
        kx(),
        I0(),
        je(),
        bx(),
        qe(),
        Ve(),
        Xe(),
        j0(),
        Ge(),
        c0(),
        J(),
        Ke(),
        Qe(),
        Ze(),
        Ye(),
        Je(),
        x9(),
        e9(),
        r9(),
        t9(),
        o9(),
        E9(),
        a9(),
        n9(),
        s9(),
        B9(),
        c9(),
        C9(),
      );
    })(V, function (x) {
      return x;
    });
  })(Dx);
  var C0 = Dx.exports;
  const Jx = { aes_key: "c4n0lFdTM39TTYjH", aes_iv: "sn7TwyGuU7kJWEAp" },
    xe = Jx.aes_key,
    ee = Jx.aes_iv;
  function k0(r) {
    var o = C0.AES.encrypt(r, C0.enc.Utf8.parse(xe), { iv: C0.enc.Utf8.parse(ee) });
    return C0.enc.Base64.stringify(o.ciphertext);
  }
  function i9(r) {
    var o = C0.AES.decrypt(r, C0.enc.Utf8.parse(xe), { iv: C0.enc.Utf8.parse(ee) });
    return o.toString(C0.enc.Utf8);
  }
  const W = "https://api.zhanfubrowser.com/api/v1",
    A9 = "/bindMall/savePasskey",
    F9 = "/bindMall/listPasskey",
    $ = function (r) {
      if (r.errorCode !== 0)
        return (
          r.errorCode === 400997 && console.error("授权已过期"),
          Promise.reject(new Error(r.message || r.msg || "Error"))
        );
      if (r.format === 1) {
        const x = r.data,
          e = i9(x),
          f = JSON.parse(e);
        r.data = f;
      }
      return r;
    },
    U = async (r) => {
      const o = { "Content-Type": "application/json" },
        x = await Ie(),
        e = await Re(),
        f = await He();
      return (
        x && (o.Authorization = "Bearer " + x),
        e && (o.browserVersion = e),
        f && (o["X-Language"] = f),
        o
      );
    },
    D9 = {
      async getUserInfo(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/user/getUserInfo?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getUserInfo error", x);
        }
      },
      async getUserWebPageList(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/webpage/getBindWebpageRuleV2?${new URLSearchParams(r)}`, {
              headers: o,
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getUserWebPageList error", x);
        }
      },
      async getInfoByKey(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/sundry/getInfoByKey?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getInfoByKey error", x);
        }
      },
      async getInfoByKeys(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/sundry/getInfoByKeys?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getInfoByKeys error", x);
        }
      },
      async uploadStatistics(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/statistics/click?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("uploadStatistics error", x);
        }
      },
      async getTagPages(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/getTagPages?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getTagPages error", x);
        }
      },
      async getStaticByIp(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/mall/bindMall/getAcceleratedDomain?${new URLSearchParams(r)}`, {
              headers: o,
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getStaticByIp error", x);
        }
      },
      async getCurrency(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/common/currency?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getCurrency error", x);
        }
      },
      async getTime(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/common/time?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getTime error", x);
        }
      },
      async getAdsRecommendBySite(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/safe/actionLog/GetAdsRecommendBySite?${new URLSearchParams(r)}`, {
              headers: o,
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getAdsRecommendBySite error", x);
        }
      },
      async getMallInfo(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/mall/bindMall/getMall?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getMallInfo error", x);
        }
      },
      async saveMallJumpMethod(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/updateJumpMethod`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("saveMallJumpMethod error", x);
        }
      },
      async saveMallJumpUrls(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/updateJumpUrls`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("saveMallJumpUrls error", x);
        }
      },
      async getWebsiteList(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/ads/website/getWebsiteList?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getWebsiteList error", x);
        }
      },
      async addTagPages(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/addTagPages`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("addTagPages error", x);
        }
      },
      async getFirewall(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/mall/bindMall/getFirewall?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getFirewall error", x);
        }
      },
      async getFirewallNew(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/mall/bindMall/getFirewallV2?${new URLSearchParams(r)}`, {
              headers: o,
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getFirewallNew error", x);
        }
      },
      async getWhiteList(r) {
        const o = await U();
        try {
          return await (
            await fetch("https://cyt-browser-oss.zhanfubrowser.com/whiteList_data.json", {
              headers: o,
            })
          ).json();
        } catch (x) {
          console.log("getWhiteList error", x);
        }
      },
      async getDirectList(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/mall/bindMall/blackList?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getDirectList error", x);
        }
      },
      async getPluginInfo(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/ads/plugin/getMallPluginInfo?${new URLSearchParams(r)}`, {
              headers: o,
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getPluginInfo error", x);
        }
      },
      async getPluginInfoByChromeId(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/ads/plugin/getPluginInfo?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getPluginInfoByChromeId error", x);
        }
      },
      async getPluginList(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/ads/plugins/getMallList?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getPluginList error", x);
        }
      },
      async getBookmark(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bookmark/showBookmark?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getBookmark error", x);
        }
      },
      async inBlackList(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/mall/bindMall/inBlackList?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("inBlackList error", x);
        }
      },
      async getAuditStatus(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/epcheck/getAuditStatus?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getAuditStatus error", x);
        }
      },
      async getAuthenticationCode(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/getAuthenticationCode?${new URLSearchParams(r)}`, {
              headers: o,
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getAuthenticationCode error", x);
        }
      },
      async setAuthenticationCode(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/setAuthenticationCode`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("setAuthenticationCode error", x);
        }
      },
      async refreshToken(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/user/refreshToken?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("refreshToken error", x);
        }
      },
      async saveBookmark(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bookmark/saveBookmark`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("saveBookmark error", x);
        }
      },
      async applyWhite(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/white/apply`, { method: "POST", headers: o, body: JSON.stringify(r) })
          ).json();
          return $(e);
        } catch (x) {
          console.log("applyWhite error", x);
        }
      },
      async applyWhiteV2(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/white/applyV2`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("applyWhiteV2 error", x);
        }
      },
      async setCookie(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/setCookie`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("setCookie error", x);
        }
      },
      async reviewReason(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/white/reviewReason`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("reviewReason error", x);
        }
      },
      async reviewReasonV2(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/white/reviewReasonV2`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("reviewReasonV2 error", x);
        }
      },
      async decryptData(r) {
        console.log("decryptData", r);
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/common/decryptData`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("decryptData error", x);
        }
      },
      async reportVerification(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/reportVerification`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("reportVerification error", x);
        }
      },
      async reportCheckForcedOffline(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/checkForcedOffline`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("reportCheckForcedOffline error", x);
        }
      },
      async setAccessStatus(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/bindMall/setAccessStatus`, {
              method: "POST",
              headers: o,
              body: JSON.stringify(r),
            })
          ).json();
          return $(e);
        } catch (x) {
          console.log("setAccessStatus error", x);
        }
      },
      async getWebpageList(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}/webpage/list?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("getWebpageList error", x);
        }
      },
      async getWebpageGroupList() {
        const r = await U();
        try {
          const x = await (
            await fetch(`${W}/webpage/groupList?group_name=`, { headers: r })
          ).json();
          return $(x);
        } catch (o) {
          console.log("getWebpageGroupList error", o);
        }
      },
      async saveWebpage(r) {
        const o = await U();
        o.encryption = 1;
        try {
          const x = JSON.stringify(r || {}),
            e = k0(x),
            d = await (
              await fetch(`${W}/webpage/save`, {
                method: "POST",
                headers: o,
                body: JSON.stringify({ data: e }),
              })
            ).json();
          return $(d);
        } catch (x) {
          console.log("reportVerification error", x);
        }
      },
      async batchSaveUrl(r) {
        const o = await U();
        o.encryption = 1;
        try {
          const x = JSON.stringify(r || {}),
            e = k0(x),
            d = await (
              await fetch(`${W}/domainUrl/batchSave`, {
                method: "POST",
                headers: o,
                body: JSON.stringify({ data: e }),
              })
            ).json();
          return $(d);
        } catch (x) {
          console.log("batchSaveUrl error", x);
        }
      },
      async savePasskey(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}${A9}`, { method: "POST", headers: o, body: JSON.stringify(r) })
          ).json();
          return $(e);
        } catch (x) {
          console.log("savePasskey error", x);
        }
      },
      async listPasskey(r) {
        const o = await U();
        try {
          const e = await (
            await fetch(`${W}${F9}?${new URLSearchParams(r)}`, { headers: o })
          ).json();
          return $(e);
        } catch (x) {
          console.log("listPasskey error", x);
        }
      },
      async transferSpeed(r) {
        const o = await U();
        o.encryption = 1;
        try {
          const x = JSON.stringify(r || {}),
            e = k0(x),
            d = await (
              await fetch(`${W}/mall/bindMall/transferSpeed`, {
                method: "POST",
                headers: o,
                body: JSON.stringify({ data: e }),
              })
            ).json();
          return $(d);
        } catch (x) {
          console.log("transferSpeed error", x);
        }
      },
      async updateMainTransfer(r) {
        const o = await U();
        o.encryption = 1;
        try {
          const x = JSON.stringify(r || {}),
            e = k0(x),
            d = await (
              await fetch(`${W}/mall/bindMall/updateMainTransfer`, {
                method: "POST",
                headers: o,
                body: JSON.stringify({ data: e }),
              })
            ).json();
          return $(d);
        } catch (x) {
          console.log("batchSaveUrl error", x);
        }
      },
    };
  function re(r, o, x = 500, e = 200) {
    if ((!e && e !== 0 && (e = 200), e > 0)) {
      const f = r();
      f
        ? o(f)
        : setTimeout(function () {
            re(r, o, x, --e);
          }, x || 500);
    }
  }
  function te(r, o) {
    var f, d;
    const x = new Event("input", { bubbles: !0 });
    let e;
    try {
      ((e =
        (f = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")) == null
          ? void 0
          : f.set),
        e.call(r, o));
    } catch {
      ((x.simulated = !0),
        (e = (d = Object.getOwnPropertyDescriptor(r.__proto__, "value")) == null ? void 0 : d.set),
        e.call(r, o));
    } finally {
      r.dispatchEvent(x);
    }
  }
  function oe(r, o) {
    var f, d;
    const x = new Event("change", { bubbles: !0 });
    let e;
    try {
      ((e =
        (f = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")) == null
          ? void 0
          : f.set),
        e.call(r, o));
    } catch {
      ((x.simulated = !0),
        (e = (d = Object.getOwnPropertyDescriptor(r.__proto__, "value")) == null ? void 0 : d.set),
        e.call(r, o));
    } finally {
      r.dispatchEvent(x);
    }
  }
  function l9(r) {
    return new Promise((o) => {
      const x = r[0];
      if (!x) {
        o();
        return;
      }
      if (document.activeElement === x) {
        o();
        return;
      }
      try {
        x.focus();
      } catch {}
      if (document.activeElement === x) {
        o();
        return;
      }
      const e = setInterval(() => {
        document.activeElement === x && (clearInterval(e), o());
      }, 50);
      setTimeout(() => {
        (clearInterval(e), o());
      }, 400);
    });
  }
  const G = {
    cipher: {},
    hash: {},
    keyexchange: {},
    mode: {},
    misc: {},
    codec: {},
    exception: {
      corrupt: function (r) {
        ((this.toString = function () {
          return "CORRUPT: " + this.message;
        }),
          (this.message = r));
      },
      invalid: function (r) {
        ((this.toString = function () {
          return "INVALID: " + this.message;
        }),
          (this.message = r));
      },
      bug: function (r) {
        ((this.toString = function () {
          return "BUG: " + this.message;
        }),
          (this.message = r));
      },
      notReady: function (r) {
        ((this.toString = function () {
          return "NOT READY: " + this.message;
        }),
          (this.message = r));
      },
      message: "",
    },
    bitArray: {
      bitSlice: function (r, o, x) {
        return (
          (r = G.bitArray.g(r.slice(o / 32), 32 - (o & 31)).slice(1)),
          x === void 0 ? r : G.bitArray.clamp(r, x - o)
        );
      },
      extract: function (r, o, x) {
        const e = Math.floor((-o - x) & 31);
        return (
          (((o + x - 1) ^ o) & -32
            ? (r[(o / 32) | 0] << (32 - e)) ^ (r[(o / 32 + 1) | 0] >>> e)
            : r[(o / 32) | 0] >>> e) &
          ((1 << x) - 1)
        );
      },
      concat: function (r, o) {
        if (r.length === 0 || o.length === 0) return r.concat(o);
        const x = r[r.length - 1],
          e = G.bitArray.getPartial(x);
        return e === 32 ? r.concat(o) : G.bitArray.g(o, e, x | 0, r.slice(0, r.length - 1));
      },
      bitLength: function (r) {
        const o = r.length;
        return o === 0 ? 0 : 32 * (o - 1) + G.bitArray.getPartial(r[o - 1]);
      },
      clamp: function (r, o) {
        if (32 * r.length < o) return r;
        r = r.slice(0, Math.ceil(o / 32));
        const x = r.length;
        return (
          (o &= 31),
          x > 0 && o && (r[x - 1] = G.bitArray.partial(o, r[x - 1] & (2147483648 >>> (o - 1)), 1)),
          r
        );
      },
      partial: function (r, o, x) {
        return r === 32 ? o : (x ? o | 0 : o << (32 - r)) + 1099511627776 * r;
      },
      getPartial: function (r) {
        return Math.round(r / 1099511627776) || 32;
      },
      equal: function (r, o) {
        if (G.bitArray.bitLength(r) !== G.bitArray.bitLength(o)) return !1;
        let x = 0;
        for (let e = 0; e < r.length; e++) x |= r[e] ^ o[e];
        return x === 0;
      },
      g: function (r, o, x, e) {
        let f = 0;
        for (e === void 0 && (e = []); o >= 32; o -= 32) (e.push(x), (x = 0));
        if (o === 0) return e.concat(r);
        for (f = 0; f < r.length; f++) (e.push(x | (r[f] >>> o)), (x = r[f] << (32 - o)));
        f = r.length ? r[r.length - 1] : 0;
        const d = G.bitArray.getPartial(f);
        return (e.push(G.bitArray.partial((o + d) & 31, o + d > 32 ? x : e.pop(), 1)), e);
      },
      j: function (r, o) {
        return [r[0] ^ o[0], r[1] ^ o[1], r[2] ^ o[2], r[3] ^ o[3]];
      },
    },
  };
  ((G.codec.base32 = {
    e: "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567",
    fromBits: function (r, o) {
      let x = "",
        e = 0;
      const f = G.codec.base32.e;
      let d = 0;
      const y = G.bitArray.bitLength(r);
      for (e = 0; 5 * x.length < y;)
        ((x += f.charAt((d ^ (r[e] >>> e)) >>> 27)),
          e < 5 ? ((d = r[e] << (5 - e)), (e += 27), e++) : ((d <<= 5), (e -= 5)));
      for (; x.length & 5 && !o;) x += "=";
      return x;
    },
    toBits: function (r) {
      r = r.replace(/\s |=/g, "").toUpperCase();
      const o = [];
      let x = 0;
      const e = G.codec.base32.e;
      let f = 0;
      for (let d = 0; d < r.length; d++) {
        const y = e.indexOf(r.charAt(d));
        if (y < 0) throw (G.exception.message = "Invalid base32");
        x > 27
          ? ((x -= 27), o.push(f ^ (y >>> x)), (f = y << (32 - x)))
          : ((x += 5), (f ^= y << (32 - x)));
      }
      return (x & 56 && o.push(G.bitArray.partial(x & 56, f, 1)), o);
    },
  }),
    (G.hash.sha1 = function (r) {
      r ? ((this.d = r.d.slice(0)), (this.b = r.b.slice(0)), (this.a = r.a)) : this.reset();
    }),
    (G.hash.sha1.hash = function (r) {
      return new G.hash.sha1().update(r).finalize();
    }),
    (G.hash.sha1.prototype = {
      blockSize: 512,
      reset: function () {
        return ((this.d = this.h.slice(0)), (this.b = []), (this.a = 0), this);
      },
      update: function (r) {
        typeof r == "string" && (r = G.codec.utf8String.toBits(r));
        let o;
        const x = (this.b = G.bitArray.concat(this.b, r));
        for (
          o = this.a,
            this.a = o + G.bitArray.bitLength(r),
            o = (this.blockSize + o) & -this.blockSize;
          o <= this.a;
          o += this.blockSize
        )
          Ee(this, x.splice(0, 16));
        return this;
      },
      finalize: function () {
        let r,
          o = this.b;
        const x = this.d;
        for (o = G.bitArray.concat(o, [G.bitArray.partial(1, 1)]), r = o.length + 2; r & 15; r++)
          o.push(0);
        for (o.push(Math.floor(this.a / 4294967296)), o.push(this.a | 0); o.length;)
          Ee(this, o.splice(0, 16));
        return (this.reset(), x);
      },
      h: [1732584193, 4023233417, 2562383102, 271733878, 3285377520],
      i: [1518500249, 1859775393, 2400959708, 3395469782],
    }));
  function Ee(r, o) {
    let x, e, f, d, y, l, v;
    const E = o.slice(0),
      a = r.d;
    ((x = a[0]), (e = a[1]), (f = a[2]), (d = a[3]), (y = a[4]));
    for (let B = 0; B <= 79; B++)
      (B >= 16 &&
        (E[B] =
          ((E[B - 3] ^ E[B - 8] ^ E[B - 14] ^ E[B - 16]) << 1) |
          ((E[B - 3] ^ E[B - 8] ^ E[B - 14] ^ E[B - 16]) >>> 31)),
        B <= 19
          ? (l = (e & f) | (~e & d))
          : B <= 39
            ? (l = e ^ f ^ d)
            : B <= 59
              ? (l = (e & f) | (e & d) | (f & d))
              : (l = e ^ f ^ d),
        (v = (((x << 5) | (x >>> 27)) + l + y + E[B] + r.i[Math.floor(B / 20)]) | 0),
        (y = d),
        (d = f),
        (f = (e << 30) | (e >>> 2)),
        (e = x),
        (x = v));
    ((a[0] = (a[0] + x) | 0),
      (a[1] = (a[1] + e) | 0),
      (a[2] = (a[2] + f) | 0),
      (a[3] = (a[3] + d) | 0),
      (a[4] = (a[4] + y) | 0));
  }
  ((G.misc.hmac = function (r, o) {
    this.f = o || G.hash.sha256;
    const x = [[], []],
      e = this.f.prototype.blockSize / 32;
    ((this.c = [new this.f(), new this.f()]), r.length > e && (r = this.f.hash(r)));
    for (let f = 0; f < e; f++) ((x[0][f] = r[f] ^ 909522486), (x[1][f] = r[f] ^ 1549556828));
    (this.c[0].update(x[0]), this.c[1].update(x[1]));
  }),
    (G.misc.hmac.prototype.encrypt = G.misc.hmac.prototype.mac =
      function (r) {
        const o = new this.f(this.c[0]).update(r).finalize();
        return new this.f(this.c[1]).update(o).finalize();
      }),
    typeof module < "u" && module.exports && (module.exports = G));
  const m0 = 3e4;
  function d9(r, o) {
    const x = G.codec.base32.toBits(r),
      e = [(o & 0xffffffff00000000) >> 32, o & 4294967295],
      f = 6,
      y = new G.misc.hmac(x, G.hash.sha1).encrypt(e),
      v = (G.bitArray.extract(y, 152, 8) & 15) * 8,
      E = v + 4 * 8;
    let c = ((G.bitArray.bitSlice(y, v, E)[0] & 2147483647) % Math.pow(10, f)).toString();
    for (; c.length < f;) c = "0" + c;
    return c;
  }
  function f9(r, o, x = m0) {
    const e = Math.floor(o / x);
    return d9(r, e);
  }
  function ae(r, o = m0) {
    const x = o - (r % o);
    return x === o ? Math.floor(o / 1e3) : Math.max(1, Math.ceil(x / 1e3));
  }
  function ne(r, o = m0) {
    return Math.floor(r / o);
  }
  const se = "zf-two-step-panel-host";
  function u9(r = {}) {
    let o = null,
      x = null,
      e = null,
      f = null,
      d = null;
    function y() {
      return r.mountDocument || document;
    }
    function l() {
      const C = y();
      if (o && C.contains(o)) return;
      const n = C.getElementById(se);
      (n && n.remove(),
        (o = C.createElement("div")),
        (o.id = se),
        (o.style.cssText = [
          "position: fixed",
          "z-index: 2147483646",
          "left: 16px",
          "top: 72px",
          "width: min(320px, calc(100vw - 24px))",
          "max-width: 320px",
          'font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif',
        ].join(";")),
        (x = o.attachShadow({ mode: "open" })),
        (x.innerHTML = `
      <style>
        :host { all: initial; }
        * { box-sizing: border-box; }
        .panel {
          background: #fff;
          border-radius: 8px;
          box-shadow: 0 8px 28px rgba(0, 0, 0, 0.18);
          border: 1px solid #e8e8e8;
          overflow: hidden;
          color: #222;
          font-size: 14px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          border-bottom: 1px solid #eee;
        }
        .title {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .close {
          width: 28px;
          height: 28px;
          border: none;
          background: transparent;
          cursor: pointer;
          color: #999;
          font-size: 20px;
          line-height: 1;
          border-radius: 4px;
          padding: 0;
        }
        .close:active { background: #f5f5f5; color: #666; }
        .body { padding: 16px; }
        .status {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 14px;
        }
        .status-icon {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: #22c55e;
          color: #fff;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
        }
        .status-icon.warn { background: #f59e0b; }
        .status-text {
          font-size: 15px;
          font-weight: 600;
          color: #1a1a1a;
        }
        .account-label {
          color: #333;
          margin-bottom: 4px;
        }
        .account-value {
          color: #1677ff;
          word-break: break-all;
          font-size: 14px;
          margin-bottom: 6px;
        }
        .account-hint {
          color: #666;
          font-size: 13px;
          margin-bottom: 16px;
        }
        .footer {
          display: flex;
          flex-direction: column;
          gap: 10px;
          min-height: 22px;
        }
        .countdown-row {
          color: #333;
          font-size: 13px;
        }
        .countdown-row[hidden],
        .refresh[hidden] {
          display: none !important;
        }
        .countdown-num {
          color: #1677ff;
          font-weight: 600;
        }
        .refresh {
          border: none;
          background: none;
          padding: 0;
          margin: 0;
          color: #1677ff;
          font-size: 14px;
          cursor: pointer;
          text-align: left;
          width: fit-content;
        }
        .refresh:active { opacity: 0.7; }
        .refresh:disabled {
          opacity: 0.5;
          cursor: default;
        }
      </style>
      <div class="panel" part="panel">
        <div class="header">
          <div class="title">${Be(r.title || "验证码服务")}</div>
          <button class="close" type="button" aria-label="关闭">×</button>
        </div>
        <div class="body">
          <div class="status">
            <span class="status-icon" data-role="status-icon">✓</span>
            <span class="status-text" data-role="status-text">验证码获取成功</span>
          </div>
          <div class="account-label">当前获取验证码的账号</div>
          <div class="account-value" data-role="account">${Be(r.account || "-")}</div>
          <div class="account-hint">请核对是否与当前平台登录账号一致</div>
          <div class="footer">
            <div class="countdown-row" data-role="countdown-row" hidden>
              当前验证码有效期：<span class="countdown-num" data-role="countdown">--s</span>
            </div>
            <button class="refresh" type="button" data-role="refresh">重新获取验证码</button>
          </div>
        </div>
      </div>
    `));
      const t = x.querySelector(".close"),
        A = x.querySelector('[data-role="refresh"]');
      (t.addEventListener("click", () => {
        var F;
        ((F = r.onClose) == null || F.call(r), v());
      }),
        A.addEventListener("click", () => {
          var F;
          A.disabled ||
            Promise.resolve((F = r.onRefresh) == null ? void 0 : F.call(r)).catch((u) => {
              console.warn("[ZfTwoStep] refresh error", u);
            });
        }),
        (d = {
          statusText: x.querySelector('[data-role="status-text"]'),
          statusIcon: x.querySelector('[data-role="status-icon"]'),
          account: x.querySelector('[data-role="account"]'),
          countdown: x.querySelector('[data-role="countdown"]'),
          countdownRow: x.querySelector('[data-role="countdown-row"]'),
          refreshBtn: A,
        }),
        B(),
        y().documentElement.appendChild(o));
    }
    function v() {
      (f == null || f(),
        (f = null),
        (e = null),
        o && (o.remove(), (o = null), (x = null), (d = null)));
    }
    function E(C) {
      d && (d.countdown.textContent = `${Math.max(0, Math.floor(C))}s`);
    }
    function a(C) {
      d && (E(C), (d.countdownRow.hidden = !1), (d.refreshBtn.hidden = !0));
    }
    function B() {
      d && ((d.countdownRow.hidden = !0), (d.refreshBtn.hidden = !1), (d.refreshBtn.disabled = !1));
    }
    function s() {
      D("验证码获取成功", !0);
    }
    function D(C, n = !0) {
      d &&
        ((d.statusText.textContent = C),
        n
          ? (d.statusIcon.classList.remove("warn"), (d.statusIcon.textContent = "✓"))
          : (d.statusIcon.classList.add("warn"), (d.statusIcon.textContent = "!")));
    }
    function c(C) {
      d && (d.account.textContent = C || "-");
    }
    function h() {
      if (!o || !e || !e.isConnected) return;
      const C = y().defaultView || window,
        n = ce(e, C),
        t = ce(h9(e), C),
        A = 12,
        F = 8,
        u = C.innerWidth,
        k = C.innerHeight,
        g = Math.min(o.offsetWidth || 320, u - F * 2),
        p = o.offsetHeight || 240,
        m = t.left - g - A,
        b = t.right + A,
        S = m >= F,
        z = b + g <= u - F;
      let M;
      S ? (M = m) : z ? (M = b) : t.left >= u - t.right ? (M = F) : (M = Math.max(F, u - g - F));
      let R = n.top + n.height / 2 - p / 2;
      (R + p > k - F && (R = k - p - F),
        R < F && (R = F),
        (o.style.left = `${Math.round(M)}px`),
        (o.style.top = `${Math.round(R)}px`),
        (o.style.transform = "none"));
    }
    function i() {
      var A;
      f == null || f();
      const C = y().defaultView || window,
        n = () => h();
      (C.addEventListener("resize", n), C.addEventListener("scroll", n, !0));
      const t = (A = e == null ? void 0 : e.ownerDocument) == null ? void 0 : A.defaultView;
      (t && t !== C && (t.addEventListener("scroll", n, !0), t.addEventListener("resize", n)),
        (f = () => {
          (C.removeEventListener("resize", n),
            C.removeEventListener("scroll", n, !0),
            t &&
              t !== C &&
              (t.removeEventListener("scroll", n, !0), t.removeEventListener("resize", n)));
        }));
    }
    function w(C) {
      ((e = C), h(), i(), requestAnimationFrame(h));
    }
    return {
      mount: l,
      unmount: v,
      setCountdown: E,
      showCountdown: a,
      showRefresh: B,
      setSuccess: s,
      setStatus: D,
      setAccount: c,
      anchorNear: w,
    };
  }
  function Be(r) {
    return String(r)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function h9(r) {
    var e;
    let o = r.parentElement,
      x = r;
    for (; o && o !== o.ownerDocument.documentElement;) {
      const f = o.getBoundingClientRect(),
        d = (e = o.ownerDocument.defaultView) == null ? void 0 : e.getComputedStyle(o),
        y = f.width,
        l = f.height;
      if (
        y >= 280 &&
        y <= 560 &&
        l >= 160 &&
        l <= 900 &&
        (d == null ? void 0 : d.display) !== "none" &&
        (d == null ? void 0 : d.visibility) !== "hidden"
      ) {
        x = o;
        break;
      }
      o = o.parentElement;
    }
    return x;
  }
  function ce(r, o) {
    const x = r.getBoundingClientRect();
    let e = x.left,
      f = x.top,
      d = r.ownerDocument.defaultView;
    for (; d && d !== o;) {
      const y = d.frameElement;
      if (!y) break;
      const l = y.getBoundingClientRect();
      ((e += l.left), (f += l.top), (d = y.ownerDocument.defaultView));
    }
    return {
      left: e,
      top: f,
      right: e + x.width,
      bottom: f + x.height,
      width: x.width,
      height: x.height,
    };
  }
  function v9() {
    let r = null,
      o = null,
      x = null,
      e = null,
      f = 0,
      d = !1,
      y = -1,
      l = null,
      v = !1;
    function E() {
      return (r == null ? void 0 : r.periodMs) ?? m0;
    }
    function a() {
      (x && (clearInterval(x), (x = null)), e && (clearTimeout(e), (e = null)));
    }
    function B() {
      (x && (clearInterval(x), (x = null)), (y = -1), l == null || l.showRefresh());
    }
    async function s() {
      if (!r) return Date.now();
      if (r.getServerTime && !d) {
        try {
          const g = Number(await r.getServerTime());
          !Number.isNaN(g) && g > 0 && (f = g - Date.now());
        } catch (g) {
          console.warn("[ZfTwoStep] getServerTime error", g);
        }
        d = !0;
      }
      return Date.now() + f;
    }
    function D(g) {
      const p = location.href;
      return p.indexOf(g.domain) > -1 && p.indexOf(g.path) > -1;
    }
    function c() {
      var g;
      if (!((g = r == null ? void 0 : r.pages) != null && g.length)) return null;
      for (const p of r.pages) if (D(p)) return p;
      return null;
    }
    async function h(g, p, m) {
      const b = document.querySelectorAll(g);
      if (b.length) {
        if (b.length === 1) {
          (te(b[0], p), oe(b[0], p));
          return;
        }
        b.length >= 2 &&
          b.length <= 6 &&
          (m.isCheckFirstFocus && (await l9(b)),
          b.forEach((S, z) => {
            const M = p[z] ?? "";
            (te(S, M), oe(S, M));
          }));
      }
    }
    async function i() {
      if (!(r != null && r.secret)) throw new Error("[ZfTwoStep] secret 未配置，请先调用 init");
      const g = await s();
      return f9(r.secret, g, E());
    }
    async function w(g = "initial") {
      if (!(r != null && r.secret)) {
        console.warn("[ZfTwoStep] secret 为空，跳过填充");
        return;
      }
      const p = o || c();
      if (!p) {
        console.warn("[ZfTwoStep] 当前页面未匹配任何 pages 规则");
        return;
      }
      if (!v) {
        ((v = !0), (o = p));
        try {
          g === "refresh" && (l == null || l.setStatus("正在重新获取…", !1));
          const m = await i();
          (console.log("[ZfTwoStep] 正在填充二步验证码", {
            domain: p.domain,
            path: p.path,
            selector: p.selector,
            mode: g,
          }),
            await h(p.selector, m, p),
            l == null || l.setSuccess(),
            g === "refresh" ? await C() : B());
        } catch (m) {
          (console.warn("[ZfTwoStep] fillOnce error", m),
            l == null || l.setStatus("验证码获取失败", !1),
            B());
        } finally {
          v = !1;
        }
      }
    }
    async function C() {
      if (!l) return;
      x && (clearInterval(x), (x = null));
      const g = E(),
        p = await s();
      y = ne(p, g);
      const m = ae(p, g);
      (l.showCountdown(m),
        (x = setInterval(() => {
          n().catch((b) => console.warn("[ZfTwoStep] countdown tick error", b));
        }, 1e3)));
    }
    async function n() {
      if (y < 0 || !l) return;
      const g = E(),
        p = await s();
      if (ne(p, g) !== y) {
        (B(), await w("expire"));
        return;
      }
      const b = ae(p, g);
      l.showCountdown(b);
    }
    function t() {
      (r == null ? void 0 : r.showPanel) !== !1 &&
        (l == null || l.unmount(),
        (l = u9({
          title: (r == null ? void 0 : r.title) || "验证码服务",
          account: (r == null ? void 0 : r.account) || "",
          mountDocument: r == null ? void 0 : r.mountDocument,
          onClose: () => {
            (B(), (l = null));
          },
          onRefresh: async () => {
            await w("refresh");
          },
        })),
        l.mount(),
        r != null && r.account && l.setAccount(r.account),
        l.showRefresh());
    }
    function A() {
      (a(), (y = -1), t());
      const g = (r == null ? void 0 : r.firstFillDelayMs) ?? 100;
      e = setTimeout(() => {
        w("initial").catch((p) => console.warn("[ZfTwoStep] initial fill error", p));
      }, g);
    }
    function F(g) {
      ((o = g),
        console.log("[ZfTwoStep] 命中二步验证页，等待输入框", g),
        re(
          () => document.querySelector(g.selector),
          (p) => {
            (A(), l == null || l.anchorNear(p));
          },
        ));
    }
    function u(g) {
      var b;
      if ((k(), !(g != null && g.secret))) {
        console.error("[ZfTwoStep] init 失败：secret 必传");
        return;
      }
      if (!((b = g == null ? void 0 : g.pages) != null && b.length)) {
        console.error("[ZfTwoStep] init 失败：pages 不能为空");
        return;
      }
      if (
        ((r = g),
        typeof g.serverTimeMs == "number" ? (f = g.serverTimeMs - Date.now()) : (f = 0),
        !(g.autoStart !== !1))
      ) {
        console.log("[ZfTwoStep] 已初始化（autoStart=false，需手动 fillOnce）");
        return;
      }
      const m = c();
      if (!m) {
        console.log("[ZfTwoStep] 当前 URL 未匹配 pages，已就绪等待手动 fillOnce", {
          href: location.href,
        });
        return;
      }
      F(m);
    }
    function k() {
      (a(),
        (y = -1),
        l == null || l.unmount(),
        (l = null),
        (r = null),
        (o = null),
        (f = 0),
        (v = !1),
        (d = !1));
    }
    return { init: u, destroy: k, generateCode: i, fillOnce: () => w("refresh") };
  }
  console.log("=====two step verification======");
  const p9 = v9();
  ({
    checkConfigs: {},
    isSettingTwoStep: !1,
    hasSetTwoStepSecret: !1,
    pendingSetTwoStepKey: "zf_pending_set_two_step_secret",
    account: "",
    init() {
      this.getTwoStepVerificationInfo().then((r) => {
        (console.log("=====getTwoStepVerificationInfo", r),
          r &&
            ((this.twoStepUrls = r.twoStepUrls),
            (this.setTwoStepUrls = r.setTwoStepUrls),
            (this.platform = r.name),
            (this.account = r.account || "")),
          this.twoStepUrls &&
            this.twoStepUrls.length &&
            this.checkTwoStepVerificationPage(this.twoStepUrls),
          this.setTwoStepUrls &&
            this.setTwoStepUrls.length &&
            (this.handlePendingSetTwoStepAfterReload() ||
              this.checkSetTwoStepVerificationPage(this.setTwoStepUrls)));
      });
    },
    getTwoStepVerificationInfo: () =>
      new Promise((r) => {
        chrome.runtime.sendMessage({ type: "get_two_step_verification_info" }, {}, (o) => {
          o && r(o);
        });
      }),
    checkTwoStepVerificationPage(r) {
      r.forEach((o) => {
        location.href.indexOf(o.domain) > -1 &&
          location.href.indexOf(o.path) > -1 &&
          this.loadTwoStepVerification(o);
      });
    },
    checkSetTwoStepVerificationPage(r) {
      r.forEach((o) => {
        location.href.indexOf(o.domain) > -1 &&
          location.href.indexOf(o.path) > -1 &&
          this.loadSetTwoStepVerification(o);
      });
    },
    loadTwoStepVerification(r) {
      this.getSecret(r);
    },
    loadSetTwoStepVerification(r) {
      this.isSettingTwoStep ||
        ((this.hasSetTwoStepSecret = !1),
        (this.isSettingTwoStep = !0),
        this.waitSetTwoStepQrCode(r));
    },
    waitSetTwoStepQrCode(r, o = 600) {
      const x = document.querySelector(r.twoStepImg);
      if (!(!!x && !!(x.currentSrc || x.src) && x.complete && x.naturalWidth > 0)) {
        if (o <= 0) {
          const d = this.getSecretFromTextElement(r.twoStepText);
          if (d) {
            this.handleSetTwoStepSecret(r, d, "wait_img_timeout_text");
            return;
          }
          (console.log("=====等待二步验证二维码图片超时", {
            selector: r.twoStepImg,
            hasImg: !!x,
            complete: x == null ? void 0 : x.complete,
            naturalWidth: x == null ? void 0 : x.naturalWidth,
            offsetWidth: x == null ? void 0 : x.offsetWidth,
            src: (x == null ? void 0 : x.currentSrc) || (x == null ? void 0 : x.src),
          }),
            this.resetSetTwoStepState());
          return;
        }
        setTimeout(() => this.waitSetTwoStepQrCode(r, o - 1), 1e3);
        return;
      }
      const f = x.currentSrc || x.src;
      this.decodeQrCode(x)
        .then((d) => {
          const y = this.getSecretFromQrText(d);
          if (!y) {
            if ((console.log("=====未从二步验证二维码中获取到secret", d), o <= 0)) {
              this.finishWaitQrWithFallback(r, "no_secret_from_qr");
              return;
            }
            setTimeout(() => this.waitSetTwoStepQrCode(r, o - 1), 500);
            return;
          }
          this.handleSetTwoStepSecret(r, y, "qr_img", d);
        })
        .catch((d) => {
          if (
            (console.log("=====解析二步验证二维码失败，继续等待", { error: d, src: f, remain: o }),
            o <= 0)
          ) {
            this.finishWaitQrWithFallback(r, "decode_qr_timeout");
            return;
          }
          setTimeout(() => this.waitSetTwoStepQrCode(r, o - 1), 500);
        });
    },
    finishWaitQrWithFallback(r, o = "") {
      const x = this.getSecretFromTextElement(r.twoStepText);
      if (x) {
        this.handleSetTwoStepSecret(r, x, o || "text_fallback");
        return;
      }
      (console.log("=====解析二步验证二维码失败且无文本secret", o), this.resetSetTwoStepState());
    },
    handleSetTwoStepSecret(r, o = "", x = "", e = "") {
      ((this.hasSetTwoStepSecret = !0),
        console.log("=====已获取二步验证secret，准备展示确认弹窗", {
          from: x,
          selector: r.selector,
          hasInput: !!document.querySelector(r.selector),
        }),
        this.showSetTwoStepConfirm(r, o, e));
    },
    resetSetTwoStepState() {
      ((this.isSettingTwoStep = !1), (this.hasSetTwoStepSecret = !1));
    },
    async decodeQrCode(r) {
      const o = r.currentSrc || r.src;
      let x = r;
      o.startsWith("data:image")
        ? (x = await this.loadImageFromSrc(o))
        : await this.waitImageLoaded(r);
      const e = document.createElement("canvas"),
        f = e.getContext("2d", { willReadFrequently: !0 });
      if (!f) throw new Error("无法创建二维码解析画布");
      const d = x.naturalWidth,
        y = x.naturalHeight;
      if (!d || !y) throw new Error("二维码图片尺寸无效");
      ((e.width = d), (e.height = y), f.drawImage(x, 0, 0, d, y));
      const l = f.getImageData(0, 0, d, y),
        v = ge(l.data, l.width, l.height, { inversionAttempts: "attemptBoth" });
      if (
        (console.log("=====获取到二步验证二维码code", (v == null ? void 0 : v.data) || v),
        !(v != null && v.data))
      )
        throw new Error("未识别到二维码内容");
      return v.data;
    },
    loadImageFromSrc(r) {
      return new Promise((o, x) => {
        const e = new Image();
        ((e.onload = () => o(e)),
          (e.onerror = () => x(new Error("二维码图片加载失败"))),
          (e.src = r));
      });
    },
    waitImageLoaded(r) {
      return new Promise((o, x) => {
        if (r.complete && r.naturalWidth) {
          o();
          return;
        }
        (r.addEventListener("load", () => o(), { once: !0 }),
          r.addEventListener("error", () => x(new Error("二维码图片加载失败")), { once: !0 }));
      });
    },
    getSecretFromQrText(r = "") {
      try {
        return (new URL(r).searchParams.get("secret") || "").replace(/\s/g, "").toUpperCase();
      } catch {
        const x = r.match(/[?&]secret=([^&]+)/i);
        return x ? decodeURIComponent(x[1]).replace(/\s/g, "").toUpperCase() : "";
      }
    },
    getSecretFromTextElement(r = "") {
      var x;
      if (!r) return "";
      const o = ((x = document.querySelector(r)) == null ? void 0 : x.textContent) || "";
      return this.getSecretFromRawText(o);
    },
    getSecretFromRawText(r = "") {
      const o = String(r || "").trim();
      if (!o) return "";
      const x = this.getSecretFromQrText(o);
      if (x) return x;
      const e = o.match(/secret\s*[:：=]\s*([A-Z2-7 ]{16,})/i),
        f = o.match(/\b([A-Z2-7]{16,})\b/i),
        d = ((e == null ? void 0 : e[1]) || (f == null ? void 0 : f[1]) || "")
          .replace(/\s/g, "")
          .toUpperCase();
      return /^[A-Z2-7]{16,}$/.test(d) ? d : "";
    },
    getTwoStepModalDocument() {
      try {
        if (window.parent && window.parent !== window && window.parent.document)
          return window.parent.document;
      } catch (r) {
        console.log("=====无法访问父页面document，弹窗挂载到当前document", r);
      }
      return document;
    },
    showSetTwoStepConfirm(r, o = "", x = "") {
      var v, E, a;
      const e = `zf_two_step_setup_skip_until_${location.host}`,
        f = Number(localStorage.getItem(e) || 0),
        d = () => {
          ((this.checkConfigs = Object.assign({}, r)),
            this.savePendingSetTwoStep(r, o, x),
            this.startFillSdk(o, r),
            this.observeSetTwoStepSuccess(r, o, x));
        };
      if (f > Date.now()) {
        d();
        return;
      }
      (this.removeTwoStepModal(), this.ensureTwoStepModalStyle());
      const y = this.getTwoStepModalDocument(),
        l = y.createElement("div");
      ((l.className = "zf-two-step-mask"),
        (l.id = "zf-two-step-modal"),
        (l.innerHTML = `
      <div class="zf-two-step-dialog">
        <div class="zf-two-step-title"><span class="zf-two-step-icon">!</span><span>SuperPower 验证码辅助</span></div>
        <div class="zf-two-step-text">
          <div>确认开启后，您将享受以下服务：</div>
          <div>1. 系统将为您自动填充一次性密码</div>
          <div>2. 验证成功后，自动为该账号配置自动二步验证</div>
        </div>
        <div class="zf-two-step-footer">
          <label class="zf-two-step-check"><input type="checkbox" id="zf-two-step-skip" />两周内不再提示</label>
          <div class="zf-two-step-actions">
            <button class="zf-two-step-btn zf-two-step-btn-link" id="zf-two-step-save-qr">保存二维码</button>
            <button class="zf-two-step-btn" id="zf-two-step-cancel">取消</button>
            <button class="zf-two-step-btn zf-two-step-btn-primary" id="zf-two-step-confirm">确认</button>
          </div>
        </div>
      </div>
    `),
        y.documentElement.appendChild(l),
        (v = y.getElementById("zf-two-step-cancel")) == null ||
          v.addEventListener("click", () => {
            (this.removeTwoStepModal(), this.resetSetTwoStepState());
          }),
        (E = y.getElementById("zf-two-step-save-qr")) == null ||
          E.addEventListener("click", () => {
            this.downloadSetTwoStepQrCode(r);
          }),
        (a = y.getElementById("zf-two-step-confirm")) == null ||
          a.addEventListener("click", () => {
            var s;
            if (
              (((s = y.getElementById("zf-two-step-skip")) == null ? void 0 : s.checked) &&
                localStorage.setItem(e, String(Date.now() + 14 * 24 * 60 * 60 * 1e3)),
              !document.querySelector(r.selector))
            ) {
              (console.log("=====未获取到二步验证验证码输入框", r.selector),
                this.showNoTwoStepInputModal(o, x));
              return;
            }
            (this.removeTwoStepModal(), d());
          }));
    },
    async downloadSetTwoStepQrCode(r) {
      var o;
      try {
        const x = document.querySelector(r.twoStepImg);
        if (!x) throw new Error("未找到二步验证二维码");
        await this.waitImageLoaded(x);
        const e = x.currentSrc || x.src,
          f = e.startsWith("data:image") ? await this.loadImageFromSrc(e) : x,
          d = f.naturalWidth,
          y = f.naturalHeight;
        if (!d || !y) throw new Error("二维码图片尺寸无效");
        const l = document.createElement("canvas");
        ((l.width = d), (l.height = y));
        const v = l.getContext("2d");
        if (!v) throw new Error("无法创建二维码保存画布");
        v.drawImage(f, 0, 0, d, y);
        const E = await new Promise((c, h) => {
            l.toBlob((i) => {
              i ? c(i) : h(new Error("二维码图片生成失败"));
            }, "image/png");
          }),
          a = this.getTwoStepModalDocument(),
          B = a.createElement("a"),
          s = String(this.account || "").replace(/[\\/:*?"<>|]/g, "_"),
          D = URL.createObjectURL(E);
        ((B.href = D),
          (B.download = `二步验证二维码${s ? `-${s}` : ""}.png`),
          (B.style.display = "none"),
          a.documentElement.appendChild(B),
          B.click(),
          B.remove(),
          setTimeout(() => URL.revokeObjectURL(D), 1e3));
      } catch (x) {
        (console.log("=====保存二步验证二维码失败", x),
          (o = this.getTwoStepModalDocument().defaultView) == null ||
            o.alert("保存二维码失败，请稍后重试"));
      }
    },
    showNoTwoStepInputModal(r = "", o = "") {
      var f, d;
      (this.removeNoTwoStepInputModal(), this.ensureTwoStepModalStyle());
      const x = this.getTwoStepModalDocument(),
        e = x.createElement("div");
      ((e.className = "zf-two-step-mask"),
        (e.id = "zf-two-step-no-input-modal"),
        (e.innerHTML = `
      <div class="zf-two-step-dialog">
        <div class="zf-two-step-title"><span class="zf-two-step-icon">!</span><span>未获取到二步验证验证码输入框</span></div>
        <div class="zf-two-step-text">
          <div>当前页面未找到验证码输入框，无法自动填充验证码。</div>
          <div>如果您已手动完成验证，可以直接上报二步验证信息。</div>
        </div>
        <div class="zf-two-step-footer" style="justify-content:flex-end;">
          <div class="zf-two-step-actions">
            <button class="zf-two-step-btn" id="zf-two-step-close">关闭</button>
            <button class="zf-two-step-btn zf-two-step-btn-primary" id="zf-two-step-direct-report">直接上报二步验证信息</button>
          </div>
        </div>
      </div>
    `),
        x.documentElement.appendChild(e),
        (f = x.getElementById("zf-two-step-close")) == null ||
          f.addEventListener("click", () => {
            (this.removeNoTwoStepInputModal(), this.resetSetTwoStepState());
          }),
        (d = x.getElementById("zf-two-step-direct-report")) == null ||
          d.addEventListener("click", () => {
            (this.clearPendingSetTwoStep(),
              this.reportSetTwoStepAuthenticationCode(r, o),
              this.removeNoTwoStepInputModal(),
              this.showSetTwoStepSuccess());
          }));
    },
    savePendingSetTwoStep(r, o = "", x = "") {
      const e = {
        secret: o,
        qrCode: x,
        page: { domain: r.domain, path: r.path, selector: r.selector },
        createdAt: Date.now(),
      };
      try {
        sessionStorage.setItem(this.pendingSetTwoStepKey, JSON.stringify(e));
      } catch {}
    },
    getPendingSetTwoStep() {
      try {
        const r = sessionStorage.getItem(this.pendingSetTwoStepKey);
        return r ? JSON.parse(r) : null;
      } catch (r) {
        return (
          console.log("=====读取待上报二步验证信息失败", r),
          this.clearPendingSetTwoStep(),
          null
        );
      }
    },
    clearPendingSetTwoStep() {
      try {
        sessionStorage.removeItem(this.pendingSetTwoStepKey);
      } catch (r) {
        console.log("=====清理待上报二步验证信息失败", r);
      }
    },
    handlePendingSetTwoStepAfterReload() {
      const r = this.getPendingSetTwoStep();
      if (!(r != null && r.secret) || !(r != null && r.page)) return !1;
      if (Date.now() - Number(r.createdAt || 0) > 10 * 60 * 1e3)
        return (
          console.log("=====待上报二步验证信息已过期，清理", r),
          this.clearPendingSetTwoStep(),
          !1
        );
      const x = r.page,
        e = location.href.indexOf(x.domain) > -1,
        f = e && location.href.indexOf(x.path) > -1;
      return (
        console.log("=====检测到重载后的待上报二步验证信息", {
          href: location.href,
          isSameDomain: e,
          isSetupPage: f,
          hasSecret: !!r.secret,
        }),
        (this.hasSetTwoStepSecret = !0),
        f
          ? (Cx(
              () => document.querySelector(x.selector),
              () => this.observeSetTwoStepSuccess(x, r.secret, r.qrCode),
              1e3,
              10,
            ),
            !0)
          : e
            ? (console.log("=====重载后已离开二步验证设置页，准备上报"),
              this.clearPendingSetTwoStep(),
              this.showSetTwoStepSuccess(),
              this.reportSetTwoStepAuthenticationCode(r.secret, r.qrCode),
              !0)
            : !1
      );
    },
    ensureTwoStepModalStyle() {
      const r = this.getTwoStepModalDocument();
      if (r.getElementById("zf-two-step-modal-style")) return;
      const o = r.createElement("style");
      ((o.id = "zf-two-step-modal-style"),
        (o.textContent = `
      .zf-two-step-mask{position:fixed;left:0;top:0;z-index:2147483647;font-family:Arial,"Microsoft YaHei",sans-serif;color:#333;pointer-events:none;}
      .zf-two-step-dialog{position:fixed;left:50px;top:38%;transform:translateY(-50%);width:460px;background:#fff;border:1px solid #eee;box-shadow:0 4px 22px rgba(0,0,0,.16);padding:24px 24px 22px;border-radius:2px;pointer-events:auto;}
      .zf-two-step-title{display:flex;align-items:center;gap:10px;font-size:18px;font-weight:600;margin-bottom:18px;}
      .zf-two-step-icon{width:18px;height:18px;border-radius:50%;border:1px solid #d6b65c;color:#d6b65c;font-size:13px;line-height:18px;text-align:center;}
      .zf-two-step-text{font-size:14px;line-height:1.8;margin-bottom:26px;}
      .zf-two-step-footer{display:flex;align-items:center;justify-content:space-between;}
      .zf-two-step-check{font-size:14px;color:#777;display:flex;align-items:center;gap:8px;}
      .zf-two-step-check #zf-two-step-skip{bottom:0;}
      .zf-two-step-actions{display:flex;gap:10px;}
      .zf-two-step-btn{min-width:72px;height:34px;border:1px solid #d9d9d9;background:#fff;color:#333;cursor:pointer;border-radius:2px;font-size:14px;padding:2px 12px;}
      .zf-two-step-btn-link{min-width:auto;border-color:transparent;background:transparent;color:#3b82f6;padding-left:0;padding-right:0;}
      .zf-two-step-btn-primary{background:#3b53cf;border-color:#3b53cf;color:#fff;}
      .zf-two-step-success{left:70px;top:100px;transform:none;width:460px;}
      .zf-two-step-success .zf-two-step-title{color:#333;font-size:20px;}
      .zf-two-step-success .zf-two-step-icon{border-color:#20b486;color:#20b486;}
      .zf-two-step-success .zf-two-step-text{padding-left:30px;}
    `),
        r.documentElement.appendChild(o));
    },
    observeSetTwoStepSuccess(r, o = "", x = "") {
      let e = 300;
      const f = setInterval(() => {
        const d = location.href.indexOf(r.domain) > -1 && location.href.indexOf(r.path) > -1,
          y = document.querySelector(r.selector);
        ((!d || !y) &&
          (clearInterval(f),
          this.clearPendingSetTwoStep(),
          this.showSetTwoStepSuccess(),
          this.reportSetTwoStepAuthenticationCode(o, x)),
          e--,
          e <= 0 && clearInterval(f));
      }, 1e3);
    },
    showSetTwoStepSuccess() {
      var x;
      (this.resetSetTwoStepState(), this.removeTwoStepModal(), this.ensureTwoStepModalStyle());
      const r = this.getTwoStepModalDocument(),
        o = r.createElement("div");
      ((o.className = "zf-two-step-mask"),
        (o.id = "zf-two-step-modal"),
        (o.innerHTML = `
      <div class="zf-two-step-dialog zf-two-step-success">
        <div class="zf-two-step-title"><span class="zf-two-step-icon">✓</span><span>二步验证配置成功</span></div>
        <div class="zf-two-step-text">已为您成功配置自动填充二步验证！<span style="color: #3b53cf">可以在店铺列表中，编辑店铺里面查看自动二步验证．</span></div>
        <div class="zf-two-step-footer" style="justify-content:flex-end;">
          <div class="zf-two-step-actions">
            <button class="zf-two-step-btn" id="zf-two-step-ok">知道了</button>
          </div>
        </div>
      </div>
    `),
        r.documentElement.appendChild(o),
        (x = r.getElementById("zf-two-step-ok")) == null ||
          x.addEventListener("click", () => this.removeTwoStepModal()));
    },
    openMmsSetup() {
      chrome.runtime.sendMessage({ type: "getInitData" }, {}, (r) => {
        const o = (r == null ? void 0 : r.sysMallId) || "",
          x = {
            type: "OPEN_MMS_SETUP",
            path: `/mall/mallManage?type=editMall&mallid=${encodeURIComponent(String(o))}`,
          };
        chrome.runtime.sendMessage(x, {}, (e) => {
          console.log("=====OPEN_MMS_SETUP", e);
        });
      });
    },
    removeTwoStepModal() {
      var r;
      (r = this.getTwoStepModalDocument().getElementById("zf-two-step-modal")) == null ||
        r.remove();
    },
    removeNoTwoStepInputModal() {
      var r;
      (r = this.getTwoStepModalDocument().getElementById("zf-two-step-no-input-modal")) == null ||
        r.remove();
    },
    reportSetTwoStepAuthenticationCode(r = "", o = "") {
      (console.log("=====开始上报二步验证信息", { hasSecret: !!r, hasQrCode: !!o }),
        chrome.runtime.sendMessage(
          { type: "setTwoStepAuthenticationCode", code: r, qr_code: o, is_verify: 1 },
          {},
          (x) => {
            const e = chrome.runtime.lastError;
            if (e) {
              console.log("=====setTwoStepAuthenticationCode lastError", e.message);
              return;
            }
            console.log("=====setTwoStepAuthenticationCode", x);
          },
        ));
    },
    async getServerTimeMs() {
      var r;
      try {
        const o = await D9.getTime();
        if ((o == null ? void 0 : o.errorCode) === 0 && (r = o.data) != null && r.time)
          return Number(o.data.time) * 1e3;
      } catch (o) {
        console.log("getServerTime error", o);
      }
      return Date.now();
    },
    startFillSdk(r = "", o = {}) {
      p9.init({
        secret: r,
        getServerTime: () => this.getServerTimeMs(),
        account: this.account || "",
        title: "SuperPower 验证码辅助",
        pages: [
          {
            domain: o.domain || "",
            path: o.path || "",
            selector: o.selector || "",
            isCheckFirstFocus: !!o.isCheckFirstFocus,
          },
        ],
        mountDocument: this.getTwoStepModalDocument(),
      });
    },
    getSecret({ domain: r = "", path: o = "", selector: x = "", isCheckFirstFocus: e = !1 }) {
      (console.log("=====进入getSecret"),
        chrome.runtime.sendMessage({ type: "getTwoStepSecret" }, {}, (f) => {
          const d = f || "";
          if (!d) {
            console.log(this.platform + " secret为空");
            return;
          }
          Cx(
            () => document.querySelector(x),
            () => {
              if (this.hasSetTwoStepSecret) {
                console.log("=====在设置新二步验证secret，跳过原二步验证码填充");
                return;
              }
              (console.log("=====正在设置二步验证码"),
                (this.checkConfigs = Object.assign(
                  {},
                  { domain: r, path: o, selector: x, isCheckFirstFocus: e },
                )),
                d &&
                  this.startFillSdk(d, { domain: r, path: o, selector: x, isCheckFirstFocus: e }));
            },
          );
        }));
    },
  }).init();
  function Cx(r, o, x = 500, e = 200) {
    if ((!e && e !== 0 && (e = 200), e > 0)) {
      const f = r();
      f
        ? o(f)
        : setTimeout(function () {
            Cx(r, o, x, --e);
          }, x || 500);
    }
  }
})();
