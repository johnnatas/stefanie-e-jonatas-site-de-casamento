import {
  AdminSecuritySettings,
  AdminSecuritySettingsRepository,
} from "@/domain/repositories/AdminSecuritySettingsRepository";

export class InMemoryAdminSecuritySettingsRepository implements AdminSecuritySettingsRepository {
  private settings: AdminSecuritySettings = {
    mercadoPagoAccessToken: null,
    priceChangeSecretHash: null,
    priceChangeSecretSalt: null,
  };

  async getSettings(): Promise<AdminSecuritySettings> {
    return { ...this.settings };
  }

  async updateMercadoPagoAccessToken(token: string): Promise<void> {
    this.settings.mercadoPagoAccessToken = token;
  }

  async updateSecretKeyHash(hash: string, salt: string): Promise<void> {
    this.settings.priceChangeSecretHash = hash;
    this.settings.priceChangeSecretSalt = salt;
  }
}
