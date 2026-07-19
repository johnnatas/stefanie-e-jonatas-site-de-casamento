"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { tipsTrajeContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateTipsTrajeAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("photoCurrentUrl") as string) || null;
  const photo = await resolvePhotoField("tips-traje", "photo", formData, currentUrl, "photoFile", "photoRemove");

  const parsed = tipsTrajeContentSchema.safeParse({
    eyebrow: formData.get("eyebrow") || null,
    title: formData.get("title"),
    body: formData.get("body"),
    photo,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-traje", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
