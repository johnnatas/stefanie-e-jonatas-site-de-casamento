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
  { id: "guest-3", fullName: "Bruno Ferreira Costa" },
];

describe("RsvpSearch", () => {
  it("lists every plausible name suggestion instead of auto-picking one", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");

    expect(await screen.findByRole("button", { name: /JP/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar presença/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /não poderei ir/i })).not.toBeInTheDocument();
  });

  it("does not show action buttons just from typing a full matching name — only after selecting the suggestion", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "JP");

    expect(await screen.findByRole("button", { name: /JP/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /confirmar presença/i })).not.toBeInTheDocument();
  });

  it("populates the field and reveals the action buttons once a suggestion is selected", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /JP/i }));

    expect(screen.getByLabelText(/digite seu nome/i)).toHaveValue("JP");
    expect(screen.getByRole("button", { name: /confirmar presença/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /não poderei ir/i })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "JP" })).not.toBeInTheDocument();
  });

  it("hides the action buttons again if the selected name is edited afterward", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /JP/i }));
    expect(screen.getByRole("button", { name: /confirmar presença/i })).toBeInTheDocument();

    await user.type(screen.getByLabelText(/digite seu nome/i), "x");

    expect(screen.queryByRole("button", { name: /confirmar presença/i })).not.toBeInTheDocument();
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
    await user.click(await screen.findByRole("button", { name: /JP/i }));
    await user.click(screen.getByRole("button", { name: /não poderei ir/i }));

    expect(await screen.findByText(/sentiremos sua falta/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).toHaveBeenCalledWith({
      guestId: "guest-1",
      attendanceStatus: "declined",
    });
  });

  it("offers a way forward instead of a dead end once the response is submitted", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: true,
      message: "Tudo bem, sentiremos sua falta! Obrigado por avisar.",
    });
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /JP/i }));
    await user.click(screen.getByRole("button", { name: /não poderei ir/i }));

    await screen.findByText(/sentiremos sua falta/i);
    expect(screen.getByRole("link", { name: /ver lista de presentes/i })).toHaveAttribute("href", "/presentes");
    expect(screen.getByRole("link", { name: /voltar ao início/i })).toHaveAttribute("href", "/");
  });

  it("reveals the companions/message form and submits with the confirmed status once every companion is identified", async () => {
    confirmRsvpActionMock.mockResolvedValue({
      success: true,
      message: "Presença confirmada com sucesso! Mal podemos esperar para celebrar com você.",
    });
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /JP/i }));
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    const companionsInput = await screen.findByLabelText(/número de acompanhantes/i);
    await user.clear(companionsInput);
    await user.type(companionsInput, "1");
    await user.type(screen.getByLabelText(/nome do acompanhante 1/i), "maria");
    await user.click(await screen.findByRole("button", { name: /maria da silva/i }));
    await user.type(screen.getByLabelText(/mensagem para o casal/i), "Vai ser lindo!");
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    expect(await screen.findByText(/presença confirmada com sucesso/i)).toBeInTheDocument();
    expect(confirmRsvpActionMock).toHaveBeenCalledWith({
      guestId: "guest-1",
      attendanceStatus: "confirmed",
      companionsCount: 1,
      companionGuestIds: ["guest-2"],
      message: "Vai ser lindo!",
    });
  });

  it("keeps the confirm button disabled until every companion slot has a selected, registered guest", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /JP/i }));
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    const companionsInput = await screen.findByLabelText(/número de acompanhantes/i);
    await user.clear(companionsInput);
    await user.type(companionsInput, "2");

    expect(screen.getByRole("button", { name: /confirmar presença/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/nome do acompanhante 1/i), "maria");
    await user.click(await screen.findByRole("button", { name: /maria da silva/i }));

    expect(screen.getByRole("button", { name: /confirmar presença/i })).toBeDisabled();

    await user.type(screen.getByLabelText(/nome do acompanhante 2/i), "bruno");
    await user.click(await screen.findByRole("button", { name: /bruno ferreira costa/i }));

    expect(screen.getByRole("button", { name: /confirmar presença/i })).toBeEnabled();
  });

  it("shows a not-found message for a companion name typed but not selected, and excludes already-chosen guests from other companion suggestions", async () => {
    const user = userEvent.setup();
    render(<RsvpSearch guests={GUESTS} />);

    await user.type(screen.getByLabelText(/digite seu nome/i), "joao");
    await user.click(await screen.findByRole("button", { name: /JP/i }));
    await user.click(screen.getByRole("button", { name: /confirmar presença/i }));

    const companionsInput = await screen.findByLabelText(/número de acompanhantes/i);
    await user.clear(companionsInput);
    await user.type(companionsInput, "2");

    await user.type(screen.getByLabelText(/nome do acompanhante 1/i), "zzzzz");
    expect(await screen.findByText(/não encontramos esse nome na lista de convidados/i)).toBeInTheDocument();

    await user.clear(screen.getByLabelText(/nome do acompanhante 1/i));
    await user.type(screen.getByLabelText(/nome do acompanhante 1/i), "maria");
    await user.click(await screen.findByRole("button", { name: /maria da silva/i }));

    await user.type(screen.getByLabelText(/nome do acompanhante 2/i), "maria");
    expect(screen.queryByRole("button", { name: /maria da silva/i })).not.toBeInTheDocument();
  });
});
