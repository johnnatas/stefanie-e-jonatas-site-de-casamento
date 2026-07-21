"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  createGiftContributionUseCase,
  createListGiftsUseCase,
  createSendReservationConfirmationUseCase,
  getSiteContentOrDefault,
} from "@/infrastructure/composition";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";
import {
  canReserveForLater,
  latestReservableDate,
  parseExpectedPaymentDateEndOfDay,
} from "@/shared/utils/giftReservationWindow";

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
    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");
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

const reserveForLaterSchema = z.object({
  giftId: z.string().min(1, "Presente inválido."),
  guestName: z.string().min(3, "Informe seu nome completo."),
  guestEmail: z.string().email("Informe um e-mail válido."),
  expectedPaymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Informe uma data válida."),
});

export interface ReserveGiftForLaterActionState {
  status: "idle" | "error" | "success";
  message?: string;
  checkoutUrl?: string;
  guestName?: string;
  expectedPaymentDate?: string;
}

export async function reserveGiftForLaterAction(
  _prevState: ReserveGiftForLaterActionState,
  formData: FormData
): Promise<ReserveGiftForLaterActionState> {
  const parsed = reserveForLaterSchema.safeParse({
    giftId: formData.get("giftId"),
    guestName: formData.get("guestName"),
    guestEmail: formData.get("guestEmail"),
    expectedPaymentDate: formData.get("expectedPaymentDate"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Preencha seu nome, e-mail e a data corretamente." };
  }

  const settings = await getSiteContentOrDefault("settings");
  const weddingDate = new Date(settings.weddingDateIso);
  const expectedPaymentDate = parseExpectedPaymentDateEndOfDay(parsed.data.expectedPaymentDate);

  if (expectedPaymentDate.getTime() < Date.now()) {
    return { status: "error", message: "A data prevista não pode estar no passado." };
  }

  if (
    !canReserveForLater(weddingDate) ||
    expectedPaymentDate.getTime() > latestReservableDate(weddingDate).getTime()
  ) {
    return {
      status: "error",
      message: "A data prevista deve ser de até 30 dias antes do casamento.",
    };
  }

  try {
    const result = await createGiftContributionUseCase().execute({
      giftId: parsed.data.giftId,
      guestName: parsed.data.guestName,
      guestEmail: parsed.data.guestEmail,
      expectedPaymentDate,
    });

    revalidatePath("/presentes");
    revalidatePath("/admin/presentes");
    revalidatePath("/admin/pagamentos");
    revalidatePath("/admin/dashboard");

    try {
      const gifts = await createListGiftsUseCase().execute();
      const gift = gifts.find((candidate) => candidate.id === parsed.data.giftId);
      if (gift) {
        await createSendReservationConfirmationUseCase().execute({
          contributionId: result.contribution.id!,
          guestName: parsed.data.guestName,
          guestEmail: parsed.data.guestEmail,
          giftName: gift.name,
          expectedPaymentDate,
          checkoutUrl: result.checkoutUrl,
        });
      }
    } catch (emailError) {
      console.error("Failed to send reservation confirmation email", emailError);
    }

    return {
      status: "success",
      checkoutUrl: result.checkoutUrl,
      guestName: parsed.data.guestName,
      expectedPaymentDate: parsed.data.expectedPaymentDate,
    };
  } catch (error) {
    if (error instanceof GiftNotAvailableError) {
      return { status: "error", message: "Esse presente já foi escolhido por outra pessoa." };
    }
    if (error instanceof InvalidGiftDataError) {
      return { status: "error", message: "Presente não encontrado." };
    }
    return {
      status: "error",
      message: "Não foi possível reservar o presente agora. Tente novamente em instantes.",
    };
  }
}
