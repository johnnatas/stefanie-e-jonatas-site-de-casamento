import { describe, expect, it } from "vitest";
import { NAV_ITEMS } from "@/shared/navigation";

describe("NAV_ITEMS", () => {
  it("does not include the Álbum de Fotos entry", () => {
    const hrefs = NAV_ITEMS.map((item) => item.href);
    const labels = NAV_ITEMS.map((item) => item.label);

    expect(hrefs).not.toContain("/album-de-fotos");
    expect(labels).not.toContain("Álbum de Fotos");
  });

  it("has exactly the 5 expected entries in order", () => {
    expect(NAV_ITEMS).toEqual([
      { label: "Início", href: "/" },
      { label: "Confirme Presença", href: "/confirmar-presenca" },
      { label: "Presentes", href: "/presentes" },
      { label: "Dicas e Instruções", href: "/dicas-e-instrucoes?tema=cerimonia" },
      { label: "Nossa História", href: "/nossa-historia" },
    ]);
  });
});
