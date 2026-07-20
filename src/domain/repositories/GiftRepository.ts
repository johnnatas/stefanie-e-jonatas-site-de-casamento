import { Gift } from "@/domain/entities/Gift";

export interface GiftRepository {
  save(gift: Gift): Promise<Gift>;
  update(gift: Gift): Promise<Gift>;
  delete(id: string): Promise<void>;
  findAll(): Promise<Gift[]>;
  findById(id: string): Promise<Gift | null>;
}
