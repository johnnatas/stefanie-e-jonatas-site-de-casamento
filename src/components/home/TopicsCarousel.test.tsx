import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TopicsCarousel } from "@/components/home/TopicsCarousel";

describe("TopicsCarousel", () => {
  it("renders all 5 topics as links to their pages", () => {
    render(<TopicsCarousel />);

    const expected: [string, string][] = [
      ["Cerimônia", "/dicas-e-instrucoes/cerimonia"],
      ["Traje", "/dicas-e-instrucoes/codigo-de-vestimenta"],
      ["Hospedagem", "/dicas-e-instrucoes/hospedagem"],
      ["Lista de presentes", "/presentes"],
      ["Nossa história", "/nossa-historia"],
    ];

    for (const [title, href] of expected) {
      const links = screen.getAllByRole("link", { name: new RegExp(title, "i") });
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute("href", href);
    }
  });
});
