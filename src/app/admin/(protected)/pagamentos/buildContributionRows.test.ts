import { describe, expect, it } from "vitest";
import { buildContributionRows } from "@/app/admin/(protected)/pagamentos/buildContributionRows";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

describe("buildContributionRows", () => {
  it("joins gift names by id and orders rows newest first", () => {
    const gift = Gift.create({
      id: "gift-1",
      name: "Liquidificador",
      description: "Liquidificador de alta potência",
      imageUrl: null,
      price: 200,
      category: "cozinha",
    });
    const older = GiftContribution.create({
      id: "c-1",
      giftId: "gift-1",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      amount: 200,
      createdAt: new Date("2026-01-01"),
    });
    const newer = GiftContribution.create({
      id: "c-2",
      giftId: "gift-1",
      guestName: "Bruno",
      guestEmail: "bruno@example.com",
      amount: 200,
      createdAt: new Date("2026-02-01"),
    });

    const rows = buildContributionRows([older, newer], [gift]);

    expect(rows.map((row) => row.id)).toEqual(["c-2", "c-1"]);
    expect(rows[0].giftName).toBe("Liquidificador");
    expect(rows[0].guestName).toBe("Bruno");
  });

  it("falls back to a placeholder when the gift is not found", () => {
    const contribution = GiftContribution.create({
      id: "c-1",
      giftId: "missing-gift",
      guestName: "Ana",
      guestEmail: "ana@example.com",
      amount: 100,
    });

    const rows = buildContributionRows([contribution], []);

    expect(rows[0].giftName).toBe("—");
  });
});
