import { GiftDto } from "@/components/gifts/GiftDto";
import { GiftCard } from "@/components/gifts/GiftCard";

interface GiftGridProps {
  gifts: GiftDto[];
  canReserveForLater: boolean;
}

export function GiftGrid({ gifts, canReserveForLater }: GiftGridProps) {
  if (gifts.length === 0) {
    return (
      <p className="text-center font-sans text-forest/70">
        A lista de presentes ainda está sendo preparada.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {gifts.map((gift) => (
        <GiftCard key={gift.id} gift={gift} canReserveForLater={canReserveForLater} />
      ))}
    </div>
  );
}
