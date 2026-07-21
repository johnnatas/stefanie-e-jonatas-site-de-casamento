import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftsTable, type GiftListItem } from "@/components/admin/GiftsTable";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeGift(overrides: Partial<GiftListItem>): GiftListItem {
  return {
    id: "1",
    name: "Jogo de panelas",
    price: 200,
    category: "cozinha",
    status: "available",
    ...overrides,
  };
}

const gifts: GiftListItem[] = [
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

  it("shows how many gifts match the current filters out of the total", async () => {
    const user = userEvent.setup();
    render(<GiftsTable gifts={gifts} />);

    expect(screen.getByText("3 de 3 presentes")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Categoria"), "cozinha");

    expect(screen.getByText("2 de 3 presentes")).toBeInTheDocument();
  });
});
