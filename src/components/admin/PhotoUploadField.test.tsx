import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { fireEvent } from "@testing-library/react";
import { PhotoUploadField } from "@/components/admin/PhotoUploadField";

class FakeImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  width = 800;
  height = 600;
  set src(_value: string) {
    queueMicrotask(() => this.onload?.());
  }
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("PhotoUploadField", () => {
  it("renders the current photo when nothing new is chosen", () => {
    render(<PhotoUploadField name="photo" currentUrl="https://example.com/a.jpg" label="Foto" />);

    expect(screen.getByAltText("Foto")).toHaveAttribute("src", "https://example.com/a.jpg");
  });

  it("shows the remove checkbox only when a current photo exists and showRemoveCheckbox is true", () => {
    const { rerender } = render(
      <PhotoUploadField name="photo" currentUrl="https://example.com/a.jpg" label="Foto" />
    );
    expect(screen.getByText("Remover esta foto")).toBeInTheDocument();

    rerender(<PhotoUploadField name="photo" currentUrl={null} label="Foto" />);
    expect(screen.queryByText("Remover esta foto")).not.toBeInTheDocument();

    rerender(
      <PhotoUploadField name="photo" currentUrl="https://example.com/a.jpg" label="Foto" showRemoveCheckbox={false} />
    );
    expect(screen.queryByText("Remover esta foto")).not.toBeInTheDocument();
  });

  it("shows a preview after a file is selected", async () => {
    vi.stubGlobal("Image", FakeImage);
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage: vi.fn(),
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) => {
      callback(new Blob(["x"], { type: "image/jpeg" }));
    });
    URL.createObjectURL = vi.fn(() => "blob:preview");
    URL.revokeObjectURL = vi.fn();

    const { container } = render(<PhotoUploadField name="photo" currentUrl={null} label="Foto" />);
    const file = new File(["data"], "photo.png", { type: "image/png" });
    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => {
      expect(screen.getByAltText("Foto")).toHaveAttribute("src", "blob:preview");
    });
  });
});
