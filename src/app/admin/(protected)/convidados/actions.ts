"use server";

import { redirect } from "next/navigation";
import { createCreateGuestUseCase, createUpdateGuestUseCase } from "@/infrastructure/composition";
import { guestFormSchema } from "@/components/admin/guestFormSchema";

export interface UpsertGuestActionState {
  status: "idle" | "error";
  message?: string;
}

export async function upsertGuestAction(
  _prevState: UpsertGuestActionState,
  formData: FormData
): Promise<UpsertGuestActionState> {
  const parsed = guestFormSchema.safeParse({
    id: formData.get("id") || undefined,
    fullName: formData.get("fullName"),
    nickname: formData.get("nickname") || undefined,
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
    companionsCount: formData.get("companionsCount") || 0,
    attendanceStatus: formData.get("attendanceStatus") || "pending",
    message: formData.get("message") || undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    if (parsed.data.id) {
      await createUpdateGuestUseCase().execute({ ...parsed.data, id: parsed.data.id });
    } else {
      await createCreateGuestUseCase().execute(parsed.data);
    }
  } catch {
    return { status: "error", message: "Não foi possível salvar o convidado agora." };
  }

  redirect("/admin/convidados");
}
