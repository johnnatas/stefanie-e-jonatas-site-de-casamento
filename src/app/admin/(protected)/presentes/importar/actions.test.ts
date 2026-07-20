import { describe, expect, it } from "vitest";
import { importGiftRows } from "@/app/admin/(protected)/presentes/importar/actions";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { Gift } from "@/domain/entities/Gift";

describe("importGiftRows", () => {
  it("creates gifts from valid rows, accepting comma or dot decimals", async () => {
    const repository = new InMemoryGiftRepository();
    const useCase = new UpsertGiftUseCase(repository);

    const result = await importGiftRows(
      [
        { Nome: "Jogo de panelas", Descrição: "5 panelas", Categoria: "cozinha", Valor: "450,00" },
        { Nome: "Aspirador", Descrição: "Robô aspirador", Categoria: "casa", Valor: "899.90" },
      ],
      repository,
      useCase
    );

    expect(result).toEqual({ created: 2, skipped: 0, errors: [] });
    const gifts = await repository.findAll();
    expect(gifts.map((g) => g.price)).toEqual([450, 899.9]);
    expect(gifts.every((g) => g.imageUrl === null)).toBe(true);
  });

  it("skips rows matching an existing gift name (case-insensitive)", async () => {
    const repository = new InMemoryGiftRepository();
    await repository.save(
      Gift.create({ name: "Jogo de panelas", description: "x", imageUrl: "/a.jpg", price: 100, category: "cozinha" })
    );
    const useCase = new UpsertGiftUseCase(repository);

    const result = await importGiftRows(
      [{ Nome: "jogo de panelas", Descrição: "x", Categoria: "cozinha", Valor: "100" }],
      repository,
      useCase
    );

    expect(result).toEqual({ created: 0, skipped: 1, errors: [] });
  });

  it("reports a per-row error for an invalid value", async () => {
    const repository = new InMemoryGiftRepository();
    const useCase = new UpsertGiftUseCase(repository);

    const result = await importGiftRows(
      [{ Nome: "Item", Descrição: "x", Categoria: "casa", Valor: "não é número" }],
      repository,
      useCase
    );

    expect(result.created).toBe(0);
    expect(result.errors).toEqual([{ row: 0, message: "Verifique o valor informado." }]);
  });
});
