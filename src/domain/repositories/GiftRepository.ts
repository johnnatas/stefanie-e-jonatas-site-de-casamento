import { Gift } from "@/domain/entities/Gift";

export interface GiftRepository {
  save(gift: Gift): Promise<Gift>;
  update(gift: Gift): Promise<Gift>;
  findAll(): Promise<Gift[]>;
  findById(id: string): Promise<Gift | null>;
}
