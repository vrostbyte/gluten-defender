import { evaluateAllergen, ALLERGEN_REGISTRY } from './lib/allergens/registry';

const gluten = ALLERGEN_REGISTRY.find(a => a.id === 'gluten')!;
const milk = ALLERGEN_REGISTRY.find(a => a.id === 'milk')!;
const peanut = ALLERGEN_REGISTRY.find(a => a.id === 'peanut')!;
const treenut = ALLERGEN_REGISTRY.find(a => a.id === 'treenut')!;
const egg = ALLERGEN_REGISTRY.find(a => a.id === 'egg')!;
const soy = ALLERGEN_REGISTRY.find(a => a.id === 'soy')!;
const sesame = ALLERGEN_REGISTRY.find(a => a.id === 'sesame')!;
const fish = ALLERGEN_REGISTRY.find(a => a.id === 'fish')!;
const shellfish = ALLERGEN_REGISTRY.find(a => a.id === 'shellfish')!;

const cases = [
  {
    desc: 'A. IZZE Sparkling Mango',
    product: {
      name: 'IZZE Sparkling Mango',
      ingredientsText: 'sparkling water, apple juice concentrate, mango juice concentrate, natural flavors',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [gluten, milk]
  },
  {
    desc: 'B. Nature\'s Own 100% Whole Wheat Bread',
    product: {
      name: 'Nature\'s Own 100% Whole Wheat Bread',
      ingredientsText: 'whole wheat flour, water, yeast, wheat gluten',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [gluten]
  },
  {
    desc: 'C. Honey Nut Cheerios',
    product: {
      name: 'Honey Nut Cheerios',
      ingredientsText: 'whole grain oats, sugar, oat bran, corn starch, honey',
      allergensTags: [], tracesTags: [], labelsTags: ['en:gluten-free']
    },
    allergens: [gluten]
  },
  {
    desc: 'D. Heinz Tomato Ketchup (Mock)',
    product: {
      name: 'Tomato Ketchup',
      ingredientsText: 'tomato concentrate, distilled vinegar, high fructose corn syrup, corn syrup, salt, spice, onion powder, natural flavoring, maltodextrin, modified food starch',
      allergensTags: [], tracesTags: [], labelsTags: ['en:gluten-free']
    },
    allergens: [gluten]
  },
  {
    desc: 'E. Mock test with pistachio and tahini',
    product: {
      name: 'Pistachio Tahini Treat',
      ingredientsText: 'tahini, pistachio, sugar, water',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [treenut, sesame]
  },
  {
    desc: 'F. Mock test with only soybean oil',
    product: {
      name: 'Pure Oil',
      ingredientsText: 'soybean oil, vegetable oil',
      allergensTags: [], tracesTags: [], labelsTags: []
    },
    allergens: [soy]
  }
];

cases.forEach(c => {
  console.log(`\n--- ${c.desc} ---`);
  for (const allergen of c.allergens) {
    const result = evaluateAllergen(c.product, allergen);
    console.log(`${allergen.label} Tier: ${result.tier}`);
    console.log(`Reasons:\n - ${result.reasoning.join('\n - ')}`);
  }
});
