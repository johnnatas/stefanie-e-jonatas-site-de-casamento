import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PaymentProviderForm } from "@/components/admin/PaymentProviderForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updatePaymentProviderAction: vi.fn(),
}));

describe("PaymentProviderForm", () => {
  it("shows the Infinite Pay handle field only when Infinite Pay is selected", async () => {
    const user = userEvent.setup();
    render(<PaymentProviderForm activeProvider="mercado_pago" infinitePayHandle={null} />);

    expect(screen.queryByLabelText(/handle/i)).not.toBeInTheDocument();

    await user.click(screen.getByLabelText("Infinite Pay"));

    expect(screen.getByLabelText(/handle/i)).toBeInTheDocument();
  });

  it("pre-fills the handle field when one is already stored", () => {
    render(<PaymentProviderForm activeProvider="infinite_pay" infinitePayHandle="meu_handle" />);

    expect(screen.getByLabelText(/handle/i)).toHaveValue("meu_handle");
  });
});
