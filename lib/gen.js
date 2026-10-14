// Language-aware content for generated pages: city pairs, countries, and the country index.
const { offsetMinutes, transitions, fmtOffset, wallToUtc } = require("./pages.js");

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

const HUBS = [
  { key: "UTC", zone: "UTC" }, { key: "London", zone: "Europe/London" }, { key: "New York", zone: "America/New_York" },
  { key: "Los Angeles", zone: "America/Los_Angeles" }, { key: "Dubai", zone: "Asia/Dubai" }, { key: "India", zone: "Asia/Kolkata" },
  { key: "Tokyo", zone: "Asia/Tokyo" }, { key: "Sydney", zone: "Australia/Sydney" },
];

const SECTION = 'class="px-6 max-w-3xl mx-auto pb-24 font-body text-on-surface-variant leading-relaxed space-y-6"';
const H1 = 'class="font-display text-3xl md:text-4xl font-bold text-on-surface"';
const H2 = 'class="font-display text-xl font-semibold text-on-surface"';
const LINK = 'class="text-primary underline"';
const TABLE = 'class="w-full text-start text-sm"';
const TR_HEAD = 'class="border-b border-outline-variant/50 text-on-surface"';
const TR = 'class="border-b border-outline-variant/30"';

function dayShift(utcMs, fromTz, toTz) {
  const key = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(utcMs));
  return Math.round((new Date(key(toTz) + "T00:00:00Z") - new Date(key(fromTz) + "T00:00:00Z")) / 86400000);
}

const offCache = new Map();
function offsetsFor(zone, year) {
  const key = zone + "|" + year;
  let v = offCache.get(key);
  if (!v) {
    v = { jan: offsetMinutes(Date.UTC(year, 0, 15, 12), zone), jul: offsetMinutes(Date.UTC(year, 6, 15, 12), zone) };
    offCache.set(key, v);
  }
  return v;
}
const offsetRange = (o) => (o.jan === o.jul ? fmtOffset(o.jan) : `${fmtOffset(o.jan)} / ${fmtOffset(o.jul)}`);

function makeGen(L) {
  const g = L.g;
  const listSep = L.S["sep.list"];

  // "B is 2 hours ahead of A" (no final period)
  function rel(min, B, A) {
    if (min === 0) return g("gen.rel.same", { A, B });
    return g(min > 0 ? "gen.rel.ahead" : "gen.rel.behind", { A, B, dur: L.dur(min) });
  }
  function relTail(min, A) {
    if (min === 0) return g("gen.rel.tail.same", { A });
    return g(min > 0 ? "gen.rel.tail.ahead" : "gen.rel.tail.behind", { A, dur: L.dur(min) });
  }

  // Sentence about a zone's daylight saving behaviour. `p` = { label, country, zone }
  function zoneSentence(p, year) {
    const tr = transitions(p.zone, year);
    const jan = offsetMinutes(Date.UTC(year, 0, 15, 12), p.zone);
    if (!tr.length) return g("gen.zone.noDst", { label: p.label, country: p.country, off: fmtOffset(jan) });
    const second = tr[1] ? g("gen.zone.dst2", { d2: L.dateLong(tr[1].utcMs, p.zone), o2: fmtOffset(tr[1].to) }) : "";
    return g("gen.zone.dst", { label: p.label, country: p.country, year, d1: L.dateLong(tr[0].utcMs, p.zone), o1: fmtOffset(tr[0].to), second });
  }

  function overlapWindow(year, month, day, A, B) {
    const aS = wallToUtc(year, month, day, 9, 0, A.zone), aE = wallToUtc(year, month, day, 17, 0, A.zone);
    const bS = wallToUtc(year, month, day, 9, 0, B.zone), bE = wallToUtc(year, month, day, 17, 0, B.zone);
    const s = Math.max(aS, bS), e = Math.min(aE, bE);
    return e > s ? { s, e } : null;
  }
  function overlapText(win, A, B) {
    if (!win) return g("gen.overlap.none", { A: A.label, B: B.label });
    return g("gen.overlap.some", { s1: L.clock(win.s, A.zone), e1: L.clock(win.e, A.zone), A: A.label, s2: L.clock(win.s, B.zone), e2: L.clock(win.e, B.zone), B: B.label });
  }

  // ---------------- city pair ----------------
  function buildPair(placeA, placeB, year) {
    const A = { ...placeA, label: L.code === "en" ? placeA.label : (placeA["label_" + L.code] || placeA.label), country: L.country(placeA.code, placeA.country) };
    const B = { ...placeB, label: L.code === "en" ? placeB.label : (placeB["label_" + L.code] || placeB.label), country: L.country(placeB.code, placeB.country) };
    const janUtc = Date.UTC(year, 0, 15, 12), julUtc = Date.UTC(year, 6, 15, 12);
    const dJan = offsetMinutes(janUtc, B.zone) - offsetMinutes(janUtc, A.zone);
    const dJul = offsetMinutes(julUtc, B.zone) - offsetMinutes(julUtc, A.zone);
    const varies = dJan !== dJul;
    const ab1 = rel(dJan, B.label, A.label), ab2 = rel(dJul, B.label, A.label);

    const title = g("gen.pair.title", { A: A.label, B: B.label });
    const description = !varies
      ? g("gen.pair.desc.fixed", { A: A.label, B: B.label, ab1 })
      : dJul === 0
        ? g("gen.pair.desc.varies0", { A: A.label, B: B.label, ab1 })
        : g("gen.pair.desc.varies", { A: A.label, B: B.label, ab1, dur2: L.dur(dJul), dir2: g(dJul > 0 ? "gen.dir.ahead" : "gen.dir.behind") });
    const diffLine = varies
      ? g("gen.pair.diff.varies", { ab1, ab2, ab2tail: relTail(dJul, A.label) })
      : g("gen.pair.diff.fixed", { ab1 });

    const cell = (u) => {
      const sh = dayShift(u, A.zone, B.zone);
      return esc(L.clock(u, B.zone)) + (sh ? ` <span class="text-outline">(${g(sh > 0 ? "gen.nextDay" : "gen.prevDay")})</span>` : "");
    };
    const rows = [6, 9, 12, 15, 18, 21].map((h) => {
      const jU = wallToUtc(year, 1, 15, h, 0, A.zone), lU = wallToUtc(year, 7, 15, h, 0, A.zone);
      const a = esc(L.clock(jU, A.zone));
      return varies
        ? `<tr ${TR}><td class="py-2 pe-4">${a}</td><td class="py-2 pe-4">${cell(jU)}</td><td class="py-2">${cell(lU)}</td></tr>`
        : `<tr ${TR}><td class="py-2 pe-4">${a}</td><td class="py-2">${cell(jU)}</td></tr>`;
    }).join("\n");
    const head = varies
      ? `<th class="py-2 pe-4 font-medium">${esc(g("gen.th.timeIn", { A: A.label }))}</th><th class="py-2 pe-4 font-medium">${esc(g("gen.th.inJan", { B: B.label }))}</th><th class="py-2 font-medium">${esc(g("gen.th.inJul", { B: B.label }))}</th>`
      : `<th class="py-2 pe-4 font-medium">${esc(g("gen.th.timeIn", { A: A.label }))}</th><th class="py-2 font-medium">${esc(g("gen.th.time", { B: B.label }))}</th>`;

    const oJan = overlapWindow(year, 1, 14, A, B), oJul = overlapWindow(year, 7, 15, A, B);
    const sameOverlap = oJan && oJul && L.clock(oJan.s, A.zone) === L.clock(oJul.s, A.zone) && L.clock(oJan.e, A.zone) === L.clock(oJul.e, A.zone);
    const overlapHtml = sameOverlap || !varies
      ? `<p>${esc(g("gen.pair.overlap.same", { o1: overlapText(oJan, A, B) }))}</p>`
      : `<p>${esc(g("gen.pair.overlap.differs", { o1: overlapText(oJan, A, B), o2: overlapText(oJul, A, B) }))}</p>`;

    const content = `
<section id="more-info" ${SECTION}>
  <h1 ${H1}>${esc(g("gen.pair.h1", { A: A.label, B: B.label }))}</h1>
  <p>${esc(g("gen.pair.intro", { A: A.label, B: B.label }))}</p>
  <h2 ${H2}>${esc(g("gen.pair.h2.diff", { A: A.label, B: B.label }))}</h2>
  <p>${esc(diffLine)}</p>
  <p>${esc(zoneSentence(A, year))} ${esc(zoneSentence(B, year))}</p>
  <h2 ${H2}>${esc(g("gen.pair.h2.table", { A: A.label, B: B.label }))}</h2>
  <div class="overflow-x-auto"><table ${TABLE}><thead><tr ${TR_HEAD}>${head}</tr></thead><tbody>
${rows}
</tbody></table></div>
  <h2 ${H2}>${esc(g("gen.pair.h2.call", { A: A.label, B: B.label }))}</h2>
  ${overlapHtml}
  <p>${esc(g("gen.pair.weekend"))}</p>
  <p><a ${LINK} href="${L.url("/")}">${g("gen.pair.home")}</a>${g("gen.pair.homeEnd")}</p>
</section>`;
    return { title, description, content };
  }

  // ---------------- country pages ----------------
  const pageUrl = (c) => L.url(`/time-in-${c.slug}/`);
  const mainOf = (c) => c.zones.find((z) => z.id === c.main) || c.zones[0];
  const zLabel = (z) => L.city(z.id, z.label);

  function buildCountry(country, all, pairPages, year) {
    const mainZone = mainOf(country);
    const main = offsetsFor(mainZone.id, year);
    const varies = main.jan !== main.jul;
    const multi = country.zones.length > 1;
    const name = L.country(country.code, country.name);
    const mainLabel = zLabel(mainZone);

    const title = g("gen.country.title", { name });
    const description = multi
      ? g("gen.country.desc.multi", { name, zones: L.pl("gen.zonesCount", country.zones.length), off: fmtOffset(main.jan), summer: varies ? g("gen.country.summer", { off2: fmtOffset(main.jul) }) : "" })
      : g("gen.country.desc.single", { name, off: fmtOffset(main.jan), detail: varies ? g("gen.country.detail.varies", { off2: fmtOffset(main.jul) }) : g("gen.country.detail.fixed") });

    const trMain = transitions(mainZone.id, year);
    let zoneText;
    if (!trMain.length) {
      zoneText = g(multi ? "gen.country.noDst.multi" : "gen.country.noDst.single", { name, label: mainLabel, off: fmtOffset(main.jan) });
    } else {
      const second = trMain[1] ? g("gen.country.changes2", { d2: L.dateLong(trMain[1].utcMs, mainZone.id), o2: fmtOffset(trMain[1].to) }) : "";
      const changes = g("gen.country.changes", { year, d1: L.dateLong(trMain[0].utcMs, mainZone.id), o1: fmtOffset(trMain[0].to), second });
      zoneText = g(multi ? "gen.country.dst.multi" : "gen.country.dst.single", { name, label: mainLabel, changes });
    }
    const intro = multi
      ? g("gen.country.intro.multi", { name: esc(name), zones: L.pl("gen.zonesCount", country.zones.length), label: esc(mainLabel) })
      : g("gen.country.intro.single", { name: esc(name) });

    let zonesHtml = "";
    if (multi) {
      const rows = country.zones.map((z) => {
        const o = offsetsFor(z.id, year);
        return `<tr ${TR}><td class="py-2 pe-4">${esc(zLabel(z))}${z.id === mainZone.id ? ` <span class="text-outline">${g("gen.country.main")}</span>` : ""}</td><td class="py-2 pe-4">${esc(fmtOffset(o.jan))}</td><td class="py-2">${esc(fmtOffset(o.jul))}</td></tr>`;
      }).join("\n");
      zonesHtml = `
  <h2 ${H2}>${esc(g("gen.country.h2.zones", { name }))}</h2>
  <div class="overflow-x-auto"><table ${TABLE}><thead><tr ${TR_HEAD}><th class="py-2 pe-4 font-medium">${g("gen.country.th.region")}</th><th class="py-2 pe-4 font-medium">${g("gen.country.th.jan")}</th><th class="py-2 font-medium">${g("gen.country.th.jul")}</th></tr></thead><tbody>
${rows}
</tbody></table></div>`;
    }

    const rowsHub = HUBS.filter((h) => h.zone !== mainZone.id).map((h) => {
      const uJ = wallToUtc(year, 1, 15, 9, 0, mainZone.id), uL = wallToUtc(year, 7, 15, 9, 0, mainZone.id);
      const cell = (u) => {
        const sh = dayShift(u, mainZone.id, h.zone);
        return esc(L.clock(u, h.zone)) + (sh ? ` <span class="text-outline">(${g(sh > 0 ? "gen.nextDay" : "gen.prevDay")})</span>` : "");
      };
      return `<tr ${TR}><td class="py-2 pe-4">${esc(g("hub." + h.key))}</td><td class="py-2 pe-4">${cell(uJ)}</td><td class="py-2">${cell(uL)}</td></tr>`;
    }).join("\n");
    const hubHtml = `
  <h2 ${H2}>${esc(g("gen.country.h2.hub", { label: mainLabel }))}</h2>
  <div class="overflow-x-auto"><table ${TABLE}><thead><tr ${TR_HEAD}><th class="py-2 pe-4 font-medium">${g("gen.country.th.place")}</th><th class="py-2 pe-4 font-medium">${g("gen.country.th.inJan")}</th><th class="py-2 font-medium">${g("gen.country.th.inJul")}</th></tr></thead><tbody>
${rowsHub}
</tbody></table></div>`;

    const sameJan = all.filter((c) => c.code !== country.code && offsetsFor(mainOf(c).id, year).jan === main.jan);
    const shown = sameJan.slice(0, 14);
    const sameHtml = shown.length ? `
  <h2 ${H2}>${esc(g("gen.country.h2.same", { name }))}</h2>
  <p>${g("gen.country.same", { off: esc(fmtOffset(main.jan)), list: shown.map((c) => `<a ${LINK} href="${pageUrl(c)}">${esc(L.country(c.code, c.name))}</a>`).join(listSep), more: sameJan.length > shown.length ? L.pl("gen.country.more", sameJan.length - shown.length) : "" })}</p>` : "";

    const related = pairPages.filter((p) => p.A.country === country.name || p.B.country === country.name);
    const relHtml = related.length ? `
  <h2 ${H2}>${esc(g("gen.country.h2.popular"))}</h2>
  <p>${related.map((p) => `<a ${LINK} href="${p.url}">${esc(g("gen.country.pairLink", { A: L.code === "en" ? p.A.label : (p.A["label_" + L.code] || p.A.label), B: L.code === "en" ? p.B.label : (p.B["label_" + L.code] || p.B.label) }))}</a>`).join(" · ")}</p>` : "";

    const content = `
<section id="more-info" ${SECTION}>
  <h1 ${H1}>${esc(g("gen.country.h1", { name }))}</h1>
  <p>${intro}</p>
  <p>${esc(zoneText)}</p>${zonesHtml}${hubHtml}${sameHtml}${relHtml}
  <p><a ${LINK} href="${L.url("/time-zones/")}">${g("gen.country.browse")}</a> · <a ${LINK} href="${L.url("/")}">${g("gen.country.home")}</a></p>
</section>`;
    return { title, description, content, preset: { origin: mainZone.id } };
  }

  function buildIndex(all, year) {
    const items = all.slice().sort((a, b) => L.country(a.code, a.name).localeCompare(L.country(b.code, b.name), L.code))
      .map((c) => {
        const o = offsetsFor(mainOf(c).id, year);
        return `<li><a ${LINK} href="${pageUrl(c)}">${esc(L.country(c.code, c.name))}</a> <span class="text-outline">${esc(offsetRange(o))}${c.zones.length > 1 ? esc(g("gen.index.zones", { zones: L.pl("gen.zonesShort", c.zones.length) })) : ""}</span></li>`;
      }).join("\n");
    const content = `
<section id="more-info" ${SECTION}>
  <h1 ${H1}>${esc(g("gen.index.h1"))}</h1>
  <p>${esc(g("gen.index.intro"))}</p>
  <ul class="columns-1 sm:columns-2 gap-8 space-y-1 text-sm">
${items}
  </ul>
  <p><a ${LINK} href="${L.url("/")}">${g("gen.index.back")}</a></p>
</section>`;
    return { title: g("meta.index.title"), description: g("meta.index.description"), content };
  }

  return { buildPair, buildCountry, buildIndex, pageUrl };
}

module.exports = { makeGen };
