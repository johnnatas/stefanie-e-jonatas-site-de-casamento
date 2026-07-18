import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { SplitPanel } from "@/components/ui/SplitPanel";

describe("SplitPanel", () => {
  it("renders the eyebrow, title, and children text", () => {
    render(
      <SplitPanel eyebrow="O grande dia" title="Local e horário" image={<span>foto</span>}>
        <p>Chegue com antecedência.</p>
      </SplitPanel>
    );

    expect(screen.getByText("O grande dia")).toBeInTheDocument();
    expect(screen.getByText("Local e horário")).toBeInTheDocument();
    expect(screen.getByText("Chegue com antecedência.")).toBeInTheDocument();
    expect(screen.getByText("foto")).toBeInTheDocument();
  });

  it("renders a CTA link when ctaLabel/ctaHref are provided", () => {
    render(
      <SplitPanel title="Lista de Presentes" image={<span>foto</span>} ctaLabel="Ver lista" ctaHref="/presentes">
        <p>Texto</p>
      </SplitPanel>
    );

    const link = screen.getByRole("link", { name: "Ver lista" });
    expect(link).toHaveAttribute("href", "/presentes");
  });

  it("omits the CTA when ctaLabel/ctaHref are not provided", () => {
    render(
      <SplitPanel title="Onde se hospedar" image={<span>foto</span>}>
        <p>Texto</p>
      </SplitPanel>
    );

    expect(screen.queryByRole("link")).not.toBeInTheDocument();
  });

  it("applies the dark tone classes when tone='dark'", () => {
    render(
      <SplitPanel title="Título" tone="dark" image={<span>foto</span>}>
        <p>Texto</p>
      </SplitPanel>
    );

    expect(screen.getByText("Título").closest("section")).toHaveClass("bg-charcoal", "text-paper");
  });
});
