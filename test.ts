import { evaluateAllergen, ALLERGEN_REGISTRY } from './lib/allergens/registry';

const gluten = ALLERGEN_REGISTRY.find(a => a.id === 'gluten');

const cases = [
  {
    desc: 'A. Orowheat "whole wheat bread"',
    product: {
      name: 'whole wheat bread',
      ingredientsText: '',
      allergensTags: [],
      tracesTags: [],
      labelsTags: []
    }
  },
  {
    desc: 'B. Honey Nut Cheerios',
    product: {
      name: 'Honey Nut Cheerios',
      ingredientsText: 'whole grain oats, sugar, oat bran, corn starch, honey',
      allergensTags: [],
      tracesTags: [],
      labelsTags: ['en:gluten-free']
    }
  },
  {
    desc: 'C. Nature\'s Own 100% Whole Wheat Bread',
    product: {
      name: 'Nature\'s Own 100% Whole Wheat Bread',
      ingredientsText: 'whole wheat flour, water, yeast, wheat gluten',
      allergensTags: [],
      tracesTags: [],
      labelsTags: []
    }
  },
  {
    desc: 'D. IZZE Sparkling Mango',
    product: {
      name: 'IZZE Sparkling Mango',
      ingredientsText: 'sparkling water, apple juice concentrate, mango juice concentrate, natural flavors',
      allergensTags: [],
      tracesTags: [],
      labelsTags: []
    }
  },
  {
    desc: 'E. Completely empty OFF data',
    product: {
      name: 'Unknown Product',
      ingredientsText: '',
      allergensTags: [],
      tracesTags: [],
      labelsTags: []
    }
  },
  {
    desc: 'F. Wheat-Free Bread',
    product: {
      name: 'Delicious Wheat-Free Bread',
      ingredientsText: 'rice flour, water, tapioca starch',
      allergensTags: [],
      tracesTags: [],
      labelsTags: []
    }
  }
];

cases.forEach(c => {
  const result = evaluateAllergen(c.product, gluten);
  console.log(`\n--- ${c.desc} ---`);
  console.log(`Tier: ${result.tier}`);
  console.log(`Reasons:\n - ${result.reasoning.join('\n - ')}`);
});
