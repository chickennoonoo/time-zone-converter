# Offset Clock

A free time zone converter that understands **time zone names like PST, EST and GMT**, not just cities and countries. Available in **English and Arabic** (right-to-left).

**Live site: [offsetclock.com](https://offsetclock.com)**

![Offset Clock home page](docs/screenshots/home-desktop.png)

## Why I built it

Apps and games announce maintenance like "9 AM PST", and working out what that means in your own time zone is surprisingly annoying. Most converters only handle cities. Offset Clock lets you start from the way the announcement is written, and it warns you about the classic trap: **PST is a fixed UTC-8, but "Pacific time" in summer is PDT (UTC-7)**.

## Features

- Convert between cities, countries and **~40 named time zones** (PST, PDT, EST, GMT, CET, IST, JST and more)
- **Date picker** with daylight saving applied for the chosen date, not just today
- Live clock that follows the current time until you pick one; type an exact time or use the slider
- Click any result for a plain-language explanation ("9:00 AM on Sat, Oct 31 in PST is 7:00 PM in Cairo")
- Business-hours hint showing where it is a good time to reach people
- Guided first-visit tour and 12/24-hour toggle
- **~200 generated pages**: one per country (`/time-in-egypt/`) plus a city-pair page, each built from real time zone data (offsets, daylight saving dates, conversion tables)
- **English and Arabic**: full right-to-left layout, Arabic plural forms, translated city, country and time zone names
- No accounts, no cookies; all conversions run in the browser

![Mobile view](docs/screenshots/home-mobile.png)

| Country page | Arabic (RTL) |
|---|---|
| ![Country page](docs/screenshots/country-page.png) | ![Arabic version](docs/screenshots/arabic.png) |

## How it works

- **No framework and no JavaScript libraries.** Plain HTML, vanilla JavaScript and Tailwind CSS (compiled at build time).
- **Time zone maths uses the browser's built-in `Intl` API** and the IANA time zone database, so daylight saving rules are not hand-coded.
- **A Node build script** (`build.js`) generates the whole site (406 pages across two languages), the sitemap with `hreflang` alternates, and `robots.txt`. Page text is computed from time zone data at build time.
- **Language files** (`data/lang/`) hold all interface text and sentence templates, so adding a language is mostly translation.
- **Hosting:** Cloudflare (static assets), deployed automatically from this repository. Analytics use Cloudflare Web Analytics (cookie-free).

## Interesting problems

- **PST vs PDT.** The abbreviations are fixed offsets, but people use "PST" to mean "Pacific time". The app supports both and tells you when they differ for the selected date.
- **Pages that are actually different.** The country pages are generated, so each one's numbers, daylight saving dates and "same time as" lists are computed from data rather than templated copy.
- **Right-to-left and Arabic grammar.** Mirrored layout, Arabic digits and dates, and correct singular/dual/plural forms ("ساعة واحدة", "ساعتين", "3 ساعات").
- **Hosting blocked in Egypt.** My first host was unreachable from Egypt without a VPN, so I moved the site to a host that loads reliably there.

## How it was built

This project was built with AI assistance (Claude). I defined the problem and requirements, made the product decisions, tested on real devices, found and reported bugs, set up the domain, hosting, analytics and search console, and reviewed the Arabic text. Most of the code was written with Claude under my direction.

## Run it locally

```bash
npm install
npm run build        # generates the site into public/
npx serve public     # then open the address it prints
```

`BUILD_LANGS=en npm run build` builds English only.

## Project structure

```
build.js            generates every page, the sitemap and app scripts
src/template.html   the converter page and its JavaScript
content/<lang>/     long-form pages (home text, About, Privacy, Contact)
data/               countries, places, language files and name translations
lib/                time zone maths and page-text generators
```

## Adding a language

Copy `data/lang/en.json` and the English files in `content/en/`, translate them, and add a line to `data/languages.json`. Plural forms follow the CLDR categories (`.one`, `.two`, `.few`, `.many`, `.other`).
