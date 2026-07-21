import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";

export interface UpsertGiftInput {
  id?: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: string;
}

export interface UpsertGiftResult {
  gift: Gift;
  nameOrPriceChanged: boolean;
}

export class UpsertGiftUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(input: UpsertGiftInput): Promise<UpsertGiftResult> {
    if (!input.id) {
      const created = await this.giftRepository.save(Gift.create(input));
      return { gift: created, nameOrPriceChanged: true };
    }

    const existingGift = await this.giftRepository.findById(input.id);
    if (!existingGift) {
      throw new InvalidGiftDataError(`Gift with id ${input.id} was not found.`);
    }

    const nameOrPriceChanged =
      existingGift.name !== input.name.trim() || existingGift.price !== input.price;

    // A stale Mercado Pago preference/checkout link encodes the OLD price
    // (or title). Clearing it here — before the caller's best-effort
    // RefreshGiftPaymentLinkUseCase call, which can fail — guarantees a
    // guest can never be charged an outdated price: with no link stored,
    // CreateGiftContributionUseCase always creates a fresh preference at
    // the current price on the next purchase attempt.
    const updatedGift = Gift.create({
      ...input,
      status: existingGift.status,
      mercadoPagoPreferenceId: nameOrPriceChanged ? undefined : existingGift.mercadoPagoPreferenceId,
      mercadoPagoCheckoutUrl: nameOrPriceChanged ? null : existingGift.mercadoPagoCheckoutUrl,
    });
    const saved = await this.giftRepository.update(updatedGift);

    return { gift: saved, nameOrPriceChanged };
  }
}
