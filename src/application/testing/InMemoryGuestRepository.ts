import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";

export class InMemoryGuestRepository implements GuestRepository {
  private guests: Guest[] = [];
  private nextId = 1;

  async save(guest: Guest): Promise<Guest> {
    const persisted = Guest.create({ ...guest, id: guest.id ?? `guest-${this.nextId++}` });
    this.guests.push(persisted);
    return persisted;
  }

  async findAll(): Promise<Guest[]> {
    return [...this.guests];
  }
}
