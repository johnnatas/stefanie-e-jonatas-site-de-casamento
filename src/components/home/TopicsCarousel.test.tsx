import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";
import { homeTopicsContentSchema } from "@/application/content/schemas";

describe("TopicsCarousel", () => {
  it("renders all 5 topics with a title and a CTA button linking to their pages, using the supplied content", () => {
    const content = homeTopicsContentSchema.parse({
      cerimonia: { title: "Cerimônia Custom", description: "Veja os detalhes", photo: null },
    });
    render(<TopicsCarousel content={content} />);

    const expected: [string, string, string][] = [
      ["Cerimônia Custom", "Veja os detalhes", "/dicas-e-instrucoes?tema=cerimonia"],
      ["Lista de presentes", "Ajude a construir o começo da nossa nova casa", "/presentes"],
      ["Traje", "Código de vestimenta para o grande dia", "/dicas-e-instrucoes?tema=vestimenta"],
      ["Hospedagem", "Sugestões de hotéis e pousadas próximas", "/dicas-e-instrucoes?tema=hospedagem"],
      ["Nossa história", "Como tudo começou até chegarmos aqui", "/nossa-historia"],
    ];

    for (const [title, description, href] of expected) {
      expect(screen.getAllByText(title).length).toBeGreaterThan(0);
      const links = screen.getAllByRole("link", { name: new RegExp(description, "i") });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", href);
    }
  });
});
