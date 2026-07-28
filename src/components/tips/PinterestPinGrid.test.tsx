import { afterEach, describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { PinterestPinGrid } from "@/components/tips/PinterestPinGrid";
import type { PinterestPin } from "@/infrastructure/pinterest/fetchPinterestBoardPins";

function makePins(count: number): PinterestPin[] {
  return Array.from({ length: count }, (_, i) => ({
    pinUrl: `https://br.pinterest.com/pin/${i}/`,
    imageUrl: `https://i.pinimg.com/736x/img-${i}.jpg`,
  }));
}

let capturedIntersectionCallback: IntersectionObserverCallback | null = null;

class CapturingIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = "";
  readonly thresholds: ReadonlyArray<number> = [];

  constructor(callback: IntersectionObserverCallback) {
    capturedIntersectionCallback = callback;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

describe("PinterestPinGrid", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    capturedIntersectionCallback = null;
  });

  it("renders nothing when there are no pins", () => {
    const { container } = render(<PinterestPinGrid pins={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders each pin as a link to the pin page with its image", () => {
    const pins = makePins(3);
    render(<PinterestPinGrid pins={pins} />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", pins[0].pinUrl);
    expect(links[0].querySelector("img")).toHaveAttribute("src", pins[0].imageUrl);
  });

  it("only renders the first batch initially when there are more pins than the batch size", () => {
    const pins = makePins(12);
    render(<PinterestPinGrid pins={pins} />);

    expect(screen.getAllByRole("link")).toHaveLength(8);
    expect(screen.getByTestId("pin-grid-sentinel")).toBeInTheDocument();
  });

  it("reveals the next batch once the sentinel intersects", () => {
    vi.stubGlobal("IntersectionObserver", CapturingIntersectionObserver);
    const pins = makePins(12);
    render(<PinterestPinGrid pins={pins} />);

    expect(screen.getAllByRole("link")).toHaveLength(8);

    act(() => {
      capturedIntersectionCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver
      );
    });

    expect(screen.getAllByRole("link")).toHaveLength(12);
    expect(screen.queryByTestId("pin-grid-sentinel")).not.toBeInTheDocument();
  });

  it("does not render a sentinel when all pins already fit within one batch", () => {
    render(<PinterestPinGrid pins={makePins(5)} />);
    expect(screen.queryByTestId("pin-grid-sentinel")).not.toBeInTheDocument();
  });
});
