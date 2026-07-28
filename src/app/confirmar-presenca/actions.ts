"use server";

import { createConfirmRsvpUseCase } from "@/infrastructure/composition";
import { DomainError } from "@/domain/errors/DomainError";

export interface ConfirmRsvpActionInput {
  guestId: string;
  attendanceStatus: "confirmed" | "declined";
  companionsCount?: number;
  companionGuestIds?: string[];
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
    await createConfirmRsvpUseCase().execute(input);

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
