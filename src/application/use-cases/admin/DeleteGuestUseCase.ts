import { GuestRepository } from "@/domain/repositories/GuestRepository";

export class DeleteGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(id: string): Promise<void> {
    await this.guestRepository.delete(id);
  }
}
