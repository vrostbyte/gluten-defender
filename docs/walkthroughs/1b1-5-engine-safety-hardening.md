# Pass 1b.1.5 — Engine Safety Hardening Walkthrough

This pass introduced critical safety hardening to the `evaluateAllergen` engine to fix real-world false positives and edge cases, heavily prioritizing cautious verdicts for the celiac community and other severe allergies.

## Summary of Changes

1. **Product Name Scanning**
   - Implemented a new `findKeywordsInName` helper function that scans the `product.name` string for `definiteKeywords`.
   - Included a **negation guard**: if the matched keyword is followed within 3 words by a "free" token (e.g., `-free`, `free-from`, `no`, `without`), the match is ignored to prevent false positives (like "Wheat-Free Bread").
   - Integrated name matches into `evaluateAllergen` to return `unsafe` or `caution` depending on whether ingredient data exists.

2. **Empty Data Handling**
   - Added a hard rule at the end of the engine: if `ingredientsText`, `allergensTags`, `tracesTags`, and `labelsTags` are all empty or missing, the engine returns `unknown` instead of falling through to `likely_safe`. This prevents products with missing Open Food Facts data from falsely passing as safe.

3. **Oat Cross-Contamination Caveat (The Cheerios Fix)**
   - Oats are heavily cross-contaminated with gluten in the US. If a product contains oats (a `cautionKeyword` for gluten) but *also* carries a general "gluten-free" label, the engine now returns `caution` rather than `safe`. This is extremely conservative for celiac safety, explicitly warning users that the FDA GF label doesn't guarantee celiac-safe oats.

4. **Wording Fixes**
   - Modified the "certified free" wording to clarify that general tags (like `en:gluten-free`) often represent self-declared compliance with FDA labeling rules rather than true third-party certification.

## Exact Wording Implemented

1. **Name match (definite source + ingredients also match):**
   `"Product name suggests {Allergen} ('{matched keyword}')."`
2. **Name-no-ingredients (ingredients list exists but misses the keyword):**
   `"Name suggests {Allergen} but ingredients don't list it — verify the package."`
3. **Name match but ingredients list is completely missing:**
   `"Product name suggests {Allergen}; ingredients data unavailable — treat as unsafe until verified."`
4. **Empty-data unknown:**
   `"Insufficient product data to evaluate; read the label."`
5. **Oat caveat:**
   `"Contains {matched caution keywords}. While this product carries a gluten-free label, many oats are cross-contaminated with gluten and many people with celiac react to non-certified-gluten-free oats. Verify the package specifies certified gluten-free oats."`

## Acceptance Criteria Verified

- **A. Orowheat "whole wheat bread" (7341095702):** Now `unsafe` due to the name match + missing ingredients rule.
- **B. Honey Nut Cheerios (016000125063):** Now `caution` with the specific oat cross-contamination caveat, despite carrying a GF label.
- **C. Nature's Own 100% Whole Wheat Bread (072250037129):** Still `unsafe` with the name match string appending correctly to existing ingredient match strings.
- **D. IZZE Sparkling Mango (836093011254):** Still `caution` from natural flavors.
- **E. Empty OFF Data:** Correctly returns `unknown` with the insufficient data warning.
- **F. "Wheat-Free Bread":** The negation guard correctly suppresses the name-match logic, allowing it to fall through to `likely_safe` based on safe ingredients.
