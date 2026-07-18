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
});
