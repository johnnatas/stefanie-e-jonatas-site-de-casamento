import { describe, expect, it } from "vitest";
import { InMemoryGuestRepository } from "@/application/testing/InMemoryGuestRepository";
import { Guest } from "@/domain/entities/Guest";
import { GuestNotFoundError } from "@/domain/errors/DomainError";

describe("InMemoryGuestRepository", () => {
  it("updates an existing guest", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await repository.save(
      Guest.create({ fullName: "Ana Lima", companionsCount: 0, attendanceStatus: "pending" })
    );

    const updated = await repository.update(
      Guest.create({ ...created, fullName: "Ana Lima Souza", companionsCount: 2 })
    );

    expect(updated.fullName).toBe("Ana Lima Souza");
    expect(updated.companionsCount).toBe(2);
    expect((await repository.findById(created.id!))?.fullName).toBe("Ana Lima Souza");
  });

  it("throws GuestNotFoundError when updating a missing guest", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(
      repository.update(Guest.create({ id: "missing", fullName: "Nobody", companionsCount: 0, attendanceStatus: "pending" }))
    ).rejects.toThrow(GuestNotFoundError);
  });

  it("deletes an existing guest", async () => {
    const repository = new InMemoryGuestRepository();
    const created = await repository.save(
      Guest.create({ fullName: "Bruno Reis", companionsCount: 0, attendanceStatus: "pending" })
    );

    await repository.delete(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("throws GuestNotFoundError when deleting a missing guest", async () => {
    const repository = new InMemoryGuestRepository();

    await expect(repository.delete("missing")).rejects.toThrow(GuestNotFoundError);
  });
});
