import { z } from "zod";

export const guestFormSchema = z.object({
  fullName: z.string().min(3, "Informe o nome completo."),
  nickname: z.string().optional(),
});

export type GuestFormValues = z.output<typeof guestFormSchema>;
export type GuestFormInput = z.input<typeof guestFormSchema>;
