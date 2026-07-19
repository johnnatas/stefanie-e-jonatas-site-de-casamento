import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { HeroCarousel } from "@/components/home/HeroCarousel";

describe("HeroCarousel", () => {
  it("renders exactly one real photo slide per photo provided", () => {
    render(<HeroCarousel photos={["https://example.com/a.jpg", "https://example.com/b.jpg"]} />);

    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(2);
  });

  it("falls back to 3 placeholder slides when no photos are provided", () => {
    render(<HeroCarousel photos={[]} />);

    expect(screen.getByText("Foto do casal 1")).toBeInTheDocument();
    expect(screen.getByText("Foto do casal 2")).toBeInTheDocument();
    expect(screen.getByText("Foto do casal 3")).toBeInTheDocument();
  });

  it("renders 5 slides when 5 photos are provided", () => {
    const photos = Array.from({ length: 5 }, (_, i) => `https://example.com/${i}.jpg`);
    render(<HeroCarousel photos={photos} />);

    expect(screen.getAllByRole("img", { hidden: true })).toHaveLength(5);
  });
});
