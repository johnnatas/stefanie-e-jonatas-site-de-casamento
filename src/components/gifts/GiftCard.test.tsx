import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftCard } from "@/components/gifts/GiftCard";
import { GiftDto } from "@/components/gifts/GiftDto";

const createGiftContributionActionMock = vi.fn();

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: (...args: unknown[]) => createGiftContributionActionMock(...args),
  initialGiftContributionActionState: { status: "idle" },
}));

const availableGift: GiftDto = {
  id: "gift-1",
  name: "Air fryer",
  description: "Air fryer 5L",
  price: 450,
  category: "cozinha",
  status: "available",
};

describe("GiftCard", () => {
  it("shows a status badge instead of the button when the gift is not available", () => {
    render(<GiftCard gift={{ ...availableGift, status: "paid" }} />);

    expect(screen.getByText("Presenteado")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /presentear/i })).not.toBeInTheDocument();
  });

  it("reveals the contribution form when 'Presentear' is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} />);

    await user.click(screen.getByRole("button", { name: /presentear/i }));

    expect(screen.getByPlaceholderText("Seu nome")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Seu e-mail")).toBeInTheDocument();
  });

  it("shows the error message returned by the action when the contribution fails", async () => {
    createGiftContributionActionMock.mockResolvedValue({
      status: "error",
      message: "Esse presente já foi escolhido por outra pessoa.",
    });
    const user = userEvent.setup();
    render(<GiftCard gift={availableGift} />);

    await user.click(screen.getByRole("button", { name: /presentear/i }));
    await user.type(screen.getByPlaceholderText("Seu nome"), "Carla Nunes");
    await user.type(screen.getByPlaceholderText("Seu e-mail"), "carla@example.com");
    await user.click(screen.getByRole("button", { name: /ir para pagamento/i }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Esse presente já foi escolhido por outra pessoa."
    );
  });
});
