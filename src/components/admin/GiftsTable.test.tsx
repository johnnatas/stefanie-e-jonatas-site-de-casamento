import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftsTable } from "@/components/admin/GiftsTable";
import type { Gift } from "@/domain/entities/Gift";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeGift(overrides: Partial<Gift>): Gift {
  return {
    id: "1",
    name: "Jogo de panelas",
    description: "5 panelas",
    imageUrl: "/a.jpg",
    price: 200,
    category: "cozinha",
    status: "available",
    createdAt: new Date(),
    isAvailable: () => true,
    reserve: () => makeGift(overrides),
    markAsPaid: () => makeGift(overrides),
    releaseToAvailable: () => makeGift(overrides),
    ...overrides,
  } as Gift;
}

const gifts: Gift[] = [
  makeGift({ id: "1", name: "Jogo de panelas", category: "cozinha", status: "available" }),
  makeGift({ id: "2", name: "Aspirador robô", category: "casa", status: "reserved" }),
  makeGift({ id: "3", name: "Jogo de taças", category: "cozinha", status: "paid" }),
];

describe("GiftsTable", () => {
  it("renders every gift with no filters applied", () => {
    render(<GiftsTable gifts={gifts} />);

    expect(screen.getByText("Jogo de panelas")).toBeInTheDocument();
    expect(screen.getByText("Aspirador robô")).toBeInTheDocument();
    expect(screen.getByText("Jogo de taças")).toBeInTheDocument();
  });

  it("filters by name text", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    await user.type(screen.getByLabelText("Buscar por nome"), "aspirador");

    expect(screen.getByText("Aspirador robô")).toBeInTheDocument();
    expect(screen.queryByText("Jogo de panelas")).not.toBeInTheDocument();
  });

  it("filters by category", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    await user.selectOptions(screen.getByLabelText("Categoria"), "cozinha");

    expect(screen.getByText("Jogo de panelas")).toBeInTheDocument();
    expect(screen.getByText("Jogo de taças")).toBeInTheDocument();
    expect(screen.queryByText("Aspirador robô")).not.toBeInTheDocument();
  });

  it("filters by status", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    await user.selectOptions(screen.getByLabelText("Status"), "paid");

    expect(screen.getByText("Jogo de taças")).toBeInTheDocument();
    expect(screen.queryByText("Jogo de panelas")).not.toBeInTheDocument();
  });
});
