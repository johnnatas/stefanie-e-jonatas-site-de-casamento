"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase } from "@/infrastructure/composition";
import { tipsTrajeContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateTipsTrajeAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const parsed = tipsTrajeContentSchema.safeParse({
    title: formData.get("title"),
    dressCodeName: formData.get("dressCodeName"),
    body: formData.get("body"),
    pinterestHimUrl: formData.get("pinterestHimUrl") || null,
    pinterestHerUrl: formData.get("pinterestHerUrl") || null,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-traje", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/dicas-e-instrucoes");
  redirect("/admin/conteudo");
}
