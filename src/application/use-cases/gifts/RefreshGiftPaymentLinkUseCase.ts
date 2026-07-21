import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { PaymentGateway } from "@/application/ports/PaymentGateway";

export class RefreshGiftPaymentLinkUseCase {
  constructor(
    private readonly giftRepository: GiftRepository,
    private readonly paymentGateway: PaymentGateway
  ) {}

  async execute(gift: Gift): Promise<Gift> {
    const preference = await this.paymentGateway.createPreference({
      title: gift.name,
      amount: gift.price,
      externalReference: gift.id!,
    });

    const giftWithLink = Gift.create({
      ...gift,
      mercadoPagoPreferenceId: preference.preferenceId,
      mercadoPagoCheckoutUrl: preference.checkoutUrl,
    });

    return this.giftRepository.update(giftWithLink);
  }
}
