import { AttendanceStatus, Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";

export interface CreateGuestInput {
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount?: number;
  attendanceStatus?: AttendanceStatus;
  message?: string;
}

export class CreateGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: CreateGuestInput): Promise<Guest> {
    const guest = Guest.create({
      fullName: input.fullName,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      companionsCount: input.companionsCount ?? 0,
      attendanceStatus: input.attendanceStatus ?? "pending",
      message: input.message,
    });

    return this.guestRepository.save(guest);
  }
}
