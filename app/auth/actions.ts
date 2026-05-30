'use server';

import { getSupabaseServerClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

function getRequiredSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_SITE_URL;
  if (!url) {
    throw new Error(
      'NEXT_PUBLIC_SITE_URL environment variable is required for auth flows. ' +
      'Set it to your application URL (e.g., http://localhost:3000 for local dev, ' +
      'https://gluten-defender.vercel.app for production).'
    );
  }
  return url;
}

export async function signIn(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await getSupabaseServerClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/profile');
}

export async function signUp(formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  const supabase = await getSupabaseServerClient();
  
  const origin = getRequiredSiteUrl();

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${origin}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Check your email for a confirmation link to finish signing up.' };
}

export async function resetPassword(formData: FormData) {
  const email = formData.get('email') as string;
  const supabase = await getSupabaseServerClient();
  const origin = getRequiredSiteUrl();

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/update-password`,
  });

  if (error) {
    return { error: error.message };
  }

  return { success: 'Check your email for a password reset link.' };
}

export async function updatePassword(formData: FormData) {
  const password = formData.get('password') as string;
  const supabase = await getSupabaseServerClient();

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return { error: error.message };
  }

  revalidatePath('/', 'layout');
  redirect('/profile');
}
