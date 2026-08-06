import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import { AdminShell } from "@/components/admin/AdminShell";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin/dashboard"),
}));

describe("AdminShell", () => {
  it("shows the current section's group label in the mobile top bar", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/presentes");
    render(<AdminShell userEmail={null}>content</AdminShell>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Presentes");
  });

  it("matches nested routes to their parent section", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/presentes/123");
    render(<AdminShell userEmail={null}>content</AdminShell>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Presentes");
  });

  it("falls back to a generic label outside the known sections", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/login");
    render(<AdminShell userEmail={null}>content</AdminShell>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Painel Administrativo");
  });

  it("shows the logged-in admin's e-mail in the desktop header", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard");
    render(<AdminShell userEmail="noiva@example.com">content</AdminShell>);

    expect(screen.getByText("noiva@example.com")).toBeInTheDocument();
  });

  it("renders the page content inside the card wrapper", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/dashboard");
    render(<AdminShell userEmail={null}>página de teste</AdminShell>);

    expect(screen.getByText("página de teste")).toBeInTheDocument();
  });
});
