import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface ConfirmRsvpInput {
  guestId: string;
  attendanceStatus: "confirmed" | "declined";
  companionsCount?: number;
  companionGuestIds?: string[];
  email?: string;
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

    const companionGuestIds =
      input.attendanceStatus === "confirmed" ? (input.companionGuestIds ?? []) : [];

    if (companionGuestIds.length > companionsCount) {
      throw new InvalidGuestDataError("Number of identified companions exceeds the companions count.");
    }
    if (new Set(companionGuestIds).size !== companionGuestIds.length) {
      throw new InvalidGuestDataError("The same companion was selected more than once.");
    }
    if (companionGuestIds.includes(input.guestId)) {
      throw new InvalidGuestDataError("A guest cannot be their own companion.");
    }

    const email = input.email?.trim();
    if (input.attendanceStatus === "confirmed" && !email) {
      throw new InvalidGuestDataError("Email is required to confirm attendance.");
    }
    if (email && !EMAIL_PATTERN.test(email)) {
      throw new InvalidGuestDataError("Guest email is invalid.");
    }

    const guest = await this.guestRepository.findById(input.guestId);
    if (!guest) {
      throw new GuestNotFoundError("Guest not found.");
    }

    for (const companionId of companionGuestIds) {
      const companion = await this.guestRepository.findById(companionId);
      if (!companion) {
        throw new GuestNotFoundError("Companion guest not found.");
      }
    }

    const updatedGuest = await this.guestRepository.updateAttendance(input.guestId, {
      attendanceStatus: input.attendanceStatus,
      companionsCount,
      message: input.message?.trim() || undefined,
      email,
    });

    for (const companionId of companionGuestIds) {
      await this.guestRepository.updateAttendance(companionId, { attendanceStatus: "confirmed" });
    }

    return updatedGuest;
  }
}
