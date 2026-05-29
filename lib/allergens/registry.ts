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
  name?: string | null;
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
 * Checks if any keyword matches within the product name, using word boundaries.
 * Case-insensitive. Includes a negation guard: if a word like "free" or "without"
 * appears within 3 words after the keyword, it's NOT considered a positive match.
 */
function findKeywordsInName(text: string, keywords: string[]): string[] {
  if (!text) return [];
  const found: string[] = [];
  
  for (const kw of keywords) {
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedKw}\\b`, "ig");
    let match;
    let keywordFound = false;
    while ((match = regex.exec(text)) !== null) {
      const after = text.slice(match.index + match[0].length);
      const nextWords = after
        .split(/[\s,.;:()-]+/)
        .filter((w) => w.length > 0)
        .slice(0, 3)
        .map((w) => w.toLowerCase());
      const isNegated = nextWords.some(
        (w) => w === "free" || w === "free-from" || w === "no" || w === "without"
      );
      if (!isNegated) {
        keywordFound = true;
        break;
      }
    }
    if (keywordFound && !found.includes(kw)) {
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
  if (!product) {
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

  // --- Definite source -> unsafe / caution ---
  const allergenTagMatch = allergen.allergenTags.some((t) => allergens.includes(t));
  const matchedKeywords = findKeywords(ingredients, allergen.definiteKeywords);
  const matchedNameKeywords = findKeywordsInName(product.name || "", allergen.definiteKeywords);

  if (allergenTagMatch || matchedKeywords.length > 0 || matchedNameKeywords.length > 0) {
    let tier: VerdictTier = "unsafe";

    if (allergenTagMatch) reasoning.push(`Allergen tag lists ${allergen.label}.`);
    
    if (matchedKeywords.length > 0) {
      reasoning.push(
        `Ingredients mention a ${allergen.label} source: ${matchedKeywords.join(", ")}.`
      );
    }

    if (matchedNameKeywords.length > 0) {
      if (matchedKeywords.length > 0) {
        reasoning.push(`Product name suggests ${allergen.label} ('${matchedNameKeywords[0]}').`);
      } else if (ingredients.trim().length > 0) {
        tier = "caution";
        reasoning.push(`Name suggests ${allergen.label} but ingredients don't list it — verify the package.`);
      } else {
        tier = "unsafe";
        reasoning.push(`Product name suggests ${allergen.label}; ingredients data unavailable — treat as unsafe until verified.`);
      }
    }

    if (tier === "unsafe" || tier === "caution") {
      if (allergenTagMatch) tier = "unsafe";
      return { tier, reasoning };
    }
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
  const matchedCaution = allergen.cautionKeywords ? findKeywords(ingredients, allergen.cautionKeywords) : [];
  if (matchedCaution.length > 0 && !certifiedFree) {
    reasoning.push(
      `Contains ${matchedCaution.join(", ")}, which are frequently cross-contaminated with ${allergen.label} and are not certified free here.`
    );
    return { tier: "caution", reasoning };
  }

  // --- Certified free -> safe ---
  if (certifiedFree) {
    // Oat caveat: if gluten and it has oats, even if certified free, we flag caution.
    // Why: The FDA gluten-free label does not require celiac-safe oat sourcing, and many celiacs react.
    if (allergen.id === "gluten" && matchedCaution.length > 0) {
      reasoning.push(
        `Contains ${matchedCaution.join(", ")}. While this product carries a gluten-free label, many oats are cross-contaminated with gluten and many people with celiac react to non-certified-gluten-free oats. Verify the package specifies certified gluten-free oats.`
      );
      return { tier: "caution", reasoning };
    }

    reasoning.push(`Label indicates ${allergen.label}-free (note: this may be the manufacturer's self-declared compliance with FDA labeling rules, not necessarily third-party certified).`);
    reasoning.push(`No ${allergen.label} ingredients detected.`);
    return { tier: "safe", reasoning };
  }

  // --- Empty data -> unknown ---
  if (!ingredients.trim() && allergens.length === 0 && traces.length === 0 && labels.length === 0) {
    return {
      tier: "unknown",
      reasoning: ["Insufficient product data to evaluate; read the label."]
    };
  }

  // --- Else -> likely safe ---
  reasoning.push(`No ${allergen.label} ingredients detected, but it is not certified ${allergen.label}-free.`);
  
  if (hasMilkFalseSafety && isMilk) {
    reasoning.push(`Note: "lactose-free" or "non-dairy" claims do not guarantee it is free of milk proteins.`);
  }

  return { tier: "likely_safe", reasoning };
}
