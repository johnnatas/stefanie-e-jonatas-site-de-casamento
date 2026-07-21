import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PolaroidGallery } from "@/components/ui/PolaroidGallery";
import type { GalleryMediaItem } from "@/application/content/schemas";

const ITEMS: GalleryMediaItem[] = [
  { url: "https://example.com/a.jpg", type: "photo" },
  { url: "https://example.com/b.mp4", type: "video" },
  { url: "https://example.com/c.jpg", type: "photo" },
];

describe("PolaroidGallery", () => {
  it("renders nothing when there are no items", () => {
    const { container } = render(<PolaroidGallery items={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a card for every item", () => {
    render(<PolaroidGallery items={ITEMS} />);
    expect(screen.getAllByRole("button", { name: /abrir/i })).toHaveLength(3);
  });

  it("opens the lightbox on the clicked item and navigates forward/back", async () => {
    const user = userEvent.setup();
    render(<PolaroidGallery items={ITEMS} />);

    const cards = screen.getAllByRole("button", { name: /abrir/i });
    await user.click(cards[1]);

    const dialog = screen.getByRole("dialog", { name: "Visualização de foto ou vídeo" });
    expect(dialog.querySelector("video")).toHaveAttribute("src", "https://example.com/b.mp4");

    await user.click(screen.getByRole("button", { name: "Próxima foto ou vídeo" }));
    expect(dialog.querySelector("img")).toHaveAttribute("src", "https://example.com/c.jpg");

    await user.click(screen.getByRole("button", { name: "Foto ou vídeo anterior" }));
    await user.click(screen.getByRole("button", { name: "Foto ou vídeo anterior" }));
    expect(dialog.querySelector("img")).toHaveAttribute("src", "https://example.com/a.jpg");
    expect(screen.getByRole("button", { name: "Foto ou vídeo anterior" })).toBeDisabled();
  });

  it("closes the lightbox on Escape", async () => {
    const user = userEvent.setup();
    render(<PolaroidGallery items={ITEMS} />);

    await user.click(screen.getAllByRole("button", { name: /abrir/i })[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes the lightbox via the close button", async () => {
    const user = userEvent.setup();
    render(<PolaroidGallery items={ITEMS} />);

    await user.click(screen.getAllByRole("button", { name: /abrir/i })[0]);
    await user.click(screen.getByRole("button", { name: "Fechar" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
