# Gluten Defender — Project Memory (for AI coding agents)

> **Read me first, every session.** This is the project's persistent memory.
> `gluten-defender-prd.md` is the **single source of truth** for product scope.
> `AGENTS.md` is auto-loaded by Antigravity and points back here. Any prompt you
> receive should also tell you to read these files — if it didn't, read them anyway.
> Keep this file updated as the project evolves.

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
   regardless of who is asking: any ambiguous ingredient without certification, or
   any "may contain," produces caution — never a soft pass. (Severity does not relax
   this; see below.)
3. **Mobile-first, one-handed.** Big tap targets, fast loads, works on weak signal.
4. **Fast is a feature.** Cache aggressively; never block on a slow third party.
5. **Own the trust layer.** External data is plumbing; our per-allergen verdicts and
   community signals are what make us valuable.
6. **Respect the user's data.** Health data is private by default, protected by Supabase RLS.
7. **Honest attribution.** Comply with data licenses (Open Food Facts = ODbL).

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
- **Default profile (pre-auth): gluten + milk.** Becomes a real editable profile in
  Phase 1b (create on signup, edit in settings, add/remove allergens any time).

## The Verdict Engine
One function evaluates a product against one allergen registry entry and returns a
per-allergen **tier + reasoning** (an array of short evidence strings). The scanner
runs it over the whole registry. Tiers: `safe · likely_safe · caution · unsafe · unknown`.

Per-allergen logic (conservative; prefer caution/unknown over false safe):
- No usable OFF data -> `unknown`.
- A definite source present (matching `allergens_tags`, or a definite-source keyword
  in the ingredients) -> `unsafe`.
- Else a may-contain / cross-contact signal (matching `traces_tags`) -> `caution`.
- Else an **ambiguous ingredient** present (see watch-list) AND not cleared by a
  certified-free label -> `caution`, explaining the specific risk. Weight by
  `mandatoryDisclosure`: for allergens NOT covered by mandatory disclosure (gluten via
  barley/rye), ambiguous ingredients are a real hidden-source risk; for covered
  allergens they are lower risk but, under maximum conservatism, still surface a note.
- Else certified-free label present and no signals -> `safe`.
- Else (no signals, no certification) -> `likely_safe`.

Ambiguous-ingredient watch-list (shared, expandable constant): natural flavors,
artificial flavors, flavoring, "spices," seasoning, yeast extract, smoke flavoring,
modified food starch, caramel color. Reason example: *"Contains 'natural flavors,'
which can hide barley-derived gluten and isn't required to be disclosed unless the
product is certified gluten-free."*

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

## Result UI conventions
- Overall verdict banner colored by STATUS (green safe, light-green likely safe,
  amber caution, red unsafe, gray unknown) — with a text label, never color alone.
- A pill per allergen, colored by allergen IDENTITY (gluten=amber, milk=blue; future
  allergens get their own fixed colors). Status shown by fill+weight+icon+word:
  at-risk = filled/bold/icon/"at risk"; clear = muted outline/"not detected".
  Profiled allergens are prominent; non-profiled detected ones are quieter.
- Ingredient list: ingredients that map to an allergen are highlighted in that
  allergen's identity color with a small text tag (e.g. `milk`, `gluten`); ambiguous
  ones get a dashed underline + `?` tag. A legend explains the styles.
- **Never encode status or identity by color alone** — always pair color with a word
  or icon (accessibility + this is a safety-critical, possibly life-or-death tool).
- The "verify the physical packaging" notice appears on EVERY verdict.

## Roadmap (phases)
- **Phase 0 — Foundation: DONE.** Installable shell, bottom-tab nav, Supabase client, Vercel.
- **Phase 1 — Scan -> Verdict -> Save (current).**
  - 1a: scanner + Open Food Facts lookup + Verdict Engine (now multi-allergen, registry-driven) + the pill/ingredient UI. No persistence/auth; default profile gluten+milk.
  - 1b: Supabase Auth + editable allergen profile (with per-allergen severity) + products cache table + Save/bookmark.
- Phase 2 — Journal & ingredient/knowledge lookup.
- Phase 3 — Nearby places.
- Phase 4 — Community reports & reviews.
- Phase 5 — Polish, push notifications, robust offline.

## Coding conventions
- TypeScript everywhere; explicit types over `any`. Type the product and verdict shapes.
- Mobile-first; large tap targets; safe-area insets; semantic, accessible HTML.
- Beginner-friendly, well-commented code; explain the *why* where non-obvious; small components.
- Secrets only via env vars; public browser-safe values use `NEXT_PUBLIC_`.
- All third-party API calls go through server-side API routes — never from client components.
- App Router conventions; routes under `app/`; reusable Supabase access via `lib/supabase/`.
- The allergen registry and watch-lists live in clearly-commented, easy-to-edit constants.

## Project layout
- `app/` — routes (App Router). `manifest.ts` -> `/manifest.webmanifest`.
- `app/api/` — server-side routes (e.g. product lookup + verdict).
- `components/` — shared UI.
- `lib/` — reusable logic: `lib/supabase/`, plus the allergen registry + verdict engine.
- `public/sw.js`, `public/icons/` — service worker and app icons.