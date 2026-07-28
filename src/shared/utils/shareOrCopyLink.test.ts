import { afterEach, describe, expect, it, vi } from "vitest";
import { shareOrCopyLink } from "@/shared/utils/shareOrCopyLink";

describe("shareOrCopyLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses navigator.share when available and returns 'shared'", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText: vi.fn() } });

    const result = await shareOrCopyLink({ title: "Air fryer", url: "https://example.com/presentes" });

    expect(share).toHaveBeenCalledWith({ title: "Air fryer", url: "https://example.com/presentes" });
    expect(result).toBe("shared");
  });

  it("falls back to clipboard when navigator.share is not available", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { clipboard: { writeText } });

    const result = await shareOrCopyLink({ title: "Air fryer", url: "https://example.com/presentes" });

    expect(writeText).toHaveBeenCalledWith("https://example.com/presentes");
    expect(result).toBe("copied");
  });

  it("falls back to clipboard when navigator.share throws (e.g. user cancelled)", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelled", "AbortError"));
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal("navigator", { share, clipboard: { writeText } });

    const result = await shareOrCopyLink({ title: "Air fryer", url: "https://example.com/presentes" });

    expect(writeText).toHaveBeenCalledWith("https://example.com/presentes");
    expect(result).toBe("copied");
  });
});
