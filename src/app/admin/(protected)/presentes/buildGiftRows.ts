import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";
import type { PaymentProvider } from "@/domain/entities/PaymentProvider";
import type { GiftListItem } from "@/components/admin/GiftsTable";

export function buildGiftRows(
  gifts: Gift[],
  approvedContributions: GiftContribution[],
  activeProvider: PaymentProvider = "mercado_pago"
): GiftListItem[] {
  const contributionByGiftId = new Map<string, GiftContribution>();
  for (const contribution of approvedContributions) {
    const existing = contributionByGiftId.get(contribution.giftId);
    if (!existing || contribution.createdAt.getTime() > existing.createdAt.getTime()) {
      contributionByGiftId.set(contribution.giftId, contribution);
    }
  }

  return gifts.map((gift) => {
    const contribution = contributionByGiftId.get(gift.id!);
    return {
      id: gift.id!,
      name: gift.name,
      category: gift.category,
      price: gift.price,
      status: gift.status,
      createdAt: gift.createdAt,
      hasPaymentLink: gift.hasLinkFor(activeProvider),
      purchasedBy: contribution?.guestName,
      purchasedAt: contribution?.createdAt,
    };
  });
}
