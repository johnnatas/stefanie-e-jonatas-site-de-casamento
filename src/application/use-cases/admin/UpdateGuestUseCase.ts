import { AttendanceStatus, Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

export interface UpdateGuestInput {
  id: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  attendanceStatus: AttendanceStatus;
  message?: string;
}

export class UpdateGuestUseCase {
  constructor(private readonly guestRepository: GuestRepository) {}

  async execute(input: UpdateGuestInput): Promise<Guest> {
    const existingGuest = await this.guestRepository.findById(input.id);
    if (!existingGuest) {
      throw new GuestNotFoundError(`Guest with id ${input.id} was not found.`);
    }

    const updatedGuest = Guest.create({
      id: input.id,
      fullName: input.fullName,
      nickname: input.nickname,
      email: input.email,
      phone: input.phone,
      companionsCount: input.companionsCount,
      attendanceStatus: input.attendanceStatus,
      message: input.message,
      createdAt: existingGuest.createdAt,
    });

    return this.guestRepository.update(updatedGuest);
  }
}
