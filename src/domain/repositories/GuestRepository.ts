import { AttendanceStatus, Guest } from "@/domain/entities/Guest";

export interface GuestPublicSummary {
  id: string;
  fullName: string;
  nickname?: string;
}

export interface GuestAttendanceUpdate {
  attendanceStatus: AttendanceStatus;
  companionsCount?: number;
  message?: string;
}

export interface GuestRepository {
  save(guest: Guest): Promise<Guest>;
  findAll(): Promise<Guest[]>;
  /** Name/nickname/id only — never email, phone, or message. */
  findAllPublicNames(): Promise<GuestPublicSummary[]>;
  findById(id: string): Promise<Guest | null>;
  updateAttendance(id: string, update: GuestAttendanceUpdate): Promise<Guest>;
}
