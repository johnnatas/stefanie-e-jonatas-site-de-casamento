import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountdownTimer } from "@/components/home/CountdownTimer";

describe("CountdownTimer", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("hides the ticking digits from assistive tech and exposes a single days-remaining summary instead", () => {
    render(<CountdownTimer weddingDateIso="2026-01-03T00:00:00-03:00" />);

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(screen.getByText("02")).toBeInTheDocument();
    expect(screen.getByText("02").closest("[aria-hidden='true']")).toBeInTheDocument();
    expect(screen.getByText("Faltam 2 dias para o casamento.")).toBeInTheDocument();
  });

  it("does not re-announce every second while the digits tick", () => {
    render(<CountdownTimer weddingDateIso="2026-01-03T00:00:00-03:00" />);

    act(() => {
      vi.advanceTimersByTime(3000);
    });

    expect(document.querySelectorAll('[aria-live="polite"]')).toHaveLength(1);
  });
});
