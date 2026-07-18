import { describe, expect, it } from "vitest";
import { ConfirmRsvpUseCase } from "@/application/use-cases/rsvp/ConfirmRsvpUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

async function seedPendingGuest(repository: InMemoryGuestRepository) {
  return repository.save(
    Guest.create({ fullName: "Ana Pereira", companionsCount: 0, attendanceStatus: "pending" })
  );
}

describe("ConfirmRsvpUseCase", () => {
  it("confirms a pending guest with companions and a message", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    const updated = await useCase.execute({
      guestId: guest.id!,
      attendanceStatus: "confirmed",
      companionsCount: 2,
      message: "Mal podemos esperar!",
    });

    expect(updated.attendanceStatus).toBe("confirmed");
    expect(updated.companionsCount).toBe(2);
    expect(updated.message).toBe("Mal podemos esperar!");
  });

  it("declines a pending guest and forces companions to zero", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    const updated = await useCase.execute({
      guestId: guest.id!,
      attendanceStatus: "declined",
      companionsCount: 3,
    });

    expect(updated.attendanceStatus).toBe("declined");
    expect(updated.companionsCount).toBe(0);
  });

  it("defaults companions to zero when confirming without a count", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    const updated = await useCase.execute({ guestId: guest.id!, attendanceStatus: "confirmed" });

    expect(updated.companionsCount).toBe(0);
  });

  it("throws GuestNotFoundError for an unknown guest id", async () => {
    const useCase = new ConfirmRsvpUseCase(new InMemoryGuestRepository());

    await expect(
      useCase.execute({ guestId: "does-not-exist", attendanceStatus: "confirmed" })
    ).rejects.toThrow(GuestNotFoundError);
  });

  it("rejects a companions count above 10", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({ guestId: guest.id!, attendanceStatus: "confirmed", companionsCount: 11 })
    ).rejects.toThrow(InvalidGuestDataError);
  });
});
