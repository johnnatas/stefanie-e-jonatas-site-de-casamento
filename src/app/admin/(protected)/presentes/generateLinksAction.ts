"use server";

import { revalidatePath } from "next/cache";
import {
  createGenerateMissingPaymentLinksUseCase,
  createGetAdminSecuritySettingsUseCase,
} from "@/infrastructure/composition";

export interface GenerateMissingPaymentLinksActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function generateMissingPaymentLinksAction(
  _prevState: GenerateMissingPaymentLinksActionState,
  _formData: FormData
): Promise<GenerateMissingPaymentLinksActionState> {
  try {
    const { activePaymentProvider } = await createGetAdminSecuritySettingsUseCase().execute();
    const result = await createGenerateMissingPaymentLinksUseCase().execute(activePaymentProvider);

    revalidatePath("/admin/presentes");
    revalidatePath("/admin/presentes/[id]", "page");

    if (result.generated === 0 && result.failed.length === 0) {
      return { status: "success", message: "Todos os presentes já tinham link — nada a gerar." };
    }

    const failedSuffix =
      result.failed.length > 0 ? ` Falharam: ${result.failed.map((item) => item.giftName).join(", ")}.` : "";
    return {
      status: "success",
      message: `${result.generated} link(s) gerado(s), ${result.failed.length} falharam.${failedSuffix}`,
    };
  } catch {
    return { status: "error", message: "Não foi possível gerar os links agora." };
  }
}
