import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MercadoPagoTokenForm } from "@/components/admin/MercadoPagoTokenForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updateMercadoPagoTokenAction: vi.fn(),
}));

describe("MercadoPagoTokenForm", () => {
  it("shows 'not configured' when no token is set yet and hides the secret-key field", () => {
    render(<MercadoPagoTokenForm currentTokenLast4={null} hasSecretKey={false} />);

    expect(screen.getByText("Access Token não configurado.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Chave secreta")).not.toBeInTheDocument();
  });

  it("shows the last 4 characters and the secret-key field when a token and key already exist", () => {
    render(<MercadoPagoTokenForm currentTokenLast4="0beb" hasSecretKey={true} />);

    expect(screen.getByText("Access Token atual: termina em 0beb")).toBeInTheDocument();
    expect(screen.getByLabelText("Chave secreta")).toBeInTheDocument();
  });
});
