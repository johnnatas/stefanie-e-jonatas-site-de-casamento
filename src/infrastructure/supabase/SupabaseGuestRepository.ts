import { SupabaseClient } from "@supabase/supabase-js";
import { AttendanceStatus, Guest } from "@/domain/entities/Guest";
import {
  GuestAttendanceUpdate,
  GuestPublicSummary,
  GuestRepository,
} from "@/domain/repositories/GuestRepository";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

interface GuestRow {
  id: string;
  full_name: string;
  nickname: string | null;
  email: string | null;
  phone: string | null;
  companions_count: number;
  message: string | null;
  attendance_status: AttendanceStatus;
  created_at: string;
}

function toEntity(row: GuestRow): Guest {
  return Guest.create({
    id: row.id,
    fullName: row.full_name,
    nickname: row.nickname ?? undefined,
    email: row.email ?? undefined,
    phone: row.phone ?? undefined,
    companionsCount: row.companions_count,
    message: row.message ?? undefined,
    attendanceStatus: row.attendance_status,
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
        nickname: guest.nickname ?? null,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        companions_count: guest.companionsCount,
        message: guest.message ?? null,
        attendance_status: guest.attendanceStatus,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to save guest: ${error.message}`);
    }

    return toEntity(data as GuestRow);
  }

  async update(guest: Guest): Promise<Guest> {
    const { data, error } = await this.client
      .from("guests")
      .update({
        full_name: guest.fullName,
        nickname: guest.nickname ?? null,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        companions_count: guest.companionsCount,
        message: guest.message ?? null,
        attendance_status: guest.attendanceStatus,
      })
      .eq("id", guest.id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update guest: ${error.message}`);
    }

    if (!data) {
      throw new GuestNotFoundError("Guest not found.");
    }

    return toEntity(data as GuestRow);
  }

  async delete(id: string): Promise<void> {
    const { error, count } = await this.client.from("guests").delete({ count: "exact" }).eq("id", id);

    if (error) {
      throw new Error(`Failed to delete guest: ${error.message}`);
    }

    if (!count) {
      throw new GuestNotFoundError("Guest not found.");
    }
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

  async findAllPublicNames(): Promise<GuestPublicSummary[]> {
    const { data, error } = await this.client.from("guests").select("id, full_name, nickname");

    if (error) {
      throw new Error(`Failed to list guest names: ${error.message}`);
    }

    return (data as Pick<GuestRow, "id" | "full_name" | "nickname">[]).map((row) => ({
      id: row.id,
      fullName: row.full_name,
      nickname: row.nickname ?? undefined,
    }));
  }

  async findById(id: string): Promise<Guest | null> {
    const { data, error } = await this.client.from("guests").select().eq("id", id).maybeSingle();

    if (error) {
      throw new Error(`Failed to find guest: ${error.message}`);
    }

    return data ? toEntity(data as GuestRow) : null;
  }

  async updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest> {
    const patch: Record<string, unknown> = { attendance_status: update.attendanceStatus };
    if (update.companionsCount !== undefined) {
      patch.companions_count = update.companionsCount;
    }
    if (update.message !== undefined) {
      patch.message = update.message;
    }
    if (update.email !== undefined) {
      patch.email = update.email;
    }

    const { data, error } = await this.client
      .from("guests")
      .update(patch)
      .eq("id", id)
      .select()
      .maybeSingle();

    if (error) {
      throw new Error(`Failed to update guest attendance: ${error.message}`);
    }

    if (!data) {
      throw new GuestNotFoundError("Guest not found.");
    }

    return toEntity(data as GuestRow);
  }
}
