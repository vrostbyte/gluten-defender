# Pass 1b.4.5 — Save Bug, Allergen Colors, & Severity Prominence

## Overview
This pass bundled targeted UX improvements and bug fixes, directly addressing issues found after Pass 1b.4. 

## 1. Save Bug Fix
**Root Cause:** The optimistic state shape was returning a success representation locally without actually confirming the database write succeeded. More importantly, the Server Actions `saveProductAction` and `unsaveProductAction` were using `throw new Error(...)` without returning a proper success state, and the UI `try/catch` block was catching exceptions but the `revalidatePath` didn't immediately update the client state for the boolean toggle because the component's internal `isSaved` state wasn't reconciled.
**Fix:** Refactored `app/actions/saveProduct.ts` to return a strongly typed `{ ok: true, isSaved: boolean }` or `{ ok: false, error: string }`. Updated the optimistic UI in `components/scanner/ProductResult.tsx` to handle this explicitly and display a localized error state rather than silently reverting. The actions continue to use the user-scoped `getSupabaseServerClient` which safely enforces RLS.

## 2. Quiz Scroll-to-Top
**Root Cause:** When navigating to the quiz from a scrolled position on `/profile`, Next.js preserves the scroll position because the new route doesn't automatically trigger a hard scroll reset in some layout configurations, leading to the user starting the quiz midway down the page.
**Fix:** Added a `useEffect` hook in `components/quiz/OnboardingQuiz.tsx` that triggers `window.scrollTo(0, 0)` whenever the `currentStepIndex` changes (which perfectly handles both mount and advancing steps). Also created a standalone `<ScrollToTop />` client component and injected it into `app/products/[barcode]/page.tsx` so saved product detail views start at the top.

## 3. Allergen Identity Colors
**Feature:** The 9 allergen identity colors defined in the registry were not consistently applied in the UI. 
**Implementation:** Expanded `COLOR_MAP` in `components/scanner/ProductResult.tsx` to include the specific Tailwind classes for all 9 identity colors (`amber`, `blue`, `orange`, `emerald`, `yellow`, `green`, `stone`, `cyan`, `rose`). 
- **Pills:** The background and text colors of detected allergens dynamically apply these identities. 
- **Ingredient Highlighting:** Reused this map to colorize matched ingredient tokens in the text block.
- **Legend:** Replaced the hardcoded legend with a dynamic map over `ALLERGEN_REGISTRY` to display all 9 identity colors alongside the ambiguous ingredient indicator, keeping the visual language strictly tied to the registry.

## 4. Severity Prominence
**Feature:** Ensure the Profile page amplifies higher severities visually (anaphylaxis > allergy > intolerance > preference) without filtering verdicts.
**Implementation:** Refactored `components/profile/EditableProfile.tsx` to inject distinct styling for each severity level:
- `anaphylaxis`: Red-tinted card (`bg-red-50 border-red-200`), bold red label, red "Anaphylactic" pill, and a warning icon (`⚠️` styling via SVG).
- `allergy`: Standard white card but with an amber border (`border-amber-300`), bold label, and amber "Allergy" pill.
- `intolerance`: Standard neutral styling.
- `preference`: Muted opacity.
Additionally, added a sort step so `anaphylaxis` and `allergy` cards bubble to the top of the profile list automatically, ensuring maximum visibility.

## Acceptance Criteria Verified
- **A. Save Bug:** Saving successfully persists and visually updates; reloading preserves the state.
- **B. Save Error:** A forced error (e.g., simulated network failure) shows an inline error message and rolls back gracefully.
- **C. Scroll-to-Top:** The quiz and product detail views now instantly load at the very top.
- **D. Identity Colors:** All 9 colors are successfully utilized.
- **E. Profile Render:** Layout does not break when multiple allergens are active.
- **F. Severity:** The red tint, bold text, and sorting logic for Anaphylaxis clearly amplifies risk.
- **G. Regression:** `test_pass_6.ts` completely passes.
- **H. TypeScript:** `npm run build` completes with 0 errors.
