import { InvalidGuestDataError } from "@/domain/errors/DomainError";

export interface GuestProps {
  id?: string;
  fullName: string;
  email: string;
  phone: string;
  companionsCount: number;
  message?: string;
  attendanceConfirmed: boolean;
  createdAt?: Date;
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export class Guest {
  readonly id?: string;
  readonly fullName: string;
  readonly email: string;
  readonly phone: string;
  readonly companionsCount: number;
  readonly message?: string;
  readonly attendanceConfirmed: boolean;
  readonly createdAt: Date;

  private constructor(props: GuestProps) {
    this.id = props.id;
    this.fullName = props.fullName.trim();
    this.email = props.email.trim().toLowerCase();
    this.phone = props.phone.trim();
    this.companionsCount = props.companionsCount;
    this.message = props.message?.trim();
    this.attendanceConfirmed = props.attendanceConfirmed;
    this.createdAt = props.createdAt ?? new Date();
  }

  static create(props: GuestProps): Guest {
    if (!props.fullName || props.fullName.trim().length < 3) {
      throw new InvalidGuestDataError("Guest full name must have at least 3 characters.");
    }

    if (!EMAIL_PATTERN.test(props.email)) {
      throw new InvalidGuestDataError("Guest email is invalid.");
    }

    if (!props.phone || props.phone.trim().length < 8) {
      throw new InvalidGuestDataError("Guest phone is invalid.");
    }

    if (!Number.isInteger(props.companionsCount) || props.companionsCount < 0) {
      throw new InvalidGuestDataError("Companions count must be a non-negative integer.");
    }

    return new Guest(props);
  }

  totalAttendeesCount(): number {
    return this.attendanceConfirmed ? 1 + this.companionsCount : 0;
  }
}
