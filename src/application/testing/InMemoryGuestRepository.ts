import { Guest } from "@/domain/entities/Guest";
import { GuestAttendanceUpdate, GuestPublicSummary, GuestRepository } from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

export class InMemoryGuestRepository implements GuestRepository {
  private guests: Guest[] = [];
  private nextId = 1;

  async save(guest: Guest): Promise<Guest> {
    const persisted = Guest.create({ ...guest, id: guest.id ?? `guest-${this.nextId++}` });
    this.guests.push(persisted);
    return persisted;
  }

  async update(guest: Guest): Promise<Guest> {
    const index = this.guests.findIndex((existing) => existing.id === guest.id);
    if (index === -1) {
      throw new GuestNotFoundError("Guest not found.");
    }
    this.guests[index] = guest;
    return guest;
  }

  async delete(id: string): Promise<void> {
    const index = this.guests.findIndex((existing) => existing.id === id);
    if (index === -1) {
      throw new GuestNotFoundError("Guest not found.");
    }
    this.guests.splice(index, 1);
  }

  async findAll(): Promise<Guest[]> {
    return [...this.guests];
  }

  async findAllPublicNames(): Promise<GuestPublicSummary[]> {
    return this.guests.map((guest) => ({
      id: guest.id!,
      fullName: guest.fullName,
      nickname: guest.nickname,
    }));
  }

  async findById(id: string): Promise<Guest | null> {
    return this.guests.find((guest) => guest.id === id) ?? null;
  }

  async updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest> {
    const index = this.guests.findIndex((guest) => guest.id === id);
    if (index === -1) {
      throw new GuestNotFoundError("Guest not found.");
    }

    const existing = this.guests[index];
    const updated = Guest.create({
      ...existing,
      attendanceStatus: update.attendanceStatus,
      companionsCount: update.companionsCount ?? existing.companionsCount,
      message: update.message ?? existing.message,
    });

    this.guests[index] = updated;
    return updated;
  }
}
