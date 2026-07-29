import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftDetailsModal } from "@/components/gifts/GiftDetailsModal";
import { GiftDto } from "@/components/gifts/GiftDto";
import { formatCurrency } from "@/shared/utils/formatCurrency";

const createGiftContributionActionMock = vi.fn();
const reserveGiftForLaterActionMock = vi.fn();
const shareOrCopyLinkMock = vi.fn();

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: (...args: unknown[]) => createGiftContributionActionMock(...args),
  reserveGiftForLaterAction: (...args: unknown[]) => reserveGiftForLaterActionMock(...args),
}));

vi.mock("@/shared/utils/shareOrCopyLink", () => ({
  shareOrCopyLink: (...args: unknown[]) => shareOrCopyLinkMock(...args),
}));

const gift: GiftDto = {
  id: "gift-1",
  name: "Air fryer",
  description: "Air fryer 5L",
  imageUrl: null,
  price: 450,
  category: "cozinha",
  status: "available",
};

describe("GiftDetailsModal", () => {
  beforeEach(() => {
    createGiftContributionActionMock.mockReset();
    reserveGiftForLaterActionMock.mockReset();
    shareOrCopyLinkMock.mockReset();
  });

  it("shows the gift name, price, both action buttons, and the payment icons in the initial view", () => {
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Air fryer" })).toBeInTheDocument();
    expect(screen.getByText(/R\$ 450/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /presentear agora/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /reservar para depois/i })).toBeInTheDocument();
    expect(screen.getByAltText("Visa")).toBeInTheDocument();
    expect(screen.getByAltText("Mastercard")).toBeInTheDocument();
    expect(screen.getByAltText("Boleto")).toBeInTheDocument();
    expect(screen.getByAltText("Pix")).toBeInTheDocument();
    expect(screen.getByText("Parcelamento disponível")).toBeInTheDocument();
  });

  it("hides the 'Reservar para depois' button when canReserveForLater is false", () => {
    render(<GiftDetailsModal gift={gift} canReserveForLater={false} onClose={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /reservar para depois/i })).not.toBeInTheDocument();
  });

  it("reveals the immediate-checkout form when 'Presentear agora' is clicked, hiding the payment icons", async () => {
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));

    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Seu e-mail")).toBeInTheDocument();
    expect(screen.queryByAltText("Visa")).not.toBeInTheDocument();
  });

  it("shows the error message returned by the action when the immediate contribution fails", async () => {
    createGiftContributionActionMock.mockResolvedValue({
      status: "error",
      message: "Esse presente já foi escolhido por outra pessoa.",
    });
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /presentear agora/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    await user.click(screen.getByRole("button", { name: /ir para pagamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse presente já foi escolhido por outra pessoa."
    );
  });

  it("associates a label with the name and email fields in the reserve-for-later form", async () => {
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: /reservar para depois/i }));
    expect(screen.getByLabelText("Seu nome")).toBeInTheDocument();
    expect(screen.getByLabelText("Seu e-mail")).toBeInTheDocument();
  });

  it("shows a confirmation view with a payment link after reserving for later; 'Voltar' returns to the initial view without closing the modal", async () => {
    reserveGiftForLaterActionMock.mockResolvedValue({
      status: "success",
      checkoutUrl: "https://mercadopago.test/checkout",
      guestName: "Carla Nunes",
      expectedPaymentDate: "2027-05-01",
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

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
    expect(screen.getByRole("button", { name: /presentear agora/i })).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("calls onClose when the close control is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the backdrop is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.click(screen.getByRole("dialog").parentElement!);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes the modal on Escape when no confirmation is showing", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dismisses the confirmation on Escape instead of closing the modal", async () => {
    reserveGiftForLaterActionMock.mockResolvedValue({
      status: "success",
      checkoutUrl: "https://mercadopago.test/checkout",
      guestName: "Carla Nunes",
      expectedPaymentDate: "2027-05-01",
    });
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={onClose} />);

    await user.click(screen.getByRole("button", { name: /reservar para depois/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    fireEvent.change(screen.getByLabelText("Quando pretende pagar?"), { target: { value: "2027-05-01" } });
    await user.click(screen.getByRole("button", { name: /reservar presente/i }));

    expect(await screen.findByText("Presente reservado!")).toBeInTheDocument();

    await user.keyboard("{Escape}");

    expect(screen.queryByText("Presente reservado!")).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("shares a link containing the gift id when 'Compartilhar' is clicked", async () => {
    shareOrCopyLinkMock.mockResolvedValue("shared");
    Object.defineProperty(window, "location", {
      value: new URL("https://sjcasamento.site/presentes"),
      writable: true,
    });
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(shareOrCopyLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Air fryer",
        url: expect.stringContaining("presente=gift-1"),
      })
    );
  });

  it("shows 'Link copiado!' feedback when the share falls back to clipboard copy", async () => {
    shareOrCopyLinkMock.mockResolvedValue("copied");
    Object.defineProperty(window, "location", {
      value: new URL("https://sjcasamento.site/presentes"),
      writable: true,
    });
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Compartilhar" }));

    expect(await screen.findByRole("button", { name: "Link copiado!" })).toBeInTheDocument();
  });
});

describe("GiftDetailsModal guest phone field", () => {
  it("masks the phone number as the guest types, and the field is optional", async () => {
    const user = userEvent.setup();
    render(<GiftDetailsModal gift={gift} canReserveForLater onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "Presentear agora" }));
    const phoneInput = screen.getByLabelText(/telefone/i);
    expect(phoneInput).not.toBeRequired();

    await user.type(phoneInput, "11987654321");
    expect(phoneInput).toHaveValue("(11)98765-4321");
  });
});
