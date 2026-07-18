import { GuestPublicSummary, GuestRepository } from "@/domain/repositories/GuestRepository";

export class SearchGuestsUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(): Promise<GuestPublicSummary[]> {
    const guests = await this.guestRepository.findAllPublicNames();
    return [...guests].sort((a, b) => a.fullName.localeCompare(b.fullName));
  }
}
