# Hotfix: Require NEXT_PUBLIC_SITE_URL for Auth Flows

This hotfix addresses a critical issue where the authentication flows (sign up, reset password) were silently falling back to `http://localhost:3000` when the `NEXT_PUBLIC_SITE_URL` environment variable was not set. This caused production users to receive email links pointing to localhost, breaking the user experience.

## Changes Made

### Files Changed
- `app/auth/actions.ts`: Added strict environment variable validation and updated call sites.
- `.env.example`: Added `NEXT_PUBLIC_SITE_URL` as a required variable with explanatory comments.
- `.env.local`: Added/updated `NEXT_PUBLIC_SITE_URL` for local development testing.

### Helper Implemented
The following helper was added to `app/auth/actions.ts` to enforce the presence of the environment variable and fail loudly if missing:

```typescript
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
```

### Call Sites Updated
The silent fallback (`const origin = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';`) was replaced with `const origin = getRequiredSiteUrl();` in the following locations within `app/auth/actions.ts`:
1. `signUp()` - Used for configuring the `emailRedirectTo` parameter in `supabase.auth.signUp`.
2. `resetPassword()` - Used for configuring the `redirectTo` parameter in `supabase.auth.resetPasswordForEmail`.

Codebase-wide searches confirmed that there are no remaining instances of `?? 'http://localhost'` or `window.location.origin` in authentication files.

## Local Testing & Build Status
- Running `npm run build` locally passes successfully with `NEXT_PUBLIC_SITE_URL` set in `.env.local`, with zero TypeScript errors.
- If `NEXT_PUBLIC_SITE_URL` is omitted, the build itself succeeds (since server actions run at runtime), but invoking the sign-up or reset password flows will actively fail and throw a clear error in the server console, preventing silent email dispatch.
- Manual verification on mobile will correctly direct users to the production URL once the Vercel environment is updated.

## Explicit Vercel Dashboard Instructions (ACTION REQUIRED)

To ensure this fix takes effect in production, you **must** configure the new environment variable in your Vercel dashboard and redeploy. Follow these steps carefully:

1. Go to your **Vercel dashboard** → the **gluten-defender** project → **Settings** → **Environment Variables**.
2. Click **"Add New"**.
3. **Name**: `NEXT_PUBLIC_SITE_URL`
4. **Value**: `https://gluten-defender.vercel.app` (or your primary domain if it's different).
5. **Environment**: Select **Production** (and **Preview** if desired).
6. Click **"Save"**.
7. **CRITICAL**: After saving, **REDEPLOY** the latest commit. Vercel won't re-trigger automatically for environment variable changes. You can either push a fresh commit, or go to the **Deployments** tab in Vercel, click on your most recent deployment, and select **Redeploy**.
