import { describe, expect, it } from "vitest";
import { RequestSecretKeyResetUseCase } from "@/application/use-cases/security/RequestSecretKeyResetUseCase";
import { ResetSecretKeyWithTokenUseCase } from "@/application/use-cases/security/ResetSecretKeyWithTokenUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

async function requestReset(repository: InMemoryAdminSecuritySettingsRepository): Promise<string> {
  let capturedToken = "";
  await new RequestSecretKeyResetUseCase(repository, new FakeEmailGateway()).execute({
    requesterEmail: "noivos@example.com",
    buildResetUrl: (token) => {
      capturedToken = token;
      return token;
    },
  });
  return capturedToken;
}

describe("ResetSecretKeyWithTokenUseCase", () => {
  it("sets the new key and clears the reset token when the token is valid", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const token = await requestReset(repository);

    await new ResetSecretKeyWithTokenUseCase(repository).execute({ token, newKey: "nova-chave-123" });

    const settings = await repository.getSettings();
    expect(verifySecretKeyHash("nova-chave-123", settings.priceChangeSecretHash!, settings.priceChangeSecretSalt!)).toBe(
      true
    );
    expect(await repository.getSecretResetToken()).toBeNull();
  });

  it("rejects an incorrect token", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    await requestReset(repository);

    await expect(
      new ResetSecretKeyWithTokenUseCase(repository).execute({ token: "token-errado", newKey: "nova-chave-123" })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects when no reset was ever requested", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();

    await expect(
      new ResetSecretKeyWithTokenUseCase(repository).execute({ token: "qualquer-coisa", newKey: "nova-chave-123" })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects an expired token", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const token = await requestReset(repository);
    const stored = await repository.getSecretResetToken();
    await repository.setSecretResetToken(stored!.hash, stored!.salt, new Date(Date.now() - 1000));

    await expect(
      new ResetSecretKeyWithTokenUseCase(repository).execute({ token, newKey: "nova-chave-123" })
    ).rejects.toThrow(InvalidSecurityCredentialError);
  });

  it("rejects a new key shorter than 6 characters", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const token = await requestReset(repository);

    await expect(new ResetSecretKeyWithTokenUseCase(repository).execute({ token, newKey: "abc" })).rejects.toThrow(
      InvalidSecurityCredentialError
    );
  });
});
