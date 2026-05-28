/**
 * Verdict Engine v1
 * -----------------
 * Turns raw Open Food Facts product data into a celiac-safety *verdict*: a
 * confidence TIER plus plain-language REASONING explaining why.
 *
 * Guiding rule from the PRD: this is DECISION SUPPORT, never a medical guarantee.
 * So we are deliberately CONSERVATIVE — when in doubt we choose "caution" or
 * "unknown" rather than risk a false "safe". The UI always tells the user to
 * verify the physical packaging, on every tier.
 *
 * This file is plain TypeScript (no browser/server-only code) so it can run in
 * the API route AND its types can be imported by the UI.
 */

/** The five possible safety tiers, from most to least confident. */
export type VerdictTier = "safe" | "likely_safe" | "caution" | "unsafe" | "unknown";

/** Product data, normalized from Open Food Facts into the fields we care about. */
export interface ProductData {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredientsText: string | null;
  /** Open Food Facts tags, e.g. ["en:gluten", "en:milk"]. */
  allergensTags: string[];
  /** "May contain" / shared-facility traces, e.g. ["en:gluten"]. */
  tracesTags: string[];
  /** Labels/certifications, e.g. ["en:gluten-free", "en:organic"]. */
  labelsTags: string[];
  /** Additives, e.g. ["en:e330"]. (Reserved for future verdict signals.) */
  additivesTags: string[];
}

/** The verdict the engine produces. */
export interface Verdict {
  tier: VerdictTier;
  /** Short, human-readable evidence strings, shown to the user. */
  reasoning: string[];
}

/** The full response our API route returns to the client. */
export interface ProductLookupResult {
  found: boolean;
  barcode: string;
  product: ProductData | null;
  verdict: Verdict;
}

/**
 * Hidden-gluten keyword list. A match in the ingredients text counts as a gluten
 * source. Kept here, lowercase, so it is easy to expand later.
 * NOTE: "malt" already covers "malt extract" via substring matching, but we keep
 * the explicit phrase for clarity/documentation.
 */
export const GLUTEN_KEYWORDS = [
  "wheat",
  "barley",
  "rye",
  "malt",
  "malt extract",
  "brewer's yeast",
  "triticale",
  "spelt",
  "farro",
  "semolina",
  "durum",
] as const;

/** Open Food Facts uses this tag to mark certified/declared gluten-free. */
const GLUTEN_FREE_LABELS = ["en:gluten-free", "en:no-gluten"];

/**
 * Compute the verdict for a product. Pass `null` when no product data exists.
 *
 * Logic, in strict priority order (first match wins):
 *   1. No usable data            -> "unknown"
 *   2. Gluten source present     -> "unsafe"
 *   3. "May contain" gluten      -> "caution"
 *   4. Oats (not certified GF)   -> "caution"   (oats are cross-contaminated often)
 *   5. Certified GF + no gluten  -> "safe"
 *   6. Otherwise                 -> "likely_safe"
 */
export function computeVerdict(product: ProductData | null): Verdict {
  // --- 1. Nothing to judge ---
  const hasSignals =
    !!product &&
    (!!product.ingredientsText ||
      product.allergensTags.length > 0 ||
      product.labelsTags.length > 0 ||
      product.tracesTags.length > 0);

  if (!product || !hasSignals) {
    return {
      tier: "unknown",
      reasoning: [
        "Not enough information about this product to judge — please read the physical label.",
      ],
    };
  }

  // Normalize everything to lowercase so comparisons are reliable.
  const ingredients = (product.ingredientsText ?? "").toLowerCase();
  const allergens = product.allergensTags.map((t) => t.toLowerCase());
  const traces = product.tracesTags.map((t) => t.toLowerCase());
  const labels = product.labelsTags.map((t) => t.toLowerCase());

  const certifiedGlutenFree = GLUTEN_FREE_LABELS.some((l) => labels.includes(l));
  const reasoning: string[] = [];

  // --- 2. Definite gluten source -> unsafe ---
  const allergenListsGluten = allergens.includes("en:gluten");
  const matchedKeywords = GLUTEN_KEYWORDS.filter((kw) => ingredients.includes(kw));

  if (allergenListsGluten || matchedKeywords.length > 0) {
    if (allergenListsGluten) reasoning.push("Allergen tag lists gluten.");
    if (matchedKeywords.length > 0) {
      reasoning.push(
        `Ingredients mention a gluten source: ${matchedKeywords.join(", ")}.`,
      );
    }
    return { tier: "unsafe", reasoning };
  }

  // --- 3. Cross-contamination / "may contain" -> caution ---
  if (traces.includes("en:gluten")) {
    reasoning.push(
      'Label warns it may contain gluten (e.g. "may contain" or a shared facility).',
    );
    return { tier: "caution", reasoning };
  }

  // --- 4. Oats: caution unless certified gluten-free ---
  // "oat" matches oat, oats, oatmeal. Oats are naturally gluten-free but are
  // very commonly cross-contaminated, so many celiacs avoid non-certified oats.
  if (ingredients.includes("oat") && !certifiedGlutenFree) {
    reasoning.push(
      "Contains oats, which are frequently cross-contaminated with gluten and are not certified gluten-free here.",
    );
    return { tier: "caution", reasoning };
  }

  // --- 5. Certified gluten-free, with no gluten signals -> safe ---
  if (certifiedGlutenFree) {
    reasoning.push("Label: certified gluten-free.");
    reasoning.push("No gluten ingredients detected.");
    return { tier: "safe", reasoning };
  }

  // --- 6. No gluten found, but no certification -> likely safe ---
  reasoning.push("No gluten ingredients detected, but it is not certified gluten-free.");
  return { tier: "likely_safe", reasoning };
}
