export async function shareOrCopyLink(params: { title: string; url: string }): Promise<"shared" | "copied"> {
  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(params);
      return "shared";
    } catch {
      // user cancelled or share failed — fall through to clipboard copy
    }
  }
  await navigator.clipboard.writeText(params.url);
  return "copied";
}
