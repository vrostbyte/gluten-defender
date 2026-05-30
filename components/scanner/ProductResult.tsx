"use client"

import { useState, useTransition } from "react";
import { ALLERGEN_REGISTRY, DEFAULT_PROFILE, VerdictTier } from "@/lib/allergens/registry";
import { saveProductAction, unsaveProductAction } from "@/app/actions/saveProduct";

// We duplicate the API type here to avoid circular imports from route.ts
import type { ProductLookupResult } from "@/lib/verdict";
import { ReactionCallout } from "./ReactionCallout";
import { CommunityNotesSection, type Note } from "./CommunityNotesSection";

export interface APIProductLookupResult extends ProductLookupResult {
  isSavedByUser: boolean;
  isSignedIn: boolean;
  notes?: Note[];
  currentUserId?: string | null;
  activeProfile?: string[];
  hasProfileAllergens?: boolean;
}

/**
 * ProductResult
 * -------------
 * Shows the outcome of a lookup: the safety tier (color-coded AND labeled in
 * words, never color alone), the product details, and the reasoning behind the
 * verdict so the user can judge for themselves.
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
    fill: "bg-amber-100 border-amber-300", outline: "bg-transparent border-gray-200", text: "text-amber-800", bgHighlight: "bg-amber-100", tagBg: "bg-amber-200"
  },
  blue: { 
    fill: "bg-blue-100 border-blue-300", outline: "bg-transparent border-gray-200", text: "text-blue-800", bgHighlight: "bg-blue-100", tagBg: "bg-blue-200"
  },
  orange: {
    fill: "bg-orange-100 border-orange-300", outline: "bg-transparent border-gray-200", text: "text-orange-800", bgHighlight: "bg-orange-100", tagBg: "bg-orange-200"
  },
  emerald: {
    fill: "bg-emerald-100 border-emerald-300", outline: "bg-transparent border-gray-200", text: "text-emerald-800", bgHighlight: "bg-emerald-100", tagBg: "bg-emerald-200"
  },
  yellow: {
    fill: "bg-yellow-100 border-yellow-300", outline: "bg-transparent border-gray-200", text: "text-yellow-800", bgHighlight: "bg-yellow-100", tagBg: "bg-yellow-200"
  },
  green: {
    fill: "bg-green-100 border-green-300", outline: "bg-transparent border-gray-200", text: "text-green-800", bgHighlight: "bg-green-100", tagBg: "bg-green-200"
  },
  stone: {
    fill: "bg-stone-100 border-stone-300", outline: "bg-transparent border-gray-200", text: "text-stone-800", bgHighlight: "bg-stone-100", tagBg: "bg-stone-200"
  },
  cyan: {
    fill: "bg-cyan-100 border-cyan-300", outline: "bg-transparent border-gray-200", text: "text-cyan-800", bgHighlight: "bg-cyan-100", tagBg: "bg-cyan-200"
  },
  rose: {
    fill: "bg-rose-100 border-rose-300", outline: "bg-transparent border-gray-200", text: "text-rose-800", bgHighlight: "bg-rose-100", tagBg: "bg-rose-200"
  }
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
  isSavedPage = false,
}: {
  result: APIProductLookupResult;
  onRescan?: () => void;
  isSavedPage?: boolean;
}) {
  const { found, product, verdict, isSavedByUser, isSignedIn, notes = [], currentUserId = null, activeProfile = DEFAULT_PROFILE, hasProfileAllergens = false } = result;
  const display = TIER_DISPLAY[verdict.tier];

  const profiledAllergens = ALLERGEN_REGISTRY.filter((a) => activeProfile.includes(a.id));
  const nonProfiledDetected = ALLERGEN_REGISTRY.filter((a) => {
    // We exclude items already in activeProfile so they don't duplicate
    if (activeProfile.includes(a.id)) return false;
    const t = verdict.allergenVerdicts[a.id]?.tier;
    return t === "unsafe" || t === "caution";
  });

  const [isSaved, setIsSaved] = useState(isSavedByUser);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleToggleSave = () => {
    if (!found || !product || !isSignedIn) return;
    setSaveError(null);
    
    // Optimistic update
    const newSavedState = !isSaved;
    setIsSaved(newSavedState);

    startTransition(async () => {
      const action = newSavedState ? saveProductAction : unsaveProductAction;
      const res = await action(product.barcode);
      if (res.ok) {
        setIsSaved(res.isSaved);
      } else {
        // Revert on error
        setIsSaved(!newSavedState);
        setSaveError(res.error);
        console.error("Failed to save product", res.error);
      }
    });
  };

  return (
    <div className="flex flex-col gap-4 pb-8">
      {(verdict.tier === "unsafe" || verdict.tier === "caution") && (
        <div 
          className={`fixed inset-0 -z-10 ${
            verdict.tier === "unsafe" ? "bg-red-50" : "bg-amber-50"
          }`} 
          aria-hidden="true"
        />
      )}
      
      <div className={`rounded-2xl border p-5 ${display.card}`}>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-bold uppercase tracking-wide ${display.badge}`}
        >
          {display.label}
        </span>
        <p className="mt-2 text-base font-medium text-gray-800">{display.blurb}</p>
      </div>

      {notes.length > 0 && (
        <ReactionCallout 
          reactions={notes.filter(n => n.note_type === 'reaction').map(n => ({ authorAllergens: n.author.allergens?.map(a => a.allergen_id) || [] }))}
          activeProfile={activeProfile}
        />
      )}

      {found && product && (
        <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
          <div className="flex items-center gap-4">
            {product.imageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={product.imageUrl}
                alt={product.name ?? "Product"}
                className="h-20 w-20 shrink-0 rounded-lg object-contain"
              />
            )}
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-lg font-semibold text-gray-900">
                {product.name ?? "Unnamed product"}
              </p>
              {product.brand && (
                <p className="truncate text-sm text-gray-500">{product.brand}</p>
              )}
              <p className="mt-1 text-xs text-gray-400">Barcode {product.barcode}</p>
            </div>
          </div>
          
          {/* Save Button (only visible for signed-in users) */}
          {isSignedIn && (
            <div className="border-t border-gray-100 pt-3">
              {saveError && (
                <p className="mb-2 text-center text-xs text-red-600">{saveError}</p>
              )}
              <button
                onClick={handleToggleSave}
                disabled={isPending}
                className={`flex w-full items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold transition-colors disabled:opacity-70 ${
                  isSaved 
                    ? "border-green-200 bg-green-50 text-green-700 hover:bg-green-100" 
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                {isSaved ? (
                  <>
                    <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
                      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                    </svg>
                    Saved
                  </>
                ) : (
                  <>
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Save
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {!found && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-gray-600">
          <p className="font-medium text-gray-800">Product not found</p>
          <p className="mt-1 text-sm">
            We couldn&apos;t find barcode {result.barcode} in the database yet.
            Please read the physical label to check for allergens.
          </p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-gray-200 bg-white p-4">
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

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <h2 className="text-sm font-semibold text-gray-700">Why this verdict</h2>
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

      {found && verdict.ingredientHighlights && verdict.ingredientHighlights.length > 0 && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 text-sm">
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
          
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-100 pt-3 text-xs text-gray-500">
            <p className="font-semibold text-gray-600">Legend:</p>
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {ALLERGEN_REGISTRY.map(a => {
                const c = COLOR_MAP[a.identityColor] || COLOR_MAP.amber;
                return (
                  <div key={a.id} className="flex items-center gap-1.5">
                    <span className={`inline-block h-3 w-3 rounded ${c.bgHighlight}`}></span>
                    <span>{a.label}</span>
                  </div>
                );
              })}
              <div className="flex items-center gap-1.5">
                <span className="inline-block border-b-2 border-dashed border-gray-400 font-medium text-gray-800">
                  word
                </span>
                <span>Ambiguous</span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div
        role="note"
        className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm text-blue-900"
      >
        <strong>Always verify the physical packaging.</strong> Gluten Defender is
        decision support, not medical advice, and never a guarantee. Ingredients and
        manufacturing can change — when in doubt, don&apos;t risk it.
      </div>

      {found && product && (
        <CommunityNotesSection
          notes={notes}
          productBarcode={product.barcode}
          isSignedIn={isSignedIn}
          currentUserId={currentUserId}
          hasProfileAllergens={hasProfileAllergens}
          activeProfile={activeProfile}
        />
      )}

      {!isSavedPage && onRescan && (
        <button
          type="button"
          onClick={onRescan}
          className="min-h-14 rounded-2xl bg-green-600 text-lg font-semibold text-white active:bg-green-700"
        >
          Scan another product
        </button>
      )}
    </div>
  );
}
