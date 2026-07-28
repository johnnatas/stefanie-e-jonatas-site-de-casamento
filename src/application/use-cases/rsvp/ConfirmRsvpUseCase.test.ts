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
      email: "ana@example.com",
      message: "Mal podemos esperar!",
    });

    expect(updated.attendanceStatus).toBe("confirmed");
    expect(updated.companionsCount).toBe(2);
    expect(updated.message).toBe("Mal podemos esperar!");
    expect(updated.email).toBe("ana@example.com");
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

    const updated = await useCase.execute({
      guestId: guest.id!,
      attendanceStatus: "confirmed",
      email: "ana@example.com",
    });

    expect(updated.companionsCount).toBe(0);
  });

  it("throws GuestNotFoundError for an unknown guest id", async () => {
    const useCase = new ConfirmRsvpUseCase(new InMemoryGuestRepository());

    await expect(
      useCase.execute({ guestId: "does-not-exist", attendanceStatus: "confirmed", email: "ana@example.com" })
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

  it("requires an email to confirm attendance", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({ guestId: guest.id!, attendanceStatus: "confirmed" })
    ).rejects.toThrow(InvalidGuestDataError);
  });

  it("rejects a malformed email", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({ guestId: guest.id!, attendanceStatus: "confirmed", email: "not-an-email" })
    ).rejects.toThrow(InvalidGuestDataError);
  });

  it("also confirms every identified companion's own attendance", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const companionA = await repository.save(
      Guest.create({ fullName: "Bruno Lima", companionsCount: 0, attendanceStatus: "pending" })
    );
    const companionB = await repository.save(
      Guest.create({ fullName: "Carla Nunes", companionsCount: 0, attendanceStatus: "pending" })
    );
    const useCase = new ConfirmRsvpUseCase(repository);

    await useCase.execute({
      guestId: guest.id!,
      attendanceStatus: "confirmed",
      companionsCount: 2,
      companionGuestIds: [companionA.id!, companionB.id!],
      email: "ana@example.com",
    });

    expect((await repository.findById(companionA.id!))?.attendanceStatus).toBe("confirmed");
    expect((await repository.findById(companionB.id!))?.attendanceStatus).toBe("confirmed");
  });

  it("rejects a companion guest id that doesn't exist", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({
        guestId: guest.id!,
        attendanceStatus: "confirmed",
        companionsCount: 1,
        companionGuestIds: ["does-not-exist"],
        email: "ana@example.com",
      })
    ).rejects.toThrow(GuestNotFoundError);
  });

  it("rejects selecting a guest as their own companion", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({
        guestId: guest.id!,
        attendanceStatus: "confirmed",
        companionsCount: 1,
        companionGuestIds: [guest.id!],
      })
    ).rejects.toThrow(InvalidGuestDataError);
  });

  it("rejects selecting the same companion twice", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const companion = await repository.save(
      Guest.create({ fullName: "Bruno Lima", companionsCount: 0, attendanceStatus: "pending" })
    );
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({
        guestId: guest.id!,
        attendanceStatus: "confirmed",
        companionsCount: 2,
        companionGuestIds: [companion.id!, companion.id!],
      })
    ).rejects.toThrow(InvalidGuestDataError);
  });

  it("rejects more identified companions than the companions count", async () => {
    const repository = new InMemoryGuestRepository();
    const guest = await seedPendingGuest(repository);
    const companion = await repository.save(
      Guest.create({ fullName: "Bruno Lima", companionsCount: 0, attendanceStatus: "pending" })
    );
    const useCase = new ConfirmRsvpUseCase(repository);

    await expect(
      useCase.execute({
        guestId: guest.id!,
        attendanceStatus: "confirmed",
        companionsCount: 0,
        companionGuestIds: [companion.id!],
      })
    ).rejects.toThrow(InvalidGuestDataError);
  });
});
