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

    const updatedGift = Gift.create({
      ...input,
      status: existingGift.status,
      mercadoPagoPreferenceId: existingGift.mercadoPagoPreferenceId,
      mercadoPagoCheckoutUrl: existingGift.mercadoPagoCheckoutUrl,
    });
    const saved = await this.giftRepository.update(updatedGift);

    const nameOrPriceChanged = existingGift.name !== saved.name || existingGift.price !== saved.price;
    return { gift: saved, nameOrPriceChanged };
  }
}
