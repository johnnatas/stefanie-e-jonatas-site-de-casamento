import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getEnv } from "@/infrastructure/config/env";

let cachedClient: SupabaseClient | undefined;

/**
 * Bypasses Row Level Security. Only ever used from repository implementations
 * invoked by Server Actions / Route Handlers — never exposed to the browser.
 */
export function getSupabaseServiceRoleClient(): SupabaseClient {
  if (cachedClient) {
    return cachedClient;
  }

  const env = getEnv();
  cachedClient = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cachedClient;
}
