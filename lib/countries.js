// Country landing pages ("Time in Egypt") and the "time zones by country" index.
const { offsetMinutes, transitions, fmtOffset, wallToUtc } = require("./pages.js");

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
const pageUrl = (c) => `/time-in-${c.slug}/`;

const HUBS = [
  { label: "UTC", zone: "UTC" },
  { label: "London", zone: "Europe/London" },
  { label: "New York", zone: "America/New_York" },
  { label: "Los Angeles", zone: "America/Los_Angeles" },
  { label: "Dubai", zone: "Asia/Dubai" },
  { label: "India", zone: "Asia/Kolkata" },
  { label: "Tokyo", zone: "Asia/Tokyo" },
  { label: "Sydney", zone: "Australia/Sydney" },
];

function clock(utcMs, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(utcMs));
}
function dayShift(utcMs, fromTz, toTz) {
  const key = (tz) => new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(utcMs));
  return Math.round((new Date(key(toTz) + "T00:00:00Z") - new Date(key(fromTz) + "T00:00:00Z")) / 86400000);
}
function fmtDate(utcMs, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long", day: "numeric" }).format(new Date(utcMs));
}
function offsetsFor(zone, year) {
  return {
    jan: offsetMinutes(Date.UTC(year, 0, 15, 12), zone),
    jul: offsetMinutes(Date.UTC(year, 6, 15, 12), zone),
  };
}
function offsetRange(o) {
  return o.jan === o.jul ? fmtOffset(o.jan) : `${fmtOffset(o.jan)} / ${fmtOffset(o.jul)}`;
}

function buildCountry(country, all, pairPages, year) {
  const mainZone = country.zones.find((z) => z.id === country.main) || country.zones[0];
  const main = offsetsFor(mainZone.id, year);
  const varies = main.jan !== main.jul;
  const multi = country.zones.length > 1;
  const name = country.name;

  const title = `Time in ${name} – Time Zone Converter | {{SITE_NAME}}`;
  const description = multi
    ? `${name} has ${country.zones.length} time zones. The main one is ${fmtOffset(main.jan)}${varies ? ` (${fmtOffset(main.jul)} in summer)` : ""}. Convert ${name} time to any city or time zone.`
    : `${name} is on ${fmtOffset(main.jan)}${varies ? ` in winter and ${fmtOffset(main.jul)} in summer` : " all year"}. Convert ${name} time to any city or time zone with our free converter.`;

  // ---- zone sentences ----
  const trMain = transitions(mainZone.id, year);
  let zoneText;
  if (!trMain.length) {
    zoneText = multi
      ? `The main time zone, ${mainZone.label}, is on ${fmtOffset(main.jan)} all year. Its clocks do not change for daylight saving time.`
      : `${name} is on ${fmtOffset(main.jan)} all year. Its clocks do not change for daylight saving time.`;
  } else {
    const changes = `in ${year}, clocks change on ${fmtDate(trMain[0].utcMs, mainZone.id)} (to ${fmtOffset(trMain[0].to)})` +
      (trMain[1] ? ` and on ${fmtDate(trMain[1].utcMs, mainZone.id)} (back to ${fmtOffset(trMain[1].to)})` : "");
    zoneText = multi
      ? `In the main time zone, ${mainZone.label}, ${changes}.`
      : `${name} uses daylight saving time: ${changes}.`;
  }
  const intro = multi
    ? `${name} spans ${country.zones.length} time zones. Use the converter above, which starts from ${esc(mainZone.label)}, or pick a different region from the list below.`
    : `Use the converter above to turn a time in ${esc(name)} into the time anywhere else. Drag the slider or type an exact time, and every place updates instantly.`;

  // ---- zones table (multi-zone only) ----
  let zonesHtml = "";
  if (multi) {
    const rows = country.zones.map((z) => {
      const o = offsetsFor(z.id, year);
      return `<tr class="border-b border-outline-variant/30"><td class="py-2 pr-4">${esc(z.label)}${z.id === mainZone.id ? ' <span class="text-outline">(main)</span>' : ""}</td><td class="py-2 pr-4">${esc(fmtOffset(o.jan))}</td><td class="py-2">${esc(fmtOffset(o.jul))}</td></tr>`;
    }).join("\n");
    zonesHtml = `
  <h2 class="font-display text-xl font-semibold text-on-surface">Time zones in ${esc(name)}</h2>
  <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-outline-variant/50 text-on-surface"><th class="py-2 pr-4 font-medium">Region</th><th class="py-2 pr-4 font-medium">January</th><th class="py-2 font-medium">July</th></tr></thead><tbody>
${rows}
</tbody></table></div>`;
  }

  // ---- conversion table to hubs ----
  const hubs = HUBS.filter((h) => h.zone !== mainZone.id);
  const rowsHub = hubs.map((h) => {
    const uJ = wallToUtc(year, 1, 15, 9, 0, mainZone.id), uL = wallToUtc(year, 7, 15, 9, 0, mainZone.id);
    const cell = (u) => {
      const sh = dayShift(u, mainZone.id, h.zone);
      return esc(clock(u, h.zone)) + (sh ? ` <span class="text-outline">(${sh > 0 ? "next day" : "previous day"})</span>` : "");
    };
    return `<tr class="border-b border-outline-variant/30"><td class="py-2 pr-4">${esc(h.label)}</td><td class="py-2 pr-4">${cell(uJ)}</td><td class="py-2">${cell(uL)}</td></tr>`;
  }).join("\n");
  const hubHtml = `
  <h2 class="font-display text-xl font-semibold text-on-surface">When it is 9:00 AM in ${esc(mainZone.label)}</h2>
  <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-outline-variant/50 text-on-surface"><th class="py-2 pr-4 font-medium">Place</th><th class="py-2 pr-4 font-medium">In January</th><th class="py-2 font-medium">In July</th></tr></thead><tbody>
${rowsHub}
</tbody></table></div>`;

  // ---- countries on the same time ----
  const same = (key) => all.filter((c) => c.code !== country.code && offsetsFor((c.zones.find((z) => z.id === c.main) || c.zones[0]).id, year)[key] === main[key]);
  const sameJan = same("jan");
  const shown = sameJan.slice(0, 14);
  const sameHtml = shown.length
    ? `
  <h2 class="font-display text-xl font-semibold text-on-surface">Countries on the same time as ${esc(name)} in January</h2>
  <p>These countries' main time zones are on ${esc(fmtOffset(main.jan))} in January: ${shown.map((c) => `<a class="text-primary underline" href="${pageUrl(c)}">${esc(c.name)}</a>`).join(", ")}${sameJan.length > shown.length ? ` and ${sameJan.length - shown.length} more` : ""}.</p>`
    : "";

  // ---- popular conversions (existing pair pages involving this country) ----
  const related = pairPages.filter((p) => p.A.country === name || p.B.country === name);
  const relHtml = related.length
    ? `
  <h2 class="font-display text-xl font-semibold text-on-surface">Popular conversions</h2>
  <p>${related.map((p) => `<a class="text-primary underline" href="${p.url}">${esc(p.A.label)} to ${esc(p.B.label)} time</a>`).join(" · ")}</p>`
    : "";

  const content = `
<section id="more-info" class="px-6 max-w-3xl mx-auto pb-24 font-body text-on-surface-variant leading-relaxed space-y-6">
  <h1 class="font-display text-3xl md:text-4xl font-bold text-on-surface">Time in ${esc(name)}</h1>
  <p>${intro}</p>
  <p>${esc(zoneText)}</p>${zonesHtml}${hubHtml}${sameHtml}${relHtml}
  <p><a class="text-primary underline" href="/time-zones/">Browse time zones by country</a> · <a class="text-primary underline" href="/">{{SITE_NAME}} home</a></p>
</section>`;

  return { title, description, content, preset: { origin: mainZone.id } };
}

function buildIndex(all, year) {
  const items = all
    .slice().sort((a, b) => a.name.localeCompare(b.name))
    .map((c) => {
      const m = c.zones.find((z) => z.id === c.main) || c.zones[0];
      const o = offsetsFor(m.id, year);
      return `<li><a class="text-primary underline" href="${pageUrl(c)}">${esc(c.name)}</a> <span class="text-outline">${esc(offsetRange(o))}${c.zones.length > 1 ? `, ${c.zones.length} zones` : ""}</span></li>`;
    }).join("\n");
  const content = `
<section id="more-info" class="px-6 max-w-3xl mx-auto pb-24 font-body text-on-surface-variant leading-relaxed space-y-6">
  <h1 class="font-display text-3xl md:text-4xl font-bold text-on-surface">Time zones by country</h1>
  <p>Pick a country to see its time zone, daylight saving dates and a table of local times. UTC offsets are shown for January and July. Countries with several time zones show the main one.</p>
  <ul class="columns-1 sm:columns-2 gap-8 space-y-1 text-sm">
${items}
  </ul>
  <p><a class="text-primary underline" href="/">Back to the {{SITE_NAME}} converter</a></p>
</section>`;
  return {
    title: "Time Zones by Country – {{SITE_NAME}}",
    description: "List of countries with their time zones, UTC offsets and daylight saving information. Open any country to convert its time.",
    content,
  };
}

module.exports = { buildCountry, buildIndex, pageUrl };
