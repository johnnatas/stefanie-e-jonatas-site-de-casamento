import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { GiftFiltersBar } from "@/components/gifts/GiftFiltersBar";

const shareOrCopyLinkMock = vi.fn();
vi.mock("@/shared/utils/shareOrCopyLink", () => ({
  shareOrCopyLink: (...args: unknown[]) => shareOrCopyLinkMock(...args),
}));

const pushMock = vi.fn();
let currentSearchParams = new URLSearchParams();

vi.mock("next/navigation", () => ({
  useRouter: vi.fn(),
  usePathname: vi.fn(),
  useSearchParams: vi.fn(),
}));

beforeEach(() => {
  pushMock.mockReset();
  shareOrCopyLinkMock.mockReset();
  currentSearchParams = new URLSearchParams();
  vi.mocked(useRouter).mockReturnValue({ push: pushMock } as unknown as ReturnType<typeof useRouter>);
  vi.mocked(usePathname).mockReturnValue("/presentes");
  vi.mocked(useSearchParams).mockImplementation(
    () => currentSearchParams as unknown as ReturnType<typeof useSearchParams>
  );
});

describe("GiftFiltersBar", () => {
  it("opens the category dropdown and lists every category as an option", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={["casa", "cozinha"]} />);

    await user.click(screen.getAllByRole("button", { name: /categoria/i })[0]);

    expect(screen.getAllByRole("option", { name: "casa" })[0]).toHaveAttribute("aria-selected", "false");
    expect(screen.getAllByRole("option", { name: "cozinha" })[0]).toHaveAttribute("aria-selected", "false");
  });

  it("pushes a categoria param when a category option is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={["casa", "cozinha"]} />);

    await user.click(screen.getAllByRole("button", { name: /categoria/i })[0]);
    await user.click(screen.getAllByRole("option", { name: "casa" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/presentes?categoria=casa");
  });

  it("pushes a situacao param when a status option is chosen from the custom dropdown", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.click(screen.getAllByRole("button", { name: /situação/i })[0]);
    await user.click(screen.getAllByRole("option", { name: "Disponível" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/presentes?situacao=available");
  });

  it("does not push a q param while typing (no dynamic/debounced filtering)", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.type(screen.getAllByLabelText("Buscar")[0], "air fryer");

    expect(pushMock).not.toHaveBeenCalled();
  });

  it("pushes a q param when the Buscar button is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.type(screen.getAllByLabelText("Buscar")[0], "air fryer");
    await user.click(screen.getAllByRole("button", { name: "Buscar" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/presentes?q=air+fryer");
  });

  it("pushes a q param when Enter is pressed in the search field", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.type(screen.getAllByLabelText("Buscar")[0], "air fryer{Enter}");

    expect(pushMock).toHaveBeenCalledWith("/presentes?q=air+fryer");
  });

  it("does not push category/situacao/ordenar changes immediately on mobile — only when Aplicar is clicked", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={["casa", "cozinha"]} />);

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    await user.click(screen.getAllByRole("button", { name: /situação/i })[1]);
    await user.click(screen.getAllByRole("option", { name: "Disponível" })[0]);

    expect(pushMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(pushMock).toHaveBeenCalledWith("/presentes?situacao=available");
  });

  it("clears every filter param but preserves an existing status param", async () => {
    currentSearchParams = new URLSearchParams("q=air&situacao=available&status=sucesso");
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.click(screen.getAllByRole("button", { name: "Limpar filtros" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/presentes?status=sucesso");
  });

  it("calls shareOrCopyLink with the current URL when 'Compartilhar' is clicked", async () => {
    shareOrCopyLinkMock.mockResolvedValue("shared");
    Object.defineProperty(window, "location", {
      value: new URL("https://sjcasamento.site/presentes?situacao=available"),
      writable: true,
    });
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.click(screen.getAllByRole("button", { name: "Compartilhar" })[0]);

    expect(shareOrCopyLinkMock).toHaveBeenCalledWith(
      expect.objectContaining({ url: "https://sjcasamento.site/presentes?situacao=available" })
    );
  });

  it("opens a focus-trapped panel on mobile via the Filtros button, closable via its close control", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filtros" }));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Fechar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
