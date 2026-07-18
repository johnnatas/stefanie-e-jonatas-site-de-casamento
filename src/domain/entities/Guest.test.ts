import { describe, expect, it } from "vitest";
import { Guest } from "@/domain/entities/Guest";
import { InvalidGuestDataError } from "@/domain/errors/DomainError";

const validProps = {
  fullName: "Maria da Silva",
  nickname: "Mari",
  companionsCount: 2,
  attendanceStatus: "confirmed" as const,
};

describe("Guest", () => {
  it("creates a guest with a trimmed name and nickname", () => {
    const guest = Guest.create(validProps);

    expect(guest.fullName).toBe("Maria da Silva");
    expect(guest.nickname).toBe("Mari");
  });

  it("allows creating a guest with no email, phone, or nickname", () => {
    const guest = Guest.create({
      fullName: "João Pedro",
      companionsCount: 0,
      attendanceStatus: "pending",
    });

    expect(guest.email).toBeUndefined();
    expect(guest.phone).toBeUndefined();
    expect(guest.nickname).toBeUndefined();
  });

  it("normalizes email to lowercase when provided", () => {
    const guest = Guest.create({ ...validProps, email: "Maria@Example.com" });

    expect(guest.email).toBe("maria@example.com");
  });

  it("computes total attendees including companions when confirmed", () => {
    const guest = Guest.create(validProps);

    expect(guest.totalAttendeesCount()).toBe(3);
  });

  it("computes zero attendees when pending", () => {
    const guest = Guest.create({ ...validProps, attendanceStatus: "pending" });

    expect(guest.totalAttendeesCount()).toBe(0);
  });

  it("computes zero attendees when declined", () => {
    const guest = Guest.create({ ...validProps, attendanceStatus: "declined" });

    expect(guest.totalAttendeesCount()).toBe(0);
  });

  it("rejects a full name shorter than 3 characters", () => {
    expect(() => Guest.create({ ...validProps, fullName: "Al" })).toThrow(InvalidGuestDataError);
  });

  it("rejects an invalid email when one is provided", () => {
    expect(() => Guest.create({ ...validProps, email: "not-an-email" })).toThrow(
      InvalidGuestDataError
    );
  });

  it("rejects a negative companions count", () => {
    expect(() => Guest.create({ ...validProps, companionsCount: -1 })).toThrow(
      InvalidGuestDataError
    );
  });

  it("rejects an invalid attendance status", () => {
    // @ts-expect-error deliberately invalid for the test
    expect(() => Guest.create({ ...validProps, attendanceStatus: "maybe" })).toThrow(
      InvalidGuestDataError
    );
  });
});
