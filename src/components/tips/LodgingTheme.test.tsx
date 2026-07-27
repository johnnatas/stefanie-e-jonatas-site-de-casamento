import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LodgingTheme } from "@/components/tips/LodgingTheme";
import { tipsHospedagemContentSchema } from "@/application/content/schemas";

describe("LodgingTheme", () => {
  it("renders the map, title, lists, and disclaimer", () => {
    const content = tipsHospedagemContentSchema.parse({
      mapAddress: "Ville La Rochelle, Jarinu - SP",
      distances: [{ label: "São Paulo", km: "75 km" }],
      hotels: [{ name: "La Maison Caiçara", distanceLabel: "500m", url: "https://example.com" }],
      airports: [{ name: "Viracopos", distanceLabel: "69,5 km", driveTimeLabel: "1h10" }],
    });
    render(<LodgingTheme content={content} />);

    expect(screen.getByTitle("Mapa: Ville La Rochelle, Jarinu - SP")).toBeInTheDocument();
    expect(screen.getByText("Dicas de hospedagem e locomoção")).toBeInTheDocument();
    expect(screen.getByText("São Paulo")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "La Maison Caiçara" })).toHaveAttribute("href", "https://example.com");
    expect(screen.getByText("Viracopos")).toBeInTheDocument();
    expect(
      screen.getByText("Não temos vínculo, parceria ou comissão com as indicações acima.")
    ).toBeInTheDocument();
  });

  it("omits the map when no address is set", () => {
    const content = tipsHospedagemContentSchema.parse({});
    render(<LodgingTheme content={content} />);
    expect(screen.queryByTitle(/^Mapa:/)).not.toBeInTheDocument();
  });

  it("drops the two-column grid when there is no map to justify it", () => {
    const content = tipsHospedagemContentSchema.parse({});
    const { container } = render(<LodgingTheme content={content} />);
    expect(container.firstChild).not.toHaveClass("lg:grid-cols-2");
  });
});
