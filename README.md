# RotoRem Varna & Sofia – Project Handover

This repository powers the marketing and lead-generation site for RotoRem (in-home appliance repair teams covering Varna & Sofia). The site is an Astro-based static build deployed to Netlify with a custom blog pipeline, bilingual content, offline support, and optional booking automations. This guide is intended as the full handoff for the next maintainer.

---

## Project Snapshot

- **Live site:** https://www.rotorem.bg  
- **Primary markets:** Varna & Sofia, Bulgaria (Bulgarian is the default language)  
- **Source ownership:** This repo plus a linked Google Apps Script (`Code.gs`) for legacy booking automation  
- **Key business flows:** Phone/email contact, blog SEO funnel, optional Google Sheet + Netlify Email automation

---

## Tech Stack & Tooling

- **Framework:** Astro 5.7.13 with TypeScript
- **Styling:** Tailwind CSS 3.4 + DaisyUI 5, custom theme in `tailwind.config.js`
- **Package manager:** pnpm (`packageManager` lock to pnpm@10.11.0; engines require Node ≥ 18)
- **Lint / Format:** Biome (`pnpm lint`, `pnpm format`)
- **Testing / QA:** Lighthouse CI via `pnpm test:lighthouse`
- **Deployment target:** Netlify (`netlify.toml` governs build, headers, redirects)
- **Analytics:** Google Analytics 4 (loaded via `src/components/Analytics.astro`)
- **Offline:** Custom service worker at `public/sw.js`

Install pnpm locally (`npm install -g pnpm`) if you do not already have it.

---

## Local Development

1. **Install dependencies**
   ```bash
   pnpm install
   ```
   > Do not switch to npm/yarn: the lockfile and scripts expect pnpm.

2. **Run the dev server**
   ```bash
   pnpm dev
   ```
   Astro serves at `http://localhost:4321` by default.

3. **Production build**
   ```bash
   pnpm build
   pnpm preview   # serves the ./dist build locally
   ```

4. **Quality commands**
   ```bash
   pnpm lint        # Biome static analysis
   pnpm format      # Biome formatter (writes in place)
   pnpm type-check  # astro check (TS + Astro)
   pnpm test:lighthouse  # requires a production build; runs LHCI against pnpm preview
   ```

5. **Image and sitemap helpers**
   - `pnpm optimize-images` currently logs/pass (no heavy processing).
   - `pnpm generate-sitemap` triggers `astro build`; use `scripts/validate-sitemap.js` if added later.

> `prebuild` runs `npm run type-check && npm run optimize-images`. Netlify executes this automatically because `prebuild` is an npm lifecycle script.

---

## Environment Variables & Secrets

Create `.env` locally or configure variables on Netlify:

| Variable | Purpose | Notes |
| --- | --- | --- |
| `PUBLIC_GA_MEASUREMENT_ID` | Google Analytics property | Required for production analytics |
| `PUBLIC_GOOGLE_SCRIPT_URL` | Legacy booking form Apps Script endpoint | Currently unused on the front-end; still referenced in docs |
| `NETLIFY_AUTH_TOKEN` | Netlify CLI deploys | Only needed for manual CLI deploys |
| `NETLIFY_SITE_ID` | Netlify CLI deploys | Same as above |
| `NETLIFY_EMAILS_SECRET` | Required if `src/netlify/functions/send-booking-email.js` is re-enabled | Generated in Netlify “Emails” integration |
| `URL` | Netlify-provided base URL (auto-injected in production) | Required for the Netlify email function |

The Google Apps Script (`Code.gs`) relies on:
- Active Google Sheet with matching columns
- Optional Google Calendar and Gmail API permissions
- `CALENDAR_EMAIL` constant inside the script (update if ownership changes)

Store the script in the Drive account that owns the target sheet and deploy as a “web app” accessible by anyone or by the site backend.

---

## Repository Layout

```
src/
  components/         # Hero, Services, Map, ReviewsModal, Analytics, etc.
  layouts/Base.astro  # Global shell: navigation, JSON-LD, hreflang, analytics
  pages/              # Route-based pages (BG default, EN in src/pages/en)
    blog/             # Generated blog posts (see Content workflow below)
    services/         # Service landing pages (Bulgarian + Sofia subsection)
    services/sofia/   # Sofia-specific services
    en/...            # English equivalents (not feature-parity everywhere)
  i18n/               # Language strings (ui.ts) and helpers (utils.ts)
  netlify/functions/  # `send-booking-email` (disabled on front-end currently)
public/               # Static assets, service worker, offline page
blog-input/           # Source HTML snippets for the blog generator
scripts/              # Node scripts for blog pipeline and utilities
Code.gs               # Google Apps Script source for Apps Script deployment
netlify.toml          # Build command, headers, redirects, contexts
lighthouserc.js       # LHCI configuration (desktop & mobile profiles)
```

`dist/` is the Astro build artifact and should not be versioned.

---

## Content & Blog Workflow

The blog is a static-generation pipeline fed by HTML files in `blog-input/`.

### Source content (`blog-input/`)
- Authors drop Bulgarian HTML files (one per post) with optional trailing “Meta title/description” lines.
- File names become the URL slug (lowercase, hyphenated, `.html` suffix).
- Each file should have an accompanying hero image at `public/img/blog/<slug>.webp` (or .jpg/.png). Use `pnpm blog:check-images` to see missing assets.

### Tracking (`.blog-tracking.json`)
- Maintains an array of `scheduled` posts (filename, publishDate, status) plus `published` history.
- `status` values: `scheduled`, `published`. Current file marks all queued posts as `published` from the last run.
- Commit updates after running scheduling/generation so teammates see the queue.

### Key scripts

| Command | Effect |
| --- | --- |
| `pnpm blog:schedule` | Assigns publish dates to new `blog-input` files (default twice a week: Monday & Thursday). Updates `.blog-tracking.json`. |
| `pnpm blog:schedule:show` / `pnpm blog:status` | Prints scheduled vs published posts. |
| `pnpm blog:generate` | Converts `blog-input/*.html` into Astro posts under `src/pages/blog/`. Pulls metadata, selects gradient, read time, etc. |
| `pnpm blog:update-index` | Regenerates `src/pages/blog/index.astro` with post cards and metadata. |
| `pnpm blog:workflow` | Convenience command to run generate + update index. |
| `pnpm blog:publish` | Alias for generate + update index (used when schedule already set). |
| `pnpm blog:clean` | DANGEROUS: wipes generated `.astro` posts and deletes `.blog-tracking.json`. Use only to reset the blog. |
| `pnpm blog:check-images [--show-present]` | Reports which slugs have corresponding images. |
| `node scripts/migrate-tracking-data.js` | One-off tool to migrate old `processed` tracking format → `scheduled/published`. Safe to rerun. |

### Generation details
- Category and gradient selection is heuristic: keywords in the HTML determine categories like “Ремонт на перални”, “Електроуслуги”, etc.
- Default read time: `max(3, ceil(chars/1000))` minutes.
- Publish date is set to current date during generation (display only). If you need date fidelity, adjust generator to respect scheduled publishDate.
- Related posts feature (`generateRelatedPosts`) is stubbed inside `scripts/generate-blog-posts.js`—extend if you need curated suggestions.
- English blog is not auto-generated; only Bulgarian posts exist in `src/pages/blog`. If you introduce English content, create separate pipeline or manual pages under `src/pages/en/blog/`.

---

## Translations, SEO & Marketing Content

- **Language detection:** `src/i18n/utils.ts` inspects the URL prefix (`/en/...`). Bulgarian has no prefix.
- **Strings:** `src/i18n/ui.ts` contains ALL copy for both languages. Bulgarian coverage is nearly complete; English strings exist for core pages but not every nuance (e.g., dryer/boiler services).
- **Navigation & SEO:** `layouts/Base.astro` handles canonical URLs, hreflang, JSON-LD LocalBusiness schema, SEO meta defaults, nav routing, and review modal inclusion.
- **SEO content blocks:** Long-form Bulgarian copy is embedded directly in pages such as `src/pages/index.astro`; watch for duplicates if you start auto-generating.
- **Sitemap:** Controlled by `astro.config.mjs` with custom serialization to avoid English URLs in the sitemap. `@astrojs/sitemap` is configured with `defaultLocale: 'bg'`.
- **Headers/Redirects:** `netlify.toml` enforces CSP, caching, and language-specific redirects (e.g., `/услуги → /services`). There’s also a catch-all SPA redirect (returns `200`), used primarily to support service worker/offline fallback.

> `LanguageToggle.astro` is present but commented out in `Base.astro`. If you restore it, ensure both languages have parity for the linked routes.

---

## Styling & Components

- Tailwind tokens live in `tailwind.config.js`. Custom properties (`--color-primary`, etc.) should be defined in global styles (check `src/styles` or component-level CSS).
- DaisyUI is included with the default “light” theme. If you add more themes, update `tailwind.config.js`.
- Global layout (`Base.astro`) constructs the mega menu dynamically based on `serviceDefinitions`. To add/remove services or cities, update that array.
- Reusable sections:
  - `Hero.astro`, `StatsBar.astro`, `HowItWorks.astro`, `Services.astro`, `FAQ.astro`, `Contact.astro`, `Map.astro`, `Reviews.astro`.
  - `ReviewsModal.astro` contains curated testimonials displayed via floating modal.
  - `Analytics.astro` handles GA loading + custom events (outbound, phone, email, scroll depth).

---

## Offline & Performance

- Service worker (`public/sw.js`) caches core assets and implements cache-first / network-first strategies per asset type.
- Offline fallback (`public/offline.html`) includes emergency contact info. Update copy if phone or pricing changes.
- `public/_headers` duplicates many of the Netlify headers. Netlify applies the file automatically; retain parity with `netlify.toml`.
- `lighthouserc.js` runs LHCI against key BG/EN pages with strict thresholds (Performance ≥ 0.9, Accessibility ≥ 0.95, etc.). Adjust URLs if you add/remove routes.

When you change asset names, bump the cache version constants in `public/sw.js` (`CACHE_NAME`, `STATIC_CACHE`, `DYNAMIC_CACHE`) so clients fetch the new files.

---

## Forms, Booking & Integrations

- **Current strategy (2025):** Online booking funnel is paused; `src/pages/book.astro` asks users to call directly. The contact sections emphasize phone/email CTAs.
- **Legacy flow:** 
  - Front-end previously hit a Google Apps Script endpoint (`PUBLIC_GOOGLE_SCRIPT_URL`) that writes to a Google Sheet, creates a Google Calendar event, and emails admin + customer (see `Code.gs`).
  - Netlify function `src/netlify/functions/send-booking-email.js` proxies to Netlify Emails templates (`src/emails/booking-confirmation/index.html`). Front-end currently does not invoke this function.
- **If re-enabling online booking:**
  1. Deploy `Code.gs` as a web app and update `PUBLIC_GOOGLE_SCRIPT_URL`.
  2. Rebuild the booking form (previously housed in Astro components) to send a POST request with the expected payload fields (see `Code.gs` comments).
  3. Ensure Netlify Email integration is active and `NETLIFY_EMAILS_SECRET` is set. Test the function locally via Netlify CLI (`netlify functions:invoke send-booking-email --payload '{...}'`).

---

## Deployment (Netlify)

- **Build command:** `pnpm install --no-frozen-lockfile && pnpm run build` (matches `netlify.toml`).
- **Publish directory:** `dist`
- **Environment overrides:** `netlify.toml` sets Node 18, PNPM 8, security headers, caching behavior, redirect rules, and context-specific commands (`production`, `deploy-preview`, `branch-deploy`).
- **Forms:** No Netlify Forms currently in use; if you add one, enable in the Netlify UI or `_headers`.
- **Analytics:** GA is the only analytics integrated. Netlify Analytics is optional.

For manual deploys via CLI:
```bash
pnpm build
netlify deploy --prod --dir=dist
```
(Requires `NETLIFY_AUTH_TOKEN` & `NETLIFY_SITE_ID`.)

---

## Testing & QA Checklist

- `pnpm type-check` — run before commits to catch Astro/TS errors.
- `pnpm lint` — Biome static analysis.
- `pnpm format` — autoformat (Biome).
- `pnpm test:lighthouse` — runs LHCI against preview build; ensure port 4321 free.
- Manual verification:
  - Bulgarian & English nav links.
  - Service worker registration (`npm run preview`, check DevTools application tab).
  - Blog index after running `pnpm blog:workflow` (spot-check metadata, images).
  - Netlify redirects (test key ones locally via `netlify dev` if needed).

> The package script `pnpm test:seo` references `scripts/seo-check.js`, which is missing. Either add the script or remove the npm entry to avoid confusion.

---

## Known Issues & Follow-Ups

- `test:seo` script missing (`scripts/seo-check.js` not in repo).
- English pages do not yet cover every BG page (e.g., no EN dryer/boiler services or blog posts). Reintroduce the language switcher only when parity is acceptable.
- `blog-input/` contains duplicate/variant HTML files for some slugs (e.g., `...-remont-na-peralni...` vs `...-remont-na-peralni-varna...`). Clean up to avoid generating duplicates.
- `.blog-tracking.json` currently marks many entries as `status: "published"` with future dates. If you plan scheduled release automation, reset statuses and adjust publish dates.
- Netlify function `send-booking-email` unused; confirm before deleting or re-activating.
- `PUBLIC_GOOGLE_SCRIPT_URL` env var is unused by current front-end. Remove if you do not plan to revive the Google Sheets workflow.

---

## Handoff Checklist for the Next Maintainer

- [ ] Confirm access to Netlify site (builds + Email integration if needed).
- [ ] Obtain Google Workspace access to the Apps Script + target spreadsheet (if reusing automation).
- [ ] Run `pnpm install`, `pnpm dev` to ensure the environment works locally.
- [ ] Familiarize yourself with the blog workflow; try `pnpm blog:status`, then `pnpm blog:workflow`.
- [ ] Review `netlify.toml` headers/CSP before making front-end changes that load new third-party scripts.
- [ ] Update pricing/phone copy site-wide if the business information changes (search in `src/i18n/ui.ts` and static content blocks).
- [ ] If enabling English navigation publicly, audit missing translations and create pages/content duplicates as needed.
- [ ] Keep `public/sw.js` cache names in sync with any asset overhaul.

Reach out to the previous maintainer for any credentials not stored in the repository. Good luck!
