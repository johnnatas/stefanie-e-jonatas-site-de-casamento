import { z } from "zod";

export const rsvpFormSchema = z.object({
  fullName: z.string().min(3, "Informe seu nome completo."),
  email: z.string().email("Informe um e-mail válido."),
  phone: z.string().min(8, "Informe um telefone válido."),
  companionsCount: z.coerce
    .number()
    .int("Deve ser um número inteiro.")
    .min(0, "Não pode ser negativo.")
    .max(10, "Máximo de 10 acompanhantes."),
  message: z.string().optional(),
  attendanceConfirmed: z.enum(["yes", "no"], {
    error: "Selecione se você vai comparecer.",
  }),
});

export type RsvpFormValues = z.output<typeof rsvpFormSchema>;
export type RsvpFormInput = z.input<typeof rsvpFormSchema>;
