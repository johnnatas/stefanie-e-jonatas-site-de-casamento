import { SupabaseClient } from "@supabase/supabase-js";
import {
  InfinitePayWebhookEvent,
  InfinitePayWebhookLogRepository,
} from "@/domain/repositories/InfinitePayWebhookLogRepository";

export class SupabaseInfinitePayWebhookLogRepository implements InfinitePayWebhookLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async record(event: InfinitePayWebhookEvent): Promise<void> {
    const { error } = await this.client.from("infinite_pay_webhook_events").insert({
      order_nsu: event.orderNsu,
      transaction_nsu: event.transactionNsu,
      invoice_slug: event.invoiceSlug,
      paid_amount: event.paidAmount,
      raw_payload: event.rawPayload,
      processed: event.processed,
      error_message: event.errorMessage,
    });

    if (error) {
      throw new Error(`Failed to record Infinite Pay webhook event: ${error.message}`);
    }
  }
}
