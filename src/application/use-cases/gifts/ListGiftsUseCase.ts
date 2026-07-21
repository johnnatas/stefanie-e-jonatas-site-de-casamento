import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

export class ListGiftsUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository
  ) {}

  async execute(): Promise<Gift[]> {
    const gifts = await this.giftRepository.findAll();

    return Promise.all(
      gifts.map(async (gift) => {
        const isExpiredReservation =
          gift.status === "reserved" && gift.reservedUntil !== null && gift.reservedUntil.getTime() <= Date.now();

        if (!isExpiredReservation) {
          return gift;
        }

        const pendingContribution = await this.giftContributionRepository.findPendingByGiftId(gift.id!);
        if (pendingContribution) {
          await this.giftContributionRepository.update(pendingContribution.expire());
        }

        return this.giftRepository.update(gift.releaseToAvailable());
      })
    );
  }
}
