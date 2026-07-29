import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { PaymentGateway } from "@/application/ports/PaymentGateway";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export class RefreshGiftPaymentLinkUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly resolvePaymentGateway: (provider: PaymentProvider) => PaymentGateway
  ) {}

  async execute(gift: Gift, provider: PaymentProvider): Promise<Gift> {
    const gateway = this.resolvePaymentGateway(provider);
    const preference = await gateway.createPreference({
      title: gift.name,
      amount: gift.price,
      externalReference: gift.id!,
    });

    const giftWithLink = gift.withProviderLink(provider, preference.preferenceId, preference.checkoutUrl);
    return this.giftRepository.update(giftWithLink);
  }
}
