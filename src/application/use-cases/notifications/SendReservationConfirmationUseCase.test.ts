import { describe, expect, it } from "vitest";
import { SendReservationConfirmationUseCase } from "@/application/use-cases/notifications/SendReservationConfirmationUseCase";
import { FakeEmailGateway } from "@/application/testing/FakeEmailGateway";
import { InMemoryNotificationLogRepository } from "@/application/testing/InMemoryNotificationLogRepository";

describe("SendReservationConfirmationUseCase", () => {
  it("sends the confirmation email and records it as sent", async () => {
    const emailGateway = new FakeEmailGateway();
    const notificationLogRepository = new InMemoryNotificationLogRepository();
    const useCase = new SendReservationConfirmationUseCase(emailGateway, notificationLogRepository);

    await useCase.execute({
      contributionId: "contribution-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      giftName: "Liquidificador",
      expectedPaymentDate: new Date("2027-05-01T23:59:59-03:00"),
      checkoutUrl: "https://mercadopago.test/checkout",
    });

    expect(emailGateway.sentEmails).toHaveLength(1);
    expect(emailGateway.sentEmails[0].to).toBe("carla@example.com");
    expect(emailGateway.sentEmails[0].subject).toBe("Reserva confirmada: Liquidificador 🎁");
    expect(
      await notificationLogRepository.hasBeenSent("reservation_confirmation", "gift_contribution", "contribution-1")
    ).toBe(true);
  });

  it("does not send twice for the same contribution", async () => {
    const emailGateway = new FakeEmailGateway();
    const notificationLogRepository = new InMemoryNotificationLogRepository();
    const useCase = new SendReservationConfirmationUseCase(emailGateway, notificationLogRepository);
    const input = {
      contributionId: "contribution-1",
      guestName: "Carla Nunes",
      guestEmail: "carla@example.com",
      giftName: "Liquidificador",
      expectedPaymentDate: new Date("2027-05-01T23:59:59-03:00"),
      checkoutUrl: "https://mercadopago.test/checkout",
    };

    await useCase.execute(input);
    await useCase.execute(input);

    expect(emailGateway.sentEmails).toHaveLength(1);
  });
});
