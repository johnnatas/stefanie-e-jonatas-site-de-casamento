import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { verifySecretKeyHash } from "@/infrastructure/security/secretKeyHashing";
import { InvalidSecurityCredentialError } from "@/domain/errors/DomainError";

export interface UpdateMercadoPagoAccessTokenInput {
  token: string;
  secretKey?: string;
}

export class UpdateMercadoPagoAccessTokenUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(input: UpdateMercadoPagoAccessTokenInput): Promise<void> {
    if (!input.token || input.token.trim().length === 0) {
      throw new InvalidSecurityCredentialError("Informe o Access Token do Mercado Pago.");
    }

    const settings = await this.securitySettingsRepository.getSettings();
    const isFirstTimeSetup = !settings.mercadoPagoAccessToken;

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

    await this.securitySettingsRepository.updateMercadoPagoAccessToken(input.token.trim());
  }
}
