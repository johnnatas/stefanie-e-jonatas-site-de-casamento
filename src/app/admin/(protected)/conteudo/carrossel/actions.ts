"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { homeTopicsContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const TOPIC_KEYS = ["cerimonia", "presentes", "traje", "hospedagem", "nossaHistoria"] as const;

export async function updateHomeTopicsAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const content: Record<string, unknown> = {};

  for (const key of TOPIC_KEYS) {
    const currentUrl = (formData.get(`${key}CurrentUrl`) as string) || null;
    const photo = await resolvePhotoField("home-topics", key, formData, currentUrl, `${key}File`, `${key}Remove`);

    content[key] = {
      title: formData.get(`${key}Title`),
      description: formData.get(`${key}Description`),
      photo,
    };
  }

  const parsed = homeTopicsContentSchema.safeParse(content);

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("home-topics", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
