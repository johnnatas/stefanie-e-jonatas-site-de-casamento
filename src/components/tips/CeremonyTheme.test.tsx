import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { CeremonyTheme } from "@/components/tips/CeremonyTheme";
import { tipsCerimoniaContentSchema } from "@/application/content/schemas";

describe("CeremonyTheme", () => {
  it("renders the title, event info lines, and each route with its map link", () => {
    const content = tipsCerimoniaContentSchema.parse({
      eventDateLabel: "29 de junho de 2027",
      eventVenueLabel: "Cerimônia e recepção — Ville La Rochelle",
      routes: [
        { originLabel: "Para quem vem de SP Zona Sul", instructions: "1. Pela Via Anhanguera.", mapUrl: "https://maps.google.com/x" },
      ],
    });
    render(<CeremonyTheme content={content} />);

    expect(screen.getByText("Informações sobre o grande dia!")).toBeInTheDocument();
    expect(screen.getByText("29 de junho de 2027")).toBeInTheDocument();
    expect(screen.getByText("Cerimônia e recepção — Ville La Rochelle")).toBeInTheDocument();
    expect(screen.getByText("Para quem vem de SP Zona Sul")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Ver rota no mapa →" })).toHaveAttribute(
      "href",
      "https://maps.google.com/x"
    );
  });

  it("omits the route map link when no mapUrl is set", () => {
    const content = tipsCerimoniaContentSchema.parse({
      routes: [{ originLabel: "Vindo de BH", instructions: "Siga em frente.", mapUrl: null }],
    });
    render(<CeremonyTheme content={content} />);

    expect(screen.queryByRole("link", { name: "Ver rota no mapa →" })).not.toBeInTheDocument();
  });
});
