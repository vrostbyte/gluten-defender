import { NextResponse } from 'next/server';
import { getSupabaseServerClient } from '@/lib/supabase/server';

// Security note: We use POST instead of GET for sign-out to prevent accidental 
// or malicious sign-outs via link prefetching or cross-site request forgery.
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();
  await supabase.auth.signOut();
  
  // Use status 303 (See Other) to force the browser to issue a GET request 
  // when following the redirect to the /scan page. If we use the default 307, 
  // the browser would POST to /scan, which causes a 405 Method Not Allowed error.
  return NextResponse.redirect(new URL('/scan', request.url), { status: 303 });
}
