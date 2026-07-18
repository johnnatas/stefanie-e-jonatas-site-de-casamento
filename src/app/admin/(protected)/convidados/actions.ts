"use server";

import { redirect } from "next/navigation";
import { createCreateGuestUseCase } from "@/infrastructure/composition";
import { guestFormSchema } from "@/components/admin/guestFormSchema";

export interface CreateGuestActionState {
  status: "idle" | "error";
  message?: string;
}

export const initialCreateGuestActionState: CreateGuestActionState = { status: "idle" };

export async function createGuestAction(
  _prevState: CreateGuestActionState,
  formData: FormData
): Promise<CreateGuestActionState> {
  const parsed = guestFormSchema.safeParse({
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createCreateGuestUseCase().execute(parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível cadastrar o convidado agora." };
  }

  redirect("/admin/convidados");
}
