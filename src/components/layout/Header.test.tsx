import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname } from "next/navigation";
import { Header } from "@/components/layout/Header";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/"),
}));

beforeEach(() => {
  vi.mocked(usePathname).mockReturnValue("/");
  Object.defineProperty(window, "scrollY", { value: 0, configurable: true });
});

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

  it("is fixed out of flow with a 72px height so it can overlay page content", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("fixed", "inset-x-0", "top-0", "h-[72px]");
  });

  it("renders transparent over the hero on the home page before scrolling", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-transparent", "text-paper");
  });

  it("switches to a solid background once the page scrolls past the hero", () => {
    render(<Header />);

    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    fireEvent.scroll(window);

    expect(screen.getByRole("banner")).toHaveClass("bg-paper/90", "text-ink");
  });

  it("renders solid immediately when the page loads already scrolled past the hero", () => {
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-paper/90", "text-ink");
  });

  it("renders solid on non-home pages regardless of scroll position", () => {
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-paper/90", "text-ink");
  });
});
