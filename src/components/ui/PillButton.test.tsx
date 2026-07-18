import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PillButton } from "@/components/ui/PillButton";

describe("PillButton", () => {
  it("renders as a link when href is provided", () => {
    render(<PillButton href="/confirmar-presenca">Confirme sua presença</PillButton>);

    const link = screen.getByRole("link", { name: "Confirme sua presença" });
    expect(link).toHaveAttribute("href", "/confirmar-presenca");
  });

  it("renders as a button and fires onClick when href is not provided", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PillButton onClick={onClick} variant="secondary">
        Não poderei ir
      </PillButton>
    );

    const button = screen.getByRole("button", { name: "Não poderei ir" });
    await user.click(button);

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("disables the button and blocks clicks when disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <PillButton onClick={onClick} disabled>
        Enviando...
      </PillButton>
    );

    const button = screen.getByRole("button", { name: "Enviando..." });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
