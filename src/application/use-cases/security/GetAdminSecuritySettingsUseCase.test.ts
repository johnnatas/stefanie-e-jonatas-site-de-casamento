import { describe, expect, it } from "vitest";
import { GetAdminSecuritySettingsUseCase } from "@/application/use-cases/security/GetAdminSecuritySettingsUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";

describe("GetAdminSecuritySettingsUseCase", () => {
  it("returns null/false when nothing has been configured yet", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({ mercadoPagoAccessTokenLast4: null, hasSecretKey: false });
  });

  it("returns the last 4 characters of the token and hasSecretKey true when both are set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-7812913636974826-072012-63c40beb");
    const { hash, salt } = hashSecretKey("uma-chave");
    await repository.updateSecretKeyHash(hash, salt);

    const summary = await new GetAdminSecuritySettingsUseCase(repository).execute();

    expect(summary).toEqual({ mercadoPagoAccessTokenLast4: "0beb", hasSecretKey: true });
  });
});
