// Language helper: loads a language's catalogs and offers formatting utilities for generated pages.
const fs = require("fs");
const path = require("path");

function readJson(p, fallback) {
  try { return JSON.parse(fs.readFileSync(p, "utf8")); } catch (e) { if (fallback !== undefined) return fallback; throw e; }
}

function makeLang(def, root = ".") {
  const S = readJson(path.join(root, "data/lang", def.code + ".json"));
  const cities = readJson(path.join(root, "data/lang", "cities." + def.code + ".json"), {});
  const std = readJson(path.join(root, "data/lang", "std." + def.code + ".json"), {});
  const plurals = new Intl.PluralRules(def.code);
  let regionNames = null;

  const L = {
    ...def, S, cities, std,
    // catalog lookup with {var} substitution (leaves {{SITE_NAME}} alone: it is filled later)
    g(key, vars) {
      let s = S[key];
      if (s === undefined) throw new Error(`Missing string "${key}" for language ${def.code}`);
      if (vars) for (const k in vars) s = s.split("{" + k + "}").join(vars[k]);
      return s;
    },
    pl(base, n, vars) {
      const cat = plurals.select(n);
      const key = S[base + "." + cat] !== undefined ? base + "." + cat : base + ".other";
      return L.g(key, Object.assign({ n }, vars || {}));
    },
    city(zoneId, englishLabel) { return cities[zoneId] || englishLabel; },
    country(code, englishName) {
      if (def.code === "en") return englishName;
      try {
        regionNames = regionNames || new Intl.DisplayNames([def.code], { type: "region" });
        return regionNames.of(code) || englishName;
      } catch (e) { return englishName; }
    },
    clock(utcMs, tz) {
      const s = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(utcMs));
      return s.replace(/\bAM\b/, S["am"]).replace(/\bPM\b/, S["pm"]);
    },
    dateLong(utcMs, tz) {
      return new Intl.DateTimeFormat(def.locale, { timeZone: tz, month: "long", day: "numeric" }).format(new Date(utcMs));
    },
    // "2 hours 30 minutes" in the page language
    dur(min) {
      const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
      const parts = [];
      if (h) parts.push(L.pl("dur.hour", h));
      if (m) parts.push(L.pl("dur.minute", m));
      return parts.join(S["dur.join"]);
    },
    url(p) { return def.prefix + p; },
  };
  return L;
}

module.exports = { makeLang, readJson };
