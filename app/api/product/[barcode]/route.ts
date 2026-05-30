import { NextResponse } from "next/server";
import {
  computeVerdict,
  type ProductData,
  type ProductLookupResult,
} from "@/lib/verdict";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { DEFAULT_PROFILE, VerdictTier } from "@/lib/allergens/registry";
import type { AllergenProfileItem } from "@/lib/supabase/database.types";
import { fetchCommunityNotes } from "@/lib/notesFetcher";
import type { Note } from "@/components/scanner/CommunityNotesSection";

/**
 * GET /api/product/[barcode]
 * --------------------------
 * Looks up a product by barcode. Cache-first strategy:
 * 1. Check local Supabase cache.
 * 2. If hit and fresh, use cached data.
 * 3. If miss or stale, fetch from Open Food Facts, write to cache.
 * 4. Compute verdict at request time using the current registry (never cached).
 */

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

const USER_AGENT = "GlutenDefender/0.1 (dev)";
const CACHE_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days freshness window

interface OffResponse {
  status: 0 | 1;
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

// Ensure returned ProductData includes the new fields
export interface APIProductLookupResult extends ProductLookupResult {
  isSavedByUser: boolean;
  isSignedIn: boolean;
  notes?: Note[];
  currentUserId?: string | null;
  activeProfile?: string[];
  hasProfileAllergens?: boolean;
}

function toProductData(barcode: string, off: NonNullable<OffResponse["product"]>): ProductData {
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
  const { barcode: rawBarcode } = await params;
  const barcode = rawBarcode.replace(/\D/g, "");
  if (!barcode) {
    return NextResponse.json({ error: "A numeric barcode is required." }, { status: 400 });
  }

  // --- Profile fetch & Saved fetch ---
  let activeProfile = DEFAULT_PROFILE;
  let hasProfileAllergens = false;
  let isSavedByUser = false;
  let isSignedIn = false;
  let currentUserId: string | null = null;
  
  const supabase = await getSupabaseServerClient();
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      isSignedIn = true;
      currentUserId = user.id;
      const { data: profile } = await supabase
        .from("user_profiles")
        .select("allergens")
        .eq("user_id", user.id)
        .single();
      
      if (profile && profile.allergens && profile.allergens.length > 0) {
        hasProfileAllergens = true;
        activeProfile = profile.allergens.map((a: AllergenProfileItem) => a.allergen_id);
      }

      // Check if product is saved by user
      const { data: savedRow } = await supabase
        .from("saved_products")
        .select("id")
        .eq("user_id", user.id)
        .eq("product_barcode", barcode)
        .maybeSingle();
      if (savedRow) {
        isSavedByUser = true;
      }
    }
  } catch (error) {
    // Fall back gracefully to DEFAULT_PROFILE
  }

  // --- CACHE-FIRST FETCH ---
  const adminSupabase = getSupabaseAdminClient();
  
  let cachedProductData: ProductData | null = null;
  let isCacheFresh = false;

  try {
    const { data: cachedRow } = await adminSupabase
      .from("products")
      .select("*")
      .eq("barcode", barcode)
      .maybeSingle();

    if (cachedRow) {
      cachedProductData = {
        barcode: cachedRow.barcode,
        name: cachedRow.name,
        brand: cachedRow.brand,
        imageUrl: cachedRow.image_url,
        ingredientsText: cachedRow.ingredients_text,
        allergensTags: cachedRow.allergens_tags,
        tracesTags: cachedRow.traces_tags,
        labelsTags: cachedRow.labels_tags,
        additivesTags: cachedRow.additives_tags,
      };

      const ageInSeconds = (new Date().getTime() - new Date(cachedRow.last_fetched_at).getTime()) / 1000;
      if (ageInSeconds < CACHE_TTL_SECONDS) {
        isCacheFresh = true;
      }
    }
  } catch (e) {
    console.error("Cache read failed", e);
  }

  let finalProductData: ProductData | null = null;
  let usingStaleCacheFallback = false;

  if (cachedProductData && isCacheFresh) {
    finalProductData = cachedProductData;
  } else {
    // CACHE MISS or STALE: Fetch from OFF
    const url = `https://world.openfoodfacts.org/api/v2/product/${barcode}.json?fields=${OFF_FIELDS}`;
    try {
      const response = await fetch(url, {
        headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("HTTP " + response.status);
      }

      const off = (await response.json()) as OffResponse;
      if (off.status === 1 && off.product) {
        finalProductData = toProductData(barcode, off.product);

        // Upsert into cache asynchronously
        await adminSupabase.from("products").upsert({
          barcode,
          name: finalProductData.name,
          brand: finalProductData.brand,
          image_url: finalProductData.imageUrl,
          ingredients_text: finalProductData.ingredientsText,
          allergens_tags: finalProductData.allergensTags,
          traces_tags: finalProductData.tracesTags,
          labels_tags: finalProductData.labelsTags,
          additives_tags: finalProductData.additivesTags,
          raw_off_data: off as any,
          last_fetched_at: new Date().toISOString(),
        });
      }
    } catch (e) {
      console.error("OFF fetch failed", e);
      // Fallback: Use stale cache if available
      if (cachedProductData) {
        finalProductData = cachedProductData;
        usingStaleCacheFallback = true;
      }
    }
  }

  // --- Product not found ---
  if (!finalProductData) {
    const result: APIProductLookupResult = {
      found: false,
      barcode,
      product: null,
      verdict: computeVerdict(null),
      isSavedByUser,
      isSignedIn,
      notes: [],
      currentUserId,
      activeProfile,
      hasProfileAllergens,
    };
    for (const key in result.verdict.allergenVerdicts) {
       result.verdict.allergenVerdicts[key].reasoning = ["This product is not in the database yet — please read the physical label."];
    }
    return NextResponse.json(result);
  }

  // --- Compute Verdict ---
  const verdict = computeVerdict(finalProductData);

  if (usingStaleCacheFallback) {
    for (const key in verdict.allergenVerdicts) {
      verdict.allergenVerdicts[key].reasoning.push("Showing cached data; could not reach the product database.");
    }
  }

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

  // Fetch Community Notes
  const notes = await fetchCommunityNotes(barcode, currentUserId);

  const result: APIProductLookupResult = {
    found: true,
    barcode,
    product: finalProductData,
    verdict,
    isSavedByUser,
    isSignedIn,
    notes,
    currentUserId,
    activeProfile,
    hasProfileAllergens,
  };
  return NextResponse.json(result);
}
