import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";

export interface ConfirmRsvpInput {
  fullName: string;
  email: string;
  phone: string;
  companionsCount: number;
  message?: string;
  attendanceConfirmed: boolean;
}

export class ConfirmRsvpUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: ConfirmRsvpInput): Promise<Guest> {
    const guest = Guest.create(input);
    return this.guestRepository.save(guest);
  }
}
