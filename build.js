// Build the whole site: for every language, render the converter pages (home, country, city pair, index)
// and the static pages, plus app JS, sitemap and robots.txt. Output goes to public/.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");
const { makeLang, readJson } = require("./lib/lang.js");
const { makeGen } = require("./lib/gen.js");

const cfg = readJson("site.config.json");
const siteUrl = (cfg.siteUrl || "").replace(/\/+$/, "");
const year = new Date().getUTCFullYear();
const places = Object.fromEntries(readJson("data/places.json").map((p) => [p.slug, p]));
const pairs = readJson("data/pairs.json");
const countries = readJson("data/countries.json");
let langDefs = readJson("data/languages.json");
if (process.env.BUILD_LANGS) langDefs = langDefs.filter((d) => process.env.BUILD_LANGS.split(",").includes(d.code));
const siteHost = siteUrl ? siteUrl.replace(/^https?:\/\//, "") : cfg.name;
const fill = (s) => s.replace(/\{\{SITE_NAME\}\}/g, cfg.name);
const escAttr = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

fs.mkdirSync("public", { recursive: true });
execSync("npx tailwindcss -i src/input.css -o public/style.css --minify", { stdio: "inherit" });

// ---- app template: the script is identical on every page of a language, so ship it once as a cached file ----
const rawTemplate = fs.readFileSync("src/template.html", "utf8");
const scriptStart = rawTemplate.lastIndexOf("<script>");
const scriptEnd = rawTemplate.indexOf("</script>", scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error("Could not find the app <script> in src/template.html");
const appSource = rawTemplate.slice(scriptStart + "<script>".length, scriptEnd);
const countriesJson = JSON.stringify(countries);

const langs = langDefs.map((d) => {
  const L = makeLang(d);
  L.gen = makeGen(L);
  const appStrings = Object.fromEntries(Object.entries(L.S).filter(([k]) => !/^(gen\.|meta\.|hub\.|privacy\.|footer\.|home\.|logo\.)/.test(k)).map(([k, v]) => [k, fill(v)]));
  const boot = `const LANG = ${JSON.stringify(L.code)};\nconst LANG_PREFIX = ${JSON.stringify(L.prefix)};\nconst LOCALE = ${JSON.stringify(L.locale)};\nconst STRINGS = ${JSON.stringify(appStrings)};\nconst STD_L10N = ${JSON.stringify(L.std)};\nconst CITIES_L10N = ${JSON.stringify(L.cities)};`;
  const appJs = fill(appSource).replace("{{LANG_BOOT}}", () => boot).replace("{{COUNTRIES_JSON}}", () => countriesJson);
  const file = L.code === "en" ? "app.js" : `app.${L.code}.js`;
  fs.writeFileSync(path.join("public", file), appJs);
  L.appTag = `<script src="/${file}?v=${crypto.createHash("sha1").update(appJs).digest("hex").slice(0, 10)}" defer></script>`;
  L.footer = fill(`<footer class="px-6 pb-12 max-w-3xl mx-auto font-body text-sm text-on-surface-variant">
  <nav class="flex flex-wrap gap-x-6 gap-y-2 border-t border-outline-variant/30 pt-6" aria-label="${escAttr(L.g("footer.aria"))}">
    <a class="hover:text-primary" href="${L.url("/time-zones/")}">${L.g("footer.timezones")}</a>
    <a class="hover:text-primary" href="${L.url("/about/")}">${L.g("footer.about")}</a>
    <a class="hover:text-primary" href="${L.url("/privacy/")}">${L.g("footer.privacy")}</a>
    <a class="hover:text-primary" href="${L.url("/contact/")}">${L.g("footer.contact")}</a>
  </nav>
  <p class="mt-4 text-outline">&copy; ${year} {{SITE_NAME}}</p>
</footer>`);
  return L;
});

const analyticsHtml = cfg.analyticsToken
  ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: cfg.analyticsToken })}'></script>`
  : "";

function templateFor(L) {
  const tpl = rawTemplate.slice(0, scriptStart) + L.appTag + rawTemplate.slice(scriptEnd + "</script>".length);
  const headEnd = tpl.indexOf("</head>") + "</head>".length;
  const staticTpl = tpl.slice(0, headEnd) + `
<body class="bg-background text-on-background min-h-screen">
<header class="bg-[#12131b] docked full-width top-0 z-50 fixed w-full">
<div class="flex items-center justify-between gap-3 px-4 sm:px-6 py-4 w-full">
<a href="{{HOME_URL}}" class="flex items-center gap-2 sm:gap-3 min-w-0" aria-label="{{t:logo.aria}}" title="{{t:logo.title}}">
<span class="material-symbols-outlined text-[#9aa8ff] text-2xl">public</span>
<p class="font-['Space_Grotesk'] font-bold text-xl sm:text-2xl tracking-tight text-[#9aa8ff]">{{SITE_NAME}}</p>
</a>
<div class="flex items-center gap-2 sm:gap-4">{{LANG_SWITCH}}</div>
</div>
</header>
<main class="pt-24 pb-12">
{{CONTENT}}
</main>
{{FOOTER}}
{{ANALYTICS}}
</body>
</html>
`;
  return { app: tpl, stat: staticTpl };
}

function render(L, { title, description, urlPath, srH1, content, preset, kind }) {
  const tpls = templateFor(L);
  const tpl = kind === "static" ? tpls.stat : tpls.app;
  const alternates = siteUrl && langs.length > 1
    ? langs.map((o) => `<link rel="alternate" hreflang="${o.code}" href="${siteUrl}${o.prefix}${urlPath}"/>`).join("") +
      `<link rel="alternate" hreflang="x-default" href="${siteUrl}${langs[0].prefix}${urlPath}"/>`
    : "";
  const others = langs.filter((o) => o.code !== L.code);
  const switcher = others.map((o) => `<a href="${o.prefix}${urlPath}" hreflang="${o.code}" lang="${o.code}" class="font-label text-sm font-bold text-[#9aa8ff] hover:text-primary px-1 sm:px-2 py-1 rounded-full" title="${escAttr(o.native)}">${o.native}</a>`).join("");
  const fillPage = (s) => fill(s)
    .replace(/\{\{CONTACT_EMAIL\}\}/g, cfg.contactEmail || "")
    .replace(/\{\{GITHUB_URL\}\}/g, cfg.githubUrl || "#")
    .replace(/\{\{AUTHOR\}\}/g, L.code === "en" ? (cfg.authorName || cfg.name) : (L.S["author.name"] || cfg.authorName || cfg.name))
    .replace(/\{\{SITE_HOST\}\}/g, siteHost)
    .replace(/\{\{ANALYTICS_PARAGRAPH\}\}/g, () => (cfg.analyticsToken ? L.g("privacy.analytics") : ""));
  const tokens = {
    TITLE: fill(title),
    DESCRIPTION: fill(description),
    CANONICAL: (siteUrl ? `<link rel="canonical" href="${siteUrl}${L.prefix}${urlPath}"/>` : "") + alternates,
    OG_URL: siteUrl ? `<meta property="og:url" content="${siteUrl}${L.prefix}${urlPath}"/>` : "",
    SR_H1: srH1 || "",
    CONTENT: fillPage(content || ""),
    FOOTER: L.footer,
    ANALYTICS: analyticsHtml,
    PRESET: preset ? `<script>window.OFFSET_PRESET=${JSON.stringify(preset)};</script>` : "",
    LANG_ATTRS: L.dir === "rtl" ? `lang="${L.code}" dir="rtl"` : `lang="${L.code}"`,
    EXTRA_HEAD: L.S["head.extra"] || "",
    HOME_URL: L.url("/"),
    LANG_SWITCH: switcher,
  };
  const out = fill(tpl)
    .replace(/\{\{t:([\w.\-]+)\}\}/g, (_, k) => escAttr(fill(L.g(k))))
    .replace(/\{\{(TITLE|DESCRIPTION|CANONICAL|OG_URL|SR_H1|CONTENT|FOOTER|ANALYTICS|PRESET|LANG_ATTRS|EXTRA_HEAD|HOME_URL|LANG_SWITCH)\}\}/g, (_, k) => tokens[k]);
  return out;
}

function write(L, urlPath, html) {
  const dir = path.join("public", L.prefix.replace(/^\//, ""), urlPath.replace(/^\//, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), html);
}

const urls = []; // paths without language prefix
const add = (p) => { if (!urls.includes(p)) urls.push(p); };

for (const L of langs) {
  const readContent = (name) => fs.readFileSync(path.join("content", L.code, name + ".html"), "utf8");
  // Home
  write(L, "/", render(L, {
    title: L.g("meta.home.title"), description: L.g("meta.home.description"), urlPath: "/",
    srH1: `<h1 class="sr-only">${escAttr(L.g("home.srh1"))}</h1>`, content: readContent("home"),
  }));
  add("/");
  // City pairs
  const pairPages = pairs.map(([a, b]) => ({ A: places[a], B: places[b], url: L.url(`/${places[a].slug}-to-${places[b].slug}/`) }));
  for (const [a, b] of pairs) {
    const A = places[a], B = places[b];
    if (!A || !B) throw new Error(`Unknown place in pair: ${a}, ${b}`);
    const slug = `/${A.slug}-to-${B.slug}/`;
    const page = L.gen.buildPair(A, B, year);
    write(L, slug, render(L, { title: page.title, description: page.description, urlPath: slug, content: page.content, preset: { origin: A.zone, destinations: [B.zone] } }));
    add(slug);
  }
  // Countries
  for (const c of countries) {
    const page = L.gen.buildCountry(c, countries, pairPages, year);
    const slug = `/time-in-${c.slug}/`;
    write(L, slug, render(L, { title: page.title, description: page.description, urlPath: slug, content: page.content, preset: page.preset }));
    add(slug);
  }
  // Index
  {
    const page = L.gen.buildIndex(countries, year);
    write(L, "/time-zones/", render(L, { title: page.title, description: page.description, urlPath: "/time-zones/", content: page.content }));
    add("/time-zones/");
  }
  // Static pages
  for (const slug of ["about", "privacy", "contact"]) {
    write(L, `/${slug}/`, render(L, {
      title: L.g(`meta.${slug}.title`), description: L.g(`meta.${slug}.description`), urlPath: `/${slug}/`, kind: "static", content: readContent(slug),
    }));
    add(`/${slug}/`);
  }
}

fs.writeFileSync("public/robots.txt", "User-agent: *\nAllow: /\n" + (siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ""));
if (siteUrl) {
  const body = [];
  for (const L of langs) {
    for (const u of urls) {
      const alts = langs.length > 1 ? langs.map((o) => `<xhtml:link rel="alternate" hreflang="${o.code}" href="${siteUrl}${o.prefix}${u}"/>`).join("") : "";
      body.push(`  <url><loc>${siteUrl}${L.prefix}${u}</loc>${alts}</url>`);
    }
  }
  fs.writeFileSync("public/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${body.join("\n")}\n</urlset>\n`);
} else if (fs.existsSync("public/sitemap.xml")) {
  fs.unlinkSync("public/sitemap.xml");
}
console.log(`Built ${urls.length * langs.length} page(s) in ${langs.length} language(s) for ${cfg.name}`, siteUrl || "(no siteUrl set)");
