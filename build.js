// Build: compile Tailwind -> public/style.css, render src/template.html into
// public/index.html (homepage) and one landing page per entry in data/pairs.json,
// then write robots.txt and sitemap.xml (sitemap/canonicals need siteUrl set in site.config.json).
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { buildPair } = require("./lib/pages.js");
const { buildCountry, buildIndex, pageUrl } = require("./lib/countries.js");

const cfg = JSON.parse(fs.readFileSync("site.config.json", "utf8"));
const siteUrl = (cfg.siteUrl || "").replace(/\/+$/, "");
const year = new Date().getUTCFullYear();
const fill = (s) => s.replace(/\{\{SITE_NAME\}\}/g, cfg.name);
const places = Object.fromEntries(JSON.parse(fs.readFileSync("data/places.json", "utf8")).map((p) => [p.slug, p]));
const pairs = JSON.parse(fs.readFileSync("data/pairs.json", "utf8"));
const countries = JSON.parse(fs.readFileSync("data/countries.json", "utf8"));
const strings = JSON.parse(fs.readFileSync("data/strings.en.json", "utf8"));

fs.mkdirSync("public", { recursive: true });
execSync("npx tailwindcss -i src/input.css -o public/style.css --minify", { stdio: "inherit" });

// The app script is identical on every page, so ship it once as /app.js (cached by browsers)
// instead of inlining ~80 KB into each of the ~200 pages.
const rawTemplate = fs.readFileSync("src/template.html", "utf8");
const scriptStart = rawTemplate.lastIndexOf("<script>");
const scriptEnd = rawTemplate.indexOf("</script>", scriptStart);
if (scriptStart < 0 || scriptEnd < 0) throw new Error("Could not find the app <script> in src/template.html");
const appJs = fill(rawTemplate.slice(scriptStart + "<script>".length, scriptEnd)).replace("{{COUNTRIES_JSON}}", () => JSON.stringify(countries)).replace("{{STRINGS_JSON}}", () => JSON.stringify(strings));
fs.writeFileSync("public/app.js", appJs);
const appHash = require("crypto").createHash("sha1").update(appJs).digest("hex").slice(0, 10);
const template = rawTemplate.slice(0, scriptStart) + `<script src="/app.js?v=${appHash}" defer></script>` + rawTemplate.slice(scriptEnd + "</script>".length);
const homeContent = fs.readFileSync("src/home-content.html", "utf8");

const siteHost = siteUrl ? siteUrl.replace(/^https?:\/\//, "") : cfg.name;
const footerHtml = fill(`<footer class="px-6 pb-12 max-w-3xl mx-auto font-body text-sm text-on-surface-variant">
  <nav class="flex flex-wrap gap-x-6 gap-y-2 border-t border-outline-variant/30 pt-6" aria-label="Footer">
    <a class="hover:text-primary" href="/time-zones/">Time zones by country</a>
    <a class="hover:text-primary" href="/about/">About</a>
    <a class="hover:text-primary" href="/privacy/">Privacy</a>
    <a class="hover:text-primary" href="/contact/">Contact</a>
  </nav>
  <p class="mt-4 text-outline">&copy; ${year} {{SITE_NAME}}</p>
</footer>`);
const analyticsHtml = cfg.analyticsToken
  ? `<script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='${JSON.stringify({ token: cfg.analyticsToken })}'></script>`
  : "";
const analyticsParagraph = cfg.analyticsToken
  ? `<h2 class="font-display text-xl font-semibold text-on-surface">Analytics</h2>
  <p>We use Cloudflare Web Analytics to count visits, pages and countries in aggregate. It is designed to work without cookies and without tracking individual visitors across sites, and it helps us see which pages are useful.</p>`
  : "";
const fillPage = (s) => fill(s)
  .replace(/\{\{CONTACT_EMAIL\}\}/g, cfg.contactEmail || "")
  .replace(/\{\{GITHUB_URL\}\}/g, cfg.githubUrl || "#")
  .replace(/\{\{AUTHOR\}\}/g, cfg.authorName || cfg.name)
  .replace(/\{\{SITE_HOST\}\}/g, siteHost)
  .replace(/\{\{ANALYTICS_PARAGRAPH\}\}/g, () => analyticsParagraph);

const headEnd = template.indexOf("</head>") + "</head>".length;
const staticTemplate = template.slice(0, headEnd) + `
<body class="bg-background text-on-background min-h-screen">
<header class="bg-[#12131b] docked full-width top-0 z-50 fixed w-full">
<div class="flex items-center justify-between px-6 py-4 w-full">
<a href="/" class="flex items-center gap-3" aria-label="{{SITE_NAME}} home" title="Go to the {{SITE_NAME}} home page">
<span class="material-symbols-outlined text-[#9aa8ff] text-2xl">public</span>
<p class="font-['Space_Grotesk'] font-bold text-2xl tracking-tight text-[#9aa8ff]">{{SITE_NAME}}</p>
</a>
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

function render({ title, description, urlPath, srH1, content, preset, tpl }) {
  const tokens = {
    TITLE: fill(title),
    DESCRIPTION: fill(description),
    CANONICAL: siteUrl ? `<link rel="canonical" href="${siteUrl}${urlPath}"/>` : "",
    OG_URL: siteUrl ? `<meta property="og:url" content="${siteUrl}${urlPath}"/>` : "",
    SR_H1: srH1 || "",
    CONTENT: fillPage(content || ""),
    FOOTER: footerHtml,
    ANALYTICS: analyticsHtml,
    PRESET: preset ? `<script>window.OFFSET_PRESET=${JSON.stringify(preset)};</script>` : "",
  };
  return fill(tpl || template).replace(/\{\{(TITLE|DESCRIPTION|CANONICAL|OG_URL|SR_H1|CONTENT|FOOTER|ANALYTICS|PRESET)\}\}/g,
    (_, k) => tokens[k]);
}

const urls = ["/"];

// Homepage
fs.writeFileSync("public/index.html", render({
  title: cfg.title, description: cfg.description, urlPath: "/",
  srH1: '<h1 class="sr-only">Time zone converter: convert any time between world time zones</h1>',
  content: homeContent,
}));

// Pair pages
for (const [a, b] of pairs) {
  const A = places[a], B = places[b];
  if (!A || !B) throw new Error(`Unknown place in pair: ${a}, ${b}`);
  const slug = `${A.slug}-to-${B.slug}`;
  const page = buildPair(A, B, year);
  fs.mkdirSync(path.join("public", slug), { recursive: true });
  fs.writeFileSync(path.join("public", slug, "index.html"), render({
    title: page.title, description: page.description, urlPath: `/${slug}/`,
    content: page.content, preset: { origin: A.zone, destinations: [B.zone] },
  }));
  urls.push(`/${slug}/`);
}

// Pair pages: collect info first so country pages can link to them
const pairPages = pairs.map(([a, b]) => ({ A: places[a], B: places[b], url: `/${places[a].slug}-to-${places[b].slug}/` }));

// Country pages
for (const c of countries) {
  const page = buildCountry(c, countries, pairPages, year);
  const dir = path.join("public", `time-in-${c.slug}`);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "index.html"), render({
    title: page.title, description: page.description, urlPath: pageUrl(c),
    content: page.content, preset: page.preset,
  }));
  urls.push(pageUrl(c));
}

// Index of all countries
{
  const page = buildIndex(countries, year);
  fs.mkdirSync("public/time-zones", { recursive: true });
  fs.writeFileSync("public/time-zones/index.html", render({
    title: page.title, description: page.description, urlPath: "/time-zones/", content: page.content,
  }));
  urls.push("/time-zones/");
}

// Static pages: About, Privacy, Contact
for (const [slug, title, description] of [
  ["about", "About {{SITE_NAME}}", "About {{SITE_NAME}}: a free time zone converter that understands PST, EST, GMT and other time zone names as well as cities and countries."],
  ["privacy", "Privacy Policy – {{SITE_NAME}}", "How {{SITE_NAME}} handles data: conversions run in your browser and the site does not collect the times or places you enter."],
  ["contact", "Contact – {{SITE_NAME}}", "Contact {{SITE_NAME}} to report a wrong time, ask a question or suggest a feature."],
]) {
  fs.mkdirSync(path.join("public", slug), { recursive: true });
  fs.writeFileSync(path.join("public", slug, "index.html"), render({
    title, description, urlPath: `/${slug}/`, tpl: staticTemplate,
    content: fs.readFileSync(path.join("src", "pages", slug + ".html"), "utf8"),
  }));
  urls.push(`/${slug}/`);
}

fs.writeFileSync("public/robots.txt",
  "User-agent: *\nAllow: /\n" + (siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ""));
if (siteUrl) {
  const body = urls.map((u) => `  <url><loc>${siteUrl}${u}</loc></url>`).join("\n");
  fs.writeFileSync("public/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${body}\n</urlset>\n`);
} else if (fs.existsSync("public/sitemap.xml")) {
  fs.unlinkSync("public/sitemap.xml");
}
console.log(`Built ${urls.length} page(s) for ${cfg.name}`, siteUrl || "(no siteUrl set)");
