import { GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

export class InMemoryGiftContributionRepository implements GiftContributionRepository {
  private contributions: GiftContribution[] = [];
  private nextId = 1;

  async save(contribution: GiftContribution): Promise<GiftContribution> {
    const persisted = GiftContribution.create({
      ...contribution,
      id: contribution.id ?? `contribution-${this.nextId++}`,
    });
    this.contributions.push(persisted);
    return persisted;
  }

  async update(contribution: GiftContribution): Promise<GiftContribution> {
    const index = this.contributions.findIndex((c) => c.id === contribution.id);
    if (index === -1) {
      throw new Error(`Gift contribution with id ${contribution.id} not found.`);
    }
    this.contributions[index] = contribution;
    return contribution;
  }

  async findById(id: string): Promise<GiftContribution | null> {
    return this.contributions.find((c) => c.id === id) ?? null;
  }

  async findByPreferenceId(preferenceId: string): Promise<GiftContribution | null> {
    return this.contributions.find((c) => c.mercadoPagoPreferenceId === preferenceId) ?? null;
  }

  async findApproved(): Promise<GiftContribution[]> {
    return this.contributions.filter((c) => c.status === "approved");
  }
}
