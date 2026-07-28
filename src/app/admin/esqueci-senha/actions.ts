"use server";

import { z } from "zod";
import { createSupabaseServerAuthClient } from "@/infrastructure/supabase/serverAuthClient";
import { getEnv } from "@/infrastructure/config/env";

const requestSchema = z.object({
  email: z.string().email("Informe um e-mail válido."),
});

export interface ForgotPasswordActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

const GENERIC_SUCCESS_MESSAGE =
  "Se esse e-mail tiver uma conta administrativa, enviamos um link de redefinição de senha para ele.";

export async function requestPasswordResetAction(
  _prevState: ForgotPasswordActionState,
  formData: FormData
): Promise<ForgotPasswordActionState> {
  const parsed = requestSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return { status: "error", message: "Informe um e-mail válido." };
  }

  const supabase = await createSupabaseServerAuthClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${getEnv().NEXT_PUBLIC_SITE_URL}/admin/redefinir-senha`,
  });

  // Always report success regardless of whether the email matches an
  // account, so this form can't be used to enumerate admin accounts.
  return { status: "success", message: GENERIC_SUCCESS_MESSAGE };
}
