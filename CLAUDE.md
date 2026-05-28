# Gluten Defender — Project Memory (for Claude)

> See also: `gluten-defender-prd.md` is the **single source of truth**. Read it
> before making product or scope decisions. `AGENTS.md` holds version-specific
> Next.js notes. Keep this file updated as the project evolves.

## Vision
A mobile-first, installable PWA that is a single trustworthy companion for people
with celiac disease and gluten intolerance — answering "Is this safe to eat?" in
seconds, with honest reasoning rather than a blind yes/no.

## Tech stack
- **Next.js (App Router) + React + TypeScript** — UI and server-side API routes.
- **Tailwind CSS** — mobile-first utility styling.
- **Supabase** (Postgres + Auth + Storage + Row Level Security) — data, login,
  per-user privacy.
- **Vercel** — hosting and deploys.
- **PWA** — web app manifest + service worker (installable on iOS & Android).
- Later: Open Food Facts (product data), Google Places (nearby places), Resend
  (email).

## Core principles (non-negotiable)
1. **Safety over confidence.** The app is **decision support, never a medical
   guarantee and never medical advice.** Every verdict — *including "Safe"* —
   must tell the user to verify the physical packaging. When data is missing or
   contradictory, prefer Caution/Unknown over a false "Safe". Surface uncertainty
   honestly; never fake certainty.
2. **Mobile-first, one-handed.** Big tap targets, fast loads, works on weak
   signal in a store aisle.
3. **Fast is a feature.** The scan-to-verdict path must feel instant; cache
   aggressively; never block on a slow third party.
4. **Own the trust layer.** External data is plumbing; our celiac-safety verdicts
   and community signals are what make us valuable.
5. **Respect the user's data.** Health data (food/symptom logs) is private by
   default and protected at the database level (Supabase RLS).
6. **Honest attribution.** Comply with data licenses (Open Food Facts = ODbL).

## The Verdict Engine (core differentiator — future phase)
Not a binary yes/no. Returns a **confidence tier + reasoning**:
`Safe · Likely safe · Caution · Unsafe · Unknown`. Always show *why*. Every
verdict shows a "verify the packaging" notice. Manual curator overrides win.

## Roadmap (phases)
- **Phase 0 — Foundation (current):** installable shell, bottom-tab nav, Supabase
  wired up, deployed to Vercel. *(No auth screens or scanner yet.)*
- Phase 1 — Scan → Verdict → Save (the magic moment).
- Phase 2 — Journal & ingredient/knowledge lookup.
- Phase 3 — Nearby places.
- Phase 4 — Community reports & reviews.
- Phase 5 — Polish, push notifications, robust offline.

## Coding conventions
- **TypeScript everywhere**; prefer clear, explicit types over `any`.
- **Mobile-first**: design for phones first; large tap targets; respect safe-area
  insets; use semantic HTML and accessible labels.
- **Beginner-friendly, well-commented code.** The project lead is newer to this
  stack — explain the *why* in comments where something is non-obvious. Keep
  components small and readable.
- **Secrets only via environment variables** — never hard-code keys. Public,
  browser-safe values use the `NEXT_PUBLIC_` prefix.
- Use the App Router conventions; co-locate routes under `app/`.
- Reusable Supabase access goes through `lib/supabase/`.

## Project layout
- `app/` — routes (App Router). `manifest.ts` → `/manifest.webmanifest`.
- `components/` — shared UI (`BottomNav`, `PlaceholderScreen`,
  `ServiceWorkerRegister`).
- `lib/supabase/client.ts` — single reusable Supabase browser client.
- `public/sw.js`, `public/icons/` — service worker and app icons.
