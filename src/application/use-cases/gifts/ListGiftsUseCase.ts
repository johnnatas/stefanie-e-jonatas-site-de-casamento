import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";

export class ListGiftsUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(): Promise<Gift[]> {
    return this.giftRepository.findAll();
  }
}
