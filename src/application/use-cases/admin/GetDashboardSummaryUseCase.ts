import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";

export interface DashboardSummary {
  confirmedGuestsCount: number;
  declinedGuestsCount: number;
  totalAttendeesCount: number;
  totalGiftsCount: number;
  paidGiftsCount: number;
  totalAmountReceived: number;
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

    const confirmedGuests = guests.filter((guest) => guest.attendanceConfirmed);

    return {
      confirmedGuestsCount: confirmedGuests.length,
      declinedGuestsCount: guests.length - confirmedGuests.length,
      totalAttendeesCount: guests.reduce((total, guest) => total + guest.totalAttendeesCount(), 0),
      totalGiftsCount: gifts.length,
      paidGiftsCount: gifts.filter((gift) => gift.status === "paid").length,
      totalAmountReceived: approvedContributions.reduce((total, contribution) => total + contribution.amount, 0),
    };
  }
}
