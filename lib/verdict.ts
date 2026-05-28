import {
  ALLERGEN_REGISTRY,
  AllergenDef,
  AllergenVerdict,
  AMBIGUOUS_INGREDIENTS,
  DEFAULT_PROFILE,
  evaluateAllergen,
  VerdictTier,
} from "./allergens/registry";

export type { VerdictTier, AllergenVerdict } from "./allergens/registry";

/** Product data, normalized from Open Food Facts into the fields we care about. */
export interface ProductData {
  barcode: string;
  name: string | null;
  brand: string | null;
  imageUrl: string | null;
  ingredientsText: string | null;
  allergensTags: string[];
  tracesTags: string[];
  labelsTags: string[];
  additivesTags: string[];
}

export interface IngredientToken {
  text: string;
  isAllergen?: boolean;
  allergenId?: string;
  isAmbiguous?: boolean;
}

/** The full verdict returned for a product */
export interface OverallVerdict {
  tier: VerdictTier;
  allergenVerdicts: Record<string, AllergenVerdict>;
  ingredientHighlights: IngredientToken[];
}

/** The full response our API route returns to the client. */
export interface ProductLookupResult {
  found: boolean;
  barcode: string;
  product: ProductData | null;
  verdict: OverallVerdict;
}

const TIER_WEIGHT: Record<VerdictTier, number> = {
  unsafe: 4,
  caution: 3,
  unknown: 2,
  likely_safe: 1,
  safe: 0,
};

function getWorstTier(tiers: VerdictTier[]): VerdictTier {
  if (tiers.length === 0) return "unknown";
  return tiers.reduce((worst, current) =>
    TIER_WEIGHT[current] > TIER_WEIGHT[worst] ? current : worst
  );
}

interface MatchSpan {
  start: number;
  end: number;
  isAllergen: boolean;
  allergenId?: string;
  isAmbiguous: boolean;
}

function buildHighlights(
  text: string | null,
  registry: AllergenDef[]
): IngredientToken[] {
  if (!text) return [];

  const spans: MatchSpan[] = [];

  // Helper to find and add spans
  const addSpans = (
    keywords: string[],
    isAllergen: boolean,
    allergenId?: string,
    isAmbiguous = false
  ) => {
    for (const kw of keywords) {
      const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const regex = new RegExp(`\\b${escapedKw}\\b`, "gi");
      let match;
      while ((match = regex.exec(text)) !== null) {
        spans.push({
          start: match.index,
          end: match.index + match[0].length,
          isAllergen,
          allergenId,
          isAmbiguous,
        });
      }
    }
  };

  // Find all matches
  for (const allergen of registry) {
    addSpans(allergen.definiteKeywords, true, allergen.id);
  }
  addSpans(AMBIGUOUS_INGREDIENTS, false, undefined, true);

  if (spans.length === 0) {
    return [{ text }];
  }

  // Sort spans by start index, then by length (longest first)
  spans.sort((a, b) => {
    if (a.start !== b.start) return a.start - b.start;
    return (b.end - b.start) - (a.end - a.start);
  });

  // Filter overlapping spans (keep the first, which is longest due to sort)
  const filteredSpans: MatchSpan[] = [];
  let lastEnd = 0;
  for (const span of spans) {
    if (span.start >= lastEnd) {
      filteredSpans.push(span);
      lastEnd = span.end;
    }
  }

  // Build tokens
  const tokens: IngredientToken[] = [];
  let currentIndex = 0;
  for (const span of filteredSpans) {
    if (span.start > currentIndex) {
      tokens.push({ text: text.substring(currentIndex, span.start) });
    }
    tokens.push({
      text: text.substring(span.start, span.end),
      isAllergen: span.isAllergen,
      allergenId: span.allergenId,
      isAmbiguous: span.isAmbiguous,
    });
    currentIndex = span.end;
  }
  if (currentIndex < text.length) {
    tokens.push({ text: text.substring(currentIndex) });
  }

  return tokens;
}

export function computeVerdict(product: ProductData | null): OverallVerdict {
  const allergenVerdicts: Record<string, AllergenVerdict> = {};

  if (!product) {
    for (const allergen of ALLERGEN_REGISTRY) {
      allergenVerdicts[allergen.id] = {
        tier: "unknown",
        reasoning: ["Product not found."],
      };
    }
    return {
      tier: "unknown",
      allergenVerdicts,
      ingredientHighlights: [],
    };
  }

  const profileTiers: VerdictTier[] = [];

  for (const allergen of ALLERGEN_REGISTRY) {
    const verdict = evaluateAllergen(product, allergen);
    allergenVerdicts[allergen.id] = verdict;

    if (DEFAULT_PROFILE.includes(allergen.id)) {
      profileTiers.push(verdict.tier);
    }
  }

  // PRD: "preserve the existing behavior for products not found, no-data/unknown, and network errors"
  // If no signals are present for ANY allergen, the evaluateAllergen engine returns "unknown" for all of them.
  // The worst tier of ["unknown", "unknown"] is "unknown", which handles the no-data case properly.

  const overallTier = getWorstTier(profileTiers);
  const ingredientHighlights = buildHighlights(product.ingredientsText, ALLERGEN_REGISTRY);

  return {
    tier: overallTier,
    allergenVerdicts,
    ingredientHighlights,
  };
}
