"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";

export async function logoutAction(): Promise<void> {
  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.signOut();
  redirect("/admin/login");
}
