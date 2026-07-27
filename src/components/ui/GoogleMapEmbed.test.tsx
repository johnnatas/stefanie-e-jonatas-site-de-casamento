import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GoogleMapEmbed } from "@/components/ui/GoogleMapEmbed";

describe("GoogleMapEmbed", () => {
  it("renders a titled iframe whose src embeds the URL-encoded address", () => {
    render(<GoogleMapEmbed address="Ville La Rochelle, Jarinu - SP" />);

    const frame = screen.getByTitle("Mapa: Ville La Rochelle, Jarinu - SP");
    expect(frame).toHaveAttribute(
      "src",
      expect.stringContaining("q=Ville%20La%20Rochelle%2C%20Jarinu%20-%20SP")
    );
    expect(frame).toHaveAttribute("src", expect.stringContaining("output=embed"));
    expect(frame).toHaveAttribute("loading", "lazy");
  });
});
