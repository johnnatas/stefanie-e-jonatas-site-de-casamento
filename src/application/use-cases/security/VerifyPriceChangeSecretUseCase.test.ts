import { describe, expect, it } from "vitest";
import { VerifyPriceChangeSecretUseCase } from "@/application/use-cases/security/VerifyPriceChangeSecretUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";

describe("VerifyPriceChangeSecretUseCase", () => {
  it("returns true for the correct key", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("chave-correta");

    expect(result).toBe(true);
  });

  it("returns false for an incorrect key", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("chave-errada");

    expect(result).toBe(false);
  });

  it("returns false for an empty candidate", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("");

    expect(result).toBe(false);
  });

  it("returns false when no secret key has been configured yet", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    const result = await new VerifyPriceChangeSecretUseCase(repository).execute("qualquer-coisa");

    expect(result).toBe(false);
  });
});
