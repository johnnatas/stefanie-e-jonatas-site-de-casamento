import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GiftForm } from "@/components/admin/GiftForm";

const upsertGiftActionMock = vi.fn();
const fetchGiftLinkMetadataActionMock = vi.fn();

vi.mock("@/app/admin/(protected)/presentes/actions", () => ({
  upsertGiftAction: (...args: unknown[]) => upsertGiftActionMock(...args),
}));

vi.mock("@/app/admin/(protected)/presentes/linkAutofillAction", () => ({
  fetchGiftLinkMetadataAction: (...args: unknown[]) => fetchGiftLinkMetadataActionMock(...args),
}));

describe("GiftForm", () => {
  it("fills name, price, and photo preview when the link fetch succeeds", async () => {
    fetchGiftLinkMetadataActionMock.mockResolvedValue({
      status: "success",
      title: "Liquidificador Turbo 3000",
      price: 249.9,
      imageUrl: "https://storage.example.com/gifts/link-import.jpg",
    });
    const user = userEvent.setup();
    render(<GiftForm />);

    await user.type(screen.getByLabelText("Link do produto (opcional)"), "https://loja.example.com/produto/1");
    await user.click(screen.getByRole("button", { name: "Buscar dados do link" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Nome")).toHaveValue("Liquidificador Turbo 3000");
    });
    expect(screen.getByLabelText("Valor (R$)")).toHaveValue(249.9);
    expect(screen.getByText("Título, valor e imagem encontrados.")).toBeInTheDocument();
  });

  it("shows an error message when the link fetch fails, without touching the form fields", async () => {
    fetchGiftLinkMetadataActionMock.mockResolvedValue({
      status: "error",
      message: "Não foi possível buscar dados desse link.",
    });
    const user = userEvent.setup();
    render(<GiftForm />);

    await user.type(screen.getByLabelText("Link do produto (opcional)"), "https://loja.example.com/produto/2");
    await user.click(screen.getByRole("button", { name: "Buscar dados do link" }));

    await waitFor(() => {
      expect(screen.getByText("Não foi possível buscar dados desse link.")).toBeInTheDocument();
    });
    expect(screen.getByLabelText("Nome")).toHaveValue("");
    expect(upsertGiftActionMock).not.toHaveBeenCalled();
  });

  it("fills only what was found and reports what's missing", async () => {
    fetchGiftLinkMetadataActionMock.mockResolvedValue({
      status: "success",
      title: "Produto Simples",
    });
    const user = userEvent.setup();
    render(<GiftForm />);

    await user.type(screen.getByLabelText("Link do produto (opcional)"), "https://loja.example.com/produto/3");
    await user.click(screen.getByRole("button", { name: "Buscar dados do link" }));

    await waitFor(() => {
      expect(screen.getByLabelText("Nome")).toHaveValue("Produto Simples");
    });
    expect(screen.getByText(/Preencha valor, imagem manualmente\./)).toBeInTheDocument();
  });

  it("shows a category select with existing categories when there are any", () => {
    render(<GiftForm existingCategories={["cozinha", "casa"]} />);

    const select = screen.getByLabelText("Categoria");
    expect(select.tagName).toBe("SELECT");
    expect(screen.getByRole("option", { name: "cozinha" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "casa" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "+ Nova categoria" })).toBeInTheDocument();
  });

  it("switches to a free-text category input when '+ Nova categoria' is chosen", async () => {
    const user = userEvent.setup();
    render(<GiftForm existingCategories={["cozinha"]} />);

    await user.selectOptions(screen.getByLabelText("Categoria"), "+ Nova categoria");

    expect(screen.getByLabelText("Categoria").tagName).toBe("INPUT");
    expect(screen.getByRole("button", { name: "Escolher existente" })).toBeInTheDocument();
  });

  it("falls back to a free-text category input when there are no existing categories yet", () => {
    render(<GiftForm />);

    expect(screen.getByLabelText("Categoria").tagName).toBe("INPUT");
  });
});
