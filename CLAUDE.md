# Gluten Defender — Project Memory (for AI coding agents)

> **Read me first, every session.** This is the project's persistent memory.
> `gluten-defender-prd.md` is the **single source of truth** for product scope —
> read it for full specs on community notes, the profile quiz, the data model,
> and phase plans. `AGENTS.md` is auto-loaded by Antigravity and points back
> here. Any prompt you receive should also tell you to read these files —
> if it didn't, read them anyway. Keep this file in sync with the PRD.

## Vision
A mobile-first, installable PWA that is a single trustworthy companion for people
managing serious food restrictions — answering "Is this safe for ME to eat?" in
seconds, with honest reasoning rather than a blind yes/no. Gluten (celiac disease)
is the flagship, but the app is built to protect against multiple serious allergens
(milk/dairy protein, peanuts, tree nuts, egg, soy, fish, shellfish, sesame, etc.),
including life-threatening ones.

## Tech stack
- **Next.js (App Router) + React + TypeScript** — UI and server-side API routes.
- **Tailwind CSS** — mobile-first utility styling.
- **Supabase** (Postgres + Auth + Storage + Row Level Security) — data, login, per-user privacy.
- **Vercel** — hosting and deploys.
- **PWA** — web app manifest + service worker (installable on iOS & Android).
- Later: Open Food Facts (product data), Google Places (nearby places), Resend (email).

## Core principles (non-negotiable)
1. **Safety over confidence.** Decision support, never a medical guarantee and never
   medical advice. Every verdict — *including "safe"* — tells the user to verify the
   physical packaging. When data is missing/contradictory, prefer caution/unknown
   over a false "safe."
2. **Maximum conservatism for EVERY user.** The verdict logic is uniformly cautious
   regardless of who is asking. Severity does not relax verdicts — it only
   amplifies prominence and alerts.
3. **Anonymous scanning is sacred.** A person in a store aisle with one item must
   be able to scan and get a verdict with ZERO friction — no sign-up, no quiz,
   no nag screens. Auth and the quiz only exist to unlock personalization,
   saved items, and community contribution; they never gate the core scan.
   "I just want to scan this one thing right now" is a first-class use case.
4. **Mobile-first, one-handed.** Big tap targets, fast loads, works on weak signal.
5. **Fast is a feature.** Cache aggressively; never block on a slow third party.
6. **Own the trust layer.** External data is plumbing; our per-allergen verdicts
   and community signals are what make us valuable.
7. **Respect the user's data.** Health data is private by default, protected by Supabase RLS.
8. **Honest attribution.** Comply with data licenses (Open Food Facts = ODbL).

## Allergen model (core architecture)
- **Registry-driven.** All supported allergens live in ONE config list (the allergen
  registry). Each entry holds everything detection needs: id, display label, identity
  color, icon, the OFF `allergens_tags` that mean "contains," the `traces_tags` that
  mean "may contain," the certified-free `labels_tags`, a list of definite-source
  ingredient keywords, optional caution keywords, and a `mandatoryDisclosure` flag
  (true if the allergen is legally required to be declared, e.g. milk/wheat under US
  FALCPA; false for barley/rye-derived gluten, which can hide undisclosed).
  **Adding a new allergen = adding one registry entry. No engine logic changes.**
- **Always evaluate ALL registered allergens on every scan**, and always SHOW every
  allergen detected in a product — nothing is hidden.
- **Profile amplifies, it does not filter.** The user's profile (which allergens they
  track + a per-allergen severity) controls *prominence and alerts*, not whether an
  allergen is checked. Profiled allergens get loud pills/alerts and top placement;
  non-profiled detected allergens are still shown, quietly, as "also detected."
- **Overall verdict is scoped to the user's profile** ("is this safe for me"), while
  the full detected list stays visible below it.
- **Default profile (pre-auth, anonymous, or not-yet-quizzed): gluten + milk.**
  Real editable profile created via the onboarding quiz in Phase 1b.

## The Verdict Engine
One function evaluates a product against one allergen registry entry and returns a
per-allergen **tier + reasoning** (an array of short evidence strings). The scanner
runs it over the whole registry. Tiers: `safe . likely_safe . caution . unsafe . unknown`.

Per-allergen logic (conservative; prefer caution/unknown over false safe):
- No usable OFF data -> `unknown`.
- A definite source present (matching `allergens_tags`, or a definite-source keyword
  in the ingredients) -> `unsafe`.
- Else a may-contain / cross-contact signal (matching `traces_tags`) -> `caution`.
- Else an **ambiguous ingredient** present AND not cleared by a certified-free label:
  - if `mandatoryDisclosure: false` (e.g. gluten via barley/rye) -> `caution`,
    with a reason like *"Contains 'natural flavors,' which can hide barley-derived
    gluten and isn't required to be disclosed unless certified gluten-free."*
  - if `mandatoryDisclosure: true` (e.g. milk under FALCPA) -> `likely_safe` with
    a quiet informational note (the law requires disclosure if the allergen is
    present, so ambiguous terms are low risk — don't alarm).
- Else certified-free label present and no signals -> `safe`.
- Else (no signals, no certification) -> `likely_safe`.

Ambiguous-ingredient watch-list (shared, expandable constant): natural flavors,
artificial flavors, flavoring, "spices," seasoning, yeast extract, smoke flavoring,
modified food starch, caramel color.

Hidden-source keyword examples (live in registry entries, expand over time):
- Gluten (mandatoryDisclosure=false): wheat, barley, rye, malt, malt extract, malt
  flavoring, brewer's yeast, triticale, spelt, farro, semolina, durum. (Oats ->
  caution unless certified GF: naturally GF but frequently cross-contaminated.)
- Milk (mandatoryDisclosure=true): milk, butter, cream, cheese, casein, caseinate
  (sodium/potassium/calcium/magnesium caseinate), whey (all forms), lactalbumin,
  lactoglobulin, lactose, ghee, curds, custard, milk solids, milk protein isolate,
  hydrolyzed milk protein, nougat, rennet, recaldent, simplesse. Traps to hardcode:
  "lactose-free" != milk-free (proteins remain); "non-dairy"/"dairy-free" are not
  legally defined and may still contain casein — never treat as proof of safety.

**Future engine input (Phase 1b.5):** community notes feed in as a fifth signal.
Reaction reports from users with a profile-matched allergen nudge tier toward
caution and surface as "Community: N users with [condition] report a reaction."
Verified-safe reports never override unsafe verdicts but appear as community signal.

## Result UI conventions
- **Background tint amplifies the verdict.** UNSAFE -> red-tinted full background;
  CAUTION -> amber-tinted full background; SAFE / LIKELY SAFE / UNKNOWN keep a
  clean neutral background (absence of alarm is itself a positive signal). Tints
  must preserve text readability.
- Overall verdict banner colored by STATUS, with a text label, never color alone.
- A pill per allergen, colored by allergen IDENTITY (gluten=amber, milk=blue;
  future allergens get fixed colors). Status shown by fill+weight+icon+word:
  at-risk = filled/bold/icon/"at risk"; clear = muted outline/"not detected".
  Profiled allergens are prominent; non-profiled detected ones are quieter.
- Ingredient list: ingredients that map to an allergen are highlighted in that
  allergen's identity color with a small text tag (e.g. `milk`, `gluten`);
  ambiguous ones get a dashed underline + `?` tag. A legend explains the styles.
- **Never encode status or identity by color alone** — always pair color with a
  word or icon. Accessibility + this is a safety-critical, possibly life-or-death tool.
- The "verify the physical packaging" notice appears on EVERY verdict.

## Community notes (Phase 1b.5 — see PRD section 10 for full spec)
- Structured contributions tied to a product's barcode, with a required
  `note_type` (preset enum: `reaction`, `verified_safe`, `recipe_changed`,
  `cross_contamination`, `ingredient_correction`, `general`) and optional
  freeform `body`.
- **Read/write asymmetry:** anyone (including anonymous) reads non-hidden notes;
  only signed-in users write. Accountability requires identity.
- Light moderation from day one: report button, soft-hide at report threshold.
- Reaction notes from profile-matched users feed into the Verdict Engine.

## Profile + onboarding quiz (Phase 1b.3 — see PRD section 11 for full spec)
- Short, plain-language quiz that creates a user's allergen profile:
  which allergens to track, severity per allergen, traces-sensitivity flag.
- **When the quiz appears:**
  - Anonymous user: NEVER.
  - Newly signed-in user without a profile: ONE skippable prompt
    ("Set up your defender"). Skippable.
  - Signed-in user with a profile: never auto-prompted again. Editable in Settings.

## Roadmap (phases)
- **Phase 0 — Foundation: DONE.** Installable shell, bottom-tab nav, Supabase client, Vercel.
- **Phase 1a — Scan -> Verdict (multi-allergen): DONE.** Scanner + OFF lookup +
  registry-driven Verdict Engine + pill/ingredient UI. No persistence/auth.
- **Phase 1b — Auth, Profile, Save, Community (CURRENT, 5 passes):**
  - 1b.1: Background-tint UX + `mandatoryDisclosure`-aware engine tuning.
  - 1b.2: Supabase Auth (email/password) + `user_profiles` table.
  - 1b.3: Onboarding quiz + editable profile in Settings.
  - 1b.4: `products` cache table + Save/Bookmark.
  - 1b.5: Community notes (table, add/read UI, report flow, engine integration).
- Phase 2 — Journal & ingredient/knowledge lookup.
- Phase 3 — Nearby places (with celiac-safety vs. food-quality dual rating).
- Phase 4 — Community feed, place reviews, trusted-reviewer badges, moderation.
- Phase 5 — Polish, push notifications, robust offline.

## Coding conventions
- TypeScript everywhere; explicit types over `any`. Type the product and verdict shapes.
- Mobile-first; large tap targets; safe-area insets; semantic, accessible HTML.
- Beginner-friendly, well-commented code; explain the *why* where non-obvious; small components.
- Secrets only via env vars; public browser-safe values use `NEXT_PUBLIC_`.
- All third-party API calls go through server-side API routes — never from client components.
- App Router conventions; routes under `app/`; reusable Supabase access via `lib/supabase/`.
- The allergen registry and watch-lists live in clearly-commented, easy-to-edit constants.
- All user-owned tables use Row Level Security; anonymous reads only where the PRD says so.

## Project layout
- `app/` — routes (App Router). `manifest.ts` -> `/manifest.webmanifest`.
- `app/api/` — server-side routes (e.g. product lookup + verdict).
- `components/` — shared UI.
- `lib/` — reusable logic: `lib/supabase/`, plus the allergen registry + verdict engine.
- `public/sw.js`, `public/icons/` — service worker and app icons.
- `docs/walkthroughs/` — per-task change summaries written by the agent on completion.