"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolveMediaField, type MediaKind } from "@/infrastructure/composition";
import { homeGalleryContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MAX_ITEMS = 20;

function isMediaKind(value: unknown): value is MediaKind {
  return value === "photo" || value === "video";
}

export async function updateHomeGalleryAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const items: { url: string; type: MediaKind }[] = [];

  for (let index = 0; index < MAX_ITEMS; index++) {
    const field = `item${index}`;
    if (!formData.has(`${field}CurrentUrl`)) continue;

    const currentUrl = (formData.get(`${field}CurrentUrl`) as string) || null;
    const rawType = formData.get(`${field}Type`);
    const type: MediaKind = isMediaKind(rawType) ? rawType : "photo";

    const url = await resolveMediaField(
      "home-gallery",
      field,
      type,
      formData,
      currentUrl,
      `${field}File`,
      `${field}Remove`
    );

    if (url) {
      items.push({ url, type });
    }
  }

  const parsed = homeGalleryContentSchema.safeParse({ items });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os itens do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("home-gallery", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/");
  revalidatePath("/nossa-historia");
  redirect("/admin/conteudo");
}
