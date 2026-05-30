import { evaluateAllergen, ALLERGEN_REGISTRY } from './lib/allergens/registry';

const gluten = ALLERGEN_REGISTRY.find(a => a.id === 'gluten')!;
const milk = ALLERGEN_REGISTRY.find(a => a.id === 'milk')!;
const soy = ALLERGEN_REGISTRY.find(a => a.id === 'soy')!;
const treenut = ALLERGEN_REGISTRY.find(a => a.id === 'treenut')!;
const sesame = ALLERGEN_REGISTRY.find(a => a.id === 'sesame')!;

const cases = [
  {
    desc: 'A. Soybean oil case (bug fix)',
    product: {
      name: 'Test Product',
      ingredientsText: 'water, sugar, soybean oil, citric acid',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [soy]
  },
  {
    desc: 'B. Real soy case',
    product: {
      name: 'Test Product',
      ingredientsText: 'water, soybean, soybean oil, salt',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [soy]
  },
  {
    desc: 'C. Wheat-free claim',
    product: {
      name: 'Test Product',
      ingredientsText: 'wheat-free bread',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [gluten]
  },
  {
    desc: 'D. Genuine wheat',
    product: {
      name: 'Nature\'s Own 100% Whole Wheat Bread',
      ingredientsText: 'whole wheat flour, water, yeast, wheat gluten',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [gluten]
  },
  {
    desc: 'E. Walnut oil (contrast case)',
    product: {
      name: 'Test Product',
      ingredientsText: 'walnut oil, sugar',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [treenut]
  },
  {
    desc: 'F. Hardcoded milk traps',
    product: {
      name: 'Test Product',
      ingredientsText: 'sodium caseinate, sugar',
      allergensTags: [], tracesTags: [], labelsTags: ['en:non-dairy']
    },
    allergens: [milk]
  },
  {
    desc: 'G1. IZZE',
    product: {
      name: 'IZZE Sparkling Mango',
      ingredientsText: 'sparkling water, apple juice concentrate, mango juice concentrate, natural flavors',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [gluten]
  },
  {
    desc: 'G2. Honey Nut Cheerios',
    product: {
      name: 'Honey Nut Cheerios',
      ingredientsText: 'whole grain oats, sugar, oat bran, corn starch, honey',
      allergensTags: [], tracesTags: [], labelsTags: ['en:gluten-free']
    },
    allergens: [gluten]
  },
  {
    desc: 'G3. Heinz Tomato Ketchup',
    product: {
      name: 'Tomato Ketchup',
      ingredientsText: 'tomato concentrate, distilled vinegar, high fructose corn syrup, corn syrup, salt, spice, onion powder, natural flavoring, maltodextrin, modified food starch',
      allergensTags: [], tracesTags: [], labelsTags: ['en:gluten-free']
    },
    allergens: [gluten]
  },
  {
    desc: 'G4. Pistachio/tahini mock',
    product: {
      name: 'Test Product',
      ingredientsText: 'tahini, pistachio, sugar, water',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [treenut, sesame]
  }
];

cases.forEach(c => {
  console.log(`\n--- ${c.desc} ---`);
  for (const allergen of c.allergens) {
    const result = evaluateAllergen(c.product, allergen);
    console.log(`${allergen.label} Tier: ${result.tier}`);
    if (result.reasoning.length > 0) {
      console.log(`Reasons:\n - ${result.reasoning.join('\n - ')}`);
    }
  }
});
