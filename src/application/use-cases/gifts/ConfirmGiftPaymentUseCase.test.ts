import { beforeEach, describe, expect, it } from "vitest";
import { ConfirmGiftPaymentUseCase } from "@/application/use-cases/gifts/ConfirmGiftPaymentUseCase";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";

// NOTE: CreateGiftContributionUseCase.execute() currently throws
// (`contribution.withPreference is not a function`) because an earlier task
// renamed that domain method to `withProviderReference` without updating
// this call site — that update is Task 12's job, not this one. Rather than
// route these fixtures through the broken use case, we seed the reserved
// gift + pending contribution directly via the repositories, which is all
// ConfirmGiftPaymentUseCase actually depends on.
describe("ConfirmGiftPaymentUseCase", () => {
  let giftRepository: InMemoryGiftRepository;
  let contributionRepository: InMemoryGiftContributionRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let confirmPayment: ConfirmGiftPaymentUseCase;

  beforeEach(async () => {
    giftRepository = new InMemoryGiftRepository();
    contributionRepository = new InMemoryGiftContributionRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    confirmPayment = new ConfirmGiftPaymentUseCase(
      giftRepository,
      contributionRepository,
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

  async function reserveGiftAndCreatePendingContribution(): Promise<void> {
    const gift = await giftRepository.findById("gift-1");
    await giftRepository.update(gift!.reserve(new Date(Date.now() + 30 * 60 * 1000)));
    await contributionRepository.save(
      GiftContribution.create({
        giftId: "gift-1",
        guestName: "Bruna Lima",
        guestEmail: "bruna@example.com",
        amount: 200,
      })
    );
  }

  it("approves the contribution and marks the gift as paid when payment is approved", async () => {
    await reserveGiftAndCreatePendingContribution();

    const updated = await confirmPayment.execute({
      payment: { paymentReference: "payment-1", status: "approved", giftId: "gift-1" },
    });

    expect(updated?.status).toBe("approved");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("sends a thank-you email to the guest when payment is approved", async () => {
    await reserveGiftAndCreatePendingContribution();

    await confirmPayment.execute({ payment: { paymentReference: "payment-1", status: "approved", giftId: "gift-1" } });

    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("bruna@example.com");
    expect(emailGateway.sentEmails[0].subject).toContain("obrigado");
    expect(emailGateway.sentEmails[0].html).toContain("Liquidificador");
  });

  it("does not send a thank-you email when payment is rejected", async () => {
    await reserveGiftAndCreatePendingContribution();

    await confirmPayment.execute({ payment: { paymentReference: "payment-2", status: "rejected", giftId: "gift-1" } });

    expect(emailGateway.sentEmails).toHaveLength(0);
  });

  it("does not send a duplicate thank-you email on a repeated approved notification", async () => {
    await reserveGiftAndCreatePendingContribution();

    await confirmPayment.execute({ payment: { paymentReference: "payment-1", status: "approved", giftId: "gift-1" } });
    await confirmPayment.execute({ payment: { paymentReference: "payment-1-retry", status: "approved", giftId: "gift-1" } });

    expect(emailGateway.sentEmails).toHaveLength(1);
  });

  it("rejects the contribution and releases the gift when payment is rejected", async () => {
    await reserveGiftAndCreatePendingContribution();

    const updated = await confirmPayment.execute({
      payment: { paymentReference: "payment-2", status: "rejected", giftId: "gift-1" },
    });

    expect(updated?.status).toBe("rejected");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("available");
  });

  it("returns null without throwing or changing state when there is no pending contribution (duplicate notification)", async () => {
    await reserveGiftAndCreatePendingContribution();
    await confirmPayment.execute({ payment: { paymentReference: "payment-4", status: "approved", giftId: "gift-1" } });

    const result = await confirmPayment.execute({
      payment: { paymentReference: "payment-4-retry", status: "approved", giftId: "gift-1" },
    });

    expect(result).toBeNull();
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("paid");
  });

  it("refuses to approve when paidAmount is provided and does not match the contribution amount", async () => {
    await reserveGiftAndCreatePendingContribution();

    const result = await confirmPayment.execute({
      payment: { paymentReference: "payment-5", status: "approved", giftId: "gift-1", paidAmount: 50 },
    });

    expect(result?.status).toBe("pending");
    const gift = await giftRepository.findById("gift-1");
    expect(gift?.status).toBe("reserved");
    expect(emailGateway.sentEmails).toHaveLength(0);
  });

  it("approves when paidAmount is provided and matches the contribution amount", async () => {
    await reserveGiftAndCreatePendingContribution();

    const result = await confirmPayment.execute({
      payment: { paymentReference: "transaction-1", status: "approved", giftId: "gift-1", paidAmount: 200 },
    });

    expect(result?.status).toBe("approved");
  });
});
