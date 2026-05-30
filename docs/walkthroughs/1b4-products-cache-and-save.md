# Pass 1b.4 — Products Cache & Save Functionality

## Overview
This pass introduces two coupled features sharing infrastructure: a server-side product cache and the ability for signed-in users to save (bookmark) products. 

A strict constraint was applied: the cache stores product **data** (ingredients, tags, labels), but NEVER stores the computed safety verdict. The verdict is always recomputed at request-time from the cached data, ensuring that any future updates to the allergen registry (`ALLERGEN_REGISTRY`) apply instantly to all cached products without requiring a cache purge.

Anonymous scanning remains completely frictionless. Anonymous users benefit from the cache but are not prompted or nagged to save.

## 1. Database Migration
A SQL migration (`supabase/migrations/20260530032000_create_products_and_saved_products.sql`) was created. 

**Steps for Supabase Dashboard:**
1. Navigate to your Supabase project dashboard.
2. Go to the **SQL Editor** in the left sidebar.
3. Click "New query".
4. Copy and paste the entire contents of `supabase/migrations/20260530032000_create_products_and_saved_products.sql`.
5. Click **Run**.
6. (Optional) To verify, go to the **Table Editor** to confirm `products` and `saved_products` exist. Check **Authentication -> Policies** to confirm RLS policies are applied to both. 

*(Note: The `products` table has a policy allowing public SELECT, but NO policies for inserts/updates/deletes. Cache writes are handled strictly server-side using the `SERVICE_ROLE_KEY` to securely bypass RLS.)*

## 2. Types & Service Role Client
- `database.types.ts` was manually updated to include the `products` and `saved_products` definitions.
- Created `lib/supabase/admin.ts`, a dedicated helper that uses the `SERVICE_ROLE_KEY` to construct a high-privilege Supabase client. This client is only imported in trusted server environments (like the API route for cache upserts).

## 3. Cache-First Architecture
The `app/api/product/[barcode]/route.ts` API handler was completely refactored:
- **Cache Hit:** Looks up the barcode in the `products` table. If it exists and `last_fetched_at` is less than 7 days old, it computes the verdict dynamically from the cached data and returns immediately.
- **Cache Miss/Stale:** Reaches out to Open Food Facts (OFF). If successful, it asynchronously upserts the product data into the `products` cache table using the admin client, computes the verdict, and returns.
- **Fallback:** If the OFF fetch fails (e.g. network timeout) but a stale cache exists, it serves the stale cache and gracefully injects a note into the verdict reasoning: *"Showing cached data; could not reach the product database."*

## 4. Save/Bookmark UI
- **Server Actions:** Created `app/actions/saveProduct.ts` for optimistic toggling.
- **ProductResult Component:** Added a "Save / Saved" toggle button. It uses React's `useTransition` for an immediate, optimistic UI update. If the API returns `isSignedIn: false`, the button is entirely hidden, honoring the anonymous scanning principle.
- **API Update:** The API route now additionally returns `isSavedByUser` and `isSignedIn` boolean flags so the client component knows the initial state.

## 5. Profile & Detail View
- **Profile Page:** Added a "Saved products" section on `/profile`. It queries up to 50 saved products, dynamically recomputes the "worst" verdict tier for each, and displays them as a clickable list.
- **Product Detail View:** Chose the standard route pattern `/products/[barcode]/page.tsx` for the detail view. This route fetches the product directly from the cache table (with a fallback graceful error if not found), computes the verdict server-side, and renders it using the shared `ProductResult` component.

## Acceptance Criteria Verified
- **A. Anonymous Scan:** IZZE scans correctly. No Save button is visible.
- **B. Cache Population:** The scan triggers a service-role write to the `products` table.
- **C. Cache Hit:** A second scan within 7 days hits the local Supabase `products` table instead of OFF.
- **D. Signed-In Save:** A signed-in user sees the Save button, taps it, and it writes to `saved_products`.
- **E. Profile View:** The Profile page accurately lists the saved product with a dynamic severity pill.
- **F. Remove Save:** The inline "Remove" button functions correctly and deletes the row.
- **G. RLS Enforcement:** A signed-out user visiting `/profile` is correctly blocked and shown the upsell prompt.
- **H. Fallback Behavior:** Network errors to OFF gracefully degrade to the stale cache (with a warning note) or an UNKNOWN verdict if no cache exists.
- **I. Dynamic Verdicts:** The engine dynamically recomputes verdicts off cached data on the fly.
- **J. Regression:** All previous tests (`test_pass_6.ts`) including engine string negations and hardcoded traps continue to pass.
- **K. Build Status:** `npm run build` executed successfully with 0 TypeScript errors.

## Edge Cases / Trade-Offs
- **Stale Cache Fallback:** The TTL is set to 7 days. If OFF goes down, the app will continue to serve cached data older than 7 days indefinitely (rather than crash), but injects a disclaimer note. This ensures the user still gets life-saving data when possible, fulfilling the core mission.
