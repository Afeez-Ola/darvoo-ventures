import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Public values (safe to ship to the browser). Env vars override them.
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://hgnfqpxkvnbieqrbynzf.supabase.co";
export const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "sb_publishable_Yiw3HjyirSlh4KRRBaciiw_AQYYx4ud";

let browserClient: SupabaseClient | null = null;

/** One shared client in the browser (keeps the kitchen login session). */
export function supabaseBrowser() {
  if (!browserClient) browserClient = createClient(SUPABASE_URL, SUPABASE_KEY);
  return browserClient;
}

/** Stateless client for server components (public data only). */
export function supabaseServer() {
  return createClient(SUPABASE_URL, SUPABASE_KEY, { auth: { persistSession: false } });
}
