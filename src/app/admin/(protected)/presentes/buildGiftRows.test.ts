import { describe, expect, it } from "vitest";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { buildGiftRows } from "./buildGiftRows";

describe("buildGiftRows", () => {
  it("attaches the approved contribution's guest name and date to a paid gift", () => {
    const gift = Gift.create({
      id: "gift-1",
      name: "Air fryer",
      description: "Air fryer 5L",
      imageUrl: null,
      price: 450,
      category: "cozinha",
      status: "paid",
    });
    const contribution = GiftContribution.create({
      id: "c1",
      giftId: "gift-1",
      guestName: "Ana Silva",
      guestEmail: "ana@example.com",
      amount: 450,
      status: "approved",
      createdAt: new Date("2026-02-10"),
    });

    const rows = buildGiftRows([gift], [contribution]);

    expect(rows[0].purchasedBy).toBe("Ana Silva");
    expect(rows[0].purchasedAt).toEqual(new Date("2026-02-10"));
  });

  it("leaves purchasedBy/purchasedAt undefined for gifts with no approved contribution", () => {
    const gift = Gift.create({
      id: "gift-2",
      name: "Jogo de panelas",
      description: "Panelas",
      imageUrl: null,
      price: 300,
      category: "cozinha",
      status: "available",
    });

    const rows = buildGiftRows([gift], []);

    expect(rows[0].purchasedBy).toBeUndefined();
    expect(rows[0].purchasedAt).toBeUndefined();
  });
});
