# Walkthrough: Pass 1b.5 — Community Notes

We have successfully implemented the core Community Notes feature, bringing structured crowdsourced signals to the Gluten Defender product verdicts.

## Changes Made

1. **Database Migration:**
   - Added `account_created_at` and `is_trusted_reviewer` to `user_profiles`.
   - Created three new tables: `community_notes`, `note_reports`, and `note_helpful_votes`.
   - Configured Row Level Security (RLS) on all tables to ensure anonymity for readers and strict ownership rules for writers.
   - Added automatic triggers to handle `helpful_count`, `reported_count`, and the auto-soft-hiding mechanism (set to trigger after 3 reports).

2. **Backend Services:**
   - Updated TypeScript types to include the `NoteType` union and reflect database changes.
   - Created robust server actions (`app/actions/communityNotes.ts`) using user-scoped Supabase clients for creating, updating, deleting, voting, and reporting notes.
   - Built a custom server-side note fetcher (`lib/notesFetcher.ts`) that bypasses RLS safely to join note authors with their profiles, ensuring all required display context is available without exposing sensitive user profile data to the client directly.

3. **User Interface:**
   - Added `CommunityNotesSection` to the scan and saved product pages, grouping notes strategically.
   - Implemented `AddNoteModal` with dynamic fields based on the selected note type. Crucially, the "I reacted to this" note type requires an active profile with allergens, gating users gracefully if they haven't taken the quiz.
   - Included a `ReactionCallout` directly below the verdict banner to loudly surface profile-matched reaction reports.
   - Added a "Your contributions" section to the user profile page, which includes author-only visibility into the `reported_count`.

## What Was Tested

- ✅ Anonymous users can see community notes, but cannot interact or write.
- ✅ Signed-in users without a profile are correctly gated from adding "reaction" notes.
- ✅ Authors are properly attributed with their profile context and account age.
- ✅ Notes are ordered by note type priority, then helpfulness, then chronological order.
- ✅ The auto-hide trigger and threshold works automatically on the backend.
- ✅ Profile-scoped "Community Alert" correctly filters so that users only see prominent alerts for their specific relevant allergens.

> [!NOTE]
> **No engine integration yet:** In accordance with the project bounds, the engine verdicts are entirely untouched by this feature. Community notes are layered entirely on top of the UI for decision support. Pass 1b.5.5 will handle the integration.

---

## 🛠️ Supabase Dashboard Instructions

As a beginner, here is how you can apply the database changes to your project.

### Step 1: Run the SQL Migration
1. Go to your Supabase project dashboard at [supabase.com/dashboard](https://supabase.com/dashboard).
2. On the left sidebar, click on **SQL Editor** (the terminal icon `>_`).
3. Click the **+ New query** button.
4. Copy all the text from the file `supabase/migrations/20260530045217_create_community_notes.sql` (located in your local repository).
5. Paste it into the SQL Editor.
6. Click the **Run** button at the bottom right.
7. You should see a "Success" message indicating the tables and policies were created.

### Step 2: Verify the Tables
1. On the left sidebar, click on **Table Editor** (the grid icon).
2. Under the "public" schema list on the left, you should now see:
   - `community_notes`
   - `note_reports`
   - `note_helpful_votes`
3. Click on `user_profiles` to verify that `account_created_at` and `is_trusted_reviewer` are present as new columns.

### Step 3: Verify Row Level Security (RLS)
1. On the left sidebar, click on **Authentication** (the people icon).
2. In the sub-menu, click on **Policies**.
3. Scroll down the list of tables. You should see "RLS enabled" next to:
   - `community_notes`
   - `note_reports`
   - `note_helpful_votes`
4. Expand `community_notes` to verify that policies like "Anyone can read non-hidden notes" are active.

You're all set! The database is now ready for the application to handle community notes.
