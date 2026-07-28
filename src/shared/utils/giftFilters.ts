import { GiftDto } from "@/components/gifts/GiftDto";

export interface GiftFilterParams {
  q?: string;
  categoria?: string[];
  situacao?: string;
  ordenar?: string;
}

export function filterAndSortGifts(gifts: GiftDto[], params: GiftFilterParams): GiftDto[] {
  const term = params.q?.trim().toLowerCase() ?? "";
  const categories = params.categoria ?? [];
  const situacao = params.situacao;

  const filtered = gifts.filter((gift) => {
    const matchesName = !term || gift.name.toLowerCase().includes(term);
    const matchesCategory = categories.length === 0 || categories.includes(gift.category);
    const matchesStatus = !situacao || gift.status === situacao;
    return matchesName && matchesCategory && matchesStatus;
  });

  switch (params.ordenar) {
    case "nome-asc":
      return [...filtered].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
    case "nome-desc":
      return [...filtered].sort((a, b) => b.name.localeCompare(a.name, "pt-BR"));
    case "valor-asc":
      return [...filtered].sort((a, b) => a.price - b.price);
    case "valor-desc":
      return [...filtered].sort((a, b) => b.price - a.price);
    default:
      return filtered;
  }
}

export function getGiftCategories(gifts: GiftDto[]): string[] {
  return Array.from(new Set(gifts.map((gift) => gift.category))).sort((a, b) => a.localeCompare(b, "pt-BR"));
}
