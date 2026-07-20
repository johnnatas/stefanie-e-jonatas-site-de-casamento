import { describe, expect, it } from "vitest";
import { importGiftRows } from "@/app/admin/(protected)/presentes/importar/actions";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("importGiftRows", () => {
  it("creates gifts from valid rows, accepting comma or dot decimals", async () => {
    const repository = new InMemoryGiftRepository();
    const useCase = new UpsertGiftUseCase(repository);
    const refreshUseCase = new RefreshGiftPaymentLinkUseCase(repository, new FakePaymentGateway());

    const result = await importGiftRows(
      [
        { Nome: "Jogo de panelas", Descrição: "5 panelas", Categoria: "cozinha", Valor: "450,00" },
        { Nome: "Aspirador", Descrição: "Robô aspirador", Categoria: "casa", Valor: "899.90" },
      ],
      repository,
      useCase,
      refreshUseCase
    );

    expect(result).toEqual({ created: 2, skipped: 0, withoutPaymentLink: 0, errors: [] });
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
    const refreshUseCase = new RefreshGiftPaymentLinkUseCase(repository, new FakePaymentGateway());

    const result = await importGiftRows(
      [{ Nome: "jogo de panelas", Descrição: "x", Categoria: "cozinha", Valor: "100" }],
      repository,
      useCase,
      refreshUseCase
    );

    expect(result).toEqual({ created: 0, skipped: 1, withoutPaymentLink: 0, errors: [] });
  });

  it("reports a per-row error for an invalid value", async () => {
    const repository = new InMemoryGiftRepository();
    const useCase = new UpsertGiftUseCase(repository);
    const refreshUseCase = new RefreshGiftPaymentLinkUseCase(repository, new FakePaymentGateway());

    const result = await importGiftRows(
      [{ Nome: "Item", Descrição: "x", Categoria: "casa", Valor: "não é número" }],
      repository,
      useCase,
      refreshUseCase
    );

    expect(result.created).toBe(0);
    expect(result.errors).toEqual([{ row: 0, message: "Verifique o valor informado." }]);
  });

  it("creates the gift and counts it as withoutPaymentLink when the payment gateway fails", async () => {
    const repository = new InMemoryGiftRepository();
    const upsertUseCase = new UpsertGiftUseCase(repository);
    const failingGateway = {
      createPreference: async () => {
        throw new Error("Mercado Pago indisponível");
      },
      getPayment: async () => {
        throw new Error("not used");
      },
    };
    const refreshUseCase = new RefreshGiftPaymentLinkUseCase(repository, failingGateway);

    const result = await importGiftRows(
      [{ Nome: "Jogo de toalhas", Descrição: "4 toalhas", Categoria: "casa", Valor: "150" }],
      repository,
      upsertUseCase,
      refreshUseCase
    );

    expect(result.created).toBe(1);
    expect(result.withoutPaymentLink).toBe(1);
    const gifts = await repository.findAll();
    expect(gifts[0].mercadoPagoCheckoutUrl).toBeNull();
  });

  it("creates the gift with a payment link when the gateway succeeds", async () => {
    const repository = new InMemoryGiftRepository();
    const upsertUseCase = new UpsertGiftUseCase(repository);
    const refreshUseCase = new RefreshGiftPaymentLinkUseCase(repository, new FakePaymentGateway());

    const result = await importGiftRows(
      [{ Nome: "Jogo de talheres", Descrição: "24 peças", Categoria: "cozinha", Valor: "200" }],
      repository,
      upsertUseCase,
      refreshUseCase
    );

    expect(result.created).toBe(1);
    expect(result.withoutPaymentLink).toBe(0);
    const gifts = await repository.findAll();
    expect(gifts[0].mercadoPagoCheckoutUrl).toContain("mercadopago.test");
  });
});
