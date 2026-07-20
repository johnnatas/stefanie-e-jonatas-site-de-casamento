import { describe, expect, it } from "vitest";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("RefreshGiftPaymentLinkUseCase", () => {
  it("creates a preference using the gift's own id as the external reference and persists the link", async () => {
    const repository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const gift = await repository.save(
      Gift.create({
        name: "Liquidificador",
        description: "Liquidificador de alta potência",
        imageUrl: "/placeholder.jpg",
        price: 300,
        category: "cozinha",
      })
    );

    const updated = await new RefreshGiftPaymentLinkUseCase(repository, gateway).execute(gift);

    expect(updated.mercadoPagoPreferenceId).toBeDefined();
    expect(updated.mercadoPagoCheckoutUrl).toContain(`ref=${gift.id}`);

    const persisted = await repository.findById(gift.id!);
    expect(persisted?.mercadoPagoCheckoutUrl).toBe(updated.mercadoPagoCheckoutUrl);
  });

  it("propagates a payment gateway failure", async () => {
    const repository = new InMemoryGiftRepository();
    const gift = await repository.save(
      Gift.create({
        name: "Cafeteira",
        description: "Cafeteira elétrica",
        imageUrl: "/placeholder.jpg",
        price: 200,
        category: "cozinha",
      })
    );
    const failingGateway = {
      createPreference: async () => {
        throw new Error("Mercado Pago indisponível");
      },
      getPayment: async () => {
        throw new Error("not used");
      },
    };

    await expect(new RefreshGiftPaymentLinkUseCase(repository, failingGateway).execute(gift)).rejects.toThrow(
      "Mercado Pago indisponível"
    );
  });
});
