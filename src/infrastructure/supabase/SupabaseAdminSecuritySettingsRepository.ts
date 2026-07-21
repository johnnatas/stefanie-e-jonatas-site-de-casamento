import { SupabaseClient } from "@supabase/supabase-js";
import {
  AdminSecuritySettings,
  AdminSecuritySettingsRepository,
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
}
