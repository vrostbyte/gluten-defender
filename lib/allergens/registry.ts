/**
 * Allergen Registry & Verdict Engine
 * ----------------------------------
 * This file contains the complete, data-driven registry of allergens.
 * It draws from:
 * - docs/research/allergen-reference-2026-05.md
 * - docs/research/allergen-reference-2026-05-v2.md
 * - docs/research/celiac-position-statements-2026-05.md
 * 
 * Citation Comment Convention:
 * // [v1 §X Table Y] refers to allergen-reference-2026-05.md
 * // [v2 §X Table Y] refers to allergen-reference-2026-05-v2.md
 * // [cps] refers to celiac-position-statements-2026-05.md
 * 
 * The engine logic (evaluateAllergen) lives at the bottom of this file and is NOT to be modified by registry edits.
 * Most recent expansion: 2026-05.
 * 
 * JUDGMENT CALLS:
 * [cps] Gluten Free Watchdog (March 14, 2019) considers maltodextrin, glucose syrup, dextrose gluten-free regardless of starch source provided final product is under 20 ppm. They are NOT included in definiteKeywords or AMBIGUOUS_INGREDIENTS.
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
  keywordExemptions?: Record<string, string[]>;
  mandatoryDisclosure: boolean;
  euDisclosure?: boolean;
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
  "natural flavors", // [v1 §2 Table 2; v2 §1 Table 2]
  "natural flavor", // [v1 §2 Table 2; v2 §1 Table 2]
  "artificial flavors", // [v1 §2 Table 2; v2 §1 Table 2]
  "artificial flavor", // [v1 §2 Table 2; v2 §1 Table 2]
  "flavoring", // [v1 §2 Table 2; v2 §1 Table 2]
  "flavorings", // [v1 §2 Table 2; v2 §1 Table 2]
  "spices", // [v1 §2 Table 2; v2 §1 Table 2]
  "spice", // [v1 §2 Table 2; v2 §1 Table 2]
  "seasoning", // [v1 §2 Table 2; v2 §1 Table 2]
  "seasonings", // [v1 §2 Table 2; v2 §1 Table 2]
  "yeast extract", // [v1 §2 Table 2; v2 §1 Table 2]
  "smoke flavoring", // [v1 §2 Table 2; v2 §1 Table 2]
  "modified food starch", // [v1 §2 Table 2; v2 §1 Table 2]
  "caramel color", // [v1 §2 Table 2; v2 §1 Table 2]
  "caramel coloring", // [v1 §2 Table 2; v2 §1 Table 2]
  "starch", // [v1 §2 Table 2; v2 §1 Table 2]
  "dextrin", // [v1 §2 Table 2; v2 §1 Table 2]
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
    // [v1 §11 Table 4] EU classifies oats as a cereal containing gluten
    euDisclosure: true,
    definiteKeywords: [
      // [v2 §1 Table 1; v1 §2 Table 1]
      "wheat", "barley", "rye", "gliadin", "hordein", "secalin", "avenin", "triticale", "spelt", "einkorn", "emmer", "farro", "kamut", "khorasan", "seitan", "malt", "malt extract", "malt flavoring", "malt syrup", "brewer's yeast", "farina", "durum", "semolina", "bulgur", "graham flour", "couscous", "matzo", "matzah", "matzot", "vital wheat gluten", "wheat bran", "wheat germ", "wheat starch", "wheat flour", "atta", "club wheat", "fu", "barley malt", "orzo", "panko", "udon", "wheat protein", "hydrolyzed wheat protein", "wheat protein isolate"
      // [cps] wheat starch is kept because plain wheat starch without a GF label is a risk.
    ],
    cautionKeywords: [
      // [v2 §1 Table 3; cps] The FDA gluten-free label does not require celiac-safe oat sourcing. A 2015 Cheerios wheat-contamination recall and avenin reactions in some celiacs make oats risky.
      "oats", "oat", "oat flour", "oat bran", "oatmeal"
    ],
    // NEGATION CLAIM: a "<allergen>-free" claim must not trigger the allergen.
    keywordExemptions: {
      "wheat": ["wheat-free", "wheat free"],
      "barley": ["barley-free", "barley free"],
      "rye": ["rye-free", "rye free"],
      "gluten": ["gluten-free", "gluten free"]
    },
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
    // [v1 §11 Table 4]
    euDisclosure: true,
    // [v2 §2 Table 2; v1 milk Table 2] HARDCODED TRAPS in logic: "lactose-free", "non-dairy", "dairy-free" are NOT legally defined and may still contain casein; they must never be treated as proof of safety.
    definiteKeywords: [
      // [v2 §2 Table 1; v1 milk Table 1]
      "milk", "butter", "butterfat", "butter oil", "anhydrous milk fat", "anhydrous butter oil", "butter acid", "cream", "half and half", "heavy cream", "sour cream", "buttermilk", "condensed milk", "evaporated milk", "cheese", "casein", "casein hydrolysate", "sodium caseinate", "calcium caseinate", "ammonium caseinate", "iron caseinate", "magnesium caseinate", "potassium caseinate", "zinc caseinate", "rennet casein", "whey", "whey protein isolate", "whey protein concentrate", "lactalbumin", "lactalbumin phosphate", "lactoglobulin", "lactoferrin", "lactose", "lactulose", "galactose", "milk solids", "nonfat milk solids", "milk protein", "milk protein isolate", "hydrolyzed milk protein", "ghee", "curds", "custard", "yogurt", "kefir", "quark", "quarg", "skyr", "paneer", "recaldent", "simplesse", "opta", "tagatose", "diacetyl", "nisin", "nougat", "rennet"
    ],
    // NEGATION CLAIM. Note: "non-dairy" and "dairy-free" still NEVER count as proof of safety; those are HARDCODED TRAPS — see existing milk trap logic. Only the explicit "milk-free" / "casein-free" claims suppress matches on those specific keywords.
    keywordExemptions: {
      "milk": ["milk-free", "milk free", "non-milk", "without milk"],
      "casein": ["casein-free", "casein free"]
    },
    mandatoryDisclosure: true,
  },
  {
    id: "peanut",
    label: "Peanut",
    identityColor: "orange",
    icon: "🥜",
    allergenTags: ["en:peanuts"],
    tracesTags: ["en:peanuts"],
    // Research files don't name a specific OFF tag for peanut-free
    certifiedFreeLabels: ["en:peanut-free"],
    // [v1 §11 Table 4]
    euDisclosure: true,
    definiteKeywords: [
      // [v1 peanut Table 1; v2 §3 Table 1]
      "peanut", "peanuts", "peanut flour", "peanut protein", "peanut protein hydrolysate", "peanut oil", "arachis oil", "ground nut", "ground nuts", "groundnut", "groundnuts", "goobers", "beer nuts", "monkey nuts", "mandelonas"
    ],
    cautionKeywords: [
      // [v1 peanut Table 2; v2 §3 Table 2] cross-reactivity
      "lupine", "lupin"
    ],
    keywordExemptions: {
      "peanut": ["peanut-free", "peanut free"]
    },
    mandatoryDisclosure: true,
  },
  {
    id: "treenut",
    label: "Tree Nut",
    identityColor: "emerald",
    icon: "🌰",
    // [v2 OFF tags] Parent tag plus most common species tags from OFF data conventions
    allergenTags: ["en:nuts", "en:almonds", "en:cashew-nuts", "en:walnuts", "en:hazelnuts", "en:pecans", "en:pistachios", "en:macadamia-nuts", "en:brazil-nuts"],
    tracesTags: ["en:nuts"],
    certifiedFreeLabels: ["en:nut-free", "en:tree-nut-free"],
    // [v1 §11 Table 4] EU requires species emphasis
    euDisclosure: true,
    definiteKeywords: [
      // [v2 §4 Table 1] 2025 FDA 12-species list
      "almond", "almonds", "brazil nut", "brazil nuts", "cashew", "cashews", "hazelnut", "hazelnuts", "filbert", "filberts", "macadamia", "macadamia nut", "macadamia nuts", "bush nut", "pecan", "pecans", "pine nut", "pine nuts", "pignoli", "pignolia", "pinon", "piñon", "pistachio", "pistachios", "walnut", "walnuts", "english walnut", "persian walnut", "black walnut", "heart nut", "japanese walnut", "butternut", "white walnut", "beechnut", "beech nut", "chinquapin", "ginkgo nut", "lichee nut", "pili nut", "shea nut"
    ],
    cautionKeywords: [
      // [v1 treenut Table 2; v2 §4 Table 2] cross-reactivity
      "pink peppercorn", "pink peppercorns", "argan oil", "marzipan"
    ],
    keywordExemptions: {
      "almond": ["almond-free", "almond free"],
      "cashew": ["cashew-free", "cashew free"],
      "walnut": ["walnut-free", "walnut free"],
      "nut": ["nut-free", "nut free"]
    },
    mandatoryDisclosure: true,
  },
  {
    id: "egg",
    label: "Egg",
    identityColor: "yellow",
    icon: "🥚",
    allergenTags: ["en:eggs"],
    tracesTags: ["en:eggs"],
    certifiedFreeLabels: ["en:egg-free", "en:vegan"],
    // [v1 §11 Table 4]
    euDisclosure: true,
    definiteKeywords: [
      // [v1 egg Table 1; v2 §5 Table 1] Note: v2 had some noisy citations (e.g., FoodAllergy.org for sesame cited under Egg), ignored those unreliable attributions.
      "egg", "eggs", "egg white", "egg whites", "egg yolk", "egg yolks", "dried egg", "powdered egg", "egg powder", "egg solids", "albumin", "albumen", "ovalbumin", "ovomucoid", "ovomucin", "ovovitellin", "ovotransferrin", "ovoglobulin", "conalbumin", "vitellin", "apovitellin", "livetin", "lysozyme", "avidin", "globulin", "mayonnaise", "meringue", "eggnog", "surimi"
    ],
    cautionKeywords: [
      // [v1 egg Table 2; v2 §5 Table 2] lecithin is often soy but can be egg — judgment-flagged caution rather than alarm
      "lecithin"
    ],
    keywordExemptions: {
      "egg": ["egg-free", "egg free"]
    },
    mandatoryDisclosure: true,
  },
  {
    id: "soy",
    label: "Soy",
    identityColor: "green",
    icon: "🫘",
    allergenTags: ["en:soybeans"],
    tracesTags: ["en:soybeans"],
    certifiedFreeLabels: ["en:soy-free"],
    // [v1 §11 Table 4] EU does NOT exempt refined soy oil from emphasis
    euDisclosure: true,
    // FALCPA EXEMPTION: highly refined soybean oil is exempt from allergen labeling because refining removes proteins — see v1 §7 Soy Table 2 and v2 §6 Table 2. We do NOT flag "soybean oil" or "vegetable oil" as definite sources. Refined soy oil is generally safe for soy-allergic individuals per FDA position.
    definiteKeywords: [
      // [v1 soy Table 1; v2 §6 Table 1]
      "soy", "soya", "soybean", "soybeans", "edamame", "miso", "natto", "shoyu", "tamari", "tempeh", "tofu", "soy sauce", "soy protein", "soy protein isolate", "soy protein concentrate", "hydrolyzed soy protein", "textured vegetable protein", "tvp", "soy flour", "soy milk", "soy fiber", "soy lecithin", "supro"
    ],
    cautionKeywords: [
      // [v1 soy Table 2; v2 §6 Table 2] can be soy or egg
      "lecithin"
    ],
    // FALCPA EXEMPTION: highly refined soybean oil is exempt from allergen labeling. See docs/research/allergen-reference-2026-05.md §7 Soy Table 2 and v2 §6 Table 2. This is THE specific exemption FALCPA names.
    keywordExemptions: {
      "soybean": ["soybean oil", "soya oil"],
      "soy": ["soy oil"]
    },
    mandatoryDisclosure: true,
  },
  {
    id: "sesame",
    label: "Sesame",
    identityColor: "stone",
    icon: "🌱",
    allergenTags: ["en:sesame-seeds"],
    tracesTags: ["en:sesame-seeds"],
    certifiedFreeLabels: ["en:sesame-free"],
    // [v1 §11 Table 4]
    euDisclosure: true,
    // FASTER Act (2023): sesame is now the 9th US major allergen and must be disclosed by name; spices and natural flavors must now declare sesame source. See v2 §7.
    definiteKeywords: [
      // [v1 sesame Table 1; v2 §7 Table 1]
      "sesame", "sesame seed", "sesame seeds", "sesame oil", "sesame paste", "sesame flour", "tahini", "tahina", "tahin", "benne", "benne seed", "gomasio", "til", "sesamol", "sesamum indicum", "sesame protein"
    ],
    cautionKeywords: [
      // [v2 §7] FASTER Act forces sesame disclosure when present, but kept empty as no specific hidden names that aren't already covered by spices/flavors legally now
    ],
    keywordExemptions: {
      "sesame": ["sesame-free", "sesame free"]
    },
    mandatoryDisclosure: true,
  },
  {
    id: "fish",
    label: "Fish",
    identityColor: "cyan",
    icon: "🐟",
    allergenTags: ["en:fish"],
    tracesTags: ["en:fish"],
    certifiedFreeLabels: ["en:fish-free"],
    // [v1 §11 Table 4] EU exempts fish gelatin used as a vitamin carrier
    euDisclosure: true,
    definiteKeywords: [
      // [v1 fish Table 1; v2 §8 Table 1] Note: v2 "fish protein" was described as "avian-derived", omitted that unreliable citation comment.
      "fish", "anchovy", "anchovies", "bass", "catfish", "cod", "eel", "flounder", "grouper", "haddock", "hake", "halibut", "herring", "mahi-mahi", "mahi mahi", "perch", "pike", "pollock", "salmon", "sardine", "sardines", "snapper", "sole", "swordfish", "tilapia", "trout", "tuna", "fish sauce", "nuoc mam", "fish meal", "fish oil", "fish protein", "surimi", "roe", "caviar"
    ],
    cautionKeywords: [
      // [v1 fish Table 2; v2 §8 Table 2] gelatin is often beef/pork but can be fish
      "gelatin", "isinglass", "omega-3 supplement", "fish stock"
    ],
    keywordExemptions: {
      "fish": ["fish-free", "fish free"]
    },
    mandatoryDisclosure: true,
  },
  {
    id: "shellfish",
    label: "Shellfish",
    identityColor: "rose",
    icon: "🦐",
    allergenTags: ["en:crustaceans"],
    tracesTags: ["en:crustaceans"],
    certifiedFreeLabels: ["en:shellfish-free", "en:crustacean-free"],
    // [v1 §11 Table 4] EU 1169/2011 Annex II includes mollusks; US FALCPA does not.
    euDisclosure: true,
    definiteKeywords: [
      // [v1 shellfish Table 1; v2 §9 Table 1]
      "shrimp", "prawn", "prawns", "crab", "lobster", "crawfish", "crayfish", "langoustine", "langouste", "krill", "barnacle", "scampi", "shellfish", "crustacean"
    ],
    cautionKeywords: [
      // US FALCPA requires crustacean disclosure but NOT mollusk disclosure — this is a real labeling gap; mollusk terms live in cautionKeywords so we surface them as a hidden-source risk. See v1 §10 Table 2 and v2 §9.
      "clam", "clams", "mussel", "mussels", "oyster", "oysters", "scallop", "scallops", "squid", "calamari", "octopus", "abalone", "snail", "escargot", "cuttlefish", "cuttlefish ink", "glucosamine", "seafood flavoring"
    ],
    keywordExemptions: {
      "shellfish": ["shellfish-free", "shellfish free"]
    },
    // US FALCPA mandatory for crustacean only.
    mandatoryDisclosure: true,
  }
];

/**
 * Checks if any keyword matches within the text, using word boundaries.
 * Case-insensitive.
 * Optionally accepts a map of keyword to phrases that should be ignored if the keyword is found inside them.
 */
function findKeywords(text: string, keywords: string[], exemptions?: Record<string, string[]>): string[] {
  if (!text) return [];
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const kw of keywords) {
    // Escape any regex special characters in the keyword just in case.
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    // Word boundary matching, case insensitive.
    const regex = new RegExp(`\\b${escapedKw}\\b`, "ig");
    let match;
    let keywordMatched = false;
    
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      let isExempt = false;
      if (exemptions && exemptions[kw]) {
        for (const exemptPhrase of exemptions[kw]) {
          const lowerExempt = exemptPhrase.toLowerCase();
          // Find all occurrences of the exempt phrase in the text
          let exemptIndex = lowerText.indexOf(lowerExempt);
          while (exemptIndex !== -1) {
            // Check if the current keyword match falls inside this exempt phrase
            if (matchIndex >= exemptIndex && matchIndex < exemptIndex + exemptPhrase.length) {
              isExempt = true;
              break;
            }
            exemptIndex = lowerText.indexOf(lowerExempt, exemptIndex + 1);
          }
          if (isExempt) break;
        }
      }
      
      if (!isExempt) {
        keywordMatched = true;
        break;
      }
    }
    
    if (keywordMatched && !found.includes(kw)) {
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
function findKeywordsInName(text: string, keywords: string[], exemptions?: Record<string, string[]>): string[] {
  if (!text) return [];
  const found: string[] = [];
  const lowerText = text.toLowerCase();
  
  for (const kw of keywords) {
    const escapedKw = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`\\b${escapedKw}\\b`, "ig");
    let match;
    let keywordMatched = false;
    while ((match = regex.exec(text)) !== null) {
      const matchIndex = match.index;
      
      let isExempt = false;
      if (exemptions && exemptions[kw]) {
        for (const exemptPhrase of exemptions[kw]) {
          const lowerExempt = exemptPhrase.toLowerCase();
          let exemptIndex = lowerText.indexOf(lowerExempt);
          while (exemptIndex !== -1) {
            if (matchIndex >= exemptIndex && matchIndex < exemptIndex + exemptPhrase.length) {
              isExempt = true;
              break;
            }
            exemptIndex = lowerText.indexOf(lowerExempt, exemptIndex + 1);
          }
          if (isExempt) break;
        }
      }
      
      if (isExempt) continue;

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
        keywordMatched = true;
        break;
      }
    }
    if (keywordMatched && !found.includes(kw)) {
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
  const matchedKeywords = findKeywords(ingredients, allergen.definiteKeywords, allergen.keywordExemptions);
  const matchedNameKeywords = findKeywordsInName(product.name || "", allergen.definiteKeywords, allergen.keywordExemptions);

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
  const matchedCaution = allergen.cautionKeywords ? findKeywords(ingredients, allergen.cautionKeywords, allergen.keywordExemptions) : [];
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
  // We don't check labels.length === 0 because unrelated labels (e.g. "no added sugar") 
  // should not bypass the empty-data rule. If ingredients, allergens, and traces are empty, 
  // and we didn't hit a certified-free label above, we have no safety data.
  if (!ingredients.trim() && allergens.length === 0 && traces.length === 0) {
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
