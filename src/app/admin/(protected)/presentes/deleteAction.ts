"use server";

import { revalidatePath } from "next/cache";
import { createDeleteGiftUseCase } from "@/infrastructure/composition";
import { GiftHasContributionsError } from "@/domain/errors/DomainError";

export interface DeleteGiftResult {
  status: "ok" | "error";
  message?: string;
}

export async function deleteGiftAction(giftId: string): Promise<DeleteGiftResult> {
  try {
    await createDeleteGiftUseCase().execute(giftId);
  } catch (error) {
    if (error instanceof GiftHasContributionsError) {
      return { status: "error", message: error.message };
    }
    return { status: "error", message: "Não foi possível excluir o presente agora." };
  }

  revalidatePath("/presentes");
  revalidatePath("/admin/presentes");
  revalidatePath("/admin/presentes/novo");
  revalidatePath("/admin/dashboard");
  return { status: "ok" };
}
