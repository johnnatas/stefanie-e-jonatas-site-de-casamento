"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createUpdateSiteContentUseCase } from "@/infrastructure/composition";
import { tipsHospedagemContentSchema } from "@/application/content/schemas";
import type { SiteContentActionState } from "@/application/content/actionState";

const MAX_DISTANCES = 15;
const MAX_HOTELS = 15;
const MAX_AIRPORTS = 6;

export async function updateTipsHospedagemAction(
  _prevState: SiteContentActionState,
  formData: FormData
): Promise<SiteContentActionState> {
  const distances: { label: string; km: string }[] = [];
  for (let index = 0; index < MAX_DISTANCES; index++) {
    const field = `dist${index}`;
    if (!formData.has(`${field}Marker`)) continue;
    distances.push({
      label: (formData.get(`${field}Label`) as string) ?? "",
      km: (formData.get(`${field}Km`) as string) ?? "",
    });
  }

  const hotels: { name: string; distanceLabel: string | null; url: string | null }[] = [];
  for (let index = 0; index < MAX_HOTELS; index++) {
    const field = `hotel${index}`;
    if (!formData.has(`${field}Marker`)) continue;
    hotels.push({
      name: (formData.get(`${field}Name`) as string) ?? "",
      distanceLabel: (formData.get(`${field}DistanceLabel`) as string) || null,
      url: (formData.get(`${field}Url`) as string) || null,
    });
  }

  const airports: { name: string; distanceLabel: string | null; driveTimeLabel: string | null }[] = [];
  for (let index = 0; index < MAX_AIRPORTS; index++) {
    const field = `airport${index}`;
    if (!formData.has(`${field}Marker`)) continue;
    airports.push({
      name: (formData.get(`${field}Name`) as string) ?? "",
      distanceLabel: (formData.get(`${field}DistanceLabel`) as string) || null,
      driveTimeLabel: (formData.get(`${field}DriveTimeLabel`) as string) || null,
    });
  }

  const parsed = tipsHospedagemContentSchema.safeParse({
    title: formData.get("title"),
    mapAddress: formData.get("mapAddress") || null,
    distances,
    hotels,
    airports,
    disclaimer: formData.get("disclaimer"),
  });

  if (!parsed.success) {
    return { status: "error", message: "Verifique os campos do formulário." };
  }

  try {
    await createUpdateSiteContentUseCase().execute("tips-hospedagem", parsed.data);
  } catch {
    return { status: "error", message: "Não foi possível salvar agora." };
  }

  revalidatePath("/dicas-e-instrucoes");
  redirect("/admin/conteudo");
}
