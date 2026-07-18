"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createGiftContributionUseCase } from "@/infrastructure/composition";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

const contributionSchema = z.object({
  giftId: z.string().min(1, "Presente inválido."),
  guestName: z.string().min(3, "Informe seu nome completo."),
  guestEmail: z.string().email("Informe um e-mail válido."),
});

export interface CreateGiftContributionActionState {
  status: "idle" | "error";
  message?: string;
}

export async function createGiftContributionAction(
  _prevState: CreateGiftContributionActionState,
  formData: FormData
): Promise<CreateGiftContributionActionState> {
  const parsed = contributionSchema.safeParse({
    giftId: formData.get("giftId"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Preencha seu nome e e-mail corretamente." };
  }

  let checkoutUrl: string;
  try {
    const result = await createGiftContributionUseCase().execute(parsed.data);
    checkoutUrl = result.checkoutUrl;
  } catch (error) {
    if (error instanceof GiftNotAvailableError) {
      return { status: "error", message: "Esse presente já foi escolhido por outra pessoa." };
    }
    if (error instanceof InvalidGiftDataError) {
      return { status: "error", message: "Presente não encontrado." };
    }
    return {
      status: "error",
      message: "Não foi possível iniciar o pagamento agora. Tente novamente em instantes.",
    };
  }

  redirect(checkoutUrl);
}
