import { A as adapters } from "./chart-BRux0Abr.js";
import { n as __commonJSMin, r as __toESM, t as require_dayjs_min } from "./dayjs.js";
//#region node_modules/.deno/dayjs@1.11.20/node_modules/dayjs/plugin/customParseFormat.js
var require_customParseFormat = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(e, t) {
		"object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).dayjs_plugin_customParseFormat = t();
	})(exports, (function() {
		"use strict";
		var e = {
			LTS: "h:mm:ss A",
			LT: "h:mm A",
			L: "MM/DD/YYYY",
			LL: "MMMM D, YYYY",
			LLL: "MMMM D, YYYY h:mm A",
			LLLL: "dddd, MMMM D, YYYY h:mm A"
		}, t = /(\[[^[]*\])|([-_:/.,()\s]+)|(A|a|Q|YYYY|YY?|ww?|MM?M?M?|Do|DD?|hh?|HH?|mm?|ss?|S{1,3}|z|ZZ?)/g, n = /\d/, r = /\d\d/, i = /\d\d?/, o = /\d*[^-_:/,()\s\d]+/, s = {}, a = function(e) {
			return (e = +e) + (e > 68 ? 1900 : 2e3);
		};
		var f = function(e) {
			return function(t) {
				this[e] = +t;
			};
		}, h = [/[+-]\d\d:?(\d\d)?|Z/, function(e) {
			(this.zone || (this.zone = {})).offset = function(e) {
				if (!e) return 0;
				if ("Z" === e) return 0;
				var t = e.match(/([+-]|\d\d)/g), n = 60 * t[1] + (+t[2] || 0);
				return 0 === n ? 0 : "+" === t[0] ? -n : n;
			}(e);
		}], u = function(e) {
			var t = s[e];
			return t && (t.indexOf ? t : t.s.concat(t.f));
		}, d = function(e, t) {
			var n, r = s.meridiem;
			if (r) {
				for (var i = 1; i <= 24; i += 1) if (e.indexOf(r(i, 0, t)) > -1) {
					n = i > 12;
					break;
				}
			} else n = e === (t ? "pm" : "PM");
			return n;
		}, c = {
			A: [o, function(e) {
				this.afternoon = d(e, !1);
			}],
			a: [o, function(e) {
				this.afternoon = d(e, !0);
			}],
			Q: [n, function(e) {
				this.month = 3 * (e - 1) + 1;
			}],
			S: [n, function(e) {
				this.milliseconds = 100 * +e;
			}],
			SS: [r, function(e) {
				this.milliseconds = 10 * +e;
			}],
			SSS: [/\d{3}/, function(e) {
				this.milliseconds = +e;
			}],
			s: [i, f("seconds")],
			ss: [i, f("seconds")],
			m: [i, f("minutes")],
			mm: [i, f("minutes")],
			H: [i, f("hours")],
			h: [i, f("hours")],
			HH: [i, f("hours")],
			hh: [i, f("hours")],
			D: [i, f("day")],
			DD: [r, f("day")],
			Do: [o, function(e) {
				var t = s.ordinal;
				if (this.day = e.match(/\d+/)[0], t) for (var r = 1; r <= 31; r += 1) t(r).replace(/\[|\]/g, "") === e && (this.day = r);
			}],
			w: [i, f("week")],
			ww: [r, f("week")],
			M: [i, f("month")],
			MM: [r, f("month")],
			MMM: [o, function(e) {
				var t = u("months"), n = (u("monthsShort") || t.map((function(e) {
					return e.slice(0, 3);
				}))).indexOf(e) + 1;
				if (n < 1) throw new Error();
				this.month = n % 12 || n;
			}],
			MMMM: [o, function(e) {
				var t = u("months").indexOf(e) + 1;
				if (t < 1) throw new Error();
				this.month = t % 12 || t;
			}],
			Y: [/[+-]?\d+/, f("year")],
			YY: [r, function(e) {
				this.year = a(e);
			}],
			YYYY: [/\d{4}/, f("year")],
			Z: h,
			ZZ: h
		};
		function l(n) {
			var r = n, i = s && s.formats;
			for (var o = (n = r.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g, (function(t, n, r) {
				var o = r && r.toUpperCase();
				return n || i[r] || e[r] || i[o].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g, (function(e, t, n) {
					return t || n.slice(1);
				}));
			}))).match(t), a = o.length, f = 0; f < a; f += 1) {
				var h = o[f], u = c[h], d = u && u[0], l = u && u[1];
				o[f] = l ? {
					regex: d,
					parser: l
				} : h.replace(/^\[|\]$/g, "");
			}
			return function(e) {
				for (var t = {}, n = 0, r = 0; n < a; n += 1) {
					var i = o[n];
					if ("string" == typeof i) r += i.length;
					else {
						var s = i.regex, f = i.parser, h = e.slice(r), u = s.exec(h)[0];
						f.call(t, u), e = e.replace(u, "");
					}
				}
				return function(e) {
					var t = e.afternoon;
					if (void 0 !== t) {
						var n = e.hours;
						t ? n < 12 && (e.hours += 12) : 12 === n && (e.hours = 0), delete e.afternoon;
					}
				}(t), t;
			};
		}
		return function(e, t, n) {
			n.p.customParseFormat = !0, e && e.parseTwoDigitYear && (a = e.parseTwoDigitYear);
			var r = t.prototype, i = r.parse;
			r.parse = function(e) {
				var t = e.date, r = e.utc, o = e.args;
				this.$u = r;
				var a = o[1];
				if ("string" == typeof a) {
					var f = !0 === o[2], h = !0 === o[3], u = f || h, d = o[2];
					h && (d = o[2]), s = this.$locale(), !f && d && (s = n.Ls[d]), this.$d = function(e, t, n, r) {
						try {
							if (["x", "X"].indexOf(t) > -1) return /* @__PURE__ */ new Date(("X" === t ? 1e3 : 1) * e);
							var i = l(t)(e), o = i.year, s = i.month, a = i.day, f = i.hours, h = i.minutes, u = i.seconds, d = i.milliseconds, c = i.zone, m = i.week, M = /* @__PURE__ */ new Date(), Y = a || (o || s ? 1 : M.getDate()), p = o || M.getFullYear(), v = 0;
							o && !s || (v = s > 0 ? s - 1 : M.getMonth());
							var D, w = f || 0, g = h || 0, y = u || 0, L = d || 0;
							return c ? new Date(Date.UTC(p, v, Y, w, g, y, L + 60 * c.offset * 1e3)) : n ? new Date(Date.UTC(p, v, Y, w, g, y, L)) : (D = new Date(p, v, Y, w, g, y, L), m && (D = r(D).week(m).toDate()), D);
						} catch (e) {
							return /* @__PURE__ */ new Date("");
						}
					}(t, a, r, n), this.init(), d && !0 !== d && (this.$L = this.locale(d).$L), u && t != this.format(a) && (this.$d = /* @__PURE__ */ new Date("")), s = {};
				} else if (a instanceof Array) for (var c = a.length, m = 1; m <= c; m += 1) {
					o[1] = a[m - 1];
					var M = n.apply(this, o);
					if (M.isValid()) {
						this.$d = M.$d, this.$L = M.$L, this.init();
						break;
					}
					m === c && (this.$d = /* @__PURE__ */ new Date(""));
				}
				else i.call(this, e);
			};
		};
	}));
}));
//#endregion
//#region node_modules/.deno/dayjs@1.11.20/node_modules/dayjs/plugin/advancedFormat.js
var require_advancedFormat = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(e, t) {
		"object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).dayjs_plugin_advancedFormat = t();
	})(exports, (function() {
		"use strict";
		return function(e, t) {
			var r = t.prototype, n = r.format;
			r.format = function(e) {
				var t = this, r = this.$locale();
				if (!this.isValid()) return n.bind(this)(e);
				var s = this.$utils(), a = (e || "YYYY-MM-DDTHH:mm:ssZ").replace(/\[([^\]]+)]|Q|wo|ww|w|WW|W|zzz|z|gggg|GGGG|Do|X|x|k{1,2}|S/g, (function(e) {
					switch (e) {
						case "Q": return Math.ceil((t.$M + 1) / 3);
						case "Do": return r.ordinal(t.$D);
						case "gggg": return t.weekYear();
						case "GGGG": return t.isoWeekYear();
						case "wo": return r.ordinal(t.week(), "W");
						case "w":
						case "ww": return s.s(t.week(), "w" === e ? 1 : 2, "0");
						case "W":
						case "WW": return s.s(t.isoWeek(), "W" === e ? 1 : 2, "0");
						case "k":
						case "kk": return s.s(String(0 === t.$H ? 24 : t.$H), "k" === e ? 1 : 2, "0");
						case "X": return Math.floor(t.$d.getTime() / 1e3);
						case "x": return t.$d.getTime();
						case "z": return "[" + t.offsetName() + "]";
						case "zzz": return "[" + t.offsetName("long") + "]";
						default: return e;
					}
				}));
				return n.bind(this)(a);
			};
		};
	}));
}));
//#endregion
//#region node_modules/.deno/dayjs@1.11.20/node_modules/dayjs/plugin/quarterOfYear.js
var require_quarterOfYear = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(t, n) {
		"object" == typeof exports && "undefined" != typeof module ? module.exports = n() : "function" == typeof define && define.amd ? define(n) : (t = "undefined" != typeof globalThis ? globalThis : t || self).dayjs_plugin_quarterOfYear = n();
	})(exports, (function() {
		"use strict";
		var t = "month", n = "quarter";
		return function(e, i) {
			var r = i.prototype;
			r.quarter = function(t) {
				return this.$utils().u(t) ? Math.ceil((this.month() + 1) / 3) : this.month(this.month() % 3 + 3 * (t - 1));
			};
			var s = r.add;
			r.add = function(e, i) {
				return e = Number(e), this.$utils().p(i) === n ? this.add(3 * e, t) : s.bind(this)(e, i);
			};
			var u = r.startOf;
			r.startOf = function(e, i) {
				var r = this.$utils(), s = !!r.u(i) || i;
				if (r.p(e) === n) {
					var o = this.quarter() - 1;
					return s ? this.month(3 * o).startOf(t).startOf("day") : this.month(3 * o + 2).endOf(t).endOf("day");
				}
				return u.bind(this)(e, i);
			};
		};
	}));
}));
//#endregion
//#region node_modules/.deno/dayjs@1.11.20/node_modules/dayjs/plugin/localizedFormat.js
var require_localizedFormat = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(e, t) {
		"object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).dayjs_plugin_localizedFormat = t();
	})(exports, (function() {
		"use strict";
		var e = {
			LTS: "h:mm:ss A",
			LT: "h:mm A",
			L: "MM/DD/YYYY",
			LL: "MMMM D, YYYY",
			LLL: "MMMM D, YYYY h:mm A",
			LLLL: "dddd, MMMM D, YYYY h:mm A"
		};
		return function(t, o, n) {
			var r = o.prototype, i = r.format;
			n.en.formats = e, r.format = function(t) {
				void 0 === t && (t = "YYYY-MM-DDTHH:mm:ssZ");
				var o = this.$locale().formats, n = function(t, o) {
					return t.replace(/(\[[^\]]+])|(LTS?|l{1,4}|L{1,4})/g, (function(t, n, r) {
						var i = r && r.toUpperCase();
						return n || o[r] || e[r] || o[i].replace(/(\[[^\]]+])|(MMMM|MM|DD|dddd)/g, (function(e, t, o) {
							return t || o.slice(1);
						}));
					}));
				}(t, void 0 === o ? {} : o);
				return i.call(this, n);
			};
		};
	}));
}));
//#endregion
//#region node_modules/.deno/dayjs@1.11.20/node_modules/dayjs/plugin/isoWeek.js
var require_isoWeek = /* @__PURE__ */ __commonJSMin(((exports, module) => {
	(function(e, t) {
		"object" == typeof exports && "undefined" != typeof module ? module.exports = t() : "function" == typeof define && define.amd ? define(t) : (e = "undefined" != typeof globalThis ? globalThis : e || self).dayjs_plugin_isoWeek = t();
	})(exports, (function() {
		"use strict";
		var e = "day";
		return function(t, i, s) {
			var a = function(t) {
				return t.add(4 - t.isoWeekday(), e);
			}, d = i.prototype;
			d.isoWeekYear = function() {
				return a(this).year();
			}, d.isoWeek = function(t) {
				if (!this.$utils().u(t)) return this.add(7 * (t - this.isoWeek()), e);
				var i, d, n, o, r = a(this), u = (i = this.isoWeekYear(), d = this.$u, n = (d ? s.utc : s)().year(i).startOf("year"), o = 4 - n.isoWeekday(), n.isoWeekday() > 4 && (o += 7), n.add(o, e));
				return r.diff(u, "week") + 1;
			}, d.isoWeekday = function(e) {
				return this.$utils().u(e) ? this.day() || 7 : this.day(this.day() % 7 ? e : e - 7);
			};
			var n = d.startOf;
			d.startOf = function(e, t) {
				var i = this.$utils(), s = !!i.u(t) || t;
				return "isoweek" === i.p(e) ? s ? this.date(this.date() - (this.isoWeekday() - 1)).startOf("day") : this.date(this.date() - 1 - (this.isoWeekday() - 1) + 7).endOf("day") : n.bind(this)(e, t);
			};
		};
	}));
}));
//#endregion
//#region node_modules/.deno/chartjs-adapter-dayjs-4@1.0.4/node_modules/chartjs-adapter-dayjs-4/dist/chartjs-adapter-dayjs-4.esm.js
var import_dayjs_min = /* @__PURE__ */ __toESM(require_dayjs_min(), 1);
var import_customParseFormat = /* @__PURE__ */ __toESM(require_customParseFormat(), 1);
var import_advancedFormat = /* @__PURE__ */ __toESM(require_advancedFormat(), 1);
var import_quarterOfYear = /* @__PURE__ */ __toESM(require_quarterOfYear(), 1);
var import_localizedFormat = /* @__PURE__ */ __toESM(require_localizedFormat(), 1);
var import_isoWeek = /* @__PURE__ */ __toESM(require_isoWeek(), 1);
import_dayjs_min.default.extend(import_advancedFormat.default);
import_dayjs_min.default.extend(import_quarterOfYear.default);
import_dayjs_min.default.extend(import_localizedFormat.default);
import_dayjs_min.default.extend(import_customParseFormat.default);
import_dayjs_min.default.extend(import_isoWeek.default);
var FORMATS = {
	datetime: "MMM D, YYYY, h:mm:ss a",
	millisecond: "h:mm:ss.SSS a",
	second: "h:mm:ss a",
	minute: "h:mm a",
	hour: "hA",
	day: "MMM D",
	week: "ll",
	month: "MMM YYYY",
	quarter: "[Q]Q - YYYY",
	year: "YYYY"
};
adapters._date.override({
	formats: function formats() {
		return FORMATS;
	},
	parse: function parse(value, format) {
		var valueType = typeof value;
		if (value === null || valueType === "undefined") return null;
		if (valueType === "string" && typeof format === "string") return (0, import_dayjs_min.default)(value, format).isValid() ? (0, import_dayjs_min.default)(value, format).valueOf() : null;
		else if (!(value instanceof import_dayjs_min.default)) return (0, import_dayjs_min.default)(value).isValid() ? (0, import_dayjs_min.default)(value).valueOf() : null;
		return null;
	},
	format: function format(time, _format) {
		return (0, import_dayjs_min.default)(time).format(_format);
	},
	add: function add(time, amount, unit) {
		return (0, import_dayjs_min.default)(time).add(amount, unit).valueOf();
	},
	diff: function diff(max, min, unit) {
		return (0, import_dayjs_min.default)(max).diff((0, import_dayjs_min.default)(min), unit);
	},
	startOf: function startOf(time, unit, weekday) {
		if (unit === "isoWeek") {
			var validatedWeekday = typeof weekday === "number" && weekday > 0 && weekday < 7 ? weekday : 1;
			return (0, import_dayjs_min.default)(time).isoWeekday(validatedWeekday).startOf("day").valueOf();
		}
		return (0, import_dayjs_min.default)(time).startOf(unit).valueOf();
	},
	endOf: function endOf(time, unit) {
		return (0, import_dayjs_min.default)(time).endOf(unit).valueOf();
	}
});
//#endregion

//# sourceMappingURL=chartjs-adapter-dayjs-4.js.map