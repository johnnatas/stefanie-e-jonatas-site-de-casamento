import { describe, expect, it } from "vitest";
import { UpsertGiftUseCase } from "@/application/use-cases/admin/UpsertGiftUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InvalidGiftDataError } from "@/domain/errors/DomainError";

const baseInput = {
  name: "Jogo de facas",
  description: "Conjunto de facas profissionais",
  imageUrl: "/placeholder.jpg",
  price: 180,
  category: "cozinha",
};

describe("UpsertGiftUseCase", () => {
  it("creates a new gift when no id is provided", async () => {
    const repository = new InMemoryGiftRepository();

    const gift = await new UpsertGiftUseCase(repository).execute(baseInput);

    expect(gift.id).toBeDefined();
    expect(gift.status).toBe("available");
  });

  it("updates an existing gift preserving its current status", async () => {
    const repository = new InMemoryGiftRepository();
    const created = await new UpsertGiftUseCase(repository).execute(baseInput);
    const reserved = await repository.update(created.reserve());

    const updated = await new UpsertGiftUseCase(repository).execute({
      ...baseInput,
      id: reserved.id,
      price: 220,
    });

    expect(updated.price).toBe(220);
    expect(updated.status).toBe("reserved");
  });

  it("throws when updating a gift that does not exist", async () => {
    const repository = new InMemoryGiftRepository();

    await expect(
      new UpsertGiftUseCase(repository).execute({ ...baseInput, id: "missing" })
    ).rejects.toThrow(InvalidGiftDataError);
  });
});
