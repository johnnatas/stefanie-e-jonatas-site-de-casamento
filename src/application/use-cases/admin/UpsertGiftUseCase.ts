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

export class UpsertGiftUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(input: UpsertGiftInput): Promise<Gift> {
    if (!input.id) {
      return this.giftRepository.save(Gift.create(input));
    }

    const existingGift = await this.giftRepository.findById(input.id);
    if (!existingGift) {
      throw new InvalidGiftDataError(`Gift with id ${input.id} was not found.`);
    }

    const updatedGift = Gift.create({ ...input, status: existingGift.status });
    return this.giftRepository.update(updatedGift);
  }
}
