import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntegracoesTabs } from "@/components/admin/IntegracoesTabs";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updatePaymentProviderAction: vi.fn(),
  updateMercadoPagoTokenAction: vi.fn(),
  updateResendApiKeyAction: vi.fn(),
  updateSecretKeyAction: vi.fn(),
  requestSecretKeyResetAction: vi.fn(),
  resetSecretKeyWithTokenAction: vi.fn(),
}));

const baseProps = {
  activePaymentProvider: "mercado_pago" as const,
  infinitePayHandle: null,
  mercadoPagoAccessTokenLast4: "1234",
  resendApiKeyLast4: null,
  hasSecretKey: true,
};

describe("IntegracoesTabs", () => {
  it("shows the Mercado Pago form on the Pagamento tab by default when it's the active provider", () => {
    render(<IntegracoesTabs {...baseProps} />);

    expect(screen.getByRole("heading", { name: "Mercado Pago" })).toBeInTheDocument();
  });

  it("hides the Mercado Pago form when Infinite Pay is the active provider", () => {
    render(<IntegracoesTabs {...baseProps} activePaymentProvider="infinite_pay" />);

    expect(screen.queryByRole("heading", { name: "Mercado Pago" })).not.toBeInTheDocument();
  });

  it("switches to the Notificações tab and shows the Resend form", async () => {
    const user = userEvent.setup();
    render(<IntegracoesTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "Notificações" }));

    expect(screen.getByRole("heading", { name: "Resend (e-mails)" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Mercado Pago" })).not.toBeInTheDocument();
  });

  it("switches to the Segurança tab and shows the secret key form", async () => {
    const user = userEvent.setup();
    render(<IntegracoesTabs {...baseProps} />);

    await user.click(screen.getByRole("tab", { name: "Segurança" }));

    expect(screen.getByRole("heading", { name: "Chave secreta de segurança" })).toBeInTheDocument();
  });

  it("opens on the Segurança tab and shows the reset form when a reset token is present", () => {
    render(<IntegracoesTabs {...baseProps} resetToken="abc123" />);

    expect(screen.getByRole("tab", { name: "Segurança", selected: true })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Definir nova chave secreta" })).toBeInTheDocument();
  });
});
