import { Gift } from "@/domain/entities/Gift";

export interface GiftDto {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  status: "available" | "reserved" | "paid";
}

export function mapGiftToDto(gift: Gift): GiftDto {
  return {
    id: gift.id!,
    name: gift.name,
    description: gift.description,
    price: gift.price,
    category: gift.category,
    status: gift.status,
  };
}
