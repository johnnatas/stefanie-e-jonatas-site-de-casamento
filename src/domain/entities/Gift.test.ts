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

const oneHourFromNow = new Date(Date.now() + 60 * 60 * 1000);

describe("Gift", () => {
  it("creates a gift defaulting to available status", () => {
    const gift = Gift.create(validProps);

    expect(gift.status).toBe("available");
    expect(gift.isAvailable()).toBe(true);
    expect(gift.reservedUntil).toBeNull();
  });

  it("rejects a non-positive price", () => {
    expect(() => Gift.create({ ...validProps, price: 0 })).toThrow(InvalidGiftDataError);
  });

  it("reserves an available gift until the given instant", () => {
    const gift = Gift.create(validProps);

    const reserved = gift.reserve(oneHourFromNow);

    expect(reserved.status).toBe("reserved");
    expect(reserved.isAvailable()).toBe(false);
    expect(reserved.reservedUntil).toBe(oneHourFromNow);
  });

  it("does not allow reserving a gift that is already reserved", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow);

    expect(() => gift.reserve(oneHourFromNow)).toThrow(GiftNotAvailableError);
  });

  it("marks a gift as paid and clears the reservation deadline", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow).markAsPaid();

    expect(gift.status).toBe("paid");
    expect(gift.reservedUntil).toBeNull();
  });

  it("does not allow releasing a paid gift back to available", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow).markAsPaid();

    expect(() => gift.releaseToAvailable()).toThrow(GiftNotAvailableError);
  });

  it("clears the reservation deadline when releasing back to available", () => {
    const gift = Gift.create(validProps).reserve(oneHourFromNow).releaseToAvailable();

    expect(gift.status).toBe("available");
    expect(gift.reservedUntil).toBeNull();
  });
});
