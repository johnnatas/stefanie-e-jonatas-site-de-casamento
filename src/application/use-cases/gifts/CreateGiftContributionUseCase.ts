import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";
import { PaymentGateway } from "@/application/ports/PaymentGateway";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export const AUTO_CHECKOUT_RESERVATION_MINUTES = 30;

export interface CreateGiftContributionInput {
  giftId: string;
  guestName: string;
  guestEmail: string;
  guestPhone?: string | null;
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
    private readonly securitySettingsRepository: AdminSecuritySettingsRepository,
    private readonly resolvePaymentGateway: (provider: PaymentProvider) => PaymentGateway
  ) {}

  async execute(input: CreateGiftContributionInput): Promise<CreateGiftContributionOutput> {
    const gift = await this.giftRepository.findById(input.giftId);
    if (!gift) {
      throw new InvalidGiftDataError(`Gift with id ${input.giftId} was not found.`);
    }

    const { activePaymentProvider } = await this.securitySettingsRepository.getSettings();

    const reservedUntil =
      input.expectedPaymentDate ?? new Date(Date.now() + AUTO_CHECKOUT_RESERVATION_MINUTES * 60 * 1000);
    const reservedGift = await this.giftRepository.update(gift.reserve(reservedUntil));

    const contribution = await this.giftContributionRepository.save(
      GiftContribution.create({
        giftId: gift.id!,
        guestName: input.guestName,
        guestEmail: input.guestEmail,
        guestPhone: input.guestPhone ?? null,
        amount: gift.price,
        expectedPaymentDate: input.expectedPaymentDate ?? null,
      })
    );

    let referenceId: string;
    let checkoutUrl: string;

    if (activePaymentProvider === "infinite_pay") {
      // Infinite Pay's checkout only skips asking the guest for their contact
      // details again when that data is embedded at link-creation time — so,
      // unlike Mercado Pago, always generate a fresh link here instead of
      // reusing whatever was pre-generated. Only fall back to a pre-existing
      // link if fresh generation fails, so the guest is never left stuck.
      try {
        const preference = await this.generatePreference(reservedGift, activePaymentProvider, input);
        referenceId = preference.referenceId;
        checkoutUrl = preference.checkoutUrl;
      } catch (error) {
        if (!reservedGift.hasLinkFor(activePaymentProvider)) {
          throw error;
        }
        referenceId = reservedGift.providerReferenceIdFor(activePaymentProvider)!;
        checkoutUrl = reservedGift.checkoutUrlFor(activePaymentProvider)!;
      }
    } else if (reservedGift.hasLinkFor(activePaymentProvider)) {
      referenceId = reservedGift.providerReferenceIdFor(activePaymentProvider)!;
      checkoutUrl = reservedGift.checkoutUrlFor(activePaymentProvider)!;
    } else {
      const preference = await this.generatePreference(reservedGift, activePaymentProvider, input);
      referenceId = preference.referenceId;
      checkoutUrl = preference.checkoutUrl;
    }

    const contributionWithReference = await this.giftContributionRepository.update(
      contribution.withProviderReference(activePaymentProvider, referenceId)
    );

    return { contribution: contributionWithReference, checkoutUrl };
  }

  private async generatePreference(
    gift: Gift,
    provider: PaymentProvider,
    input: CreateGiftContributionInput
  ): Promise<{ referenceId: string; checkoutUrl: string }> {
    const gateway = this.resolvePaymentGateway(provider);
    const preference = await gateway.createPreference({
      title: gift.name,
      amount: gift.price,
      externalReference: gift.id!,
      payerName: input.guestName,
      payerEmail: input.guestEmail,
      payerPhone: input.guestPhone ?? undefined,
    });

    await this.giftRepository.update(gift.withProviderLink(provider, preference.preferenceId, preference.checkoutUrl));

    return { referenceId: preference.preferenceId, checkoutUrl: preference.checkoutUrl };
  }
}
