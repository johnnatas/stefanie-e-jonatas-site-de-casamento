import { beforeEach, describe, expect, it } from "vitest";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { Gift } from "@/domain/entities/Gift";

describe("ConfirmGiftPaymentUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let paymentGateway: FakePaymentGateway;
  let createContribution: CreateGiftContributionUseCase;
  let confirmPayment: ConfirmGiftPaymentUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    paymentGateway = new FakePaymentGateway();
    createContribution = new CreateGiftContributionUseCase(giftRepository, contributionRepository, paymentGateway);
    confirmPayment = new ConfirmGiftPaymentUseCase(giftRepository, contributionRepository, paymentGateway);

    await giftRepository.save(
      Gift.create({
        id: "gift-1",
        name: "Liquidificador",
        description: "Liquidificador de alta potência",
        imageUrl: "/placeholder.jpg",
        price: 200,
        category: "cozinha",
      })
    );
  });

  it("approves the contribution and marks the gift as paid when payment is approved", async () => {
    const { contribution } = await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-1", "approved", contribution.id!);

    const updated = await confirmPayment.execute({ paymentId: "payment-1" });

    expect(updated.status).toBe("approved");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("rejects the contribution and releases the gift when payment is rejected", async () => {
    const { contribution } = await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-2", "rejected", contribution.id!);

    const updated = await confirmPayment.execute({ paymentId: "payment-2" });

    expect(updated.status).toBe("rejected");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("available");
  });

  it("keeps the contribution pending when the payment is still pending", async () => {
    const { contribution } = await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-3", "pending", contribution.id!);

    const updated = await confirmPayment.execute({ paymentId: "payment-3" });

    expect(updated.status).toBe("pending");
  });
});
