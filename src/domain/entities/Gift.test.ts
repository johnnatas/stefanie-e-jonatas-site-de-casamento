import { describe, expect, it } from "vitest";
import { Gift } from "@/domain/entities/Gift";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

const validProps = {
  name: "Jogo de panelas",
  description: "Jogo de panelas antiaderentes",
  imageUrl: "/placeholder-gift.jpg",
  price: 350,
  category: "cozinha",
};

describe("Gift", () => {
  it("creates a gift defaulting to available status", () => {
    const gift = Gift.create(validProps);

    expect(gift.status).toBe("available");
    expect(gift.isAvailable()).toBe(true);
  });

  it("rejects a non-positive price", () => {
    expect(() => Gift.create({ ...validProps, price: 0 })).toThrow(InvalidGiftDataError);
  });

  it("reserves an available gift", () => {
    const gift = Gift.create(validProps);

    const reserved = gift.reserve();

    expect(reserved.status).toBe("reserved");
    expect(reserved.isAvailable()).toBe(false);
  });

  it("does not allow reserving a gift that is already reserved", () => {
    const gift = Gift.create(validProps).reserve();

    expect(() => gift.reserve()).toThrow(GiftNotAvailableError);
  });

  it("marks a gift as paid", () => {
    const gift = Gift.create(validProps).reserve().markAsPaid();

    expect(gift.status).toBe("paid");
  });

  it("does not allow releasing a paid gift back to available", () => {
    const gift = Gift.create(validProps).reserve().markAsPaid();

    expect(() => gift.releaseToAvailable()).toThrow(GiftNotAvailableError);
  });
});
