import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Monogram } from "@/components/ui/Monogram";

describe("Monogram", () => {
  it("renders the couple's logo image", () => {
    render(<Monogram />);

    const img = screen.getByAltText("Stéfanie & Jonatas");
    expect(img).toHaveAttribute("src", "/images/logo.png");
  });

  it("forwards className to the image for sizing", () => {
    render(<Monogram className="h-12 w-10" />);

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveClass("h-12", "w-10");
  });

  it("uses the srcDark override when provided", () => {
    render(<Monogram srcDark="https://example.com/logo-dark.png" />);

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveAttribute(
      "src",
      "https://example.com/logo-dark.png"
    );
  });

  it("uses the srcLight override only when light is true", () => {
    render(
      <Monogram
        light
        srcDark="https://example.com/logo-dark.png"
        srcLight="https://example.com/logo-light.png"
      />
    );

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveAttribute(
      "src",
      "https://example.com/logo-light.png"
    );
  });

  it("falls back to the static asset when light is true but no override is given", () => {
    render(<Monogram light />);

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveAttribute("src", "/images/logo-light.png");
  });
});
