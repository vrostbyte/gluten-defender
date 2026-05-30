import { getSupabaseServerClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import OnboardingQuiz from '@/components/quiz/OnboardingQuiz';

export const metadata = {
  title: 'Setup your profile',
};

export default async function OnboardingPage() {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    // PRD: "anonymous user visits ... /onboarding for anonymous users should either redirect to /auth/sign-in or show a clear 'sign in to personalize' message"
    redirect('/auth/sign-in');
  }

  // Fetch existing profile in case it's a retake
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('allergens')
    .eq('user_id', user.id)
    .single();

  const initialProfile = profile?.allergens || [];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OnboardingQuiz initialProfile={initialProfile} />
    </div>
  );
}
