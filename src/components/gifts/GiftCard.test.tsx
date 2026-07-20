import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftCard } from "@/components/gifts/GiftCard";
import { GiftDto } from "@/components/gifts/GiftDto";

const createGiftContributionActionMock = vi.fn();
const reserveGiftForLaterActionMock = vi.fn();

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: (...args: unknown[]) => createGiftContributionActionMock(...args),
  reserveGiftForLaterAction: (...args: unknown[]) => reserveGiftForLaterActionMock(...args),
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
  it("shows a status badge instead of the buttons when the gift is not available", () => {
    render(<GiftCard gift={{ ...availableGift, status: "paid" }} canReserveForLater />);

    expect(screen.getByText("Presenteado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /presentear agora/i })).not.toBeInTheDocument();
  });

  it("reveals the immediate-checkout form when 'Presentear agora' is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));

    expect(screen.getByPlaceholderText("Seu nome")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Seu e-mail")).toBeInTheDocument();
  });

  it("shows the error message returned by the action when the immediate contribution fails", async () => {
    createGiftContributionActionMock.mockResolvedValue({
      status: "error",
      message: "Esse presente já foi escolhido por outra pessoa.",
    });
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    await user.click(screen.getByRole("button", { name: /ir para pagamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse presente já foi escolhido por outra pessoa."
    );
  });

  it("hides the 'Reservar para depois' button when canReserveForLater is false", () => {
    render(<GiftCard gift={availableGift} canReserveForLater={false} />);

    expect(screen.queryByRole("button", { name: /reservar para depois/i })).not.toBeInTheDocument();
  });

  it("shows a confirmation modal with a payment link after reserving for later, and 'Voltar' closes it", async () => {
    reserveGiftForLaterActionMock.mockResolvedValue({
      status: "success",
      checkoutUrl: "https://mercadopago.test/checkout",
      guestName: "Carla Nunes",
      expectedPaymentDate: "2027-05-01",
    });
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} canReserveForLater />);

    await user.click(screen.getByRole("button", { name: /reservar para depois/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    fireEvent.change(screen.getByLabelText("Quando pretende pagar?"), { target: { value: "2027-05-01" } });
    await user.click(screen.getByRole("button", { name: /reservar presente/i }));

    expect(await screen.findByText("Presente reservado!")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ir para pagamento/i })).toHaveAttribute(
      "href",
      "https://mercadopago.test/checkout"
    );

    await user.click(screen.getByRole("button", { name: /voltar/i }));

    expect(screen.queryByText("Presente reservado!")).not.toBeInTheDocument();
  });
});
