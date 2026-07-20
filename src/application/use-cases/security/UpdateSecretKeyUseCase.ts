import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { hashSecretKey, verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateSecretKeyInput {
  currentKey?: string;
  newKey: string;
}

export class UpdateSecretKeyUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(input: UpdateSecretKeyInput): Promise<void> {
    if (!input.newKey || input.newKey.length < 6) {
      throw new InvalidSecurityCredentialError("A nova chave deve ter pelo menos 6 caracteres.");
    }

    const settings = await this.securitySettingsRepository.getSettings();
    const hasExistingKey = Boolean(settings.priceChangeSecretHash && settings.priceChangeSecretSalt);

    if (hasExistingKey) {
      const currentValid =
        !!input.currentKey &&
        verifySecretKeyHash(input.currentKey, settings.priceChangeSecretHash!, settings.priceChangeSecretSalt!);
      if (!currentValid) {
        throw new InvalidSecurityCredentialError("Chave atual inválida.");
      }
    }

    const { hash, salt } = hashSecretKey(input.newKey);
    await this.securitySettingsRepository.updateSecretKeyHash(hash, salt);
  }
}
