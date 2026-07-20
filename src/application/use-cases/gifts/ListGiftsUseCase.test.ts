import { beforeEach, describe, expect, it } from "vitest";
import { ListGiftsUseCase } from "@/application/use-cases/gifts/ListGiftsUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";

describe("ListGiftsUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let useCase: ListGiftsUseCase;

  beforeEach(() => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    useCase = new ListGiftsUseCase(giftRepository, contributionRepository);
  });

  it("releases a reserved gift and expires its pending contribution once the reservation deadline has passed", async () => {
    const gift = await giftRepository.save(
      Gift.create({
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );
    const reservedGift = await giftRepository.update(gift.reserve(new Date(Date.now() - 1000)));
    const contribution = await contributionRepository.save(
      GiftContribution.create({
        giftId: reservedGift.id!,
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 450,
      })
    );

    const [result] = await useCase.execute();

    expect(result.status).toBe("available");
    expect(result.reservedUntil).toBeNull();
    const updatedContribution = await contributionRepository.findById(contribution.id!);
    expect(updatedContribution?.status).toBe("expired");
  });

  it("leaves a reservation untouched while the deadline is still in the future", async () => {
    const gift = await giftRepository.save(
      Gift.create({
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );
    await giftRepository.update(gift.reserve(new Date(Date.now() + 60 * 60 * 1000)));

    const [result] = await useCase.execute();

    expect(result.status).toBe("reserved");
  });

  it("leaves available gifts untouched", async () => {
    await giftRepository.save(
      Gift.create({
        name: "Air fryer",
        description: "Air fryer 5L",
        imageUrl: "/placeholder.jpg",
        price: 450,
        category: "cozinha",
      })
    );

    const [result] = await useCase.execute();

    expect(result.status).toBe("available");
  });
});
