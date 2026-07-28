"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { presentesContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updatePresentesAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("backgroundImageCurrentUrl") as string) || null;
  const backgroundImage = await resolvePhotoField(
    "presentes",
    "backgroundImage",
    formData,
    currentUrl,
    "backgroundImageFile",
    "backgroundImageRemove"
  );

  const parsed = presentesContentSchema.safeParse({ backgroundImage });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("presentes", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/presentes");
  revalidatePath("/admin/conteudo/presentes");
  redirect("/admin/conteudo");
}
