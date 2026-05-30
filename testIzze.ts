import { computeVerdict, ProductData } from "./lib/verdict";

const mockIzze: ProductData = {
  barcode: "836093011025",
  name: "IZZE Sparkling Blackberry",
  brand: "IZZE",
  imageUrl: null,
  ingredientsText: null,
  allergensTags: [],
  tracesTags: [],
  labelsTags: [],
  additivesTags: [],
};

const verdict = computeVerdict(mockIzze);
console.log("Tier:", verdict.tier);
console.log("Gluten Verdict:", verdict.allergenVerdicts["gluten"].tier);
console.log("Gluten Reasoning:", verdict.allergenVerdicts["gluten"].reasoning);
