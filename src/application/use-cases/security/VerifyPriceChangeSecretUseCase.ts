import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";

export class VerifyPriceChangeSecretUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(candidate: string): Promise<boolean> {
    if (!candidate) {
      return false;
    }

    const settings = await this.securitySettingsRepository.getSettings();
    if (!settings.priceChangeSecretHash || !settings.priceChangeSecretSalt) {
      return false;
    }

    return verifySecretKeyHash(candidate, settings.priceChangeSecretHash, settings.priceChangeSecretSalt);
  }
}
