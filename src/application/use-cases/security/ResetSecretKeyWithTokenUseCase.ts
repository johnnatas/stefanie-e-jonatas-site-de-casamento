import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { hashSecretKey, verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface ResetSecretKeyWithTokenInput {
  token: string;
  newKey: string;
}

export class ResetSecretKeyWithTokenUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(input: ResetSecretKeyWithTokenInput): Promise<void> {
    if (!input.newKey || input.newKey.length < 6) {
      throw new InvalidSecurityCredentialError("A nova chave deve ter pelo menos 6 caracteres.");
    }

    const resetToken = await this.securitySettingsRepository.getSecretResetToken();
    if (!resetToken || resetToken.expiresAt.getTime() < Date.now()) {
      throw new InvalidSecurityCredentialError("Link de redefinição inválido ou expirado.");
    }

    const isValid = !!input.token && verifySecretKeyHash(input.token, resetToken.hash, resetToken.salt);
    if (!isValid) {
      throw new InvalidSecurityCredentialError("Link de redefinição inválido ou expirado.");
    }

    const { hash, salt } = hashSecretKey(input.newKey);
    await this.securitySettingsRepository.updateSecretKeyHash(hash, salt);
    await this.securitySettingsRepository.clearSecretResetToken();
  }
}
