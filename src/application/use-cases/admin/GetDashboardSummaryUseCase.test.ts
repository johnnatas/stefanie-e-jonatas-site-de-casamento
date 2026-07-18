import { describe, expect, it } from "vitest";
import { GetDashboardSummaryUseCase } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { Guest } from "@/domain/entities/Guest";

describe("GetDashboardSummaryUseCase", () => {
  it("counts confirmed, declined, and pending guests separately", async () => {
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
    expect(summary.totalAttendeesCount).toBe(2);
  });
});
