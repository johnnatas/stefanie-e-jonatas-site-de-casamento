import { uploadSiteContentPhoto } from "@/infrastructure/supabase/uploadSiteContentPhoto";

export async function resolvePhotoField(
  slug: string,
  field: string,
  formData: FormData,
  currentUrl: string | null,
  fileFieldName: string,
  removeFieldName: string
): Promise<string | null> {
  const file = formData.get(fileFieldName);

  if (file instanceof File && file.size > 0) {
    return uploadSiteContentPhoto(slug, field, file);
  }

  if (formData.get(removeFieldName) === "on") {
    return null;
  }

  return currentUrl;
}
