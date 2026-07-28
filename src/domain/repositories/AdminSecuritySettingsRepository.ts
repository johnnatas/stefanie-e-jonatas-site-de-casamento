export interface AdminSecuritySettings {
  mercadoPagoAccessToken: string | null;
  priceChangeSecretHash: string | null;
  priceChangeSecretSalt: string | null;
  resendApiKey: string | null;
}

export interface SecretResetToken {
  hash: string;
  salt: string;
  expiresAt: Date;
}

export interface AdminSecuritySettingsRepository {
  getSettings(): Promise<AdminSecuritySettings>;
  updateMercadoPagoAccessToken(token: string): Promise<void>;
  updateSecretKeyHash(hash: string, salt: string): Promise<void>;
  updateResendApiKey(key: string): Promise<void>;
  setSecretResetToken(hash: string, salt: string, expiresAt: Date): Promise<void>;
  getSecretResetToken(): Promise<SecretResetToken | null>;
  clearSecretResetToken(): Promise<void>;
}
