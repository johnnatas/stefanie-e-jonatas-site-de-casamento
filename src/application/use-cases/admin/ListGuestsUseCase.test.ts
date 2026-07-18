import { describe, expect, it } from "vitest";
import { ListGuestsUseCase } from "@/application/use-cases/admin/ListGuestsUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";

describe("ListGuestsUseCase", () => {
  it("returns guests ordered from most to least recent", async () => {
    const repository = new InMemoryGuestRepository();
    const older = Guest.create({
      fullName: "Guest One",
      email: "one@example.com",
      phone: "11999990000",
      companionsCount: 0,
      attendanceConfirmed: true,
      createdAt: new Date("2026-01-01"),
    });
    const newer = Guest.create({
      fullName: "Guest Two",
      email: "two@example.com",
      phone: "11999990001",
      companionsCount: 0,
      attendanceConfirmed: true,
      createdAt: new Date("2026-02-01"),
    });
    await repository.save(older);
    await repository.save(newer);

    const guests = await new ListGuestsUseCase(repository).execute();

    expect(guests.map((g) => g.fullName)).toEqual(["Guest Two", "Guest One"]);
  });
});
