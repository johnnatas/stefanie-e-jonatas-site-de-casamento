import { GiftContribution } from "@/domain/entities/GiftContribution";

export interface GiftContributionRepository {
  save(contribution: GiftContribution): Promise<GiftContribution>;
  update(contribution: GiftContribution): Promise<GiftContribution>;
  findById(id: string): Promise<GiftContribution | null>;
  findByPreferenceId(preferenceId: string): Promise<GiftContribution | null>;
  findApproved(): Promise<GiftContribution[]>;
}
