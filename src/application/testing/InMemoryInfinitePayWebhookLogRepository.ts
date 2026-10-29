import {
  InfinitePayWebhookEvent,
  InfinitePayWebhookLogRepository,
} from "@/domain/repositories/InfinitePayWebhookLogRepository";

export class InMemoryInfinitePayWebhookLogRepository implements InfinitePayWebhookLogRepository {
  events: InfinitePayWebhookEvent[] = [];

  async record(event: InfinitePayWebhookEvent): Promise<void> {
    this.events.push(event);
  }
}
