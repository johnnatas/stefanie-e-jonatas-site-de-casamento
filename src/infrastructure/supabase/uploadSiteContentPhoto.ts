import { randomUUID } from "crypto";
import { getSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRoleClient";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const ALLOWED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

export class InvalidPhotoUploadError extends Error {}

export async function uploadSiteContentPhoto(slug: string, field: string, file: File): Promise<string> {
  if (!ALLOWED_MIME_TYPES.includes(file.type)) {
    throw new InvalidPhotoUploadError(`Tipo de arquivo não suportado: ${file.type || "desconhecido"}.`);
  }

  if (file.size > MAX_PHOTO_BYTES) {
    throw new InvalidPhotoUploadError("A imagem deve ter no máximo 5 MB.");
  }

  const extension = file.type.split("/")[1] ?? "jpg";
  const path = `${slug}/${field}-${randomUUID()}.${extension}`;
  const client = getSupabaseServiceRoleClient();

  const { error } = await client.storage.from("site-content").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload photo: ${error.message}`);
  }

  const { data } = client.storage.from("site-content").getPublicUrl(path);
  return data.publicUrl;
}
