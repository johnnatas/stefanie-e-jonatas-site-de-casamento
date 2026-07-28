import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";
import { GiftGrid } from "@/components/gifts/GiftGrid";
import { GiftDto } from "@/components/gifts/GiftDto";

vi.mock("@/app/presentes/actions", () => ({
  createGiftContributionAction: vi.fn(),
  reserveGiftForLaterAction: vi.fn(),
}));

const gifts: GiftDto[] = [
  {
    id: "gift-1",
    name: "Air fryer",
    description: "",
    imageUrl: null,
    price: 450,
    category: "cozinha",
    status: "available",
  },
  {
    id: "gift-2",
    name: "Jogo de taças",
    description: "",
    imageUrl: null,
    price: 120,
    category: "cozinha",
    status: "available",
  },
];

describe("GiftGrid", () => {
  it("shows the default empty-state message when there are no gifts and no override is given", () => {
    render(<GiftGrid gifts={[]} canReserveForLater />);
    expect(screen.getByText("A lista de presentes ainda está sendo preparada.")).toBeInTheDocument();
  });

  it("shows a custom empty message when provided", () => {
    render(<GiftGrid gifts={[]} canReserveForLater emptyMessage="Nenhum presente encontrado com esses filtros." />);
    expect(screen.getByText("Nenhum presente encontrado com esses filtros.")).toBeInTheDocument();
  });

  it("opens the modal for the gift matching openGiftId, and no other", () => {
    render(<GiftGrid gifts={gifts} canReserveForLater openGiftId="gift-2" />);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Jogo de taças", level: 2 })).toBeInTheDocument();
  });

  it("opens no modal when openGiftId is null", () => {
    render(<GiftGrid gifts={gifts} canReserveForLater openGiftId={null} />);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("shows only the first page of gifts and reveals more when the sentinel intersects", () => {
    let intersectionCallback: IntersectionObserverCallback = () => {};
    class FakeIntersectionObserver implements IntersectionObserver {
      readonly root = null;
      readonly rootMargin = "";
      readonly thresholds: ReadonlyArray<number> = [];
      constructor(callback: IntersectionObserverCallback) {
        intersectionCallback = callback;
      }
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords(): IntersectionObserverEntry[] {
        return [];
      }
    }
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);

    const manyGifts: GiftDto[] = Array.from({ length: 14 }, (_, index) => ({
      id: `gift-${index}`,
      name: `Presente ${index}`,
      description: "",
      imageUrl: null,
      price: 100,
      category: "casa",
      status: "available",
    }));

    render(<GiftGrid gifts={manyGifts} canReserveForLater />);

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(12);

    act(() => {
      intersectionCallback([{ isIntersecting: true } as IntersectionObserverEntry], null as unknown as IntersectionObserver);
    });

    expect(screen.getAllByRole("heading", { level: 3 })).toHaveLength(14);

    vi.unstubAllGlobals();
  });
});
