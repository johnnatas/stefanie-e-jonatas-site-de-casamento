"use server";

import { revalidatePath } from "next/cache";
import {
  createListGiftsUseCase,
  createRefreshGiftPaymentLinkUseCase,
  createGetAdminSecuritySettingsUseCase,
} from "@/infrastructure/composition";

export interface GenerateSingleLinkActionState {
  status: "idle" | "success" | "error";
  message?: string;
}

export async function generateSingleLinkAction(
  _prevState: GenerateSingleLinkActionState,
  formData: FormData
): Promise<GenerateSingleLinkActionState> {
  const giftId = (formData.get("giftId") as string) || "";
  if (!giftId) {
    return { status: "error", message: "Presente inválido." };
  }

  try {
    const gifts = await createListGiftsUseCase().execute();
    const gift = gifts.find((candidate) => candidate.id === giftId);
    if (!gift) {
      return { status: "error", message: "Presente não encontrado." };
    }

    const { activePaymentProvider } = await createGetAdminSecuritySettingsUseCase().execute();
    await createRefreshGiftPaymentLinkUseCase().execute(gift, activePaymentProvider);

    revalidatePath(`/admin/presentes/${giftId}`);
    revalidatePath("/admin/presentes");

    return { status: "success", message: "Link de pagamento gerado com sucesso." };
  } catch {
    return { status: "error", message: "Não foi possível gerar o link agora." };
  }
}
