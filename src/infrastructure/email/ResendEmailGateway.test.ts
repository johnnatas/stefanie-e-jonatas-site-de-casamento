import { describe, expect, it } from "vitest";
import { htmlToPlainText, resolveEmailLogoUrl } from "@/infrastructure/email/ResendEmailGateway";

describe("htmlToPlainText", () => {
  it("converts paragraphs into blank-line-separated text", () => {
    const html = "<p>Oi Carla!</p><p>Reservamos o presente para você.</p>";
    expect(htmlToPlainText(html)).toBe("Oi Carla!\n\nReservamos o presente para você.");
  });

  it("keeps a link's label and appends its URL in parentheses", () => {
    const html = '<p><a href="https://sjcasamento.site/pagar">Pagar agora</a></p>';
    expect(htmlToPlainText(html)).toBe("Pagar agora (https://sjcasamento.site/pagar)");
  });

  it("converts <br/> into a newline", () => {
    const html = "<p>Com carinho,<br/>Stéfanie &amp; Jonatas</p>";
    expect(htmlToPlainText(html)).toBe("Com carinho,\nStéfanie & Jonatas");
  });

  it("strips remaining tags like <strong> while keeping their text", () => {
    const html = "<p>Reservamos <strong>Air fryer</strong> para você.</p>";
    expect(htmlToPlainText(html)).toBe("Reservamos Air fryer para você.");
  });

  it("decodes &amp; and &nbsp;", () => {
    expect(htmlToPlainText("<p>Stéfanie &amp; Jonatas&nbsp;te agradecem</p>")).toBe(
      "Stéfanie & Jonatas te agradecem"
    );
  });
});

describe("resolveEmailLogoUrl", () => {
  it("uses the admin-uploaded logo when one is set", () => {
    expect(resolveEmailLogoUrl("https://storage.example.com/logo-dark.png", "https://sjcasamento.site")).toBe(
      "https://storage.example.com/logo-dark.png"
    );
  });

  it("falls back to the static asset under the site URL when no logo was uploaded", () => {
    expect(resolveEmailLogoUrl(null, "https://sjcasamento.site")).toBe(
      "https://sjcasamento.site/images/logo.png"
    );
  });
});
