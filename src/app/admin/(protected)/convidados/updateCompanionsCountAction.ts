"use server";

import { revalidatePath } from "next/cache";
import { createUpdateGuestCompanionsCountUseCase } from "@/infrastructure/composition";

export interface UpdateCompanionsCountResult {
  status: "success" | "error";
  message?: string;
  companionsCount?: number;
}

export async function updateGuestCompanionsCountAction(
  guestId: string,
  companionsCount: number
): Promise<UpdateCompanionsCountResult> {
  try {
    const updated = await createUpdateGuestCompanionsCountUseCase().execute({ id: guestId, companionsCount });
    revalidatePath("/admin/convidados");
    revalidatePath("/admin/dashboard");
    return { status: "success", companionsCount: updated.companionsCount };
  } catch {
    return { status: "error", message: "Não foi possível salvar o número de acompanhantes agora." };
  }
}
