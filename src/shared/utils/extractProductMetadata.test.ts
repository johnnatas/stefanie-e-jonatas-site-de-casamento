import { describe, expect, it } from "vitest";
import { extractProductMetadata } from "@/shared/utils/extractProductMetadata";

describe("extractProductMetadata", () => {
  it("extracts title, image, and price when all are present", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Liquidificador Turbo 3000">
        <meta property="og:image" content="https://loja.example.com/img/liquidificador.jpg">
        <script type="application/ld+json">
          {"@context":"https://schema.org","@type":"Product","name":"Liquidificador Turbo 3000","offers":{"@type":"Offer","price":"249.90","priceCurrency":"BRL"}}
        </script>
      </head><body></body></html>
    `;

    const result = extractProductMetadata(html);

    expect(result).toEqual({
      title: "Liquidificador Turbo 3000",
      imageUrl: "https://loja.example.com/img/liquidificador.jpg",
      price: 249.9,
    });
  });

  it("falls back to the <title> tag when og:title is absent", () => {
    const html = `<html><head><title> Panela de Pressão Elétrica </title></head><body></body></html>`;

    const result = extractProductMetadata(html);

    expect(result.title).toBe("Panela de Pressão Elétrica");
    expect(result.imageUrl).toBeUndefined();
    expect(result.price).toBeUndefined();
  });

  it("does not extract a price from JSON-LD whose @type is not Product", () => {
    const html = `
      <html><head>
        <meta property="og:title" content="Blog Post">
        <script type="application/ld+json">{"@type":"Article","name":"Como escolher panelas"}</script>
      </head></html>
    `;

    const result = extractProductMetadata(html);

    expect(result.title).toBe("Blog Post");
    expect(result.price).toBeUndefined();
  });

  it("returns all fields undefined when no metadata is present", () => {
    const html = `<html><head></head><body><p>Sem nada aqui</p></body></html>`;

    const result = extractProductMetadata(html);

    expect(result).toEqual({ title: undefined, imageUrl: undefined, price: undefined });
  });

  it("does not throw on malformed JSON-LD content", () => {
    const html = `<html><head><script type="application/ld+json">{ not valid json </script></head></html>`;

    expect(() => extractProductMetadata(html)).not.toThrow();
    expect(extractProductMetadata(html).price).toBeUndefined();
  });
});
