import { describe, expect, it, vi, beforeEach } from "vitest";
import { resolvePhotoField } from "@/infrastructure/supabase/resolvePhotoField";
import * as uploadModule from "@/infrastructure/supabase/uploadSiteContentPhoto";

describe("resolvePhotoField", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("uploads and returns a new URL when a file is provided", async () => {
    vi.spyOn(uploadModule, "uploadSiteContentPhoto").mockResolvedValue("https://example.com/new.jpg");
    const file = new File(["data"], "photo.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.set("photoFile", file);

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, "https://example.com/old.jpg", "photoFile", "photoRemove");

    expect(result).toBe("https://example.com/new.jpg");
  });

  it("returns null when the remove checkbox is checked and no file is provided", async () => {
    const formData = new FormData();
    formData.set("photoRemove", "on");

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, "https://example.com/old.jpg", "photoFile", "photoRemove");

    expect(result).toBeNull();
  });

  it("keeps the current URL when no file is provided and remove isn't checked", async () => {
    const formData = new FormData();

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, "https://example.com/old.jpg", "photoFile", "photoRemove");

    expect(result).toBe("https://example.com/old.jpg");
  });

  it("returns null when there was no current URL and nothing is provided", async () => {
    const formData = new FormData();

    const result = await resolvePhotoField("tips-cerimonia", "photo", formData, null, "photoFile", "photoRemove");

    expect(result).toBeNull();
  });
});
