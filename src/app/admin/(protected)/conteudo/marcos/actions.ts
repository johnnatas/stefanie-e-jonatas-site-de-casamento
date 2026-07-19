"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { homeMilestonePhotosContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MILESTONE_KEYS = ["beginning", "proposal", "wedding"] as const;

export async function updateHomeMilestonePhotosAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const content: Record<string, string | null> = {};

  for (const key of MILESTONE_KEYS) {
    const currentUrl = (formData.get(`${key}CurrentUrl`) as string) || null;
    content[key] = await resolvePhotoField(
      "home-milestone-photos",
      key,
      formData,
      currentUrl,
      `${key}File`,
      `${key}Remove`
    );
  }

  const parsed = homeMilestonePhotosContentSchema.safeParse(content);

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("home-milestone-photos", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
