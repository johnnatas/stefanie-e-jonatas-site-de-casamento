export interface ExtractedProductMetadata {
  title?: string;
  imageUrl?: string;
  price?: number;
}

function extractMetaContent(html: string, property: string): string | undefined {
  const propertyFirst = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "i");
  const contentFirst = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "i");
  const match = html.match(propertyFirst) ?? html.match(contentFirst);
  return match ? match[1].trim() || undefined : undefined;
}

function extractTitleTag(html: string): string | undefined {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() || undefined : undefined;
}

function extractJsonLdPrice(html: string): number | undefined {
  const scriptMatches = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);

  for (const scriptMatch of scriptMatches) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(scriptMatch[1]);
    } catch {
      continue;
    }

    const candidates = Array.isArray(parsed) ? parsed : [parsed];

    for (const candidate of candidates) {
      if (typeof candidate !== "object" || candidate === null) continue;
      const record = candidate as Record<string, unknown>;
      const types = Array.isArray(record["@type"]) ? record["@type"] : [record["@type"]];
      if (!types.includes("Product")) continue;

      const offers = Array.isArray(record.offers) ? record.offers[0] : record.offers;
      const price = (offers as Record<string, unknown> | undefined)?.price;
      const numericPrice = typeof price === "string" ? Number(price) : price;

      if (typeof numericPrice === "number" && Number.isFinite(numericPrice) && numericPrice > 0) {
        return numericPrice;
      }
    }
  }

  return undefined;
}

export function extractProductMetadata(html: string): ExtractedProductMetadata {
  return {
    title: extractMetaContent(html, "og:title") ?? extractTitleTag(html),
    imageUrl: extractMetaContent(html, "og:image"),
    price: extractJsonLdPrice(html),
  };
}
