"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

type SaveResult = { ok: true; isSaved: boolean } | { ok: false; error: string };

export async function saveProductAction(barcode: string): Promise<SaveResult> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { ok: false, error: "Must be signed in to save products" };
    }

    const { error } = await supabase
      .from("saved_products")
      .insert({ user_id: user.id, product_barcode: barcode });

    if (error && error.code !== "23505") { // 23505 is unique violation
      return { ok: false, error: error.message };
    }

    revalidatePath("/profile");
    revalidatePath(`/products/${barcode}`);
    
    return { ok: true, isSaved: true };
  } catch (e: any) {
    return { ok: false, error: e.message || "Unknown error" };
  }
}

export async function unsaveProductAction(barcode: string): Promise<SaveResult> {
  try {
    const supabase = await getSupabaseServerClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return { ok: false, error: "Must be signed in to unsave products" };
    }

    const { error } = await supabase
      .from("saved_products")
      .delete()
      .eq("user_id", user.id)
      .eq("product_barcode", barcode);

    if (error) {
      return { ok: false, error: error.message };
    }

    revalidatePath("/profile");
    revalidatePath(`/products/${barcode}`);
    
    return { ok: true, isSaved: false };
  } catch (e: any) {
    return { ok: false, error: e.message || "Unknown error" };
  }
}
