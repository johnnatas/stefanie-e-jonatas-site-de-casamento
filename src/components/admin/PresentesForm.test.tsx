// src/components/admin/PresentesForm.test.tsx
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PresentesForm } from "@/components/admin/PresentesForm";

const updatePresentesActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/conteudo/presentes/actions", () => ({
  updatePresentesAction: (...args: unknown[]) => updatePresentesActionMock(...args),
}));

describe("PresentesForm", () => {
  it("renders the photo field with the current background image", () => {
    render(<PresentesForm defaultValues={{ backgroundImage: "https://example.com/bg.jpg" }} />);
    expect(screen.getByAltText("Imagem de fundo")).toHaveAttribute("src", "https://example.com/bg.jpg");
  });

  it("renders the photo field with no current image", () => {
    render(<PresentesForm defaultValues={{ backgroundImage: null }} />);
    expect(screen.getByRole("button", { name: "Salvar" })).toBeInTheDocument();
  });

  it("shows the error message returned by the action when saving fails", async () => {
    updatePresentesActionMock.mockResolvedValue({ status: "error", message: "Não foi possível salvar agora." });
    const user = userEvent.setup();
    render(<PresentesForm defaultValues={{ backgroundImage: null }} />);

    await user.click(screen.getByRole("button", { name: "Salvar" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível salvar agora.");
  });
});
