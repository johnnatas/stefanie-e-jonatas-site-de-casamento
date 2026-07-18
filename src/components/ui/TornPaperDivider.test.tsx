import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TornPaperDivider } from "@/components/ui/TornPaperDivider";

describe("TornPaperDivider", () => {
  it("defaults to the paper color when no fill is given", () => {
    render(<TornPaperDivider />);

    const path = screen.getByTestId("torn-paper-divider").querySelector("path");
    expect(path).toHaveAttribute("fill", "var(--color-paper)");
  });

  it("renders an svg path with a custom fill color", () => {
    render(<TornPaperDivider fill="#14130f" />);

    const path = screen.getByTestId("torn-paper-divider").querySelector("path");
    expect(path).toHaveAttribute("fill", "#14130f");
  });

  it("forwards the className prop to the svg element", () => {
    render(<TornPaperDivider className="h-24 w-full" />);

    expect(screen.getByTestId("torn-paper-divider")).toHaveClass("h-24", "w-full");
  });
});
