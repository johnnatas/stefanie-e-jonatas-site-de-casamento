"use server";

import { redirect } from "next/navigation";
import { createUpdateSiteContentUseCase } from "@/infrastructure/composition";
import { settingsContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateSettingsAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const weddingDate = formData.get("weddingDate");

  const parsed = settingsContentSchema.safeParse({
    weddingDateIso: typeof weddingDate === "string" && weddingDate ? `${weddingDate}:00-03:00` : undefined,
    weddingLocationLabel: formData.get("weddingLocationLabel"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("settings", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  redirect("/admin/conteudo");
}
