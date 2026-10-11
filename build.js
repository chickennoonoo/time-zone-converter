// Build: compile Tailwind -> public/style.css, render src/template.html into
// public/index.html (homepage) and one landing page per entry in data/pairs.json,
// then write robots.txt and sitemap.xml (sitemap/canonicals need siteUrl set in site.config.json).
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");
const { buildPair } = require("./lib/pages.js");

const cfg = JSON.parse(fs.readFileSync("site.config.json", "utf8"));
const siteUrl = (cfg.siteUrl || "").replace(/\/+$/, "");
const year = new Date().getUTCFullYear();
const fill = (s) => s.replace(/\{\{SITE_NAME\}\}/g, cfg.name);
const places = Object.fromEntries(JSON.parse(fs.readFileSync("data/places.json", "utf8")).map((p) => [p.slug, p]));
const pairs = JSON.parse(fs.readFileSync("data/pairs.json", "utf8"));

fs.mkdirSync("public", { recursive: true });
execSync("npx tailwindcss -i src/input.css -o public/style.css --minify", { stdio: "inherit" });

const template = fs.readFileSync("src/template.html", "utf8");
const homeContent = fs.readFileSync("src/home-content.html", "utf8");

function render({ title, description, urlPath, srH1, content, preset }) {
  const tokens = {
    TITLE: fill(title),
    DESCRIPTION: fill(description),
    CANONICAL: siteUrl ? `<link rel="canonical" href="${siteUrl}${urlPath}"/>` : "",
    OG_URL: siteUrl ? `<meta property="og:url" content="${siteUrl}${urlPath}"/>` : "",
    SR_H1: srH1 || "",
    CONTENT: fill(content || ""),
    PRESET: preset ? `<script>window.OFFSET_PRESET=${JSON.stringify(preset)};</script>` : "",
  };
  return fill(template).replace(/\{\{(TITLE|DESCRIPTION|CANONICAL|OG_URL|SR_H1|CONTENT|PRESET)\}\}/g,
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
