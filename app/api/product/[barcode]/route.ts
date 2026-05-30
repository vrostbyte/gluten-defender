import { NextResponse } from "next/server";
import {
  computeVerdict,
  type ProductData,
  type ProductLookupResult,
} from "@/lib/verdict";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { DEFAULT_PROFILE, VerdictTier } from "@/lib/allergens/registry";
import type { AllergenProfileItem } from "@/lib/supabase/database.types";

/**
 * GET /api/product/[barcode]
 * --------------------------
 * Looks up a product by barcode on Open Food Facts (OFF) and returns it together
 * with our computed gluten-safety verdict.
 *
 * WHY this lives server-side (a Next.js Route Handler): the PRD requires that all
 * third-party APIs are called from the server, never the browser. That lets us
 * control the request, attach a proper User-Agent, and later add caching — and it
 * keeps any future keys off the client.
 */

// The exact OFF fields we ask for. Requesting only what we need keeps the
// response small and fast.
const OFF_FIELDS = [
  "product_name",
  "brands",
  "image_front_small_url",
  "ingredients_text",
  "allergens_tags",
  "traces_tags",
  "labels_tags",
  "additives_tags",
].join(",");

// OFF asks every app to identify itself in the User-Agent header.
const USER_AGENT = "GlutenDefender/0.1 (dev)";

/** The slice of the OFF JSON response we actually read. */
interface OffResponse {
  status: 0 | 1; // 1 = product found, 0 = not found
  product?: {
    product_name?: string;
    brands?: string;
    image_front_small_url?: string;
    ingredients_text?: string;
    allergens_tags?: string[];
    traces_tags?: string[];
    labels_tags?: string[];
    additives_tags?: string[];
  };
}

/** Convert OFF's raw product object into our normalized ProductData shape. */
function toProductData(
  barcode: string,
  off: NonNullable<OffResponse["product"]>,
): ProductData {
  // OFF uses empty strings for missing text; turn those into null for clarity.
  const clean = (value?: string) => {
    const trimmed = value?.trim();
    return trimmed ? trimmed : null;
  };

  return {
    barcode,
    name: clean(off.product_name),
    brand: clean(off.brands),
    imageUrl: clean(off.image_front_small_url),
    ingredientsText: clean(off.ingredients_text),
    allergensTags: off.allergens_tags ?? [],
    tracesTags: off.traces_tags ?? [],
    labelsTags: off.labels_tags ?? [],
    additivesTags: off.additives_tags ?? [],
  };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ barcode: string }> },
) {
  // In this version of Next.js, route params are async and must be awaited.
  const { barcode: rawBarcode } = await params;

  // Barcodes are numeric; strip anything else to avoid malformed upstream calls.
  const barcode = rawBarcode.replace(/\D/g, "");
  if (!barcode) {
    return NextResponse.json(
      { error: "A numeric barcode is required." },
      { status: 400 },
    );
  }

  const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;

  let off: OffResponse;
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
      // No caching yet — Phase 1b will add a Supabase-backed cache.
      cache: "no-store",
    });

    if (!response.ok) {
      // Upstream returned an HTTP error (e.g. 500/429). Treat as a service problem.
      return NextResponse.json(
        { error: "Could not reach the product database. Please try again." },
        { status: 502 },
      );
    }

    off = (await response.json()) as OffResponse;
  } catch {
    // Network failure / timeout / invalid JSON.
    return NextResponse.json(
      { error: "Network error while looking up the product. Please try again." },
      { status: 502 },
    );
  }

  // --- Product not found (OFF signals this with status 0) ---
  if (off.status !== 1 || !off.product) {
    const result: ProductLookupResult = {
      found: false,
      barcode,
      product: null,
      verdict: computeVerdict(null),
    };
    
    // Override the reason for unknown fallback behavior just in case
    for (const key in result.verdict.allergenVerdicts) {
       result.verdict.allergenVerdicts[key].reasoning = ["This product is not in the database yet — please read the physical label."];
    }
    
    return NextResponse.json(result);
  }

  // --- Profile fetch ---
  let activeProfile = DEFAULT_PROFILE;
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("allergens")
        .eq("user_id", user.id)
        .single();
      
      if (profile && profile.allergens && profile.allergens.length > 0) {
        activeProfile = profile.allergens.map((a: AllergenProfileItem) => a.allergen_id);
      }
    }
  } catch (error) {
    // Fall back gracefully to DEFAULT_PROFILE
  }

  // --- Product found: normalize, run the verdict, return both ---
  const product = toProductData(barcode, off.product);
  const verdict = computeVerdict(product);

  // Recalculate worst tier based on active profile, if it's different
  if (activeProfile !== DEFAULT_PROFILE) {
    const TIER_WEIGHT: Record<VerdictTier, number> = {
      unsafe: 4,
      caution: 3,
      unknown: 2,
      likely_safe: 1,
      safe: 0,
    };
    let worstTier: VerdictTier = "unknown";
    if (activeProfile.length > 0) {
      worstTier = "safe";
      for (const allergenId of activeProfile) {
        const t = verdict.allergenVerdicts[allergenId]?.tier || "unknown";
        if (TIER_WEIGHT[t] > TIER_WEIGHT[worstTier]) {
          worstTier = t;
        }
      }
    }
    verdict.tier = worstTier;
  }

  const result: ProductLookupResult = {
    found: true,
    barcode,
    product,
    verdict,
  };
  return NextResponse.json(result);
}
