import { describe, expect, it } from "vitest";
import { GenerateMissingPaymentLinksUseCase } from "@/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("GenerateMissingPaymentLinksUseCase", () => {
  async function makeGift(repository: InMemoryGiftRepository, overrides: Partial<Parameters<typeof Gift.create>[0]> = {}) {
    return repository.save(
      Gift.create({
        name: "Presente",
        description: "desc",
        imageUrl: null,
        price: 100,
        category: "casa",
        ...overrides,
      })
    );
  }

  it("does nothing when every gift already has a link for the provider", async () => {
    const repository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const refresh = new RefreshGiftPaymentLinkUseCase(repository, () => gateway);
    const gift = await makeGift(repository);
    await repository.update(gift.withProviderLink("mercado_pago", "pref-1", "https://mp.test/1"));

    const result = await new GenerateMissingPaymentLinksUseCase(repository, refresh).execute("mercado_pago");

    expect(result).toEqual({ generated: 0, failed: [] });
  });

  it("generates links only for gifts missing one for the given provider", async () => {
    const repository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const refresh = new RefreshGiftPaymentLinkUseCase(repository, () => gateway);
    const hasLink = await makeGift(repository, { name: "Já tem link" });
    await repository.update(hasLink.withProviderLink("mercado_pago", "pref-1", "https://mp.test/1"));
    await makeGift(repository, { name: "Sem link" });

    const result = await new GenerateMissingPaymentLinksUseCase(repository, refresh).execute("mercado_pago");

    expect(result.generated).toBe(1);
    expect(result.failed).toEqual([]);
    const gifts = await repository.findAll();
    expect(gifts.every((gift) => gift.hasLinkFor("mercado_pago"))).toBe(true);
  });

  it("records a failure per gift without stopping the rest", async () => {
    const repository = new InMemoryGiftRepository();
    const giftA = await makeGift(repository, { name: "AA" });
    const giftB = await makeGift(repository, { name: "BB" });
    let calls = 0;
    const flakyGateway = {
      createPreference: async () => {
        calls++;
        if (calls === 1) throw new Error("Falha temporária");
        return { preferenceId: "pref-ok", checkoutUrl: "https://mp.test/ok" };
      },
    };
    const refresh = new RefreshGiftPaymentLinkUseCase(repository, () => flakyGateway);

    const result = await new GenerateMissingPaymentLinksUseCase(repository, refresh).execute("mercado_pago");

    expect(result.generated).toBe(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].reason).toBe("Falha temporária");
    expect([giftA.id, giftB.id]).toContain(result.failed[0].giftId);
  });
});
