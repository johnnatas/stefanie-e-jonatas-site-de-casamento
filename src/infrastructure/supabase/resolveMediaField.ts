import { uploadSiteContentPhoto, uploadSiteContentVideo } from "@/infrastructure/supabase/uploadSiteContentPhoto";

export type MediaKind = "photo" | "video";

export async function resolveMediaField(
  slug: string,
  field: string,
  kind: MediaKind,
  formData: FormData,
  currentUrl: string | null,
  fileFieldName: string,
  removeFieldName: string
): Promise<string | null> {
  const file = formData.get(fileFieldName);

  if (file instanceof File && file.size > 0) {
    return kind === "video" ? uploadSiteContentVideo(slug, field, file) : uploadSiteContentPhoto(slug, field, file);
  }

  if (formData.get(removeFieldName) === "on") {
    return null;
  }

  return currentUrl;
}
