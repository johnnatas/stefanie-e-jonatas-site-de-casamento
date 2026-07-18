import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCountdown } from "@/hooks/useCountdown";

describe("useCountdown", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00-03:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("computes the remaining time towards the target date after mounting", () => {
    const { result } = renderHook(() => useCountdown("2026-01-02T00:00:00-03:00"));

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current.days).toBe(1);
    expect(result.current.hours).toBe(0);
  });

  it("ticks down as time advances", () => {
    const { result } = renderHook(() => useCountdown("2026-01-01T01:00:00-03:00"));

    act(() => {
      vi.advanceTimersByTime(60 * 1000);
    });

    expect(result.current.minutes).toBe(59);
  });

  it("never returns a negative value once the target date has passed", () => {
    const { result } = renderHook(() => useCountdown("2025-12-31T00:00:00-03:00"));

    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(result.current).toEqual({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  });
});
