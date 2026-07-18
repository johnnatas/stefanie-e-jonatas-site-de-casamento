import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RsvpForm } from "@/components/rsvp/RsvpForm";

const confirmRsvpActionMock = vi.fn();

vi.mock("@/app/confirmar-presenca/actions", () => ({
  confirmRsvpAction: (...args: unknown[]) => confirmRsvpActionMock(...args),
}));

describe("RsvpForm", () => {
  it("shows validation errors and does not submit when required fields are empty", async () => {
    const user = userEvent.setup();
    render(<RsvpForm />);

    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    expect(await screen.findByText(/informe seu nome completo/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).not.toHaveBeenCalled();
  });

  it("submits valid data and shows the success message", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: true,
      message: "Presença confirmada com sucesso!",
    });
    const user = userEvent.setup();
    render(<RsvpForm />);

    await user.type(screen.getByLabelText(/nome completo/i), "Maria Souza");
    await user.type(screen.getByLabelText(/e-mail/i), "maria@example.com");
    await user.type(screen.getByLabelText(/telefone/i), "11999998888");
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    expect(await screen.findByText(/presença confirmada com sucesso/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).toHaveBeenCalledWith(
      expect.objectContaining({ fullName: "Maria Souza", email: "maria@example.com" })
    );
  });

  it("shows the error message returned by the action when submission fails", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: false,
      message: "Não foi possível confirmar sua presença agora.",
    });
    const user = userEvent.setup();
    render(<RsvpForm />);

    await user.type(screen.getByLabelText(/nome completo/i), "Maria Souza");
    await user.type(screen.getByLabelText(/e-mail/i), "maria@example.com");
    await user.type(screen.getByLabelText(/telefone/i), "11999998888");
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    expect(await screen.findByText(/não foi possível confirmar/i)).toBeInTheDocument();
  });
});
