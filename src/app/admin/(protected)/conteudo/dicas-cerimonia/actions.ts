"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase, resolvePhotoField } from "@/infrastructure/composition";
import { tipsCerimoniaContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MAX_ROUTES = 10;

export async function updateTipsCerimoniaAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const currentUrl = (formData.get("photoCurrentUrl") as string) || null;
  const photo = await resolvePhotoField("tips-cerimonia", "photo", formData, currentUrl, "photoFile", "photoRemove");

  const routes: { originLabel: string; instructions: string; mapUrl: string | null }[] = [];
  for (let index = 0; index < MAX_ROUTES; index++) {
    const field = `route${index}`;
    if (!formData.has(`${field}Marker`)) continue;

    routes.push({
      originLabel: (formData.get(`${field}OriginLabel`) as string) ?? "",
      instructions: (formData.get(`${field}Instructions`) as string) ?? "",
      mapUrl: (formData.get(`${field}MapUrl`) as string) || null,
    });
  }

  const parsed = tipsCerimoniaContentSchema.safeParse({
    title: formData.get("title"),
    photo,
    eventDateLabel: formData.get("eventDateLabel") || null,
    eventTimeLabel: formData.get("eventTimeLabel") || null,
    eventVenueLabel: formData.get("eventVenueLabel") || null,
    eventAddress: formData.get("eventAddress") || null,
    routes,
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-cerimonia", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/dicas-e-instrucoes");
  redirect("/admin/conteudo");
}
