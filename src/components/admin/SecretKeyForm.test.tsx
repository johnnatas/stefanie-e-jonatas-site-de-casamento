import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SecretKeyForm } from "@/components/admin/SecretKeyForm";

vi.mock("@/app/admin/(protected)/integracoes/actions", () => ({
  updateSecretKeyAction: vi.fn(),
  requestSecretKeyResetAction: vi.fn(),
}));

describe("SecretKeyForm", () => {
  it("hides the 'chave atual' field on first-time setup", () => {
    render(<SecretKeyForm hasSecretKey={false} />);

    expect(screen.queryByLabelText("Chave atual")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Definir chave" })).toBeInTheDocument();
  });

  it("shows the 'chave atual' field once a key already exists", () => {
    render(<SecretKeyForm hasSecretKey={true} />);

    expect(screen.getByLabelText("Chave atual")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Trocar chave" })).toBeInTheDocument();
  });

  it("shows the 'esqueceu a chave secreta' link only once a key already exists", () => {
    const { rerender } = render(<SecretKeyForm hasSecretKey={false} />);
    expect(screen.queryByRole("button", { name: "Esqueceu a chave secreta?" })).not.toBeInTheDocument();

    rerender(<SecretKeyForm hasSecretKey={true} />);
    expect(screen.getByRole("button", { name: "Esqueceu a chave secreta?" })).toBeInTheDocument();
  });
});
