import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DressCodeInspiration } from "@/components/tips/DressCodeInspiration";
import type { PinterestPin } from "@/infrastructure/pinterest/fetchPinterestBoardPins";

const himPins: PinterestPin[] = [{ pinUrl: "https://pin/ele-1", imageUrl: "https://i.pinimg.com/736x/ele-1.jpg" }];
const herPins: PinterestPin[] = [{ pinUrl: "https://pin/ela-1", imageUrl: "https://i.pinimg.com/736x/ela-1.jpg" }];

describe("DressCodeInspiration", () => {
  it("shows both toggles and selects Ela first when both boards have pins", () => {
    render(<DressCodeInspiration himPins={himPins} herPins={herPins} />);

    const ele = screen.getByRole("button", { name: "Ele" });
    const ela = screen.getByRole("button", { name: "Ela" });
    expect(ela).toHaveAttribute("aria-pressed", "true");
    expect(ele).toHaveAttribute("aria-pressed", "false");
  });

  it("switches the pressed toggle on click", async () => {
    const user = userEvent.setup();
    render(<DressCodeInspiration himPins={himPins} herPins={herPins} />);

    await user.click(screen.getByRole("button", { name: "Ele" }));

    expect(screen.getByRole("button", { name: "Ele" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Ela" })).toHaveAttribute("aria-pressed", "false");
  });

  it("hides the Ela toggle when only the him board has pins", () => {
    render(<DressCodeInspiration himPins={himPins} herPins={[]} />);
    expect(screen.queryByRole("button", { name: "Ela" })).not.toBeInTheDocument();
  });

  it("renders nothing when neither board has pins", () => {
    const { container } = render(<DressCodeInspiration himPins={[]} herPins={[]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
