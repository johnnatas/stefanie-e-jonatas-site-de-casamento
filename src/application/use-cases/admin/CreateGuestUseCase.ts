import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";

export interface CreateGuestInput {
  fullName: string;
  nickname?: string;
}

export class CreateGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: CreateGuestInput): Promise<Guest> {
    const guest = Guest.create({
      fullName: input.fullName,
      nickname: input.nickname,
      companionsCount: 0,
      attendanceStatus: "pending",
    });

    return this.guestRepository.save(guest);
  }
}
