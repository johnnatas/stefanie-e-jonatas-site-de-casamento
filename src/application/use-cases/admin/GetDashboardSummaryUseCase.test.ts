import { beforeEach, describe, expect, it } from "vitest";
import { GetDashboardSummaryUseCase } from "@/application/use-cases/admin/GetDashboardSummaryUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { Guest } from "@/domain/entities/Guest";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";

describe("GetDashboardSummaryUseCase", () => {
  let guestRepository: InMemoryGuestRepository;
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;

  beforeEach(() => {
    guestRepository = new InMemoryGuestRepository();
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
  });

  it("aggregates confirmed guests, attendees, gifts and amount received", async () => {
    await guestRepository.save(
      Guest.create({
        fullName: "Confirmed Guest",
        email: "confirmed@example.com",
        phone: "11999990000",
        companionsCount: 2,
        attendanceConfirmed: true,
      })
    );
    await guestRepository.save(
      Guest.create({
        fullName: "Declined Guest",
        email: "declined@example.com",
        phone: "11999990001",
        companionsCount: 0,
        attendanceConfirmed: false,
      })
    );

    await giftRepository.save(
      Gift.create({
        id: "gift-1",
        name: "Jogo de toalhas",
        description: "Toalhas de banho",
        imageUrl: "/placeholder.jpg",
        price: 100,
        category: "casa",
        status: "paid",
      })
    );
    await giftRepository.save(
      Gift.create({
        id: "gift-2",
        name: "Panela de pressão",
        description: "Panela de pressão elétrica",
        imageUrl: "/placeholder.jpg",
        price: 300,
        category: "cozinha",
      })
    );

    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Confirmed Guest",
        guestEmail: "confirmed@example.com",
        amount: 100,
        status: "approved",
      })
    );

    const summary = await new GetDashboardSummaryUseCase(
      guestRepository,
      giftRepository,
      contributionRepository
    ).execute();

    expect(summary.confirmedGuestsCount).toBe(1);
    expect(summary.declinedGuestsCount).toBe(1);
    expect(summary.totalAttendeesCount).toBe(3);
    expect(summary.totalGiftsCount).toBe(2);
    expect(summary.paidGiftsCount).toBe(1);
    expect(summary.totalAmountReceived).toBe(100);
  });
});
