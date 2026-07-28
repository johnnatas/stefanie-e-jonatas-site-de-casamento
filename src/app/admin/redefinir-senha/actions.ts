"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";

const resetSchema = z.object({
  password: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export interface ResetPasswordActionState {
  status: "idle" | "error";
  message?: string;
}

export async function resetPasswordAction(
  _prevState: ResetPasswordActionState,
  formData: FormData
): Promise<ResetPasswordActionState> {
  const password = (formData.get("password") as string) || "";
  const confirmPassword = (formData.get("confirmPassword") as string) || "";

  if (password !== confirmPassword) {
    return { status: "error", message: "As senhas não coincidem." };
  }

  const parsed = resetSchema.safeParse({ password });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Senha inválida." };
  }

  const supabase = await createSupabaseServerAuthClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return { status: "error", message: "Não foi possível redefinir sua senha agora. Peça um novo link." };
  }

  redirect("/admin/dashboard");
}
