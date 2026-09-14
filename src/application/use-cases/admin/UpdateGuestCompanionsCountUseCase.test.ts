import { beforeEach, describe, expect, it } from "vitest";
import { UpdateGuestCompanionsCountUseCase } from "@/application/use-cases/admin/UpdateGuestCompanionsCountUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError, InvalidGuestDataError } from "@/domain/errors/DomainError";

describe("UpdateGuestCompanionsCountUseCase", () => {
  let guestRepository: InMemoryGuestRepository;
  let useCase: UpdateGuestCompanionsCountUseCase;

  beforeEach(() => {
    guestRepository = new InMemoryGuestRepository();
    useCase = new UpdateGuestCompanionsCountUseCase(guestRepository);
  });

  it("updates only the companions count, keeping the attendance status", async () => {
    const guest = await guestRepository.save(
      Guest.create({ fullName: "Ana Silva", companionsCount: 0, attendanceStatus: "confirmed" })
    );

    const updated = await useCase.execute({ id: guest.id!, companionsCount: 3 });

    expect(updated.companionsCount).toBe(3);
    expect(updated.attendanceStatus).toBe("confirmed");
  });

  it("rejects a negative companions count", async () => {
    const guest = await guestRepository.save(
      Guest.create({ fullName: "Ana Silva", companionsCount: 0, attendanceStatus: "confirmed" })
    );

    await expect(useCase.execute({ id: guest.id!, companionsCount: -1 })).rejects.toThrow(InvalidGuestDataError);
  });

  it("throws when the guest does not exist", async () => {
    await expect(useCase.execute({ id: "missing", companionsCount: 1 })).rejects.toThrow(GuestNotFoundError);
  });
});
