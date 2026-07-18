import { z } from "zod";

export const giftFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(2, "Informe o nome do presente."),
  description: z.string().min(3, "Informe uma descrição."),
  imageUrl: z.string().min(1, "Informe a URL da imagem."),
  price: z.coerce.number().positive("O valor deve ser maior que zero."),
  category: z.string().min(2, "Informe uma categoria."),
});

export type GiftFormValues = z.output<typeof giftFormSchema>;
export type GiftFormInput = z.input<typeof giftFormSchema>;
