# Gluten Defender — Product Requirements Document (PRD)

> **Status:** Living document — single source of truth.
> **Version:** 0.2.0
> **Last updated:** 2026-05-29
> **Owner (Project Lead / Visionary):** vrostbyte
> **Architect / Prompt Master:** Isaac (Claude)
> **Implementation:** Antigravity CLI (`agy`), fallback Claude Code

---

## 0. How to use this document

This PRD is meant to be edited constantly. Whenever a decision is made, a feature
ships, or scope changes, update the relevant section AND add a line to the
**Changelog** at the bottom. Keep the **Version** and **Last updated** current.

This PRD is the contract between the three roles on this project:

- **Project Lead / Visionary (you):** owns the vision, makes product decisions, approves scope.
- **Architect / Prompt Master (Isaac):** turns vision into specs and into precise build instructions.
- **Implementer (Antigravity / Claude Code):** writes the code against the specs.

If something isn't written here, it isn't decided yet.

---

## 1. Vision

Gluten Defender is a mobile-first web app (installable to a phone's home screen as
a PWA) that acts as a single, trustworthy companion for people living with serious
food restrictions — celiac disease, life-threatening allergies, and the everyday
sensitivities that make eating feel unsafe. It answers, in seconds and with honest
reasoning, the questions that otherwise cause daily stress and risk:

- *Is this product in my hand safe for **me** to eat?*
- *What's everyone else with my condition saying about this product?*
- *What did I eat, and did it make me feel bad?*
- *Where near me can I safely eat or shop?*
- *Is this ingredient secretly an allergen?*

Gluten (celiac disease) is the flagship case — the project was born from two real
friends managing celiac — but the architecture is multi-allergen from day one
because one of those friends also lives with an anaphylactic milk-protein allergy.
The app must protect both of them, and anyone like them, equally well.

## 2. The problem

People with serious food restrictions navigate a daily minefield. The information
they need is fragmented across product labels, multiple apps, forums, and word of
mouth. Two competitive incumbents each solve one slice:

- **Fig** is the best-known scanner — multi-restriction, dietitian-backed, used by
  over a million people. But it has been publicly called out for showing no
  cross-contact concerns on products that manufacturers confirm share lines with
  multiple allergens. For a safety tool, that's a fundamental trust failure.
- **Find Me Gluten Free** is the best-known restaurant finder — a "Yelp for
  celiacs" with crowdsourced safety ratings — but doesn't scan products at all,
  and its $25/year premium gates the filters that actually matter (dedicated fryer,
  most-celiac-friendly).

**Nobody pairs an honest scanner with community-owned knowledge at the product
level.** That gap — the place where bottom-up reality (recipe changes, real
reactions, shared-line surprises) lives — is what Gluten Defender exists to fill.
Expert curation alone is slow and occasionally wrong; community curation alone is
unstructured and gameable. We combine a transparent verdict engine with structured
community notes, with the verdict honest about its own uncertainty.

## 3. Target users

1. **Primary:** People diagnosed with celiac disease who need high-confidence,
   cross-contamination-aware answers.
2. **Primary (equal weight):** People with serious food allergies, including
   life-threatening ones (e.g. milk-protein, peanut, tree nut, sesame).
3. **Secondary:** People with non-celiac gluten sensitivity or who follow other
   restricted diets (lower stakes, same workflows).
4. **Tertiary:** Caregivers, parents, and partners shopping/cooking for someone
   with restrictions.

## 4. Core principles (non-negotiable)

These guide every feature and every line of code.

1. **Safety over confidence.** The app is *decision support*, never a medical
   guarantee and never medical advice. Every verdict — including "Safe" — must
   prompt the user to verify the physical packaging. When data is missing or
   contradictory, prefer Caution/Unknown over a false Safe.
2. **Maximum conservatism for EVERY user.** Verdict logic is uniformly cautious
   regardless of who is asking. Any ambiguous ingredient without certification, or
   any "may contain," produces caution — never a soft pass. (Severity does not
   relax this; severity only amplifies prominence and alerts.)
3. **Anonymous scanning is sacred.** A person standing in a store aisle with one
   item in their hand must be able to scan it and get a verdict with **zero
   friction** — no sign-up, no quiz, no nag screens. Auth and the profile quiz
   exist only to unlock personalization, saved items, and community contribution;
   they never gate the core scan. "I just want to scan this one thing right now"
   is a first-class use case.
4. **Mobile-first, one-handed.** Big tap targets, fast loads, works on a weak
   signal in a store aisle.
5. **Fast is a feature.** Scan-to-verdict feels instant; cache aggressively;
   never block the user on a slow third party.
6. **Own the trust layer.** External data (Open Food Facts, Google Places) is
   plumbing. Our per-allergen verdicts, community signals, and curated data are
   what we own and what makes us valuable.
7. **Respect the user's data.** Health data (symptom/food logs, profiles,
   community contributions) is sensitive. Private by default, never shared
   outside the user's intent, protected at the database level via Supabase RLS.
8. **Honest attribution.** We comply with the licenses of data we use
   (Open Food Facts is ODbL — attribution required, contribute improvements back).

## 5. Scope

### In scope (eventually)
- Multi-allergen barcode scanning + per-allergen safety verdicts.
- Product search and browsing.
- Hidden-allergen ingredient glossary.
- **User profile (multi-allergen, severity-aware) created via an onboarding quiz.**
- **Community notes on individual products** (structured presets + freeform).
- Personal food + symptom journal.
- Saved/bookmarked products and places.
- Nearby gluten/allergen-friendly places (map + list) with celiac-style safety ratings.
- Community feed (broader: posts, comments, follow trusted reviewers).
- Installable PWA with offline-friendly behavior and (later) push notifications.

### Out of scope (record here so we don't drift)
- Native iOS/Android app store apps (we are a PWA).
- Medical diagnosis, treatment advice, or any claim of medical authority.
- Recipe generation engine.
- Monetization / payments (revisit after product-market fit; structured note types
  intentionally collect data that could support tiers later).
- Full social network features (DMs, follower graphs) beyond a basic feed.

## 6. Tech stack & infrastructure

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js (App Router), React, TypeScript** | Vercel-native; serverless API routes hide keys, cache, and run verdict logic server-side; best-documented stack for the implementer. |
| Hosting | **Vercel** | Tight Next.js integration, simple deploys, env-var secret management, edge caching. |
| Database / Auth / Storage | **Supabase** (Postgres, Auth, Storage, Realtime, Row Level Security) | One service covers DB, login, file storage, and per-user data isolation via RLS. |
| Email | **Resend** | Transactional email (verification, password reset, weekly digests later). |
| Styling | **Tailwind CSS** | Fast, mobile-first utility styling. |
| PWA | Web app manifest + service worker | Home-screen install, offline shell, caching. |
| Barcode scanning | **Native `BarcodeDetector` + `@zxing/browser` fallback** | Native API is fast/free but absent on iOS Safari & Firefox; fallback is mandatory. |

### External data sources
- **Open Food Facts** — product/barcode/ingredient/allergen data. Free, no API
  key, ~4M products, ODbL license. Always queried via our own server-side API
  route; results cached in Supabase. Attribution required.
- **Google Places API** — discovery of nearby restaurants/grocers. Paid per
  usage; ToS constraints on caching/display. Evaluate alternatives
  (OpenStreetMap-based) before Phase 3.
- **(Our own community data)** — the celiac/allergen-safety layer on top of both.
  This is the moat.

### Repository
- GitHub: `https://github.com/vrostbyte/gluten-defender`
- Deploy target: Vercel (auto-deploy on push).

### Agent / Implementation tooling
- Prompts must work for **both Antigravity CLI (`agy`) and Claude Code**.
- Every build prompt begins with the standard preamble (see §13) telling the
  agent to read `gluten-defender-prd.md`, `CLAUDE.md`, and `AGENTS.md`.
- AGENTS.md (auto-loaded by Antigravity) points back to CLAUDE.md and this PRD.

## 7. Allergen model (core architecture)

The single most important architectural decision: the app is **registry-driven**.
All supported allergens live in one config list (`lib/allergens/registry.ts`).
Each entry holds everything detection needs:

- `id`, `label`, `identityColor`, `icon`
- `allergenTags` — OFF `allergens_tags` that mean "contains"
- `tracesTags` — OFF `traces_tags` that mean "may contain"
- `certifiedFreeLabels` — OFF `labels_tags` for certified-free
- `definiteKeywords` — ingredient-text keywords that mean "contains"
- `cautionKeywords` — present-but-uncertain (e.g. oats for gluten)
- `mandatoryDisclosure` — boolean (US FALCPA disclosure required, true/false)

**Adding a new allergen is data, not code.** The engine never name-checks "gluten"
or "milk"; it loops over the registry.

### Currently supported allergens
- **Gluten** (`mandatoryDisclosure: false`) — wheat is legally disclosed; barley
  and rye are NOT, which is why ambiguous ingredients can hide gluten.
- **Milk / dairy protein** (`mandatoryDisclosure: true`).

### Registry expansion roadmap
Big-9 allergens are first priority: peanut, tree nut, egg, soy, sesame, fish,
shellfish (all `mandatoryDisclosure: true`). Then: low-FODMAP groups, alpha-gal,
other major restrictions. Each addition = one registry entry + keyword tuning,
no engine changes.

### Profile model
- A user's profile is a list of allergens they care about, each with a
  **severity** ("preference" / "intolerance" / "allergy" / "anaphylaxis") and a
  flag for **sensitivity to traces** (some celiacs react to may-contain; some don't).
- The profile **does not change verdict logic** — verdicts are uniformly
  conservative for everyone. The profile only changes **prominence and alerts**:
  profiled allergens get loud pills, top placement, and (later) push alerts
  when a saved product's recipe changes. Severity scales that loudness.
- Anonymous users and signed-in users without a profile use a hardcoded
  `DEFAULT_PROFILE = ['gluten', 'milk']` for the overall verdict scope.
- **The app always evaluates and displays ALL registered allergens.** Profile
  is amplification, never filtering. Nothing is hidden from the user.

## 8. The Verdict Engine

One function `evaluateAllergen(product, allergenDef)` returns a per-allergen
`{ tier, reasons[] }`. The scanner runs it over the whole registry and computes
an `overallVerdict` as the worst tier across the user's profiled allergens.

### Tiers
| Tier | Meaning |
|---|---|
| **Safe** | Certified allergen-free label present; no allergen signals. |
| **Likely safe** | No allergen signals detected, no certification. |
| **Caution** | "May contain" / shared-facility, or an ambiguous ingredient is a real risk for this allergen. |
| **Unsafe** | Contains a known source of this allergen. |
| **Unknown** | Insufficient data. |

### Per-allergen logic (conservative, in priority order)
1. No usable OFF data → **Unknown**.
2. Definite source present (matching `allergenTags`, OR a `definiteKeyword` found
   in `ingredients_text`) → **Unsafe**.
3. Else may-contain / cross-contact signal (matching `tracesTags`) → **Caution**.
4. Else an **ambiguous ingredient** present (see watch-list) AND not cleared by a
   certified-free label → **Caution** if `mandatoryDisclosure: false`
   (genuine hidden-source risk, e.g. barley in "natural flavors");
   **Likely safe with note** if `mandatoryDisclosure: true` (the law requires
   the allergen be disclosed if present, so ambiguous terms are low-risk —
   surface a transparent note rather than alarm).
5. Else certified-free label present and no signals → **Safe**.
6. Else (no signals, no certification) → **Likely safe**.
7. `cautionKeywords` (e.g. oats for gluten) → **Caution** unless a certified-free
   label clears it.

### Future inputs (Phase 1b+)
- **Community signal.** Community notes (see §10) feed into the engine as a fifth
  input. Multiple "I reacted" reports from verified-profile users will nudge a
  product's tier toward Caution. The reasoning will explicitly cite "Community:
  N users with celiac report a reaction."
- **Manual override.** Curator corrections in `products.manual_overrides` win
  over computed verdicts. Used sparingly and transparently labeled.

### Hardcoded traps
- "Lactose-free" ≠ milk-free — the milk proteins remain.
- "Non-dairy" / "dairy-free" are NOT legally defined and may still contain casein.
- Never treat marketing language as proof of safety.

### Ambiguous-ingredient watch-list
Shared, expandable constant: natural flavor(s), artificial flavor(s), flavoring,
"spices," seasoning, yeast extract, smoke flavoring, modified food starch,
caramel color.

## 9. Result UI conventions

- **Background color amplifies the verdict.** UNSAFE → red-tinted full background.
  CAUTION → amber-tinted full background. SAFE / LIKELY SAFE / UNKNOWN keep a
  clean neutral background (absence of alarm is itself a signal). Tints must
  preserve text readability.
- **Never encode status or identity by color alone.** Color is paired with text,
  weight, and icon. Accessibility plus safety-critical reality.
- **Overall verdict banner** colored by STATUS, with text label.
- **Allergen pills** colored by allergen IDENTITY (gluten=amber, milk=blue,
  future allergens get fixed colors). Profiled allergens are prominent; detected
  non-profiled allergens appear quietly below as "also detected."
- **Ingredient list with highlights.** Ingredients matching an allergen are
  tinted in that allergen's identity color with a small text tag (e.g. `milk`,
  `gluten`); ambiguous ingredients get a dashed underline + `?` tag.
- **Persistent "verify the physical packaging" notice on every verdict**, every tier.

## 10. Community notes (the moat)

Structured contributions about individual products, attached to barcodes.

### Note types (structured presets)
1. **I reacted to this** — user reports a personal reaction.
2. **Verified safe** — "I have [condition] and ate this with no issue."
3. **Recipe appears changed** — ingredients/labels look different from before.
4. **Cross-contamination concern** — shared-line/facility info, often from
   contacting the manufacturer.
5. **Ingredient correction** — flag that the displayed data is wrong/stale.
6. **General note** — open-ended.

Every note has:
- A structured `note_type` (above) — required.
- A `body` (freeform text, length-limited) — optional.
- Author (user_id), product (barcode), created_at, helpful_count, reported_count.

### How notes feed the engine
- **Reaction reports from users with profile-confirmed celiac/allergy** (a
  matching allergen present in their profile) count as a community signal.
- N or more reactions within a window → engine surfaces "Community: N users
  report a reaction" in reasoning and nudges tier toward Caution.
- Verified-safe reports do NOT override an unsafe verdict (someone else's
  tolerance doesn't make a product safe for the next person), but they do
  appear in the UI as community signal.

### Moderation (light from day one)
- Any user can **report** a note (one tap). Reports increment `reported_count`.
- A note auto-**soft-hides** at a threshold (TBD, e.g. 3 reports) pending review.
- Users can edit/delete their own notes; RLS enforced.
- A future trusted-reviewer badge (cf. Find Me Gluten Free) can weight reports.

### Read vs. write asymmetry
- **Anyone (including anonymous users) can read** non-hidden community notes.
- **Only signed-in users can contribute** (accountability requires identity).

## 11. Profile + onboarding quiz

### The quiz
A short, plain-language quiz that creates the user's allergen profile. Per
allergen the user wants to track, 2–3 questions:

- *"If you accidentally ate this, what would happen?"* (maps to severity tier)
- *"Do you carry an EpiPen for this?"* (yes/no)
- *"Are you sensitive to 'may contain' / shared-facility warnings?"* (yes/no)

The quiz also asks the user to select which allergens they want to track from
the registry (defaults: gluten + milk pre-checked, all others unchecked).

### When the quiz appears
- **Anonymous user:** NEVER. The scan flow is fully usable without an account.
- **Newly signed-in user without a profile:** a gentle one-time prompt
  ("Set up your defender") that is **skippable**. They can take it later from
  Profile/Settings.
- **Signed-in user with a profile:** never auto-prompted again. The profile is
  editable in Settings any time (add/remove allergens, retake quiz, adjust
  severity).

### Why a quiz, not checkboxes
Severity calibration. A checkbox gives "I avoid milk." A quiz gives "I avoid
milk because *it could put me in anaphylaxis.*" That difference matters for
prominence/alerts now, and for future features (push notifications, smart
defaults).

## 12. Feature specifications by phase

> Acceptance criteria are written so the implementer knows when a phase is "done"
> and the lead knows what to test.

### Phase 0 — Foundation **(DONE)**
Installable PWA shell, bottom-tab navigation, Supabase client wired up, deployed to Vercel.

### Phase 1a — MVP: Scan → Verdict (multi-allergen) **(DONE)**
Barcode scanner (native + ZXing fallback), Open Food Facts lookup via server API
route, registry-driven Verdict Engine v1 (gluten + milk), pill UI, highlighted
ingredients, persistent verify-packaging notice. No persistence/auth.
**Acceptance met:** IZZE Sparkling Mango (`836093011254`) returns Caution due
to "natural flavors" without certification.

### Phase 1b — Auth, Profile, Save, Community (CURRENT, 5 passes)

**Pass 1b.1 — Engine v2 polish & UX**
- Apply full-background tinting for UNSAFE (red) and CAUTION (amber).
- Implement `mandatoryDisclosure`-aware behavior for ambiguous ingredients
  (per §8 rule 4): gluten stays Caution; milk drops to Likely-Safe-with-note.
- Verify text readability over tinted backgrounds.
- Acceptance: IZZE still Caution overall (gluten still triggers); milk pill
  no longer flagged as Caution from "natural flavors" alone, but shows a quiet
  informational note.

**Pass 1b.2 — Supabase Auth + Profile table**
- Email/password auth via Supabase Auth (social logins deferred).
- `user_profiles` table (see §13), RLS so users access only their own rows.
- Profile/Settings page shows the current profile (initially the
  `DEFAULT_PROFILE` until the quiz is taken).
- No quiz yet; no Save yet. Just auth + an empty profile shell.

**Pass 1b.3 — Onboarding quiz + editable profile**
- Quiz flow as described in §11.
- Soft, skippable prompt after first sign-in if no profile exists.
- Editable Settings: add/remove allergens from the registry, retake quiz,
  adjust per-allergen severity and traces sensitivity.
- Verdict engine consumes the profile to scope the overall verdict.

**Pass 1b.4 — Products cache + Save/Bookmark**
- `products` table (see §13). Cache-first: API route checks Supabase, falls
  back to Open Food Facts, stores result.
- `saved_products` table. "Save" button on result screen.
- "Saved" view on Profile tab.

**Pass 1b.5 — Community notes**
- `community_notes` table (see §13).
- "Add a community note" button on result screen (sign-in required to write;
  reading is open).
- Notes display on result screen, grouped by type, newest first.
- Report-a-note button; soft-hide at report threshold.
- Engine consumes reaction signals from profile-matched users as described in §10.

### Phase 2 — Journal & knowledge
Food/symptom journal (private via RLS), simple history view. Searchable
ingredient glossary (cross-references registry allergens).

### Phase 3 — Places
Nearby restaurants/grocers via Google Places (or OSM alternative). Filters:
dedicated facility, dedicated fryer, allergen-friendly. **Adopt FMGF's safety vs.
food-quality dual rating** so the safety signal isn't muddied by how good the
food was. Save/bookmark places.

### Phase 4 — Community (broader)
Place reviews and celiac/allergen safety ratings (reuses community-notes pattern).
Trusted-reviewer badges. Basic feed of community activity. Moderation tooling.

### Phase 5 — Polish & retention
Push notifications (recall alerts, replies, "a product you saved had a recipe
change"). Robust offline behavior (cached products/journal usable offline).
Performance pass, accessibility pass, empty/error-state polish.

## 13. Data model (Supabase / Postgres)

> High-level shapes. The implementer refines column types and constraints.
> All user-owned tables use Row Level Security.

### `user_profiles` (Phase 1b.2)
- `user_id` (uuid, PK, FK → `auth.users`)
- `display_name` (text, nullable)
- `allergens` (jsonb) — array of `{ allergen_id, severity, sensitive_to_traces }`
- `quiz_completed_at` (timestamptz, nullable — null = skipped or not taken yet)
- `created_at`, `updated_at`
- **RLS:** users read/write only their own row.

### `products` (Phase 1b.4)
- `barcode` (text, PK)
- `name`, `brand`, `image_url`, `ingredients_text` (text)
- `allergens_tags`, `traces_tags`, `labels_tags`, `additives_tags` (jsonb)
- `raw_off_data` (jsonb) — full OFF response for future re-evaluation
- `last_fetched_at` (timestamptz)
- `manual_overrides` (jsonb, nullable) — curator corrections take precedence
- **RLS:** public read; writes via server-side service role only.

### `saved_products` (Phase 1b.4)
- `id` (uuid, PK), `user_id`, `product_barcode`, `saved_at`
- **RLS:** users read/write only their own rows.

### `community_notes` (Phase 1b.5)
- `id` (uuid, PK)
- `product_barcode` (text, FK → `products.barcode`)
- `user_id` (uuid, FK → `auth.users`)
- `note_type` (enum: `reaction`, `verified_safe`, `recipe_changed`,
  `cross_contamination`, `ingredient_correction`, `general`)
- `body` (text, nullable, length-limited)
- `created_at`, `updated_at`
- `helpful_count`, `reported_count` (int, denormalized counters)
- `soft_hidden` (boolean, default false)
- **RLS:** anyone (including anon) reads where `soft_hidden = false`; users
  write/edit/delete only their own rows.

### `note_reports` (Phase 1b.5)
- `id`, `note_id`, `user_id`, `reason` (optional), `created_at`
- Increments parent note's `reported_count` via trigger.
- **RLS:** users write only their own; reads admin-only.

### `journal_entries` (Phase 2)
- User's food/symptom logs; optional link to a product.
- **RLS:** private to owner.

### `places`, `place_reviews` (Phase 3–4)
- Mirrors of the products + community-notes pattern but for businesses.

## 14. Non-functional requirements

- **Performance:** scan-to-verdict feels instant (cache-first); fast on 3G.
- **Accessibility:** large tap targets, sufficient contrast, screen-reader labels,
  never color-only signals.
- **Privacy/security:** secrets in env vars only; health data RLS-protected;
  HTTPS only.
- **Reliability:** graceful degradation when a third party is slow/unavailable.
- **Compliance:** honor Open Food Facts (ODbL) and Google Places ToS.

## 15. Success metrics (revisit as we learn)

- Time from opening the app to a verdict (target: a few seconds).
- % of scans returning a usable verdict (Safe / Caution / Unsafe vs Unknown).
- Repeat usage by the first real users (your two friends) — daily/weekly active.
- **Community contribution rate** (notes per product, % of scans that yield a note).
- **Profile completion rate** of signed-in users (a proxy for engagement quality).

## 16. Risks & open questions

- **Data accuracy / liability.** False "Safe" is the worst case. Mitigated by
  the tier system, "verify packaging" notices, conservative defaults, the
  `mandatoryDisclosure` distinction, and community signal. A clear
  Terms-of-Use / Disclaimer page is required before public launch.
- **Cross-contamination data is the biggest accuracy gap.** Open Food Facts
  doesn't reliably capture shared-line manufacturing. Fig's failure here is
  documented publicly. Our defense: explicit "may contain" parsing,
  community-sourced cross-contact notes, and never displaying the absence
  of a warning as the presence of safety.
- **Community moderation.** Required from day one of 1b.5. Soft-hide threshold,
  report flow, future trusted-reviewer badges.
- **Engagement gaming.** Verified-safe inflation (cf. FMGF reviewer complaints):
  someone reports "safe" because they personally didn't react, masking risk for
  others. Mitigation: reaction reports and safe reports are displayed
  separately and weighted differently; never combined into a single star rating.
- **Google Places cost & ToS.** Evaluate before Phase 3; consider OSM-based
  alternatives.
- **iOS scanning quirks.** ZXing fallback is mandatory; test via the iPhone
  friend; Android-side ?scanner=zxing override remains the dev path.
- **Branding.** "Gluten Defender" is the emotional anchor but the app is now
  multi-allergen. Punted; revisit before public launch.

## 17. Standard prompt preamble (use at the top of every build prompt)

```
You are a coding agent working in the local repository for the Gluten Defender
project. Before doing anything, read these three files at the project root and
treat them as binding context: gluten-defender-prd.md (the product spec and
source of truth), CLAUDE.md (project memory — stack, conventions, safety rules),
and AGENTS.md. Follow the core safety principle in all of them: the app is
decision support, never a medical guarantee or medical advice, and you must
prefer caution over a false "safe." Stay strictly within the scope defined in
this task and do not modify files outside it. When you finish, also write a
short summary of what changed to docs/walkthroughs/<short-task-name>.md inside
the repo, so it's versioned in git.
```

## 18. Decisions log

> Record every meaningful decision here with a date so we don't relitigate.

- 2026-05-27 — Use Open Food Facts rather than building a food database from scratch.
- 2026-05-27 — Verdict is a confidence tier with reasoning, not a binary yes/no.
- 2026-05-27 — Hybrid barcode scanning (native API + ZXing fallback) due to iOS.
- 2026-05-27 — Build in phases; Phase 1a MVP = scan → verdict.
- 2026-05-28 — Multi-allergen from day one; registry-driven architecture so new
  allergens are data, not code.
- 2026-05-28 — Maximum conservatism applies to ALL users; severity only amplifies
  prominence, never relaxes verdicts.
- 2026-05-28 — Profile amplifies, never filters: every scan evaluates and shows
  every registered allergen.
- 2026-05-28 — Default pre-auth profile: gluten + milk.
- 2026-05-29 — `mandatoryDisclosure` flag changes engine behavior on ambiguous
  ingredients (legally-disclosed allergens don't trigger Caution from "natural
  flavors" alone; non-disclosed gluten still does).
- 2026-05-29 — Community notes are a strategic centerpiece, hybrid format
  (structured presets + freeform body). Anonymous can read; sign-in required to write.
- 2026-05-29 — Profile quiz: never shown to anonymous users; shown once,
  skippable, to newly-signed-in users without a profile.
- 2026-05-29 — Full-background tinting for UNSAFE and CAUTION verdicts; SAFE /
  LIKELY SAFE / UNKNOWN remain neutral. Never color alone.
- 2026-05-29 — Auth: email/password only at first; social logins deferred.

### Open decisions (need Project Lead input)
- Places data source: Google Places vs. OSM-based alternative (defer to Phase 3).
- Public branding: keep "Gluten Defender" or rename pre-launch (defer).
- Community-notes soft-hide threshold (start at 3 reports; tune with data).
- Length cap on community-note bodies (suggest 1,000 characters; revisit).

## 19. Changelog

- **0.2.0 — 2026-05-29** — Major refresh. Multi-allergen vision and registry
  architecture; `mandatoryDisclosure`-aware engine logic; community notes as the
  strategic centerpiece (hybrid structured + freeform, anonymous read / auth
  write, signal into engine); profile + onboarding quiz model
  (anonymous-never, signed-in-skippable); anonymous-scanning principle codified;
  full-background tint UI rules; competitor positioning vs. Fig and Find Me
  Gluten Free; Phase 1b broken into five sequenced passes; expanded data model
  (`user_profiles`, `products`, `saved_products`, `community_notes`,
  `note_reports`); standard prompt preamble; refreshed open decisions and risks.
- **0.1.0 — 2026-05-27** — Initial PRD (single-allergen gluten scope, verdict
  engine, phased roadmap, data model sketch, risks, decisions log).