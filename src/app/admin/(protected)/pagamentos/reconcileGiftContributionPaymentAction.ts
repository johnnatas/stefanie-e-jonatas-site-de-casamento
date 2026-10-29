"use server";

import { revalidatePath } from "next/cache";
import { createConfirmGiftPaymentUseCase } from "@/infrastructure/composition";

export interface ReconcileGiftContributionPaymentActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function reconcileGiftContributionPaymentAction(
  _prevState: ReconcileGiftContributionPaymentActionState,
  formData: FormData
): Promise<ReconcileGiftContributionPaymentActionState> {
  const contributionId = (formData.get("contributionId") as string) || "";
  const giftId = (formData.get("giftId") as string) || "";
  const transactionNsu = ((formData.get("transactionNsu") as string) || "").trim();

  if (!transactionNsu) {
    return { status: "error", message: "Informe o NSU da transação mostrado no painel da Infinite Pay." };
  }

  try {
    const result = await createConfirmGiftPaymentUseCase().execute({
      payment: {
        paymentReference: transactionNsu,
        status: "approved",
        giftId,
        contributionId,
      },
    });

    if (!result || result.status !== "approved") {
      return {
        status: "error",
        message: "Não foi possível aprovar — a contribuição já pode ter mudado de status.",
      };
    }

    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");

    return { status: "success", message: "Pagamento marcado como aprovado." };
  } catch {
    return { status: "error", message: "Não foi possível reconciliar este pagamento agora." };
  }
}
