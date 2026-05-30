import { getSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import EditableProfile from "@/components/profile/EditableProfile";
import { computeVerdict, type ProductData } from "@/lib/verdict";
import { DEFAULT_PROFILE, VerdictTier } from "@/lib/allergens/registry";
import { unsaveProductAction } from "@/app/actions/saveProduct";
import { ContributionsList, type Contribution } from "@/components/profile/ContributionsList";

export const metadata = { title: "Profile" };

function getWorstTier(productData: ProductData): VerdictTier {
  const verdict = computeVerdict(productData);
  const TIER_WEIGHT: Record<VerdictTier, number> = {
    unsafe: 4,
    caution: 3,
    unknown: 2,
    likely_safe: 1,
    safe: 0,
  };
  let worstTier: VerdictTier = "safe";
  for (const allergenId of DEFAULT_PROFILE) {
    const t = verdict.allergenVerdicts[allergenId]?.tier || "unknown";
    if (TIER_WEIGHT[t] > TIER_WEIGHT[worstTier]) {
      worstTier = t;
    }
  }
  return worstTier;
}

const TIER_COLORS: Record<VerdictTier, string> = {
  safe: "bg-green-100 text-green-800",
  likely_safe: "bg-lime-100 text-lime-800",
  caution: "bg-amber-100 text-amber-800",
  unsafe: "bg-red-100 text-red-800",
  unknown: "bg-gray-100 text-gray-800",
};

export default async function ProfilePage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return (
      <div className="flex min-h-screen flex-col items-center p-6 pt-12 text-center">
        <h1 className="mb-4 text-2xl font-bold text-gray-900">Your Defender</h1>
        <p className="mb-6 text-gray-600">
          You don&apos;t need an account to scan — accounts just unlock these extras:
        </p>
        <ul className="mb-8 space-y-2 text-left text-sm text-gray-700">
          <li>• Save products you&apos;ve scanned</li>
          <li>• Contribute community notes to help others</li>
          <li>• Personalize verdicts to your specific allergens (coming soon)</li>
        </ul>
        <div className="flex w-full max-w-xs flex-col gap-3">
          <Link
            href="/auth/sign-in"
            className="flex min-h-12 items-center justify-center rounded-2xl bg-blue-600 font-semibold text-white active:bg-blue-700"
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            className="flex min-h-12 items-center justify-center rounded-2xl border-2 border-blue-600 font-semibold text-blue-600 active:bg-blue-50"
          >
            Create an account
          </Link>
        </div>
      </div>
    );
  }

  // Fetch profile
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const allergens = profile?.allergens || [];
  const displayName = profile?.display_name;

  // Fetch saved products
  const { data: savedProducts } = await supabase
    .from("saved_products")
    .select(`
      saved_at,
      product_barcode,
      products (
        barcode,
        name,
        brand,
        image_url,
        ingredients_text,
        allergens_tags,
        traces_tags,
        labels_tags,
        additives_tags
      )
    `)
    .eq("user_id", user.id)
    .order("saved_at", { ascending: false })
    .limit(50);

  // Fetch user contributions
  const { data: userNotes } = await supabase
    .from("community_notes")
    .select(`
      id,
      note_type,
      body,
      created_at,
      helpful_count,
      reported_count,
      soft_hidden,
      product_barcode,
      products (
        name,
        image_url
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(50);
    
  const formattedContributions: Contribution[] = (userNotes || []).map((note) => {
    const pArray = Array.isArray(note.products) ? note.products : [note.products];
    const p = pArray[0] as any;
    return {
      id: note.id,
      note_type: note.note_type,
      body: note.body,
      created_at: note.created_at,
      helpful_count: note.helpful_count,
      reported_count: note.reported_count,
      soft_hidden: note.soft_hidden,
      product_barcode: note.product_barcode,
      product: {
        name: p?.name || null,
        image_url: p?.image_url || null,
      }
    };
  });

  return (
    <div className="flex min-h-screen flex-col p-4 pb-20">
      <h1 className="mb-6 mt-4 text-2xl font-bold text-gray-900">Profile</h1>
      
      <div className="mb-6 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-gray-500">Account</h2>
        <p className="mt-1 text-base text-gray-900">{displayName || "No display name set"}</p>
        <p className="text-sm text-gray-500">{user.email}</p>
        <p className="mt-2 text-xs text-gray-400">Country: {profile?.country || "US"}</p>
      </div>

      <div className="mb-8">
        <EditableProfile 
          initialAllergens={allergens} 
          quizCompletedAt={profile?.quiz_completed_at || null} 
        />
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Saved products</h2>
        {(!savedProducts || savedProducts.length === 0) ? (
          <div className="rounded-2xl border border-gray-200 bg-gray-50 p-6 text-center text-gray-500">
            You haven&apos;t saved any products yet. Tap Save on a scan result to keep it here.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {savedProducts.length === 50 && (
              <p className="mb-1 text-xs text-gray-500">Showing your 50 most recent saves</p>
            )}
            {savedProducts.map((saved) => {
              // The join returns an array if one-to-many, but one-to-one or many-to-one returns object/array.
              // In supabase-js, with referencing a single row it's an object, but sometimes an array.
              // We'll handle both just in case.
              const pArray = Array.isArray(saved.products) ? saved.products : [saved.products];
              const p = pArray[0] as any;
              
              if (!p) return null;
              
              const productData: ProductData = {
                barcode: p.barcode,
                name: p.name,
                brand: p.brand,
                imageUrl: p.image_url,
                ingredientsText: p.ingredients_text,
                allergensTags: p.allergens_tags,
                tracesTags: p.traces_tags,
                labelsTags: p.labels_tags,
                additivesTags: p.additives_tags,
              };
              
              const tier = getWorstTier(productData);
              const removeAction = async () => {
                "use server";
                await unsaveProductAction(p.barcode);
              };

              return (
                <div key={p.barcode} className="relative flex overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
                  <Link href={`/products/${p.barcode}`} className="flex flex-1 items-center gap-3 p-3 active:bg-gray-50">
                    {p.image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.image_url} alt={p.name || "Product"} className="h-14 w-14 shrink-0 rounded-lg object-contain bg-gray-50" />
                    ) : (
                      <div className="h-14 w-14 shrink-0 rounded-lg bg-gray-100" />
                    )}
                    <div className="flex min-w-0 flex-1 items-center justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 font-semibold text-gray-900">{p.name || "Unnamed product"}</p>
                        <p className="truncate text-xs text-gray-500">{p.brand}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{p.barcode}</p>
                      </div>
                      <div className="shrink-0">
                        <span className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${TIER_COLORS[tier]}`}>
                          {tier.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </Link>
                  <div className="flex items-center justify-center border-l border-gray-100 bg-gray-50 px-3">
                    <form action={removeAction}>
                      <button type="submit" className="p-2 text-sm font-medium text-red-600 hover:bg-red-50 active:text-red-800 rounded">
                        Remove
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="mb-8">
        <h2 className="mb-3 text-lg font-bold text-gray-900">Your contributions ({formattedContributions.length})</h2>
        <ContributionsList contributions={formattedContributions} />
      </div>

      <form action="/auth/sign-out" method="POST" className="mt-auto">
        <button
          type="submit"
          className="w-full rounded-2xl border border-gray-300 bg-white py-4 font-semibold text-gray-700 active:bg-gray-50"
        >
          Sign out
        </button>
      </form>
    </div>
  );
}
