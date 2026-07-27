import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { DressCodeTheme } from "@/components/tips/DressCodeTheme";
import { tipsTrajeContentSchema } from "@/application/content/schemas";

describe("DressCodeTheme", () => {
  it("renders the title, dress-code name, guidance, and Ele/Ela toggles", () => {
    const content = tipsTrajeContentSchema.parse({
      pinterestHimUrl: "https://pin/ele",
      pinterestHerUrl: "https://pin/ela",
    });
    render(<DressCodeTheme content={content} />);

    expect(screen.getByText("Convidados, preparem suas vestimentas!")).toBeInTheDocument();
    expect(screen.getByText("Passeio completo")).toBeInTheDocument();
    expect(screen.getByText(/inverno/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ele" })).toBeInTheDocument();
  });
});
