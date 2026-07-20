import { GiftContribution } from "@/domain/entities/GiftContribution";
import { Gift } from "@/domain/entities/Gift";

export interface ContributionRow {
  id: string;
  guestName: string;
  giftName: string;
  amount: number;
  status: GiftContribution["status"];
  createdAt: Date;
}

export function buildContributionRows(contributions: GiftContribution[], gifts: Gift[]): ContributionRow[] {
  const giftNameById = new Map(gifts.map((gift) => [gift.id!, gift.name]));

  return [...contributions]
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .map((contribution) => ({
      id: contribution.id!,
      guestName: contribution.guestName,
      giftName: giftNameById.get(contribution.giftId) ?? "—",
      amount: contribution.amount,
      status: contribution.status,
      createdAt: contribution.createdAt,
    }));
}
