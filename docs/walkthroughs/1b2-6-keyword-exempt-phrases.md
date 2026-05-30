# Pass 1b.2.6 — Keyword Exempt Phrases

## Overview
This pass introduces a surgical enhancement to the allergen verdict engine. We extended the keyword matching mechanism to support "exempt phrases"—specific phrases where, if a registered keyword occurs inside them, the match is deliberately suppressed. This resolves critical false positives like FALCPA-exempt "soybean oil" incorrectly triggering an unsafe verdict for soy due to the `\bsoybean\b` word boundary match.

## Implementation Details
**Approach B** was chosen for its minimal intrusiveness. Rather than complicating the existing string array types, I added an optional `keywordExemptions: Record<string, string[]>` property to the `AllergenDef` interface. 
This leaves the `definiteKeywords` and `cautionKeywords` arrays untouched as pure strings, isolating the exemption mapping.

The `findKeywords` and `findKeywordsInName` engine functions were updated to accept the `exemptions` record. When a keyword match occurs, the engine verifies the match's index position; if the position falls inside any known exempt phrase for that keyword within the text, the match is safely bypassed.

## Keyword Exemptions Added

### Soy
- **`soybean`** exempts: `["soybean oil", "soya oil"]`
- **`soy`** exempts: `["soy oil"]`
- *Basis:* FALCPA EXEMPTION: highly refined soybean oil is exempt from allergen labeling (proteins removed).

### Gluten
- **`wheat`** exempts: `["wheat-free", "wheat free"]`
- **`barley`** exempts: `["barley-free", "barley free"]`
- **`rye`** exempts: `["rye-free", "rye free"]`
- **`gluten`** exempts: `["gluten-free", "gluten free"]`
- *Basis:* NEGATION CLAIM: An explicit "free" claim natively inside the text should not trigger the allergen.

### Milk
- **`milk`** exempts: `["milk-free", "milk free", "non-milk", "without milk"]`
- **`casein`** exempts: `["casein-free", "casein free"]`
- *Basis:* NEGATION CLAIM. *(Note: The hardcoded marketing traps "non-dairy" and "dairy-free" remain fully intact and were purposefully excluded from this exemption list. They continue to act as alarm signals if an actual milk ingredient is present, or drop to likely_safe with a specific note if no ingredients are found.)*

### Peanut
- **`peanut`** exempts: `["peanut-free", "peanut free"]`

### Tree Nut
- **`almond`** exempts: `["almond-free", "almond free"]`
- **`cashew`** exempts: `["cashew-free", "cashew free"]`
- **`walnut`** exempts: `["walnut-free", "walnut free"]`
- **`nut`** exempts: `["nut-free", "nut free"]`
- *Basis:* NEGATION CLAIM. Tree nut oils (e.g. walnut oil) are specifically NOT exempt, as they can carry allergenic proteins.

### Egg, Sesame, Fish, Shellfish
- Added their primary `-free` negation claims (`egg-free`, `sesame-free`, `fish-free`, `shellfish-free`).

## Acceptance Criteria Results

- **A. Soybean oil case (bug fix):** `Soy: likely_safe`. The `soybean` match correctly suppressed itself because it existed exclusively within the phrase `soybean oil`.
- **B. Real soy case:** `Soy: unsafe`. A product containing both `soybean` and `soybean oil` successfully fired the alarm for the bare `soybean`.
- **C. Wheat-free claim:** `Gluten: likely_safe`. The phrase `wheat-free` bypassed the `wheat` trigger.
- **D. Genuine wheat:** `Gluten: unsafe`. `wheat` in `whole wheat flour` properly alarmed.
- **E. Walnut oil (contrast case):** `Tree Nut: unsafe`. We correctly did NOT blanket-exempt all oils. Walnut oil remains unsafe.
- **F. Hardcoded milk traps:** `Milk: unsafe`. `non-dairy` was not an exempt phrase, allowing `sodium caseinate` to cleanly trigger the alarm.
- **G. Prior passing tests:** All prior engine logic tests passed without issue (IZZE, Cheerios, Ketchup, Pistachio/Tahini).
- **H. Build Verification:** `npm run build` executed smoothly locally with zero TypeScript errors or warnings.

## Known Limitations & Edge Cases
The exempt-phrase logic uses a standard exact-match string search (`indexOf`) rather than regex for the exempt phrase detection. Consequently, unpredictable whitespace (e.g., `soybean    oil`) or newline breaks between words inside an exempt phrase might fail to suppress the keyword. This is generally a non-issue with sanitized OFF data, but something to note if ingredient arrays have extreme structural variance.
