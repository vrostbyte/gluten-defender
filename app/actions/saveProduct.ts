"use server"

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveProductAction(barcode: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Must be signed in to save products");
  }

  const { error } = await supabase
    .from("saved_products")
    .insert({ user_id: user.id, product_barcode: barcode });

  if (error && error.code !== "23505") { // 23505 is unique violation
    throw new Error(error.message);
  }

  revalidatePath("/profile");
}

export async function unsaveProductAction(barcode: string) {
  const supabase = await getSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    throw new Error("Must be signed in to unsave products");
  }

  const { error } = await supabase
    .from("saved_products")
    .delete()
    .eq("user_id", user.id)
    .eq("product_barcode", barcode);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/profile");
}
