import { InvalidGuestDataError } from "@/domain/errors/DomainError";

export type AttendanceStatus = "pending" | "confirmed" | "declined";

const ATTENDANCE_STATUSES: AttendanceStatus[] = ["pending", "confirmed", "declined"];

export interface GuestProps {
  id?: string;
  fullName: string;
  nickname?: string;
  email?: string;
  phone?: string;
  companionsCount: number;
  message?: string;
  attendanceStatus: AttendanceStatus;
  createdAt?: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Guest {
  readonly id?: string;
  readonly fullName: string;
  readonly nickname?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly companionsCount: number;
  readonly message?: string;
  readonly attendanceStatus: AttendanceStatus;
  readonly createdAt: Date;

  private constructor(props: GuestProps) {
    this.id = props.id;
    this.fullName = props.fullName.trim();
    this.nickname = props.nickname?.trim() || undefined;
    this.email = props.email?.trim().toLowerCase() || undefined;
    this.phone = props.phone?.trim() || undefined;
    this.companionsCount = props.companionsCount;
    this.message = props.message?.trim() || undefined;
    this.attendanceStatus = props.attendanceStatus;
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: GuestProps): Guest {
    if (!props.fullName || props.fullName.trim().length < 3) {
      throw new InvalidGuestDataError("Guest full name must have at least 3 characters.");
    }

    if (props.email && !EMAIL_PATTERN.test(props.email)) {
      throw new InvalidGuestDataError("Guest email is invalid.");
    }

    if (props.phone && props.phone.trim().length < 8) {
      throw new InvalidGuestDataError("Guest phone is invalid.");
    }

    if (!Number.isInteger(props.companionsCount) || props.companionsCount < 0) {
      throw new InvalidGuestDataError("Companions count must be a non-negative integer.");
    }

    if (!ATTENDANCE_STATUSES.includes(props.attendanceStatus)) {
      throw new InvalidGuestDataError("Attendance status is invalid.");
    }

    return new Guest(props);
  }

  totalAttendeesCount(): number {
    return this.attendanceStatus === "confirmed" ? 1 + this.companionsCount : 0;
  }
}
