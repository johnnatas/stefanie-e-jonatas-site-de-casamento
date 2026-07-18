import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Header } from "@/components/layout/Header";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("Header", () => {
  it("opens the mobile menu when the hamburger button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    expect(screen.queryByLabelText("Fechar menu")).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Abrir menu"));

    expect(await screen.findByLabelText("Fechar menu")).toBeInTheDocument();
  });

  it("closes the mobile menu when the close button is clicked", async () => {
    const user = userEvent.setup();
    render(<Header />);

    await user.click(screen.getByLabelText("Abrir menu"));
    await user.click(await screen.findByLabelText("Fechar menu"));

    await waitFor(() => {
      expect(screen.queryByLabelText("Fechar menu")).not.toBeInTheDocument();
    });
  });

  it("renders a solid background with the Monogram and nav links", () => {
    render(<Header />);

    const banner = screen.getByRole("banner");
    expect(banner).toHaveClass("bg-paper/90", "text-ink");
    expect(screen.getByText("S&J")).toBeInTheDocument();
  });
});
