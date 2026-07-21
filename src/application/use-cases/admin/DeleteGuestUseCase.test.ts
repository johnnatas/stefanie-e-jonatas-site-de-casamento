import { describe, expect, it } from "vitest";
import { DeleteGuestUseCase } from "@/application/use-cases/admin/DeleteGuestUseCase";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

describe("DeleteGuestUseCase", () => {
  it("deletes an existing guest", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await repository.save(
      Guest.create({ fullName: "Diego Alves", companionsCount: 0, attendanceStatus: "pending" })
    );

    await new DeleteGuestUseCase(repository).execute(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("propagates GuestNotFoundError for a missing guest", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(new DeleteGuestUseCase(repository).execute("missing")).rejects.toThrow(GuestNotFoundError);
  });
});
