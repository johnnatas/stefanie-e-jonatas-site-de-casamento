import { describe, expect, it } from "vitest";
import { GetDashboardSummaryUseCase } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { Guest } from "@/domain/entities/Guest";
import { Gift } from "@/domain/entities/Gift";

describe("GetDashboardSummaryUseCase", () => {
  it("counts confirmed, declined, and pending guests separately, and totals every registered guest", async () => {
    const guestRepository = new InMemoryGuestRepository();
    await guestRepository.save(
      Guest.create({ fullName: "Guest Confirmed", companionsCount: 1, attendanceStatus: "confirmed" })
    );
    await guestRepository.save(
      Guest.create({ fullName: "Guest Declined", companionsCount: 0, attendanceStatus: "declined" })
    );
    await guestRepository.save(
      Guest.create({ fullName: "Guest Pending", companionsCount: 0, attendanceStatus: "pending" })
    );

    const summary = await new GetDashboardSummaryUseCase(
      guestRepository,
      new InMemoryGiftRepository(),
      new InMemoryGiftContributionRepository()
    ).execute();

    expect(summary.confirmedGuestsCount).toBe(1);
    expect(summary.declinedGuestsCount).toBe(1);
    expect(summary.pendingGuestsCount).toBe(1);
    expect(summary.totalGuestsCount).toBe(3);
  });

  it("totals the registered value of every gift regardless of status", async () => {
    const giftRepository = new InMemoryGiftRepository();
    await giftRepository.save(
      Gift.create({ name: "Jogo de panelas", description: "desc", imageUrl: null, price: 150, category: "cozinha" })
    );
    await giftRepository.save(
      Gift.create({ name: "Aspirador robô", description: "desc", imageUrl: null, price: 850.5, category: "casa" })
    );

    const summary = await new GetDashboardSummaryUseCase(
      new InMemoryGuestRepository(),
      giftRepository,
      new InMemoryGiftContributionRepository()
    ).execute();

    expect(summary.totalAmountRegistered).toBe(1000.5);
  });
});
