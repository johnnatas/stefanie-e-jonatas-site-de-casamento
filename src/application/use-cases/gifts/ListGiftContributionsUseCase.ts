import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

export class ListGiftContributionsUseCase {
  constructor(private readonly giftContributionRepository: GiftContributionRepository) {}

  async execute(): Promise<GiftContribution[]> {
    return this.giftContributionRepository.findAll();
  }
}
