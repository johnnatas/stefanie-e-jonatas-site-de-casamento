import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TornPaperDivider } from "@/components/ui/TornPaperDivider";

describe("TornPaperDivider", () => {
  it("renders the torn paper image", () => {
    render(<TornPaperDivider />);

    const img = screen.getByTestId("torn-paper-divider").querySelector("img");
    expect(img).toHaveAttribute("src", "/images/torn-paper.png");
  });

  it("forwards the className prop to the wrapper", () => {
    render(<TornPaperDivider className="h-24 w-full" />);

    expect(screen.getByTestId("torn-paper-divider")).toHaveClass("h-24", "w-full");
  });
});
