import { describe, expect, it } from "vitest";
import { UpdateResendApiKeyUseCase } from "@/application/use-cases/security/UpdateResendApiKeyUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { hashSecretKey } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

describe("UpdateResendApiKeyUseCase", () => {
  it("sets the key for the first time with no secret key required", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await new UpdateResendApiKeyUseCase(repository).execute({ apiKey: "re_primeiro" });

    const settings = await repository.getSettings();
    expect(settings.resendApiKey).toBe("re_primeiro");
  });

  it("requires the correct secret key once a key is already set", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateResendApiKey("re_antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await new UpdateResendApiKeyUseCase(repository).execute({
      apiKey: "re_novo",
      secretKey: "chave-correta",
    });

    const settings = await repository.getSettings();
    expect(settings.resendApiKey).toBe("re_novo");
  });

  it("rejects the change when the secret key is wrong", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await repository.updateResendApiKey("re_antigo");
    const { hash, salt } = hashSecretKey("chave-correta");
    await repository.updateSecretKeyHash(hash, salt);

    await expect(
      new UpdateResendApiKeyUseCase(repository).execute({ apiKey: "re_novo", secretKey: "chave-errada" })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects an empty key", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await expect(new UpdateResendApiKeyUseCase(repository).execute({ apiKey: "" })).rejects.toThrow(
      InvalidSecurityCredentialError
    );
  });
});
