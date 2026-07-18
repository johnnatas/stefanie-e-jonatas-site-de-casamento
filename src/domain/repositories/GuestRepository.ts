import { Guest } from "@/domain/entities/Guest";

export interface GuestRepository {
  save(guest: Guest): Promise<Guest>;
  findAll(): Promise<Guest[]>;
}
