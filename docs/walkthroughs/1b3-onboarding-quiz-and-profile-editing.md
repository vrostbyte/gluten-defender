# Pass 1b.3 — Onboarding Quiz & Editable Profile

## Summary of Changes
1. **Created Server Actions**: Added `saveProfile` action in `app/onboarding/actions.ts` to securely update a user's `allergens` and `quiz_completed_at` timestamps in the database.
2. **Onboarding Quiz Components**:
   - `app/onboarding/page.tsx`: Server component that verifies auth before rendering the quiz. Redirects to `/auth/sign-in` for anonymous users. Loads existing profile data for retakes.
   - `components/quiz/OnboardingQuiz.tsx`: A multi-step client component. Step 1 asks which allergens to track (multi-select from the registry). Subsequent steps calibrate the `severity` and `sensitive_to_traces` for each selected allergen. Implemented a mobile-friendly progressive disclosure flow with radio buttons and checkboxes.
3. **Editable Settings in Profile**:
   - Updated `app/profile/page.tsx` to render a new `EditableProfile` client component.
   - `components/profile/EditableProfile.tsx`: Replaces the static profile section. Displays a "Set up your defender" soft prompt for users with empty profiles. For populated profiles, shows each allergen as a card with an `Edit` and `Remove` button. Includes an `Add an allergen` button to seamlessly add more allergens from the registry without needing to re-take the entire quiz.
4. **Engine Integration Verification**:
   - Checked `app/api/product/[barcode]/route.ts`: It correctly queries `user_profiles` when a user is logged in, using their specified `allergens` list. It defaults to `['gluten', 'milk']` for unauthenticated users or users with empty lists.
5. **Quality of Life / Accessibility**:
   - Added appropriate `autoComplete` attributes to the password and email inputs in `app/auth/sign-up/page.tsx`.

## Testing the Flow
- Anonymous users remain unaffected and cannot access the quiz.
- Logging in for the first time without a profile displays the "Set up your defender" prompt on the profile page.
- Selecting allergens via the quiz accurately stores the array structure (`[{ allergen_id, severity, sensitive_to_traces }]`) into Supabase, and updates `quiz_completed_at`.
- Using the profile settings modal effectively handles additions, deletions, and severity updates.
