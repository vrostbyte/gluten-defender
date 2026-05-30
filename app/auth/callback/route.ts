import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Supabase generated a code and sent it via email. The email link verifies 
  // the code with Supabase, and Supabase sends the user to this callback.
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/profile';

  if (code) {
    const supabase = await getSupabaseServerClient();
    
    // Our callback exchanges that single-use code for a persistent session.
    // This is the core of the PKCE auth flow.
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      // Redirect using the request's origin ensures it works seamlessly 
      // on both Vercel preview URLs and custom domains without hardcoding.
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Auth code error (e.g., link expired)
  return NextResponse.redirect(`${origin}/auth/sign-in?error=auth_callback_failed`);
}
