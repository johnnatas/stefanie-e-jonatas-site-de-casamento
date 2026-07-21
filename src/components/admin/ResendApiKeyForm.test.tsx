import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ResendApiKeyForm } from "@/components/admin/ResendApiKeyForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updateResendApiKeyAction: vi.fn(),
}));

describe("ResendApiKeyForm", () => {
  it("shows 'not configured' when no key is set yet and hides the secret-key field", () => {
    render(<ResendApiKeyForm currentApiKeyLast4={null} hasSecretKey={false} />);

    expect(screen.getByText("API Key não configurada.")).toBeInTheDocument();
    expect(screen.queryByLabelText("Chave secreta")).not.toBeInTheDocument();
  });

  it("shows the last 4 characters and the secret-key field when a key already exists", () => {
    render(<ResendApiKeyForm currentApiKeyLast4="abcd" hasSecretKey={true} />);

    expect(screen.getByText("API Key atual: termina em abcd")).toBeInTheDocument();
    expect(screen.getByLabelText("Chave secreta")).toBeInTheDocument();
  });
});
