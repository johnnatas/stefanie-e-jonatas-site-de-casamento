import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";
import { AdminShell } from "@/components/admin/AdminShell";

export default async function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createSupabaseServerAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return <AdminShell userEmail={user?.email ?? null}>{children}</AdminShell>;
}
