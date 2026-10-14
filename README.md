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

## Static pages and site settings

- `src/pages/about.html`, `privacy.html`, `contact.html` become `/about/`, `/privacy/`, `/contact/`.
- `site.config.json` also holds `contactEmail`, `githubUrl`, `authorName` and `analyticsToken`. Paste the Cloudflare Web Analytics token into `analyticsToken` to switch the analytics snippet on; the Privacy page then describes it automatically.
- Update the "Last updated" date in `src/pages/privacy.html` whenever the policy changes.

## Languages

`data/languages.json` lists the languages (English at `/`, Arabic at `/ar/`). For each language:

- `data/lang/<code>.json`: all interface text, tour text and the sentence templates for generated pages (keys starting `gen.`).
- `data/lang/cities.<code>.json`: city/region names by IANA zone id (falls back to English).
- `data/lang/std.<code>.json`: names for time zone entries such as PST or CET.
- `content/<code>/home.html`, `about.html`, `privacy.html`, `contact.html`: the long-form pages.
- Country names come from the browser's built-in `Intl.DisplayNames`.

To add a language, copy the English files, translate them and add a line to `languages.json`. Plural forms follow CLDR categories (`.one`, `.two`, `.few`, `.many`, `.other`). `BUILD_LANGS=en npm run build` builds English only.
