export interface PinterestPin {
  pinUrl: string;
  imageUrl: string;
}

const IMAGE_SIZE_SEGMENT = /\/\d+x\//;
const DISPLAY_IMAGE_SIZE = "736x";

const LINK_PATTERN = /<link>([^<]+)<\/link>/;
const IMAGE_PATTERN = /&lt;img src=&quot;([^&]+)&quot;/;

function upscaleImageUrl(imageUrl: string): string {
  return imageUrl.replace(IMAGE_SIZE_SEGMENT, `/${DISPLAY_IMAGE_SIZE}/`);
}

function parseItems(rssXml: string): PinterestPin[] {
  const items = rssXml.split("<item>").slice(1);
  const pins: PinterestPin[] = [];

  for (const item of items) {
    const linkMatch = item.match(LINK_PATTERN);
    const imageMatch = item.match(IMAGE_PATTERN);
    if (!linkMatch || !imageMatch) continue;

    pins.push({
      pinUrl: linkMatch[1].trim(),
      imageUrl: upscaleImageUrl(imageMatch[1].trim()),
    });
  }

  return pins;
}

/**
 * Fetches a Pinterest board's public RSS feed (an official, stable Pinterest
 * mechanism — not scraping) and returns each pin's link and a larger-than-
 * thumbnail image URL, so admin-entered board links can drive a real image
 * grid instead of Pinterest's compact "embedBoard" widget. Never throws —
 * public pages must never break because Pinterest is unreachable, blocks
 * the request, or the board URL is invalid.
 */
export async function fetchPinterestBoardPins(boardUrl: string): Promise<PinterestPin[]> {
  const rssUrl = `${boardUrl.replace(/\/+$/, "")}.rss`;

  try {
    const response = await fetch(rssUrl, { next: { revalidate: 3600 } });
    if (!response.ok) return [];

    const xml = await response.text();
    return parseItems(xml);
  } catch {
    return [];
  }
}
