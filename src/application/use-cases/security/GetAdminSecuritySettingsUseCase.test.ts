import { describe, expect, it } from "vitest";
import { GetAdminSecuritySettingsUseCase } from "@/application/use-cases/security/GetAdminSecuritySettingsUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";

describe("GetAdminSecuritySettingsUseCase", () => {
  it("returns null/false when nothing has been configured yet", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({
      mercadoPagoAccessTokenLast4: null,
      resendApiKeyLast4: null,
      hasSecretKey: false,
      activePaymentProvider: "mercado_pago",
      infinitePayHandle: null,
    });
  });

  it("returns the last 4 characters of the token and hasSecretKey true when both are set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-7812913636974826-072012-63c40beb");
    const { hash, salt } = hashSecretKey("uma-chave");
    await repository.updateSecretKeyHash(hash, salt);

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({
      mercadoPagoAccessTokenLast4: "0beb",
      resendApiKeyLast4: null,
      hasSecretKey: true,
      activePaymentProvider: "mercado_pago",
      infinitePayHandle: null,
    });
  });

  it("returns the last 4 characters of the Resend API key when set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateResendApiKey("re_123456789_abcd");

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary.resendApiKeyLast4).toBe("abcd");
  });

  it("defaults to mercado_pago with no Infinite Pay handle configured", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary.activePaymentProvider).toBe("mercado_pago");
    expect(summary.infinitePayHandle).toBeNull();
  });

  it("reflects a stored active provider and handle", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateActivePaymentProvider("infinite_pay");
    await repository.updateInfinitePayHandle("meu_handle");

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary.activePaymentProvider).toBe("infinite_pay");
    expect(summary.infinitePayHandle).toBe("meu_handle");
  });
});
