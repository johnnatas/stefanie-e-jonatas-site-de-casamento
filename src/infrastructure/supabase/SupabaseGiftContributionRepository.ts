import { SupabaseClient } from "@supabase/supabase-js";
import { ContributionStatus, GiftContribution } from "@/domain/entities/GiftContribution";
import { GiftContributionRepository } from "@/domain/repositories/GiftContributionRepository";
import { PaymentProvider } from "@/domain/entities/PaymentProvider";

interface GiftContributionRow {
  id: string;
  gift_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  amount: number;
  status: ContributionStatus;
  payment_provider: PaymentProvider;
  mercado_pago_preference_id: string | null;
  mercado_pago_payment_id: string | null;
  infinite_pay_order_nsu: string | null;
  infinite_pay_transaction_nsu: string | null;
  expected_payment_date: string | null;
  created_at: string;
}

function toEntity(row: GiftContributionRow): GiftContribution {
  return GiftContribution.create({
    id: row.id,
    giftId: row.gift_id,
    guestName: row.guest_name,
    guestEmail: row.guest_email,
    guestPhone: row.guest_phone,
    amount: row.amount,
    status: row.status,
    paymentProvider: row.payment_provider,
    mercadoPagoPreferenceId: row.mercado_pago_preference_id ?? undefined,
    mercadoPagoPaymentId: row.mercado_pago_payment_id ?? undefined,
    infinitePayOrderNsu: row.infinite_pay_order_nsu ?? undefined,
    infinitePayTransactionNsu: row.infinite_pay_transaction_nsu ?? undefined,
    expectedPaymentDate: row.expected_payment_date ? new Date(row.expected_payment_date) : null,
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
        guest_phone: contribution.guestPhone,
        amount: contribution.amount,
        status: contribution.status,
        payment_provider: contribution.paymentProvider,
        mercado_pago_preference_id: contribution.mercadoPagoPreferenceId ?? null,
        mercado_pago_payment_id: contribution.mercadoPagoPaymentId ?? null,
        infinite_pay_order_nsu: contribution.infinitePayOrderNsu ?? null,
        infinite_pay_transaction_nsu: contribution.infinitePayTransactionNsu ?? null,
        expected_payment_date: contribution.expectedPaymentDate
          ? contribution.expectedPaymentDate.toISOString()
          : null,
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
        payment_provider: contribution.paymentProvider,
        mercado_pago_preference_id: contribution.mercadoPagoPreferenceId ?? null,
        mercado_pago_payment_id: contribution.mercadoPagoPaymentId ?? null,
        infinite_pay_order_nsu: contribution.infinitePayOrderNsu ?? null,
        infinite_pay_transaction_nsu: contribution.infinitePayTransactionNsu ?? null,
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

  async findPendingByGiftId(giftId: string): Promise<GiftContribution | null> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .eq("gift_id", giftId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to find pending gift contribution: ${error.message}`);
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

  async findAll(): Promise<GiftContribution[]> {
    const { data, error } = await this.client
      .from("gift_contributions")
      .select()
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list gift contributions: ${error.message}`);
    }

    return (data as GiftContributionRow[]).map(toEntity);
  }
}
