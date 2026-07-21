import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MobileMenu } from "@/components/layout/MobileMenu";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

describe("MobileMenu", () => {
  it("exposes itself as a dialog when open", () => {
    render(<MobileMenu isOpen onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Menu" })).toBeInTheDocument();
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<MobileMenu isOpen onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(<MobileMenu isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
