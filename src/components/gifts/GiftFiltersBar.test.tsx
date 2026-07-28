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
  it("renders every category as a checkbox", () => {
    render(<GiftFiltersBar categories={["casa", "cozinha"]} />);
    expect(screen.getAllByRole("checkbox", { name: "casa" })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "cozinha" })[0]).toBeInTheDocument();
  });

  it("pushes a categoria param when a category checkbox is checked", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={["casa", "cozinha"]} />);

    await user.click(screen.getAllByRole("checkbox", { name: "casa" })[0]);

    expect(pushMock).toHaveBeenCalledWith("/presentes?categoria=casa");
  });

  it("pushes a situacao param when the status select changes", async () => {
    const user = userEvent.setup();
    render(<GiftFiltersBar categories={[]} />);

    await user.selectOptions(screen.getAllByLabelText("Situação")[0], "available");

    expect(pushMock).toHaveBeenCalledWith("/presentes?situacao=available");
  });

  it("pushes a q param after the debounce delay once the user stops typing", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const user = userEvent.setup({ delay: null, advanceTimers: vi.advanceTimersByTime });
    render(<GiftFiltersBar categories={[]} />);

    await user.type(screen.getAllByLabelText("Buscar")[0], "air fryer");
    expect(pushMock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);

    expect(pushMock).toHaveBeenCalledWith("/presentes?q=air+fryer");
    vi.useRealTimers();
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
