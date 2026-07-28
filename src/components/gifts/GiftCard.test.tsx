import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftCard } from "@/components/gifts/GiftCard";
import { GiftDto } from "@/components/gifts/GiftDto";
import { formatCurrency } from "@/shared/utils/formatCurrency";

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: vi.fn(),
  reserveGiftForLaterAction: vi.fn(),
}));

const availableGift: GiftDto = {
  id: "gift-1",
  name: "Air fryer",
  description: "Air fryer 5L",
  imageUrl: null,
  price: 450,
  category: "cozinha",
  status: "available",
};

describe("GiftCard", () => {
  it("shows the name, price, and a 'Ver detalhes' button for an available gift", () => {
    render(<GiftCard gift={availableGift} canReserveForLater />);

    expect(screen.getByRole("heading", { name: "Air fryer" })).toBeInTheDocument();
    expect(screen.getByText(/450,00/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ver detalhes" })).toBeInTheDocument();
  });

  it("shows a status badge instead of the button when the gift is not available", () => {
    render(<GiftCard gift={{ ...availableGift, status: "paid" }} canReserveForLater />);

    expect(screen.getByText("Presenteado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ver detalhes" })).not.toBeInTheDocument();
  });

  it("does not render the modal until 'Ver detalhes' is clicked", () => {
    render(<GiftCard gift={availableGift} canReserveForLater />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens the details modal when 'Ver detalhes' is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: "Ver detalhes" }));

    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("closes the modal when its close control is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: "Ver detalhes" }));
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
