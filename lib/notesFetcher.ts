import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Note, NoteAuthor } from "@/components/scanner/CommunityNotesSection";

export async function fetchCommunityNotes(productBarcode: string, currentUserId: string | null): Promise<Note[]> {
  const adminSupabase = getSupabaseAdminClient();

  // 1. Fetch notes (visible ones + own hidden ones)
  let query = adminSupabase
    .from("community_notes")
    .select("*")
    .eq("product_barcode", productBarcode);

  const { data: notesData, error: notesError } = await query;

  if (notesError || !notesData) {
    console.error("Failed to fetch community notes:", notesError);
    return [];
  }

  const filteredNotes = notesData.filter(
    (n) => !n.soft_hidden || (currentUserId && n.user_id === currentUserId)
  );

  if (filteredNotes.length === 0) return [];

  // 2. Fetch author profiles
  const userIds = Array.from(new Set(filteredNotes.map((n) => n.user_id)));
  const { data: profilesData } = await adminSupabase
    .from("user_profiles")
    .select("user_id, display_name, is_trusted_reviewer, account_created_at, allergens")
    .in("user_id", userIds);

  const profilesMap = new Map<string, NoteAuthor>();
  if (profilesData) {
    profilesData.forEach((p) => {
      profilesMap.set(p.user_id, {
        display_name: p.display_name,
        is_trusted_reviewer: p.is_trusted_reviewer,
        account_created_at: p.account_created_at,
        allergens: p.allergens,
      });
    });
  }

  // 3. Fetch helpful votes for current user
  const userVotesSet = new Set<string>();
  if (currentUserId) {
    const { data: votesData } = await adminSupabase
      .from("note_helpful_votes")
      .select("note_id")
      .eq("user_id", currentUserId)
      .in("note_id", filteredNotes.map(n => n.id));

    if (votesData) {
      votesData.forEach(v => userVotesSet.add(v.note_id));
    }
  }

  // 4. Assemble
  return filteredNotes.map((n) => {
    // If somehow a profile is missing, provide a fallback
    const defaultAuthor: NoteAuthor = {
      display_name: null,
      is_trusted_reviewer: false,
      account_created_at: n.created_at, // fallback
      allergens: [],
    };

    return {
      id: n.id,
      user_id: n.user_id,
      note_type: n.note_type,
      body: n.body,
      created_at: n.created_at,
      helpful_count: n.helpful_count,
      author: profilesMap.get(n.user_id) || defaultAuthor,
      userHasVoted: userVotesSet.has(n.id),
    };
  });
}
