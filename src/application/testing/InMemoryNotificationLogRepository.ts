import {
  NotificationEntityType,
  NotificationKind,
  NotificationLogRepository,
} from "@/domain/repositories/NotificationLogRepository";

export class InMemoryNotificationLogRepository implements NotificationLogRepository {
  private sent = new Set<string>();

  private key(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): string {
    return `${kind}:${entityType}:${entityId}`;
  }

  async hasBeenSent(
    kind: NotificationKind,
    entityType: NotificationEntityType,
    entityId: string
  ): Promise<boolean> {
    return this.sent.has(this.key(kind, entityType, entityId));
  }

  async markSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<void> {
    this.sent.add(this.key(kind, entityType, entityId));
  }
}
