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

  it("is fixed out of flow so it can overlay page content", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("fixed", "inset-x-0", "top-0", "py-[25px]");
  });

  it("renders transparent over the hero on the home page before scrolling", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-transparent", "text-paper");
  });

  it("switches to a solid background and shrinks once the page scrolls past the hero", () => {
    render(<Header />);

    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    fireEvent.scroll(window);

    expect(screen.getByRole("banner")).toHaveClass("bg-mist", "text-forest", "py-4");
    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveClass("h-10");
  });

  it("renders the larger logo only while transparent at the top of the home page", () => {
    render(<Header />);

    expect(screen.getByAltText("Stéfanie & Jonatas")).toHaveClass("h-[65px]");
  });

  it("renders solid immediately when the page loads already scrolled past the hero", () => {
    Object.defineProperty(window, "scrollY", { value: 200, configurable: true });
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-mist", "text-forest");
  });

  it("renders solid on non-home pages regardless of scroll position", () => {
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    expect(screen.getByRole("banner")).toHaveClass("bg-mist", "text-forest");
  });

  it("only changes color on hover for an inactive nav item, not font or casing", () => {
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    const link = screen.getByRole("link", { name: "Nossa História" });

    expect(link).toHaveClass("font-serif", "uppercase", "hover:text-moss");
    expect(link).not.toHaveClass("font-script", "italic");
    expect(link).toHaveTextContent("Nossa História");
  });

  it("renders the active nav item in the script style regardless of hover", () => {
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    const link = screen.getByRole("link", { name: "presentes" });

    expect(link).toHaveClass("font-script", "italic", "text-moss");
    expect(link).not.toHaveClass("hover:text-moss");
  });

  it("marks the active nav item with aria-current for assistive tech", () => {
    vi.mocked(usePathname).mockReturnValue("/presentes");
    render(<Header />);

    expect(screen.getByRole("link", { name: "presentes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Nossa História" })).not.toHaveAttribute("aria-current");
  });

  it("marks Dicas e Instruções active even though its href carries a ?tema= query string usePathname() never includes", () => {
    vi.mocked(usePathname).mockReturnValue("/dicas-e-instrucoes");
    render(<Header />);

    expect(screen.getByRole("link", { name: "dicas e instruções" })).toHaveAttribute("aria-current", "page");
  });
});
