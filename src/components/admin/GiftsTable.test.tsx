import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftsTable, type GiftListItem } from "@/components/admin/GiftsTable";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock("@/app/admin/(protected)/presentes/generateLinksAction", () => ({
  generateMissingPaymentLinksAction: vi.fn(),
}));

function makeGift(overrides: Partial<GiftListItem>): GiftListItem {
  return {
    id: "1",
    name: "Jogo de panelas",
    price: 200,
    category: "cozinha",
    status: "available",
    createdAt: new Date("2026-01-01T00:00:00-03:00"),
    hasPaymentLink: true,
    ...overrides,
  };
}

const gifts: GiftListItem[] = [
  makeGift({
    id: "1",
    name: "Jogo de panelas",
    category: "cozinha",
    status: "available",
    createdAt: new Date("2026-01-01T00:00:00-03:00"),
  }),
  makeGift({
    id: "2",
    name: "Aspirador robô",
    category: "casa",
    status: "reserved",
    createdAt: new Date("2026-01-03T00:00:00-03:00"),
  }),
  makeGift({
    id: "3",
    name: "Jogo de taças",
    category: "cozinha",
    status: "paid",
    createdAt: new Date("2026-01-02T00:00:00-03:00"),
  }),
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

  it("orders gifts from most recently registered to oldest", () => {
    render(<GiftsTable gifts={gifts} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows[0]).toHaveTextContent("Aspirador robô");
    expect(rows[1]).toHaveTextContent("Jogo de taças");
    expect(rows[2]).toHaveTextContent("Jogo de panelas");
  });

  it("links the gift name to its edit page", () => {
    render(<GiftsTable gifts={gifts} />);

    expect(screen.getByRole("link", { name: "Jogo de panelas" })).toHaveAttribute("href", "/admin/presentes/1");
  });

  it("paginates 20 gifts per page", async () => {
    const user = userEvent.setup();
    const manyGifts: GiftListItem[] = Array.from({ length: 25 }, (_, index) =>
      makeGift({
        id: `gift-${index}`,
        name: `Presente ${index}`,
        createdAt: new Date(2026, 0, index + 1),
      })
    );
    render(<GiftsTable gifts={manyGifts} />);

    expect(screen.getAllByRole("row")).toHaveLength(21);
    expect(screen.getByText("Página 1 de 2")).toBeInTheDocument();
    expect(screen.getByText("Presente 24")).toBeInTheDocument();
    expect(screen.queryByText("Presente 0")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(screen.getByText("Presente 0")).toBeInTheDocument();
    expect(screen.queryByText("Presente 24")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Próxima" })).toBeDisabled();
  });

  it("shows a Gerado badge when the gift has a payment link, and Sem link otherwise", () => {
    render(
      <GiftsTable
        gifts={[
          makeGift({ id: "1", name: "Com link", hasPaymentLink: true }),
          makeGift({ id: "2", name: "Sem link", hasPaymentLink: false }),
        ]}
      />
    );

    const rows = screen.getAllByRole("row");
    expect(rows[1]).toHaveTextContent("Gerado");
    expect(rows[2]).toHaveTextContent("Sem link");
  });

  it("shows the bulk generation button only when some gift is missing a link", () => {
    const { rerender } = render(<GiftsTable gifts={[makeGift({ hasPaymentLink: true })]} />);
    expect(screen.queryByRole("button", { name: "Gerar links pendentes" })).not.toBeInTheDocument();

    rerender(<GiftsTable gifts={[makeGift({ hasPaymentLink: false })]} />);
    expect(screen.getByRole("button", { name: "Gerar links pendentes" })).toBeInTheDocument();
  });
});
