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
  it("creates a new gift when no id is provided, flagged as name/price changed", async () => {
    const repository = new InMemoryGiftRepository();

    const result = await new UpsertGiftUseCase(repository).execute(baseInput);

    expect(result.gift.id).toBeDefined();
    expect(result.gift.status).toBe("available");
    expect(result.nameOrPriceChanged).toBe(true);
  });

  it("updates an existing gift preserving its current status, flagging a price change", async () => {
    const repository = new InMemoryGiftRepository();
    const created = (await new UpsertGiftUseCase(repository).execute(baseInput)).gift;
    const reserved = await repository.update(created.reserve(new Date(Date.now() + 60 * 60 * 1000)));

    const result = await new UpsertGiftUseCase(repository).execute({ ...baseInput, id: reserved.id, price: 220 });

    expect(result.gift.price).toBe(220);
    expect(result.gift.status).toBe("reserved");
    expect(result.nameOrPriceChanged).toBe(true);
  });

  it("does not flag a change when only description/category are edited", async () => {
    const repository = new InMemoryGiftRepository();
    const created = (await new UpsertGiftUseCase(repository).execute(baseInput)).gift;

    const result = await new UpsertGiftUseCase(repository).execute({
      ...baseInput,
      id: created.id,
      description: "Nova descrição",
      category: "casa",
    });

    expect(result.nameOrPriceChanged).toBe(false);
  });

  it("throws when updating a gift that does not exist", async () => {
    const repository = new InMemoryGiftRepository();

    await expect(
      new UpsertGiftUseCase(repository).execute({ ...baseInput, id: "missing" })
    ).rejects.toThrow(InvalidGiftDataError);
  });
});
