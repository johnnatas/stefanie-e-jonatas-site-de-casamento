import { z } from "zod";

export const guestFormSchema = z.object({
  id: z.string().optional(),
  fullName: z.string().min(3, "Informe o nome completo."),
  nickname: z.string().optional(),
  email: z.string().email("E-mail inválido.").optional().or(z.literal("")),
  phone: z.string().min(8, "Telefone inválido.").optional().or(z.literal("")),
  companionsCount: z.coerce.number().int().min(0).default(0),
  attendanceStatus: z.enum(["pending", "confirmed", "declined"]).default("pending"),
  message: z.string().optional(),
});

export type GuestFormValues = z.output<typeof guestFormSchema>;
export type GuestFormInput = z.input<typeof guestFormSchema>;
