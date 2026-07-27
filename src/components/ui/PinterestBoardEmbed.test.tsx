import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  PinterestBoardEmbed,
  __resetPinterestAutoScanStateForTests,
} from "@/components/ui/PinterestBoardEmbed";

describe("PinterestBoardEmbed", () => {
  beforeEach(() => {
    __resetPinterestAutoScanStateForTests();
    vi.useFakeTimers();
  });

  afterEach(() => {
    delete (window as { PinUtils?: unknown }).PinUtils;
    vi.useRealTimers();
  });

  it("does not call build() immediately when the script has only just become available (avoids racing Pinterest's own first-load auto-scan)", async () => {
    const build = vi.fn();
    window.PinUtils = { build };

    render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);
    await vi.advanceTimersByTimeAsync(250);

    expect(build).not.toHaveBeenCalled();
  });

  it("calls window.PinUtils.build() with its own container once the first-load grace period passes", async () => {
    const build = vi.fn();
    window.PinUtils = { build };

    const { container } = render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);
    await vi.advanceTimersByTimeAsync(2000);

    expect(build).toHaveBeenCalledWith(container.firstChild);
  });

  it("calls build() immediately (no grace wait) once the script has already been loaded for a while", async () => {
    const build = vi.fn();
    window.PinUtils = { build };

    const first = render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);
    await vi.advanceTimersByTimeAsync(2000);
    build.mockClear();
    first.unmount();

    const { container } = render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);
    await vi.advanceTimersByTimeAsync(250);

    expect(build).toHaveBeenCalledWith(container.firstChild);
  });

  it("retries until window.PinUtils becomes available", async () => {
    const build = vi.fn();
    render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);

    expect(build).not.toHaveBeenCalled();
    window.PinUtils = { build };
    await vi.advanceTimersByTimeAsync(2000);

    expect(build).toHaveBeenCalled();
  });

  it("stops retrying once an iframe is already present (e.g. Pinterest's own first-load auto-scan already embedded it)", async () => {
    const build = vi.fn();
    window.PinUtils = { build };

    const { container } = render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);
    const iframe = document.createElement("iframe");
    container.firstChild?.appendChild(iframe);

    await vi.advanceTimersByTimeAsync(2000);

    expect(build).not.toHaveBeenCalled();
  });

  it("shows a styled default label instead of the raw board URL", () => {
    render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" />);

    const link = screen.getByRole("link", { name: "Ver inspirações no Pinterest" });
    expect(link).toHaveAttribute("href", "https://br.pinterest.com/user/board/");
    expect(screen.queryByText("https://br.pinterest.com/user/board/")).not.toBeInTheDocument();
  });

  it("shows a custom label when provided", () => {
    render(<PinterestBoardEmbed boardUrl="https://br.pinterest.com/user/board/" label="Inspirações para ele" />);

    expect(screen.getByRole("link", { name: "Inspirações para ele" })).toBeInTheDocument();
  });
});
