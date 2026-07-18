import { describe, expect, it } from "vitest";
import { Gift } from "@/domain/entities/Gift";
import { mapGiftToDto } from "@/components/gifts/GiftDto";

describe("mapGiftToDto", () => {
  it("maps a domain Gift entity to a plain presentation DTO", () => {
    const gift = Gift.create({
      id: "gift-1",
      name: "Batedeira",
      description: "Batedeira planetária",
      imageUrl: "/placeholder.jpg",
      price: 500,
      category: "cozinha",
    });

    expect(mapGiftToDto(gift)).toEqual({
      id: "gift-1",
      name: "Batedeira",
      description: "Batedeira planetária",
      price: 500,
      category: "cozinha",
      status: "available",
    });
  });
});
