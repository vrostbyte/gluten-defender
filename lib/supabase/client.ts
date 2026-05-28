/**
 * Supabase client (browser side).
 *
 * This is the ONE place we create a connection to Supabase. Import the helper
 * below anywhere you need to read/write data or talk to Supabase Auth.
 *
 * SECURITY: the URL and key are read ONLY from environment variables — they are
 * never hard-coded. The `NEXT_PUBLIC_` prefix tells Next.js it is safe to expose
 * these two values to the browser. (The anon key is meant to be public; it is
 * NOT a secret. Real protection comes from Supabase Row Level Security policies.)
 *
 * We create the client lazily (the first time it is actually used) and reuse that
 * single instance. Doing it lazily means importing this file never crashes the
 * build if the env vars are not set yet — you only get a clear error the moment
 * you try to use Supabase without configuring it.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  // Return the already-created client if we have one (a single shared instance).
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail loudly and clearly if the project has not been configured yet.
  if (!url || !anonKey) {
    throw new Error(
      "Supabase is not configured. Copy .env.example to .env.local and set " +
        "NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY. " +
        "See the README for where to find these values.",
    );
  }

  client = createClient(url, anonKey);
  return client;
}
