import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RsvpSearch } from "@/components/rsvp/RsvpSearch";

const confirmRsvpActionMock = vi.fn();

vi.mock("@/app/confirmar-presenca/actions", () => ({
  confirmRsvpAction: (...args: unknown[]) => confirmRsvpActionMock(...args),
}));

const GUESTS = [
  { id: "guest-1", fullName: "João Pedro Almeida", nickname: "JP" },
  { id: "guest-2", fullName: "Maria da Silva" },
];

describe("RsvpSearch", () => {
  it("shows a personalized match and action buttons once a close name is typed", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");

    expect(await screen.findByText("JP")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /confirmar presença/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /não poderei ir/i })).toBeInTheDocument();
  });

  it("shows a not-found message when nothing matches", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "xyzxyzxyz");

    expect(await screen.findByText(/não encontramos esse nome/i)).toBeInTheDocument();
  });

  it("declines directly and shows the feedback message", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: true,
      message: "Tudo bem, sentiremos sua falta! Obrigado por avisar.",
    });
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /não poderei ir/i }));

    expect(await screen.findByText(/sentiremos sua falta/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).toHaveBeenCalledWith({
      guestId: "guest-1",
      attendanceStatus: "declined",
    });
  });

  it("reveals the companions/message form and submits with the confirmed status", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: true,
      message: "Presença confirmada com sucesso! Mal podemos esperar para celebrar com você.",
    });
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /confirmar presença/i }));

    const companionsInput = await screen.findByLabelText(/número de acompanhantes/i);
    await user.clear(companionsInput);
    await user.type(companionsInput, "2");
    await user.type(screen.getByLabelText(/mensagem para o casal/i), "Vai ser lindo!");
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    expect(await screen.findByText(/presença confirmada com sucesso/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).toHaveBeenCalledWith({
      guestId: "guest-1",
      attendanceStatus: "confirmed",
      companionsCount: 2,
      message: "Vai ser lindo!",
    });
  });
});
