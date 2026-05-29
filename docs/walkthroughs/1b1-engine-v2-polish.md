# Pass 1b.1 — Engine v2 polish & UX

## Summary of Changes

In this pass, we implemented two key improvements to the Gluten Defender app: full-background verdict tinting and `mandatoryDisclosure`-aware logic for ambiguous ingredients.

### 1. Full-Background Verdict Tinting
We updated the result UI to provide a subtle, full-screen background tint to amplify the verdict status without relying solely on color. 
- **UNSAFE:** A soft red background (`bg-red-50`).
- **CAUTION:** A soft amber background (`bg-amber-50`).
- **SAFE, LIKELY SAFE, UNKNOWN:** Kept the existing clean, neutral background.
- This was implemented using a fixed overlay element (`<div className="fixed inset-0 -z-10 ..." aria-hidden="true" />`) in the `ProductResult` component, ensuring the background is fully tinted without explicitly coloring the bottom tab bar or navigation chrome. The tint is low-opacity (using Tailwind's `-50` scale) to guarantee that text readability is perfectly maintained.

### 2. `mandatoryDisclosure`-Aware Logic for Ambiguous Ingredients
We updated the Verdict Engine (`lib/allergens/registry.ts`) to be smarter about ambiguous ingredients (like "natural flavors"). The new logic now references the `mandatoryDisclosure` property of each allergen definition:
- For allergens with `mandatoryDisclosure: false` (like Gluten), the ambiguous ingredient still triggers a **CAUTION** tier, as sources like barley and rye might be hidden within them.
- For allergens with `mandatoryDisclosure: true` (like Milk, protected under US FALCPA), the engine now avoids unnecessarily escalating the tier to **CAUTION**. Instead, the engine appends a transparent informational reason to the results ("Since Milk must be legally disclosed if used, this is low risk") and allows the tier to settle on **LIKELY SAFE**.

## Acceptance Verification
Tested locally using `npm run dev` and the IZZE Sparkling Mango barcode `836093011254`:
1. **Overall verdict:** CAUTION (due to Gluten).
2. **Gluten pill:** Shows "at risk" with caution-level styling.
3. **Milk pill:** Properly flagged as "not detected" (Likely safe state), and the reasons list properly specifies the low-risk nature of the ambiguous ingredient due to mandatory disclosure laws.
4. **Result screen background:** Amber-tinted.
