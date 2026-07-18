import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardStats } from "@/components/admin/DashboardStats";

describe("DashboardStats", () => {
  it("renders every summary metric, formatting the amount as BRL", () => {
    render(
      <DashboardStats
        summary={{
          confirmedGuestsCount: 42,
          declinedGuestsCount: 3,
          totalAttendeesCount: 80,
          totalGiftsCount: 12,
          paidGiftsCount: 5,
          totalAmountReceived: 2500,
        }}
      />
    );

    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("80")).toBeInTheDocument();
    expect(screen.getByText("R$ 2.500,00")).toBeInTheDocument();
  });
});
