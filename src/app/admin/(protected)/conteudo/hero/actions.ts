"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { homeHeroContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MAX_PHOTOS = 5;

export async function updateHomeHeroAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const photos: string[] = [];

  for (let index = 0; index < MAX_PHOTOS; index++) {
    const currentUrl = (formData.get(`photo${index}CurrentUrl`) as string) || null;
    const resolved = await resolvePhotoField(
      "home-hero",
      `photo${index}`,
      formData,
      currentUrl,
      `photo${index}File`,
      `photo${index}Remove`
    );
    if (resolved) {
      photos.push(resolved);
    }
  }

  const parsed = homeHeroContentSchema.safeParse({
    eyebrow: formData.get("eyebrow"),
    tagline: formData.get("tagline"),
    photos,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  if (parsed.data.photos.length === 0) {
    return { status: "error", message: "Adicione pelo menos uma foto." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("home-hero", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/");
  redirect("/admin/conteudo");
}
