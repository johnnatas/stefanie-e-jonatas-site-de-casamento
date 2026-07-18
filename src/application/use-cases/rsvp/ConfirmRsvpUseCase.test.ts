import { describe, expect, it } from "vitest";
import { ConfirmRsvpUseCase } from "@/application/use-cases/rsvp/ConfirmRsvpUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InvalidGuestDataError } from "@/domain/errors/DomainError";

describe("ConfirmRsvpUseCase", () => {
  it("saves a confirmed guest and returns it with an id", async () => {
    const repository = new InMemoryGuestRepository();
    const useCase = new ConfirmRsvpUseCase(repository);

    const guest = await useCase.execute({
      fullName: "Ana Pereira",
      email: "ana@example.com",
      phone: "11988887777",
      companionsCount: 1,
      attendanceConfirmed: true,
    });

    expect(guest.id).toBeDefined();
    expect(await repository.findAll()).toHaveLength(1);
  });

  it("propagates domain validation errors", async () => {
    const useCase = new ConfirmRsvpUseCase(new InMemoryGuestRepository());

    await expect(
      useCase.execute({
        fullName: "Al",
        email: "ana@example.com",
        phone: "11988887777",
        companionsCount: 1,
        attendanceConfirmed: true,
      })
    ).rejects.toThrow(InvalidGuestDataError);
  });
});
