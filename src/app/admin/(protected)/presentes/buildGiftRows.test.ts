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

  it("picks the most recent approved contribution when a gift has more than one, regardless of input order", () => {
    const gift = Gift.create({
      id: "gift-3",
      name: "Liquidificador",
      description: "Liquidificador 900W",
      imageUrl: null,
      price: 250,
      category: "cozinha",
      status: "paid",
    });
    const earlierContribution = GiftContribution.create({
      id: "c1",
      giftId: "gift-3",
      guestName: "Bruno Costa",
      guestEmail: "bruno@example.com",
      amount: 250,
      status: "approved",
      createdAt: new Date("2026-01-05"),
    });
    const laterContribution = GiftContribution.create({
      id: "c2",
      giftId: "gift-3",
      guestName: "Carla Souza",
      guestEmail: "carla@example.com",
      amount: 250,
      status: "approved",
      createdAt: new Date("2026-03-01"),
    });

    const rowsEarlierFirst = buildGiftRows([gift], [earlierContribution, laterContribution]);
    expect(rowsEarlierFirst[0].purchasedBy).toBe("Carla Souza");
    expect(rowsEarlierFirst[0].purchasedAt).toEqual(new Date("2026-03-01"));

    const rowsLaterFirst = buildGiftRows([gift], [laterContribution, earlierContribution]);
    expect(rowsLaterFirst[0].purchasedBy).toBe("Carla Souza");
    expect(rowsLaterFirst[0].purchasedAt).toEqual(new Date("2026-03-01"));
  });
});
