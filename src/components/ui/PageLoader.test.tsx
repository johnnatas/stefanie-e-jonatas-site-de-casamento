import { afterEach, describe, expect, it } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { PageLoader } from "@/components/ui/PageLoader";

function setReadyState(value: DocumentReadyState) {
  Object.defineProperty(document, "readyState", { value, configurable: true });
}

describe("PageLoader", () => {
  afterEach(() => {
    setReadyState("complete");
  });

  it("stays visible while the document is still loading", () => {
    setReadyState("loading");
    render(<PageLoader />);

    const loader = screen.getByTestId("page-loader");
    expect(loader).toHaveClass("opacity-100");
    expect(loader).toHaveAttribute("aria-hidden", "false");
  });

  it("fades out once the window load event fires", async () => {
    setReadyState("loading");
    render(<PageLoader />);

    window.dispatchEvent(new Event("load"));

    await waitFor(() => {
      expect(screen.getByTestId("page-loader")).toHaveClass("opacity-0");
    });
    expect(screen.getByTestId("page-loader")).toHaveAttribute("aria-hidden", "true");
  });

  it("hides itself if the document was already fully loaded at mount, without waiting for another load event", async () => {
    setReadyState("complete");
    render(<PageLoader />);

    await waitFor(() => {
      expect(screen.getByTestId("page-loader")).toHaveClass("opacity-0");
    });
  });
});
