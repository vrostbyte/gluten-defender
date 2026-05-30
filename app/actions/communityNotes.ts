"use server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { NoteType } from "@/lib/supabase/database.types";

export type CreateNoteParams = {
  productBarcode: string;
  noteType: NoteType;
  body?: string;
};

export type ActionResult<T = void> = 
  | { ok: true; data: T }
  | { ok: false; error: string; message?: string };

export async function createNote({
  productBarcode,
  noteType,
  body = "",
}: CreateNoteParams): Promise<ActionResult<{ noteId: string }>> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthorized", message: "You must be signed in to add a note." };
  }

  const trimmedBody = body.trim();

  // Validate body requirements based on noteType
  if (trimmedBody.length > 1000) {
    return { ok: false, error: "body_too_long", message: "Note body must be 1000 characters or less." };
  }

  const requiresBody = ['general', 'recipe_changed', 'cross_contamination', 'ingredient_correction'];
  if (requiresBody.includes(noteType) && trimmedBody.length === 0) {
    return { ok: false, error: "body_required", message: `A description is required for this note type.` };
  }

  // Quiz gate for 'reaction'
  if (noteType === 'reaction') {
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("allergens")
      .eq("user_id", user.id)
      .single();

    if (!profile || !profile.allergens || profile.allergens.length === 0) {
      return {
        ok: false,
        error: 'profile_required',
        message: 'Reaction reports are most helpful when others know your allergen context. Take the quick quiz?'
      };
    }
  }

  const { data, error } = await supabase
    .from("community_notes")
    .insert({
      product_barcode: productBarcode,
      user_id: user.id,
      note_type: noteType,
      body: trimmedBody.length > 0 ? trimmedBody : null,
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to create note:", error);
    return { ok: false, error: "db_error", message: "Failed to save note." };
  }

  revalidatePath(`/products/${productBarcode}`);
  revalidatePath(`/profile`);

  return { ok: true, data: { noteId: data.id } };
}

export async function updateNote({
  noteId,
  body,
}: {
  noteId: string;
  body: string;
}): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthorized" };
  }

  const trimmedBody = body.trim();
  if (trimmedBody.length > 1000) {
    return { ok: false, error: "body_too_long", message: "Note body must be 1000 characters or less." };
  }

  // We enforce that the user owns the row via RLS, but we need to know productBarcode for revalidation,
  // or we could just skip specific path revalidation or look it up first.
  const { data: existingNote } = await supabase
    .from("community_notes")
    .select("product_barcode, note_type")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { ok: false, error: "not_found" };
  }

  const requiresBody = ['general', 'recipe_changed', 'cross_contamination', 'ingredient_correction'];
  if (requiresBody.includes(existingNote.note_type) && trimmedBody.length === 0) {
    return { ok: false, error: "body_required", message: `A description is required for this note type.` };
  }

  const { error } = await supabase
    .from("community_notes")
    .update({ body: trimmedBody.length > 0 ? trimmedBody : null })
    .eq("id", noteId);

  if (error) {
    return { ok: false, error: "db_error" };
  }

  revalidatePath(`/products/${existingNote.product_barcode}`);
  revalidatePath(`/profile`);

  return { ok: true, data: undefined };
}

export async function deleteNote({ noteId }: { noteId: string }): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthorized" };
  }

  const { data: existingNote } = await supabase
    .from("community_notes")
    .select("product_barcode")
    .eq("id", noteId)
    .single();

  if (!existingNote) {
    return { ok: false, error: "not_found" };
  }

  const { error } = await supabase
    .from("community_notes")
    .delete()
    .eq("id", noteId);

  if (error) {
    return { ok: false, error: "db_error" };
  }

  revalidatePath(`/products/${existingNote.product_barcode}`);
  revalidatePath(`/profile`);

  return { ok: true, data: undefined };
}

export async function reportNote({
  noteId,
  reason,
}: {
  noteId: string;
  reason?: string;
}): Promise<ActionResult> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthorized", message: "Sign in to report notes." };
  }

  const trimmedReason = reason?.trim();
  if (trimmedReason && trimmedReason.length > 500) {
    return { ok: false, error: "reason_too_long", message: "Report reason must be 500 characters or less." };
  }

  const { error } = await supabase
    .from("note_reports")
    .insert({
      note_id: noteId,
      user_id: user.id,
      reason: trimmedReason && trimmedReason.length > 0 ? trimmedReason : null,
    });

  if (error) {
    // If it's a unique constraint violation, they already reported it. We can treat that as a silent success or error.
    if (error.code === '23505') {
      return { ok: false, error: "already_reported", message: "You have already reported this note." };
    }
    // If it's the trigger error for self-reporting:
    if (error.message && error.message.includes("own notes")) {
       return { ok: false, error: "cannot_report_own", message: "You cannot report your own note." };
    }
    console.error("Report note error:", error);
    return { ok: false, error: "db_error", message: "Failed to submit report." };
  }

  // We don't know the barcode immediately without a lookup, so let's do a lookup or just accept that 
  // revalidating might be slightly delayed for this product. Better to look it up so we can update the UI if it crossed the soft-hide threshold.
  const { data: note } = await supabase.from("community_notes").select("product_barcode").eq("id", noteId).single();
  if (note) {
    revalidatePath(`/products/${note.product_barcode}`);
  }

  return { ok: true, data: undefined };
}

export async function toggleHelpfulVote({ noteId }: { noteId: string }): Promise<ActionResult<{ isHelpful: boolean, newCount: number }>> {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "unauthorized" };
  }

  // Check if vote exists
  const { data: existingVote } = await supabase
    .from("note_helpful_votes")
    .select("id")
    .eq("note_id", noteId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existingVote) {
    // Remove vote
    const { error: delError } = await supabase
      .from("note_helpful_votes")
      .delete()
      .eq("id", existingVote.id);
    
    if (delError) return { ok: false, error: "db_error" };
  } else {
    // Add vote
    const { error: insError } = await supabase
      .from("note_helpful_votes")
      .insert({ note_id: noteId, user_id: user.id });

    if (insError) {
       if (insError.message && insError.message.includes("own notes")) {
          return { ok: false, error: "cannot_vote_own", message: "You cannot vote on your own note." };
       }
       return { ok: false, error: "db_error" };
    }
  }

  // Fetch updated count
  const { data: note } = await supabase
    .from("community_notes")
    .select("helpful_count, product_barcode")
    .eq("id", noteId)
    .single();

  if (note) {
    revalidatePath(`/products/${note.product_barcode}`);
  }

  return { ok: true, data: { isHelpful: !existingVote, newCount: note?.helpful_count ?? 0 } };
}
