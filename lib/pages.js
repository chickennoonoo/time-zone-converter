// Generates the content for city-pair landing pages from real tz data (Intl).
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function offsetMinutes(utcMs, tz) {
  const p = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hourCycle: "h23", year: "numeric", month: "numeric", day: "numeric",
    hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(new Date(utcMs)).reduce((a, x) => { a[x.type] = x.value; return a; }, {});
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second);
  return Math.round((asUtc - Math.floor(utcMs / 1000) * 1000) / 60000);
}

function wallToUtc(y, m, d, hh, mm, tz) {
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let off = offsetMinutes(guess, tz);
  let utc = guess - off * 60000;
  off = offsetMinutes(utc, tz);       // re-check across a DST boundary
  return guess - off * 60000;
}

function fmtOffset(min) {
  const sign = min < 0 ? "-" : "+";
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  return "UTC" + sign + h + (m ? ":" + String(m).padStart(2, "0") : "");
}

function fmtClock(utcMs, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(utcMs));
}

function localDateKey(utcMs, tz) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date(utcMs));
}

function dayShift(utcMs, fromTz, toTz) {
  const a = new Date(localDateKey(utcMs, fromTz) + "T00:00:00Z").getTime();
  const b = new Date(localDateKey(utcMs, toTz) + "T00:00:00Z").getTime();
  return Math.round((b - a) / 86400000);
}

// DST transitions in a calendar year: [{utcMs, from, to}]
function transitions(tz, year) {
  const out = [];
  let prev = offsetMinutes(Date.UTC(year, 0, 1), tz);
  for (let t = Date.UTC(year, 0, 1) + 3600000; t < Date.UTC(year + 1, 0, 1); t += 3600000) {
    const cur = offsetMinutes(t, tz);
    if (cur !== prev) { out.push({ utcMs: t, from: prev, to: cur }); prev = cur; }
  }
  return out;
}

function fmtDate(utcMs, tz) {
  return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "long", day: "numeric" }).format(new Date(utcMs));
}

function hoursPhrase(min) {
  const a = Math.abs(min), h = Math.floor(a / 60), m = a % 60;
  const parts = [];
  if (h) parts.push(h + (h === 1 ? " hour" : " hours"));
  if (m) parts.push(m + " minutes");
  return parts.join(" ");
}

function aheadBehind(min, nameB, nameA) {
  if (min === 0) return `${nameB} is on the same time as ${nameA}`;
  return `${nameB} is ${hoursPhrase(min)} ${min > 0 ? "ahead of" : "behind"} ${nameA}`;
}

function zoneSentence(place, year) {
  const tr = transitions(place.zone, year);
  const jan = offsetMinutes(Date.UTC(year, 0, 15, 12), place.zone);
  if (!tr.length) {
    return `${place.label} (${place.country}) is on ${fmtOffset(jan)} all year; its clocks do not change for daylight saving time.`;
  }
  const first = tr[0], second = tr[1];
  let s = `${place.label} (${place.country}) uses daylight saving time.`;
  s += ` In ${year}, its clocks change on ${fmtDate(first.utcMs, place.zone)} (to ${fmtOffset(first.to)})`;
  if (second) s += ` and on ${fmtDate(second.utcMs, place.zone)} (back to ${fmtOffset(second.to)})`;
  return s + ".";
}

function overlapWindow(year, month, day, A, B) {
  const aS = wallToUtc(year, month, day, 9, 0, A.zone), aE = wallToUtc(year, month, day, 17, 0, A.zone);
  const bS = wallToUtc(year, month, day, 9, 0, B.zone), bE = wallToUtc(year, month, day, 17, 0, B.zone);
  const s = Math.max(aS, bS), e = Math.min(aE, bE);
  return e > s ? { s, e } : null;
}

function overlapText(win, A, B) {
  if (!win) return `there is no overlap between 9:00 AM and 5:00 PM in ${A.label} and ${B.label}`;
  return `${fmtClock(win.s, A.zone)} to ${fmtClock(win.e, A.zone)} in ${A.label}, which is ${fmtClock(win.s, B.zone)} to ${fmtClock(win.e, B.zone)} in ${B.label}`;
}

function esc(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }

function buildPair(A, B, year) {
  const janUtc = Date.UTC(year, 0, 15, 12), julUtc = Date.UTC(year, 6, 15, 12);
  const dJan = offsetMinutes(janUtc, B.zone) - offsetMinutes(janUtc, A.zone);
  const dJul = offsetMinutes(julUtc, B.zone) - offsetMinutes(julUtc, A.zone);
  const varies = dJan !== dJul;

  const title = `${A.label} to ${B.label} Time Converter – {{SITE_NAME}}`;
  const description = varies
    ? `Convert ${A.label} time to ${B.label} time. ${aheadBehind(dJan, B.label, A.label)} in January and ${hoursPhrase(dJul) || "0 hours"} ${dJul === 0 ? "" : (dJul > 0 ? "ahead" : "behind")} in July. Free converter with a conversion table.`.replace(/\s+/g, " ")
    : `Convert ${A.label} time to ${B.label} time. ${aheadBehind(dJan, B.label, A.label)} all year. Free converter with a conversion table.`;

  // ---- sections ----
  const diffLine = varies
    ? `${aheadBehind(dJan, B.label, A.label)} in January, and ${aheadBehind(dJul, B.label, A.label).replace(`${B.label} is `, "")} in July. The gap changes because the two places do not change their clocks on the same dates.`
    : `${aheadBehind(dJan, B.label, A.label)} all year, so the gap stays the same in every month.`;

  const hours = [6, 9, 12, 15, 18, 21];
  const rows = hours.map((h) => {
    const jU = wallToUtc(year, 1, 15, h, 0, A.zone), lU = wallToUtc(year, 7, 15, h, 0, A.zone);
    const cell = (u, d) => {
      const sh = dayShift(u, A.zone, B.zone);
      return esc(fmtClock(u, B.zone)) + (sh ? ` <span class="text-outline">(${sh > 0 ? "next day" : "previous day"})</span>` : "");
    };
    const a = esc(fmtClock(jU, A.zone));
    return varies
      ? `<tr class="border-b border-outline-variant/30"><td class="py-2 pr-4">${a}</td><td class="py-2 pr-4">${cell(jU)}</td><td class="py-2">${cell(lU)}</td></tr>`
      : `<tr class="border-b border-outline-variant/30"><td class="py-2 pr-4">${a}</td><td class="py-2">${cell(jU)}</td></tr>`;
  }).join("\n");
  const head = varies
    ? `<th class="py-2 pr-4 font-medium">${esc(A.label)} time</th><th class="py-2 pr-4 font-medium">${esc(B.label)} in January</th><th class="py-2 font-medium">${esc(B.label)} in July</th>`
    : `<th class="py-2 pr-4 font-medium">${esc(A.label)} time</th><th class="py-2 font-medium">${esc(B.label)} time</th>`;

  const oJan = overlapWindow(year, 1, 14, A, B), oJul = overlapWindow(year, 7, 15, A, B);
  const sameOverlap = oJan && oJul && fmtClock(oJan.s, A.zone) === fmtClock(oJul.s, A.zone) && fmtClock(oJan.e, A.zone) === fmtClock(oJul.e, A.zone);
  const overlapHtml = sameOverlap || !varies
    ? `<p>If both sides work 9:00 AM to 5:00 PM, ${esc(overlapText(oJan, A, B))}.</p>`
    : `<p>If both sides work 9:00 AM to 5:00 PM: in January, ${esc(overlapText(oJan, A, B))}. In July, ${esc(overlapText(oJul, A, B))}.</p>`;

  const content = `
<section id="more-info" class="px-6 max-w-3xl mx-auto pb-24 font-body text-on-surface-variant leading-relaxed space-y-6">
  <h1 class="font-display text-3xl md:text-4xl font-bold text-on-surface">${esc(A.label)} to ${esc(B.label)} Time Converter</h1>
  <p>Use the converter above to turn a time in ${esc(A.label)} into ${esc(B.label)} time. Drag the slider or type an exact time, and it updates the other side instantly.</p>
  <h2 class="font-display text-xl font-semibold text-on-surface">Time difference between ${esc(A.label)} and ${esc(B.label)}</h2>
  <p>${esc(diffLine)}</p>
  <p>${esc(zoneSentence(A, year))} ${esc(zoneSentence(B, year))}</p>
  <h2 class="font-display text-xl font-semibold text-on-surface">${esc(A.label)} to ${esc(B.label)} conversion table</h2>
  <div class="overflow-x-auto"><table class="w-full text-left text-sm"><thead><tr class="border-b border-outline-variant/50 text-on-surface">${head}</tr></thead><tbody>
${rows}
</tbody></table></div>
  <h2 class="font-display text-xl font-semibold text-on-surface">Best time to call between ${esc(A.label)} and ${esc(B.label)}</h2>
  ${overlapHtml}
  <p>Working weeks and weekends differ between countries, so check the days as well as the hours before you schedule a meeting.</p>
  <p><a class="text-primary underline" href="/">Convert any other time zones on the {{SITE_NAME}} homepage</a>.</p>
</section>`;

  return { title, description, content, h1: `${A.label} to ${B.label}` };
}

module.exports = { buildPair, offsetMinutes, transitions, fmtOffset, wallToUtc };
