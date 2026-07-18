import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getEnv } from "@/infrastructure/config/env";

/**
 * Cookie-bound Supabase client used only for admin authentication
 * (login/logout/session checks) in Server Components and Server Actions.
 */
export async function createSupabaseServerAuthClient() {
  const env = getEnv();
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component render; middleware refreshes the session instead.
        }
      },
    },
  });
}
