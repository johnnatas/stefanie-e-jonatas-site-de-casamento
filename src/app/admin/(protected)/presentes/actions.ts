"use server";

import { redirect } from "next/navigation";
import { createUpsertGiftUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { giftFormSchema } from "@/components/admin/giftFormSchema";

export interface UpsertGiftActionState {
  status: "idle" | "error";
  message?: string;
}

export async function upsertGiftAction(
  _prevState: UpsertGiftActionState,
  formData: FormData
): Promise<UpsertGiftActionState> {
  const currentImageUrl = (formData.get("imageCurrentUrl") as string) || null;
  const imageUrl = await resolvePhotoField("gifts", "image", formData, currentImageUrl, "imageFile", "imageRemove");

  if (!imageUrl) {
    return { status: "error", message: "Selecione uma foto para o presente." };
  }

  const parsed = giftFormSchema.safeParse({
    id: formData.get("id") || undefined,
    name: formData.get("name"),
    description: formData.get("description"),
    imageUrl,
    price: formData.get("price"),
    category: formData.get("category"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpsertGiftUseCase().execute(parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar o presente agora." };
  }

  redirect("/admin/presentes");
}
