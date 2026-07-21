import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateResendApiKeyInput {
  apiKey: string;
  secretKey?: string;
}

export class UpdateResendApiKeyUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(input: UpdateResendApiKeyInput): Promise<void> {
    if (!input.apiKey || input.apiKey.trim().length === 0) {
      throw new InvalidSecurityCredentialError("Informe a API Key do Resend.");
    }

    const settings = await this.securitySettingsRepository.getSettings();
    const isFirstTimeSetup = !settings.resendApiKey;

    if (!isFirstTimeSetup) {
      const secretValid =
        !!input.secretKey &&
        !!settings.priceChangeSecretHash &&
        !!settings.priceChangeSecretSalt &&
        verifySecretKeyHash(input.secretKey, settings.priceChangeSecretHash, settings.priceChangeSecretSalt);
      if (!secretValid) {
        throw new InvalidSecurityCredentialError("Chave secreta inválida ou não informada.");
      }
    }

    await this.securitySettingsRepository.updateResendApiKey(input.apiKey.trim());
  }
}
