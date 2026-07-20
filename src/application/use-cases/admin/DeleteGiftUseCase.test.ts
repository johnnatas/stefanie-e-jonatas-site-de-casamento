import { describe, expect, it } from "vitest";
import { DeleteGiftUseCase } from "@/application/use-cases/admin/DeleteGiftUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { Gift } from "@/domain/entities/Gift";
import { GiftRepository } from "@/domain/repositories/GiftRepository";
import { GiftHasContributionsError } from "@/domain/errors/DomainError";

class ThrowingGiftRepository implements GiftRepository {
  async save(gift: Gift) {
    return gift;
  }
  async update(gift: Gift) {
    return gift;
  }
  async delete(): Promise<void> {
    throw new GiftHasContributionsError(
      "Não é possível excluir: este presente já tem contribuições registradas."
    );
  }
  async findAll() {
    return [];
  }
  async findById() {
    return null;
  }
}

const baseProps = {
  name: "Liquidificador",
  description: "Liquidificador de alta potência",
  imageUrl: "/placeholder.jpg",
  price: 300,
  category: "cozinha",
};

describe("DeleteGiftUseCase", () => {
  it("deletes an existing gift", async () => {
    const repository = new InMemoryGiftRepository();
    const created = await repository.save(Gift.create(baseProps));

    await new DeleteGiftUseCase(repository).execute(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("propagates GiftHasContributionsError from the repository", async () => {
    await expect(new DeleteGiftUseCase(new ThrowingGiftRepository()).execute("any-id")).rejects.toThrow(
      GiftHasContributionsError
    );
  });
});
