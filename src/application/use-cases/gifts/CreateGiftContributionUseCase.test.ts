import { beforeEach, describe, expect, it } from "vitest";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

describe("CreateGiftContributionUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let paymentGateway: FakePaymentGateway;
  let useCase: CreateGiftContributionUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    paymentGateway = new FakePaymentGateway();
    useCase = new CreateGiftContributionUseCase(giftRepository, contributionRepository, paymentGateway);

    await giftRepository.save(
      Gift.create({
        id: "gift-1",
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );
  });

  it("reserves the gift, creates a pending contribution, and creates a checkout url when the gift has none stored", async () => {
    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
    });

    expect(result.contribution.status).toBe("pending");
    expect(result.contribution.amount).toBe(450);
    expect(result.contribution.mercadoPagoPreferenceId).toBeDefined();
    expect(result.checkoutUrl).toContain("mercadopago.test");

    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("reserved");
    expect(gift?.mercadoPagoCheckoutUrl).toBe(result.checkoutUrl);
  });

  it("reuses the gift's stored checkout url instead of creating a new preference", async () => {
    const gift = await giftRepository.findById("gift-1");
    await giftRepository.update(
      Gift.create({
        ...gift!,
        mercadoPagoPreferenceId: "preference-fixed",
        mercadoPagoCheckoutUrl: "https://mercadopago.test/fixed-link",
      })
    );

    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
    });

    expect(result.checkoutUrl).toBe("https://mercadopago.test/fixed-link");
    expect(result.contribution.mercadoPagoPreferenceId).toBe("preference-fixed");
  });

  it("throws when the gift does not exist", async () => {
    await expect(
      useCase.execute({ giftId: "missing", guestName: "Carla Nunes", guestEmail: "carla@example.com" })
    ).rejects.toThrow(InvalidGiftDataError);
  });

  it("throws when the gift is already reserved", async () => {
    await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    await expect(
      useCase.execute({ giftId: "gift-1", guestName: "Outro", guestEmail: "outro@example.com" })
    ).rejects.toThrow(GiftNotAvailableError);
  });
});
