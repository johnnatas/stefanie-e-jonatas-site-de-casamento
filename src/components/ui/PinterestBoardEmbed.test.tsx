import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PinterestBoardEmbed } from "@/components/ui/PinterestBoardEmbed";

describe("PinterestBoardEmbed", () => {
  it("shows a styled default label instead of the raw board URL", () => {
    render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);

    const link = screen.getByRole("link", { name: "Ver inspirações no Pinterest" });
    expect(link).toHaveAttribute("href", "https://br.pinterest.com/user/board/");
    expect(screen.queryByText("https://br.pinterest.com/user/board/")).not.toBeInTheDocument();
  });

  it("shows a custom label when provided", () => {
    render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" label="Inspirações para ele" />);

    expect(screen.getByRole("link", { name: "Inspirações para ele" })).toBeInTheDocument();
  });
});
