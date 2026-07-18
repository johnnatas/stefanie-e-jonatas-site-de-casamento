import { describe, expect, it } from "vitest";
import { SearchGuestsUseCase } from "@/application/use-cases/rsvp/SearchGuestsUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";

describe("SearchGuestsUseCase", () => {
  it("returns every guest's public name info, sorted alphabetically", async () => {
    const repository = new InMemoryGuestRepository();
    await repository.save(
      Guest.create({ fullName: "Zeca Alves", companionsCount: 0, attendanceStatus: "pending" })
    );
    await repository.save(
      Guest.create({
        fullName: "Ana Beatriz",
        nickname: "Bia",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    );

    const results = await new SearchGuestsUseCase(repository).execute();

    expect(results.map((r) => r.fullName)).toEqual(["Ana Beatriz", "Zeca Alves"]);
    expect(results[0].nickname).toBe("Bia");
    expect(results.every((r) => "email" in r === false)).toBe(true);
  });
});
