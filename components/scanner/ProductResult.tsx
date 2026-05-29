import { ALLERGEN_REGISTRY, DEFAULT_PROFILE, VerdictTier } from "@/lib/allergens/registry";
import type { ProductLookupResult } from "@/lib/verdict";

/**
 * ProductResult
 * -------------
 * Shows the outcome of a lookup: the safety tier (color-coded AND labeled in
 * words, never color alone), the product details, and the reasoning behind the
 * verdict so the user can judge for themselves.
 *
 * HARD RULE from the PRD: every tier — including "safe" — shows a persistent
 * "verify the physical packaging" notice. This app is decision support, not a
 * medical guarantee.
 */

const TIER_DISPLAY: Record<
  VerdictTier,
  { label: string; blurb: string; card: string; badge: string }
> = {
  safe: {
    label: "Safe",
    blurb: "Certified free with no signals detected.",
    card: "border-green-200 bg-green-50",
    badge: "bg-green-600 text-white",
  },
  likely_safe: {
    label: "Likely safe",
    blurb: "No signals detected, but not certified.",
    card: "border-lime-200 bg-lime-50",
    badge: "bg-lime-600 text-white",
  },
  caution: {
    label: "Caution",
    blurb: "Possible risk or cross-contamination — read carefully.",
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-500 text-white",
  },
  unsafe: {
    label: "Unsafe",
    blurb: "Contains a known source.",
    card: "border-red-200 bg-red-50",
    badge: "bg-red-600 text-white",
  },
  unknown: {
    label: "Unknown",
    blurb: "Not enough information to judge.",
    card: "border-gray-200 bg-gray-50",
    badge: "bg-gray-500 text-white",
  },
};

const COLOR_MAP: Record<string, { fill: string; outline: string; text: string; bgHighlight: string; tagBg: string }> = {
  amber: { 
    fill: "bg-amber-100 border-amber-300", 
    outline: "bg-transparent border-gray-200", 
    text: "text-amber-800",
    bgHighlight: "bg-amber-100",
    tagBg: "bg-amber-200"
  },
  blue: { 
    fill: "bg-blue-100 border-blue-300", 
    outline: "bg-transparent border-gray-200", 
    text: "text-blue-800",
    bgHighlight: "bg-blue-100",
    tagBg: "bg-blue-200"
  },
};

function AllergenPill({ allergenId, tier }: { allergenId: string; tier: VerdictTier }) {
  const allergen = ALLERGEN_REGISTRY.find((a) => a.id === allergenId);
  if (!allergen) return null;

  const isAtRisk = tier === "unsafe" || tier === "caution";
  const color = COLOR_MAP[allergen.identityColor] || COLOR_MAP.amber;

  const bgClass = isAtRisk ? color.fill : color.outline;
  const textClass = isAtRisk ? `${color.text} font-bold` : "text-gray-500 font-medium";
  
  let label = "not detected";
  if (isAtRisk) label = "at risk";
  if (tier === "unknown") label = "unknown";

  return (
    <div className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${bgClass}`}>
      <span>{allergen.icon}</span>
      <span className={textClass}>{allergen.label}</span>
      <span className={`text-xs ${isAtRisk ? color.text : "text-gray-400"}`}>• {label}</span>
    </div>
  );
}

export default function ProductResult({
  result,
  onRescan,
}: {
  result: ProductLookupResult;
  onRescan: () => void;
}) {
  const { found, product, verdict } = result;
  const display = TIER_DISPLAY[verdict.tier];

  const profiledAllergens = ALLERGEN_REGISTRY.filter((a) => DEFAULT_PROFILE.includes(a.id));
  const nonProfiledDetected = ALLERGEN_REGISTRY.filter((a) => {
    if (DEFAULT_PROFILE.includes(a.id)) return false;
    const t = verdict.allergenVerdicts[a.id]?.tier;
    return t === "unsafe" || t === "caution";
  });

  return (
    <div className="flex flex-col gap-4 pb-8">
      {/* Background tint overlay (stops above the bottom nav so we don't tint the chrome) */}
      {(verdict.tier === "unsafe" || verdict.tier === "caution") && (
        <div 
          className={`fixed inset-0 -z-10 ${
            verdict.tier === "unsafe" ? "bg-red-50" : "bg-amber-50"
          }`} 
          aria-hidden="true"
        />
      )}
      {/* Verdict card */}
      <div className={`rounded-2xl border p-5 ${display.card}`}>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${display.badge}`}
        >
          {display.label}
        </span>
        <p className="mt-2 text-base font-medium text-gray-800">{display.blurb}</p>
      </div>

      {/* Product details (when we have them) */}
      {found && product && (
        <div className="flex items-center gap-4 rounded-2xl border border-gray-200 p-4">
          {product.imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={product.imageUrl}
              alt={product.name ?? "Product"}
              className="h-20 w-20 shrink-0 rounded-lg object-contain"
            />
          )}
          <div className="min-w-0">
            <p className="truncate text-lg font-semibold text-gray-900">
              {product.name ?? "Unnamed product"}
            </p>
            {product.brand && (
              <p className="truncate text-sm text-gray-500">{product.brand}</p>
            )}
            <p className="mt-1 text-xs text-gray-400">Barcode {product.barcode}</p>
          </div>
        </div>
      )}

      {/* Product not found */}
      {!found && (
        <div className="rounded-2xl border border-gray-200 p-4 text-gray-600">
          <p className="font-medium text-gray-800">Product not found</p>
          <p className="mt-1 text-sm">
            We couldn&apos;t find barcode {result.barcode} in the database yet.
            Please read the physical label to check for allergens.
          </p>
        </div>
      )}

      {/* Allergens */}
      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700">Allergens in your profile</h2>
        <div className="flex flex-wrap gap-2">
          {profiledAllergens.map((allergen) => (
            <AllergenPill
              key={allergen.id}
              allergenId={allergen.id}
              tier={verdict.allergenVerdicts[allergen.id]?.tier || "unknown"}
            />
          ))}
        </div>

        {nonProfiledDetected.length > 0 && (
          <>
            <h2 className="mt-2 text-sm font-semibold text-gray-700">Also detected</h2>
            <div className="flex flex-wrap gap-2 opacity-80">
              {nonProfiledDetected.map((allergen) => (
                <AllergenPill
                  key={allergen.id}
                  allergenId={allergen.id}
                  tier={verdict.allergenVerdicts[allergen.id]?.tier || "unknown"}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Why — the evidence behind the verdict */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700">Why this verdict</h2>
        
        {/* We list reasoning from profiled allergens, plus any detected non-profiled ones */}
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {[...profiledAllergens, ...nonProfiledDetected].map((allergen) => {
            const reasons = verdict.allergenVerdicts[allergen.id]?.reasoning || [];
            return reasons.map((reason, i) => (
              <li key={`${allergen.id}-${i}`}>
                <strong>{allergen.label}:</strong> {reason}
              </li>
            ));
          })}
        </ul>
      </div>

      {/* Ingredients List */}
      {found && verdict.ingredientHighlights && verdict.ingredientHighlights.length > 0 && (
        <div className="rounded-2xl border border-gray-200 p-4 text-sm">
          <h2 className="mb-2 text-sm font-semibold text-gray-700">Ingredients</h2>
          <div className="leading-relaxed text-gray-700">
            {verdict.ingredientHighlights.map((token, i) => {
              if (token.isAllergen && token.allergenId) {
                const allergen = ALLERGEN_REGISTRY.find((a) => a.id === token.allergenId);
                const color = allergen ? (COLOR_MAP[allergen.identityColor] || COLOR_MAP.amber) : COLOR_MAP.amber;
                return (
                  <span key={i} className={`rounded px-0.5 ${color.bgHighlight} ${color.text} font-medium`}>
                    {token.text}
                    <span className={`ml-1 inline-flex items-center rounded-full px-1 text-[10px] uppercase ${color.tagBg} ${color.text}`}>
                      {allergen?.label || token.allergenId}
                    </span>
                  </span>
                );
              }
              
              if (token.isAmbiguous) {
                return (
                  <span key={i} className="border-b-2 border-dashed border-gray-400 font-medium text-gray-800">
                    {token.text}
                    <span className="ml-1 inline-flex items-center rounded-full bg-gray-200 px-1 text-[10px] text-gray-600">
                      ?
                    </span>
                  </span>
                );
              }

              return <span key={i}>{token.text}</span>;
            })}
          </div>
          
          <div className="mt-4 flex flex-wrap gap-4 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded bg-amber-100"></span>
              <span>Known allergen source</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block border-b-2 border-dashed border-gray-400 font-medium text-gray-800">
                word
              </span>
              <span>Ambiguous ingredient</span>
            </div>
          </div>
        </div>
      )}

      {/* PERSISTENT verify-packaging notice — shown on EVERY tier (PRD hard rule) */}
      <div
        role="note"
        className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
      >
        <strong>Always verify the physical packaging.</strong> Gluten Defender is
        decision support, not medical advice, and never a guarantee. Ingredients and
        manufacturing can change — when in doubt, don&apos;t risk it.
      </div>

      {/* Scan again */}
      <button
        type="button"
        onClick={onRescan}
        className="min-h-14 rounded-2xl bg-green-600 text-lg font-semibold text-white active:bg-green-700"
      >
        Scan another product
      </button>
    </div>
  );
}
