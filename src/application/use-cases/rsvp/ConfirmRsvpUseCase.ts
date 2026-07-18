import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

export interface ConfirmRsvpInput {
  guestId: string;
  attendanceStatus: "confirmed" | "declined";
  companionsCount?: number;
  message?: string;
}

export class ConfirmRsvpUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: ConfirmRsvpInput): Promise<Guest> {
    const companionsCount =
      input.attendanceStatus === "confirmed" ? (input.companionsCount ?? 0) : 0;

    if (!Number.isInteger(companionsCount) || companionsCount < 0 || companionsCount > 10) {
      throw new InvalidGuestDataError("Companions count must be an integer between 0 and 10.");
    }

    const guest = await this.guestRepository.findById(input.guestId);
    if (!guest) {
      throw new GuestNotFoundError("Guest not found.");
    }

    return this.guestRepository.updateAttendance(input.guestId, {
      attendanceStatus: input.attendanceStatus,
      companionsCount,
      message: input.message?.trim() || undefined,
    });
  }
}
