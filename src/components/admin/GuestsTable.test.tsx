import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuestsTable } from "@/components/admin/GuestsTable";
import type { Guest } from "@/domain/entities/Guest";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeGuest(overrides: Partial<Guest>): Guest {
  return {
    id: "1",
    fullName: "Ana Silva",
    nickname: undefined,
    email: undefined,
    phone: undefined,
    companionsCount: 0,
    message: undefined,
    attendanceStatus: "pending",
    createdAt: new Date(),
    totalAttendeesCount: () => 0,
    ...overrides,
  } as Guest;
}

const guests: Guest[] = [
  makeGuest({ id: "1", fullName: "Ana Silva", attendanceStatus: "confirmed" }),
  makeGuest({ id: "2", fullName: "Bruno Costa", attendanceStatus: "pending" }),
  makeGuest({ id: "3", fullName: "Carla Nunes", nickname: "Carlinha", attendanceStatus: "declined" }),
];

describe("GuestsTable", () => {
  it("renders every guest with no filters applied", () => {
    render(<GuestsTable guests={guests} />);

    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.getByText("Bruno Costa")).toBeInTheDocument();
    expect(screen.getByText("Carla Nunes")).toBeInTheDocument();
  });

  it("filters by name/nickname text", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    await user.type(screen.getByLabelText("Buscar por nome"), "carlinha");

    expect(screen.queryByText("Ana Silva")).not.toBeInTheDocument();
    expect(screen.getByText("Carla Nunes")).toBeInTheDocument();
  });

  it("filters by attendance status", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    await user.selectOptions(screen.getByLabelText("Status"), "confirmed");

    expect(screen.getByText("Ana Silva")).toBeInTheDocument();
    expect(screen.queryByText("Bruno Costa")).not.toBeInTheDocument();
    expect(screen.queryByText("Carla Nunes")).not.toBeInTheDocument();
  });
});
