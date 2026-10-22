import { createClient, SupabaseClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

let browserClient: SupabaseClient | null = null;

/** One shared client in the browser (keeps the kitchen login session). */
export function supabaseBrowser() {
  if (!browserClient) browserClient = createClient(url, key);
  return browserClient;
}

/** Stateless client for server components (public data only). */
export function supabaseServer() {
  return createClient(url, key, { auth: { persistSession: false } });
}
