import { AdminSecuritySettingsRepository } from "@/domain/repositories/AdminSecuritySettingsRepository";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export interface AdminSecuritySettingsSummary {
  mercadoPagoAccessTokenLast4: string | null;
  resendApiKeyLast4: string | null;
  hasSecretKey: boolean;
  activePaymentProvider: PaymentProvider;
  infinitePayHandle: string | null;
}

export class GetAdminSecuritySettingsUseCase {
  constructor(private readonly securitySettingsRepository: AdminSecuritySettingsRepository) {}

  async execute(): Promise<AdminSecuritySettingsSummary> {
    const settings = await this.securitySettingsRepository.getSettings();
    return {
      mercadoPagoAccessTokenLast4: settings.mercadoPagoAccessToken
        ? settings.mercadoPagoAccessToken.slice(-4)
        : null,
      resendApiKeyLast4: settings.resendApiKey ? settings.resendApiKey.slice(-4) : null,
      hasSecretKey: Boolean(settings.priceChangeSecretHash),
      activePaymentProvider: settings.activePaymentProvider,
      infinitePayHandle: settings.infinitePayHandle,
    };
  }
}
