import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PhotoOrPlaceholder } from "@/components/ui/PhotoOrPlaceholder";

describe("PhotoOrPlaceholder", () => {
  it("renders a real img when src is provided", () => {
    render(<PhotoOrPlaceholder src="https://example.com/photo.jpg" label="Foto" className="h-10 w-10" />);

    const img = screen.getByAltText("");
    expect(img).toHaveAttribute("src", "https://example.com/photo.jpg");
    expect(img).toHaveClass("object-cover", "h-10", "w-10");
  });

  it("falls back to PlaceholderImage when src is null", () => {
    render(<PhotoOrPlaceholder src={null} label="Foto do casal" className="h-10 w-10" />);

    expect(screen.getByText("Foto do casal")).toBeInTheDocument();
    expect(screen.queryByAltText("")).not.toBeInTheDocument();
  });
});
