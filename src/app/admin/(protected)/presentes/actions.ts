"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createUpsertGiftUseCase,
  createRefreshGiftPaymentLinkUseCase,
  createVerifyPriceChangeSecretUseCase,
  createListGiftsUseCase,
  resolvePhotoField,
} from "@/infrastructure/composition";
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

  if (parsed.data.id) {
    const existingGifts = await createListGiftsUseCase().execute();
    const existingGift = existingGifts.find((gift) => gift.id === parsed.data.id);

    if (existingGift && existingGift.price !== parsed.data.price) {
      const secretKey = (formData.get("secretKey") as string) || "";
      const isValid = await createVerifyPriceChangeSecretUseCase().execute(secretKey);
      if (!isValid) {
        return { status: "error", message: "Chave secreta inválida ou não informada." };
      }
    }
  }

  let upsertResult;
  try {
    upsertResult = await createUpsertGiftUseCase().execute(parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar o presente agora." };
  }

  if (upsertResult.nameOrPriceChanged) {
    try {
      await createRefreshGiftPaymentLinkUseCase().execute(upsertResult.gift);
    } catch {
      return {
        status: "error",
        message:
          "Presente salvo, mas não foi possível gerar o link de pagamento agora. Edite e salve novamente para tentar de novo.",
      };
    }
  }

  revalidatePath("/presentes");
  revalidatePath("/admin/presentes");
  revalidatePath("/admin/presentes/novo");
  redirect("/admin/presentes");
}
