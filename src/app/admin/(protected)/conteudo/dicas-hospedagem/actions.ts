"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { tipsHospedagemContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateTipsHospedagemAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("photoCurrentUrl") as string) || null;
  const photo = await resolvePhotoField(
    "tips-hospedagem",
    "photo",
    formData,
    currentUrl,
    "photoFile",
    "photoRemove"
  );

  const parsed = tipsHospedagemContentSchema.safeParse({
    eyebrow: formData.get("eyebrow") || null,
    title: formData.get("title"),
    body: formData.get("body"),
    photo,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-hospedagem", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
