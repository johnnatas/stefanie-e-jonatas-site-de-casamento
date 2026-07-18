import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export interface CreateGiftContributionInput {
  giftId: string;
  guestName: string;
  guestEmail: string;
}

export interface CreateGiftContributionOutput {
  contribution: GiftContribution;
  checkoutUrl: string;
}

export class CreateGiftContributionUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly giftContributionRepository: GiftContributionRepository,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute(input: CreateGiftContributionInput): Promise<CreateGiftContributionOutput> {
    const gift = await this.giftRepository.findById(input.giftId);
    if (!gift) {
      throw new InvalidGiftDataError(`Gift with id ${input.giftId} was not found.`);
    }

    const reservedGift = gift.reserve();
    await this.giftRepository.update(reservedGift);

    const contribution = await this.giftContributionRepository.save(
      GiftContribution.create({
        giftId: gift.id!,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        amount: gift.price,
      })
    );

    const preference = await this.paymentGateway.createPreference({
      title: gift.name,
      amount: gift.price,
      externalReference: contribution.id!,
      payerEmail: input.guestEmail,
    });

    const contributionWithPreference = await this.giftContributionRepository.update(
      contribution.withPreference(preference.preferenceId)
    );

    return { contribution: contributionWithPreference, checkoutUrl: preference.checkoutUrl };
  }
}
