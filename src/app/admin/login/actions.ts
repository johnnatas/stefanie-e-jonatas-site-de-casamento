"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";

const loginSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export interface LoginActionState {
  status: "idle" | "error";
  message?: string;
}

export async function loginAction(
  _prevState: LoginActionState,
  formData: FormData
): Promise<LoginActionState> {
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique o e-mail e a senha informados." };
  }

  const supabase = await createSupabaseServerAuthClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error || !data.user) {
    return { status: "error", message: "E-mail ou senha inválidos." };
  }

  const { data: adminRow } = await supabase
    .from("admin_users")
    .select("id")
    .eq("id", data.user.id)
    .maybeSingle();

  if (!adminRow) {
    await supabase.auth.signOut();
    return { status: "error", message: "Este usuário não tem acesso ao painel administrativo." };
  }

  redirect("/admin/dashboard");
}
