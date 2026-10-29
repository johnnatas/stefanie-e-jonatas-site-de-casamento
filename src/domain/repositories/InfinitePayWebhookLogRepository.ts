export interface InfinitePayWebhookEvent {
  orderNsu?: string;
  transactionNsu?: string;
  invoiceSlug?: string;
  paidAmount?: number;
  rawPayload: unknown;
  processed: boolean;
  errorMessage?: string;
}

export interface InfinitePayWebhookLogRepository {
  record(event: InfinitePayWebhookEvent): Promise<void>;
}
