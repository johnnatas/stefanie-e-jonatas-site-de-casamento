import { describe, expect, it } from "vitest";
import { CreateGuestUseCase } from "@/application/use-cases/admin/CreateGuestUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { InvalidGuestDataError } from "@/domain/errors/DomainError";

describe("CreateGuestUseCase", () => {
  it("creates a pending guest with zero companions", async () => {
    const repository = new InMemoryGuestRepository();
    const useCase = new CreateGuestUseCase(repository);

    const guest = await useCase.execute({ fullName: "Carlos Souza", nickname: "Cadu" });

    expect(guest.id).toBeDefined();
    expect(guest.attendanceStatus).toBe("pending");
    expect(guest.companionsCount).toBe(0);
    expect(guest.nickname).toBe("Cadu");
  });

  it("propagates domain validation errors for an invalid name", async () => {
    const useCase = new CreateGuestUseCase(new InMemoryGuestRepository());

    await expect(useCase.execute({ fullName: "Al" })).rejects.toThrow(InvalidGuestDataError);
  });
});
