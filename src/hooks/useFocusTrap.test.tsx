import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef } from "react";
import { useFocusTrap } from "@/hooks/useFocusTrap";

function TestDialog({ isActive, onClose }: { isActive: boolean; onClose: () => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, isActive, onClose);

  return (
    <div ref={containerRef} role="dialog" aria-modal="true">
      <button>First</button>
      <button>Last</button>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("moves focus to the first focusable element when activated", () => {
    render(<TestDialog isActive onClose={vi.fn()} />);

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<TestDialog isActive onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("wraps Tab from the last element back to the first", async () => {
    const user = userEvent.setup();
    render(<TestDialog isActive onClose={vi.fn()} />);

    screen.getByRole("button", { name: "Last" }).focus();
    await user.tab();

    expect(screen.getByRole("button", { name: "First" })).toHaveFocus();
  });

  it("wraps Shift+Tab from the first element back to the last", async () => {
    const user = userEvent.setup();
    render(<TestDialog isActive onClose={vi.fn()} />);

    await user.tab({ shift: true });

    expect(screen.getByRole("button", { name: "Last" })).toHaveFocus();
  });
});
