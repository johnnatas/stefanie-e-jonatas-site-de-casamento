"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { identidadeVisualContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

export async function updateIdentidadeVisualAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentLogoDarkUrl = (formData.get("logoDarkCurrentUrl") as string) || null;
  const logoDark = await resolvePhotoField(
    "identidade-visual",
    "logoDark",
    formData,
    currentLogoDarkUrl,
    "logoDarkFile",
    "logoDarkRemove"
  );

  const currentLogoLightUrl = (formData.get("logoLightCurrentUrl") as string) || null;
  const logoLight = await resolvePhotoField(
    "identidade-visual",
    "logoLight",
    formData,
    currentLogoLightUrl,
    "logoLightFile",
    "logoLightRemove"
  );

  const parsed = identidadeVisualContentSchema.safeParse({ logoDark, logoLight });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("identidade-visual", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/");
  revalidatePath("/admin/conteudo/identidade-visual");
  redirect("/admin/conteudo");
}
