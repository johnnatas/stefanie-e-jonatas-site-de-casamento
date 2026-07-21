import { randomUUID } from "crypto";
import { getSupabaseServiceRoleClient } from "@/infrastructure/supabase/serviceRoleClient";

const MAX_PHOTO_BYTES = 15 * 1024 * 1024;
const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
const ALLOWED_IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];
const ALLOWED_VIDEO_MIME_TYPES = ["video/mp4", "video/webm", "video/quicktime"];

export class InvalidPhotoUploadError extends Error {}

async function uploadSiteContentFile(
  slug: string,
  field: string,
  file: File,
  allowedMimeTypes: string[],
  maxBytes: number,
  errorNoun: string
): Promise<string> {
  if (!allowedMimeTypes.includes(file.type)) {
    throw new InvalidPhotoUploadError(`Tipo de arquivo não suportado: ${file.type || "desconhecido"}.`);
  }

  if (file.size > maxBytes) {
    throw new InvalidPhotoUploadError(`${errorNoun} deve ter no máximo ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
  }

  const extension = file.type.split("/")[1] ?? "jpg";
  const path = `${slug}/${field}-${randomUUID()}.${extension}`;
  const client = getSupabaseServiceRoleClient();

  const { error } = await client.storage.from("site-content").upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }

  const { data } = client.storage.from("site-content").getPublicUrl(path);
  return data.publicUrl;
}

export async function uploadSiteContentPhoto(slug: string, field: string, file: File): Promise<string> {
  return uploadSiteContentFile(slug, field, file, ALLOWED_IMAGE_MIME_TYPES, MAX_PHOTO_BYTES, "A imagem");
}

export async function uploadSiteContentVideo(slug: string, field: string, file: File): Promise<string> {
  return uploadSiteContentFile(slug, field, file, ALLOWED_VIDEO_MIME_TYPES, MAX_VIDEO_BYTES, "O vídeo");
}
