# Time zone converter

Single-page time zone converter. Vanilla JS + the browser's `Intl` API (IANA time zones, handles DST). Tailwind CSS is compiled at build time.

## Build

    npm install
    npm run build      # writes public/ (index.html, style.css, robots.txt, sitemap.xml if siteUrl is set)

## Configure

Edit `site.config.json`:
- `name`: the site name (used in the page title and header)
- `siteUrl`: full URL with https, e.g. `https://example.com`. Leave empty until the domain is live; when set, canonical/og:url tags and a sitemap are generated.

## Deploy

Cloudflare Workers static assets serves the `public/` folder (see `wrangler.jsonc`). Commit `public/` after each build.
