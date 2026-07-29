import { beforeEach, describe, expect, it } from "vitest";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";
import { GiftNotAvailableError, InvalidGiftDataError } from "@/domain/errors/DomainError";

describe("CreateGiftContributionUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let securitySettingsRepository: InMemoryAdminSecuritySettingsRepository;
  let gateway: FakePaymentGateway;
  let useCase: CreateGiftContributionUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    securitySettingsRepository = new InMemoryAdminSecuritySettingsRepository();
    gateway = new FakePaymentGateway();
    useCase = new CreateGiftContributionUseCase(
      giftRepository,
      contributionRepository,
      securitySettingsRepository,
      () => gateway
    );

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
    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.contribution.status).toBe("pending");
    expect(result.contribution.amount).toBe(450);
    expect(result.contribution.paymentProvider).toBe("mercado_pago");
    expect(result.contribution.mercadoPagoPreferenceId).toBeDefined();
    expect(result.checkoutUrl).toContain("mercadopago.test");

    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("reserved");
    expect(gift?.mercadoPagoCheckoutUrl).toBe(result.checkoutUrl);
  });

  it("reuses the gift's stored checkout url instead of creating a new preference", async () => {
    const gift = await giftRepository.findById("gift-1");
    await giftRepository.update(gift!.withProviderLink("mercado_pago", "preference-fixed", "https://mercadopago.test/fixed-link"));

    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.checkoutUrl).toBe("https://mercadopago.test/fixed-link");
    expect(result.contribution.mercadoPagoPreferenceId).toBe("preference-fixed");
  });

  it("uses the active provider's link and gateway when Infinite Pay is active", async () => {
    await securitySettingsRepository.updateActivePaymentProvider("infinite_pay");
    await securitySettingsRepository.updateInfinitePayHandle("meu_handle");

    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.contribution.paymentProvider).toBe("infinite_pay");
    expect(result.contribution.infinitePayOrderNsu).toBeDefined();
    expect(result.contribution.mercadoPagoPreferenceId).toBeUndefined();
  });

  it("stores the guest phone on the contribution and forwards it to the gateway", async () => {
    let receivedPhone: string | undefined;
    const capturingGateway = {
      createPreference: async (input: { payerPhone?: string }) => {
        receivedPhone = input.payerPhone;
        return { preferenceId: "pref-1", checkoutUrl: "https://mercadopago.test/1" };
      },
    };
    useCase = new CreateGiftContributionUseCase(giftRepository, contributionRepository, securitySettingsRepository, () => capturingGateway);

    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      guestPhone: "+5511987654321",
    });

    expect(result.contribution.guestPhone).toBe("+5511987654321");
    expect(receivedPhone).toBe("+5511987654321");
  });

  it("omits payerPhone when the guest left it blank", async () => {
    let receivedInput: { payerPhone?: string } | undefined;
    const capturingGateway = {
      createPreference: async (input: { payerPhone?: string }) => {
        receivedInput = input;
        return { preferenceId: "pref-1", checkoutUrl: "https://mercadopago.test/1" };
      },
    };
    useCase = new CreateGiftContributionUseCase(giftRepository, contributionRepository, securitySettingsRepository, () => capturingGateway);

    const result = await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    expect(result.contribution.guestPhone).toBeNull();
    expect(receivedInput?.payerPhone).toBeUndefined();
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

  it("reserves the gift for about 30 minutes by default", async () => {
    const before = Date.now();

    await useCase.execute({ giftId: "gift-1", guestName: "Carla Nunes", guestEmail: "carla@example.com" });

    const after = Date.now();
    const gift = await giftRepository.findById("gift-1");
    const reservedUntilMs = gift!.reservedUntil!.getTime();

    expect(reservedUntilMs).toBeGreaterThanOrEqual(before + 29 * 60 * 1000);
    expect(reservedUntilMs).toBeLessThanOrEqual(after + 31 * 60 * 1000);
  });

  it("reserves until the guest's chosen date and stores it on the contribution when provided", async () => {
    const expectedPaymentDate = new Date("2027-05-01T23:59:59-03:00");

    const result = await useCase.execute({
      giftId: "gift-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      expectedPaymentDate,
    });

    expect(result.contribution.expectedPaymentDate).toEqual(expectedPaymentDate);
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.reservedUntil).toEqual(expectedPaymentDate);
  });
});
