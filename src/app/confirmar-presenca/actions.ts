"use server";

import { createConfirmRsvpUseCase } from "@/infrastructure/composition";
import { DomainError } from "@/domain/errors/DomainError";
import { rsvpFormSchema, RsvpFormValues } from "@/components/rsvp/rsvpFormSchema";

export interface ConfirmRsvpActionResult {
  success: boolean;
  message: string;
}

export async function confirmRsvpAction(values: RsvpFormValues): Promise<ConfirmRsvpActionResult> {
  const parsed = rsvpFormSchema.safeParse(values);

  if (!parsed.success) {
    return { success: false, message: "Verifique os campos destacados no formulário." };
  }

  try {
    await createConfirmRsvpUseCase().execute({
      fullName: parsed.data.fullName,
      email: parsed.data.email,
      phone: parsed.data.phone,
      companionsCount: parsed.data.companionsCount,
      message: parsed.data.message,
      attendanceConfirmed: parsed.data.attendanceConfirmed === "yes",
    });

    return {
      success: true,
      message: "Presença confirmada com sucesso! Mal podemos esperar para celebrar com você.",
    };
  } catch (error) {
    if (error instanceof DomainError) {
      return { success: false, message: error.message };
    }

    return {
      success: false,
      message:
        "Não foi possível confirmar sua presença agora. Tente novamente em instantes.",
    };
  }
}
