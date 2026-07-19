import { describe, expect, it } from "vitest";
import { uploadSiteContentPhoto, InvalidPhotoUploadError } from "@/infrastructure/supabase/uploadSiteContentPhoto";

describe("uploadSiteContentPhoto", () => {
  it("rejects a file with an unsupported MIME type before touching Storage", async () => {
    const file = new File(["data"], "doc.pdf", { type: "application/pdf" });

    await expect(uploadSiteContentPhoto("tips-cerimonia", "photo", file)).rejects.toThrow(InvalidPhotoUploadError);
  });

  it("rejects a file over 15MB before touching Storage", async () => {
    const oversized = new File([new Uint8Array(15 * 1024 * 1024 + 1)], "big.jpg", { type: "image/jpeg" });

    await expect(uploadSiteContentPhoto("tips-cerimonia", "photo", oversized)).rejects.toThrow(InvalidPhotoUploadError);
  });
});
