"use server";

import { uploadSiteContentPhoto } from "@/infrastructure/composition";
import { extractProductMetadata } from "@/shared/utils/extractProductMetadata";
import { isBlockedHost } from "@/shared/utils/isBlockedHost";

const FETCH_TIMEOUT_MS = 8000;
const GENERIC_ERROR_MESSAGE = "Não foi possível buscar dados desse link.";

export interface GiftLinkAutofillResult {
  status: "success" | "error";
  title?: string;
  price?: number;
  imageUrl?: string;
  message?: string;
}

export async function fetchGiftLinkMetadataAction(productUrl: string): Promise<GiftLinkAutofillResult> {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(productUrl);
  } catch {
    return { status: "error", message: "Link inválido." };
  }

  if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
    return { status: "error", message: "Link inválido." };
  }

  if (isBlockedHost(parsedUrl.hostname)) {
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  let html: string;
  try {
    const response = await fetch(parsedUrl.toString(), {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StefanieJonatasSite/1.0)" },
    });
    if (!response.ok) {
      return { status: "error", message: GENERIC_ERROR_MESSAGE };
    }
    html = await response.text();
  } catch {
    return { status: "error", message: GENERIC_ERROR_MESSAGE };
  }

  const metadata = extractProductMetadata(html);

  if (!metadata.title && !metadata.imageUrl && !metadata.price) {
    return { status: "error", message: "Não foi possível encontrar dados nesse link." };
  }

  let uploadedImageUrl: string | undefined;
  if (metadata.imageUrl) {
    try {
      const imageResponse = await fetch(metadata.imageUrl, {
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (imageResponse.ok) {
        const blob = await imageResponse.blob();
        const contentType = imageResponse.headers.get("content-type") ?? "image/jpeg";
        const extension = contentType.split("/")[1] ?? "jpg";
        const file = new File([blob], `link-import.${extension}`, { type: contentType });
        uploadedImageUrl = await uploadSiteContentPhoto("gifts", "link-import", file);
      }
    } catch {
      // Image download/upload failed — keep whatever title/price were found.
    }
  }

  return {
    status: "success",
    title: metadata.title,
    price: metadata.price,
    imageUrl: uploadedImageUrl,
  };
}
