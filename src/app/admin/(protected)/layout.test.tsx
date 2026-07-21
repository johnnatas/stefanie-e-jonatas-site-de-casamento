import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { usePathname } from "next/navigation";
import AdminProtectedLayout from "./layout";

vi.mock("next/navigation", () => ({
  usePathname: vi.fn(() => "/admin/dashboard"),
}));

describe("AdminProtectedLayout", () => {
  it("shows the current section's group label in the mobile top bar", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/presentes");
    render(<AdminProtectedLayout>content</AdminProtectedLayout>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Presentes");
  });

  it("matches nested routes to their parent section", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/presentes/123");
    render(<AdminProtectedLayout>content</AdminProtectedLayout>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Presentes");
  });

  it("falls back to a generic label outside the known sections", () => {
    vi.mocked(usePathname).mockReturnValue("/admin/login");
    render(<AdminProtectedLayout>content</AdminProtectedLayout>);

    expect(screen.getByTestId("admin-mobile-section-label")).toHaveTextContent("Painel Administrativo");
  });
});
