export type NotificationKind =
  | "reservation_confirmation"
  | "reservation_reminder_t10"
  | "reservation_reminder_t7"
  | "reservation_reminder_t3"
  | "reservation_reminder_t1"
  | "reservation_reminder_t0"
  | "gift_suggestion_t90"
  | "gift_suggestion_t60"
  | "gift_suggestion_t30"
  | "gift_suggestion_t15"
  | "gift_suggestion_t3"
  | "wedding_day";

export type NotificationEntityType = "gift_contribution" | "guest";

export interface NotificationLogRepository {
  hasBeenSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<boolean>;
  markSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<void>;
}
