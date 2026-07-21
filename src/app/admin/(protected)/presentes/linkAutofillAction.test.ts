import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchGiftLinkMetadataAction } from "@/app/admin/(protected)/presentes/linkAutofillAction";

vi.mock("@/infrastructure/composition", () => ({
  uploadSiteContentPhoto: vi.fn().mockResolvedValue("https://storage.example.com/gifts/link-import-123.jpg"),
}));

describe("fetchGiftLinkMetadataAction", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns title, price, and an uploaded image url on full success", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Liquidificador Turbo 3000">
        <meta property="og:image" content="https://loja.example.com/img.jpg">
        <script type="application/ld+json">{"@type":"Product","offers":{"price":"249.90"}}</script>
      </head></html>
    `;

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, text: async () => html })
        .mockResolvedValueOnce({
          ok: true,
          blob: async () => new Blob(["fake-image-bytes"], { type: "image/jpeg" }),
          headers: new Headers({ "content-type": "image/jpeg" }),
        })
    );

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/123");

    expect(result.status).toBe("success");
    expect(result.title).toBe("Liquidificador Turbo 3000");
    expect(result.price).toBe(249.9);
    expect(result.imageUrl).toBe("https://storage.example.com/gifts/link-import-123.jpg");
  });

  it("returns whatever was found when no image is present", async () => {
    const html = `<html><head><title>Produto Simples</title></head></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, text: async () => html }));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/456");

    expect(result.status).toBe("success");
    expect(result.title).toBe("Produto Simples");
    expect(result.price).toBeUndefined();
    expect(result.imageUrl).toBeUndefined();
  });

  it("returns an error when nothing at all is found", async () => {
    const html = `<html><head></head><body></body></html>`;
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: true, text: async () => html }));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/empty");

    expect(result.status).toBe("error");
  });

  it("returns an error when the metadata fetch throws", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("network error")));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/789");

    expect(result.status).toBe("error");
  });

  it("returns an error when the metadata response is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({ ok: false }));

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/404");

    expect(result.status).toBe("error");
  });

  it("rejects a blocked/internal host without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGiftLinkMetadataAction("http://localhost:3000/admin");

    expect(result.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects a non-http(s) URL without calling fetch", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await fetchGiftLinkMetadataAction("javascript:alert(1)");

    expect(result.status).toBe("error");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid URL string", async () => {
    const result = await fetchGiftLinkMetadataAction("not-a-url");

    expect(result.status).toBe("error");
  });

  it("still returns title/price when the image download fails", async () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Cafeteira">
        <meta property="og:image" content="https://loja.example.com/broken.jpg">
        <script type="application/ld+json">{"@type":"Product","offers":{"price":"199"}}</script>
      </head></html>
    `;

    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({ ok: true, text: async () => html })
        .mockResolvedValueOnce({ ok: false })
    );

    const result = await fetchGiftLinkMetadataAction("https://loja.example.com/produto/cafeteira");

    expect(result.status).toBe("success");
    expect(result.title).toBe("Cafeteira");
    expect(result.price).toBe(199);
    expect(result.imageUrl).toBeUndefined();
  });
});
