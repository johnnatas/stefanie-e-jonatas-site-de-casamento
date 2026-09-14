import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuestsTable, type GuestListItem } from "@/components/admin/GuestsTable";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

function makeGuest(overrides: Partial<GuestListItem>): GuestListItem {
  return {
    id: "1",
    fullName: "Ana Silva",
    nickname: undefined,
    email: undefined,
    phone: undefined,
    companionsCount: 0,
    attendanceStatus: "pending",
    confirmedAt: undefined,
    ...overrides,
  };
}

const guests: GuestListItem[] = [
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

  it("shows how many guests match the current filters out of the total", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    expect(screen.getByText("3 de 3 convidados")).toBeInTheDocument();

    await user.selectOptions(screen.getByLabelText("Status"), "confirmed");

    expect(screen.getByText("1 de 3 convidados")).toBeInTheDocument();
  });

  it("links the guest name to their edit page", () => {
    render(<GuestsTable guests={guests} />);

    expect(screen.getByRole("link", { name: "Ana Silva" })).toHaveAttribute("href", "/admin/convidados/1");
  });

  it("sorts by name ascending and descending when the Nome header is clicked", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    await user.click(screen.getByRole("button", { name: /^nome/i }));
    let rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ana Silva");
    expect(rows[2]).toHaveTextContent("Carla Nunes");

    await user.click(screen.getByRole("button", { name: /^nome/i }));
    rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Carla Nunes");
    expect(rows[2]).toHaveTextContent("Ana Silva");
  });

  it("sorts by confirmation date when the Confirmado em header is clicked", async () => {
    const user = userEvent.setup();
    const guestsWithDates: GuestListItem[] = [
      makeGuest({ id: "1", fullName: "Ana Silva", attendanceStatus: "confirmed", confirmedAt: new Date("2026-01-10") }),
      makeGuest({ id: "2", fullName: "Bruno Costa", attendanceStatus: "confirmed", confirmedAt: new Date("2026-02-01") }),
    ];
    render(<GuestsTable guests={guestsWithDates} />);

    await user.click(screen.getByRole("button", { name: /confirmado em/i }));
    let rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Bruno Costa");

    await user.click(screen.getByRole("button", { name: /confirmado em/i }));
    rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Ana Silva");
  });

  it("shows a sort arrow on the Confirmado em header that matches the displayed order", async () => {
    const user = userEvent.setup();
    const guestsWithDates: GuestListItem[] = [
      makeGuest({ id: "1", fullName: "Ana Silva", attendanceStatus: "confirmed", confirmedAt: new Date("2026-01-10") }),
      makeGuest({ id: "2", fullName: "Bruno Costa", attendanceStatus: "confirmed", confirmedAt: new Date("2026-02-01") }),
    ];
    render(<GuestsTable guests={guestsWithDates} />);

    const header = screen.getByRole("button", { name: /confirmado em/i });

    await user.click(header);
    expect(header.textContent).toContain("▼");

    await user.click(header);
    expect(header.textContent).toContain("▲");
  });

  it("edits the companions count inline via double click, showing confirm and cancel controls", async () => {
    const user = userEvent.setup();
    render(<GuestsTable guests={guests} />);

    const cell = screen.getByTestId("companions-count-1");
    await user.dblClick(cell);

    const input = screen.getByLabelText(/editar acompanhantes de ana silva/i);
    expect(input).toHaveValue(0);
    expect(screen.getByRole("button", { name: /salvar acompanhantes/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cancelar edição de acompanhantes/i })).toBeInTheDocument();
  });
});
