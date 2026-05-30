'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export type SeverityType = 'preference' | 'intolerance' | 'allergy' | 'anaphylaxis';

export interface AllergenProfileItem {
  allergen_id: string;
  severity: SeverityType;
  sensitive_to_traces: boolean;
}

export async function saveProfile(allergens: AllergenProfileItem[]) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: 'Not authenticated' };
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({
      allergens,
      quiz_completed_at: new Date().toISOString(),
    })
    .eq('user_id', user.id);

  if (error) {
    console.error('Error saving profile:', error);
    return { error: 'Failed to save profile' };
  }

  revalidatePath('/profile');
  redirect('/profile');
}
