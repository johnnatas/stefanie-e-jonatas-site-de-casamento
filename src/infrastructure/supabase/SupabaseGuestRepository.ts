import { SupabaseClient } from "@supabase/supabase-js";
import { Guest } from "@/domain/entities/Guest";
import { GuestRepository } from "@/domain/repositories/GuestRepository";

interface GuestRow {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  companions_count: number;
  message: string | null;
  attendance_confirmed: boolean;
  created_at: string;
}

function toEntity(row: GuestRow): Guest {
  return Guest.create({
    id: row.id,
    fullName: row.full_name,
    email: row.email,
    phone: row.phone,
    companionsCount: row.companions_count,
    message: row.message ?? undefined,
    attendanceConfirmed: row.attendance_confirmed,
    createdAt: new Date(row.created_at),
  });
}

export class SupabaseGuestRepository implements GuestRepository {
  constructor(private readonly client: SupabaseClient) {}

  async save(guest: Guest): Promise<Guest> {
    const { data, error } = await this.client
      .from("guests")
      .insert({
        full_name: guest.fullName,
        email: guest.email,
        phone: guest.phone,
        companions_count: guest.companionsCount,
        message: guest.message ?? null,
        attendance_confirmed: guest.attendanceConfirmed,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save guest: ${error.message}`);
    }

    return toEntity(data as GuestRow);
  }

  async findAll(): Promise<Guest[]> {
    const { data, error } = await this.client
      .from("guests")
      .select()
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to list guests: ${error.message}`);
    }

    return (data as GuestRow[]).map(toEntity);
  }
}
