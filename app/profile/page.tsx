import { getSupabaseServerClient } from "@/lib/supabase/server";
import Link from "next/link";
import EditableProfile from "@/components/profile/EditableProfile";

export const metadata = { title: "Profile" };

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
