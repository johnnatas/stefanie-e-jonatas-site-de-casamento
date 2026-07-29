import {
  AdminSecuritySettings,
  AdminSecuritySettingsRepository,
  SecretResetToken,
} from "@/domain/repositories/AdminSecuritySettingsRepository";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

export class InMemoryAdminSecuritySettingsRepository implements AdminSecuritySettingsRepository {
  private settings: AdminSecuritySettings = {
    mercadoPagoAccessToken: null,
    priceChangeSecretHash: null,
    priceChangeSecretSalt: null,
    resendApiKey: null,
    activePaymentProvider: "mercado_pago",
    infinitePayHandle: null,
  };
  private secretResetToken: SecretResetToken | null = null;

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

  async updateResendApiKey(key: string): Promise<void> {
    this.settings.resendApiKey = key;
  }

  async updateActivePaymentProvider(provider: PaymentProvider): Promise<void> {
    this.settings.activePaymentProvider = provider;
  }

  async updateInfinitePayHandle(handle: string): Promise<void> {
    this.settings.infinitePayHandle = handle;
  }

  async setSecretResetToken(hash: string, salt: string, expiresAt: Date): Promise<void> {
    this.secretResetToken = { hash, salt, expiresAt };
  }

  async getSecretResetToken(): Promise<SecretResetToken | null> {
    return this.secretResetToken ? { ...this.secretResetToken } : null;
  }

  async clearSecretResetToken(): Promise<void> {
    this.secretResetToken = null;
  }
}
