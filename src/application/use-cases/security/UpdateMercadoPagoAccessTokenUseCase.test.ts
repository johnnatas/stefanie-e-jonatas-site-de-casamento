import { describe, expect, it } from "vitest";
import { UpdateMercadoPagoAccessTokenUseCase } from "@/application/use-cases/security/UpdateMercadoPagoAccessTokenUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

describe("UpdateMercadoPagoAccessTokenUseCase", () => {
  it("sets the token for the first time with no secret key required", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await new UpdateMercadoPagoAccessTokenUseCase(repository).execute({ token: "APP_USR-primeiro-token" });

    const settings = await repository.getSettings();
    expect(settings.mercadoPagoAccessToken).toBe("APP_USR-primeiro-token");
  });

  it("requires the correct secret key once a token is already set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-token-antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await new UpdateMercadoPagoAccessTokenUseCase(repository).execute({
      token: "APP_USR-token-novo",
      secretKey: "chave-correta",
    });

    const settings = await repository.getSettings();
    expect(settings.mercadoPagoAccessToken).toBe("APP_USR-token-novo");
  });

  it("rejects the change when the secret key is wrong", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateMercadoPagoAccessToken("APP_USR-token-antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await expect(
      new UpdateMercadoPagoAccessTokenUseCase(repository).execute({
        token: "APP_USR-token-novo",
        secretKey: "chave-errada",
      })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects an empty token", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await expect(new UpdateMercadoPagoAccessTokenUseCase(repository).execute({ token: "" })).rejects.toThrow(
      InvalidSecurityCredentialError
    );
  });
});
