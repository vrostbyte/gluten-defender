# Gluten Defender

A mobile-first **Progressive Web App (PWA)** that acts as a single, trustworthy
companion for people living with celiac disease and gluten intolerance — helping
them answer, in seconds, *"Is this safe for me to eat?"*

> **Important:** Gluten Defender is **decision support, not medical advice.** It
> never guarantees a product is safe. Always verify the physical packaging.

This repository currently contains **Phase 0 (Foundation)**: a deployable,
installable app shell with bottom-tab navigation. The barcode scanner, verdict
engine, journal, and community features arrive in later phases (see
`gluten-defender-prd.md`, the product requirements document and source of truth).

## Tech stack

- **Next.js (App Router) + React + TypeScript**
- **Tailwind CSS** for styling
- **Supabase** for database / auth / storage (wired up; auth screens come later)
- **Vercel** for hosting
- PWA: web app manifest + service worker (installable on iOS & Android)

## Running the app locally

You need **Node.js 18.18+** (Node 20+ recommended) installed.

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up environment variables** — copy the template and fill in your values:
   ```bash
   cp .env.example .env.local
   ```
   Then open `.env.local` and paste in your Supabase URL and anon key. See
   "Setting up Supabase" below for where to find these. (The app shell runs even
   before you set these; you only need them once you start using Supabase.)

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. Open **http://localhost:3000** in your browser. Tip: open your browser dev
   tools and switch to a mobile device view — this app is designed for phones.

### Testing the installable / offline PWA behavior

The service worker is **disabled during `npm run dev`** (so code changes never
get cached and stuck). To test "Add to Home Screen" and offline behavior, run a
production build locally:

```bash
npm run build
npm start
```

…then visit http://localhost:3000. (On a phone, install prompts only appear over
HTTPS — the easiest way to test on a real device is your Vercel preview URL.)

## Project structure

```
app/
  layout.tsx        Root layout: metadata, PWA tags, bottom nav, fonts
  manifest.ts       Web app manifest (served at /manifest.webmanifest)
  page.tsx          "/" redirects to the Scan tab
  scan/  log/  explore/  profile/   The four tab pages (placeholders for now)
components/
  BottomNav.tsx              Fixed bottom tab bar
  PlaceholderScreen.tsx      Shared "coming soon" screen
  ServiceWorkerRegister.tsx  Registers the PWA service worker (production only)
lib/
  supabase/client.ts   Single reusable Supabase browser client
public/
  sw.js             Service worker (offline + installability)
  icons/            App icons (PWA + Apple touch icon)
```

## Deploying to Vercel

See the project setup notes; in short: push this repo to GitHub, import it at
[vercel.com/new](https://vercel.com/new), add the two `NEXT_PUBLIC_SUPABASE_*`
environment variables in the Vercel project settings, and deploy.

## Setting up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project dashboard go to **Project Settings → API**.
3. Copy the **Project URL** into `NEXT_PUBLIC_SUPABASE_URL`.
4. Copy the **anon / public** API key into `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
5. Paste both into your `.env.local` (local) and into Vercel's env vars (deploy).
