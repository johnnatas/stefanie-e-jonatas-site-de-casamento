import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Monogram } from "@/components/ui/Monogram";

describe("Monogram", () => {
  it("renders the couple's initials inside the oval mark", () => {
    render(<Monogram />);

    expect(screen.getByText("S&J")).toBeInTheDocument();
  });

  it("forwards className to the wrapper for sizing/coloring", () => {
    render(<Monogram className="text-gold" />);

    expect(screen.getByText("S&J").parentElement).toHaveClass("text-gold");
  });
});
