import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { computeVerdict, type ProductData } from "@/lib/verdict";
import { DEFAULT_PROFILE, VerdictTier } from "@/lib/allergens/registry";
import ProductResult from "@/components/scanner/ProductResult";
import ScrollToTop from "@/components/ScrollToTop";
import Link from "next/link";
import type { AllergenProfileItem } from "@/lib/supabase/database.types";
import { fetchCommunityNotes } from "@/lib/notesFetcher";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ barcode: string }>;
}) {
  const { barcode: rawBarcode } = await params;
  const barcode = rawBarcode.replace(/\D/g, "");

  const adminSupabase = getSupabaseAdminClient();
  const supabase = await getSupabaseServerClient();
  
  let activeProfile = DEFAULT_PROFILE;
  let hasProfileAllergens = false;
  let isSavedByUser = false;
  let isSignedIn = false;
  let currentUserId: string | null = null;

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

    const { data: savedRow } = await supabase
      .from("saved_products")
      .select("id")
      .eq("user_id", user.id)
      .eq("product_barcode", barcode)
      .maybeSingle();
    
    if (savedRow) isSavedByUser = true;
  }

  const { data: cachedRow } = await adminSupabase
    .from("products")
    .select("*")
    .eq("barcode", barcode)
    .maybeSingle();

  if (!cachedRow) {
    return (
      <div className="flex min-h-screen flex-col bg-gray-50 p-4 pt-12">
        <Link href="/profile" className="mb-6 inline-flex items-center text-sm font-semibold text-blue-600">
          ← Back
        </Link>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 text-center text-gray-500">
          This product could not be found in our database.
        </div>
      </div>
    );
  }

  const productData: ProductData = {
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

  const verdict = computeVerdict(productData);

  // Recalculate worst tier
  if (activeProfile !== DEFAULT_PROFILE) {
    const TIER_WEIGHT: Record<VerdictTier, number> = {
      unsafe: 4, caution: 3, unknown: 2, likely_safe: 1, safe: 0,
    };
    let worstTier: VerdictTier = "unknown";
    if (activeProfile.length > 0) {
      worstTier = "safe";
      for (const allergenId of activeProfile) {
        const t = verdict.allergenVerdicts[allergenId]?.tier || "unknown";
        if (TIER_WEIGHT[t] > TIER_WEIGHT[worstTier]) worstTier = t;
      }
    }
    verdict.tier = worstTier;
  }

  // Fetch Community Notes
  const notes = await fetchCommunityNotes(barcode, currentUserId);

  const result = {
    found: true,
    barcode,
    product: productData,
    verdict,
    isSavedByUser,
    isSignedIn,
    notes,
    currentUserId,
    activeProfile,
    hasProfileAllergens,
  };

  return (
    <div className="flex min-h-screen flex-col bg-white p-4">
      <ScrollToTop />
      <Link href="/profile" className="mb-6 inline-flex items-center text-sm font-semibold text-blue-600">
        ← Back
      </Link>
      <ProductResult result={result} isSavedPage={true} />
    </div>
  );
}
