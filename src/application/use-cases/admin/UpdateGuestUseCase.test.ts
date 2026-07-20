import { describe, expect, it } from "vitest";
import { UpdateGuestUseCase } from "@/application/use-cases/admin/UpdateGuestUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

async function seedGuest(repository: InMemoryGuestRepository) {
  return repository.save(
    Guest.create({ fullName: "Carla Nunes", companionsCount: 0, attendanceStatus: "pending" })
  );
}

describe("UpdateGuestUseCase", () => {
  it("updates every editable field", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await seedGuest(repository);

    const updated = await new UpdateGuestUseCase(repository).execute({
      id: created.id!,
      fullName: "Carla Nunes Silva",
      nickname: "Carlinha",
      email: "carla@example.com",
      phone: "11999999999",
      companionsCount: 2,
      attendanceStatus: "confirmed",
      message: "Mal posso esperar!",
    });

    expect(updated.fullName).toBe("Carla Nunes Silva");
    expect(updated.nickname).toBe("Carlinha");
    expect(updated.email).toBe("carla@example.com");
    expect(updated.companionsCount).toBe(2);
    expect(updated.attendanceStatus).toBe("confirmed");
  });

  it("throws GuestNotFoundError when the guest does not exist", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(
      new UpdateGuestUseCase(repository).execute({
        id: "missing",
        fullName: "Nobody",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    ).rejects.toThrow(GuestNotFoundError);
  });

  it("propagates domain validation errors", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await seedGuest(repository);

    await expect(
      new UpdateGuestUseCase(repository).execute({
        id: created.id!,
        fullName: "Al",
        companionsCount: 0,
        attendanceStatus: "pending",
      })
    ).rejects.toThrow(InvalidGuestDataError);
  });
});
