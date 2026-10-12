# Time zone converter

Single-page time zone converter. Vanilla JS + the browser's `Intl` API (IANA time zones, handles DST). Tailwind CSS is compiled at build time.

## Build

    npm install
    npm run build      # generates the whole site into public/ (homepage, city pages, country pages, sitemap)

## Configure

Edit `site.config.json`:
- `name`: the site name (used in the page title and header)
- `siteUrl`: full URL with https, e.g. `https://example.com`. Leave empty until the domain is live; when set, canonical/og:url tags and a sitemap are generated.

## Deploy

Cloudflare runs `npm run build` on every commit, then serves the generated `public/` folder (see `wrangler.jsonc`). `public/` is generated, so it is not committed.

## City-pair pages

- `data/places.json`: the places (slug, label, country, IANA zone).
- `data/pairs.json`: which pairs get a landing page, e.g. `["cairo","dubai"]` builds `/cairo-to-dubai/`.
- `lib/pages.js`: generates each page's text (offsets, daylight-saving dates, conversion table, call overlap) from real time zone data at build time.
Add a place and a pair, run `npm run build`, commit. The sitemap updates automatically.

## Country pages

`data/countries.json` lists every country with its zones and a `main` zone (the one the page starts from). `lib/countries.js` builds `/time-in-<country>/` and the `/time-zones/` index. Cards in the app link to these pages.
