import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardStats } from "@/components/admin/DashboardStats";

const summary = {
  confirmedGuestsCount: 10,
  pendingGuestsCount: 3,
  declinedGuestsCount: 1,
  totalGuestsCount: 14,
  totalGiftsCount: 15,
  paidGiftsCount: 5,
  totalAmountReceived: 1234.5,
  totalAmountRegistered: 5000,
};

describe("DashboardStats", () => {
  it("links each card to its filtered list", () => {
    render(<DashboardStats summary={summary} />);

    expect(screen.getByRole("link", { name: /confirmados/i })).toHaveAttribute(
      "href",
      "/admin/convidados?status=confirmed"
    );
    expect(screen.getByRole("link", { name: /pendentes/i })).toHaveAttribute(
      "href",
      "/admin/convidados?status=pending"
    );
    expect(screen.getByRole("link", { name: /não vão/i })).toHaveAttribute(
      "href",
      "/admin/convidados?status=declined"
    );
    expect(screen.getByRole("link", { name: /total de pessoas/i })).toHaveAttribute("href", "/admin/convidados");
    expect(screen.getByRole("link", { name: /presentes cadastrados/i })).toHaveAttribute(
      "href",
      "/admin/presentes"
    );
    expect(screen.getByRole("link", { name: /presentes recebidos/i })).toHaveAttribute(
      "href",
      "/admin/presentes?status=paid"
    );
    expect(screen.getByRole("link", { name: /valor arrecadado/i })).toHaveAttribute(
      "href",
      "/admin/presentes?status=paid"
    );
    expect(screen.getByRole("link", { name: /valor total cadastrado/i })).toHaveAttribute(
      "href",
      "/admin/presentes"
    );
  });

  it("stacks stat cards in a single column on mobile instead of breaking into an odd half-width card", () => {
    render(<DashboardStats summary={summary} />);

    const confirmedLink = screen.getByRole("link", { name: /confirmados/i });
    const grid = confirmedLink.parentElement;

    expect(grid).toHaveClass("grid-cols-1");
    expect(grid).not.toHaveClass("grid-cols-2");
    expect(grid).toHaveClass("sm:grid-cols-3");
  });
});
