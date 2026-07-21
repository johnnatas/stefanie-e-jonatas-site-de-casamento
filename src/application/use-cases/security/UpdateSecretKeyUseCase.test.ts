import { describe, expect, it } from "vitest";
import { UpdateSecretKeyUseCase } from "@/application/use-cases/security/UpdateSecretKeyUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

describe("UpdateSecretKeyUseCase", () => {
  it("sets the key for the first time with no current key required", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await new UpdateSecretKeyUseCase(repository).execute({ newKey: "primeira-chave" });

    const settings = await repository.getSettings();
    expect(
      verifySecretKeyHash("primeira-chave", settings.priceChangeSecretHash!, settings.priceChangeSecretSalt!)
    ).toBe(true);
  });

  it("changes the key when the correct current key is provided", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await new UpdateSecretKeyUseCase(repository).execute({ newKey: "chave-antiga" });

    await new UpdateSecretKeyUseCase(repository).execute({ currentKey: "chave-antiga", newKey: "chave-nova" });

    const settings = await repository.getSettings();
    expect(
      verifySecretKeyHash("chave-nova", settings.priceChangeSecretHash!, settings.priceChangeSecretSalt!)
    ).toBe(true);
  });

  it("rejects changing the key when the current key is wrong", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await new UpdateSecretKeyUseCase(repository).execute({ newKey: "chave-antiga" });

    await expect(
      new UpdateSecretKeyUseCase(repository).execute({ currentKey: "chave-errada", newKey: "chave-nova" })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects a new key shorter than 6 characters", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await expect(new UpdateSecretKeyUseCase(repository).execute({ newKey: "abc" })).rejects.toThrow(
      InvalidSecurityCredentialError
    );
  });
});
