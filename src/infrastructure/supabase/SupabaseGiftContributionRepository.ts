import { SupabaseClient } from "@supabase/supabase-js";
import { ContributionStatus, GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";

interface GiftContributionRow {
  id: string;
  gift_id: string;
  guest_name: string;
  guest_email: string;
  amount: number;
  status: ContributionStatus;
  mercado_pago_preference_id: string | null;
  mercado_pago_payment_id: string | null;
  created_at: string;
}

function toEntity(row: GiftContributionRow): GiftContribution {
  return GiftContribution.create({
    id: row.id,
    giftId: row.gift_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    amount: row.amount,
    status: row.status,
    mercadoPagoPreferenceId: row.mercado_pago_preference_id ?? undefined,
    mercadoPagoPaymentId: row.mercado_pago_payment_id ?? undefined,
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseGiftContributionRepository implements GiftContributionRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(contribution: GiftContribution): Promise<GiftContribution> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .insert({
        gift_id: contribution.giftId,
        guest_name: contribution.guestName,
        guest_email: contribution.guestEmail,
        amount: contribution.amount,
        status: contribution.status,
        mercado_pago_preference_id: contribution.mercadoPagoPreferenceId ?? null,
        mercado_pago_payment_id: contribution.mercadoPagoPaymentId ?? null,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save gift contribution: ${error.message}`);
    }

    return toEntity(data as GiftContributionRow);
  }

  async update(contribution: GiftContribution): Promise<GiftContribution> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .update({
        status: contribution.status,
        mercado_pago_preference_id: contribution.mercadoPagoPreferenceId ?? null,
        mercado_pago_payment_id: contribution.mercadoPagoPaymentId ?? null,
      })
      .eq("id", contribution.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update gift contribution: ${error.message}`);
    }

    return toEntity(data as GiftContributionRow);
  }

  async findById(id: string): Promise<GiftContribution | null> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .eq("id", id)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find gift contribution: ${error.message}`);
    }

    return data ? toEntity(data as GiftContributionRow) : null;
  }

  async findByPreferenceId(preferenceId: string): Promise<GiftContribution | null> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .eq("mercado_pago_preference_id", preferenceId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find gift contribution by preference id: ${error.message}`);
    }

    return data ? toEntity(data as GiftContributionRow) : null;
  }

  async findApproved(): Promise<GiftContribution[]> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .eq("status", "approved");

    if (error) {
      throw new Error(`Failed to list approved gift contributions: ${error.message}`);
    }

    return (data as GiftContributionRow[]).map(toEntity);
  }
}
