import { GiftRepository } from "@/domain/repositories/GiftRepository";

export class DeleteGiftUseCase {
  constructor(private readonly giftRepository: GiftRepository) {}

  async execute(id: string): Promise<void> {
    await this.giftRepository.delete(id);
  }
}
