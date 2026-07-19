import { describe, expect, it, vi, afterEach } from "vitest";
import { compressImage, BALANCED_COMPRESSION } from "@/shared/utils/compressImage";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 800;
  height = 600;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("compressImage", () => {
  it("returns the original file unchanged for GIFs", async () => {
    const file = new File(["gif-data"], "anim.gif", { type: "image/gif" });

    const result = await compressImage(file, BALANCED_COMPRESSION);

    expect(result).toBe(file);
  });

  it("returns a new compressed JPEG file when compression shrinks the image", async () => {
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const smallerBlob = new Blob(["x"], { type: "image/jpeg" });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(smallerBlob);
    });
    const original = new File([new Uint8Array(1000)], "photo.png", { type: "image/png" });

    const result = await compressImage(original, BALANCED_COMPRESSION);

    expect(result).not.toBe(original);
    expect(result.type).toBe("image/jpeg");
    expect(result.name).toBe("photo.jpg");
    expect(result.size).toBe(smallerBlob.size);
  });

  it("falls back to the original file when the compressed result is not smaller", async () => {
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    const original = new File(["x"], "tiny.png", { type: "image/png" });
    const largerBlob = new Blob([new Uint8Array(1000)], { type: "image/jpeg" });
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(largerBlob);
    });

    const result = await compressImage(original, BALANCED_COMPRESSION);

    expect(result).toBe(original);
  });
});
