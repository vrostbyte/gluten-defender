# Pass 1b.2.5 — Registry Expansion

## Overview
This pass substantially grew `lib/allergens/registry.ts` with citation-backed entries derived from the three primary research documents. The registry now includes detailed definitions for all 9 major US allergens (Gluten + the "Big 8"). No engine logic, UI, or Supabase migration code was altered, as mandated. 

### Entry Counts (Before → After)
- **Gluten:** `definiteKeywords` (11 → 44), `cautionKeywords` (3 → 5)
- **Milk:** `definiteKeywords` (24 → 58)
- **Peanut (New):** `definiteKeywords` (15)
- **Treenut (New):** `definiteKeywords` (40)
- **Egg (New):** `definiteKeywords` (29)
- **Soy (New):** `definiteKeywords` (23)
- **Sesame (New):** `definiteKeywords` (16)
- **Fish (New):** `definiteKeywords` (35)
- **Shellfish (New):** `definiteKeywords` (14)

### Identity Colors Chosen for New Allergens
- **Peanut:** `orange`
- **Tree Nut:** `emerald`
- **Egg:** `yellow`
- **Soy:** `green`
- **Sesame:** `stone`
- **Fish:** `cyan`
- **Shellfish:** `rose`

## Judgment Calls & Citations

**(a) Maltodextrin / Glucose Syrup / Dextrose for Gluten**
- **Call:** Omitted entirely from `definiteKeywords` and `AMBIGUOUS_INGREDIENTS`.
- **Citation:** `[cps]` Gluten Free Watchdog (March 14, 2019) considers these gluten-free regardless of starch source provided the final product is under 20 ppm.

**(b) Wheat Starch for Gluten**
- **Call:** Kept in `definiteKeywords`.
- **Citation:** `[cps]` Plain wheat starch without a GF label is a genuine risk. The engine's existing logic correctly clears it if the product carries a certified GF label.

**(c) Oats for Gluten**
- **Call:** Kept in `cautionKeywords`.
- **Citation:** `[v2 §1 Table 3; cps]` The FDA GF label does not require celiac-safe oat sourcing (purity protocol). A documented 2015 Cheerios wheat-contamination recall and avenin reactions in some celiacs make oats conservatively risky.

**(d) Noisy Citations in v2**
- **Call:** Filtered out clearly unreliable attributions.
- **Handling:** Ignored the citation linking Sesame to "Egg - FoodAllergy.org". Also omitted the bizarre v2 note claiming "fish protein" was "avian-derived". Only defensible data points were retained.

**(e) Soy Oil Exemption**
- **Call:** Omitted "soybean oil" and "vegetable oil" from Soy `definiteKeywords`.
- **Citation:** `[v1 §7 Table 2; v2 §6 Table 2]` FALCPA exempts highly refined soybean oil as the refining process removes the proteins.

## Acceptance Criteria Results

- **A. IZZE Sparkling Mango (836093011254):** `Gluten: caution`, `Milk: likely_safe`. The natural flavors flagged gluten caution. Milk was safely bypassed (the milk pill remains visible but visually quiet).
- **B. Nature's Own 100% Whole Wheat Bread (072250037129):** `Gluten: unsafe`. Successfully caught "wheat" and "wheat flour".
- **C. Honey Nut Cheerios (016000125063):** `Gluten: caution`. The oat caveat successfully fired despite the GF label, citing the 2015 recall and avenin reactions.
- **D. Heinz Tomato Ketchup (Mock):** `Gluten: safe`. Despite `modified food starch` existing in `AMBIGUOUS_INGREDIENTS`, the product's `en:gluten-free` label successfully skipped the ambiguous check and resulted in safe (GFWD position encoded).
- **E. Mock test with Pistachio and Tahini:** `Tree Nut: unsafe`, `Sesame: unsafe`. Both newly added allergens were successfully flagged as "also detected".
- **F. Mock test with Soybean Oil:** *Edge Case Noted*. The prompt instructed to omit "soybean oil" from `definiteKeywords`, but mandated the inclusion of "soybean". Because the existing engine's `findKeywords` uses standard word boundaries (`\bsoybean\b`), "soybean" successfully matches the first word in "soybean oil". Because altering the `findKeywords` engine logic or injecting regex/negation into the arrays was strictly forbidden, Soy currently evaluates to `unsafe`. This is a known, mathematically unavoidable constraint of the current matching engine.
- **G. Build Verification:** `npm run build` passed locally with zero TypeScript errors and zero warnings.
