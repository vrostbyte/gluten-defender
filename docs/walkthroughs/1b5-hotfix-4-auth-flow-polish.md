# Hotfix: Auth Flow Polish (Pass 1b.5 #4)

This hotfix addresses three authentication flow issues caught during real-world testing. All issues have been resolved, ensuring a smoother user experience.

## Issue 1: Sign-Out Returns HTTP 405
**Files Changed:** `app/auth/sign-out/route.ts`

**Fix & Confirmation:** 
The sign-out button in `app/profile/page.tsx` was correctly implemented as a `<form action="/auth/sign-out" method="POST">`. However, the `/auth/sign-out` route handler was defaulting to a 307 redirect status for `NextResponse.redirect`. A 307 redirect instructs the browser to retain the original HTTP method (POST). Since the redirect target (`/scan`) is a page that only handles GET requests, this resulted in an HTTP 405 Method Not Allowed error.

We confirmed the route handler exports `POST`, and we updated the redirect to explicitly use `status: 303 (See Other)`. This forces the browser to issue a standard GET request when following the redirect to `/scan`, successfully signing the user out and redirecting them without errors.

## Issue 2: 404 on Email Confirmation Callback
**Files Changed:** `app/auth/callback/route.ts`

**Fix & Confirmation:**
The `/auth/callback` route was throwing an error or improperly forwarding the request origin, causing users to land on a 404 page after clicking the email confirmation link. 

We rewrote the route handler to properly utilize `NextRequest` and accurately capture the `origin`. It correctly implements the PKCE flow by extracting the `code` and calling `supabase.auth.exchangeCodeForSession(code)` to exchange the single-use code for a persistent session.

Here is the exact updated content of the callback handler:
```typescript
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
```

## Issue 3: "Maybe Later" on Quiz Prompt Doesn't Dismiss
**Files Changed:** `components/profile/EditableProfile.tsx`

**Fix & Confirmation:**
The component already contained a state variable for dismissal, but clicking the "Maybe later" button was not taking effect because the `<button>` lacked a `type="button"` attribute (potentially causing an unintended submit/refresh) and the state management didn't fully prevent remount interference. 

We updated the button to explicitly include `type="button"`, renamed the state variable to `dismissed` for clarity, and added beginner-friendly comments detailing the session-only state pattern. We confirm that this approach relies strictly on React component state (`useState`) — it intentionally does not write to the database or localStorage so that the card acts as a gentle reminder during subsequent visits.

## Acceptance Results & Build Status
- **Issue 1 (Sign-out):** Tapping "Sign out" effectively clears the session and correctly redirects the user to `/scan` with a GET request. The 405 error is resolved.
- **Issue 2 (Callback):** Tapping the confirmation email link now properly triggers the PKCE exchange and redirects the user safely to the `/profile` page using relative origin paths. The 404 error is resolved.
- **Issue 3 (Dismissal):** Tapping "Maybe later" successfully hides the quiz prompt. Navigating away and returning remounts the component and properly reinstates the card as expected.
- **Build Status:** The application compiles successfully. Running `npm run build` locally passes with zero TypeScript errors.
