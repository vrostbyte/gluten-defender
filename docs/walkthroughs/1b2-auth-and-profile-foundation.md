# Pass 1b.2 — Supabase Auth + Profile Foundation Walkthrough

This pass establishes the foundational authentication and user profile architecture that future features (like saving products and community notes) will build upon. Crucially, it preserves the core principle that **anonymous scanning is sacred** — no sign-in walls have been added to the scan flow.

## What Was Created / Changed

1. **Supabase Client Infrastructure:**
   - Installed `@supabase/ssr` to securely manage auth in Next.js App Router.
   - Replaced `lib/supabase/client.ts` with the new browser client.
   - Added `lib/supabase/server.ts` and `lib/supabase/middleware.ts` for server-side cookie management.
   - Added a root `proxy.ts` to refresh the session across all routes.
   - Added database types generated for the `user_profiles` schema.
2. **Database Migration:**
   - Created `supabase/migrations/20260529000000_create_user_profiles.sql` which sets up the `user_profiles` table, enables Row Level Security (RLS), and adds an auto-create trigger when a new user signs up.
3. **Authentication Routes:**
   - Created full email/password auth flows at `/auth/sign-in`, `/auth/sign-up`, `/auth/reset-password`, and `/auth/update-password`.
   - Created server-side callback handlers (`/auth/callback` and `/auth/sign-out`) for secure session management.
4. **Profile Tab UI (`app/profile/page.tsx`):**
   - Refactored to display entirely different content depending on whether the user is signed in or anonymous, outlining the benefits of an account.
5. **Verdict Engine Integration (`app/api/product/[barcode]/route.ts`):**
   - Updated the product lookup route to read the current session securely and re-evaluate the overall `tier` using the user's custom `user_profiles.allergens` array if one exists.
   - Maintained a robust fallback to `DEFAULT_PROFILE` for anonymous users and network errors.

## Step-by-Step Supabase Dashboard Setup

To finish setting this up, please complete the following steps in your Supabase project dashboard:

### 1. Run the Database Migration
- Go to the **SQL Editor** in the left sidebar.
- Click **New query**.
- Copy the entire contents of `supabase/migrations/20260529000000_create_user_profiles.sql` from your code editor.
- Paste it into the query window and click **Run**.
- **To verify:** Go to the **Table Editor** and ensure the `user_profiles` table appears. Under the **Authentication -> Policies** section (or the padlock icon), verify that Row Level Security is enabled and the three policies are active.

### 2. Configure Email Authentication
- Go to **Authentication -> Providers** in the sidebar.
- Click on **Email** to expand it.
- Ensure **Enable Email provider** is turned on.
- Ensure **Confirm email** is toggled **ON**. (We rely on verified emails).
- Click **Save**.

### 3. Configure Redirect URLs
- Go to **Authentication -> URL Configuration**.
- Under **Site URL**, set your production URL (or `http://localhost:3000` for now if you haven't deployed).
- Under **Redirect URLs**, click **Add URL** and add `http://localhost:3000/auth/callback`.
- *Note:* When you deploy to Vercel, you will need to come back here and add your Vercel preview/production callback URLs (e.g., `https://your-app.vercel.app/auth/callback`).

### 4. Update Email Templates (Optional)
- Go to **Authentication -> Email Templates**.
- You can customize the language of the "Confirm Signup" and "Reset Password" emails here. The default Supabase sender works fine for development. (We will swap this out for Resend in a later pass).

### 5. Add Vercel Environment Variables
- Check your local `.env.local` file; notice the new placeholder for `SUPABASE_SERVICE_ROLE_KEY`.
- Copy the real **service_role secret** from Supabase (**Project Settings -> API**).
- Add `SUPABASE_SERVICE_ROLE_KEY` to your Vercel project's Environment Variables (and to your `.env.local`). We will need this key securely stored for server-side cache writes in the next pass.

## How to Test Locally

1. **Anonymous Scanning:** Go to `/scan` and look up a product (like IZZE or Cheerios). Verify that it works exactly as before, with no sign-in prompt blocking you.
2. **Sign Up:** Navigate to the **Profile** tab and click **Create an account**. Enter an email and password.
3. **Email Confirmation:** Check the inbox for the email you used. Click the confirmation link. You should be redirected back to the app and land on the Profile page, now signed in.
4. **Check Profile Tab:** Verify the UI now shows your email, an empty "No display name set", and the default allergen profile. (You can also check the `user_profiles` table in Supabase to see that your row was auto-created by the trigger).
5. **Sign Out:** Click the **Sign out** button at the bottom of the profile page. You should be redirected back to `/scan` as an anonymous user.
6. **Sign In:** Go back to the Profile tab, click **Sign in**, and use your newly created credentials.
7. **Reset Password:** Test the "Forgot password?" flow on the sign-in page to ensure the reset email arrives and the update-password form works.
