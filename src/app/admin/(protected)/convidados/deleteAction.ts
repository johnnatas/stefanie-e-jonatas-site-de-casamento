"use server";

import { revalidatePath } from "next/cache";
import { createDeleteGuestUseCase } from "@/infrastructure/composition";

export interface DeleteGuestResult {
  status: "ok" | "error";
  message?: string;
}

export async function deleteGuestAction(guestId: string): Promise<DeleteGuestResult> {
  try {
    await createDeleteGuestUseCase().execute(guestId);
  } catch {
    return { status: "error", message: "Não foi possível excluir o convidado agora." };
  }

  revalidatePath("/admin/convidados");
  return { status: "ok" };
}
