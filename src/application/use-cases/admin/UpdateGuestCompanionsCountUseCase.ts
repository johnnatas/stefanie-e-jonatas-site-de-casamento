import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

export interface UpdateGuestCompanionsCountInput {
  id: string;
  companionsCount: number;
}

export class UpdateGuestCompanionsCountUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: UpdateGuestCompanionsCountInput): Promise<Guest> {
    if (!Number.isInteger(input.companionsCount) || input.companionsCount < 0 || input.companionsCount > 10) {
      throw new InvalidGuestDataError("Companions count must be an integer between 0 and 10.");
    }

    const guest = await this.guestRepository.findById(input.id);
    if (!guest) {
      throw new GuestNotFoundError(`Guest with id ${input.id} was not found.`);
    }

    return this.guestRepository.updateAttendance(input.id, {
      attendanceStatus: guest.attendanceStatus,
      companionsCount: input.companionsCount,
    });
  }
}
