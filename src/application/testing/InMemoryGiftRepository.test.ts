import { describe, expect, it } from "vitest";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { Gift } from "@/domain/entities/Gift";

const baseProps = {
  name: "Jogo de taças",
  description: "Seis taças de cristal",
  imageUrl: "/placeholder.jpg",
  price: 150,
  category: "cozinha",
};

describe("InMemoryGiftRepository", () => {
  it("deletes an existing gift", async () => {
    const repository = new InMemoryGiftRepository();
    const created = await repository.save(Gift.create(baseProps));

    await repository.delete(created.id!);

    expect(await repository.findById(created.id!)).toBeNull();
  });

  it("throws when deleting a missing gift", async () => {
    const repository = new InMemoryGiftRepository();

    await expect(repository.delete("missing")).rejects.toThrow("Gift with id missing not found.");
  });
});
