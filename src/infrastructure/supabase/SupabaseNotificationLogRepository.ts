import { SupabaseClient } from "@supabase/supabase-js";
import {
  NotificationEntityType,
  NotificationKind,
  NotificationLogRepository,
} from "@/domain/repositories/NotificationLogRepository";

export class SupabaseNotificationLogRepository implements NotificationLogRepository {
  constructor(private readonly client: SupabaseClient) {}

  async hasBeenSent(
    kind: NotificationKind,
    entityType: NotificationEntityType,
    entityId: string
  ): Promise<boolean> {
    const { data, error } = await this.client
      .from("notification_log")
      .select("id")
      .eq("kind", kind)
      .eq("entity_type", entityType)
      .eq("entity_id", entityId)
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to check notification log: ${error.message}`);
    }

    return data !== null;
  }

  async markSent(kind: NotificationKind, entityType: NotificationEntityType, entityId: string): Promise<void> {
    const { error } = await this.client
      .from("notification_log")
      .insert({ kind, entity_type: entityType, entity_id: entityId });

    if (error) {
      throw new Error(`Failed to record sent notification: ${error.message}`);
    }
  }
}
