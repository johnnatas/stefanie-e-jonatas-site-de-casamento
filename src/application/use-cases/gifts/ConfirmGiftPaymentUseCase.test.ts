import { beforeEach, describe, expect, it } from "vitest";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { CreateGiftContributionUseCase } from "@/application/use-cases/gifts/CreateGiftContributionUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakePaymentGateway } from "@/application/testing/FakePaymentGateway";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Gift } from "@/domain/entities/Gift";

describe("ConfirmGiftPaymentUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let paymentGateway: FakePaymentGateway;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let createContribution: CreateGiftContributionUseCase;
  let confirmPayment: ConfirmGiftPaymentUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    paymentGateway = new FakePaymentGateway();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    createContribution = new CreateGiftContributionUseCase(giftRepository, contributionRepository, paymentGateway);
    confirmPayment = new ConfirmGiftPaymentUseCase(
      giftRepository,
      contributionRepository,
      paymentGateway,
      emailGateway,
      notificationLogRepository
    );

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
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-1", "approved", "gift-1");

    const updated = await confirmPayment.execute({ paymentId: "payment-1" });

    expect(updated?.status).toBe("approved");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("sends a thank-you email to the guest when payment is approved", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-1", "approved", "gift-1");
    await confirmPayment.execute({ paymentId: "payment-1" });

    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("bruna@example.com");
    expect(emailGateway.sentEmails[0].subject).toContain("obrigado");
    expect(emailGateway.sentEmails[0].html).toContain("Liquidificador");
  });

  it("does not send a thank-you email when payment is rejected", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-2", "rejected", "gift-1");
    await confirmPayment.execute({ paymentId: "payment-2" });

    expect(emailGateway.sentEmails).toHaveLength(0);
  });

  it("does not send a duplicate thank-you email on a repeated approved notification", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-1", "approved", "gift-1");
    await confirmPayment.execute({ paymentId: "payment-1" });

    paymentGateway.simulatePayment("payment-1-retry", "approved", "gift-1");
    await confirmPayment.execute({ paymentId: "payment-1-retry" });

    expect(emailGateway.sentEmails).toHaveLength(1);
  });

  it("rejects the contribution and releases the gift when payment is rejected", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-2", "rejected", "gift-1");

    const updated = await confirmPayment.execute({ paymentId: "payment-2" });

    expect(updated?.status).toBe("rejected");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("available");
  });

  it("keeps the contribution pending when the payment is still pending", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });

    paymentGateway.simulatePayment("payment-3", "pending", "gift-1");

    const updated = await confirmPayment.execute({ paymentId: "payment-3" });

    expect(updated?.status).toBe("pending");
  });

  it("returns null without throwing or changing state when there is no pending contribution (duplicate notification)", async () => {
    await createContribution.execute({
      giftId: "gift-1",
      guestName: "Bruna Lima",
      guestEmail: "bruna@example.com",
    });
    paymentGateway.simulatePayment("payment-4", "approved", "gift-1");
    await confirmPayment.execute({ paymentId: "payment-4" });

    paymentGateway.simulatePayment("payment-4-retry", "approved", "gift-1");
    const result = await confirmPayment.execute({ paymentId: "payment-4-retry" });

    expect(result).toBeNull();
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });
});
