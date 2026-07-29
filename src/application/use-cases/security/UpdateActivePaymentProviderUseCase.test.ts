import { describe, expect, it } from "vitest";
import { UpdateActivePaymentProviderUseCase } from "@/application/use-cases/security/UpdateActivePaymentProviderUseCase";
import { GenerateMissingPaymentLinksUseCase } from "@/application/use-cases/gifts/GenerateMissingPaymentLinksUseCase";
import { RefreshGiftPaymentLinkUseCase } from "@/application/use-cases/gifts/RefreshGiftPaymentLinkUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";
import { Gift } from "@/domain/entities/Gift";

describe("UpdateActivePaymentProviderUseCase", () => {
  function makeUseCase() {
    const securitySettingsRepository = new InMemoryAdminSecuritySettingsRepository();
    const giftRepository = new InMemoryGiftRepository();
    const gateway = new FakePaymentGateway();
    const refresh = new RefreshGiftPaymentLinkUseCase(giftRepository, () => gateway);
    const generate = new GenerateMissingPaymentLinksUseCase(giftRepository, refresh);
    return { useCase: new UpdateActivePaymentProviderUseCase(securitySettingsRepository, generate), securitySettingsRepository, giftRepository };
  }

  it("switches to mercado_pago and generates missing links", async () => {
    const { useCase, securitySettingsRepository, giftRepository } = makeUseCase();
    await giftRepository.save(
      Gift.create({ name: "Presente", description: "desc", imageUrl: null, price: 100, category: "casa" })
    );

    const result = await useCase.execute({ provider: "mercado_pago" });

    expect(result.generated).toBe(1);
    const settings = await securitySettingsRepository.getSettings();
    expect(settings.activePaymentProvider).toBe("mercado_pago");
  });

  it("rejects switching to infinite_pay without a handle", async () => {
    const { useCase } = makeUseCase();

    await expect(useCase.execute({ provider: "infinite_pay" })).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("stores the handle and switches to infinite_pay when a handle is provided", async () => {
    const { useCase, securitySettingsRepository } = makeUseCase();

    await useCase.execute({ provider: "infinite_pay", infinitePayHandle: "meu_handle" });

    const settings = await securitySettingsRepository.getSettings();
    expect(settings.activePaymentProvider).toBe("infinite_pay");
    expect(settings.infinitePayHandle).toBe("meu_handle");
  });
});
