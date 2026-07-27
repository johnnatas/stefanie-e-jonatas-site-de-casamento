import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DressCodeInspiration } from "@/components/tips/DressCodeInspiration";

describe("DressCodeInspiration", () => {
  it("shows both toggles and selects Ele first when both boards are provided", () => {
    render(<DressCodeInspiration him="https://pin/ele" her="https://pin/ela" />);

    const ele = screen.getByRole("button", { name: "Ele" });
    const ela = screen.getByRole("button", { name: "Ela" });
    expect(ele).toHaveAttribute("aria-pressed", "true");
    expect(ela).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the pressed toggle on click", async () => {
    const user = userEvent.setup();
    render(<DressCodeInspiration him="https://pin/ele" her="https://pin/ela" />);

    await user.click(screen.getByRole("button", { name: "Ela" }));

    expect(screen.getByRole("button", { name: "Ela" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ele" })).toHaveAttribute("aria-pressed", "false");
  });

  it("hides the Ela toggle when only the him board is provided", () => {
    render(<DressCodeInspiration him="https://pin/ele" her={null} />);
    expect(screen.queryByRole("button", { name: "Ela" })).not.toBeInTheDocument();
  });

  it("renders nothing when neither board is provided", () => {
    const { container } = render(<DressCodeInspiration him={null} her={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
