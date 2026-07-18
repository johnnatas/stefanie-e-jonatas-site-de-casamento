import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";

export class ListGuestsUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(): Promise<Guest[]> {
    const guests = await this.guestRepository.findAll();
    return [...guests].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
}
