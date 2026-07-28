import { describe, expect, it } from "vitest";
import { isNavItemActive, NAV_ITEMS } from "@/shared/navigation";

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

describe("isNavItemActive", () => {
  it("matches a plain href against the exact pathname", () => {
    expect(isNavItemActive("/presentes", "/presentes")).toBe(true);
    expect(isNavItemActive("/nossa-historia", "/presentes")).toBe(false);
  });

  it("ignores the query string on the nav item's own href (usePathname() never includes one)", () => {
    expect(isNavItemActive("/dicas-e-instrucoes", "/dicas-e-instrucoes?tema=cerimonia")).toBe(true);
    expect(isNavItemActive("/dicas-e-instrucoes", "/dicas-e-instrucoes?tema=hospedagem")).toBe(true);
  });

  it("does not match a different path that merely starts with the same prefix", () => {
    expect(isNavItemActive("/presentes-extra", "/presentes")).toBe(false);
  });
});
