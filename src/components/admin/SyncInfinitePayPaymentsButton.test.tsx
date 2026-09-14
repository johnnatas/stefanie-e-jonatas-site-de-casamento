import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SyncInfinitePayPaymentsButton } from "@/components/admin/SyncInfinitePayPaymentsButton";

const syncActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/syncInfinitePayPaymentsAction", () => ({
  syncInfinitePayPaymentsAction: (...args: unknown[]) => syncActionMock(...args),
}));

describe("SyncInfinitePayPaymentsButton", () => {
  it("shows the exact required label", () => {
    render(<SyncInfinitePayPaymentsButton />);

    expect(screen.getByRole("button", { name: "Atualizar status de pagamento" })).toBeInTheDocument();
  });

  it("shows the result message after the action resolves", async () => {
    syncActionMock.mockResolvedValue({ status: "success", message: "3 verificado(s), 1 atualizado(s)." });
    const user = userEvent.setup();
    render(<SyncInfinitePayPaymentsButton />);

    await user.click(screen.getByRole("button", { name: "Atualizar status de pagamento" }));

    expect(await screen.findByText("3 verificado(s), 1 atualizado(s).")).toBeInTheDocument();
  });
});
