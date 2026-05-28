import type { ProductLookupResult, VerdictTier } from "@/lib/verdict";

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

// Visual + textual treatment for each tier. We pair color with a clear label and
// a short description so the meaning never relies on color alone (accessibility).
const TIER_DISPLAY: Record<
  VerdictTier,
  { label: string; blurb: string; card: string; badge: string }
> = {
  safe: {
    label: "Safe",
    blurb: "Certified gluten-free with no gluten detected.",
    card: "border-green-200 bg-green-50",
    badge: "bg-green-600 text-white",
  },
  likely_safe: {
    label: "Likely safe",
    blurb: "No gluten detected, but not certified gluten-free.",
    card: "border-lime-200 bg-lime-50",
    badge: "bg-lime-600 text-white",
  },
  caution: {
    label: "Caution",
    blurb: "Possible gluten or cross-contamination — read carefully.",
    card: "border-amber-200 bg-amber-50",
    badge: "bg-amber-500 text-white",
  },
  unsafe: {
    label: "Unsafe",
    blurb: "Contains a known gluten source.",
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

export default function ProductResult({
  result,
  onRescan,
}: {
  result: ProductLookupResult;
  onRescan: () => void;
}) {
  const { found, product, verdict } = result;
  const display = TIER_DISPLAY[verdict.tier];

  return (
    <div className="flex flex-col gap-4">
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
            // Plain <img>: Open Food Facts images are remote thumbnails; using
            // next/image here would need extra remote-host config we don't need yet.
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
            Please read the physical label to check for gluten.
          </p>
        </div>
      )}

      {/* Why — the evidence behind the verdict */}
      <div className="rounded-2xl border border-gray-200 p-4">
        <h2 className="text-sm font-semibold text-gray-700">Why this verdict</h2>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
          {verdict.reasoning.map((reason, i) => (
            <li key={i}>{reason}</li>
          ))}
        </ul>
      </div>

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
