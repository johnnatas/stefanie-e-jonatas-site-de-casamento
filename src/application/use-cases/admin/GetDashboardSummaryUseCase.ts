import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";

export interface DashboardSummary {
  confirmedGuestsCount: number;
  declinedGuestsCount: number;
  pendingGuestsCount: number;
  totalGuestsCount: number;
  totalGiftsCount: number;
  paidGiftsCount: number;
  totalAmountReceived: number;
  totalAmountRegistered: number;
}

export class GetDashboardSummaryUseCase {
  constructor(
    private readonly guestRepository: GuestRepository,
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository
  ) {}

  async execute(): Promise<DashboardSummary> {
    const [guests, gifts, approvedContributions] = await Promise.all([
      this.guestRepository.findAll(),
      this.giftRepository.findAll(),
      this.giftContributionRepository.findApproved(),
    ]);

    return {
      confirmedGuestsCount: guests.filter((guest) => guest.attendanceStatus === "confirmed").length,
      declinedGuestsCount: guests.filter((guest) => guest.attendanceStatus === "declined").length,
      pendingGuestsCount: guests.filter((guest) => guest.attendanceStatus === "pending").length,
      totalGuestsCount: guests.length,
      totalGiftsCount: gifts.length,
      paidGiftsCount: gifts.filter((gift) => gift.status === "paid").length,
      totalAmountReceived: approvedContributions.reduce((total, contribution) => total + contribution.amount, 0),
      totalAmountRegistered: gifts.reduce((total, gift) => total + gift.price, 0),
    };
  }
}
