import { describe, expect, it } from "vitest";
import { RequestSecretKeyResetUseCase } from "@/application/use-cases/security/RequestSecretKeyResetUseCase";
import { InMemoryAdminSecuritySettingsRepository } from "@/application/testing/InMemoryAdminSecuritySettingsRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";

describe("RequestSecretKeyResetUseCase", () => {
  it("stores a hashed reset token and emails the requester a link containing the raw token", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const emailGateway = new FakeEmailGateway();
    let capturedToken = "";

    await new RequestSecretKeyResetUseCase(repository, emailGateway).execute({
      requesterEmail: "noivos@example.com",
      buildResetUrl: (token) => {
        capturedToken = token;
        return `https://sjcasamento.site/admin/integracoes?resetToken=${token}`;
      },
    });

    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("noivos@example.com");
    expect(emailGateway.sentEmails[0].html).toContain(capturedToken);

    const storedToken = await repository.getSecretResetToken();
    expect(storedToken).not.toBeNull();
    expect(storedToken!.hash).not.toBe(capturedToken);
  });

  it("sets an expiry roughly one hour in the future", async () => {
    const repository = new InMemoryAdminSecuritySettingsRepository();
    const emailGateway = new FakeEmailGateway();
    const before = Date.now();

    await new RequestSecretKeyResetUseCase(repository, emailGateway).execute({
      requesterEmail: "noivos@example.com",
      buildResetUrl: (token) => token,
    });

    const storedToken = await repository.getSecretResetToken();
    const expectedMin = before + 59 * 60 * 1000;
    const expectedMax = Date.now() + 61 * 60 * 1000;
    expect(storedToken!.expiresAt.getTime()).toBeGreaterThan(expectedMin);
    expect(storedToken!.expiresAt.getTime()).toBeLessThan(expectedMax);
  });
});
