import { beforeEach, describe, expect, it } from "vitest";
import { SendReservationRemindersUseCase } from "@/application/use-cases/notifications/SendReservationRemindersUseCase";
import { InMemoryGiftContributionRepository } from "@/application/testing/InMemoryGiftContributionRepository";
import { InMemoryGiftRepository } from "@/application/testing/InMemoryGiftRepository";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";
import { Gift } from "@/domain/entities/Gift";
import { GiftContribution } from "@/domain/entities/GiftContribution";

describe("SendReservationRemindersUseCase", () => {
  let contributionRepository: InMemoryGiftContributionRepository;
  let giftRepository: InMemoryGiftRepository;
  let emailGateway: FakeEmailGateway;
  let notificationLogRepository: InMemoryNotificationLogRepository;
  let useCase: SendReservationRemindersUseCase;

  beforeEach(async () => {
    contributionRepository = new InMemoryGiftContributionRepository();
    giftRepository = new InMemoryGiftRepository();
    emailGateway = new FakeEmailGateway();
    notificationLogRepository = new InMemoryNotificationLogRepository();
    useCase = new SendReservationRemindersUseCase(
      contributionRepository,
      giftRepository,
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
        mercadoPagoCheckoutUrl: "https://mercadopago.test/checkout/gift-1",
      })
    );
  });

  it("sends a reminder when today is exactly 7 days before the expected payment date", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-08T23:59:59-03:00"),
      })
    );

    const sentCount = await useCase.execute(today);

    expect(sentCount).toBe(1);
    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("carla@example.com");
    expect(
      await notificationLogRepository.hasBeenSent("reservation_reminder_t7", "gift_contribution", "contribution-1")
    ).toBe(true);
  });

  it("does not send when today doesn't match any threshold", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-15T23:59:59-03:00"),
      })
    );

    const sentCount = await useCase.execute(today);

    expect(sentCount).toBe(0);
  });

  it("does not send twice for the same threshold", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-08T23:59:59-03:00"),
      })
    );

    await useCase.execute(today);
    const secondRunSentCount = await useCase.execute(today);

    expect(secondRunSentCount).toBe(0);
    expect(emailGateway.sentEmails).toHaveLength(1);
  });

  it("does not send for a contribution that is no longer pending", async () => {
    const today = new Date("2027-05-01T09:00:00-03:00");
    const contribution = await contributionRepository.save(
      GiftContribution.create({
        id: "contribution-1",
        giftId: "gift-1",
        guestName: "Carla Nunes",
        guestEmail: "carla@example.com",
        amount: 200,
        expectedPaymentDate: new Date("2027-05-08T23:59:59-03:00"),
      })
    );
    await contributionRepository.update(contribution.approve("payment-1"));

    const sentCount = await useCase.execute(today);

    expect(sentCount).toBe(0);
  });
});
