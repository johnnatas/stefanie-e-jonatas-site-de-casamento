import { describe, expect, it } from "vitest";
import { filterAndSortGifts, getGiftCategories } from "@/shared/utils/giftFilters";
import { GiftDto } from "@/components/gifts/GiftDto";

function makeGift(overrides: Partial<GiftDto>): GiftDto {
  return {
    id: "1",
    name: "Jogo de panelas",
    description: "",
    imageUrl: null,
    price: 200,
    category: "cozinha",
    status: "available",
    ...overrides,
  };
}

const gifts: GiftDto[] = [
  makeGift({ id: "1", name: "Jogo de panelas", category: "cozinha", price: 200, status: "available" }),
  makeGift({ id: "2", name: "Aspirador robô", category: "casa", price: 900, status: "reserved" }),
  makeGift({ id: "3", name: "Jogo de taças", category: "cozinha", price: 80, status: "paid" }),
  makeGift({ id: "4", name: "Ferro de passar", category: "casa", price: 90, status: "available" }),
];

describe("filterAndSortGifts", () => {
  it("returns every gift unchanged (creation order) when no params are given", () => {
    expect(filterAndSortGifts(gifts, {})).toEqual(gifts);
  });

  it("filters by case-insensitive name substring", () => {
    const result = filterAndSortGifts(gifts, { q: "jogo" });
    expect(result.map((g) => g.id)).toEqual(["1", "3"]);
  });

  it("filters by a set of categories", () => {
    const result = filterAndSortGifts(gifts, { categoria: ["casa"] });
    expect(result.map((g) => g.id)).toEqual(["2", "4"]);
  });

  it("filters by status", () => {
    const result = filterAndSortGifts(gifts, { situacao: "available" });
    expect(result.map((g) => g.id)).toEqual(["1", "4"]);
  });

  it("combines name, category, and status filters", () => {
    const result = filterAndSortGifts(gifts, { q: "ferro", categoria: ["casa"], situacao: "available" });
    expect(result.map((g) => g.id)).toEqual(["4"]);
  });

  it("sorts by name ascending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "nome-asc" });
    expect(result.map((g) => g.name)).toEqual([
      "Aspirador robô",
      "Ferro de passar",
      "Jogo de panelas",
      "Jogo de taças",
    ]);
  });

  it("sorts by name descending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "nome-desc" });
    expect(result.map((g) => g.name)).toEqual([
      "Jogo de taças",
      "Jogo de panelas",
      "Ferro de passar",
      "Aspirador robô",
    ]);
  });

  it("sorts by price ascending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "valor-asc" });
    expect(result.map((g) => g.id)).toEqual(["3", "4", "1", "2"]);
  });

  it("sorts by price descending", () => {
    const result = filterAndSortGifts(gifts, { ordenar: "valor-desc" });
    expect(result.map((g) => g.id)).toEqual(["2", "1", "4", "3"]);
  });

  it("treats 'recentes' and any unrecognized value as creation order (no re-sort)", () => {
    expect(filterAndSortGifts(gifts, { ordenar: "recentes" })).toEqual(gifts);
    expect(filterAndSortGifts(gifts, { ordenar: "xpto" })).toEqual(gifts);
  });

  it("does not mutate the input array when sorting", () => {
    const copy = [...gifts];
    filterAndSortGifts(gifts, { ordenar: "nome-asc" });
    expect(gifts).toEqual(copy);
  });
});

describe("getGiftCategories", () => {
  it("returns the distinct categories, sorted", () => {
    expect(getGiftCategories(gifts)).toEqual(["casa", "cozinha"]);
  });

  it("returns an empty array for an empty gift list", () => {
    expect(getGiftCategories([])).toEqual([]);
  });
});
