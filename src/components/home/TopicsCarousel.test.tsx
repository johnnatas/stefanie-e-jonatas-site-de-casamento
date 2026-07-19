import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";
import { homeTopicsContentSchema } from "@/application/content/schemas";

describe("TopicsCarousel", () => {
  it("renders all 5 topics as links to their pages, using the supplied content", () => {
    const content = homeTopicsContentSchema.parse({
      cerimonia: { title: "Cerimônia Custom", description: "d1", photo: null },
    });
    render(<TopicsCarousel content={content} />);

    const expected: [string, string][] = [
      ["Cerimônia Custom", "/dicas-e-instrucoes/cerimonia"],
      ["Lista de presentes", "/presentes"],
      ["Traje", "/dicas-e-instrucoes/codigo-de-vestimenta"],
      ["Hospedagem", "/dicas-e-instrucoes/hospedagem"],
      ["Nossa história", "/nossa-historia"],
    ];

    for (const [title, href] of expected) {
      const links = screen.getAllByRole("link", { name: new RegExp(title, "i") });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", href);
    }
  });
});
