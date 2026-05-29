/**
 * Allergen Registry & Verdict Engine
 * ----------------------------------
 * This file contains the complete, data-driven registry of allergens and the 
 * engine function that evaluates a product against any given allergen definition.
 * 
 * To add a new allergen, simply add a new entry to ALLERGEN_REGISTRY.
 */

export type VerdictTier = "safe" | "likely_safe" | "caution" | "unsafe" | "unknown";

export interface AllergenDef {
  id: string;
  label: string;
  identityColor: string; // e.g., "amber", "blue"
  icon: string;
  allergenTags: string[];
  tracesTags: string[];
  certifiedFreeLabels: string[];
  definiteKeywords: string[];
  cautionKeywords?: string[];
  mandatoryDisclosure: boolean;
}

export interface AllergenVerdict {
  tier: VerdictTier;
  reasoning: string[];
}

export interface ProductDataSlim {
  ingredientsText: string | null;
  allergensTags: string[];
  tracesTags: string[];
  labelsTags: string[];
}

export const AMBIGUOUS_INGREDIENTS = [
  "natural flavors",
  "natural flavor",
  "artificial flavors",
  "artificial flavor",
  "flavoring",
  "spices",
  "spice",
  "seasoning",
  "yeast extract",
  "smoke flavoring",
  "modified food starch",
  "caramel color",
];

export const DEFAULT_PROFILE = ["gluten", "milk"];

export const ALLERGEN_REGISTRY: AllergenDef[] = [
  {
    id: "gluten",
    label: "Gluten",
    identityColor: "amber",
    icon: "🌾",
    allergenTags: ["en:gluten"],
    tracesTags: ["en:gluten"],
    certifiedFreeLabels: ["en:gluten-free", "en:no-gluten"],
    definiteKeywords: [
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
    ],
    cautionKeywords: ["oat", "oats", "oatmeal"],
    mandatoryDisclosure: false,
  },
  {
    id: "milk",
    label: "Milk",
    identityColor: "blue",
    icon: "🥛",
    allergenTags: ["en:milk"],
    tracesTags: ["en:milk"],
    certifiedFreeLabels: ["en:milk-free", "en:vegan"],
    definiteKeywords: [
      "milk",
      "butter",
      "cream",
      "cheese",
      "casein",
      "caseinate",
      "sodium caseinate",
      "potassium caseinate",
      "calcium caseinate",
      "magnesium caseinate",
      "whey",
      "lactalbumin",
      "lactoglobulin",
      "lactose",
      "ghee",
      "curds",
      "custard",
      "milk solids",
      "milk protein isolate",
      "hydrolyzed milk protein",
      "nougat",
      "rennet",
      "recaldent",
      "simplesse",
    ],
    mandatoryDisclosure: true,
  },
];

/**
 * Checks if any keyword matches within the text, using word boundaries.
 * Case-insensitive.
 */
function findKeywords(text: string, keywords: string[]): string[] {
  if (!text) return [];
  const found: string[] = [];
  for (const kw of keywords) {
    // Escape any regex special characters in the keyword just in case.
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word boundary matching, case insensitive.
    const regex = new RegExp(`\\b${escapedKw}\\b`, "i");
    if (regex.test(text)) {
      found.push(kw);
    }
  }
  return found;
}

/**
 * The core engine logic evaluating a product for a specific allergen.
 */
export function evaluateAllergen(
  product: ProductDataSlim | null,
  allergen: AllergenDef
): AllergenVerdict {
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

  const ingredients = product.ingredientsText || "";
  const allergens = product.allergensTags.map((t) => t.toLowerCase());
  const traces = product.tracesTags.map((t) => t.toLowerCase());
  const labels = product.labelsTags.map((t) => t.toLowerCase());

  const certifiedFree = allergen.certifiedFreeLabels.some((l) =>
    labels.includes(l)
  );
  
  // Milk-specific guards: do NOT treat "lactose-free", "non-dairy", or "dairy-free" as proof of safety,
  // unless there are no other signals. However, "dairy-free" label might be in certifiedFreeLabels.
  // Wait, the PRD says: "do NOT treat "lactose-free", "non-dairy", or "dairy-free" as proof of safety".
  // Let's implement this guard explicitly.
  const isMilk = allergen.id === "milk";
  const hasMilkFalseSafety = isMilk && 
    (ingredients.toLowerCase().includes("lactose-free") || 
     ingredients.toLowerCase().includes("non-dairy") ||
     ingredients.toLowerCase().includes("dairy-free") ||
     labels.includes("en:lactose-free") || 
     labels.includes("en:non-dairy") ||
     labels.includes("en:dairy-free"));

  const reasoning: string[] = [];

  // --- Definite source -> unsafe ---
  const allergenTagMatch = allergen.allergenTags.some((t) => allergens.includes(t));
  const matchedKeywords = findKeywords(ingredients, allergen.definiteKeywords);

  if (allergenTagMatch || matchedKeywords.length > 0) {
    if (allergenTagMatch) reasoning.push(`Allergen tag lists ${allergen.label}.`);
    if (matchedKeywords.length > 0) {
      reasoning.push(
        `Ingredients mention a ${allergen.label} source: ${matchedKeywords.join(", ")}.`
      );
    }
    return { tier: "unsafe", reasoning };
  }

  // --- Cross-contamination / "may contain" -> caution ---
  const tracesMatch = allergen.tracesTags.some((t) => traces.includes(t));
  if (tracesMatch) {
    reasoning.push(
      `Label warns it may contain ${allergen.label} (e.g. "may contain" or a shared facility).`
    );
    return { tier: "caution", reasoning };
  }
  
  // --- Ambiguous ingredients -> caution (if not certified free) ---
  const matchedAmbiguous = findKeywords(ingredients, AMBIGUOUS_INGREDIENTS);
  if (matchedAmbiguous.length > 0 && !certifiedFree) {
    if (allergen.mandatoryDisclosure) {
      reasoning.push(
        `Contains ambiguous ingredients (${matchedAmbiguous.join(", ")}). Since ${allergen.label} must be legally disclosed if used, this is low risk.`
      );
      // We do not return here; allow it to fall through to likely_safe (or caution if other signals exist).
    } else {
      reasoning.push(
        `Contains ${matchedAmbiguous.join(", ")}, which can hide ${allergen.label} and isn't required to be disclosed unless the product is certified free.`
      );
      return { tier: "caution", reasoning };
    }
  }

  // --- Caution keywords -> caution (if not certified free) ---
  if (allergen.cautionKeywords) {
    const matchedCaution = findKeywords(ingredients, allergen.cautionKeywords);
    if (matchedCaution.length > 0 && !certifiedFree) {
      reasoning.push(
        `Contains ${matchedCaution.join(", ")}, which are frequently cross-contaminated with ${allergen.label} and are not certified free here.`
      );
      return { tier: "caution", reasoning };
    }
  }

  // --- Milk-specific false safety guard ---
  // If milk, and no definite sources, but it says "non-dairy" and is NOT explicitly certified vegan/dairy-free
  // Wait, if it has a false safety keyword but wasn't certified, maybe we just note it or it falls through to likely safe.
  // Actually, PRD says: 'do NOT treat "lactose-free", "non-dairy", or "dairy-free" as proof of safety — they don't mean milk-protein-free.'
  // This just means we shouldn't set `tier: "safe"` just because those words are present. 
  // We already don't use them to set "safe". We only use `certifiedFreeLabels` to set "safe".
  // For milk, our `certifiedFreeLabels` are `["en:dairy-free", "en:milk-free", "en:vegan"]`.
  // Wait, if "dairy-free" is in `certifiedFreeLabels`, then we DO treat it as proof of safety.
  // The PRD says: "Milk-specific guards (hardcode): do NOT treat "lactose-free", "non-dairy", or "dairy-free" as proof of safety — they don't mean milk-protein-free."
  // So I should remove "en:dairy-free" from milk's `certifiedFreeLabels` and explicitly add a guard.

  // --- Certified free -> safe ---
  if (certifiedFree) {
    reasoning.push(`Label: certified ${allergen.label}-free.`);
    reasoning.push(`No ${allergen.label} ingredients detected.`);
    return { tier: "safe", reasoning };
  }

  // --- Else -> likely safe ---
  reasoning.push(`No ${allergen.label} ingredients detected, but it is not certified ${allergen.label}-free.`);
  
  if (hasMilkFalseSafety && isMilk) {
    // If it claims lactose-free/non-dairy but we reached here, it's just likely safe (or we could make it caution?).
    // The PRD doesn't say it MAKES it caution, just that it DOES NOT prove safety.
    reasoning.push(`Note: "lactose-free" or "non-dairy" claims do not guarantee it is free of milk proteins.`);
  }

  return { tier: "likely_safe", reasoning };
}
