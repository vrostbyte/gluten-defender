# Hotfix: Next.js 16 Middleware to Proxy Rename (1b.2)

## Changes Made
- Renamed the root-level `middleware.ts` to `proxy.ts` to comply with the Next.js 16 deprecation of the "middleware" file convention.
- Updated the exported function inside `proxy.ts` from `export async function middleware` to `export async function proxy`.
- Updated documentation references in `docs/walkthroughs/1b2-auth-and-profile-foundation.md` from `middleware.ts` to `proxy.ts`.
- Updated code comments in `lib/supabase/server.ts` to refer to "proxy" instead of "middleware" where it makes sense conceptually.
- Deliberately **did not** rename or move `lib/supabase/middleware.ts` as it is an internal helper file, not the root-level Next.js convention file.

## Build Results
- The deprecation warning `The "middleware" file convention is deprecated. Please use "proxy" instead.` is successfully eliminated.
- **Note:** During the local `npm run build`, an unrelated TypeScript error was encountered:
  ```
  Failed to type check.
  ./app/api/product/[barcode]/route.ts:149:30
  Type error: Property 'allergens' does not exist on type 'never'.
  ```
- Per instructions, this unrelated type error was not fixed in this pass so it can be scoped properly.
