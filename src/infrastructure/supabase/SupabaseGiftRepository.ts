import { SupabaseClient } from "@supabase/supabase-js";
import { Gift, GiftStatus } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { GiftHasContributionsError } from "@/domain/errors/DomainError";

interface GiftRow {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  category: string;
  status: GiftStatus;
  mercado_pago_preference_id: string | null;
  mercado_pago_checkout_url: string | null;
  created_at: string;
}

function toEntity(row: GiftRow): Gift {
  return Gift.create({
    id: row.id,
    name: row.name,
    description: row.description,
    imageUrl: row.image_url,
    price: row.price,
    category: row.category,
    status: row.status,
    mercadoPagoPreferenceId: row.mercado_pago_preference_id ?? undefined,
    mercadoPagoCheckoutUrl: row.mercado_pago_checkout_url,
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseGiftRepository implements GiftRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(gift: Gift): Promise<Gift> {
    const { data, error } = await this.client
      .from("gifts")
      .insert({
        name: gift.name,
        description: gift.description,
        image_url: gift.imageUrl,
        price: gift.price,
        category: gift.category,
        status: gift.status,
        mercado_pago_preference_id: gift.mercadoPagoPreferenceId ?? null,
        mercado_pago_checkout_url: gift.mercadoPagoCheckoutUrl,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save gift: ${error.message}`);
    }

    return toEntity(data as GiftRow);
  }

  async update(gift: Gift): Promise<Gift> {
    const { data, error } = await this.client
      .from("gifts")
      .update({
        name: gift.name,
        description: gift.description,
        image_url: gift.imageUrl,
        price: gift.price,
        category: gift.category,
        status: gift.status,
        mercado_pago_preference_id: gift.mercadoPagoPreferenceId ?? null,
        mercado_pago_checkout_url: gift.mercadoPagoCheckoutUrl,
      })
      .eq("id", gift.id)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update gift: ${error.message}`);
    }

    return toEntity(data as GiftRow);
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client.from("gifts").delete({ count: "exact" }).eq("id", id);

    if (error) {
      if (error.code === "23503") {
        throw new GiftHasContributionsError(
          "Não é possível excluir: este presente já tem contribuições registradas."
        );
      }
      throw new Error(`Failed to delete gift: ${error.message}`);
    }

    if (!count) {
      throw new Error(`Gift with id ${id} not found.`);
    }
  }

  async findAll(): Promise<Gift[]> {
    const { data, error } = await this.client
      .from("gifts")
      .select()
      .order("created_at", { ascending: true });

    if (error) {
      throw new Error(`Failed to list gifts: ${error.message}`);
    }

    return (data as GiftRow[]).map(toEntity);
  }

  async findById(id: string): Promise<Gift | null> {
    const { data, error } = await this.client.from("gifts").select().eq("id", id).maybeSingle();

    if (error) {
      throw new Error(`Failed to find gift: ${error.message}`);
    }

    return data ? toEntity(data as GiftRow) : null;
  }
}
