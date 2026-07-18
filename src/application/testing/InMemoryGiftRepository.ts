import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";

export class InMemoryGiftRepository implements GiftRepository {
  private gifts: Gift[] = [];
  private nextId = 1;

  async save(gift: Gift): Promise<Gift> {
    const persisted = Gift.create({ ...gift, id: gift.id ?? `gift-${this.nextId++}` });
    this.gifts.push(persisted);
    return persisted;
  }

  async update(gift: Gift): Promise<Gift> {
    const index = this.gifts.findIndex((g) => g.id === gift.id);
    if (index === -1) {
      throw new Error(`Gift with id ${gift.id} not found.`);
    }
    this.gifts[index] = gift;
    return gift;
  }

  async findAll(): Promise<Gift[]> {
    return [...this.gifts];
  }

  async findById(id: string): Promise<Gift | null> {
    return this.gifts.find((g) => g.id === id) ?? null;
  }
}
