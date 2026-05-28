# Gluten Defender — Product Requirements Document (PRD)

> **Status:** Living document — this is the single source of truth for the project.
> **Version:** 0.1.0
> **Last updated:** 2026-05-27
> **Owner (Project Lead / Visionary):** vrostbyte
> **Architect / Prompt Master:** Isaac (Claude)
> **Implementation:** Claude Code (fallback: Antigravity CLI)

---

## 0. How to use this document

This PRD is meant to be edited constantly. Whenever a decision is made, a feature
ships, or scope changes, update the relevant section AND add a line to the
**Changelog** at the bottom. Keep the **Version** and **Last updated** fields current.

The PRD is the contract between the three roles on this project:

- **Project Lead / Visionary (you):** owns the vision, makes product decisions, approves scope.
- **Architect / Prompt Master (Isaac):** turns vision into specs and into precise build instructions.
- **Implementer (Claude Code / Antigravity):** writes the code against the specs.

If something isn't written here, it isn't decided yet.

---

## 1. Vision

Gluten Defender is a mobile-first web app (installable to a phone's home screen as a
PWA) that acts as a single, trustworthy companion for people living with celiac
disease and gluten intolerance. It helps a person answer, in seconds, the questions
that otherwise cause daily stress and risk:

- *Is this product in my hand safe to eat?*
- *What did I eat, and did it make me feel bad?*
- *Where near me can I safely eat or shop?*
- *Is this ingredient secretly gluten?*
- *What have other people in my situation learned about this product or place?*

## 2. The problem

People with celiac disease must avoid even trace amounts of gluten or risk real
physical harm. Today the information they need is fragmented across product labels,
multiple apps, forums, and word of mouth. Existing tools each solve one slice
(barcode lookup, OR restaurant finder, OR community reviews) but none combine them,
and free data is often incomplete or not celiac-specific. Gluten Defender unifies
these into one tool, with a community and a safety-judgment layer that is the
product's real differentiator.

## 3. Target users

1. **Primary:** People diagnosed with celiac disease who need high-confidence,
   cross-contamination-aware answers.
2. **Secondary:** People with non-celiac gluten sensitivity or who are gluten-free
   by choice (lower stakes, but same workflows).
3. **Tertiary:** Caregivers, parents, and partners shopping/cooking for someone
   with celiac disease.

## 4. Core principles (non-negotiable)

These guide every feature and every line of code.

1. **Safety over confidence.** The app is *decision support*, never a medical
   guarantee and never medical advice. Every product verdict — including "Safe" —
   must prompt the user to verify the physical packaging. We surface uncertainty
   honestly; we never fake certainty we don't have.
2. **Mobile-first, one-handed.** Designed for a phone, used on the go, often
   one-handed in a store aisle. Big tap targets, fast loads, works on a weak signal.
3. **Fast is a feature.** The scan-to-verdict path must feel instant. Cache
   aggressively; never block the user on a slow third party.
4. **Own the trust layer.** External data (Open Food Facts, Google Places) is
   plumbing. Our celiac-safety verdicts, community verifications, and curated data
   are what we own and what makes us valuable.
5. **Respect the user's data.** Health data (symptom/food logs) is sensitive.
   It is private by default, never shared, protected at the database level.
6. **Honest attribution.** We comply with the licenses of data we use
   (Open Food Facts is ODbL — attribution required, contribute improvements back).

## 5. Scope

### In scope (eventually)
- Barcode scanning + gluten-safety verdict
- Product search and browsing
- Hidden-gluten ingredient glossary
- Personal food + symptom journal
- Saved/bookmarked products and places
- Nearby gluten-friendly places (map + list)
- Community: product safety reports, place reviews, a feed
- Installable PWA with offline-friendly behavior and (later) push notifications

### Out of scope (for now — record here so we don't drift)
- Native iOS/Android app store apps (we are a PWA)
- Medical diagnosis, treatment advice, or any claim of medical authority
- Recipe generation engine (may revisit; not core)
- Monetization / payments (revisit after product-market fit)
- Full social network features (DMs, follower graphs) beyond a basic feed

## 6. Tech stack & infrastructure

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router), React, TypeScript** | First-class on Vercel; serverless API routes let us hide keys, cache, and run verdict logic server-side; best-documented stack for the implementer. |
| Hosting | **Vercel** | Tight Next.js integration, simple deploys, env-var secret management, edge caching. |
| Database / Auth / Storage | **Supabase** (Postgres, Auth, Storage, Realtime, Row Level Security) | One service covers DB, login, file storage, and per-user data isolation via RLS. |
| Email | **Resend** | Transactional email (verification, password reset, later digests). |
| Styling | **Tailwind CSS** (+ a component approach TBD) | Fast, mobile-first utility styling; pairs well with Next.js. |
| PWA | Web app manifest + service worker (e.g. `next-pwa` or `@serwist/next`) | Home-screen install, offline shell, caching. |
| Barcode scanning | **Native `BarcodeDetector` API where available, `@zxing/browser` fallback** | Native API is fast/free but unsupported on iOS Safari & Firefox; fallback ensures iPhone users (a large share) can scan. |

### External data sources
- **Open Food Facts** — product/barcode/ingredient/allergen data. Free, no API key,
  ~4M products, ODbL license (attribution + contribute-back required).
  Query via our own API route; cache results in Supabase.
- **Google Places API** — discovery of nearby restaurants/grocers. Paid per usage;
  has Terms of Service constraints on caching/display — review before building Phase 3.
- **(Our own community data)** — the celiac-safety layer on top of both.

### Repository
- GitHub: `https://github.com/vrostbyte/gluten-defender`
- Deploy target: Vercel (connect repo for auto-deploys)

## 7. The Verdict Engine (the core differentiator)

The Verdict Engine converts raw product data into a celiac-safety verdict. It does
**not** return a binary yes/no. It returns a **confidence tier** plus the reasoning.

### Tiers
| Tier | Meaning |
|---|---|
| **Safe** | Certified gluten-free label present; no gluten ingredients; no cross-contamination warning. |
| **Likely safe** | No gluten ingredients detected, but no certification. |
| **Caution** | "May contain" / shared-facility warnings, or an ambiguous ingredient present. |
| **Unsafe** | Contains a known gluten source (wheat, barley, rye, malt, triticale, spelt, etc.). |
| **Unknown** | Insufficient data. Prompt user to read the label and optionally contribute. |

### Inputs to a verdict
1. Open Food Facts allergen tags + ingredient text + labels (e.g. "gluten-free").
2. Ingredient-text parsing against a **hidden-gluten glossary** (malt, brewer's yeast,
   modified food starch, maltodextrin (context-dependent), etc.).
3. Cross-contamination signals ("may contain", "made in a facility...").
4. **Community signals** — reports from users ("I reacted to this" / "verified safe").
5. **Manual overrides** — curator corrections stored in our DB take precedence.

### Hard rules
- Every verdict — including Safe — displays a "verify the physical packaging" notice.
- Never present a verdict as medical advice or a guarantee.
- When data is missing or contradictory, prefer **Caution/Unknown** over a false Safe.
- Always show *why* (the evidence behind the tier) so the user can judge for themselves.

## 8. Feature specifications by phase

> Acceptance criteria are written so the implementer knows when a phase is "done"
> and the lead knows what to test.

### Phase 0 — Foundation
**Goal:** A deployed, installable shell a user can log into.
- Initialize Next.js (App Router, TypeScript, Tailwind).
- Add `.gitignore`, `README.md`, env-var template (`.env.example`).
- Connect Supabase; set up Auth (email/password to start).
- Add PWA manifest + service worker; verify "Add to Home Screen" works on iOS & Android.
- Deploy to Vercel from the GitHub repo.
- Basic app shell: bottom tab navigation (Scan / Log / Explore / Profile placeholders).

**Acceptance:** Visiting the Vercel URL on a phone lets you install it, sign up, log
in, and see the navigation shell.

### Phase 1 — MVP: Scan → Verdict → Save (the magic moment)
**Goal:** Scan a barcode and get a trustworthy verdict.
- Camera-based barcode scanner (native API + ZXing fallback).
- API route: barcode → check Supabase cache → else Open Food Facts → store in cache.
- Verdict Engine v1 (tiers + hidden-gluten glossary + cross-contamination flags).
- Product result screen: verdict tier, evidence/reasoning, "verify packaging" notice.
- Save/bookmark a product.
- Manual barcode entry fallback (for damaged/unscannable codes).
- "Product not found" path: clear message + (later) contribute flow.

**Acceptance:** Scanning a real product returns a verdict with reasoning in under a
couple seconds, and the result can be saved and re-opened later.

### Phase 2 — Journal & knowledge
**Goal:** Track intake/symptoms and look things up.
- Food/symptom journal: log items eaten (link to scanned products where possible),
  log symptoms/reactions with timestamps; private via RLS.
- Simple history view + ability to spot patterns (basic, no fancy analytics yet).
- Searchable hidden-gluten ingredient glossary.
- Product search (by name/brand) via Open Food Facts.

**Acceptance:** A user can log a meal and a reaction, and search whether an
ingredient contains gluten.

### Phase 3 — Places
**Goal:** Find somewhere safe to eat/shop nearby.
- Map + list of nearby restaurants/grocers (Google Places).
- Filter for gluten-free-friendly; show our community celiac-safety rating where it exists.
- Place detail page; save/bookmark a place.
- (Review Google Places ToS re: caching/display before building.)

**Acceptance:** A user can see and open nearby relevant places from their location.

### Phase 4 — Community
**Goal:** Collective knowledge that improves verdicts and places.
- Product safety reports (feeds back into the Verdict Engine community signal).
- Place reviews + celiac-safety ratings (dedicated fryer? cross-contamination protocol?).
- Basic community feed; report/moderation tooling.
- Contribution flow for missing products (optionally push back to Open Food Facts).

**Acceptance:** Users can submit and view reports/reviews; community signals visibly
influence verdicts and place ratings.

### Phase 5 — Polish & retention
- Push notifications (e.g. recall alerts, replies).
- Robust offline behavior (cached products/journal usable offline).
- Performance pass, accessibility pass, empty/error-state polish.

## 9. Data model (initial sketch — Supabase / Postgres)

> High-level; the implementer will refine column types and constraints.
> All user-owned tables use Row Level Security so a user can only access their own rows.

- **profiles** — extends `auth.users`; display name, severity/preferences, settings.
- **products** — keyed by barcode; cached OFF fields (name, brand, ingredients,
  allergens, labels), our computed verdict tier + reasoning, manual override fields,
  `last_fetched_at`.
- **product_reports** — community signals on a product (reaction / verified-safe /
  correction), linked to user + product. (RLS: read public, write own.)
- **ingredients_glossary** — ingredient name, gluten status, aliases, notes.
- **journal_entries** — user's food/symptom logs with timestamps; optional link to a
  product. (RLS: private to owner.)
- **saved_items** — user's bookmarks (products and/or places).
- **places** — cached place data (id, name, location, metadata) + our fields.
- **place_reviews** — community celiac-safety reviews/ratings for a place.
- **posts / comments** — community feed (Phase 4).

## 10. Non-functional requirements
- **Performance:** scan-to-verdict feels instant (cache-first); pages load fast on 3G.
- **Accessibility:** large tap targets, sufficient contrast, screen-reader labels.
- **Privacy/security:** secrets in env vars only; health data RLS-protected; HTTPS only.
- **Reliability:** graceful degradation when a third party is slow/unavailable.
- **Compliance:** honor Open Food Facts (ODbL) and Google Places ToS.

## 11. Success metrics (revisit as we learn)
- Time from opening the app to a verdict (target: a few seconds).
- % of scans returning a usable verdict (Safe/Caution/Unsafe vs Unknown).
- Repeat usage by the first real users (your friends) — daily/weekly active use.
- Community contributions over time (reports, reviews, products added).

## 12. Risks & open questions
- **Data accuracy / liability:** false "Safe" is the worst-case. Mitigated by the
  tier system, "verify packaging" notices, and conservative defaults. (Consider a
  clear disclaimer / terms-of-use page.)
- **Open Food Facts coverage gaps:** some products missing or incomplete →
  contribution flow + community fills gaps over time.
- **iOS scanning quirks:** rely on ZXing fallback; test on real iPhones early.
- **Google Places cost & ToS:** usage is billable and display/caching is restricted;
  evaluate before Phase 3 (alternatives: OpenStreetMap-based options).
- **Moderation:** community features need anti-abuse/moderation from day one of Phase 4.

## 13. Decisions log
> Record every meaningful decision here with a date so we don't relitigate.

- 2026-05-27 — Use Open Food Facts rather than building a food database from scratch.
- 2026-05-27 — Verdict is a confidence tier with reasoning, not a binary yes/no.
- 2026-05-27 — Hybrid barcode scanning (native API + ZXing fallback) due to iOS.
- 2026-05-27 — Build in phases; Phase 1 MVP = scan → verdict → save.

### Open decisions (need Project Lead input)
- Auth: email/password only at first, or also social logins (Google/Apple)?
- MVP scope: scanner-only, or scanner + minimal journal in Phase 1?
- Places data: commit to Google Places, or evaluate OpenStreetMap to avoid cost?
- Branding: keep "Gluten Defender" as the public name? Logo/color direction?

## 14. Changelog
- **0.1.0 — 2026-05-27** — Initial PRD created (vision, principles, stack, Verdict
  Engine, phased roadmap, data model sketch, risks, decisions log).