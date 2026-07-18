import { describe, expect, it } from "vitest";
import { Guest } from "@/domain/entities/Guest";
import { InvalidGuestDataError } from "@/domain/errors/DomainError";

const validProps = {
  fullName: "Maria da Silva",
  email: "Maria@Example.com",
  phone: "11999998888",
  companionsCount: 2,
  attendanceConfirmed: true,
};

describe("Guest", () => {
  it("creates a guest with normalized email and trimmed name", () => {
    const guest = Guest.create(validProps);

    expect(guest.fullName).toBe("Maria da Silva");
    expect(guest.email).toBe("maria@example.com");
  });

  it("computes total attendees including companions when confirmed", () => {
    const guest = Guest.create(validProps);

    expect(guest.totalAttendeesCount()).toBe(3);
  });

  it("computes zero attendees when attendance is not confirmed", () => {
    const guest = Guest.create({ ...validProps, attendanceConfirmed: false });

    expect(guest.totalAttendeesCount()).toBe(0);
  });

  it("rejects a full name shorter than 3 characters", () => {
    expect(() => Guest.create({ ...validProps, fullName: "Al" })).toThrow(InvalidGuestDataError);
  });

  it("rejects an invalid email", () => {
    expect(() => Guest.create({ ...validProps, email: "not-an-email" })).toThrow(InvalidGuestDataError);
  });

  it("rejects a negative companions count", () => {
    expect(() => Guest.create({ ...validProps, companionsCount: -1 })).toThrow(InvalidGuestDataError);
  });
});
