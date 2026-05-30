import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

/**
 * Creates a Supabase client using the SERVICE_ROLE_KEY.
 * This completely BYPASSES Row Level Security (RLS).
 * NEVER import or use this client in the browser/client components.
 * Use only for trusted server-side operations (like cache writing).
 */
export function getSupabaseAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase admin credentials');
  }

  return createClient<Database>(url, key, {
    auth: {
      persistSession: false,
    },
  });
}
