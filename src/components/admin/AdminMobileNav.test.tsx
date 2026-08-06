import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminMobileNav } from "@/components/admin/AdminMobileNav";
import { HomeIcon, GiftIcon } from "@/components/admin/icons";

vi.mock("next/navigation", () => ({
  usePathname: () => "/admin/presentes",
}));

const GROUPS = [
  { label: "Visão geral", icon: HomeIcon, items: [{ label: "Dashboard", href: "/admin/dashboard" }] },
  { label: "Presentes", icon: GiftIcon, items: [{ label: "Presentes", href: "/admin/presentes" }] },
];

describe("AdminMobileNav", () => {
  it("exposes itself as a dialog when open", () => {
    render(<AdminMobileNav groups={GROUPS} isOpen onClose={vi.fn()} />);

    expect(screen.getByRole("dialog", { name: "Menu do painel administrativo" })).toBeInTheDocument();
  });

  it("marks the current page as active with aria-current", () => {
    render(<AdminMobileNav groups={GROUPS} isOpen onClose={vi.fn()} />);

    expect(screen.getByRole("link", { name: "Presentes" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Dashboard" })).not.toHaveAttribute("aria-current");
  });

  it("calls onClose when Escape is pressed", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AdminMobileNav groups={GROUPS} isOpen onClose={onClose} />);

    await user.keyboard("{Escape}");

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when a nav link is clicked", async () => {
    const onClose = vi.fn();
    const user = userEvent.setup();
    render(<AdminMobileNav groups={GROUPS} isOpen onClose={onClose} />);

    await user.click(screen.getByRole("link", { name: "Dashboard" }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when closed", () => {
    render(<AdminMobileNav groups={GROUPS} isOpen={false} onClose={vi.fn()} />);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("renders an icon next to each group label", () => {
    render(<AdminMobileNav groups={GROUPS} isOpen onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelectorAll("svg[aria-hidden='true']").length).toBeGreaterThanOrEqual(GROUPS.length);
  });
});
