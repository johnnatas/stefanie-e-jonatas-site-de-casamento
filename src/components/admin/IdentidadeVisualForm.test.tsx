import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IdentidadeVisualForm } from "@/components/admin/IdentidadeVisualForm";

const updateIdentidadeVisualActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/conteudo/identidade-visual/actions", () => ({
  updateIdentidadeVisualAction: (...args: unknown[]) => updateIdentidadeVisualActionMock(...args),
}));

describe("IdentidadeVisualForm", () => {
  it("renders both logo fields with their current images", () => {
    render(
      <IdentidadeVisualForm
        defaultValues={{
          logoDark: "https://example.com/logo-dark.png",
          logoLight: "https://example.com/logo-light.png",
        }}
      />
    );

    expect(screen.getByAltText("Logo (versão escura)")).toHaveAttribute(
      "src",
      "https://example.com/logo-dark.png"
    );
    expect(screen.getByAltText("Logo (versão clara)")).toHaveAttribute(
      "src",
      "https://example.com/logo-light.png"
    );
  });

  it("renders both fields empty when no logo was uploaded yet", () => {
    render(<IdentidadeVisualForm defaultValues={{ logoDark: null, logoLight: null }} />);

    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
    expect(screen.queryByAltText("Logo (versão escura)")).not.toBeInTheDocument();
    expect(screen.queryByAltText("Logo (versão clara)")).not.toBeInTheDocument();
  });

  it("shows the error message returned by the action when saving fails", async () => {
    updateIdentidadeVisualActionMock.mockResolvedValue({
      status: "error",
      message: "Não foi possível salvar agora.",
    });
    const user = userEvent.setup();
    render(<IdentidadeVisualForm defaultValues={{ logoDark: null, logoLight: null }} />);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar agora.");
  });
});
