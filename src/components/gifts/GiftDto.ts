import { Gift } from "@/domain/entities/Gift";

export interface GiftDto {
  id: string;
  name: string;
  description: string;
  imageUrl: string | null;
  price: number;
  category: string;
  status: "available" | "reserved" | "paid";
}

export function mapGiftToDto(gift: Gift): GiftDto {
  return {
    id: gift.id!,
    name: gift.name,
    description: gift.description,
    imageUrl: gift.imageUrl,
    price: gift.price,
    category: gift.category,
    status: gift.status,
  };
}
