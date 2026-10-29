"use server";

import { revalidatePath } from "next/cache";
import { createSyncInfinitePayPaymentsUseCase } from "@/infrastructure/composition";

export interface SyncInfinitePayPaymentsActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function syncInfinitePayPaymentsAction(
  _prevState: SyncInfinitePayPaymentsActionState,
  _formData: FormData
): Promise<SyncInfinitePayPaymentsActionState> {
  try {
    const result = await createSyncInfinitePayPaymentsUseCase().execute();

    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");

    const failureSuffix = result.errors.length > 0 ? ` ${result.errors.length} falharam.` : "";
    return {
      status: "success",
      message: `${result.checked} verificado(s), ${result.updated} atualizado(s).${failureSuffix}`,
    };
  } catch {
    return { status: "error", message: "Não foi possível atualizar os status agora." };
  }
}
