import { SupabaseClient } from "@supabase/supabase-js";
import {
  AdminSecuritySettings,
  AdminSecuritySettingsRepository,
  SecretResetToken,
} from "@/domain/repositories/AdminSecuritySettingsRepository";

interface SettingsRow {
  mercadopago_access_token: string | null;
  price_change_secret_hash: string | null;
  price_change_secret_salt: string | null;
  resend_api_key: string | null;
}

export class SupabaseAdminSecuritySettingsRepository implements AdminSecuritySettingsRepository {
  constructor(private readonly client: SupabaseClient) {}

  async getSettings(): Promise<AdminSecuritySettings> {
    const { data, error } = await this.client
      .from("admin_security_settings")
      .select("mercadopago_access_token, price_change_secret_hash, price_change_secret_salt, resend_api_key")
      .eq("id", 1)
      .single();

    if (error) {
      throw new Error(`Failed to load admin security settings: ${error.message}`);
    }

    const row = data as SettingsRow;
    return {
      mercadoPagoAccessToken: row.mercadopago_access_token,
      priceChangeSecretHash: row.price_change_secret_hash,
      priceChangeSecretSalt: row.price_change_secret_salt,
      resendApiKey: row.resend_api_key,
    };
  }

  async updateMercadoPagoAccessToken(token: string): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({ mercadopago_access_token: token, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to update Mercado Pago access token: ${error.message}`);
    }
  }

  async updateSecretKeyHash(hash: string, salt: string): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({
        price_change_secret_hash: hash,
        price_change_secret_salt: salt,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to update secret key: ${error.message}`);
    }
  }

  async updateResendApiKey(key: string): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({ resend_api_key: key, updated_at: new Date().toISOString() })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to update Resend API key: ${error.message}`);
    }
  }

  async setSecretResetToken(hash: string, salt: string, expiresAt: Date): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({
        secret_reset_token_hash: hash,
        secret_reset_token_salt: salt,
        secret_reset_expires_at: expiresAt.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to store secret key reset token: ${error.message}`);
    }
  }

  async getSecretResetToken(): Promise<SecretResetToken | null> {
    const { data, error } = await this.client
      .from("admin_security_settings")
      .select("secret_reset_token_hash, secret_reset_token_salt, secret_reset_expires_at")
      .eq("id", 1)
      .single();

    if (error) {
      throw new Error(`Failed to load secret key reset token: ${error.message}`);
    }

    const row = data as {
      secret_reset_token_hash: string | null;
      secret_reset_token_salt: string | null;
      secret_reset_expires_at: string | null;
    };

    if (!row.secret_reset_token_hash || !row.secret_reset_token_salt || !row.secret_reset_expires_at) {
      return null;
    }

    return {
      hash: row.secret_reset_token_hash,
      salt: row.secret_reset_token_salt,
      expiresAt: new Date(row.secret_reset_expires_at),
    };
  }

  async clearSecretResetToken(): Promise<void> {
    const { error } = await this.client
      .from("admin_security_settings")
      .update({
        secret_reset_token_hash: null,
        secret_reset_token_salt: null,
        secret_reset_expires_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", 1);

    if (error) {
      throw new Error(`Failed to clear secret key reset token: ${error.message}`);
    }
  }
}
