// Build: compile Tailwind -> public/style.css, render src/template.html -> public/index.html,
// and write robots.txt (+ sitemap.xml once siteUrl is set in site.config.json).
const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const cfg = JSON.parse(fs.readFileSync("site.config.json", "utf8"));
const siteUrl = (cfg.siteUrl || "").replace(/\/+$/, "");
const fill = (s) => s.replace(/\{\{SITE_NAME\}\}/g, cfg.name);

fs.mkdirSync("public", { recursive: true });
execSync("npx tailwindcss -i src/input.css -o public/style.css --minify", { stdio: "inherit" });

const tokens = {
  TITLE: fill(cfg.title),
  DESCRIPTION: fill(cfg.description),
  CANONICAL: siteUrl ? `<link rel="canonical" href="${siteUrl}/"/>` : "",
  OG_URL: siteUrl ? `<meta property="og:url" content="${siteUrl}/"/>` : "",
};
let html = fs.readFileSync("src/template.html", "utf8");
html = fill(html).replace(/\{\{(TITLE|DESCRIPTION|CANONICAL|OG_URL)\}\}/g, (_, k) => tokens[k]);
fs.writeFileSync("public/index.html", html);

fs.writeFileSync("public/robots.txt",
  "User-agent: *\nAllow: /\n" + (siteUrl ? `Sitemap: ${siteUrl}/sitemap.xml\n` : ""));
if (siteUrl) {
  fs.writeFileSync("public/sitemap.xml",
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${siteUrl}/</loc></url>\n</urlset>\n`);
} else if (fs.existsSync("public/sitemap.xml")) {
  fs.unlinkSync("public/sitemap.xml");
}
console.log("Built public/ for", cfg.name, siteUrl || "(no siteUrl set yet)");
