import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export const AUTO_CHECKOUT_RESERVATION_MINUTES = 30;

export interface CreateGiftContributionInput {
  giftId: string;
  guestName: string;
  guestEmail: string;
  expectedPaymentDate?: Date;
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

    const reservedUntil =
      input.expectedPaymentDate ?? new Date(Date.now() + AUTO_CHECKOUT_RESERVATION_MINUTES * 60 * 1000);
    const reservedGift = await this.giftRepository.update(gift.reserve(reservedUntil));

    const contribution = await this.giftContributionRepository.save(
      GiftContribution.create({
        giftId: gift.id!,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        amount: gift.price,
        expectedPaymentDate: input.expectedPaymentDate ?? null,
      })
    );

    let preferenceId: string;
    let checkoutUrl: string;

    if (reservedGift.mercadoPagoCheckoutUrl && reservedGift.mercadoPagoPreferenceId) {
      preferenceId = reservedGift.mercadoPagoPreferenceId;
      checkoutUrl = reservedGift.mercadoPagoCheckoutUrl;
    } else {
      const preference = await this.paymentGateway.createPreference({
        title: gift.name,
        amount: gift.price,
        externalReference: gift.id!,
        payerEmail: input.guestEmail,
      });
      preferenceId = preference.preferenceId;
      checkoutUrl = preference.checkoutUrl;

      await this.giftRepository.update(
        Gift.create({
          ...reservedGift,
          mercadoPagoPreferenceId: preferenceId,
          mercadoPagoCheckoutUrl: checkoutUrl,
        })
      );
    }

    const contributionWithPreference = await this.giftContributionRepository.update(
      contribution.withPreference(preferenceId)
    );

    return { contribution: contributionWithPreference, checkoutUrl };
  }
}
