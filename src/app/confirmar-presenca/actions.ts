"use server";

import { createConfirmRsvpUseCase, createSendRsvpConfirmationUseCase } from "@/infrastructure/composition";
import { DomainError } from "@/domain/errors/DomainError";

export interface ConfirmRsvpActionInput {
  guestId: string;
  attendanceStatus: "confirmed" | "declined";
  companionsCount?: number;
  companionGuestIds?: string[];
  email?: string;
  message?: string;
}

export interface ConfirmRsvpActionResult {
  success: boolean;
  message: string;
}

export async function confirmRsvpAction(
  input: ConfirmRsvpActionInput
): Promise<ConfirmRsvpActionResult> {
  try {
    const guest = await createConfirmRsvpUseCase().execute(input);

    if (input.attendanceStatus === "confirmed" && input.email) {
      try {
        await createSendRsvpConfirmationUseCase().execute({
          guestId: guest.id!,
          guestName: guest.nickname ?? guest.fullName,
          guestEmail: input.email,
          companionGuestIds: input.companionGuestIds ?? [],
          message: input.message,
        });
      } catch (emailError) {
        console.error("Failed to send RSVP confirmation email", emailError);
      }
    }

    return {
      success: true,
      message:
        input.attendanceStatus === "confirmed"
          ? "Presença confirmada com sucesso! Mal podemos esperar para celebrar com você."
          : "Tudo bem, sentiremos sua falta! Obrigado por avisar.",
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message: "Não foi possível registrar sua resposta agora. Tente novamente em instantes.",
    };
  }
}
