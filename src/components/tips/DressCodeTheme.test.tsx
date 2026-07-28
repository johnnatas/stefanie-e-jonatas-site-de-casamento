import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DressCodeTheme } from "@/components/tips/DressCodeTheme";
import { tipsTrajeContentSchema } from "@/application/content/schemas";

vi.mock("@/infrastructure/pinterest/fetchPinterestBoardPins", () => ({
  fetchPinterestBoardPins: vi.fn(async (boardUrl: string) => [
    { pinUrl: `${boardUrl}pin-1`, imageUrl: `${boardUrl}pin-1.jpg` },
  ]),
}));

describe("DressCodeTheme", () => {
  it("renders the title, dress-code name, guidance, and Ele/Ela toggles", async () => {
    const content = tipsTrajeContentSchema.parse({
      pinterestHimUrl: "https://pin/ele/",
      pinterestHerUrl: "https://pin/ela/",
    });
    render(await DressCodeTheme({ content }));

    expect(screen.getByText("Convidados, preparem suas vestimentas!")).toBeInTheDocument();
    expect(screen.getByText("Passeio completo")).toBeInTheDocument();
    expect(screen.getByText(/inverno/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ele" })).toBeInTheDocument();
  });

  it("renders no inspiration section when neither board URL is set", async () => {
    const content = tipsTrajeContentSchema.parse({});
    render(await DressCodeTheme({ content }));

    expect(screen.queryByRole("button", { name: "Ele" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Ela" })).not.toBeInTheDocument();
  });
});
