import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HomeHeroForm } from "@/components/admin/HomeHeroForm";
import { homeHeroContentSchema } from "@/application/content/schemas";

describe("HomeHeroForm", () => {
  it("renders one slot per existing photo, with no remove control on the first slot", () => {
    const content = homeHeroContentSchema.parse({
      photos: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });
    render(<HomeHeroForm defaultValues={content} />);

    expect(screen.getByAltText("Foto 1")).toBeInTheDocument();
    expect(screen.getByAltText("Foto 2")).toBeInTheDocument();
    expect(screen.getAllByText("× Remover esta foto")).toHaveLength(1);
  });

  it("renders a single empty slot when there are no existing photos", () => {
    const content = homeHeroContentSchema.parse({ photos: [] });
    render(<HomeHeroForm defaultValues={content} />);

    expect(screen.getByRole("button", { name: "Adicionar Foto 1" })).toBeInTheDocument();
    expect(screen.queryByText("× Remover esta foto")).not.toBeInTheDocument();
  });

  it("adds a new slot when clicking + Adicionar foto, up to the 5-slot cap", async () => {
    const user = userEvent.setup();
    const content = homeHeroContentSchema.parse({ photos: [] });
    render(<HomeHeroForm defaultValues={content} />);

    for (let i = 0; i < 4; i++) {
      await user.click(screen.getByText("+ Adicionar foto"));
    }

    expect(screen.getByRole("button", { name: "Adicionar Foto 5" })).toBeInTheDocument();
    expect(screen.queryByText("+ Adicionar foto")).not.toBeInTheDocument();
  });

  it("removes a slot when clicking its × Remover esta foto button", async () => {
    const user = userEvent.setup();
    const content = homeHeroContentSchema.parse({
      photos: ["https://example.com/a.jpg", "https://example.com/b.jpg"],
    });
    render(<HomeHeroForm defaultValues={content} />);

    await user.click(screen.getAllByText("× Remover esta foto")[0]);

    expect(screen.queryByAltText("Foto 2")).not.toBeInTheDocument();
    expect(screen.getByAltText("Foto 1")).toBeInTheDocument();
  });
});
